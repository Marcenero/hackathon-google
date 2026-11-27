import { useState } from 'react'
import { ChevronDown, Layers3, Search } from 'lucide-react'
import { GREEN_GRADIENT, MAP_MODES, POWER_GRAY, RISK_GRADIENT, RISK_LEVELS, inventoryKey, nearPower, treeName, treeStyle } from './data/inventory'
import type { InventoryTree, LayerVisibility, MapMode } from './data/inventory'

const LAYERS: { key: keyof LayerVisibility; label: string }[] = [
  { key: 'trees', label: 'Árvores' },
  { key: 'risk', label: 'Mancha de risco' },
  { key: 'green', label: 'Áreas arborizadas' },
]
const PAGE_SIZE = 20
const format = new Intl.NumberFormat('pt-BR')

interface Props {
  query: string
  onQuery: (text: string) => void
  highOnly: boolean
  onHighOnly: (active: boolean) => void
  mode: MapMode
  onMode: (mode: MapMode) => void
  layers: LayerVisibility
  onLayer: (key: keyof LayerVisibility) => void
  trees: InventoryTree[]
  inventoryStatus: 'loading' | 'ready' | 'error'
  onInventoryRetry: () => void
  onTree: (tree: InventoryTree) => void
}

export function MapPanel({ query, onQuery, highOnly, onHighOnly, mode, onMode, layers, onLayer, trees, inventoryStatus, onInventoryRetry, onTree }: Props) {
  const [expanded, setExpanded] = useState(false)
  return (
    <aside className={`inventory-dock ${expanded ? 'dock-expanded' : ''}`} aria-label="Controles do mapa">
      <button className="map-panel-toggle" type="button" aria-expanded={expanded} aria-controls="inventory-controls" onClick={() => setExpanded(!expanded)}>
        <Layers3 size={17} /> Camadas e filtros <ChevronDown size={16} />
      </button>
      <div className="inventory-dock-scroll" id="inventory-controls">
        <label className="inventory-search">
          <Search size={17} aria-hidden="true" />
          <span className="sr-only">Buscar por espécie ou identificador</span>
          <input type="search" placeholder="Espécie ou nº da árvore" value={query} onChange={(event) => onQuery(event.target.value)} />
        </label>
        <div className="map-options">
          <fieldset>
            <legend>Visualização</legend>
            <div className="map-modes">
              {(Object.keys(MAP_MODES) as MapMode[]).map((key) => (
                <label key={key}><input type="radio" name="map-mode" checked={mode === key} onChange={() => onMode(key)} /> {MAP_MODES[key].label}</label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend>Camadas</legend>
            <div className="layer-grid">
              {LAYERS.map(({ key, label }) => <label key={key}><input type="checkbox" checked={layers[key]} onChange={() => onLayer(key)} /> {label}</label>)}
            </div>
          </fieldset>
          <label className="map-high-filter"><input type="checkbox" checked={highOnly} onChange={(event) => onHighOnly(event.target.checked)} /> Só risco alto e crítico</label>
        </div>
        <section className="map-result-section" aria-labelledby="inventory-results-heading">
          <h2 id="inventory-results-heading">Inventário atribuído ao IPT <span aria-live="polite">{format.format(trees.length)}</span></h2>
          {inventoryStatus === 'loading' && <p className="map-empty" role="status">Carregando inventário…</p>}
          {inventoryStatus === 'error' && <p className="map-empty" role="alert">Inventário indisponível. <button className="map-show-more" type="button" onClick={onInventoryRetry}>Tentar novamente</button></p>}
          {inventoryStatus === 'ready' && <InventoryResults key={`${query}/${highOnly}/${mode}`} trees={trees} mode={mode} onTree={(tree) => { onTree(tree); setExpanded(false) }} />}
        </section>
      </div>
    </aside>
  )
}

function InventoryResults({ trees, mode, onTree }: { trees: InventoryTree[]; mode: MapMode; onTree: (tree: InventoryTree) => void }) {
  const [limit, setLimit] = useState(PAGE_SIZE)
  return trees.length ? <>
    <ul className="map-result-list">
      {trees.slice(0, limit).map((tree) => (
        <li key={inventoryKey(tree)}>
          <button type="button" onClick={() => onTree(tree)}>
            <span className="inventory-list-dot" style={{ background: treeStyle(tree, mode).color }} />
            <span><strong>{treeName(tree)}</strong><small>{tree.id}{tree.dt ? ` · ${tree.dt}` : ''}</small></span>
            <span className="inventory-index">{mode === 'power' ? nearPower(tree) ? 'Rede' : '—' : mode === 'health' ? tree.hl : tree.rk}</span>
          </button>
        </li>
      ))}
    </ul>
    {limit < trees.length && <button type="button" className="map-show-more" onClick={() => setLimit(limit + PAGE_SIZE)}>Mostrar mais árvores</button>}
  </> : <p className="map-empty">Nenhuma árvore encontrada com estes filtros.</p>
}

function gradient(stops: Record<number, string>) {
  const colors = Object.keys(stops).map(Number).sort((a, b) => a - b).map((stop) => stops[stop])
  return 'linear-gradient(90deg, ' + colors.join(', ') + ')'
}

export function MapLegend({ mode, layers }: { mode: MapMode; layers: LayerVisibility }) {
  const labels = mode === 'health' ? ['Boa', 'Regular', 'Ruim', 'Muito ruim'] : RISK_LEVELS.map((level) => level.label)
  const scales = mode === 'power' ? [
    { color: POWER_GRAY, label: 'Sem indicador', range: '' },
    { color: RISK_LEVELS[2].color, label: 'Poste ou rede', range: '' },
    { color: RISK_LEVELS[3].color, label: 'Transformador ou risco ≥ 70', range: '' },
  ] : RISK_LEVELS.map((level, index) => ({ ...level, label: labels[index] }))
  return (
    <aside className="inventory-legend" aria-label="Legenda do mapa">
      {layers.trees && <>
        <strong>{MAP_MODES[mode].label} do inventário</strong>
        <ul className="legend-keys">{scales.map(({ label, color, range }) => (
          <li key={label} title={mode === 'history' ? range : undefined}><i style={{ background: color }} /> {label}</li>
        ))}</ul>
      </>}
      {layers.risk && <div className="legend-heat-row">
        <i style={{ background: gradient(RISK_GRADIENT) }} />
        {MAP_MODES[mode].heatLabel}
      </div>}
      {layers.green && <div className="legend-heat-row">
        <i style={{ background: gradient(GREEN_GRADIENT) }} />
        Áreas arborizadas
      </div>}
      {!Object.values(layers).some(Boolean) && <span>Nenhuma camada ativada</span>}
    </aside>
  )
}
