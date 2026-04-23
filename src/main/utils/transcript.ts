import type { TranscriptSegment } from '../types/transcript'
import { parseTimestamp } from './timestamps'

export function parseTranscriptSegments(transcriptContent: string): TranscriptSegment[] {
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

export function mergeRanges(ranges: Array<{ start: number; end: number }>): Array<{ start: number; end: number }> {
  if (ranges.length === 0) {
    return []
  }

  const sortedRanges = [...ranges].sort((first, second) => first.start - second.start)
  const merged = [{ ...sortedRanges[0] }]

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

export function normalizeTranscriptText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function looksIncomplete(text: string): boolean {
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

  return words[words.length - 1].length <= 2
}
