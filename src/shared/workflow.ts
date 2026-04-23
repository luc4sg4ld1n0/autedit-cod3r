export interface RemovedSegment {
  index: number
  start: string
  end: string
  text: string
  reason: string
}

export interface WorkflowVideo {
  sourcePath: string
  sourceName: string
  outputDirectory: string
  audioOutputFilePath: string
  transcriptOutputFilePath: string
  cleanedVideoOutputFilePath: string
}

export interface WorkflowResult {
  sourceName: string
  outputDirectory: string
  audioOutputFilePath: string
  transcriptOutputFilePath: string
  cleanedVideoOutputFilePath: string
  analysisSummary: string
  removedSegments: RemovedSegment[]
}
