import logging
from contextlib import asynccontextmanager

import socketio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

import app.handlers
from app.api.router import api_router
from app.config import settings
from app.database import async_session_factory
from app.models.user import User
from app.services.handler_manager import HandlerManager
from app.socketio_app import sio
from app.utils.security import hash_password

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Seed default admin user
    async with async_session_factory() as session:
        result = await session.execute(select(User).where(User.username == settings.default_admin_username))
        if not result.scalar_one_or_none():
            admin = User(
                username=settings.default_admin_username,
                email=f"{settings.default_admin_username}@localhost",
                hashed_password=hash_password(settings.default_admin_password),
                role="admin",
                is_active=True,
            )
            session.add(admin)
            await session.commit()
            logger.info("Default admin user created")

    # Start handler manager
    manager = HandlerManager(async_session_factory)
    app.state.handler_manager = manager
    await manager.startup()

    yield

    await manager.shutdown()


def create_app() -> FastAPI:
    app = FastAPI(
        title="ContWatch API",
        version="2.0.0",
        docs_url="/api/docs",
        openapi_url="/api/openapi.json",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.backend_cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(api_router, prefix="/api")

    return app


app = create_app()
sio_asgi_app = socketio.ASGIApp(sio, other_asgi_app=app)
