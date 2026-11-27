import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import { LocateFixed, Minus, Plus, TreePine } from 'lucide-react'
import { PAULISTA, RISK } from './data/mockTrees'
import type { Coordinates, TreeOccurrence } from './types/tree'

interface Props {
  reports: TreeOccurrence[]
  selected: TreeOccurrence | undefined
  location: Coordinates | null
  onSelect: (id: string) => void
  onLocate: () => void
}

export default function TreeMap({ reports, selected, location, onSelect, onLocate }: Props) {
  const element = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const markers = useRef<L.LayerGroup | null>(null)
  const [tilesUnavailable, setTilesUnavailable] = useState(false)
  const selectedId = selected?.id
  const selectedLat = selected?.lat
  const selectedLng = selected?.lng

  useEffect(() => {
    const instance = L.map(element.current!, { zoomControl: false }).setView(PAULISTA, 14)
    const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    })
    let loaded = false
    tiles.on('tileload', () => {
      loaded = true
      setTilesUnavailable(false)
    })
    tiles.on('tileerror', () => {
      if (!loaded) setTilesUnavailable(true)
    })
    tiles.addTo(instance)
    instance.attributionControl.setPrefix(false)
    markers.current = L.layerGroup().addTo(instance)
    map.current = instance
    return () => {
      instance.remove()
      map.current = null
      markers.current = null
    }
  }, [])

  useEffect(() => {
    const layer = markers.current!
    layer.clearLayers()
    for (const report of reports) {
      const risk = RISK[report.risk]
      const active = report.id === selectedId
      L.circle(report, {
        radius: risk.radius,
        color: risk.color,
        fillOpacity: active ? 0.28 : 0.16,
        opacity: 0.82,
        weight: active ? 2 : 1,
        interactive: false,
      }).addTo(layer)
      const icon = L.divIcon({
        className: 'report-marker',
        html: `<span class="map-pin ${report.risk === 'emergencial' ? 'is-emergency' : ''} ${active ? 'is-selected' : ''}" style="--pin:${risk.color}"><span class="pin-shape"></span><span class="pin-score">${report.score}</span></span>`,
        iconSize: [42, 50],
        iconAnchor: [21, 47],
      })
      const marker = L.marker(report, { icon, title: report.title, zIndexOffset: active ? 500 : 0 })
        .on('click', () => onSelect(report.id))
        .addTo(layer)
      marker.getElement()?.setAttribute('aria-label', `${report.title} · ${risk.label} · Score ${report.score}`)
    }
  }, [reports, selectedId, onSelect])

  useEffect(() => {
    if (!location) return
    const user = L.circleMarker(location, {
      radius: 7, color: '#fff', weight: 3, fillColor: '#236cd2', fillOpacity: 1,
    }).addTo(map.current!)
    user.bindTooltip('Sua localização')
    map.current!.setView(location, 14)
    return () => { user.remove() }
  }, [location])

  useEffect(() => {
    const instance = map.current
    if (!instance || selectedLat === undefined || selectedLng === undefined) return
    const point = instance.project([selectedLat, selectedLng])
    const offset: L.PointTuple = window.matchMedia('(max-width: 639px)').matches ? [0, 100] : [-70, 0]
    instance.panTo(instance.unproject(point.add(L.point(offset))))
  }, [selectedLat, selectedLng])

  return (
    <>
      <div ref={element} className="map-canvas absolute inset-0" aria-label="Mapa de ocorrências arbóreas" />
      {tilesUnavailable && <p className="map-offline" role="status"><TreePine size={16} /> Mapa-base indisponível. Os relatos continuam visíveis.</p>}
      <div className="map-controls">
        <button type="button" title="Minha localização" aria-label="Minha localização" onClick={onLocate}><LocateFixed size={21} /></button>
        <div className="zoom-controls">
          <button type="button" title="Aproximar" aria-label="Aproximar" onClick={() => map.current?.zoomIn()}><Plus size={21} /></button>
          <button type="button" title="Afastar" aria-label="Afastar" onClick={() => map.current?.zoomOut()}><Minus size={21} /></button>
        </div>
      </div>
    </>
  )
}
