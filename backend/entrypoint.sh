#!/bin/sh
set -e

echo "Running database migrations..."
alembic upgrade head

echo "Starting uvicorn..."
exec uvicorn app.main:sio_asgi_app --host 0.0.0.0 --port 8000
