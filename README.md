# Raiz Viva

Protótipo experimental de triagem visual de árvores. O mapa consulta um inventário histórico e o FastAPI envia quatro fotografias ao Gemini pela SDK oficial `google-genai`. A triagem indica evidências visuais e não substitui avaliação presencial.

## Executar localmente

Use Python 3.11+ e Node.js 22.12+. Abra dois terminais na raiz do repositório.

**Backend**

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
# Preencha GEMINI_API_KEY em backend/.env.
.\.venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8000
```

Em Linux ou macOS, use `cp .env.example .env` e substitua `.\.venv\Scripts\python.exe` por `./.venv/bin/python`.

**Frontend**

```powershell
cd frontend
npm ci
npm run dev
```

Abra [o mapa](http://localhost:5173) ou [a documentação da API](http://localhost:8000/docs). Use `frontend/.env.example` como referência para uma URL diferente do padrão local. Para publicar a branch `prototipo`, consulte [Deploy para testers](docs/DEPLOY.md).

## Mapa do inventário

O mapa abre no Butantã com os 1.624 registros georreferenciados do inventário atribuído ao IPT no CopaSegura, inclusive os de outras regiões. A data, as coordenadas e os indicadores pertencem ao acervo histórico e podem estar desatualizados. Consulte a [procedência declarada e as limitações](frontend/src/data/inventory-provenance.md).

- Busque por espécie, nome científico ou identificador e filtre por risco alto e crítico.
- Alterne entre risco histórico, saúde e rede elétrica. A busca e o filtro se aplicam aos pontos e às duas manchas.
- Ative ou desative **Árvores**, **Mancha de risco** e **Áreas arborizadas** independentemente.
- Abra uma ficha pelo ponto ou pela lista para ver a data e os indicadores do inventário.

## Experimentar a análise

1. Abra **Reportar Árvore**. A localização é opcional para a triagem. Quando autorizada, ela ajuda a sugerir registros próximos.
2. Para cada ângulo, escolha **Tirar foto pela câmera** ou **Enviar foto da galeria ou computador**. Fotografe apenas de um local seguro. Interrompa se algum ângulo exigir aproximação.
3. Selecione **Analisar árvore**. Se o Gemini pedir recaptura, substitua a imagem indicada. As demais ficam no painel.
4. Leia o resultado e **Sua contribuição para a cidade**. Use **Concluir** para voltar ao mapa ou **Nova análise** para limpar as quatro fotos e o resultado.

A triagem usa `POST /api/analisar-arvore` e as variáveis `GEMINI_API_KEY` e `GEMINI_MODEL` no backend. Sem dados meteorológicos reais, o resultado informa que a triagem se baseia nas fotos. Em caso de erro, as fotos permanecem no painel para nova tentativa. Câmera e GPS exigem HTTPS ou localhost.

## Como a estimativa funciona

A referência são as regras de `js/gamification.js`, `js/matching.js` e `docs/ARQUITETURA.md` do CopaSegura. O código calcula um total ilustrativo para o conjunto, sem decisão de pontos pela IA. Para a estimativa de captura, quatro fotos da câmera e GPS com precisão de até 15 m são requisitos. Uma imagem da galeria no conjunto zera a estimativa de captura. Imagens idênticas também zeram o total. A verificação de duplicidade usa o arquivo exato dentro do conjunto.

O GPS é do aparelho. A interface sugere até três registros próximos, priorizando a espécie provável quando compatível, e depende de escolha explícita. A distância aparece como referência e não determina a identidade da árvore. O MVP não usa bússola, pose, porte estimado ou comparação com fotos antigas para afirmar correspondência.

| Regra de referência | Pontos | Uso no MVP |
|---|---:|---|
| Foto de árvore já cadastrada | 50 | Base ilustrativa para a correspondência indicada. |
| Atualização de ponto cego | +50 | Usa o indicador original do inventário. |
| Primeira foto | +40 | Condicional, pois não há histórico de fotos. |
| Atualização de 6 a 12 meses | +10 | Faixa pela data de inspeção disponível. |
| Atualização de 1 a 2 anos | +30 | Faixa pela data de inspeção disponível. |
| Atualização de mais de 2 anos | +60 | Faixa pela data de inspeção disponível. |
| Identificação de espécie antes desconhecida | +40 | Condicional à confirmação da espécie. |
| Nova árvore | 80 | Base alternativa, condicionada à comprovação de que está fora do inventário. |
| Sinal crítico confirmado | +60 | Condicional à confirmação do sinal. |
| Alerta confirmado por dois cidadãos | 30 | Fora deste fluxo. |
| Validação da foto de outro cidadão | 10 | Fora deste fluxo. |
| Confirmação do alerta de outro cidadão | 10 | Fora deste fluxo. |

Os bônus podem acumular, com uma única faixa temporal. As faixas originais usam mais de 182, 365 e 730 dias. Um registro mais recente pode mudar o bônus. Uma versão futura precisaria validar a correspondência, fotos, clima seguro, intervalo de 30 dias por árvore e limite de 20 contribuições por dia, antes de creditar pontos.

O painel é temporário. O MVP não altera o mapa, cria registros, mantém histórico ou credita pontos. O projeto não tem banco de dados, autenticação, carteira, ranking, validação comunitária ou verificação municipal.

## Verificar

Em `frontend`, rode `npm run build`. Em `backend`, rode `python -m unittest -v test_main`. O teste da API é isolado do serviço externo. O teste manual em HTTPS e os campos de publicação estão em [Deploy para testers](docs/DEPLOY.md).
