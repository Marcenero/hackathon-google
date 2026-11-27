import type { GeminiAnalysisResponse } from './types/tree'

const config = import.meta.env.VITE_API_URL?.trim() || (import.meta.env.DEV ? 'http://localhost:8000' : '')

function analysisUrl() {
  try {
    const url = new URL(config)
    if ((!import.meta.env.DEV && url.protocol !== 'https:') || !['http:', 'https:'].includes(url.protocol) ||
      url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error()
    return new URL('/api/analisar-arvore', url)
  } catch {
    throw new Error('Serviço de análise sem uma URL válida. Avise a equipe responsável pelo protótipo.')
  }
}

function isAnalysis(value: unknown): value is GeminiAnalysisResponse {
  if (typeof value !== 'object' || !value) return false
  const result = value as Record<string, unknown>
  if (result.status_processamento === 'refazer_foto') {
    const index = result.indice_foto_reprovada
    return typeof index === 'number' && Number.isInteger(index) && index >= 1 && index <= 4 &&
      typeof result.instrucao_recaptura === 'string' && Boolean(result.instrucao_recaptura.trim())
  }
  return result.status_processamento === 'aprovado' &&
    ['baixo', 'moderado', 'alto', 'emergencial'].includes(String(result.nivel_risco)) &&
    typeof result.score_criticidade === 'number' && Number.isInteger(result.score_criticidade) &&
    result.score_criticidade >= 0 && result.score_criticidade <= 100 &&
    ['Confiança Alta', 'Confiança Média', 'Confiança Baixa'].includes(String(result.confianca_especie)) &&
    ['urgencia_acao', 'prazo_recomendado', 'especie_provavel', 'resumo_painel_usuario'].every((name) => {
      const field = result[name]
      return typeof field === 'string' && Boolean(field.trim())
    }) &&
    typeof result.perfil_estrutural_especie === 'string' &&
    Array.isArray(result.sinais_identificados) && result.sinais_identificados.every((signal) => typeof signal === 'string')
}

export async function analyzePhotos(form: FormData, controller: AbortController) {
  const url = analysisUrl()
  const timeout = window.setTimeout(() => controller.abort('timeout'), 80_000)
  try {
    let response: Response
    try {
      response = await fetch(url, { method: 'POST', body: form, signal: controller.signal })
    } catch (error) {
      if (controller.signal.reason === 'timeout') throw new Error('O servidor demorou para responder. Aguarde e tente novamente.')
      if (controller.signal.aborted) throw error
      throw new Error('Não foi possível conectar ao servidor. Confira sua conexão e tente novamente.')
    }
    const result: unknown = await response.json().catch(() => null)
    if (!response.ok) {
      if (result && typeof result === 'object' && 'detail' in result && typeof result.detail === 'string') {
        const wait = Number(response.headers.get('Retry-After'))
        if (response.status === 429 && wait > 0) {
          throw new Error(`${result.detail} Tempo até nova tentativa: ${Math.ceil(wait / 60)} min ou menos.`)
        }
        throw new Error(result.detail)
      }
      if (response.status >= 500) throw new Error('O servidor de análise está temporariamente indisponível. Tente novamente.')
      throw new Error('O servidor não aceitou o envio. Confira as quatro fotos e tente novamente.')
    }
    if (!isAnalysis(result)) throw new Error('O servidor retornou uma triagem incompleta. Tente novamente.')
    return result
  } finally {
    window.clearTimeout(timeout)
  }
}
