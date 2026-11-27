import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Camera, Check, CircleAlert, Focus, ImagePlus, Leaf, LoaderCircle, MapPin, ScanLine, TreePine, X } from 'lucide-react'
import { analyzePhotos } from './api'
import { ContributionEstimate } from './ContributionEstimate'
import type { LocationFix } from './contributionPoints'
import type { InventoryTree } from './data/inventory'
import { PHOTO_SLOTS } from './data/capture'
import { Diagnosis, EvidenceGallery, Overlay, PhotoPreview } from './ReportDetails'
import type { CapturedSlotItem, GeminiAnalysisResponse, PhotoOrigin } from './types/tree'

const ANGLE_ICONS = [TreePine, Focus, ScanLine, Leaf]
const ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif'
const MAX_BYTES = 3 * 1024 * 1024
const EMPTY_SLOTS = () => [null, null, null, null]
const IMAGE_ERROR = 'Use uma foto JPEG, PNG, WebP ou HEIC/HEIF de até 3 MiB.'

type Review = {
  result: GeminiAnalysisResponse
  location: LocationFix | null
  duplicate: boolean
  observedAt: number
}

async function hasDuplicates(slots: CapturedSlotItem[]) {
  const hashes = await Promise.all(slots.map(async ({ file }) => {
    const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer())
    return new Uint8Array(digest).join(',')
  }))
  return new Set(hashes).size !== hashes.length
}

