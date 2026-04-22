import { app, shell, BrowserWindow, dialog, ipcMain } from 'electron'
import type { OpenDialogOptions } from 'electron'
import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, dirname, extname, join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

interface ConversionResult {
  sourcePath: string
  sourceName: string
  outputDirectory: string
  outputFilePath: string
}

interface SelectedVideo {
  sourcePath: string
  sourceName: string
  outputDirectory: string
  outputFilePath: string
}

interface SelectedAudio {
  sourcePath: string
  sourceName: string
  outputDirectory: string
  wordOutputFilePath: string
  sentenceOutputFilePath: string
}

interface SelectedCleanupVideo {
  sourcePath: string
  sourceName: string
  outputDirectory: string
  outputFilePath: string
}

interface SelectedTranscriptFile {
  sourcePath: string
  sourceName: string
}

interface CleanupRequest {
  video: SelectedCleanupVideo
  transcript: SelectedTranscriptFile
}

interface TranscriptSegment {
  index: number
  start: number
  end: number
  text: string
}

interface CleanupAnalysisSelection {
  index: number
  reason: string
}

interface CleanupAnalysisResult {
  summary: string
  selections: CleanupAnalysisSelection[]
}

interface CleanupResult {
  outputDirectory: string
  outputFilePath: string
  summary: string
  removedSegments: Array<{
    index: number
    start: string
    end: string
    text: string
    reason: string
  }>
}

function loadEnvFile(): void {
  const envPath = join(process.cwd(), '.env')

  if (!existsSync(envPath)) {
    return
  }

  const envContent = readFileSync(envPath, 'utf-8')

  for (const rawLine of envContent.split(/\r?\n/)) {
    const line = rawLine.trim()

    if (!line || line.startsWith('#')) {
      continue
    }

    const separatorIndex = line.indexOf('=')

    if (separatorIndex === -1) {
      continue
    }

    const key = line.slice(0, separatorIndex).trim()
    const value = line.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '')

    if (key && !(key in process.env)) {
      process.env[key] = value
    }
  }
}

function sanitizeDirectoryName(name: string): string {
  return name.trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
}

function convertVideoToMp3(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn(
      'ffmpeg',
      ['-y', '-i', inputPath, '-vn', '-acodec', 'libmp3lame', outputPath],
      {
        stdio: ['ignore', 'ignore', 'pipe']
      }
    )

    let stderr = ''

    ffmpeg.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })

    ffmpeg.on('error', (error) => {
      if ('code' in error && error.code === 'ENOENT') {
        reject(new Error('FFmpeg não foi encontrado no dispositivo. Instale o FFmpeg e tente novamente.'))
        return
      }

      reject(error)
    })

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve()
        return
      }

      reject(new Error(stderr.trim() || 'Não foi possível converter o vídeo para MP3.'))
    })
  })
}

function formatTimestamp(seconds: number): string {
  const totalMilliseconds = Math.max(0, Math.round(seconds * 1000))
  const hours = Math.floor(totalMilliseconds / 3600000)
  const minutes = Math.floor((totalMilliseconds % 3600000) / 60000)
  const secs = Math.floor((totalMilliseconds % 60000) / 1000)
  const milliseconds = totalMilliseconds % 1000

  return [hours, minutes, secs].map((value) => String(value).padStart(2, '0')).join(':') +
    `.${String(milliseconds).padStart(3, '0')}`
}

function parseTimestamp(timestamp: string): number {
  const match = timestamp.match(/^(\d{2}):(\d{2}):(\d{2})\.(\d{3})$/)

  if (!match) {
    throw new Error(`Timestamp inválido encontrado: ${timestamp}`)
  }

  const [, hours, minutes, seconds, milliseconds] = match

  return (
    Number(hours) * 3600 +
    Number(minutes) * 60 +
    Number(seconds) +
    Number(milliseconds) / 1000
  )
}

function parseTranscriptSegments(transcriptContent: string): TranscriptSegment[] {
  const lines = transcriptContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  const segments = lines
    .map((line, index) => {
      const match = line.match(/^\[(\d{2}:\d{2}:\d{2}\.\d{3}) - (\d{2}:\d{2}:\d{2}\.\d{3})\]\s+(.+)$/)

      if (!match) {
        return null
      }

      const [, startTimestamp, endTimestamp, text] = match

      return {
        index: index + 1,
        start: parseTimestamp(startTimestamp),
        end: parseTimestamp(endTimestamp),
        text: text.trim()
      }
    })
    .filter((segment): segment is TranscriptSegment => Boolean(segment))

  if (segments.length === 0) {
    throw new Error(
      'Não foi possível identificar timestamps no TXT. Use um arquivo de frases no formato [inicio - fim] texto.'
    )
  }

  return segments
}

