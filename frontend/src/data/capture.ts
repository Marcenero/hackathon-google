import type { RiskLevel, TreePhotoEvidence } from '../types/tree'

export const RISK: Record<RiskLevel, { label: string; color: string; ink: string; tint: string; radius: number }> = {
  emergencial: { label: 'Emergencial', color: '#ce3c46', ink: '#a72530', tint: '#fdebed', radius: 35 },
  alto: { label: 'Alto', color: '#df7930', ink: '#9c430e', tint: '#fff0e2', radius: 26 },
  moderado: { label: 'Moderado', color: '#d7a226', ink: '#74520e', tint: '#fbf1d4', radius: 18 },
  baixo: { label: 'Baixo', color: '#26946a', ink: '#146447', tint: '#e5f3ec', radius: 10 },
}

export const PHOTO_SLOTS: TreePhotoEvidence[] = [
  { label: 'Plano geral', desc: 'Enquadre a árvore da base até a copa. Inclua um poste ou prédio para servir de referência vertical.', color: '#ecf4ed' },
  { label: 'Base e raízes', desc: 'Mostre o encontro do tronco com o solo. Use o zoom para manter distância, se necessário.', color: '#f0ede4' },
  { label: 'Tronco e bifurcações', desc: 'Mostre o terço médio e os galhos principais. Registre rachaduras, galhos secos e amarras visíveis.', color: '#f2ece6' },
  { label: 'Folha ou casca', desc: 'Enquadre uma folha ou a casca com zoom, sem tocar na árvore. Pule a captura se não for seguro.', color: '#e8f1e4' },
]
