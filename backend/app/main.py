import logging
import sys
from contextlib import asynccontextmanager
from datetime import UTC, datetime

import socketio
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint

import app.handlers
from app.api.router import api_router
from app.config import settings
from app.database import async_session_factory, engine
from app.limiter import limiter
from app.services.handler_manager import HandlerManager
from app.socketio_app import sio

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def _check_db_connection() -> None:
    """Verify database connectivity at startup with a clear error message."""
    import os

    from sqlalchemy import text as sa_text

    try:
        async with engine.connect() as conn:
            await conn.execute(sa_text("SELECT 1"))
    except Exception as exc:
        print(
            f"\n  ERROR: Cannot connect to the database at "
            f"{settings.postgres_host}:{settings.postgres_port}/{settings.postgres_db}"
            f"\n  {type(exc).__name__}: {exc}\n",
            file=sys.stderr,
        )
        os._exit(1)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await _check_db_connection()

    # Start handler manager
    manager = HandlerManager(async_session_factory)
    app.state.handler_manager = manager
    await manager.startup()
    app.state.started_at = datetime.now(UTC)

    yield

    await manager.shutdown()


_DOCS_PATHS = ("/api/docs", "/api/openapi.json")

_CSP_DEFAULT = (
    "default-src 'self'; "
    "script-src 'self'; "
    "style-src 'self' 'unsafe-inline'; "
    "img-src 'self' data:; "
    "font-src 'self'; "
    "connect-src 'self' ws: wss:; "
    "frame-src 'self' https://challenges.cloudflare.com; "
    "frame-ancestors 'none'"
)

_CSP_DOCS = (
    "default-src 'self'; "
    "script-src 'self' https://cdn.jsdelivr.net 'unsafe-inline'; "
    "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
    "img-src 'self' data: https://fastapi.tiangolo.com; "
    "font-src 'self'; "
    "connect-src 'self'; "
    "frame-ancestors 'none'"
)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        csp = _CSP_DOCS if request.url.path in _DOCS_PATHS else _CSP_DEFAULT
        response.headers["Content-Security-Policy"] = csp
        if not settings.debug:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response


def create_app() -> FastAPI:
    app = FastAPI(
        title="ContWatch API",
        version="2.0.0",
        docs_url="/api/docs" if settings.debug else None,
        openapi_url="/api/openapi.json" if settings.debug else None,
        lifespan=lifespan,
    )

    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.backend_cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        allow_headers=["Authorization", "Content-Type", "X-Requested-With"],
    )

    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    app.include_router(api_router, prefix="/api")

    if not settings.debug and not settings.turnstile_secret_key:
        logger.warning("TURNSTILE_SECRET_KEY is not set — login CAPTCHA verification is disabled")

    return app


app = create_app()
sio_asgi_app = socketio.ASGIApp(sio, other_asgi_app=app)