function mergeRanges(ranges: Array<{ start: number; end: number }>): Array<{ start: number; end: number }> {
  if (ranges.length === 0) {
    return []
  }

  const sortedRanges = [...ranges].sort((first, second) => first.start - second.start)
  const merged = [sortedRanges[0]]

  for (const current of sortedRanges.slice(1)) {
    const previous = merged[merged.length - 1]

    if (current.start <= previous.end) {
      previous.end = Math.max(previous.end, current.end)
      continue
    }

    merged.push({ ...current })
  }

  return merged
}

function normalizeTranscriptText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function looksIncomplete(text: string): boolean {
  const trimmed = text.trim()

  if (!trimmed) {
    return false
  }

  if (/[,:;(\-]$/.test(trimmed)) {
    return true
  }

  if (/\.\.\.$/.test(trimmed)) {
    return true
  }

  const normalized = normalizeTranscriptText(trimmed)
  const words = normalized.split(' ').filter(Boolean)

  if (words.length <= 1) {
    return false
  }

  const lastWord = words[words.length - 1]

  return lastWord.length <= 2
}

function detectLikelyProblemSegments(
  segments: TranscriptSegment[]
): Array<TranscriptSegment & { reason: string }> {
  const flagged = new Map<number, TranscriptSegment & { reason: string }>()

  for (let index = 0; index < segments.length; index += 1) {
    const current = segments[index]
    const currentNormalized = normalizeTranscriptText(current.text)

    if (!currentNormalized) {
      continue
    }

    if (looksIncomplete(current.text)) {
      flagged.set(current.index, {
        ...current,
        reason: 'frase possivelmente incompleta ou truncada'
      })
    }

    const previous = segments[index - 1]
    const next = segments[index + 1]
    const previousNormalized = previous ? normalizeTranscriptText(previous.text) : ''
    const nextNormalized = next ? normalizeTranscriptText(next.text) : ''

    if (
      previous &&
      currentNormalized.length >= 8 &&
      (currentNormalized === previousNormalized ||
        currentNormalized.includes(previousNormalized) ||
        previousNormalized.includes(currentNormalized))
    ) {
      flagged.set(current.index, {
        ...current,
        reason: 'frase repetida ou sobreposta com o trecho anterior'
      })
    }

    if (
      next &&
      currentNormalized.length >= 8 &&
      (currentNormalized === nextNormalized ||
        currentNormalized.includes(nextNormalized) ||
        nextNormalized.includes(currentNormalized))
    ) {
      flagged.set(current.index, {
        ...current,
        reason: 'frase repetida ou sobreposta com o trecho seguinte'
      })
    }
  }

  return Array.from(flagged.values())
}

function getMimeType(filePath: string): string {
  const extension = extname(filePath).toLowerCase()

  switch (extension) {
    case '.mp3':
      return 'audio/mpeg'
    case '.wav':
      return 'audio/wav'
    case '.m4a':
      return 'audio/mp4'
    case '.webm':
      return 'audio/webm'
    case '.mpga':
    case '.mpeg':
      return 'audio/mpeg'
    default:
      return 'application/octet-stream'
  }
}

async function transcribeAudioToTxt(
  sourcePath: string,
  wordOutputFilePath: string,
  sentenceOutputFilePath: string
): Promise<void> {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    throw new Error('A variável OPENAI_API_KEY não foi encontrada. Configure a chave no arquivo .env.')
  }

  const audioBuffer = await readFile(sourcePath)
  const formData = new FormData()

  formData.append('file', new Blob([audioBuffer], { type: getMimeType(sourcePath) }), basename(sourcePath))
  formData.append('model', 'whisper-1')
  formData.append('response_format', 'verbose_json')
  formData.append('temperature', '0')
  formData.append('timestamp_granularities[]', 'word')
  formData.append('timestamp_granularities[]', 'segment')

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    body: formData
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(errorText || 'Não foi possível transcrever o áudio com a OpenAI.')
  }

  const transcription = (await response.json()) as {
    text?: string
    words?: Array<{ start: number; end: number; word: string }>
    segments?: Array<{ start: number; end: number; text: string }>
  }

  const wordLines =
    transcription.words
      ?.map((word) => {
        if (!word.word || !word.word.trim()) {
          return null
        }

        // Keep each token as returned by the transcription model, including
        // imperfect or partial words, while writing one token per line.
        return `[${formatTimestamp(word.start)} - ${formatTimestamp(word.end)}] ${word.word.trim()}`
      })
      .filter((line): line is string => Boolean(line)) ?? []

  const segmentLines =
    transcription.segments
      ?.map((segment) => {
        const sentence = segment.text.trim()

        if (!sentence) {
          return null
        }

        return `[${formatTimestamp(segment.start)} - ${formatTimestamp(segment.end)}] ${sentence}`
      })
      .filter((line): line is string => Boolean(line)) ?? []

  const wordOutputContent =
    wordLines.length > 0
      ? wordLines.join('\n')
      : segmentLines.length > 0
        ? segmentLines.join('\n')
        : transcription.text?.trim() || 'Nenhuma transcrição foi retornada.'

  const sentenceOutputContent =
    segmentLines.length > 0
      ? segmentLines.join('\n')
      : transcription.text?.trim() || 'Nenhuma transcrição foi retornada.'

  await Promise.all([
    writeFile(wordOutputFilePath, wordOutputContent, 'utf-8'),
    writeFile(sentenceOutputFilePath, sentenceOutputContent, 'utf-8')
  ])
}

