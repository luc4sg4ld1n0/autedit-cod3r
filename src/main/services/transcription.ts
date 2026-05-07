import { basename } from 'node:path'
import { writeFile } from 'node:fs/promises'
import type { SentenceBoundary, TranscriptionResponse, TranscriptionWord } from '../types/transcript'
import { formatTimestamp as formatTimestampWithMilliseconds } from '../utils/timestamps'
import { fetchTranscription, groupWordsIntoSentences, transcribeAudioWithGpt4o } from './openai'

interface RefinedSegment {
  start: number
  end: number
  text: string
}

interface ProcessAudioResult {
  wordOutputContent: string
  sentenceOutputContent: string
}

function logStep(message: string): void {
  console.log(`[transcription] ${message}`)
}

export function formatTimestamp(seconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const secs = totalSeconds % 60

  return [hours, minutes, secs].map((value) => String(value).padStart(2, '0')).join(':')
}

function buildWordOutputContent(words: TranscriptionWord[], transcription: TranscriptionResponse): string {
  const wordLines =
    words
      .map((word) => {
        if (!word.word || !word.word.trim()) {
          return null
        }

        return `[${formatTimestampWithMilliseconds(word.start)} - ${formatTimestampWithMilliseconds(word.end)}] ${word.word.trim()}`
      })
      .filter((line): line is string => Boolean(line))

  const segmentLines =
    transcription.segments
      ?.map((segment) => {
        const sentence = segment.text.trim()

        if (!sentence) {
          return null
        }

        return `[${formatTimestampWithMilliseconds(segment.start)} - ${formatTimestampWithMilliseconds(segment.end)}] ${sentence}`
      })
      .filter((line): line is string => Boolean(line)) ?? []

  return wordLines.length > 0
    ? wordLines.join('\n')
    : segmentLines.length > 0
      ? segmentLines.join('\n')
      : transcription.text?.trim() || 'Nenhuma transcrição foi retornada.'
}

function combineShortSentences(sentences: RefinedSegment[]): RefinedSegment[] {
  if (sentences.length === 0) {
    return []
  }

  const combined: RefinedSegment[] = []

  for (const sentence of sentences) {
    const duration = sentence.end - sentence.start
    const previous = combined[combined.length - 1]

    if (previous && duration < 1) {
      previous.end = sentence.end
      previous.text = `${previous.text} ${sentence.text}`.replace(/\s+/g, ' ').trim()
      continue
    }

    combined.push({ ...sentence })
  }

  return combined
}

function dedupeSentences(sentences: RefinedSegment[]): RefinedSegment[] {
  const unique: RefinedSegment[] = []

  for (const sentence of sentences) {
    const normalizedText = sentence.text.trim().toLowerCase()
    const previous = unique[unique.length - 1]

    if (previous && previous.text.trim().toLowerCase() === normalizedText) {
      previous.end = Math.max(previous.end, sentence.end)
      continue
    }

    unique.push({ ...sentence })
  }

  return unique
}

function validateRefinedSegments(segments: unknown): RefinedSegment[] {
  if (!Array.isArray(segments)) {
    throw new Error('O refinamento da transcrição não retornou um array JSON válido.')
  }

  return segments
    .map((segment) => {
      if (
        typeof segment !== 'object' ||
        segment === null ||
        typeof segment.start !== 'number' ||
        typeof segment.end !== 'number' ||
        typeof segment.text !== 'string'
      ) {
        return null
      }

      const refinedSegment = {
        start: segment.start,
        end: segment.end,
        text: segment.text.trim()
      }

      if (!refinedSegment.text || refinedSegment.end < refinedSegment.start) {
        return null
      }

      return refinedSegment
    })
    .filter((segment): segment is RefinedSegment => Boolean(segment))
}