export default function CaptureDialog({ location, locationPending, locationMessage, inventory, onLocate, onClose }: {
  location: LocationFix | null
  locationPending: boolean
  locationMessage: string
  inventory: InventoryTree[]
  onLocate: () => void
  onClose: () => void
}) {
  const [slots, setSlots] = useState<(CapturedSlotItem | null)[]>(EMPTY_SLOTS)
  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [recapture, setRecapture] = useState<number | null>(null)
  const [review, setReview] = useState<Review | null>(null)
  const [camera, setCamera] = useState<'off' | 'starting' | 'ready'>('off')
  const input = useRef<HTMLInputElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  const stream = useRef<MediaStream | null>(null)
  const cameraRequest = useRef(0)
  const urls = useRef(new Set<string>())
  const request = useRef<AbortController | null>(null)
  const locked = useRef(false)
  useEffect(() => {
    const ownedUrls = urls.current
    return () => {
      cameraRequest.current += 1
      stream.current?.getTracks().forEach((track) => track.stop())
      request.current?.abort()
      ownedUrls.forEach((url) => URL.revokeObjectURL(url))
      ownedUrls.clear()
    }
  }, [])

  const visibleLocation = review ? review.location : location
  const slot = PHOTO_SLOTS[step]
  const AngleIcon = ANGLE_ICONS[step]
  const photos = slots.filter((item): item is CapturedSlotItem => item !== null)

  function stopCamera() {
    cameraRequest.current += 1
    stream.current?.getTracks().forEach((track) => track.stop())
    stream.current = null
    if (video.current) video.current.srcObject = null
    setCamera('off')
  }

  async function openCamera() {
    setNotice('')
    if (!navigator.mediaDevices?.getUserMedia) {
      setNotice('Câmera indisponível. Use HTTPS ou localhost, ou envie uma foto da galeria.')
      return
    }
    const sequence = ++cameraRequest.current
    setCamera('starting')
    try {
      const media = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      const player = video.current
      if (sequence !== cameraRequest.current || !player) {
        media.getTracks().forEach((track) => track.stop())
        return
      }
      stream.current = media
      player.srcObject = media
      await player.play()
      if (sequence === cameraRequest.current) setCamera('ready')
    } catch (error) {
      if (sequence !== cameraRequest.current) return
      stopCamera()
      const denied = error instanceof DOMException && error.name === 'NotAllowedError'
      setNotice(denied ? 'Permissão da câmera negada. Revise a permissão ou envie uma foto da galeria.' : 'Não foi possível abrir a câmera. Tente novamente ou envie uma foto da galeria.')
    }
  }

  function updateSlot(index: number, item: CapturedSlotItem | null) {
    const previous = slots[index]?.previewUrl
    if (previous) {
      URL.revokeObjectURL(previous)
      urls.current.delete(previous)
    }
    setSlots((items) => items.map((value, position) => position === index ? item : value))
  }

  function accept(file: File, origin: PhotoOrigin) {
    const validType = ACCEPT.split(',').includes(file.type) ||
      ((!file.type || file.type === 'application/octet-stream') && /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name))
    if (!validType || !file.size || file.size > MAX_BYTES) {
      setNotice(IMAGE_ERROR)
      return
    }
    const previewUrl = URL.createObjectURL(file)
    urls.current.add(previewUrl)
    updateSlot(step, { file, origin, previewUrl })
    setNotice('')
    if (recapture === step) setRecapture(null)
    const next = slots.findIndex((value, index) => index > step && !value)
    const remaining = next >= 0 ? next : slots.findIndex((value, index) => index !== step && !value)
    if (remaining >= 0) setStep(remaining)
  }

  function takePhoto() {
    const player = video.current
    if (!player?.videoWidth || !player.videoHeight) {
      setNotice('A câmera ainda está carregando. Tente novamente.')
      return
    }
    const canvas = document.createElement('canvas')
    const scale = Math.min(1, 1600 / Math.max(player.videoWidth, player.videoHeight))
    canvas.width = Math.max(1, Math.round(player.videoWidth * scale))
    canvas.height = Math.max(1, Math.round(player.videoHeight * scale))
    const context = canvas.getContext('2d')
    if (!context) {
      stopCamera()
      setNotice('Falha na captura. Abra a câmera novamente ou envie uma foto.')
      return
    }
    context.drawImage(player, 0, 0, canvas.width, canvas.height)
    stopCamera()
    setBusy(true)
    const sequence = cameraRequest.current
    canvas.toBlob((blob) => {
      if (sequence !== cameraRequest.current) return
      if (blob) accept(new File([blob], `camera-angulo-${step + 1}.jpg`, { type: 'image/jpeg' }), 'camera')
      else setNotice('Não foi possível preparar a foto da câmera. Tente novamente.')
      setBusy(false)
    }, 'image/jpeg', 0.85)
  }

  async function analyze() {
    if (photos.length !== PHOTO_SLOTS.length || locked.current || busy) return
    locked.current = true
    stopCamera()
    setBusy(true)
    setNotice('')
    const controller = new AbortController()
    request.current = controller
    const form = new FormData()
    for (const photo of photos) form.append('fotos', photo.file)
    if (location) {
      form.append('lat', String(location.lat))
      form.append('lng', String(location.lng))
    }
    try {
      const duplicate = await hasDuplicates(photos)
      const result = await analyzePhotos(form, controller)
      if (result.status_processamento === 'refazer_foto') {
        const index = result.indice_foto_reprovada! - 1
        updateSlot(index, null)
        setStep(index)
        setRecapture(index)
        setNotice(result.instrucao_recaptura!)
      } else {
        setReview({ result, location, duplicate, observedAt: Date.now() })
      }
    } catch (error) {
      if (!controller.signal.aborted || controller.signal.reason === 'timeout') {
        setNotice(error instanceof Error ? error.message : 'A análise falhou. Tente novamente.')
      }
    } finally {
      locked.current = false
      if (request.current === controller) request.current = null
      setBusy(false)
    }
  }

  function startOver() {
    urls.current.forEach((url) => URL.revokeObjectURL(url))
    urls.current.clear()
    setSlots(EMPTY_SLOTS())
    setReview(null)
    setStep(0)
    setRecapture(null)
    setNotice('')
  }

  return (
    <Overlay title={review ? 'Resultado da triagem' : 'Reportar árvore'} onClose={() => { if (!busy) onClose() }} className="capture-dialog">
      <header className="dialog-header">
        <div>
          <h2>{review ? 'Resultado da triagem' : 'Reportar árvore'}</h2>
          <p><MapPin size={15} /> {!review && locationPending ? 'Buscando localização…' : visibleLocation ? 'Localização GPS capturada' : 'Análise disponível sem localização'}</p>
        </div>
        <button type="button" className="icon-button" aria-label="Fechar captura" disabled={busy} onClick={onClose}><X size={22} /></button>
      </header>
      <div className="dialog-body" aria-busy={busy}>
        {notice && <div role="alert" className="capture-notice"><CircleAlert size={18} /><div><strong>{recapture !== null ? 'Refaça esta foto' : 'Atenção'}</strong><p>{notice}</p></div></div>}
        {review ? <>
          <Diagnosis analysis={review.result} />
          <EvidenceGallery photos={PHOTO_SLOTS.map((photoSlot, index) => ({ ...photoSlot, ...slots[index]! }))} />
          <ContributionEstimate inventory={inventory} location={review.location} photos={photos}
            analysis={review.result} duplicate={review.duplicate} observedAt={review.observedAt} />
        </> : <>
          <p className="capture-notice">Fotografe apenas de um local seguro. Use zoom e mantenha distância da árvore e de fios. Se um ângulo exigir aproximação, use uma foto existente ou interrompa a captura.</p>
          {!location && !locationPending && <div className="capture-note">
            {locationMessage && <p role="status">{locationMessage}</p>}
            <button type="button" className="text-button" onClick={onLocate}>Tentar obter a localização para a estimativa</button>
          </div>}
          <nav className="capture-steps" aria-label="Ângulos da captura">
            {PHOTO_SLOTS.map((photo, index) => <button type="button" key={photo.label} className={index === step ? 'step-active' : ''}
              aria-current={index === step ? 'step' : undefined} disabled={busy || (recapture !== null && index !== recapture)}
              onClick={() => { stopCamera(); setNotice(''); setStep(index) }}>
              <span>{slots[index] ? <Check size={15} aria-label="Capturada" /> : index + 1}</span>{photo.label}
            </button>)}
          </nav>
          <div className="angle-card">
            {slots[step] ? <PhotoPreview key={slots[step]!.previewUrl} url={slots[step]!.previewUrl} label={slot.label} className="angle-preview" />
              : <div className="angle-symbol" style={{ background: slot.color }}><AngleIcon size={31} /></div>}
            <h3>{slot.label}</h3>
            <p>{slot.desc}</p>
            {slots[step] && <p className="captured-label"><Check size={15} /> {slots[step]?.origin === 'camera' ? 'Câmera' : 'Galeria'} · {slots[step]?.file.name}</p>}
            {slots[step] && <p>Escolha uma das opções abaixo para substituir a foto.</p>}
          </div>
          <video ref={video} className="camera-video" hidden={camera === 'off'} muted playsInline aria-label="Prévia da câmera" />
          {camera !== 'off' ? <div className="capture-actions">
            <button type="button" className="button-primary" disabled={camera !== 'ready'} onClick={takePhoto}>{camera === 'starting' ? 'Abrindo câmera…' : 'Capturar foto'}</button>
            <button type="button" className="button-secondary" onClick={stopCamera}>Cancelar câmera</button>
          </div> : <div className="capture-actions">
            <button type="button" className="button-primary" disabled={busy} onClick={() => void openCamera()}><Camera size={19} /> Tirar foto pela câmera</button>
            <button type="button" className="button-secondary" disabled={busy} onClick={() => input.current?.click()}><ImagePlus size={19} /> Enviar foto da galeria ou computador</button>
          </div>}
          <input ref={input} hidden type="file" accept={ACCEPT} onChange={(event) => {
            const file = event.currentTarget.files?.[0]
            event.currentTarget.value = ''
            if (file) accept(file, 'gallery')
          }} />
          <p className="capture-note">JPEG, PNG, WebP ou HEIC/HEIF, até 3 MiB por foto. O Gemini recebe as fotos e, se disponível, a localização. Evite incluir pessoas ou placas.</p>
        </>}
      </div>
      <footer className="dialog-footer capture-footer">
        {review ? <>
          <button type="button" className="button-secondary" onClick={startOver}><ArrowLeft size={17} /> Nova análise</button>
          <button type="button" className="button-primary" onClick={onClose}><Check size={18} /> Concluir</button>
        </> : <>
          <span aria-live="polite">{photos.length} de 4 fotos</span>
          <button type="button" className="button-primary" disabled={busy || photos.length !== 4 || camera !== 'off'} onClick={() => void analyze()}>
            {busy ? <LoaderCircle size={18} className="animate-spin" /> : <ArrowRight size={18} />} {busy ? 'Processando…' : 'Analisar árvore'}
          </button>
        </>}
      </footer>
    </Overlay>
  )
}
