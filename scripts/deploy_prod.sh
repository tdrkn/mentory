#!/usr/bin/env bash
set -euo pipefail

BRANCH="${1:-main}"
COMPOSE_FILE="${COMPOSE_FILE:-infra/docker-compose.prod.yml}"

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

echo "Build and restart containers..."
docker compose -f "${COMPOSE_FILE}" up -d --build --remove-orphans

echo "Run Prisma migrations..."
docker compose -f "${COMPOSE_FILE}" exec -T api npx prisma migrate deploy

echo "Cleanup old images..."
docker image prune -af --filter "until=24h"
docker builder prune -af --filter "until=24h"
docker container prune -f

echo "Current containers:"
docker compose -f "${COMPOSE_FILE}" ps

echo "Deploy complete."
