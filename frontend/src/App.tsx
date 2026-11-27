import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { Plus, TreePine } from 'lucide-react'
import CaptureDialog from './CaptureDialog'
import { DEFAULT_LAYERS, filterInventory, loadInventory } from './data/inventory'
import type { InventoryTree, LayerVisibility, MapMode } from './data/inventory'
import InventoryDetails from './InventoryDetails'
import { MapPanel } from './MapPanel'
import TreeMap from './TreeMap'
import type { LocationFix } from './contributionPoints'

export default function App() {
  const [inventory, setInventory] = useState<InventoryTree[]>([])
  const [inventoryStatus, setInventoryStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [inventoryAttempt, setInventoryAttempt] = useState(0)
  const [query, setQuery] = useState('')
  const [highOnly, setHighOnly] = useState(false)
  const [mode, setMode] = useState<MapMode>('history')
  const [layers, setLayers] = useState(DEFAULT_LAYERS)
  const [selectedTree, setSelectedTree] = useState<InventoryTree | null>(null)
  const [focusTree, setFocusTree] = useState(false)
  const [capture, setCapture] = useState(false)
  const [location, setLocation] = useState<LocationFix | null>(null)
  const [locationPending, setLocationPending] = useState(false)
  const [locationMessage, setLocationMessage] = useState('')
  const requesting = useRef(false)
  const deferredQuery = useDeferredValue(query)
  const trees = useMemo(() => filterInventory(inventory, deferredQuery, highOnly), [inventory, deferredQuery, highOnly])

  useEffect(() => {
    const controller = new AbortController()
    loadInventory(controller.signal).then((rows) => {
      if (controller.signal.aborted) return
      setInventory(rows)
      setInventoryStatus('ready')
    }).catch(() => { if (!controller.signal.aborted) setInventoryStatus('error') })
    return () => controller.abort()
  }, [inventoryAttempt])
  const chooseTree = useCallback((tree: InventoryTree, focus: boolean) => {
    setFocusTree(focus)
    setSelectedTree(tree)
  }, [])

  const locate = useCallback(() => {
    if (requesting.current) return
    if (!navigator.geolocation) {
      setLocationMessage('GPS indisponível neste navegador.')
      return
    }
    requesting.current = true
    setLocationMessage('')
    setLocationPending(true)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocation({ lat: coords.latitude, lng: coords.longitude, accuracy: coords.accuracy })
        requesting.current = false
        setLocationPending(false)
      },
      () => {
        requesting.current = false
        setLocationPending(false)
        setLocationMessage('Localização indisponível. Confira a permissão de GPS.')
      },
      { maximumAge: 30000, timeout: 7000, enableHighAccuracy: true },
    )
  }, [])

  function toggleLayer(key: keyof LayerVisibility) {
    setLayers((current) => ({ ...current, [key]: !current[key] }))
  }

  return (
    <main className="app-shell inventory-shell">
      <header className="brand inventory-brand">
        <span className="brand-symbol"><TreePine size={25} strokeWidth={2.25} /></span>
        <div><h1>Raiz <span>Viva</span></h1><p>Protótipo experimental</p></div>
      </header>
      <MapPanel query={query} onQuery={setQuery} highOnly={highOnly} onHighOnly={setHighOnly}
        mode={mode} onMode={setMode} layers={layers} onLayer={toggleLayer} trees={trees}
        inventoryStatus={inventoryStatus} onInventoryRetry={() => { setInventoryStatus('loading'); setInventoryAttempt((n) => n + 1) }}
        onTree={(tree) => chooseTree(tree, true)} />
      <TreeMap inventory={inventory} trees={trees} layers={layers} mode={mode}
        location={location} selectedTree={selectedTree} focusTree={focusTree}
        onTree={chooseTree} onLocate={locate} />

      {!capture && locationMessage && <p className="location-message" role="status">{locationMessage}</p>}
      <button type="button" className="report-cta rounded-full border-4 border-white bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 shadow-2xl"
        onClick={() => {
          setCapture(true)
          if (!location) locate()
        }}>
        <span><Plus size={23} strokeWidth={2.5} /></span> Reportar Árvore
      </button>

      {selectedTree && <InventoryDetails tree={selectedTree} onClose={() => setSelectedTree(null)} />}
      {capture && <CaptureDialog location={location} locationPending={locationPending} locationMessage={locationMessage}
        inventory={inventory} onLocate={locate} onClose={() => setCapture(false)} />}
    </main>
  )
}
