.PHONY: dev test lint lint-fix format check

dev:
	uv run uvicorn app.main:app --reload

test:
	uv run pytest -v

lint:
	uv run ruff check .

lint-fix:
	uv run ruff check . --fix

format:
	uv run ruff format .

check: lint test
