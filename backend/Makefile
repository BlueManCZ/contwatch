.PHONY: dev test lint lint-fix format format-check check

dev:
	uv run uvicorn app.main:sio_asgi_app --reload

test:
	uv run pytest -v

lint:
	uv run ruff check .

lint-fix:
	uv run ruff check . --fix

format:
	uv run ruff format .

format-check:
	uv run ruff format --check .

check: format-check lint test
