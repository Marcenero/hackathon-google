import type { CSSProperties } from 'react'
import { X, Zap } from 'lucide-react'
import { ACTION_FLAGS, DEFECT_FLAGS, NETWORK_FLAGS, healthLevel, riskLevel, treeName } from './data/inventory'
import type { InventoryTree } from './data/inventory'
import { Overlay } from './ReportDetails'

const number = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 })

function measurement(value: number | null, unit: string) {
  return value == null ? 'Sem registro' : `${number.format(value)} ${unit}`
}

function Meter({ title, value, caption, color }: { title: string; value: number; caption: string; color: string }) {
  return (
    <div className="inventory-meter">
      <span>{title}</span>
      <strong>{value}<small>/100</small></strong>
      <meter min={0} max={100} value={value} aria-label={title} style={{ '--meter-color': color } as CSSProperties} />
      <span>{caption}</span>
    </div>
  )
}

export default function InventoryDetails({ tree, onClose }: {
  tree: InventoryTree; onClose: () => void
}) {
  const risk = riskLevel(tree.rk)
  const health = healthLevel(tree.hl)
  const network = NETWORK_FLAGS.filter((_, index) => tree.fl[6 + index])
  const defects = DEFECT_FLAGS.filter((_, index) => tree.fl[index])
  const actions = ACTION_FLAGS.filter((_, index) => tree.fl[11 + index])
  return (
    <Overlay title="Ficha do inventário" className="drawer inventory-details" onClose={onClose}>
      <header className="dialog-header">
        <div>
          <span className="source-label">Inventário atribuído ao IPT</span>
          <h2>{treeName(tree)}</h2>
          {tree.sp && tree.sp !== tree.pop && <p><i>{tree.sp}</i></p>}
        </div>
        <button type="button" className="icon-button" aria-label="Fechar ficha da árvore" onClick={onClose}><X size={22} /></button>
      </header>
      <div className="dialog-body">
        <p className="inventory-tree-id">Nº {tree.id} <span>{tree.lat.toFixed(6)}, {tree.lon.toFixed(6)}</span></p>
        <div className="inventory-meters">
          <Meter title="Risco histórico" value={tree.rk} color={risk.color} caption={risk.label} />
          <Meter title="Saúde histórica" value={tree.hl} color={health.color} caption={tree.st || 'Sem registro'} />
        </div>
        <p className="capture-note">Os índices se referem ao inventário. A condição atual da árvore exige nova avaliação.</p>
        {network.length > 0 && <p className="inventory-network"><Zap size={16} aria-hidden="true" /> Rede elétrica registrada · {network.join(', ')}</p>}
        <dl className="inventory-specs">
          <div><dt>Inspeção registrada</dt><dd>{tree.dt || 'Sem data'}</dd></div>
          <div><dt>Altura</dt><dd>{measurement(tree.h, 'm')}</dd></div>
          <div><dt>DAP</dt><dd>{tree.dap ? (/^\d+(?:[,\.]\d+)?$/.test(tree.dap) ? tree.dap + ' cm' : tree.dap) : 'Sem registro'}</dd></div>
          <div><dt>Área da copa</dt><dd>{measurement(tree.copa, 'm²')}</dd></div>
          <div><dt>Análise interna</dt><dd>{tree.concl || 'Sem registro'}</dd></div>
          <div><dt>Deterioração interna</dt><dd>{measurement(tree.det, '%')}</dd></div>
        </dl>
        <section className="detail-section">
          <h3>Sinais históricos</h3>
          {defects.length ? <div className="tags">{defects.map((label) => <span key={label}>{label}</span>)}</div> : <p>Nenhum desses sinais consta no registro.</p>}
          {(tree.fl[9] || tree.fl[10] || tree.fl[16]) && <p>{[tree.fl[9] && 'Alvo pessoas', tree.fl[10] && 'Alvo bens', tree.fl[16] && 'Ponto cego do inventário'].filter(Boolean).join(' · ')}</p>}
        </section>
        <section className="detail-section">
          <h3>Recomendações da inspeção</h3>
          {actions.length ? <div className="tags">{actions.map((label) => <span key={label}>{label}</span>)}</div> : <p>Sem recomendação registrada nesses indicadores.</p>}
        </section>
      </div>
    </Overlay>
  )
}
