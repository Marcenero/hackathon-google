import { useMemo, useState } from 'react'
import { estimatePoints, findCandidates } from './contributionPoints'
import type { LocationFix } from './contributionPoints'
import { inventoryKey, treeName } from './data/inventory'
import type { InventoryTree } from './data/inventory'
import type { CapturedSlotItem, GeminiAnalysisResponse } from './types/tree'

export function ContributionEstimate({ inventory, location, photos, analysis, duplicate, observedAt }: {
  inventory: InventoryTree[]
  location: LocationFix | null
  photos: CapturedSlotItem[]
  analysis: GeminiAnalysisResponse
  duplicate: boolean
  observedAt: number
}) {
  const [choice, setChoice] = useState('')
  const candidates = useMemo(() => findCandidates(inventory, location, analysis.especie_provavel, analysis.confianca_especie),
    [inventory, location, analysis.especie_provavel, analysis.confianca_especie])
  const selection = choice === 'new' ? 'new' : candidates.find(({ tree }) => inventoryKey(tree) === choice)?.tree ?? null
  const estimate = estimatePoints({
    selection, location, observedAt, duplicate, origins: photos.map(({ origin }) => origin),
    probableSpecies: analysis.especie_provavel, speciesConfidence: analysis.confianca_especie,
  })
  return (
    <section className="detail-section contribution-estimate" aria-labelledby="contribution-title">
      <h3 id="contribution-title">Sua contribuição para a cidade</h3>
      <p>A estimativa considera o conjunto dos quatro ângulos como uma contribuição. Fotos da galeria são aceitas para triagem e deixam o conjunto sem pontos pela captura.</p>
      <label>
        Possível correspondência no inventário
        <select value={choice} onChange={(event) => setChoice(event.target.value)}>
          <option value="">Não tenho certeza</option>
          {candidates.map(({ tree, meters, speciesMatch }) => <option key={inventoryKey(tree)} value={inventoryKey(tree)}>
            {treeName(tree)} · nº {tree.id} · {Math.round(meters)} m{speciesMatch ? ' · espécie compatível' : ''}
          </option>)}
          <option value="new">Pode ser uma árvore fora do inventário</option>
        </select>
      </label>
      <p>{candidates.length ? 'Sugestões por proximidade e espécie provável. Escolha apenas se reconhecer o exemplar de um local seguro.' : 'Nenhum candidato pôde ser sugerido com os dados disponíveis. Isso não confirma um cadastro novo.'}</p>
      <p className="contribution-total" aria-live="polite"><strong>{estimate.total} pontos potenciais</strong> pelas regras demonstradas</p>
      <dl>
        <div><dt>Pontuação base</dt><dd>{estimate.base.length ? estimate.base.map((line) => `+${line.points} · ${line.reason}`).join(' ') : 'Em aberto até confirmar a correspondência.'}</dd></div>
        <div><dt>Bônus aplicáveis pelo inventário</dt><dd>{estimate.bonuses.length ? <ul>{estimate.bonuses.map((line) => <li key={line.reason}>+{line.points} · {line.reason}</li>)}</ul> : 'Nenhum bônus calculável com os dados disponíveis.'}</dd></div>
        <div><dt>Dependem de validação futura e ficam fora do total</dt><dd><ul>{estimate.conditional.map((line) => <li key={line.reason}>{line.upTo ? 'Até ' : ''}+{line.points} · {line.reason}</li>)}</ul></dd></div>
      </dl>
      {estimate.blockers.length > 0 && <ul className="contribution-blockers">{estimate.blockers.map((reason) => <li key={reason}>{reason}</li>)}</ul>}
      <p>A estimativa também depende de confirmar o clima seguro, a procedência das fotos, duplicidade contra envios anteriores, o intervalo de 30 dias por árvore e o limite de 20 contribuições diárias. O navegador informa a precisão do GPS, sem comprovar onde a foto foi tirada.</p>
      <p><strong>Estimativa demonstrativa.</strong> Em uma versão futura, os pontos seriam creditados após validação. Esta análise fica temporariamente na tela.</p>
    </section>
  )
}
