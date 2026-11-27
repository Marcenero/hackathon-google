import type { Coordinates, GeminiAnalysisResponse, RiskLevel, TreePhotoEvidence } from '../types/tree'

export const PAULISTA: Coordinates = { lat: -23.5624, lng: -46.6565 }
export const WEATHER = { wind: 55, rain: 24, multiplier: 1.3 }

export const RISK: Record<RiskLevel, { label: string; color: string; ink: string; tint: string; radius: number }> = {
  emergencial: { label: 'Emergencial', color: '#ce3c46', ink: '#a72530', tint: '#fdebed', radius: 35 },
  alto: { label: 'Alto', color: '#df7930', ink: '#9c430e', tint: '#fff0e2', radius: 26 },
  moderado: { label: 'Moderado', color: '#d7a226', ink: '#74520e', tint: '#fbf1d4', radius: 18 },
  baixo: { label: 'Baixo', color: '#26946a', ink: '#146447', tint: '#e5f3ec', radius: 10 },
}

export const PHOTO_SLOTS: TreePhotoEvidence[] = [
  { label: 'Plano geral', desc: 'Enquadre a árvore da base até a copa. Inclua um poste ou prédio para servir de referência vertical.', color: '#ecf4ed' },
  { label: 'Base e raízes', desc: 'A cerca de 1,5 m, fotografe o encontro do tronco com o solo. Inclua calçada levantada, fungos ou cavidades se forem visíveis.', color: '#f0ede4' },
  { label: 'Tronco e bifurcações', desc: 'Mostre o terço médio e os galhos principais. Registre rachaduras, galhos secos e amarras visíveis.', color: '#f2ece6' },
  { label: 'Folha ou casca', desc: 'Faça um close nítido de uma folha ou da casca para ajudar na identificação da espécie.', color: '#e8f1e4' },
]

export const DEMO_ANALYSIS: GeminiAnalysisResponse = {
  status_processamento: 'aprovado',
  nivel_risco: 'moderado',
  score_criticidade: 54,
  urgencia_acao: 'Solicitar vistoria programada',
  prazo_recomendado: 'Em até 7 dias',
  especie_provavel: 'Ipê (Handroanthus sp.)',
  confianca_especie: 'Confiança Média',
  perfil_estrutural_especie: 'Exemplar jovem no cenário de demonstração.',
  sinais_identificados: ['Amarra apertada', 'Atrito visível na casca'],
  resumo_painel_usuario: 'Neste cenário simulado, uma amarra pressiona o tronco de um ipê jovem. A equipe de arboricultura avaliaria a casca e a necessidade de ajuste da amarra em vistoria.',
}
