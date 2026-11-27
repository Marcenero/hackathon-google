from collections import deque
from math import ceil
from time import monotonic

from starlette.datastructures import Headers
from starlette.exceptions import HTTPException
from starlette.responses import JSONResponse

ANALYSIS_PATH = "/api/analisar-arvore"
MAX_IMAGE_BYTES = 3 * 1024 * 1024
MAX_REQUEST_BYTES = 4 * MAX_IMAGE_BYTES + 64 * 1024


class AnalysisLimits:
    def __init__(self, app, per_minute: int, per_day: int, concurrency: int):
        self.app = app
        self.in_flight = 0
        self.concurrency = concurrency
        self.windows = ((60, per_minute, deque()), (86400, per_day, deque()))

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or scope["method"] != "POST" or scope["path"].rstrip("/") != ANALYSIS_PATH:
            await self.app(scope, receive, send)
            return

        headers = Headers(scope=scope)
        try:
            size = int(headers.get("content-length", "0"))
        except ValueError:
            size = -1
        if size < 0 or size > MAX_REQUEST_BYTES:
            response = JSONResponse({"detail": "Envio acima do limite total de aproximadamente 12 MiB."}, status_code=413)
            await response(scope, receive, send)
            return

        now = monotonic()
        waits = []
        for seconds, quota, attempts in self.windows:
            while attempts and now - attempts[0] >= seconds:
                attempts.popleft()
            if len(attempts) >= quota:
                waits.append(ceil(seconds - (now - attempts[0])))
        if waits or self.in_flight >= self.concurrency:
            response = JSONResponse(
                {"detail": "O serviço atingiu o limite de análises. Aguarde e tente novamente."},
                status_code=429, headers={"Retry-After": str(max(waits, default=5))},
            )
            await response(scope, receive, send)
            return

        for _, _, attempts in self.windows:
            attempts.append(now)
        self.in_flight += 1
        received = 0

        async def bounded_receive():
            nonlocal received
            message = await receive()
            received += len(message.get("body", b""))
            if received > MAX_REQUEST_BYTES:
                raise HTTPException(413, "Envio acima do limite total de aproximadamente 12 MiB.")
            return message

        try:
            await self.app(scope, bounded_receive, send)
        finally:
            self.in_flight -= 1
