from httpx import AsyncClient
from sqlalchemy import text

from tests.conftest import TestSessionFactory


async def _create_handler(client: AsyncClient, headers: dict) -> int:
    resp = await client.post("/api/handlers/", json={"type": "http", "options": {}}, headers=headers)
    assert resp.status_code == 201
    return resp.json()["id"]


async def _create_attribute(
    client: AsyncClient,
    headers: dict,
    handler_id: int,
    name: str = "temperature",
    min_value: float | None = None,
    max_value: float | None = None,
) -> dict:
    resp = await client.post(
        "/api/attributes/",
        json={"name": name, "handler_id": handler_id, "enabled": True},
        headers=headers,
    )
    assert resp.status_code == 201
    attr = resp.json()

    # Set min/max via patch if provided
    patch_data: dict = {}
    if min_value is not None:
        patch_data["min_value"] = min_value
    if max_value is not None:
        patch_data["max_value"] = max_value
    if patch_data:
        resp = await client.patch(f"/api/attributes/{attr['id']}", json=patch_data, headers=headers)
        assert resp.status_code == 200
        attr = resp.json()

    return attr


class TestAttributeMinMax:
    """Test attribute CRUD with min/max fields."""

    async def test_create_attribute_has_null_bounds(self, client: AsyncClient, auth_headers: dict):
        handler_id = await _create_handler(client, auth_headers)
        resp = await client.post(
            "/api/attributes/",
            json={"name": "temp", "handler_id": handler_id, "enabled": True},
            headers=auth_headers,
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["min_value"] is None
        assert data["max_value"] is None

    async def test_update_attribute_min_max(self, client: AsyncClient, auth_headers: dict):
        handler_id = await _create_handler(client, auth_headers)
        attr = await _create_attribute(client, auth_headers, handler_id)

        resp = await client.patch(
            f"/api/attributes/{attr['id']}",
            json={"min_value": -10.0, "max_value": 50.0},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["min_value"] == -10.0
        assert data["max_value"] == 50.0

    async def test_clear_attribute_bounds(self, client: AsyncClient, auth_headers: dict):
        handler_id = await _create_handler(client, auth_headers)
        attr = await _create_attribute(client, auth_headers, handler_id, min_value=-10.0, max_value=50.0)

        resp = await client.patch(
            f"/api/attributes/{attr['id']}",
            json={"min_value": None, "max_value": None},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["min_value"] is None
        assert data["max_value"] is None

    async def test_list_attributes_includes_bounds(self, client: AsyncClient, auth_headers: dict):
        handler_id = await _create_handler(client, auth_headers)
        await _create_attribute(client, auth_headers, handler_id, min_value=0.0, max_value=100.0)

        resp = await client.get("/api/attributes/", headers=auth_headers)
        assert resp.status_code == 200
        attrs = resp.json()
        assert len(attrs) >= 1
        attr = next(a for a in attrs if a["min_value"] == 0.0)
        assert attr["max_value"] == 100.0


async def _insert_data_units(handler_id: int, attribute_id: int, values: list[tuple[str, float]]):
    """Insert data units directly into the database. values: list of (iso_timestamp, value)."""
    async with TestSessionFactory() as session:
        for ts_str, val in values:
            await session.execute(
                text(
                    "INSERT INTO data_units (timestamp, attribute_id, handler_id, value) "
                    "VALUES (:ts, :attr_id, :handler_id, :value)"
                ),
                {"ts": ts_str, "attr_id": attribute_id, "handler_id": handler_id, "value": val},
            )
        await session.commit()


class TestOutOfRangeByDate:
    """Test POST /out-of-range-by-date and DELETE /out-of-range-by-date endpoints."""

    async def test_check_finds_violations(self, client: AsyncClient, auth_headers: dict):
        handler_id = await _create_handler(client, auth_headers)
        attr = await _create_attribute(client, auth_headers, handler_id, min_value=0.0, max_value=50.0)

        await _insert_data_units(
            handler_id,
            attr["id"],
            [
                ("2025-11-19T10:00:00+00:00", 25.0),  # in range
                ("2025-11-19T11:00:00+00:00", -5.0),  # below min
                ("2025-11-19T12:00:00+00:00", 100.0),  # above max
                ("2025-11-19T13:00:00+00:00", 30.0),  # in range
            ],
        )

        resp = await client.post(
            "/api/attributes/out-of-range-by-date",
            json={
                "date": "2025-11-19",
                "attributes": [{"attribute_id": attr["id"], "min_value": 0.0, "max_value": 50.0}],
            },
            headers=auth_headers,
        )
        assert resp.status_code == 200
        items = resp.json()
        assert len(items) == 1
        assert items[0]["attribute_id"] == attr["id"]
        assert items[0]["count"] == 2

    async def test_check_with_custom_bounds(self, client: AsyncClient, auth_headers: dict):
        handler_id = await _create_handler(client, auth_headers)
        attr = await _create_attribute(client, auth_headers, handler_id, min_value=0.0, max_value=100.0)

        await _insert_data_units(
            handler_id,
            attr["id"],
            [
                ("2025-11-19T10:00:00+00:00", 25.0),
                ("2025-11-19T11:00:00+00:00", 75.0),
                ("2025-11-19T12:00:00+00:00", 90.0),
            ],
        )

        # Use tighter custom bounds than attribute settings
        resp = await client.post(
            "/api/attributes/out-of-range-by-date",
            json={
                "date": "2025-11-19",
                "attributes": [{"attribute_id": attr["id"], "min_value": 0.0, "max_value": 50.0}],
            },
            headers=auth_headers,
        )
        assert resp.status_code == 200
        items = resp.json()
        assert len(items) == 1
        assert items[0]["count"] == 2  # 75 and 90 are above custom max of 50

    async def test_check_no_violations(self, client: AsyncClient, auth_headers: dict):
        handler_id = await _create_handler(client, auth_headers)
        attr = await _create_attribute(client, auth_headers, handler_id)

        await _insert_data_units(
            handler_id,
            attr["id"],
            [("2025-11-19T10:00:00+00:00", 25.0)],
        )

        resp = await client.post(
            "/api/attributes/out-of-range-by-date",
            json={
                "date": "2025-11-19",
                "attributes": [{"attribute_id": attr["id"], "min_value": 0.0, "max_value": 50.0}],
            },
            headers=auth_headers,
        )
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_check_no_bounds_returns_empty(self, client: AsyncClient, auth_headers: dict):
        resp = await client.post(
            "/api/attributes/out-of-range-by-date",
            json={"date": "2025-11-19", "attributes": []},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_check_only_min_bound(self, client: AsyncClient, auth_headers: dict):
        handler_id = await _create_handler(client, auth_headers)
        attr = await _create_attribute(client, auth_headers, handler_id)

        await _insert_data_units(
            handler_id,
            attr["id"],
            [
                ("2025-11-19T10:00:00+00:00", -5.0),
                ("2025-11-19T11:00:00+00:00", 25.0),
            ],
        )

        resp = await client.post(
            "/api/attributes/out-of-range-by-date",
            json={
                "date": "2025-11-19",
                "attributes": [{"attribute_id": attr["id"], "min_value": 0.0}],
            },
            headers=auth_headers,
        )
        assert resp.status_code == 200
        items = resp.json()
        assert len(items) == 1
        assert items[0]["count"] == 1

    async def test_check_different_date_no_results(self, client: AsyncClient, auth_headers: dict):
        handler_id = await _create_handler(client, auth_headers)
        attr = await _create_attribute(client, auth_headers, handler_id)

        await _insert_data_units(
            handler_id,
            attr["id"],
            [("2025-11-19T10:00:00+00:00", 100.0)],
        )

        resp = await client.post(
            "/api/attributes/out-of-range-by-date",
            json={
                "date": "2025-11-20",
                "attributes": [{"attribute_id": attr["id"], "max_value": 50.0}],
            },
            headers=auth_headers,
        )
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_delete_out_of_range(self, client: AsyncClient, auth_headers: dict):
        handler_id = await _create_handler(client, auth_headers)
        attr = await _create_attribute(client, auth_headers, handler_id)

        await _insert_data_units(
            handler_id,
            attr["id"],
            [
                ("2025-11-19T10:00:00+00:00", 25.0),  # in range
                ("2025-11-19T11:00:00+00:00", -5.0),  # below min
                ("2025-11-19T12:00:00+00:00", 100.0),  # above max
            ],
        )

        resp = await client.request(
            "DELETE",
            "/api/attributes/out-of-range-by-date",
            json={
                "date": "2025-11-19",
                "attributes": [{"attribute_id": attr["id"], "min_value": 0.0, "max_value": 50.0}],
            },
            headers=auth_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["deleted"] == 2

        # Verify only the in-range value remains
        async with TestSessionFactory() as session:
            result = await session.execute(
                text("SELECT value FROM data_units WHERE attribute_id = :attr_id"),
                {"attr_id": attr["id"]},
            )
            remaining = [row[0] for row in result]
            assert remaining == [25.0]

    async def test_delete_with_custom_bounds(self, client: AsyncClient, auth_headers: dict):
        handler_id = await _create_handler(client, auth_headers)
        attr = await _create_attribute(client, auth_headers, handler_id, min_value=0.0, max_value=100.0)

        await _insert_data_units(
            handler_id,
            attr["id"],
            [
                ("2025-11-19T10:00:00+00:00", 25.0),
                ("2025-11-19T11:00:00+00:00", 75.0),
                ("2025-11-19T12:00:00+00:00", 90.0),
            ],
        )

        # Delete using tighter custom bounds (max=50), not the attribute's saved max=100
        resp = await client.request(
            "DELETE",
            "/api/attributes/out-of-range-by-date",
            json={
                "date": "2025-11-19",
                "attributes": [{"attribute_id": attr["id"], "min_value": 0.0, "max_value": 50.0}],
            },
            headers=auth_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["deleted"] == 2

    async def test_delete_empty_attributes_returns_zero(self, client: AsyncClient, auth_headers: dict):
        resp = await client.request(
            "DELETE",
            "/api/attributes/out-of-range-by-date",
            json={"date": "2025-11-19", "attributes": []},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["deleted"] == 0

    async def test_multiple_attributes(self, client: AsyncClient, auth_headers: dict):
        handler_id = await _create_handler(client, auth_headers)
        attr1 = await _create_attribute(client, auth_headers, handler_id, name="temp")
        attr2 = await _create_attribute(client, auth_headers, handler_id, name="humidity")

        await _insert_data_units(
            handler_id,
            attr1["id"],
            [("2025-11-19T10:00:00+00:00", 100.0)],  # above max
        )
        await _insert_data_units(
            handler_id,
            attr2["id"],
            [("2025-11-19T10:00:00+00:00", 50.0)],  # in range
        )

        resp = await client.post(
            "/api/attributes/out-of-range-by-date",
            json={
                "date": "2025-11-19",
                "attributes": [
                    {"attribute_id": attr1["id"], "max_value": 50.0},
                    {"attribute_id": attr2["id"], "max_value": 100.0},
                ],
            },
            headers=auth_headers,
        )
        assert resp.status_code == 200
        items = resp.json()
        assert len(items) == 1
        assert items[0]["attribute_id"] == attr1["id"]
