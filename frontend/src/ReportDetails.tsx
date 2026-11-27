import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Clock3, Image, Leaf, ScanLine } from 'lucide-react'
import { RISK } from './data/capture'
import type { GeminiAnalysisResponse } from './types/tree'

export function Diagnosis({ analysis }: { analysis: GeminiAnalysisResponse }) {
  const risk = RISK[analysis.nivel_risco]
  return (
    <>
      <div className="risk-readout" style={{ background: risk.tint, color: risk.ink }}>
        <span className="risk-readout-score">{analysis.score_criticidade}<small>/100</small></span>
        <div><strong>Risco {risk.label.toLowerCase()}</strong><span>Triagem visual preliminar do Gemini</span></div>
      </div>
      <p className="capture-note">Dados meteorológicos indisponíveis. A triagem considera apenas as evidências visuais e precisa de avaliação presencial para confirmação.</p>
      <section className="detail-section">
        <h3><Clock3 size={17} /> Prazo sugerido de vistoria</h3>
        <p><strong>{analysis.prazo_recomendado}</strong> · {analysis.urgencia_acao}</p>
      </section>
      <section className="detail-section">
        <h3><ScanLine size={17} /> Evidências visuais</h3>
        <p>{analysis.resumo_painel_usuario}</p>
        {analysis.sinais_identificados.length > 0 && <div className="tags">
          {analysis.sinais_identificados.map((tag, index) => <span key={index}>{tag}</span>)}
        </div>}
      </section>
      <section className="detail-section">
        <h3><Leaf size={17} /> Identificação botânica provável</h3>
        <p><strong>{analysis.especie_provavel}</strong> · {analysis.confianca_especie}</p>
        {analysis.perfil_estrutural_especie && <p>{analysis.perfil_estrutural_especie}</p>}
      </section>
    </>
  )
}

export function PhotoPreview({ url, label, className }: { url: string; label: string; className?: string }) {
  const [unavailable, setUnavailable] = useState(false)
  return unavailable ? <p className="evidence-placeholder">Prévia indisponível neste navegador</p>
    : <img className={className} src={url} alt={label} onError={() => setUnavailable(true)} />
}

export function EvidenceGallery({ photos }: { photos: { label: string; previewUrl: string; origin: 'camera' | 'gallery' }[] }) {
  return (
    <section className="detail-section">
      <h3><Image size={17} /> Galeria de evidências</h3>
      <div className="evidence-grid">
        {photos.map((photo) => <figure key={photo.label}>
          <a href={photo.previewUrl} target="_blank" rel="noreferrer" aria-label={`Abrir foto: ${photo.label}`}>
            <PhotoPreview url={photo.previewUrl} label={photo.label} />
          </a>
          <figcaption>{photo.label} · {photo.origin === 'camera' ? 'Câmera' : 'Galeria'}</figcaption>
        </figure>)}
      </div>
    </section>
  )
}

export function Overlay({
  title, onClose, children, className = '',
}: { title: string; onClose: () => void; children: ReactNode; className?: string }) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const element = dialog.current!
    element.showModal()
    return () => element.close()
  }, [])
  return (
    <dialog ref={dialog} className={className} aria-label={title} onCancel={(event) => {
      event.preventDefault()
      onClose()
    }}>
      {children}
    </dialog>
  )
}
