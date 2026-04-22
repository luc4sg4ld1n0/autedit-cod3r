import { useState } from 'react'

type TabId = 'video-to-audio' | 'audio-to-text' | 'video-cleanup'

interface SelectedVideo {
  sourcePath: string
  sourceName: string
  outputDirectory: string
  outputFilePath: string
}

interface SelectedAudio {
  sourcePath: string
  sourceName: string
  outputDirectory: string
  wordOutputFilePath: string
  sentenceOutputFilePath: string
}

interface SelectedCleanupVideo {
  sourcePath: string
  sourceName: string
  outputDirectory: string
  outputFilePath: string
}

interface SelectedTranscriptFile {
  sourcePath: string
  sourceName: string
}

interface CleanupResult {
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
}

function App(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<TabId>('video-to-audio')
  const [selectedVideo, setSelectedVideo] = useState<SelectedVideo | null>(null)
  const [selectedFileName, setSelectedFileName] = useState<string>('')
  const [outputDirectory, setOutputDirectory] = useState<string>('')
  const [outputFilePath, setOutputFilePath] = useState<string>('')
  const [statusMessage, setStatusMessage] = useState<string>('Selecione um vídeo MP4 para preparar a conversão.')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [isConverting, setIsConverting] = useState<boolean>(false)
  const [selectedAudio, setSelectedAudio] = useState<SelectedAudio | null>(null)
  const [selectedAudioName, setSelectedAudioName] = useState<string>('')
  const [wordTranscriptionOutputPath, setWordTranscriptionOutputPath] = useState<string>('')
  const [sentenceTranscriptionOutputPath, setSentenceTranscriptionOutputPath] = useState<string>('')
  const [transcriptionStatusMessage, setTranscriptionStatusMessage] = useState<string>(
    'Selecione um arquivo de áudio para preparar a transcrição.'
  )
  const [transcriptionErrorMessage, setTranscriptionErrorMessage] = useState<string>('')
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false)
  const [cleanupVideo, setCleanupVideo] = useState<SelectedCleanupVideo | null>(null)
  const [cleanupTranscript, setCleanupTranscript] = useState<SelectedTranscriptFile | null>(null)
  const [cleanupVideoName, setCleanupVideoName] = useState<string>('')
  const [cleanupTranscriptName, setCleanupTranscriptName] = useState<string>('')
  const [cleanupOutputPath, setCleanupOutputPath] = useState<string>('')
  const [cleanupSummary, setCleanupSummary] = useState<string>('')
  const [cleanupRemovedSegments, setCleanupRemovedSegments] = useState<CleanupResult['removedSegments']>([])
  const [cleanupStatusMessage, setCleanupStatusMessage] = useState<string>(
    'Selecione um vídeo MP4 e um TXT de frases para preparar a limpeza.'
  )
  const [cleanupErrorMessage, setCleanupErrorMessage] = useState<string>('')
  const [isCleaningVideo, setIsCleaningVideo] = useState<boolean>(false)

  const handleSelectFile = async (): Promise<void> => {
    try {
      setErrorMessage('')
      setStatusMessage('Selecionando arquivo...')

      const selectedFile = await window.api.selectMp4File()

      if (!selectedFile) {
        setStatusMessage('Nenhum arquivo foi selecionado.')
        return
      }

      setSelectedVideo(selectedFile)
      setSelectedFileName(selectedFile.sourceName)
      setOutputDirectory(selectedFile.outputDirectory)
      setOutputFilePath('')
      setStatusMessage('Arquivo selecionado. Clique em "Converter para MP3" para confirmar a conversão.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ocorreu um erro ao selecionar o vídeo.'
      setErrorMessage(message)
      setStatusMessage('Não foi possível selecionar o arquivo.')
      setSelectedVideo(null)
      setSelectedFileName('')
      setOutputDirectory('')
      setOutputFilePath('')
    }
  }

  const handleConfirmConversion = async (): Promise<void> => {
    if (!selectedVideo) {
      return
    }

    try {
      setIsConverting(true)
      setErrorMessage('')
      setStatusMessage('Convertendo vídeo para MP3...')

      const result = await window.api.convertMp4ToMp3(selectedVideo)

      setOutputDirectory(result.outputDirectory)
      setOutputFilePath(result.outputFilePath)
      setStatusMessage('Conversão concluída com sucesso.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ocorreu um erro ao converter o vídeo.'
      setErrorMessage(message)
      setStatusMessage('Não foi possível concluir a conversão.')
      setOutputFilePath('')
    } finally {
      setIsConverting(false)
    }
  }

  const handleSelectAudioFile = async (): Promise<void> => {
    try {
      setTranscriptionErrorMessage('')
      setTranscriptionStatusMessage('Selecionando arquivo de áudio...')

      const audioFile = await window.api.selectAudioFile()

      if (!audioFile) {
        setTranscriptionStatusMessage('Nenhum arquivo de áudio foi selecionado.')
        return
      }

      setSelectedAudio(audioFile)
      setSelectedAudioName(audioFile.sourceName)
      setWordTranscriptionOutputPath(audioFile.wordOutputFilePath)
      setSentenceTranscriptionOutputPath(audioFile.sentenceOutputFilePath)
      setTranscriptionStatusMessage(
        'Arquivo selecionado. Clique em "Transcrever para TXT" para iniciar a transcrição.'
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ocorreu um erro ao selecionar o áudio.'
      setTranscriptionErrorMessage(message)
      setTranscriptionStatusMessage('Não foi possível selecionar o arquivo de áudio.')
      setSelectedAudio(null)
      setSelectedAudioName('')
      setWordTranscriptionOutputPath('')
      setSentenceTranscriptionOutputPath('')
    }
  }

  const handleTranscribeAudio = async (): Promise<void> => {
    if (!selectedAudio) {
      return
    }

    try {
      setIsTranscribing(true)
      setTranscriptionErrorMessage('')
      setTranscriptionStatusMessage('Transcrevendo áudio com a OpenAI...')

      const result = await window.api.transcribeAudioToTxt(selectedAudio)

      setWordTranscriptionOutputPath(result.wordOutputFilePath)
      setSentenceTranscriptionOutputPath(result.sentenceOutputFilePath)
      setTranscriptionStatusMessage('Transcrição concluída com sucesso.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ocorreu um erro ao transcrever o áudio.'
      setTranscriptionErrorMessage(message)
      setTranscriptionStatusMessage('Não foi possível concluir a transcrição.')
    } finally {
      setIsTranscribing(false)
    }
  }

  const handleSelectCleanupVideo = async (): Promise<void> => {
    try {
      setCleanupErrorMessage('')
      setCleanupStatusMessage('Selecionando vídeo para limpeza...')

      const selected = await window.api.selectVideoForCleanup()

      if (!selected) {
        setCleanupStatusMessage('Nenhum vídeo foi selecionado.')
        return
      }

      setCleanupVideo(selected)
      setCleanupVideoName(selected.sourceName)
      setCleanupOutputPath(selected.outputFilePath)
      setCleanupSummary('')
      setCleanupRemovedSegments([])
      setCleanupStatusMessage('Vídeo selecionado. Agora escolha o TXT da transcrição.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ocorreu um erro ao selecionar o vídeo.'
      setCleanupErrorMessage(message)
      setCleanupStatusMessage('Não foi possível selecionar o vídeo.')
      setCleanupVideo(null)
      setCleanupVideoName('')
      setCleanupOutputPath('')
    }
  }

  const handleSelectCleanupTranscript = async (): Promise<void> => {
    try {
      setCleanupErrorMessage('')
      setCleanupStatusMessage('Selecionando TXT da transcrição...')

      const selected = await window.api.selectTranscriptTxtFile()

      if (!selected) {
        setCleanupStatusMessage('Nenhum TXT foi selecionado.')
        return
      }

      setCleanupTranscript(selected)
      setCleanupTranscriptName(selected.sourceName)
      setCleanupSummary('')
      setCleanupRemovedSegments([])
      setCleanupStatusMessage('Arquivos selecionados. Clique em "Limpar vídeo" para iniciar a análise.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ocorreu um erro ao selecionar o TXT.'
      setCleanupErrorMessage(message)
      setCleanupStatusMessage('Não foi possível selecionar o TXT da transcrição.')
      setCleanupTranscript(null)
      setCleanupTranscriptName('')
    }
  }

  const handleCleanupVideo = async (): Promise<void> => {
    if (!cleanupVideo || !cleanupTranscript) {
      return
    }

    try {
      setIsCleaningVideo(true)
      setCleanupErrorMessage('')
      setCleanupStatusMessage('Analisando a transcrição e removendo trechos problemáticos...')

      const result = await window.api.cleanupVideoUsingTranscript({
        video: cleanupVideo,
        transcript: cleanupTranscript
      })

      setCleanupOutputPath(result.outputFilePath)
      setCleanupSummary(result.summary)
      setCleanupRemovedSegments(result.removedSegments)
      setCleanupStatusMessage('Processamento concluído com sucesso.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ocorreu um erro ao limpar o vídeo.'
      setCleanupErrorMessage(message)
      setCleanupStatusMessage('Não foi possível concluir a limpeza do vídeo.')
    } finally {
      setIsCleaningVideo(false)
    }
  }

  return (
    <main className="screen">
      <section className="card">
        <span className="eyebrow">Autedit Cod3r</span>
        <div className="tabs" role="tablist" aria-label="Funcionalidades">
          <button
            className={`tab-button ${activeTab === 'video-to-audio' ? 'tab-active' : ''}`}
            type="button"
            role="tab"
            aria-selected={activeTab === 'video-to-audio'}
            onClick={() => setActiveTab('video-to-audio')}
          >
            Vídeo para Áudio
          </button>
          <button
            className={`tab-button ${activeTab === 'audio-to-text' ? 'tab-active' : ''}`}
            type="button"
            role="tab"
            aria-selected={activeTab === 'audio-to-text'}
            onClick={() => setActiveTab('audio-to-text')}
          >
            Áudio para Texto
          </button>
          <button
            className={`tab-button ${activeTab === 'video-cleanup' ? 'tab-active' : ''}`}
            type="button"
            role="tab"
            aria-selected={activeTab === 'video-cleanup'}
            onClick={() => setActiveTab('video-cleanup')}
          >
            Limpeza de Vídeo
          </button>
        </div>

        {activeTab === 'video-to-audio' ? (
          <>
            <h1>Converta um vídeo MP4 em áudio MP3</h1>
            <p className="description">
              Escolha um vídeo, crie a estrutura de saída no Desktop e confirme a conversão com FFmpeg.
            </p>

            <div className="actions">
              <button className="select-button" type="button" onClick={handleSelectFile} disabled={isConverting}>
                Selecionar vídeo
              </button>
              <button
                className="select-button secondary-button"
                type="button"
                onClick={handleConfirmConversion}
                disabled={isConverting || !selectedVideo}
              >
                {isConverting ? 'Convertendo...' : 'Converter para MP3'}
              </button>
            </div>

            <div className="result" aria-live="polite">
              <span className="result-label">Arquivo selecionado</span>
              <strong>{selectedFileName || 'Nenhum arquivo selecionado.'}</strong>
            </div>

            <div className="result" aria-live="polite">
              <span className="result-label">Status</span>
              <strong>{statusMessage}</strong>
            </div>

            <div className="result" aria-live="polite">
              <span className="result-label">Pasta de saída</span>
              <strong>{outputDirectory || 'Aguardando seleção de arquivo.'}</strong>
            </div>

            <div className="result" aria-live="polite">
              <span className="result-label">Arquivo MP3 gerado</span>
              <strong>{outputFilePath || 'Nenhum áudio gerado ainda.'}</strong>
            </div>

            {errorMessage ? (
              <div className="result error-box" aria-live="assertive">
                <span className="result-label">Erro</span>
                <strong>{errorMessage}</strong>
              </div>
            ) : null}
          </>
        ) : activeTab === 'audio-to-text' ? (
          <>
            <h1>Transcreva um áudio para TXT com timestamps</h1>
            <p className="description">
              Escolha um arquivo de áudio e gere um arquivo `.txt` no mesmo diretório com início e fim de
              cada palavra transcrita.
            </p>

            <div className="actions">
              <button
                className="select-button"
                type="button"
                onClick={handleSelectAudioFile}
                disabled={isTranscribing}
              >
                Selecionar áudio
              </button>
              <button
                className="select-button secondary-button"
                type="button"
                onClick={handleTranscribeAudio}
                disabled={isTranscribing || !selectedAudio}
              >
                {isTranscribing ? 'Transcrevendo...' : 'Transcrever para TXT'}
              </button>
            </div>

            <div className="result" aria-live="polite">
              <span className="result-label">Arquivo selecionado</span>
              <strong>{selectedAudioName || 'Nenhum áudio selecionado.'}</strong>
            </div>

            <div className="result" aria-live="polite">
              <span className="result-label">Status</span>
              <strong>{transcriptionStatusMessage}</strong>
            </div>

            <div className="result" aria-live="polite">
              <span className="result-label">Arquivo TXT por palavras</span>
              <strong>{wordTranscriptionOutputPath || 'Nenhum arquivo TXT gerado ainda.'}</strong>
            </div>

            <div className="result" aria-live="polite">
              <span className="result-label">Arquivo TXT por frases</span>
              <strong>{sentenceTranscriptionOutputPath || 'Nenhum arquivo TXT gerado ainda.'}</strong>
            </div>

            {transcriptionErrorMessage ? (
              <div className="result error-box" aria-live="assertive">
                <span className="result-label">Erro</span>
                <strong>{transcriptionErrorMessage}</strong>
              </div>
            ) : null}
          </>
        ) : (
          <>
            <h1>Remova erros de gravação de um vídeo</h1>
            <p className="description">
              Selecione o vídeo em MP4 e o arquivo de transcrição `.txt` por frases. A IA identifica trechos
              cortados, incompletos, repetidos ou incoerentes e o FFmpeg remove esses intervalos do vídeo.
            </p>

            <div className="actions">
              <button
                className="select-button"
                type="button"
                onClick={handleSelectCleanupVideo}
                disabled={isCleaningVideo}
              >
                Selecionar vídeo
              </button>
              <button
                className="select-button secondary-button"
                type="button"
                onClick={handleSelectCleanupTranscript}
                disabled={isCleaningVideo}
              >
                Selecionar transcrição TXT
              </button>
              <button
                className="select-button"
                type="button"
                onClick={handleCleanupVideo}
                disabled={isCleaningVideo || !cleanupVideo || !cleanupTranscript}
              >
                {isCleaningVideo ? 'Limpando vídeo...' : 'Limpar vídeo'}
              </button>
            </div>

            <div className="result" aria-live="polite">
              <span className="result-label">Vídeo selecionado</span>
              <strong>{cleanupVideoName || 'Nenhum vídeo selecionado.'}</strong>
            </div>

            <div className="result" aria-live="polite">
              <span className="result-label">Transcrição selecionada</span>
              <strong>{cleanupTranscriptName || 'Nenhum TXT selecionado.'}</strong>
            </div>

            <div className="result" aria-live="polite">
              <span className="result-label">Status</span>
              <strong>{cleanupStatusMessage}</strong>
            </div>

            <div className="result" aria-live="polite">
              <span className="result-label">Vídeo gerado</span>
              <strong>{cleanupOutputPath || 'Nenhum vídeo gerado ainda.'}</strong>
            </div>

            <div className="result" aria-live="polite">
              <span className="result-label">Resumo da análise</span>
              <strong>{cleanupSummary || 'Aguardando análise da IA.'}</strong>
            </div>

            <div className="result" aria-live="polite">
              <span className="result-label">Trechos removidos</span>
              <strong>
                {cleanupRemovedSegments.length > 0
                  ? cleanupRemovedSegments
                      .map(
                        (segment) =>
                          `#${segment.index} [${segment.start} - ${segment.end}] ${segment.text} (${segment.reason})`
                      )
                      .join('\n')
                  : 'Nenhum trecho removido ainda.'}
              </strong>
            </div>

            {cleanupErrorMessage ? (
              <div className="result error-box" aria-live="assertive">
                <span className="result-label">Erro</span>
                <strong>{cleanupErrorMessage}</strong>
              </div>
            ) : null}
          </>
        )}
      </section>
    </main>
  )
}

export default App
