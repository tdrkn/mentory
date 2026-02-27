#!/usr/bin/env bash
set -euo pipefail

BRANCH="${1:-main}"
COMPOSE_FILE="${COMPOSE_FILE:-infra/docker-compose.prod.yml}"
COMPOSE_ARGS=(--env-file .env -f "${COMPOSE_FILE}")

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is not installed on server"
  exit 1
fi

if ! command -v git >/dev/null 2>&1; then
  echo "git is not installed on server"
  exit 1
fi

echo "Deploy branch: ${BRANCH}"

git fetch origin "${BRANCH}"
git checkout "${BRANCH}"
git pull --ff-only origin "${BRANCH}"

echo "Build production images..."
docker compose "${COMPOSE_ARGS[@]}" build api web

echo "Start infrastructure dependencies..."
docker compose "${COMPOSE_ARGS[@]}" up -d db redis

echo "Apply database schema in one-off API container..."
if [ -d apps/api/prisma/migrations ] && [ "$(ls -A apps/api/prisma/migrations 2>/dev/null)" ]; then
  docker compose "${COMPOSE_ARGS[@]}" run --rm --no-deps -T -w /app/apps/api api \
    npx prisma@6.2.0 migrate deploy
else
  docker compose "${COMPOSE_ARGS[@]}" run --rm --no-deps -T -w /app/apps/api api \
    npx prisma@6.2.0 db push --accept-data-loss
fi

echo "Start/restart application containers..."
docker compose "${COMPOSE_ARGS[@]}" up -d --remove-orphans api web caddy

echo "Cleanup old images..."
docker image prune -af --filter "until=24h"
docker builder prune -af --filter "until=24h"
docker container prune -f

echo "Current containers:"
docker compose "${COMPOSE_ARGS[@]}" ps

echo "Deploy complete."
