# ContWatch v2

IoT automation platform — self-hosted system for monitoring and controlling IoT devices via web dashboard with real-time data, charts, and visual workflow automation.

## Prerequisites

- Python 3.13+, [uv](https://docs.astral.sh/uv/)
- Node.js 20+, npm
- Docker & Docker Compose

## Getting Started

### 1. Database

```bash
docker compose up -d
```

### 2. Backend

```bash
cp .env.example .env          # adjust secrets for production
cd backend
uv sync
uv run alembic upgrade head
uv run uvicorn app.main:sio_asgi_app --reload
```

API docs: http://localhost:8000/api/docs
Default login: `admin` / `admin`

### 3. Frontend

```bash
cd frontend
npm install
npm run codegen               # generates typed API hooks (backend must be running)
npm run dev
```

App: http://localhost:5173

## Project Structure

```
contwatch-new/
├── backend/          # FastAPI + SQLAlchemy + Socket.IO
│   ├── app/
│   │   ├── api/      # Route handlers
│   │   ├── models/   # SQLAlchemy models
│   │   ├── schemas/  # Pydantic schemas → OpenAPI
│   │   └── services/ # Business logic
│   ├── alembic/      # Database migrations
│   └── tests/
├── frontend/         # Vite + React + TanStack
│   ├── src/
│   │   ├── api/      # Axios instance + orval generated hooks
│   │   ├── components/
│   │   ├── providers/
│   │   └── routes/   # TanStack Router file-based routes
│   └── orval.config.ts
└── docker-compose.yml
```

## Development

```bash
# Backend tests
cd backend && uv run pytest -v

# Frontend lint
cd frontend && npm run lint

# Regenerate API client after backend changes
cd frontend && npm run codegen
```