function extractResponseText(responseJson: unknown): string {
  if (typeof responseJson !== 'object' || responseJson === null) {
    return ''
  }

  const response = responseJson as {
    output_text?: string
    output?: Array<{
      content?: Array<{ type?: string; text?: string }>
    }>
  }

  if (typeof response.output_text === 'string' && response.output_text.trim()) {
    return response.output_text
  }

  for (const item of response.output ?? []) {
    for (const contentItem of item.content ?? []) {
      if (contentItem.type === 'output_text' && typeof contentItem.text === 'string') {
        return contentItem.text
      }
    }
  }

  return ''
}

async function analyzeTranscriptForCleanup(segments: TranscriptSegment[]): Promise<CleanupAnalysisResult> {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    throw new Error('A variável OPENAI_API_KEY não foi encontrada. Configure a chave no arquivo .env.')
  }

  const compactSegments = segments
    .map(
      (segment) =>
        `${segment.index}. [${formatTimestamp(segment.start)} - ${formatTimestamp(segment.end)}] ${segment.text}`
    )
    .join('\n')

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      input: [
        {
          role: 'system',
          content: [
            {
              type: 'input_text',
              text:
                'Analise uma transcrição segmentada e retorne JSON com os trechos que parecem erros de gravação. ' +
                'Considere como erro frases claramente cortadas, incompletas, interrompidas abruptamente, ' +
                'repetidas, duplicadas, sobrepostas parcialmente ou sem coerência com o contexto vizinho. ' +
                'Frases repetidas ou recomeçadas após uma interrupção também devem ser marcadas quando parecerem ' +
                'resultado de erro de gravação. Seja criterioso, mas não ignore sinais claros de repetição ou truncamento.'
            }
          ]
        },
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text:
                'Responda em JSON. Para cada trecho problemático, devolva o índice e um motivo curto. ' +
                'Procure especialmente por frases incompletas, frases que terminam abruptamente, palavras finais ' +
                'truncadas, frases repetidas em sequência e regravações visíveis do mesmo conteúdo. ' +
                'Trechos da transcrição:\n' +
                compactSegments
            }
          ]
        }
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'cleanup_segments',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              summary: { type: 'string' },
              selections: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    index: { type: 'integer' },
                    reason: { type: 'string' }
                  },
                  required: ['index', 'reason']
                }
              }
            },
            required: ['summary', 'selections']
          }
        }
      }
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(errorText || 'Não foi possível analisar a transcrição com a OpenAI.')
  }

  const responseJson = await response.json()
  const outputText = extractResponseText(responseJson)

  if (!outputText) {
    throw new Error('A OpenAI não retornou uma análise utilizável para os trechos da transcrição.')
  }

  const parsed = JSON.parse(outputText) as CleanupAnalysisResult

  return {
    summary: parsed.summary,
    selections: Array.isArray(parsed.selections) ? parsed.selections : []
  }
}

