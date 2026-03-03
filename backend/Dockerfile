FROM python:3.13-slim

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /usr/local/bin/

WORKDIR /app

# Install dependencies first (layer caching)
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

# Copy application code
COPY alembic.ini ./
COPY alembic/ ./alembic/
COPY app/ ./app/
COPY entrypoint.sh ./

RUN chmod +x entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["uv", "run", "--no-sync", "./entrypoint.sh"]
