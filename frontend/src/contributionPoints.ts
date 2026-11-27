import { inventoryKey } from './data/inventory'
import type { InventoryTree } from './data/inventory'
import type { Coordinates, PhotoOrigin, SpeciesConfidence } from './types/tree'

export type LocationFix = Coordinates & { accuracy: number }
export type TreeSelection = InventoryTree | 'new' | null

const DAY = 86_400_000
export const GPS_LIMIT = 15

const POINTS = {
  existing: 50, blind: 50, first: 40, halfYear: 10, year: 30, twoYears: 60,
  species: 40, newTree: 80, critical: 60,
}

function normalize(text: string) {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()
}

function distance(fix: LocationFix, tree: InventoryTree) {
  const radians = Math.PI / 180
  const lat = (tree.lat - fix.lat) * radians / 2
  const lon = (tree.lon - fix.lng) * radians / 2
  const a = Math.sin(lat) ** 2 + Math.cos(fix.lat * radians) * Math.cos(tree.lat * radians) * Math.sin(lon) ** 2
  return 12_742_000 * Math.asin(Math.sqrt(Math.min(a, 1)))
}

export function findCandidates(inventory: InventoryTree[], fix: LocationFix | null, species: string, confidence: SpeciesConfidence) {
  if (!fix || !Number.isFinite(fix.accuracy) || fix.accuracy <= 0 || fix.accuracy > GPS_LIMIT) return []
  const proposed = normalize(species)
  const radius = Math.max(25, 2.5 * fix.accuracy)
  return inventory.map((tree) => {
    const meters = distance(fix, tree)
    const names = [tree.pop, tree.sp].filter(Boolean).map(normalize)
    const speciesMatch = confidence !== 'Confiança Baixa' && names.some((name) =>
      !name.startsWith('nao identificad') && (proposed === name || proposed.includes(`(${name})`)),
    )
    return { tree, meters, speciesMatch }
  }).filter((candidate) => candidate.meters <= radius)
    .sort((a, b) => Number(b.speciesMatch) - Number(a.speciesMatch) || a.meters - b.meters ||
      inventoryKey(a.tree).localeCompare(inventoryKey(b.tree)))
    .slice(0, 3)
}

function inspectionAge(date: string, observedAt: number) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(date)
  if (!match) return null
  const [, d, m, y] = match.map(Number)
  const parsed = new Date(Date.UTC(y, m - 1, d))
  if (parsed.getUTCFullYear() !== y || parsed.getUTCMonth() !== m - 1 || parsed.getUTCDate() !== d) return null
  const days = (Math.floor(observedAt / DAY) * DAY - parsed.valueOf()) / DAY
  return days >= 0 ? days : null
}

type PointLine = { points: number; reason: string; upTo?: true }
type EstimateInput = {
  selection: TreeSelection
  origins: readonly PhotoOrigin[]
  location: LocationFix | null
  observedAt: number
  duplicate: boolean
  probableSpecies: string
  speciesConfidence: SpeciesConfidence
}

export function estimatePoints(input: EstimateInput) {
  const { selection, origins, location, observedAt, duplicate, probableSpecies, speciesConfidence } = input
  const base: PointLine[] = []
  const bonuses: PointLine[] = []
  const conditional: PointLine[] = []
  const blockers: string[] = []
  if (origins.length !== 4 || origins.some((origin) => origin !== 'camera')) blockers.push('O conjunto precisa ter quatro fotos tiradas pela câmera. Fotos da galeria podem ser analisadas, com 0 ponto pela captura.')
  if (!location || !Number.isFinite(location.accuracy) || location.accuracy <= 0 || location.accuracy > GPS_LIMIT) {
    blockers.push('A pontuação pela captura exige GPS com precisão de até 15 m.')
  }
  if (duplicate) blockers.push('Há imagens idênticas no conjunto.')

  if (selection === 'new') {
    conditional.push({ points: POINTS.newTree, reason: 'O cadastro de uma nova árvore exigiria confirmar que ela está fora do inventário. Não há cadastro neste protótipo.' })
  } else if (selection) {
    base.push({ points: POINTS.existing, reason: 'Foto válida de árvore cadastrada, se a correspondência indicada for confirmada.' })
    if (selection.fl[16]) bonuses.push({ points: POINTS.blind, reason: 'O inventário sinaliza este registro como ponto cego.' })
    const days = inspectionAge(selection.dt, observedAt)
    if (days === null) conditional.push({ points: POINTS.twoYears, upTo: true, reason: 'Atualização de registro. Falta uma data de inspeção utilizável.' })
    else if (days > 182) bonuses.push({
      points: days <= 365 ? POINTS.halfYear : days <= 730 ? POINTS.year : POINTS.twoYears,
      reason: `Última inspeção disponível no inventário em ${selection.dt}. O bônus depende da confirmação de que não houve registro mais recente.`,
    })
    conditional.push({ points: POINTS.first, reason: 'Primeira fotografia, se o histórico confirmar que a árvore nunca recebeu foto cidadã.' })
    const species = normalize(probableSpecies)
    if (normalize(selection.pop) === 'nao identificada' && speciesConfidence !== 'Confiança Baixa' &&
      species && !/indeterminad|nao identificad|desconhecid/.test(species)) {
      conditional.push({ points: POINTS.species, reason: 'Espécie anteriormente desconhecida no inventário, se a identificação provável for confirmada.' })
    }
  } else {
    conditional.push({ points: POINTS.existing, reason: 'Foto de árvore cadastrada, se houver correspondência confirmada com o inventário.' })
    conditional.push({ points: POINTS.newTree, reason: 'Cadastro de árvore nova, se for confirmado que o exemplar está fora do inventário. Substitui a base de árvore cadastrada.' })
  }
  conditional.push({ points: POINTS.critical, reason: 'Sinal crítico, se forem confirmados rachadura, cavidade, fiação ou inclinação perigosa.' })
  const total = blockers.length ? 0 : [...base, ...bonuses].reduce((sum, line) => sum + line.points, 0)
  return { base, bonuses, conditional, blockers, total }
}
