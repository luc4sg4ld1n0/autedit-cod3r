import { spawn } from 'node:child_process'

function runFfmpeg(args: string[], fallbackError: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', args, {
      stdio: ['ignore', 'ignore', 'pipe']
    })

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

      reject(new Error(stderr.trim() || fallbackError))
    })
  })
}

export function convertVideoToMp3(inputPath: string, outputPath: string): Promise<void> {
  return runFfmpeg(
    ['-y', '-i', inputPath, '-vn', '-acodec', 'libmp3lame', outputPath],
    'Não foi possível converter o vídeo para MP3.'
  )
}

export function removeSegmentsFromVideo(
  inputPath: string,
  outputPath: string,
  ranges: Array<{ start: number; end: number }>
): Promise<void> {
  if (ranges.length === 0) {
    return Promise.resolve()
  }

  const conditions = ranges
    .map((range) => `between(t,${range.start.toFixed(3)},${range.end.toFixed(3)})`)
    .join('+')

  const filterComplex =
    `[0:v]select='not(${conditions})',setpts=N/FRAME_RATE/TB[v];` +
    `[0:a]aselect='not(${conditions})',asetpts=N/SR/TB[a]`

  return runFfmpeg(
    ['-y', '-i', inputPath, '-filter_complex', filterComplex, '-map', '[v]', '-map', '[a]', outputPath],
    'Não foi possível remover os trechos problemáticos do vídeo.'
  )
}
