import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Camera, Check, CircleAlert, Focus, Leaf, LoaderCircle, MapPin, ScanLine, TreePine, X } from 'lucide-react'
import { DEMO_ANALYSIS, PAULISTA, PHOTO_SLOTS, WEATHER } from './data/mockTrees'
import { Diagnosis, EvidenceGallery, Overlay } from './ReportDetails'
import type { CapturedSlotItem, Coordinates, GeminiAnalysisResponse, TreeOccurrence } from './types/tree'

const ANGLE_ICONS = [TreePine, Focus, ScanLine, Leaf]
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
const MAX_BYTES = 3 * 1024 * 1024

async function prepareImage(file: File): Promise<File> {
  if (file.size <= MAX_BYTES && IMAGE_TYPES.includes(file.type)) return file
  const image = await createImageBitmap(file)
  try {
    const ratio = Math.min(1, 1600 / Math.max(image.width, image.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.width * ratio))
    canvas.height = Math.max(1, Math.round(image.height * ratio))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas indisponível')
    context.fillStyle = '#fff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85))
    if (!blob || blob.size > MAX_BYTES) throw new Error('Tamanho da imagem inválido')
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' })
  } finally {
    image.close()
  }
}

function toReport(result: GeminiAnalysisResponse, slots: (CapturedSlotItem | null)[], location: Coordinates | null, source: TreeOccurrence['source']): TreeOccurrence {
  return {
    id: crypto.randomUUID(), title: `Relato de árvore · ${result.especie_provavel}`,
    address: location ? `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}` : 'Av. Paulista · localização de referência',
    ...(location || PAULISTA),
    risk: result.nivel_risco, score: result.score_criticidade, urgency: result.urgencia_acao,
    deadline: result.prazo_recomendado, species: result.especie_provavel, speciesConfidence: result.confianca_especie,
    speciesNote: result.perfil_estrutural_especie, summary: result.resumo_painel_usuario, tags: result.sinais_identificados,
    photos: PHOTO_SLOTS.map((photo, index) => ({ ...photo, previewUrl: slots[index]?.previewUrl })),
    source, validations: 0, validatedByMe: false,
  }
}

