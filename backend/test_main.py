import asyncio
import io
import json
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient
from google.genai import errors
from PIL import Image
from starlette.responses import JSONResponse

from main import PHOTO_LABELS, app, cors_origins
from photos import normalize_image
from request_limits import ANALYSIS_PATH, MAX_IMAGE_BYTES, MAX_REQUEST_BYTES, AnalysisLimits

RESULT = {
    "status_processamento": "aprovado",
    "nivel_risco": "moderado",
    "score_criticidade": 42,
    "urgencia_acao": "Vistoria",
    "prazo_recomendado": "Em 48 horas",
    "especie_provavel": "Indeterminada",
    "confianca_especie": "Confiança Baixa",
    "perfil_estrutural_especie": "",
    "sinais_identificados": [],
    "resumo_painel_usuario": "Resultado isolado para o teste.",
}


def png(color=0):
    with io.BytesIO() as output:
        Image.new("L", (100, 100), color).save(output, format="PNG")
        return output.getvalue()


def files(count=4):
    return [("fotos", (f"foto{i}.png", png(i * 20), "image/png")) for i in range(count)]


class SDK:
    def __init__(self, result=None, error=None):
        self.models = SimpleNamespace(generate_content=AsyncMock(
            return_value=SimpleNamespace(text=json.dumps(result)), side_effect=error,
        ))

    @property
    def aio(self):
        return self

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        return False


