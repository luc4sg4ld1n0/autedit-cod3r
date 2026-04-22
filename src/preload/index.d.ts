import { ElectronAPI } from '@electron-toolkit/preload'

interface AppAPI {
  selectMp4File: () => Promise<{
    sourcePath: string
    sourceName: string
    outputDirectory: string
    outputFilePath: string
  } | null>
  convertMp4ToMp3: (selectedVideo: {
    sourcePath: string
    sourceName: string
    outputDirectory: string
    outputFilePath: string
  }) => Promise<{
    sourcePath: string
    sourceName: string
    outputDirectory: string
    outputFilePath: string
  }>
  selectAudioFile: () => Promise<{
    sourcePath: string
    sourceName: string
    outputDirectory: string
    wordOutputFilePath: string
    sentenceOutputFilePath: string
  } | null>
  transcribeAudioToTxt: (selectedAudio: {
    sourcePath: string
    sourceName: string
    outputDirectory: string
    wordOutputFilePath: string
    sentenceOutputFilePath: string
  }) => Promise<{
    sourcePath: string
    sourceName: string
    outputDirectory: string
    wordOutputFilePath: string
    sentenceOutputFilePath: string
  }>
  selectVideoForCleanup: () => Promise<{
    sourcePath: string
    sourceName: string
    outputDirectory: string
    outputFilePath: string
  } | null>
  selectTranscriptTxtFile: () => Promise<{
    sourcePath: string
    sourceName: string
  } | null>
  cleanupVideoUsingTranscript: (request: {
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
  }) => Promise<{
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
  }>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: AppAPI
  }
}
