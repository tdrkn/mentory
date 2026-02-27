#!/usr/bin/env sh
set -eu

# 1) Initial build so dist/main.js exists
pnpm run build

# 2) Keep TS compiler in watch mode
pnpm exec nest build --watch &
BUILD_PID=$!

cleanup() {
  kill "$BUILD_PID" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

# 3) Restart API process on dist changes
node --watch dist/main.js
