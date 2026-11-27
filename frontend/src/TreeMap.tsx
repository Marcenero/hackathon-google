import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import { LocateFixed, Minus, Plus, TreePine } from 'lucide-react'
import { BUTANTA_BOUNDS, GREEN_GRADIENT, RISK_GRADIENT, heatCoordinates, heatWeight, greenWeight, inventoryKey, riskLevel, treeName, treeStyle } from './data/inventory'
import type { InventoryTree, LayerVisibility, MapMode } from './data/inventory'
import { createHeatLayer } from './leafletHeat'
import { MapLegend } from './MapPanel'
import type { Coordinates } from './types/tree'

interface Props {
  inventory: InventoryTree[]
  trees: InventoryTree[]
  layers: LayerVisibility
  mode: MapMode
  selectedTree: InventoryTree | null
  focusTree: boolean
  location: Coordinates | null
  onTree: (tree: InventoryTree, focus: boolean) => void
  onLocate: () => void
}

const riskOptions = { radius: 22, blur: 20, maxZoom: 18, minOpacity: 0, max: 1.8, gradient: RISK_GRADIENT }
const greenOptions = { radius: 34, blur: 30, maxZoom: 18, minOpacity: 0, max: 2.2, gradient: GREEN_GRADIENT }
const reduction = () => matchMedia('(prefers-reduced-motion: reduce)').matches
const selectionRing = '#256b4d'

function markerOptions(style: { radius: number; color: string; opacity: number }): L.CircleMarkerOptions {
  return { radius: style.radius, color: '#fff', weight: style.radius >= 5 ? 1.2 : 0.7, fillColor: style.color, fillOpacity: style.opacity }
}