function removeSegmentsFromVideo(
  inputPath: string,
  outputPath: string,
  ranges: Array<{ start: number; end: number }>
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (ranges.length === 0) {
      resolve()
      return
    }

    const conditions = ranges
      .map((range) => `between(t,${range.start.toFixed(3)},${range.end.toFixed(3)})`)
      .join('+')

    const filterComplex =
      `[0:v]select='not(${conditions})',setpts=N/FRAME_RATE/TB[v];` +
      `[0:a]aselect='not(${conditions})',asetpts=N/SR/TB[a]`

    const ffmpeg = spawn(
      'ffmpeg',
      [
        '-y',
        '-i',
        inputPath,
        '-filter_complex',
        filterComplex,
        '-map',
        '[v]',
        '-map',
        '[a]',
        outputPath
      ],
      {
        stdio: ['ignore', 'ignore', 'pipe']
      }
    )

    let stderr = ''

    ffmpeg.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })

    ffmpeg.on('error', (error) => {
      if ('code' in error && error.code === 'ENOENT') {
        reject(new Error('FFmpeg não foi encontrado no dispositivo. Instale o FFmpeg e tente novamente.'))
        return
      }

      reject(error)
    })

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve()
        return
      }

      reject(new Error(stderr.trim() || 'Não foi possível remover os trechos problemáticos do vídeo.'))
    })
  })
}

