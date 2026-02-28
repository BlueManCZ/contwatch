from httpx import AsyncClient


async def test_list_handlers_empty(client: AsyncClient, auth_headers: dict):
    response = await client.get("/api/handlers/", headers=auth_headers)
    assert response.status_code == 200
    assert response.json() == []


async def test_create_handler(client: AsyncClient, auth_headers: dict):
    response = await client.post(
        "/api/handlers/",
        json={"type": "http", "options": {"host": "192.168.1.1"}, "enabled": True},
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["type"] == "http"
    assert data["options"]["host"] == "192.168.1.1"
    assert data["enabled"] is True


async def test_get_handler(client: AsyncClient, auth_headers: dict):
    # Create
    create_resp = await client.post(
        "/api/handlers/",
        json={"type": "serial", "options": {"port": "/dev/ttyUSB0"}},
        headers=auth_headers,
    )
    handler_id = create_resp.json()["id"]

    # Get
    response = await client.get(f"/api/handlers/{handler_id}", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["type"] == "serial"


async def test_update_handler(client: AsyncClient, auth_headers: dict):
    # Create
    create_resp = await client.post(
        "/api/handlers/",
        json={"type": "http", "options": {}, "enabled": True},
        headers=auth_headers,
    )
    handler_id = create_resp.json()["id"]

    # Update
    response = await client.patch(
        f"/api/handlers/{handler_id}",
        json={"enabled": False},
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["enabled"] is False


async def test_delete_handler(client: AsyncClient, auth_headers: dict):
    # Create
    create_resp = await client.post(
        "/api/handlers/",
        json={"type": "http", "options": {}},
        headers=auth_headers,
    )
    handler_id = create_resp.json()["id"]

    # Delete
    response = await client.delete(f"/api/handlers/{handler_id}", headers=auth_headers)
    assert response.status_code == 204

    # Verify gone
    response = await client.get(f"/api/handlers/{handler_id}", headers=auth_headers)
    assert response.status_code == 404
