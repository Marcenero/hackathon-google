import type { Coordinates, GeminiAnalysisResponse, RiskLevel, TreeOccurrence, TreePhotoEvidence } from '../types/tree'

export const PAULISTA: Coordinates = { lat: -23.5624, lng: -46.6565 }
export const WEATHER = { wind: 55, rain: 24, multiplier: 1.3 }

export const RISK: Record<RiskLevel, { label: string; color: string; ink: string; tint: string; radius: number }> = {
  emergencial: { label: 'Emergencial', color: '#ce3c46', ink: '#a72530', tint: '#fdebed', radius: 35 },
  alto: { label: 'Alto', color: '#df7930', ink: '#9c430e', tint: '#fff0e2', radius: 26 },
  moderado: { label: 'Moderado', color: '#d7a226', ink: '#74520e', tint: '#fbf1d4', radius: 18 },
  baixo: { label: 'Baixo', color: '#26946a', ink: '#146447', tint: '#e5f3ec', radius: 10 },
}

export const RISKS: RiskLevel[] = ['emergencial', 'alto', 'moderado', 'baixo']

export const PHOTO_SLOTS: TreePhotoEvidence[] = [
  { label: 'Plano geral', desc: 'Enquadre a árvore da base até a copa. Inclua um poste ou prédio para servir de referência vertical.', color: '#ecf4ed' },
  { label: 'Base e raízes', desc: 'A cerca de 1,5 m, fotografe o encontro do tronco com o solo. Inclua calçada levantada, fungos ou cavidades se forem visíveis.', color: '#f0ede4' },
  { label: 'Tronco e bifurcações', desc: 'Mostre o terço médio e os galhos principais. Registre rachaduras, galhos secos e amarras visíveis.', color: '#f2ece6' },
  { label: 'Folha ou casca', desc: 'Faça um close nítido de uma folha ou da casca para ajudar na identificação da espécie.', color: '#e8f1e4' },
]

function example(
  id: string, title: string, address: string, lat: number, lng: number,
  risk: RiskLevel, score: number, species: string, urgency: string,
  deadline: string, summary: string, tags: string[], validations: number,
): TreeOccurrence {
  return {
    id, title, address, lat, lng, risk, score, species, urgency, deadline, summary, tags, validations,
    source: 'exemplo', validatedByMe: false, photos: PHOTO_SLOTS,
    speciesConfidence: 'Confiança Média',
    speciesNote: 'Identificação ilustrativa. A espécie e o porte devem ser confirmados em vistoria.',
  }
}

export const MOCK_TREES = [
  example('augusta', 'Tronco inclinado sobre a via', 'R. Augusta · Consolação', -23.5527, -46.6539,
    'emergencial', 96, 'Tipuana (Tipuana tipu)', 'Acionar vistoria emergencial', 'Imediato',
    'Inclinação em direção à pista e fissura no pavimento junto à base, em trecho de circulação intensa.',
    ['Inclinação acentuada', 'Calçada fissurada', 'Exposição da via'], 18),
  example('paulista', 'Galho rompido próximo à fiação', 'Av. Paulista · Bela Vista', -23.5641, -46.6518,
    'alto', 82, 'Sibipiruna (Cenostigma pluviosum)', 'Solicitar vistoria prioritária', 'Em até 24 horas',
    'Galho principal parcialmente rompido sobre área de circulação e próximo à rede aérea.',
    ['Galho rompido', 'Fiação próxima'], 12),
  example('higienopolis', 'Rachadura na bifurcação', 'R. Piauí · Higienópolis', -23.5464, -46.6583,
    'alto', 77, 'Tipuana (Tipuana tipu)', 'Solicitar vistoria prioritária', 'Em até 48 horas',
    'Fissura longitudinal visível na união de dois galhos principais sobre o passeio.',
    ['Rachadura longitudinal', 'Exposição de pedestres'], 7),
  example('ipe', 'Ipê jovem com amarra apertada', 'Al. Santos · Jardim Paulista', -23.5665, -46.6597,
    'moderado', 48, 'Ipê (Handroanthus sp.)', 'Solicitar avaliação da amarra', 'Em até 15 dias',
    'Caso ilustrativo de ipê jovem com amarra pressionando a casca do tronco. A extensão do dano exige avaliação presencial.',
    ['Amarra estrangulante', 'Árvore jovem'], 8),
  example('liberdade', 'Calçada levantada junto à base', 'R. São Joaquim · Liberdade', -23.558, -46.6385,
    'moderado', 56, 'Figueira (Ficus sp.)', 'Solicitar vistoria programada', 'Em até 7 dias',
    'Desnível no passeio junto a raízes expostas, com circulação de pedestres.',
    ['Raízes expostas', 'Pavimento levantado'], 5),
  example('praca', 'Galhos finos secos na copa', 'Pç. Roosevelt · Consolação', -23.5489, -46.6474,
    'baixo', 24, 'Jacarandá-mimoso (Jacaranda mimosifolia)', 'Acompanhar em vistoria de rotina', 'Em até 30 dias',
    'Galhos finos secos dispersos na copa. A extensão deve ser confirmada em campo.',
    ['Galhos finos secos'], 3),
  example('pinheiros', 'Copa sobre o passeio', 'R. Cardeal Arcoverde · Pinheiros', -23.5649, -46.6825,
    'baixo', 18, 'Resedá (Lagerstroemia indica)', 'Acompanhar em vistoria de rotina', 'Em até 30 dias',
    'Copa próxima à passagem de pedestres, sem galhos rompidos aparentes no cenário de exemplo.',
    ['Copa sobre o passeio'], 2),
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
