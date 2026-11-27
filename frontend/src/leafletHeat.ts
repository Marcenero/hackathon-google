import L from 'leaflet'
import 'leaflet.heat'

export type HeatPoint = [lat: number, lng: number, intensity: number]
type HeatOptions = { radius: number; blur: number; maxZoom: number; minOpacity: number; max: number; gradient: Record<number, string> }

type HeatLayer = L.Layer & {
  setLatLngs(points: HeatPoint[]): HeatLayer
  setOptions(options: Partial<HeatOptions>): HeatLayer
  _canvas: HTMLCanvasElement
  _frame?: number | null
}

const { heatLayer } = L as typeof L & { heatLayer(points: HeatPoint[], options: HeatOptions): HeatLayer }

export function createHeatLayer(map: L.Map, kind: 'risk' | 'green', options: HeatOptions) {
  const layer = heatLayer([], options).addTo(map)
  // Leaflet.heat 0.2 uses the overlay pane for both canvases.
  layer._canvas.classList.add(`inventory-heat-${kind}`)
  layer._canvas.setAttribute('aria-hidden', 'true')
  return {
    update(points: HeatPoint[], visible: boolean, radius: number) {
      layer._canvas.hidden = !visible
      layer.setOptions({ radius }).setLatLngs(visible ? points : [])
    },
    dispose() {
      if (layer._frame) L.Util.cancelAnimFrame(layer._frame)
      layer.remove()
    },
  }
}