export default function TreeMap({ inventory, trees, layers, mode, selectedTree, focusTree, location, onTree, onLocate }: Props) {
  const element = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map>(null)
  const treeLayer = useRef<L.LayerGroup>(null)
  const selection = useRef<L.LayerGroup>(null)
  const treeRenderer = useRef<L.Canvas>(null)
  const tileLayer = useRef<L.TileLayer>(null)
  const markers = useRef(new Map<string, L.CircleMarker>())
  const heat = useRef<{ green: ReturnType<typeof createHeatLayer>; risk: ReturnType<typeof createHeatLayer> }>(null)
  const [tilesUnavailable, setTilesUnavailable] = useState(false)

  useEffect(() => {
    const instance = L.map(element.current!, { zoomControl: false, preferCanvas: true, minZoom: 12, maxZoom: 19 })
    instance.fitBounds(BUTANTA_BOUNDS, { padding: [18, 18], maxZoom: 17 })
    const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    })
    tileLayer.current = tiles
    let loaded = false
    let timeout: number | undefined
    tiles.on('loading', () => {
      loaded = false
      window.clearTimeout(timeout)
      timeout = window.setTimeout(() => setTilesUnavailable(true), 8000)
    })
    tiles.on('tileload', () => {
      if (!loaded) {
        window.clearTimeout(timeout)
        setTilesUnavailable(false)
      }
      loaded = true
    })
    tiles.on('tileerror', () => {
      if (!loaded) setTilesUnavailable(true)
    })
    tiles.addTo(instance)
    instance.attributionControl.setPrefix(false)
    instance.createPane('inventoryPoints').style.zIndex = '430'
    treeRenderer.current = L.canvas({ pane: 'inventoryPoints', padding: 0.4 })
    treeLayer.current = L.layerGroup().addTo(instance)
    selection.current = L.layerGroup().addTo(instance)

    const green = createHeatLayer(instance, 'green', greenOptions)
    const risk = createHeatLayer(instance, 'risk', riskOptions)
    heat.current = { green, risk }
    map.current = instance
    return () => {
      green.dispose()
      risk.dispose()
      instance.remove()
      window.clearTimeout(timeout)
      tileLayer.current = null
      treeRenderer.current = null
      map.current = null
      heat.current = null
    }
  }, [onTree])

  useEffect(() => {
    const group = treeLayer.current!
    const canvas = treeRenderer.current!
    const currentMarkers = markers.current
    for (const tree of inventory) {
      const point = L.circleMarker([tree.lat, tree.lon], { renderer: canvas, ...markerOptions(riskLevel(tree.rk)) })
      point.on('click', () => onTree(tree, false))
      const tooltip = document.createElement('span')
      tooltip.textContent = `${treeName(tree)} · ${tree.id}`
      point.bindTooltip(tooltip)
      currentMarkers.set(inventoryKey(tree), point)
    }
    return () => {
      group.clearLayers()
      currentMarkers.clear()
    }
  }, [inventory, onTree])

  const riskCoords = useMemo(() => heatCoordinates(trees, (tree) => heatWeight(tree, mode)), [trees, mode])
  const greenCoords = useMemo(() => heatCoordinates(trees, greenWeight), [trees])
  useEffect(() => {
    heat.current?.risk.update(riskCoords, layers.risk, mode === 'power' ? 26 : 22)
  }, [riskCoords, layers.risk, mode])
  useEffect(() => {
    heat.current?.green.update(greenCoords, layers.green, greenOptions.radius)
  }, [greenCoords, layers.green])

  useEffect(() => {
    const group = treeLayer.current!
    if (!layers.trees) {
      group.clearLayers()
      return
    }
    const shown = new Set<L.CircleMarker>()
    for (const tree of trees) {
      const key = inventoryKey(tree)
      const point = markers.current.get(key)!
      const options = markerOptions(treeStyle(tree, mode))
      point.setStyle(options)
      point.setRadius(options.radius!)
      shown.add(point)
      if (!group.hasLayer(point)) group.addLayer(point)
    }
    group.eachLayer((point) => {
      if (!shown.has(point as L.CircleMarker)) group.removeLayer(point)
    })
  }, [trees, mode, layers.trees])

  useEffect(() => {
    if (!location) return
    const user = L.circleMarker(location, {
      radius: 7, color: '#fff', weight: 3, fillColor: '#236cd2', fillOpacity: 1, renderer: L.svg({ pane: 'markerPane' }),
    }).addTo(map.current!)
    user.bindTooltip('Sua localização')
    map.current!.setView(location, Math.max(15, map.current!.getZoom()))
    return () => { user.remove() }
  }, [location])

  useEffect(() => {
    const group = selection.current!
    group.clearLayers()
    if (!selectedTree) return
    const point: L.LatLngTuple = [selectedTree.lat, selectedTree.lon]
    if (layers.trees) L.circleMarker(point, { radius: 10, color: selectionRing, weight: 2, fill: false, interactive: false, renderer: treeRenderer.current! }).addTo(group)
  }, [selectedTree, layers.trees])

  useEffect(() => {
    if (selectedTree && focusTree) map.current!.setView([selectedTree.lat, selectedTree.lon], 18, { animate: !reduction() })
  }, [selectedTree, focusTree])

  return (
    <section className="map-stage" aria-label="Mapa arbóreo">
      <div ref={element} className="map-canvas absolute inset-0" aria-label="Mapa de árvores e ocorrências do Butantã e demais regiões" />
      <MapLegend mode={mode} layers={layers} />
      {tilesUnavailable && <div className="map-offline" role="status">
        <TreePine size={16} aria-hidden="true" /> Mapa-base indisponível.
        <button type="button" onClick={() => { setTilesUnavailable(false); tileLayer.current?.redraw() }}>Tentar novamente</button>
      </div>}
      <div className="map-controls">
        <button type="button" title="Minha localização" aria-label="Minha localização" onClick={onLocate}><LocateFixed size={21} /></button>
        <div className="zoom-controls">
          <button type="button" title="Aproximar" aria-label="Aproximar" onClick={() => map.current?.zoomIn()}><Plus size={21} /></button>
          <button type="button" title="Afastar" aria-label="Afastar" onClick={() => map.current?.zoomOut()}><Minus size={21} /></button>
        </div>
      </div>
    </section>
  )
}