class AnalysisTests(unittest.TestCase):
    def setUp(self):
        app.middleware_stack = None
        self.addCleanup(setattr, app, "middleware_stack", None)
        env = patch.dict("os.environ", {"GEMINI_API_KEY": "test-key", "GEMINI_MODEL": "test-model"})
        env.start()
        self.addCleanup(env.stop)
        self.client = TestClient(app)
        self.addCleanup(self.client.close)

    def test_health_and_cors(self):
        self.assertEqual(self.client.get("/api/health").json(), {"status": "ok"})
        for origin, status in (("http://localhost:5173", 200), ("https://other.invalid", 400)):
            response = self.client.options(ANALYSIS_PATH, headers={
                "Origin": origin, "Access-Control-Request-Method": "POST",
            })
            self.assertEqual(response.status_code, status)
            self.assertEqual(response.headers.get("Access-Control-Allow-Origin"), origin if status == 200 else None)
        with patch.dict("os.environ", {"CORS_ORIGINS": "https://teste.vercel.app,https://outro.vercel.app/"}):
            self.assertIn("https://teste.vercel.app", cors_origins())
            self.assertIn("https://outro.vercel.app", cors_origins())
        with patch.dict("os.environ", {"CORS_ORIGINS": "https://*.vercel.app"}):
            with self.assertRaises(ValueError):
                cors_origins()

    def test_photos_in_order_without_weather_or_location(self):
        sdk = SDK(result=RESULT)
        with patch("main.genai.Client", return_value=sdk):
            response = self.client.post(ANALYSIS_PATH, files=files(), data={"vento_kmh": "123"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["score_criticidade"], 42)
        config = sdk.models.generate_content.await_args.kwargs
        self.assertEqual(config["model"], "test-model")
        parts = config["contents"].parts
        self.assertIn("Dados meteorológicos indisponíveis", parts[0].text)
        self.assertIn("Localização indisponível", parts[0].text)
        self.assertNotIn("123", parts[0].text)
        self.assertEqual([part.text for part in parts[1::2]], [f"Foto {i} — {label}" for i, label in enumerate(PHOTO_LABELS, 1)])
        for i, part in enumerate(parts[2::2]):
            self.assertEqual(part.inline_data.mime_type, "image/jpeg")
            with Image.open(io.BytesIO(part.inline_data.data)) as photo:
                self.assertEqual(photo.getpixel((0, 0)), (i * 20,) * 3)

    def test_validation_happens_before_gemini(self):
        invalid = files()
        invalid[0] = ("fotos", ("enganosa.jpg", b"not an image", "image/jpeg"))
        oversized = files()
        oversized[0] = ("fotos", ("grande.png", b"0" * (MAX_IMAGE_BYTES + 1), "image/png"))
        with patch("main.genai.Client") as gemini:
            self.assertEqual(self.client.post(ANALYSIS_PATH, files=files(3)).status_code, 422)
            self.assertEqual(self.client.post(ANALYSIS_PATH, files=invalid).status_code, 415)
            self.assertEqual(self.client.post(ANALYSIS_PATH, files=oversized).status_code, 413)
            self.assertEqual(self.client.post(ANALYSIS_PATH, files=files(), data={"lat": "10"}).status_code, 422)
            self.assertEqual(self.client.post(ANALYSIS_PATH, content=b"x", headers={
                "Content-Length": str(MAX_REQUEST_BYTES + 1),
            }).status_code, 413)
            gemini.assert_not_called()

    def test_heif_and_exif(self):
        with io.BytesIO() as raw:
            Image.new("RGB", (40, 30)).save(raw, format="HEIF")
            with Image.open(io.BytesIO(normalize_image(raw.getvalue(), 1))) as output:
                self.assertEqual(output.size, (40, 30))
        with io.BytesIO() as raw:
            exif = Image.Exif()
            exif[274] = 6
            exif[315] = "teste"
            Image.new("RGB", (40, 30)).save(raw, format="JPEG", exif=exif)
            with Image.open(io.BytesIO(normalize_image(raw.getvalue(), 1))) as output:
                self.assertEqual(output.size, (30, 40))
                self.assertFalse(output.getexif())

    def test_recapture_is_forwarded(self):
        sdk = SDK(result={**RESULT, "status_processamento": "refazer_foto",
                          "indice_foto_reprovada": 3, "instrucao_recaptura": "Use zoom sem se aproximar."})
        with patch("main.genai.Client", return_value=sdk):
            response = self.client.post(ANALYSIS_PATH, files=files(), data={"lat": "-23.5", "lng": "-46.7"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["indice_foto_reprovada"], 3)

    def test_gemini_errors_return_no_diagnosis(self):
        probes = [
            (SDK(result={**RESULT, "resumo_painel_usuario": ""}), 502),
            (SDK(error=errors.APIError(429, {"error": {"message": "quota", "status": "RESOURCE_EXHAUSTED"}})), 503),
            (SDK(error=errors.APIError(503, {"error": {"message": "busy", "status": "UNAVAILABLE"}})), 502),
            (SDK(error=TimeoutError()), 504),
        ]
        for sdk, status in probes:
            with self.subTest(status=status), patch("main.genai.Client", return_value=sdk):
                response = self.client.post(ANALYSIS_PATH, files=files())
                self.assertEqual(response.status_code, status)
                self.assertNotIn("score_criticidade", response.json())
        with patch.dict("os.environ", {"GEMINI_API_KEY": ""}), patch("main.genai.Client") as gemini:
            response = self.client.post(ANALYSIS_PATH, files=files())
            self.assertEqual(response.status_code, 503)
            gemini.assert_not_called()


class LimitTests(unittest.IsolatedAsyncioTestCase):
    async def test_global_windows_and_concurrency(self):
        started, release = asyncio.Event(), asyncio.Event()

        async def handler(scope, receive, send):
            started.set()
            await release.wait()
            await JSONResponse({"ok": True})(scope, receive, send)

        limiter = AnalysisLimits(handler, per_minute=1, per_day=2, concurrency=1)

        async def call():
            sent = []

            async def send(message):
                sent.append(message)

            await limiter({"type": "http", "path": ANALYSIS_PATH, "method": "POST", "headers": []}, None, send)
            return sent[0]

        with patch("request_limits.monotonic") as clock:
            clock.return_value = 1
            first = asyncio.create_task(call())
            await started.wait()
            self.assertEqual((await call())["status"], 429)
            clock.return_value = 62
            self.assertEqual((await call())["status"], 429)  # Only concurrency remains.
            release.set()
            self.assertEqual((await first)["status"], 200)
            self.assertEqual((await call())["status"], 200)
            clock.return_value = 123
            limited = await call()
            self.assertEqual(limited["status"], 429)
            self.assertIn(b"retry-after", dict(limited["headers"]))
            clock.return_value = 86465
            self.assertEqual((await call())["status"], 200)


if __name__ == "__main__":
    unittest.main()
