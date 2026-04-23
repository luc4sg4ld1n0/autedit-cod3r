import { copyFile, mkdir, readFile } from 'node:fs/promises'
import type { RemovedSegment } from '../../shared/workflow'
import type { TranscriptSegment } from '../types/transcript'
import { analyzeTranscriptForCleanup } from './openai'
import { removeSegmentsFromVideo } from './ffmpeg'
import { formatTimestamp } from '../utils/timestamps'
import { looksIncomplete, mergeRanges, normalizeTranscriptText, parseTranscriptSegments } from '../utils/transcript'

export interface CleanupRequest {
  video: {
    sourcePath: string
    sourceName: string
    outputDirectory: string
    outputFilePath: string
  }
  transcript: {
    sourcePath: string
    sourceName: string
  }
}

export interface CleanupResult {
  outputDirectory: string
  outputFilePath: string
  summary: string
  removedSegments: RemovedSegment[]
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

export async function cleanupVideoUsingTranscript(request: CleanupRequest): Promise<CleanupResult> {
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
    .filter((selection): selection is TranscriptSegment & { reason: string } => Boolean(selection))

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
