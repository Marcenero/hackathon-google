# ArboAlerta SP

Mapa de triagem de ocorrências arbóreas em São Paulo. O frontend usa React, TypeScript, Tailwind CSS e Leaflet. O backend FastAPI envia quatro ângulos da árvore ao Gemini pela SDK oficial `google-genai`.

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

## Testar o fluxo

1. Aceite a geolocalização ou use a referência da Av. Paulista.
2. Abra **Reportar Árvore**. Capture os quatro ângulos ou use **Simular captura**. Use **Simular Foto Ruim** para repetir o ângulo atual e conservar as outras fotos.
3. Escolha **Analisar árvore**, revise a triagem e clique em **Publicar Alerta no Mapa**.
4. Abra a ocorrência a partir do pino, confirme o relato e copie o resumo para o 156 SP.

Quatro fotos reais acionam `POST /api/analisar-arvore`. Uma chave ausente, um serviço indisponível ou qualquer captura simulada ativa o modo demonstração, identificado na interface. O modelo padrão é `gemini-2.5-flash`, selecionável em `GEMINI_MODEL`. O Google informa que o acesso ao 2.5 Flash está limitado a usuários que já o utilizaram e que o identificador será redirecionado a partir de 1º de dezembro de 2026. [Cronograma do Gemini](https://ai.google.dev/gemini-api/docs/deprecations#gemini-2.5-flash-models)

Os relatos iniciais e os valores do aviso climático são exemplos. O mapa-base é carregado do OpenStreetMap. Os relatos publicados e as confirmações ficam na sessão da página. O raio decorre da categoria de risco e serve apenas como estimativa visual. A triagem orienta a solicitação de vistoria presencial.
