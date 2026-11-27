# Raiz Viva

Mapa de inventário arbóreo e triagem de ocorrências em São Paulo. O frontend usa React, TypeScript, Tailwind CSS e Leaflet. O backend FastAPI envia quatro ângulos da árvore ao Gemini pela SDK oficial `google-genai`.

## Executar localmente

Use Python 3.11+ e Node.js 22.12+. No PowerShell, abra dois terminais na pasta `arboalerta-sp`.

**Backend**

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
# Edite .env para usar sua GEMINI_API_KEY.
.\.venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000
```

Em Linux ou macOS, use `cp .env.example .env` e substitua `.\.venv\Scripts\python.exe` por `./.venv/bin/python`.

**Frontend**

```powershell
cd frontend
npm install
npm run dev
```

Abra [o mapa](http://localhost:5173) ou [a documentação interativa da API](http://localhost:8000/docs). Para compilar a versão de produção e checar TypeScript, rode `npm run build` no frontend.

## Mapa do inventário

O mapa abre no Butantã com os 1.624 registros georreferenciados do inventário atribuído ao IPT no CopaSegura, inclusive os de outras regiões. Consulte a origem e a estrutura dos dados em [Inventário atribuído ao IPT](frontend/src/data/inventory-provenance.md).

- Busque pelo nome popular, nome científico ou identificador. O filtro **Só risco alto e crítico** mantém o índice histórico a partir de 55.
- Alterne entre **Risco histórico**, **Saúde** e **Rede elétrica**. A busca e o filtro se aplicam aos pontos e às duas manchas do inventário.
- Use **Árvores**, **Mancha de risco**, **Áreas arborizadas** e **Alertas cidadãos** de forma independente. A mancha histórica de risco considera registros com índice a partir de 70. A mancha verde pondera saúde e porte. As camadas do inventário usam dados históricos.
- Abra uma ficha por um ponto ou pela lista para consultar a origem, a data e os indicadores da inspeção.

O mapa-base usa [OpenStreetMap](https://www.openstreetmap.org/copyright).

## Testar a publicação

1. Abra **Reportar Árvore** e permita o acesso à localização. Use quatro fotos reais.
2. Escolha **Analisar árvore**, revise a triagem e clique em **Publicar Alerta no Mapa**. Se houver pedido de recaptura, substitua o ângulo indicado.
3. Abra o marcador circular do relato ou selecione-o na lista. Confira o diagnóstico e as evidências. O controle **Alertas cidadãos** alterna essa camada.

A integração usa `POST /api/analisar-arvore` e o modelo selecionado em `GEMINI_MODEL`. A demonstração da captura anterior continua disponível para pré-visualização. Só uma triagem real com localização obtida pelo GPS pode publicar um marcador.

Os relatos e as confirmações da versão atual ficam na sessão do navegador. Contas, persistência, pontuação, ranking e verificação municipal por um gestor ainda não existem nesta branch.