export async function transcribeAudio(filePath: string): Promise<TranscriptionResponse> {
  logStep(`transcribing audio with gpt-4o-transcribe: ${basename(filePath)}`)

  try {
    const transcription = await transcribeAudioWithGpt4o(filePath)

    if (Array.isArray(transcription.segments) && transcription.segments.length > 0) {
      return transcription
    }

    throw new Error('A resposta da transcrição não trouxe segmentos utilizáveis.')
  } catch (error) {
    logStep(
      `primary transcription path did not return usable segments, falling back to verbose segmentation: ${
        error instanceof Error ? error.message : 'unknown error'
      }`
    )

    return fetchTranscription(filePath)
  }
}

export async function refineSegments(transcription: TranscriptionResponse): Promise<RefinedSegment[]> {
  logStep('refining transcript segments into complete sentences')

  const words =
    transcription.words?.filter((word) => typeof word.word === 'string' && word.word.trim().length > 0) ?? []

  if (words.length === 0) {
    const fallbackSegments =
      transcription.segments?.map((segment) => ({
        start: segment.start,
        end: segment.end,
        text: segment.text.trim()
      })) ?? []

    return dedupeSentences(combineShortSentences(fallbackSegments.filter((segment) => segment.text)))
  }

  const groupedSentences: SentenceBoundary[] = await groupWordsIntoSentences(words, transcription.text?.trim() || '')

  const rebuiltSegments = groupedSentences.map((sentence) => {
    const startWord = words[sentence.startWordIndex - 1]
    const endWord = words[sentence.endWordIndex - 1]

    return {
      start: startWord?.start ?? 0,
      end: endWord?.end ?? startWord?.end ?? 0,
      text: sentence.text.trim()
    }
  })

  return dedupeSentences(combineShortSentences(validateRefinedSegments(rebuiltSegments)))
}

export async function saveTxt(outputPath: string, segments: RefinedSegment[]): Promise<void> {
  logStep(`saving transcript txt: ${basename(outputPath)}`)

  const content =
    segments.length > 0
      ? segments.map((segment) => `[${formatTimestamp(segment.start)} - ${formatTimestamp(segment.end)}] ${segment.text}`).join('\n')
      : 'Nenhuma transcrição foi retornada.'

  await writeFile(outputPath, content, 'utf-8')
}

// Coordinates transcription, sentence refinement, and TXT generation.
export async function processAudio(filePath: string, outputPath: string): Promise<ProcessAudioResult> {
  logStep(`starting processAudio for ${basename(filePath)}`)

  const transcription = await transcribeAudio(filePath)
  const words =
    transcription.words?.filter((word) => typeof word.word === 'string' && word.word.trim().length > 0) ?? []
  const refinedSegments = await refineSegments(transcription)

  await saveTxt(outputPath, refinedSegments)

  return {
    wordOutputContent: buildWordOutputContent(words, transcription),
    sentenceOutputContent:
      refinedSegments.length > 0
        ? refinedSegments
            .map((segment) => `[${formatTimestamp(segment.start)} - ${formatTimestamp(segment.end)}] ${segment.text}`)
            .join('\n')
        : 'Nenhuma transcrição foi retornada.'
  }
}

export async function buildTranscriptionOutputs(transcription: TranscriptionResponse): Promise<{
  wordOutputContent: string
  sentenceOutputContent: string
}> {
  const words =
    transcription.words?.filter((word) => typeof word.word === 'string' && word.word.trim().length > 0) ?? []
  const refinedSegments = await refineSegments(transcription)

  return {
    wordOutputContent: buildWordOutputContent(words, transcription),
    sentenceOutputContent:
      refinedSegments.length > 0
        ? refinedSegments
            .map((segment) => `[${formatTimestamp(segment.start)} - ${formatTimestamp(segment.end)}] ${segment.text}`)
            .join('\n')
        : 'Nenhuma transcrição foi retornada.'
  }
}

export async function transcribeAudioToTxt(
  sourcePath: string,
  wordOutputFilePath: string,
  sentenceOutputFilePath: string
): Promise<void> {
  const result = await processAudio(sourcePath, sentenceOutputFilePath)

  await writeFile(wordOutputFilePath, result.wordOutputContent, 'utf-8')
}
