import inventoryUrl from './iptInventory.json?url'
import type { HeatPoint } from '../leafletHeat'

export interface InventoryTree {
  id: string
  lat: number
  lon: number
  pop: string
  sp: string
  dt: string
  yr: number
  h: number | null
  copa: number | null
  dap: string | null
  det: number | null
  concl: string
  st: string
  fl: number[]
  hl: number
  rk: number
  wf: number
}

export async function loadInventory(signal: AbortSignal): Promise<InventoryTree[]> {
  const response = await fetch(inventoryUrl, { signal })
  if (!response.ok) throw new Error('Inventário indisponível')
  return response.json()
}
export const BUTANTA_BOUNDS: [[number, number], [number, number]] = [[-23.5594, -46.7432], [-23.5535, -46.7327]]
export const RISK_LEVELS = [
  { label: 'Baixo', color: '#5E9470', radius: 3.2, opacity: 0.7, range: '0 a 37' },
  { label: 'Atenção', color: '#E0A13A', radius: 4, opacity: 0.92, range: '38 a 54' },
  { label: 'Alto', color: '#D2572A', radius: 5, opacity: 0.92, range: '55 a 74' },
  { label: 'Crítico', color: '#9E1F2C', radius: 6.2, opacity: 0.92, range: '75 a 100' },
] as const

export const RISK_GRADIENT = { 0.12: '#F3E3A0', 0.30: '#F0A33A', 0.55: '#D2572A', 0.80: '#A8283A', 1: '#6B1027' }
export const GREEN_GRADIENT = { 0.20: '#E3EFD6', 0.45: '#B5D59C', 0.70: '#7DB46E', 1: '#3F8A52' }
export const POWER_GRAY = '#B9B3A5'

export const MAP_MODES = {
  history: { label: 'Risco histórico', heatLabel: 'Concentração de risco no inventário' },
  health: { label: 'Saúde', heatLabel: 'Concentração de baixa saúde no inventário' },
  power: { label: 'Rede elétrica', heatLabel: 'Concentração de risco junto à rede elétrica' },
} as const

export type MapMode = keyof typeof MAP_MODES
export type LayerVisibility = { trees: boolean; risk: boolean; green: boolean }
export const DEFAULT_LAYERS: LayerVisibility = { trees: true, risk: true, green: true }

export const DEFECT_FLAGS = ['Fungo', 'Cupim', 'Rachadura no fuste', 'Copa desequilibrada', 'Galhos secos', 'Galhos deteriorados']
export const NETWORK_FLAGS = ['Poste', 'Rede primária', 'Transformador']
export const ACTION_FLAGS = ['Remoção', 'Poda emergencial', 'Monitoramento', 'Poda de limpeza', 'Poda de adequação']

export function riskLevel(score: number) {
  return RISK_LEVELS[score >= 75 ? 3 : score >= 55 ? 2 : score >= 38 ? 1 : 0]
}

export function healthLevel(health: number) {
  return RISK_LEVELS[health <= 35 ? 3 : health <= 60 ? 2 : health <= 78 ? 1 : 0]
}

export function nearPower(tree: InventoryTree) {
  return Boolean(tree.fl[6] || tree.fl[7] || tree.fl[8])
}

export function treeName(tree: InventoryTree) {
  return tree.pop || tree.sp || 'Espécie não identificada'
}

export function treeStyle(tree: InventoryTree, mode: MapMode) {
  if (mode === 'power') {
    const power = nearPower(tree)
    const level = tree.fl[8] || tree.rk >= 70 ? RISK_LEVELS[3] : RISK_LEVELS[2]
    return { color: power ? level.color : POWER_GRAY, radius: power ? 6.4 : 3, opacity: power ? 0.95 : 0.45 }
  }
  if (mode === 'health') {
    const level = healthLevel(tree.hl)
    const radius = level === RISK_LEVELS[3] ? 6 : level === RISK_LEVELS[2] ? 4.8 : 3.4
    return { color: level.color, radius, opacity: 0.9 }
  }
  return riskLevel(tree.rk)
}

export function heatWeight(tree: InventoryTree, mode: MapMode) {
  if (mode === 'health') return tree.hl <= 40 ? 0.35 + 0.65 * (40 - tree.hl) / 40 : 0
  if (mode === 'power') return nearPower(tree) && tree.rk >= 55 ? (tree.fl[8] ? 1 : 0.4 + tree.rk / 100 * 0.5) : 0
  return tree.rk >= 70 ? 0.35 + 0.65 * (tree.rk - 70) / 30 : 0
}

export function greenWeight(tree: InventoryTree) {
  if (tree.rk >= 55 || tree.hl < 50) return 0
  const size = Math.min(1, ((tree.copa || 20) / 60 + (tree.h || 8) / 18) / 2)
  return tree.hl / 100 * (0.45 + 0.55 * size)
}

export function heatCoordinates(trees: InventoryTree[], weight: (tree: InventoryTree) => number): HeatPoint[] {
  return trees.flatMap((tree) => {
    const intensity = weight(tree)
    return intensity > 0 ? [[tree.lat, tree.lon, Math.min(1, intensity)] as HeatPoint] : []
  })
}

export function inventoryKey(tree: InventoryTree) {
  return `${tree.id}/${tree.lat}/${tree.lon}`
}

function searchText(input: string) {
  return input.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('pt-BR')
}

export function filterInventory(inventory: InventoryTree[], query: string, highOnly: boolean) {
  const term = searchText(query.trim())
  return inventory.filter((tree) =>
    (!highOnly || tree.rk >= 55) &&
    (!term || searchText(`${tree.id} ${tree.pop} ${tree.sp}`).includes(term)),
  )
}
