export interface TranscriptionWord {
  start: number
  end: number
  word: string
}

export interface TranscriptSegment {
  index: number
  start: number
  end: number
  text: string
}

export interface CleanupAnalysisSelection {
  index: number
  reason: string
}

export interface CleanupAnalysisResult {
  summary: string
  selections: CleanupAnalysisSelection[]
}

export interface TranscriptionResponse {
  text?: string
  words?: TranscriptionWord[]
  segments?: Array<{ start: number; end: number; text: string }>
}

export interface SentenceBoundary {
  startWordIndex: number
  endWordIndex: number
  text: string
}
