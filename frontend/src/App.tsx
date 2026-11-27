import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { Plus, TreePine } from 'lucide-react'
import CaptureDialog from './CaptureDialog'
import { DEFAULT_LAYERS, filterInventory, inventoryKey, loadInventory, showReport } from './data/inventory'
import type { InventoryTree, LayerVisibility, MapMode } from './data/inventory'
import InventoryDetails from './InventoryDetails'
import { MapPanel } from './MapPanel'
import { ReportDetails } from './ReportDetails'
import TreeMap from './TreeMap'
import type { Coordinates, TreeOccurrence } from './types/tree'

export default function App() {
  const [reports, setReports] = useState<TreeOccurrence[]>([])
  const [inventory, setInventory] = useState<InventoryTree[]>([])
  const [inventoryStatus, setInventoryStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [inventoryAttempt, setInventoryAttempt] = useState(0)
  const [query, setQuery] = useState('')
  const [highOnly, setHighOnly] = useState(false)
  const [mode, setMode] = useState<MapMode>('history')
  const [layers, setLayers] = useState(DEFAULT_LAYERS)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedTree, setSelectedTree] = useState<InventoryTree | null>(null)
  const [focusTree, setFocusTree] = useState(false)
  const [capture, setCapture] = useState(false)
  const [location, setLocation] = useState<Coordinates | null>(null)
  const [locationPending, setLocationPending] = useState(false)
  const [locationMessage, setLocationMessage] = useState('')
  const requesting = useRef(false)
  const selected = reports.find((report) => report.id === selectedId)
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
  const visibleReports = useMemo(() => reports.filter((report) => showReport(report, layers)), [reports, layers])
  const assessments = useMemo(() => {
    const linked = new Map<string, TreeOccurrence>()
    for (const report of reports) {
      if (report.inventoryTreeKey && !linked.has(report.inventoryTreeKey) && showReport(report, DEFAULT_LAYERS)) {
        linked.set(report.inventoryTreeKey, report)
      }
    }
    return linked
  }, [reports])

  const chooseReport = useCallback((id: string) => {
    setSelectedTree(null)
    setSelectedId(id)
  }, [])
  const chooseTree = useCallback((tree: InventoryTree, focus: boolean) => {
    setSelectedId(null)
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
        setLocation({ lat: coords.latitude, lng: coords.longitude })
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

  function publish(report: TreeOccurrence) {
    if (report.source !== 'gemini') return
    setReports((items) => [report, ...items])
    setCapture(false)
    chooseReport(report.id)
  }

  function validate(id: string) {
    setReports((items) => items.map((report) => report.id === id && !report.validatedByMe
      ? { ...report, validatedByMe: true, validations: report.validations + 1 }
      : report))
  }

  function toggleLayer(key: keyof LayerVisibility) {
    setLayers((current) => ({ ...current, [key]: !current[key] }))
  }

  return (
    <main className="app-shell inventory-shell">
      <header className="brand inventory-brand">
        <span className="brand-symbol"><TreePine size={25} strokeWidth={2.25} /></span>
        <div><h1>ArboAlerta <span>SP</span></h1><p>Monitoramento arbóreo</p></div>
      </header>
      <MapPanel query={query} onQuery={setQuery} highOnly={highOnly} onHighOnly={setHighOnly}
        mode={mode} onMode={setMode} layers={layers} onLayer={toggleLayer} trees={trees}
        inventoryStatus={inventoryStatus} onInventoryRetry={() => { setInventoryStatus('loading'); setInventoryAttempt((n) => n + 1) }}
        reports={visibleReports} onTree={(tree) => chooseTree(tree, true)} onReport={chooseReport} />
      <TreeMap inventory={inventory} trees={trees} reports={visibleReports} assessments={assessments} layers={layers} mode={mode}
        location={location} selectedTree={selectedTree} selectedReport={selected} focusTree={focusTree}
        onTree={chooseTree} onReport={chooseReport} onLocate={locate} />

      {!capture && locationMessage && <p className="location-message" role="status">{locationMessage}</p>}
      <button type="button" className="report-cta rounded-full border-4 border-white bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 shadow-2xl"
        onClick={() => {
          setCapture(true)
          if (!location) locate()
        }}>
        <span><Plus size={23} strokeWidth={2.5} /></span> Reportar Árvore
      </button>

      {selectedTree && <InventoryDetails tree={selectedTree} assessment={assessments.get(inventoryKey(selectedTree))}
        onAssessment={chooseReport} onClose={() => setSelectedTree(null)} />}
      {selected && <ReportDetails key={selected.id} report={selected} onClose={() => setSelectedId(null)} onValidate={() => validate(selected.id)} />}
      {capture && <CaptureDialog location={location} locationPending={locationPending} locationMessage={locationMessage}
        onLocate={locate} onClose={() => setCapture(false)} onPublish={publish} />}
    </main>
  )
}
