import { useState } from 'react'
import type { RemovedSegment, WorkflowResult, WorkflowVideo } from '../../shared/workflow'
import ResultCard from './components/ResultCard'
import { formatRemovedSegments } from './utils/formatting'

function App(): React.JSX.Element {
  const [selectedVideo, setSelectedVideo] = useState<WorkflowVideo | null>(null)
  const [selectedFileName, setSelectedFileName] = useState<string>('')
  const [outputDirectory, setOutputDirectory] = useState<string>('')
  const [audioOutputPath, setAudioOutputPath] = useState<string>('')
  const [transcriptOutputPath, setTranscriptOutputPath] = useState<string>('')
  const [cleanedVideoOutputPath, setCleanedVideoOutputPath] = useState<string>('')
  const [analysisSummary, setAnalysisSummary] = useState<string>('')
  const [removedSegments, setRemovedSegments] = useState<RemovedSegment[]>([])
  const [statusMessage, setStatusMessage] = useState<string>(
    'Selecione um vídeo MP4 para executar o fluxo completo de edição.'
  )
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState<boolean>(false)

  const resetResults = (): void => {
    setAudioOutputPath('')
    setTranscriptOutputPath('')
    setCleanedVideoOutputPath('')
    setAnalysisSummary('')
    setRemovedSegments([])
  }

  const applyWorkflowResult = (result: WorkflowResult): void => {
    setOutputDirectory(result.outputDirectory)
    setAudioOutputPath(result.audioOutputFilePath)
    setTranscriptOutputPath(result.transcriptOutputFilePath)
    setCleanedVideoOutputPath(result.cleanedVideoOutputFilePath)
    setAnalysisSummary(result.analysisSummary)
    setRemovedSegments(result.removedSegments)
  }

  const handleSelectVideo = async (): Promise<void> => {
    try {
      setErrorMessage('')
      setStatusMessage('Selecionando vídeo...')

      const video = await window.api.selectWorkflowVideo()

      if (!video) {
        setStatusMessage('Nenhum vídeo foi selecionado.')
        return
      }

      setSelectedVideo(video)
      setSelectedFileName(video.sourceName)
      setOutputDirectory(video.outputDirectory)
      resetResults()
      setStatusMessage('Vídeo selecionado. Clique em "Iniciar processo" para executar todo o fluxo.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ocorreu um erro ao selecionar o vídeo.'
      setErrorMessage(message)
      setStatusMessage('Não foi possível selecionar o vídeo.')
      setSelectedVideo(null)
      setSelectedFileName('')
      setOutputDirectory('')
      resetResults()
    }
  }

  const handleStartProcess = async (): Promise<void> => {
    if (!selectedVideo) {
      return
    }

    try {
      setIsProcessing(true)
      setErrorMessage('')
      setStatusMessage('Processando vídeo, extraindo áudio, transcrevendo e limpando trechos problemáticos...')

      const result = await window.api.processWorkflowVideo(selectedVideo)

      applyWorkflowResult(result)
      setStatusMessage('Fluxo concluído com sucesso.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ocorreu um erro ao processar o vídeo.'
      setErrorMessage(message)
      setStatusMessage('Não foi possível concluir o processamento do vídeo.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <main className="screen">
      <section className="card">
        <span className="eyebrow">Autedit Cod3r</span>
        <h1>Processamento completo de vídeo</h1>
        <p className="description">
          Selecione um arquivo MP4 para executar automaticamente todo o fluxo: criar pasta de saída,
          converter para MP3, transcrever em TXT por frases e remover trechos problemáticos do vídeo.
        </p>

        <div className="actions">
          <button className="select-button" type="button" onClick={handleSelectVideo} disabled={isProcessing}>
            Selecionar vídeo
          </button>
          <button
            className="select-button secondary-button"
            type="button"
            onClick={handleStartProcess}
            disabled={isProcessing || !selectedVideo}
          >
            {isProcessing ? 'Processando...' : 'Iniciar processo'}
          </button>
        </div>

        <ResultCard label="Arquivo selecionado" value={selectedFileName || 'Nenhum arquivo selecionado.'} />
        <ResultCard label="Status" value={statusMessage} />
        <ResultCard label="Pasta de saída" value={outputDirectory || 'Aguardando seleção de arquivo.'} />
        <ResultCard label="Áudio MP3 gerado" value={audioOutputPath || 'Nenhum áudio gerado ainda.'} />
        <ResultCard
          label="Transcrição TXT por frases"
          value={transcriptOutputPath || 'Nenhuma transcrição gerada ainda.'}
        />
        <ResultCard
          label="Vídeo final editado"
          value={cleanedVideoOutputPath || 'Nenhum vídeo final gerado ainda.'}
        />
        <ResultCard label="Resumo da análise" value={analysisSummary || 'Aguardando processamento.'} />
        <ResultCard label="Trechos removidos" value={formatRemovedSegments(removedSegments)} />

        {errorMessage ? <ResultCard label="Erro" value={errorMessage} isError /> : null}
      </section>
    </main>
  )
}

export default App
