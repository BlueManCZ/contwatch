import asyncio
from collections.abc import AsyncGenerator
from unittest.mock import AsyncMock

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.database import get_db
from app.main import app
from app.models import Base
from app.utils.security import hash_password

TEST_DATABASE_URL = "sqlite+aiosqlite://"

engine = create_async_engine(TEST_DATABASE_URL)
TestSessionFactory = async_sessionmaker(engine, expire_on_commit=False)


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(autouse=True)
async def setup_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


async def override_get_db() -> AsyncGenerator[AsyncSession]:
    async with TestSessionFactory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture
async def client() -> AsyncGenerator[AsyncClient]:
    mock_manager = AsyncMock()
    mock_manager.get_handler_status.return_value = {"running": False, "connected": False}
    mock_manager.get_available_attributes.return_value = []
    app.state.handler_manager = mock_manager
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


@pytest.fixture
async def auth_headers(client: AsyncClient) -> dict[str, str]:
    # Create admin user directly in DB
    async with TestSessionFactory() as session:
        from app.models.user import User

        admin = User(
            username="admin",
            email="admin@test.com",
            hashed_password=hash_password("admin"),
            role="admin",
            is_active=True,
        )
        session.add(admin)
        await session.commit()

    # Login to get token
    response = await client.post("/api/auth/login", json={"username": "admin", "password": "admin"})
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
