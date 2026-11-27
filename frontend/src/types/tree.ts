export type RiskLevel = 'baixo' | 'moderado' | 'alto' | 'emergencial'
export type SpeciesConfidence = 'Confiança Alta' | 'Confiança Média' | 'Confiança Baixa'

export interface TreePhotoEvidence {
  label: string
  desc: string
  color: string
  previewUrl?: string | null
}

export interface TreeOccurrence {
  id: string
  title: string
  address: string
  lat: number
  lng: number
  risk: RiskLevel
  score: number
  urgency: string
  deadline: string
  species: string
  speciesConfidence: SpeciesConfidence
  speciesNote: string
  summary: string
  tags: string[]
  validations: number
  validatedByMe: boolean
  photos: TreePhotoEvidence[]
  source: 'exemplo' | 'simulado' | 'gemini'
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

export interface CapturedSlotItem {
  simulated: boolean
  name: string
  file?: File
  previewUrl?: string | null
}

export type Coordinates = { lat: number; lng: number }
