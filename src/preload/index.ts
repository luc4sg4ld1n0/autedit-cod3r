import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  selectMp4File: (): Promise<{
    sourcePath: string
    sourceName: string
    outputDirectory: string
    outputFilePath: string
  } | null> =>
    electronAPI.ipcRenderer.invoke('select-mp4-file'),
  convertMp4ToMp3: (selectedVideo: {
    sourcePath: string
    sourceName: string
    outputDirectory: string
    outputFilePath: string
  }): Promise<{
    sourcePath: string
    sourceName: string
    outputDirectory: string
    outputFilePath: string
  }> => electronAPI.ipcRenderer.invoke('convert-mp4-to-mp3', selectedVideo),
  selectAudioFile: (): Promise<{
    sourcePath: string
    sourceName: string
    outputDirectory: string
    wordOutputFilePath: string
    sentenceOutputFilePath: string
  } | null> => electronAPI.ipcRenderer.invoke('select-audio-file'),
  transcribeAudioToTxt: (selectedAudio: {
    sourcePath: string
    sourceName: string
    outputDirectory: string
    wordOutputFilePath: string
    sentenceOutputFilePath: string
  }): Promise<{
    sourcePath: string
    sourceName: string
    outputDirectory: string
    wordOutputFilePath: string
    sentenceOutputFilePath: string
  }> => electronAPI.ipcRenderer.invoke('transcribe-audio-to-txt', selectedAudio),
  selectVideoForCleanup: (): Promise<{
    sourcePath: string
    sourceName: string
    outputDirectory: string
    outputFilePath: string
  } | null> => electronAPI.ipcRenderer.invoke('select-video-for-cleanup'),
  selectTranscriptTxtFile: (): Promise<{
    sourcePath: string
    sourceName: string
  } | null> => electronAPI.ipcRenderer.invoke('select-transcript-txt-file'),
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
  }): Promise<{
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
  }> => electronAPI.ipcRenderer.invoke('cleanup-video-using-transcript', request)
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
