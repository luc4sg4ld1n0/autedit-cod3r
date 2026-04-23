import { app } from 'electron'
import { basename, extname, join } from 'node:path'
import { mkdir, writeFile } from 'node:fs/promises'
import type { WorkflowResult, WorkflowVideo } from '../../shared/workflow'
import { sanitizeDirectoryName } from '../utils/paths'
import { convertVideoToMp3 } from './ffmpeg'
import { cleanupVideoUsingTranscript } from './cleanup'
import { fetchTranscription } from './openai'
import { buildTranscriptionOutputs } from './transcription'

export function buildUnifiedWorkflowSelection(path: string): WorkflowVideo {
  const sourceName = path.split(/[\\/]/).pop() ?? path
  const videoName = sanitizeDirectoryName(basename(path, extname(path)))
  const outputDirectory = join(app.getPath('desktop'), 'VIDEOS_EDITADOS', videoName)

  return {
    sourcePath: path,
    sourceName,
    outputDirectory,
    audioOutputFilePath: join(outputDirectory, `${videoName}.mp3`),
    transcriptOutputFilePath: join(outputDirectory, `${videoName}_frases.txt`),
    cleanedVideoOutputFilePath: join(outputDirectory, `${videoName}_sem_erros.mp4`)
  }
}

export async function processUnifiedWorkflow(video: WorkflowVideo): Promise<WorkflowResult> {
  await mkdir(video.outputDirectory, { recursive: true })
  await convertVideoToMp3(video.sourcePath, video.audioOutputFilePath)

  const transcription = await fetchTranscription(video.audioOutputFilePath)
  const { sentenceOutputContent } = await buildTranscriptionOutputs(transcription)
  await writeFile(video.transcriptOutputFilePath, sentenceOutputContent, 'utf-8')

  const cleanupResult = await cleanupVideoUsingTranscript({
    video: {
      sourcePath: video.sourcePath,
      sourceName: video.sourceName,
      outputDirectory: video.outputDirectory,
      outputFilePath: video.cleanedVideoOutputFilePath
    },
    transcript: {
      sourcePath: video.transcriptOutputFilePath,
      sourceName: basename(video.transcriptOutputFilePath)
    }
  })

  return {
    sourceName: video.sourceName,
    outputDirectory: video.outputDirectory,
    audioOutputFilePath: video.audioOutputFilePath,
    transcriptOutputFilePath: video.transcriptOutputFilePath,
    cleanedVideoOutputFilePath: cleanupResult.outputFilePath,
    analysisSummary: cleanupResult.summary,
    removedSegments: cleanupResult.removedSegments
  }
}
