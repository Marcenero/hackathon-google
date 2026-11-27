import { useEffect, useRef, type ReactNode } from 'react'
import { Check, Clipboard, Clock3, Image, Leaf, MapPin, ScanLine, X } from 'lucide-react'
import { RISK } from './data/mockTrees'
import type { TreeOccurrence } from './types/tree'

export function Diagnosis({ report }: { report: TreeOccurrence }) {
  const risk = RISK[report.risk]
  return (
    <>
      <div className="risk-readout" style={{ background: risk.tint, color: risk.ink }}>
        <span className="risk-readout-score">{report.score}<small>/100</small></span>
        <div><strong>Risco {risk.label.toLowerCase()}</strong><span>{report.source === 'gemini' ? 'Score IA · Triagem TRAQ' : 'Score demonstrativo · Triagem TRAQ'}</span></div>
      </div>
      <section className="detail-section">
        <h3><Clock3 size={17} /> Prazo recomendado</h3>
        <p><strong>{report.deadline}</strong> · {report.urgency}</p>
      </section>
      <section className="detail-section">
        <h3><ScanLine size={17} /> Diagnóstico técnico</h3>
        <p>{report.summary}</p>
        {report.tags.length > 0 && <div className="tags">{report.tags.map((tag, index) => <span key={`${tag}-${index}`}>{tag}</span>)}</div>}
      </section>
      <section className="detail-section">
        <h3><Leaf size={17} /> Identificação botânica provável</h3>
        <p><strong>{report.species}</strong> · {report.speciesConfidence}</p>
        {report.speciesNote && <p>{report.speciesNote}</p>}
      </section>
    </>
  )
}

export function EvidenceGallery({ report }: { report: TreeOccurrence }) {
  return (
    <section className="detail-section">
      <h3><Image size={17} /> Galeria de evidências</h3>
      <div className="evidence-grid">
        {report.photos.map((photo) => (
          <figure key={photo.label}>
            {photo.previewUrl ? (
              <a href={photo.previewUrl} target="_blank" rel="noreferrer" aria-label={`Abrir foto: ${photo.label}`}>
                <img src={photo.previewUrl} alt={photo.label} />
              </a>
            ) : (
              <div className="evidence-placeholder" style={{ background: photo.color }}><Image size={20} /><span>{report.source === 'simulado' ? 'Simulada' : 'Sem foto'}</span></div>
            )}
            <figcaption>{photo.label}</figcaption>
          </figure>
        ))}
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

export function ReportDetails({
  report, onClose, onValidate,
}: { report: TreeOccurrence; onClose: () => void; onValidate: () => void }) {
  const feedback = useRef<HTMLParagraphElement>(null)

  async function copyFor156() {
    const risk = RISK[report.risk]
    const text = [
      report.source === 'gemini' ? 'Triagem visual — ArboAlerta SP' : 'Demonstração — ArboAlerta SP',
      `Local: ${report.address} (${report.lat.toFixed(6)}, ${report.lng.toFixed(6)})`,
      `Criticidade: ${risk.label} (${report.score}/100)`,
      `Vistoria: ${report.deadline} · ${report.urgency}`,
      `Espécie provável: ${report.species} (${report.speciesConfidence})`,
      report.summary,
      report.tags.length ? `Sinais: ${report.tags.join(', ')}` : '',
    ].filter(Boolean).join('\n')
    try {
      await navigator.clipboard.writeText(text)
      if (feedback.current) feedback.current.textContent = 'Resumo copiado para a área de transferência.'
    } catch {
      if (feedback.current) feedback.current.textContent = text
    }
  }

  return (
    <Overlay title="Detalhes da ocorrência" onClose={onClose} className="drawer">
      <header className="dialog-header">
        <div>
          <span className="source-label">{report.source === 'gemini' ? 'Triagem Gemini' : 'Demonstração'}</span>
          <h2>{report.title}</h2>
          <p><MapPin size={15} /> {report.address}</p>
        </div>
        <button type="button" className="icon-button" aria-label="Fechar detalhes" onClick={onClose}><X size={22} /></button>
      </header>
      <div className="dialog-body">
        <Diagnosis report={report} />
        <section className="detail-section"><h3>Raio estimado de impacto</h3><p>{RISK[report.risk].radius} m pela categoria de risco. Confirme a extensão em vistoria.</p></section>
        <EvidenceGallery report={report} />
      </div>
      <footer className="dialog-footer">
        <button type="button" className="button-primary" disabled={report.validatedByMe} onClick={onValidate}>
          <Check size={18} /> {report.validatedByMe ? 'Relato confirmado' : 'Confirmar Relato'} · {report.validations}
        </button>
        <button type="button" className="button-secondary" onClick={copyFor156}><Clipboard size={17} /> Copiar resumo para o 156 SP</button>
        <p ref={feedback} className="copy-feedback" aria-live="polite" />
      </footer>
    </Overlay>
  )
}