export default function CaptureDialog({
  location, locationPending, onClose, onPublish,
}: { location: Coordinates | null; locationPending: boolean; onClose: () => void; onPublish: (report: TreeOccurrence) => void }) {
  const [slots, setSlots] = useState<(CapturedSlotItem | null)[]>([null, null, null, null])
  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [recapture, setRecapture] = useState<number | null>(null)
  const [report, setReport] = useState<TreeOccurrence | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const urls = useRef(new Set<string>())
  const request = useRef<AbortController | null>(null)
  const ownedUrls = urls.current
  const currentRequest = request
  useEffect(() => () => {
    currentRequest.current?.abort()
    ownedUrls.forEach((url) => URL.revokeObjectURL(url))
  }, [currentRequest, ownedUrls])

  const slot = PHOTO_SLOTS[step]
  const AngleIcon = ANGLE_ICONS[step]
  const complete = slots.filter(Boolean).length
  const hasSimulated = slots.some((item) => item?.simulated)

  function updateSlot(index: number, item: CapturedSlotItem | null) {
    const previous = slots[index]?.previewUrl
    if (previous) {
      URL.revokeObjectURL(previous)
      urls.current.delete(previous)
    }
    setSlots((items) => items.map((value, position) => position === index ? item : value))
  }

  function accept(item: CapturedSlotItem) {
    updateSlot(step, item)
    setNotice('')
    if (recapture === step) setRecapture(null)
    const next = slots.findIndex((value, index) => index > step && !value)
    const remaining = next >= 0 ? next : slots.findIndex((value, index) => index !== step && !value)
    if (remaining >= 0) setStep(remaining)
  }

  async function upload(file: File) {
    setBusy(true)
    try {
      const prepared = await prepareImage(file)
      const previewUrl = URL.createObjectURL(prepared)
      urls.current.add(previewUrl)
      accept({ name: prepared.name, file: prepared, simulated: false, previewUrl })
    } catch {
      setNotice('Não foi possível preparar a imagem. Use JPEG, PNG, WebP ou HEIC de até 3 MiB.')
    } finally {
      setBusy(false)
    }
  }

  function rejectPhoto(index: number, instruction: string) {
    updateSlot(index, null)
    setRecapture(index)
    setStep(index)
    setNotice(instruction)
  }

  async function analyze() {
    if (complete !== 4 || busy) return
    if (hasSimulated) {
      setReport(toReport(DEMO_ANALYSIS, slots, location, 'simulado'))
      return
    }

    setBusy(true)
    setNotice('')
    const controller = new AbortController()
    request.current = controller
    const coords = location || PAULISTA
    const body = new FormData()
    for (const item of slots) if (item?.file) body.append('fotos', item.file)
    body.append('lat', String(coords.lat))
    body.append('lng', String(coords.lng))
    body.append('vento_kmh', String(WEATHER.wind))
    body.append('chuva_mm', String(WEATHER.rain))
    body.append('multiplicador_climatico', String(WEATHER.multiplier))

    try {
      let response: Response
      try {
        response = await fetch(`${API_URL}/api/analisar-arvore`, {
          method: 'POST', body, signal: AbortSignal.any([controller.signal, AbortSignal.timeout(55000)]),
        })
      } catch (error) {
        if (controller.signal.aborted) return
        if (!(error instanceof TypeError) && !(error instanceof DOMException && error.name === 'TimeoutError')) throw error
        setNotice('A API não respondeu. A avaliação abaixo é simulada.')
        setReport(toReport(DEMO_ANALYSIS, slots, location, 'simulado'))
        return
      }
      if ([502, 503, 504].includes(response.status)) {
        setNotice('O Gemini está indisponível. A avaliação abaixo é simulada.')
        setReport(toReport(DEMO_ANALYSIS, slots, location, 'simulado'))
        return
      }
      if (!response.ok) {
        const problem = await response.json().catch(() => null)
        setNotice(typeof problem?.detail === 'string' ? problem.detail : 'Não foi possível analisar as fotos. Tente novamente.')
        return
      }
      const result: GeminiAnalysisResponse = await response.json()
      if (result.status_processamento === 'refazer_foto') {
        const index = (result.indice_foto_reprovada ?? 0) - 1
        if (index < 0 || index >= PHOTO_SLOTS.length || !result.instrucao_recaptura) {
          setNotice('A análise não identificou qual foto refazer. Tente novamente.')
          return
        }
        rejectPhoto(index, result.instrucao_recaptura)
      } else {
        setReport(toReport(result, slots, location, 'gemini'))
      }
    } catch {
      if (!controller.signal.aborted) setNotice('Não foi possível ler a análise. Tente novamente.')
    } finally {
      setBusy(false)
    }
  }

  function publish() {
    if (!report) return
    for (const photo of report.photos) if (photo.previewUrl) urls.current.delete(photo.previewUrl)
    onPublish(report)
  }

  return (
    <Overlay title={report ? 'Revisar diagnóstico' : 'Reportar Árvore'} onClose={() => { if (!busy) onClose() }} className="capture-dialog">
      <header className="dialog-header">
        <div>
          <h2>{report ? 'Revisar diagnóstico' : 'Reportar Árvore'}</h2>
          <p><MapPin size={15} /> {locationPending ? 'Buscando localização…' : location ? 'Localização GPS capturada' : 'Av. Paulista · localização de referência'}</p>
        </div>
        <button type="button" className="icon-button" aria-label="Fechar captura" disabled={busy} onClick={onClose}><X size={22} /></button>
      </header>
      <div className="dialog-body">
        {notice && <div role="alert" className="capture-notice"><CircleAlert size={18} /><div><strong>{recapture !== null ? 'Refaça esta foto' : report ? 'Modo demonstração' : 'Atenção'}</strong><p>{notice}</p></div></div>}
        {report ? (
          <>
            {report.source === 'simulado' && !notice && <p className="capture-note">Avaliação simulada para demonstração.</p>}
            <Diagnosis report={report} />
            <EvidenceGallery report={report} />
          </>
        ) : (
          <>
            <div className="capture-steps" aria-label="Ângulos da captura">
              {PHOTO_SLOTS.map((photo, index) => (
                <button type="button" key={photo.label} className={index === step ? 'step-active' : ''} aria-current={index === step ? 'step' : undefined}
                  disabled={busy || (recapture !== null && index !== recapture)} onClick={() => setStep(index)}>
                  <span>{slots[index] ? <Check size={15} aria-label="Capturada" /> : index + 1}</span>{photo.label}
                </button>
              ))}
            </div>
            <div className="angle-card">
              {slots[step]?.previewUrl ? <img className="angle-preview" src={slots[step]?.previewUrl ?? ''} alt={slot.label} /> : (
                <div className="angle-symbol" style={{ background: slot.color }}><AngleIcon size={31} /></div>
              )}
              <h3>{slot.label}</h3>
              <p>{slot.desc}</p>
              {slots[step] && <p className="captured-label"><Check size={15} /> {slots[step]?.name}</p>}
            </div>
            <input ref={input} hidden type="file" accept="image/*" capture="environment" onChange={(event) => {
              const file = event.currentTarget.files?.[0]
              event.currentTarget.value = ''
              if (file) void upload(file)
            }} />
            <div className="capture-actions">
              <button type="button" className="button-primary" disabled={busy} onClick={() => input.current?.click()}><Camera size={19} /> {slots[step] ? 'Substituir foto' : 'Tirar ou anexar foto'}</button>
              <button type="button" className="button-secondary" disabled={busy} onClick={() => accept({ simulated: true, name: 'Foto simulada' })}>Simular captura</button>
            </div>
            <button type="button" className="text-button" disabled={busy || recapture !== null} onClick={() => rejectPhoto(step, 'A foto simulada ficou escura. Procure melhor iluminação, mantenha a câmera firme e repita o enquadramento.')}>Simular Foto Ruim</button>
            <p className="capture-note">Ao analisar quatro fotos reais, as imagens, a localização e o contexto climático são enviados ao Gemini.</p>
          </>
        )}
      </div>
      <footer className="dialog-footer capture-footer">
        {report ? (
          <>
            <button type="button" className="button-secondary" onClick={() => { setReport(null); setNotice('') }}><ArrowLeft size={17} /> Fotos</button>
            <button type="button" className="button-primary" onClick={publish}><MapPin size={18} /> Publicar Alerta no Mapa</button>
          </>
        ) : (
          <>
            <span aria-live="polite">{complete} de 4 fotos</span>
            <button type="button" className="button-primary" disabled={busy || complete !== 4 || locationPending} onClick={() => void analyze()}>
              {busy ? <LoaderCircle size={18} className="animate-spin" /> : <ArrowRight size={18} />} {busy ? 'Processando…' : 'Analisar árvore'}
            </button>
          </>
        )}
      </footer>
    </Overlay>
  )
}
