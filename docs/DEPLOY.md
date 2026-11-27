# Publicação do Raiz Viva para testes

O Raiz Viva é um protótipo experimental de triagem visual. Um resultado do Gemini indica o que pode ser observado nas fotografias. A avaliação de risco atual exige vistoria presencial, e o aplicativo não encaminha ocorrências a órgãos públicos.

## Render

Ao publicar com autorização, importe o repositório `Marcenero/hackathon-google` como **Blueprint**, selecione a branch `prototipo` e o arquivo `render.yaml` na raiz. O Blueprint inicia a implantação se for aplicado. Para um serviço existente, use os mesmos campos no painel.

| Campo | Valor |
|---|---|
| Nome sugerido | `raiz-viva-api` |
| Tipo, runtime e plano | Web Service, Python, Free |
| Branch | `prototipo` |
| Root Directory | `backend` |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `uvicorn main:app --host 0.0.0.0 --port $PORT` |
| Health Check Path | `/api/health` |
| Auto-Deploy | Off |
| Instâncias e processos | Uma instância, um processo Uvicorn |

| Variável | Valor e finalidade |
|---|---|
| `PORT` | Injetada pelo Render. |
| `PYTHON_VERSION` | `3.13.12`, definida no Blueprint. |
| `GEMINI_API_KEY` | Chave privada do projeto Google, cadastrada exclusivamente no Render. |
| `GEMINI_MODEL` | `gemini-3.5-flash-lite` por padrão no Blueprint. Se usar outro modelo, confirme acesso pela chave, entrada de imagens e saída estruturada. |
| `CORS_ORIGINS` | URL HTTPS exata do frontend, como `https://raiz-viva-exemplo.vercel.app`. Use vírgulas para múltiplas origens, sem caminho ou curinga. `localhost` e `127.0.0.1` nas portas 5173 e 4173 já são permitidos. |
| `ANALYSIS_PER_MINUTE` | `12`. Número global de solicitações de análise admitidas em 60 segundos. |
| `ANALYSIS_PER_DAY` | `120`. Número global de solicitações de análise admitidas em 24 horas. |
| `ANALYSIS_CONCURRENCY` | `2`. Número de solicitações de análise processadas em paralelo. |

Use a URL que o Render atribuir ao serviço. Quando o domínio exato da Vercel estiver disponível, atualize `CORS_ORIGINS` no Render. Para um serviço existente, configure manualmente as variáveis marcadas `sync: false`. [Blueprint do Render](https://render.com/docs/blueprint-spec)

Os limites vivem em memória por processo e reiniciam com o serviço. São compartilhados por todos os testers, incluindo envios admitidos que falham na validação. Limite atingido retorna HTTP 429 com `Retry-After`. A rota de saúde e os preflights CORS ficam fora das cotas. CORS controla origens no navegador. A chave do Gemini e as cotas do projeto Google continuam sendo necessárias para limitar o custo da API. O plano Free pode suspender o serviço após inatividade. [Plano Free do Render](https://render.com/docs/free)

## Vercel

Importe o mesmo repositório em um projeto Vercel. Configure a **Production Branch** como `prototipo` para usar o domínio estável do projeto na rodada de testes.

| Campo | Valor |
|---|---|
| Nome sugerido do projeto | raiz-viva |
| Production Branch | `prototipo` |
| Root Directory | `frontend` |
| Framework Preset | Vite |
| Node.js Version | 22.x, a partir de 22.12 |
| Install Command | `npm ci` |
| Build Command | `npm run build` |
| Output Directory | `dist` |

Configure `VITE_API_URL` no ambiente **Production** com a origem HTTPS do Render, por exemplo `https://raiz-viva-api-exemplo.onrender.com`, sem `/api`. Adicione a variável ao ambiente **Preview** apenas se for usar um preview e inclua a origem HTTPS exata desse preview no Render. A variável é pública e entra no build. Alterá-la requer um novo build. Em produção, o formulário exibe um erro de configuração quando a URL está ausente ou inválida; o mapa continua disponível. [Vite na Vercel](https://vercel.com/docs/frameworks/frontend/vite) · [Variáveis na Vercel](https://vercel.com/docs/environment-variables)

Após obter os dois domínios, compare `VITE_API_URL` da Vercel com a URL do Render e `CORS_ORIGINS` do Render com a URL exata aberta pelos testers. No primeiro acesso, confirme `GET /api/health` e faça uma análise de quatro fotos em HTTPS. O estado de saúde confirma que o FastAPI está respondendo. A análise confirma acesso e cota do modelo.

## Testar localmente

No backend, instale `requirements.txt`, crie `backend/.env` a partir do exemplo e execute `python -m uvicorn main:app --host 0.0.0.0 --port 8000`. Em outro terminal, rode `npm ci` e `npm run dev` em `frontend`. O Vite usa `http://localhost:8000` em desenvolvimento se `VITE_API_URL` estiver ausente. Câmera e GPS exigem HTTPS ou localhost. Em um smartphone conectado pela rede local, use HTTPS para testar permissões.

Rode `npm run build` em `frontend` e confira o inventário em `dist/assets/iptInventory-*.json`. Rode `python -m unittest -v test_main` em `backend` para validar a API com a chamada externa isolada. A geração real exige uma chave válida, acesso ao modelo escolhido e cota. Em um `.env` local anterior, atualize `GEMINI_MODEL` para `gemini-3.5-flash-lite` se ainda estiver usando o padrão antigo. [Gemini 3.5 Flash-Lite](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite) · [Modelos descontinuados](https://ai.google.dev/gemini-api/docs/deprecations)

## Limitações para a rodada de testes

- O inventário é histórico. Sua atribuição ao IPT vem da documentação do CopaSegura. Datas e indicadores foram preservados; podem estar desatualizados e não comprovam risco atual. O ZIP não traz licença de redistribuição. Confirme a autorização para disponibilizar essa base a terceiros. [Procedência declarada](../frontend/src/data/inventory-provenance.md)
- Fotos JPEG, PNG, WebP e HEIC/HEIF estáticas de até 3 MiB e 20 megapixels são verificadas e normalizadas no servidor. A prévia HEIC depende do navegador. O servidor envia imagens sem EXIF e, quando fornecida, localização ao Gemini. Esses dados não são mantidos pelo app ou pelo backend após a análise. Consulte as condições de tratamento de dados do provedor Google antes de distribuir a testers. [Termos da API Gemini](https://ai.google.dev/gemini-api/terms)
- Diagnóstico e pontos potenciais existem somente no painel da sessão atual. O MVP não publica marcadores, salva fotos ou resultados permanentemente, nem implementa autenticação, saldo, carteira, ranking, validação comunitária ou verificação municipal.
- Não há fonte meteorológica na integração. A análise funciona com evidência fotográfica sem esse contexto. A verificação de clima seguro para pontos fica pendente.
- Nenhuma estimativa substitui a validação da localização, do inventário ou das evidências. Se alguma foto exigir aproximação, interrompa a captura.