async function cleanupVideoUsingTranscript(request: CleanupRequest): Promise<CleanupResult> {
  const transcriptContent = await readFile(request.transcript.sourcePath, 'utf-8')
  const segments = parseTranscriptSegments(transcriptContent)
  const analysis = await analyzeTranscriptForCleanup(segments)
  const heuristicSelections = detectLikelyProblemSegments(segments)
  const aiSelections = analysis.selections
    .map((selection) => {
      const segment = segments.find((candidate) => candidate.index === selection.index)

      if (!segment) {
        return null
      }

      return {
        ...segment,
        reason: selection.reason
      }
    })
    .filter(
      (
        selection
      ): selection is TranscriptSegment & {
        reason: string
      } => Boolean(selection)
    )
  const dedupedSelections = Array.from(
    new Map([...heuristicSelections, ...aiSelections].map((item) => [item.index, item])).values()
  )
  const removalRanges = mergeRanges(
    dedupedSelections.map((selection) => ({
      start: selection.start,
      end: selection.end
    }))
  )

  await mkdir(request.video.outputDirectory, { recursive: true })

  if (removalRanges.length === 0) {
    await copyFile(request.video.sourcePath, request.video.outputFilePath)
  } else {
    await removeSegmentsFromVideo(request.video.sourcePath, request.video.outputFilePath, removalRanges)
  }

  return {
    outputDirectory: request.video.outputDirectory,
    outputFilePath: request.video.outputFilePath,
    summary:
      dedupedSelections.length > 0
        ? heuristicSelections.length > 0
          ? `${analysis.summary} Heurísticas locais também marcaram repetição e/ou truncamento em ${heuristicSelections.length} trecho(s).`
          : analysis.summary
        : 'A IA não encontrou trechos claramente problemáticos. O vídeo foi salvo sem cortes.',
    removedSegments: dedupedSelections.map((selection) => ({
      index: selection.index,
      start: formatTimestamp(selection.start),
      end: formatTimestamp(selection.end),
      text: selection.text,
      reason: selection.reason
    }))
  }
}

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  loadEnvFile()

  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.handle('select-mp4-file', async () => {
    const window = BrowserWindow.getFocusedWindow()
    const dialogOptions: OpenDialogOptions = {
      title: 'Selecionar video MP4',
      properties: ['openFile'],
      filters: [{ name: 'Videos MP4', extensions: ['mp4'] }]
    }

    const { canceled, filePaths } = window
      ? await dialog.showOpenDialog(window, dialogOptions)
      : await dialog.showOpenDialog(dialogOptions)

    if (canceled || filePaths.length === 0) {
      return null
    }

    const [path] = filePaths

    const sourceName = path.split(/[\\/]/).pop() ?? path
    const videoName = sanitizeDirectoryName(basename(path, extname(path)))
    const editedVideosDirectory = join(app.getPath('desktop'), 'VÍDEOS-EDITADOS')
    const outputDirectory = join(editedVideosDirectory, videoName)
    const outputFilePath = join(outputDirectory, `${videoName}.mp3`)

    const result: SelectedVideo = {
      sourcePath: path,
      sourceName,
      outputDirectory,
      outputFilePath
    }

    return result
  })

  ipcMain.handle('convert-mp4-to-mp3', async (_, selectedVideo: SelectedVideo) => {
    await mkdir(selectedVideo.outputDirectory, { recursive: true })
    await convertVideoToMp3(selectedVideo.sourcePath, selectedVideo.outputFilePath)

    const result: ConversionResult = {
      sourcePath: selectedVideo.sourcePath,
      sourceName: selectedVideo.sourceName,
      outputDirectory: selectedVideo.outputDirectory,
      outputFilePath: selectedVideo.outputFilePath
    }

    return result
  })

  ipcMain.handle('select-audio-file', async () => {
    const window = BrowserWindow.getFocusedWindow()
    const dialogOptions: OpenDialogOptions = {
      title: 'Selecionar arquivo de áudio',
      properties: ['openFile'],
      filters: [{ name: 'Arquivos de áudio', extensions: ['mp3', 'wav', 'm4a', 'mpeg', 'mpga', 'webm'] }]
    }

    const { canceled, filePaths } = window
      ? await dialog.showOpenDialog(window, dialogOptions)
      : await dialog.showOpenDialog(dialogOptions)

    if (canceled || filePaths.length === 0) {
      return null
    }

    const [path] = filePaths
    const sourceName = path.split(/[\\/]/).pop() ?? path
    const outputDirectory = dirname(path)
    const baseFileName = basename(path, extname(path))
    const wordOutputFilePath = join(outputDirectory, `${baseFileName}_palavras.txt`)
    const sentenceOutputFilePath = join(outputDirectory, `${baseFileName}_frases.txt`)

    const result: SelectedAudio = {
      sourcePath: path,
      sourceName,
      outputDirectory,
      wordOutputFilePath,
      sentenceOutputFilePath
    }

    return result
  })

  ipcMain.handle('transcribe-audio-to-txt', async (_, selectedAudio: SelectedAudio) => {
    await transcribeAudioToTxt(
      selectedAudio.sourcePath,
      selectedAudio.wordOutputFilePath,
      selectedAudio.sentenceOutputFilePath
    )

    return selectedAudio
  })

  ipcMain.handle('select-video-for-cleanup', async () => {
    const window = BrowserWindow.getFocusedWindow()
    const dialogOptions: OpenDialogOptions = {
      title: 'Selecionar vídeo para limpeza',
      properties: ['openFile'],
      filters: [{ name: 'Vídeos MP4', extensions: ['mp4'] }]
    }

    const { canceled, filePaths } = window
      ? await dialog.showOpenDialog(window, dialogOptions)
      : await dialog.showOpenDialog(dialogOptions)

    if (canceled || filePaths.length === 0) {
      return null
    }

    const [path] = filePaths
    const sourceName = path.split(/[\\/]/).pop() ?? path
    const videoName = sanitizeDirectoryName(basename(path, extname(path)))
    const outputDirectory = join(app.getPath('desktop'), 'VÍDEOS-EDITADOS', videoName)
    const outputFilePath = join(outputDirectory, `${videoName}_sem_erros.mp4`)

    const result: SelectedCleanupVideo = {
      sourcePath: path,
      sourceName,
      outputDirectory,
      outputFilePath
    }

    return result
  })

  ipcMain.handle('select-transcript-txt-file', async () => {
    const window = BrowserWindow.getFocusedWindow()
    const dialogOptions: OpenDialogOptions = {
      title: 'Selecionar transcrição TXT',
      properties: ['openFile'],
      filters: [{ name: 'Arquivos TXT', extensions: ['txt'] }]
    }

    const { canceled, filePaths } = window
      ? await dialog.showOpenDialog(window, dialogOptions)
      : await dialog.showOpenDialog(dialogOptions)

    if (canceled || filePaths.length === 0) {
      return null
    }

    const [path] = filePaths
    const sourceName = path.split(/[\\/]/).pop() ?? path

    const result: SelectedTranscriptFile = {
      sourcePath: path,
      sourceName
    }

    return result
  })

  ipcMain.handle('cleanup-video-using-transcript', async (_, request: CleanupRequest) => {
    return cleanupVideoUsingTranscript(request)
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
