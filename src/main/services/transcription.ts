import { writeFile } from 'node:fs/promises'
import type { SentenceBoundary, TranscriptionResponse, TranscriptionWord } from '../types/transcript'
import { formatTimestamp } from '../utils/timestamps'
import { fetchTranscription, groupWordsIntoSentences } from './openai'

function buildWordOutputContent(words: TranscriptionWord[], transcription: TranscriptionResponse): string {
  const wordLines =
    words
      ?.map((word) => {
        if (!word.word || !word.word.trim()) {
          return null
        }

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

  return wordLines.length > 0
    ? wordLines.join('\n')
    : segmentLines.length > 0
      ? segmentLines.join('\n')
      : transcription.text?.trim() || 'Nenhuma transcrição foi retornada.'
}

function buildFallbackSentenceOutput(transcription: TranscriptionResponse): string {
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

  return segmentLines.length > 0
    ? segmentLines.join('\n')
    : transcription.text?.trim() || 'Nenhuma transcrição foi retornada.'
}

function buildAiSentenceOutput(words: TranscriptionWord[], sentences: SentenceBoundary[]): string | null {
  if (sentences.length === 0) {
    return null
  }

  let expectedIndex = 1
  const lines: string[] = []

  for (const sentence of sentences) {
    if (
      !Number.isInteger(sentence.startWordIndex) ||
      !Number.isInteger(sentence.endWordIndex) ||
      sentence.startWordIndex !== expectedIndex ||
      sentence.endWordIndex < sentence.startWordIndex ||
      sentence.endWordIndex > words.length
    ) {
      return null
    }

    const startWord = words[sentence.startWordIndex - 1]
    const endWord = words[sentence.endWordIndex - 1]
    const text = sentence.text.trim()

    if (!text) {
      return null
    }

    lines.push(`[${formatTimestamp(startWord.start)} - ${formatTimestamp(endWord.end)}] ${text}`)
    expectedIndex = sentence.endWordIndex + 1
  }

  if (expectedIndex !== words.length + 1) {
    return null
  }

  return lines.join('\n')
}

export async function buildTranscriptionOutputs(transcription: TranscriptionResponse): Promise<{
  wordOutputContent: string
  sentenceOutputContent: string
}> {
  const filteredWords =
    transcription.words?.filter((word) => typeof word.word === 'string' && word.word.trim().length > 0) ?? []
  const fallbackSentenceOutput = buildFallbackSentenceOutput(transcription)
  let sentenceOutputContent = fallbackSentenceOutput

  if (filteredWords.length > 0) {
    try {
      const groupedSentences = await groupWordsIntoSentences(filteredWords, transcription.text?.trim() || '')
      sentenceOutputContent = buildAiSentenceOutput(filteredWords, groupedSentences) || fallbackSentenceOutput
    } catch {
      sentenceOutputContent = fallbackSentenceOutput
    }
  }

  return {
    wordOutputContent: buildWordOutputContent(filteredWords, transcription),
    sentenceOutputContent
  }
}

export async function transcribeAudioToTxt(
  sourcePath: string,
  wordOutputFilePath: string,
  sentenceOutputFilePath: string
): Promise<void> {
  const transcription = await fetchTranscription(sourcePath)
  const outputs = await buildTranscriptionOutputs(transcription)

  await Promise.all([
    writeFile(wordOutputFilePath, outputs.wordOutputContent, 'utf-8'),
    writeFile(sentenceOutputFilePath, outputs.sentenceOutputContent, 'utf-8')
  ])
}
