import { basename, extname } from 'node:path'
import { readFile } from 'node:fs/promises'
import type {
  CleanupAnalysisResult,
  SentenceBoundary,
  TranscriptSegment,
  TranscriptionResponse,
  TranscriptionWord
} from '../types/transcript'
import { formatTimestamp } from '../utils/timestamps'

function getApiKey(): string {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    throw new Error('A variável OPENAI_API_KEY não foi encontrada. Configure a chave no arquivo .env.')
  }

  return apiKey
}

function getMimeType(filePath: string): string {
  const extension = extname(filePath).toLowerCase()

  switch (extension) {
    case '.mp3':
      return 'audio/mpeg'
    case '.wav':
      return 'audio/wav'
    case '.m4a':
      return 'audio/mp4'
    case '.webm':
      return 'audio/webm'
    case '.mpga':
    case '.mpeg':
      return 'audio/mpeg'
    default:
      return 'application/octet-stream'
  }
}

function extractResponseText(responseJson: unknown): string {
  if (typeof responseJson !== 'object' || responseJson === null) {
    return ''
  }

  const response = responseJson as {
    output_text?: string
    output?: Array<{
      content?: Array<{ type?: string; text?: string }>
    }>
  }

  if (typeof response.output_text === 'string' && response.output_text.trim()) {
    return response.output_text
  }

  for (const item of response.output ?? []) {
    for (const contentItem of item.content ?? []) {
      if (contentItem.type === 'output_text' && typeof contentItem.text === 'string') {
        return contentItem.text
      }
    }
  }

  return ''
}

export async function fetchTranscription(sourcePath: string): Promise<TranscriptionResponse> {
  const apiKey = getApiKey()
  const audioBuffer = await readFile(sourcePath)
  const formData = new FormData()

  formData.append('file', new Blob([audioBuffer], { type: getMimeType(sourcePath) }), basename(sourcePath))
  formData.append('model', 'whisper-1')
  formData.append('response_format', 'verbose_json')
  formData.append('temperature', '0')
  formData.append('timestamp_granularities[]', 'word')
  formData.append('timestamp_granularities[]', 'segment')

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    body: formData
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(errorText || 'Não foi possível transcrever o áudio com a OpenAI.')
  }

  return (await response.json()) as TranscriptionResponse
}

export async function analyzeTranscriptForCleanup(
  segments: TranscriptSegment[]
): Promise<CleanupAnalysisResult> {
  const apiKey = getApiKey()
  const compactSegments = segments
    .map(
      (segment) =>
        `${segment.index}. [${formatTimestamp(segment.start)} - ${formatTimestamp(segment.end)}] ${segment.text}`
    )
    .join('\n')

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      input: [
        {
          role: 'system',
          content: [
            {
              type: 'input_text',
              text:
                'Analise uma transcrição segmentada e retorne JSON com os trechos que parecem erros de gravação. ' +
                'Considere como erro frases claramente cortadas, incompletas, interrompidas abruptamente, ' +
                'repetidas, duplicadas, sobrepostas parcialmente ou sem coerência com o contexto vizinho. ' +
                'Frases repetidas ou recomeçadas após uma interrupção também devem ser marcadas quando parecerem ' +
                'resultado de erro de gravação. Seja criterioso, mas não ignore sinais claros de repetição ou truncamento.'
            }
          ]
        },
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text:
                'Responda em JSON. Para cada trecho problemático, devolva o índice e um motivo curto. ' +
                'Procure especialmente por frases incompletas, frases que terminam abruptamente, palavras finais ' +
                'truncadas, frases repetidas em sequência e regravações visíveis do mesmo conteúdo. ' +
                'Trechos da transcrição:\n' +
                compactSegments
            }
          ]
        }
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'cleanup_segments',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              summary: { type: 'string' },
              selections: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    index: { type: 'integer' },
                    reason: { type: 'string' }
                  },
                  required: ['index', 'reason']
                }
              }
            },
            required: ['summary', 'selections']
          }
        }
      }
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(errorText || 'Não foi possível analisar a transcrição com a OpenAI.')
  }

  const outputText = extractResponseText(await response.json())

  if (!outputText) {
    throw new Error('A OpenAI não retornou uma análise utilizável para os trechos da transcrição.')
  }

  const parsed = JSON.parse(outputText) as CleanupAnalysisResult

  return {
    summary: parsed.summary,
    selections: Array.isArray(parsed.selections) ? parsed.selections : []
  }
}

export async function groupWordsIntoSentences(
  words: TranscriptionWord[],
  fullTranscript: string
): Promise<SentenceBoundary[]> {
  const apiKey = getApiKey()
  const compactWords = words
    .map(
      (word, index) =>
        `${index + 1}. [${formatTimestamp(word.start)} - ${formatTimestamp(word.end)}] ${word.word.trim()}`
    )
    .join('\n')

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      input: [
        {
          role: 'system',
          content: [
            {
              type: 'input_text',
              text:
                'Você recebe palavras transcritas com timestamps de início e fim. Sua tarefa é agrupar palavras ' +
                'consecutivas em frases completas. Não corte uma frase no meio. Prefira manter frases completas, ' +
                'mesmo que sejam um pouco longas, em vez de criar fragmentos curtos. Não invente texto, não omita ' +
                'palavras e preserve a ordem original. Use os índices das palavras como base e devolva apenas grupos ' +
                'contíguos de palavras.'
            }
          ]
        },
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text:
                'Crie uma segmentação por frases mais precisa para o TXT final. Cada frase deve ser completa e não ' +
                'deve ser dividida no meio. Use todos os índices em ordem, sem sobreposição. Transcrição completa:\n' +
                `${fullTranscript || '(sem texto completo)'}\n\nPalavras com timestamps:\n${compactWords}`
            }
          ]
        }
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'sentence_boundaries',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              sentences: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    startWordIndex: { type: 'integer' },
                    endWordIndex: { type: 'integer' },
                    text: { type: 'string' }
                  },
                  required: ['startWordIndex', 'endWordIndex', 'text']
                }
              }
            },
            required: ['sentences']
          }
        }
      }
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(errorText || 'Não foi possível segmentar a transcrição em frases com a OpenAI.')
  }

  const outputText = extractResponseText(await response.json())

  if (!outputText) {
    throw new Error('A OpenAI não retornou uma segmentação por frases utilizável.')
  }

  const parsed = JSON.parse(outputText) as { sentences?: SentenceBoundary[] }

  return Array.isArray(parsed.sentences) ? parsed.sentences : []
}
