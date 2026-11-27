export type RiskLevel = 'baixo' | 'moderado' | 'alto' | 'emergencial'
export type SpeciesConfidence = 'Confiança Alta' | 'Confiança Média' | 'Confiança Baixa'

export interface TreePhotoEvidence {
  label: string
  desc: string
  color: string
  previewUrl?: string | null
}

export interface GeminiAnalysisResponse {
  status_processamento: 'aprovado' | 'refazer_foto'
  indice_foto_reprovada?: number | null
  instrucao_recaptura?: string | null
  nivel_risco: RiskLevel
  score_criticidade: number
  urgencia_acao: string
  prazo_recomendado: string
  especie_provavel: string
  confianca_especie: SpeciesConfidence
  perfil_estrutural_especie: string
  sinais_identificados: string[]
  resumo_painel_usuario: string
}

export type PhotoOrigin = 'camera' | 'gallery'

export interface CapturedSlotItem {
  file: File
  previewUrl: string
  origin: PhotoOrigin
}

export type Coordinates = { lat: number; lng: number }
