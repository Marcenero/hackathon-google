import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, ChevronRight, CloudLightning, MapPin, Plus, TreePine, Wind } from 'lucide-react'
import CaptureDialog from './CaptureDialog'
import { MOCK_TREES, RISK, RISKS, WEATHER } from './data/mockTrees'
import { ReportDetails } from './ReportDetails'
import TreeMap from './TreeMap'
import type { Coordinates, RiskLevel, TreeOccurrence } from './types/tree'

export default function App() {
  const [reports, setReports] = useState(MOCK_TREES)
  const [filter, setFilter] = useState<RiskLevel | 'todos'>('todos')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [capture, setCapture] = useState(false)
  const [listOpen, setListOpen] = useState(false)
  const [location, setLocation] = useState<Coordinates | null>(null)
  const [locationPending, setLocationPending] = useState(false)
  const [locationMessage, setLocationMessage] = useState('')
  const requestedLocation = useRef(false)
  const selected = reports.find((report) => report.id === selectedId)
  const visibleReports = useMemo(() => filter === 'todos' ? reports : reports.filter((report) => report.risk === filter), [reports, filter])
  const chooseReport = useCallback((id: string) => setSelectedId(id), [])

  const locate = useCallback((explicit = false) => {
    if (!navigator.geolocation) {
      if (explicit) setLocationMessage('GPS indisponível. Usando a Av. Paulista como referência.')
      return
    }
    setLocationPending(true)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocation({ lat: coords.latitude, lng: coords.longitude })
        setLocationPending(false)
        setLocationMessage('')
      },
      () => {
        setLocationPending(false)
        if (explicit) setLocationMessage('Localização indisponível. Confira a permissão de GPS.')
      },
      { maximumAge: 30000, timeout: 7000, enableHighAccuracy: true },
    )
  }, [])

  useEffect(() => {
    if (requestedLocation.current) return
    requestedLocation.current = true
    locate()
  }, [locate])

  function publish(report: TreeOccurrence) {
    setReports((items) => [report, ...items])
    setFilter('todos')
    setCapture(false)
    setSelectedId(report.id)
  }

  function validate(id: string) {
    setReports((items) => items.map((report) => report.id === id && !report.validatedByMe
      ? { ...report, validatedByMe: true, validations: report.validations + 1 }
      : report))
  }

  return (
    <main className="app-shell relative h-screen w-screen overflow-hidden">
      <TreeMap reports={visibleReports} selected={selected} location={location} onSelect={chooseReport} onLocate={() => {
        if (!locationPending) locate(true)
      }} />

      <header className="topbar">
        <div className="brand bg-white/95 backdrop-blur-md">
          <span className="brand-symbol"><TreePine size={25} strokeWidth={2.25} /></span>
          <div><h1>ArboAlerta <span>SP</span></h1><p>Monitoramento arbóreo</p></div>
        </div>
        <div className="weather-banner">
          <span className="weather-symbol"><CloudLightning size={23} /></span>
          <div className="weather-copy"><strong>Alerta meteorológico</strong><span>Cenário simulado de Defesa Civil</span></div>
          <div className="weather-data"><Wind size={16} /><span>{WEATHER.wind} km/h</span><span className="weather-rain">{WEATHER.rain} mm</span><strong aria-label="Multiplicador climático">×{WEATHER.multiplier.toLocaleString('pt-BR')}</strong></div>
        </div>
      </header>

      <nav className="filters" aria-label="Filtrar ocorrências por criticidade">
        <button type="button" aria-pressed={filter === 'todos'} onClick={() => setFilter('todos')}>
          <MapPin size={15} /> Todos <span>{reports.length}</span>
        </button>
        {RISKS.map((risk) => (
          <button type="button" key={risk} aria-pressed={filter === risk} onClick={() => setFilter(filter === risk ? 'todos' : risk)}>
            <i aria-hidden="true" style={{ background: RISK[risk].color }} /> {RISK[risk].label} <span>{reports.filter((report) => report.risk === risk).length}</span>
          </button>
        ))}
      </nav>

      <section className={`occurrences bg-white/95 backdrop-blur-md ${listOpen ? 'list-expanded' : ''}`} aria-labelledby="list-heading">
        <header>
          <h2 id="list-heading">
            <span className="list-desktop-title">Ocorrências no mapa</span>
            <button type="button" className="list-toggle" aria-expanded={listOpen} aria-controls="occurrence-list" onClick={() => setListOpen(!listOpen)}>
              Ocorrências no mapa <ChevronDown size={17} />
            </button>
          </h2>
          <p>{visibleReports.length} {visibleReports.length === 1 ? 'relato visível' : 'relatos visíveis'}</p>
        </header>
        <ul id="occurrence-list">
          {visibleReports.map((report) => {
            const risk = RISK[report.risk]
            return (
              <li key={report.id}>
                <button type="button" onClick={() => chooseReport(report.id)}>
                  <span className="list-score" style={{ color: risk.ink, background: risk.tint }}>{report.score}</span>
                  <span className="list-report"><strong>{report.title}</strong><small><MapPin size={12} /> {report.address}</small></span>
                  <ChevronRight size={16} className="list-chevron" />
                </button>
              </li>
            )
          })}
          {visibleReports.length === 0 && <li className="list-empty">Nenhum relato com esta criticidade.</li>}
        </ul>
      </section>

      {locationMessage && <p className="location-message" role="status">{locationMessage}</p>}
      <button type="button" className="report-cta rounded-full border-4 border-white bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 shadow-2xl" onClick={() => setCapture(true)}>
        <span><Plus size={23} strokeWidth={2.5} /></span> Reportar Árvore
      </button>

      {selected && <ReportDetails key={selected.id} report={selected} onClose={() => setSelectedId(null)} onValidate={() => validate(selected.id)} />}
      {capture && <CaptureDialog location={location} locationPending={locationPending} onClose={() => setCapture(false)} onPublish={publish} />}
    </main>
  )
}
