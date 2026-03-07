from httpx import AsyncClient


async def test_login_success(client: AsyncClient, auth_headers: dict):
    # auth_headers fixture already logged in successfully
    assert "Authorization" in auth_headers


async def test_login_wrong_password(client: AsyncClient):
    # First create a user
    from app.models.user import User
    from app.utils.security import hash_password
    from tests.conftest import TestSessionFactory

    async with TestSessionFactory() as session:
        user = User(
            username="testuser",
            email="test@test.com",
            hashed_password=hash_password("correct"),
            role="user",
            is_active=True,
        )
        session.add(user)
        await session.commit()

    response = await client.post("/api/auth/login", json={"username": "testuser", "password": "wrong"})
    assert response.status_code == 401


async def test_me_with_token(client: AsyncClient, auth_headers: dict):
    response = await client.get("/api/auth/me", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "admin"
    assert data["role"] == "admin"


async def test_me_without_token(client: AsyncClient):
    response = await client.get("/api/auth/me")
    assert response.status_code in (401, 403)
