# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Mentory is a mentor-marketplace platform connecting mentees with expert mentors for paid consultations. It's a TypeScript monorepo managed with pnpm workspaces, consisting of:

- `apps/api` — NestJS 10 modular monolith (REST + Socket.IO + AdminJS)
- `apps/web` — SvelteKit 2 with Svelte 5 (adapter-node, SSR)
- `packages/shared` — shared types, DTOs, and constants consumed by both apps

## Commands

### Development

```bash
# Initial setup (install deps + build shared + start Docker)
make setup
# or step by step:
pnpm install && pnpm --filter @mentory/shared build

# Start full dev stack (Docker recommended)
make dev                  # docker compose up --build (foreground)
make dev-d                # detached
make dev-full             # includes MailHog (profile: mail)

# Without Docker (requires local Postgres + Redis)
docker compose -f infra/docker-compose.dev.yml up db redis -d
pnpm dev                  # starts api (:4000) and web (:3000) in parallel
pnpm dev:api              # api only
pnpm dev:web              # web only
```

### Database (Prisma)

```bash
make migrate              # prisma migrate dev (creates migration if schema changed)
make migrate-deploy       # prisma migrate deploy (prod-safe, no schema changes)
make seed                 # seed with test data (see Makefile for test accounts)
make reset-db             # drop + recreate + migrate + seed
make prisma-studio        # open Prisma Studio GUI (db.localhost:5555)
make db-shell             # psql shell inside container
```

Run Prisma commands directly against the API container:
```bash
docker compose -f infra/docker-compose.dev.yml exec api pnpm --filter @mentory/api prisma:migrate
```

### Building & Quality

```bash
pnpm build                # build all packages (shared first, then api, web)
pnpm --filter @mentory/shared build   # must run before api/web builds
pnpm lint                 # ESLint for api + web
pnpm format               # Prettier (write)
pnpm format:check         # Prettier (check only)
```

### Testing

```bash
# API unit tests (Jest)
docker compose -f infra/docker-compose.dev.yml exec api pnpm --filter @mentory/api test
# or from repo root:
cd apps/api && pnpm test

# Run a single test file:
cd apps/api && pnpm test -- auth.service.spec.ts
```

### Services in Dev

| Service | URL |
|---|---|
| Web | http://localhost:3000 |
| API | http://localhost:4000/api |
| Swagger | http://localhost:4000/api/docs |
| Admin | http://localhost:4000/admin |
| MailHog | http://localhost:8025 |
| MinIO Console | http://localhost:9001 |

Test accounts (after seed): `maria.mentor@example.com / password123`, `ivan.mentee@example.com / password123`

## Architecture

### API (NestJS modular monolith)

All modules live in `apps/api/src/modules/`. Each module follows the NestJS pattern: `*.module.ts`, `*.controller.ts`, `*.service.ts`, `dto/`, `index.ts` barrel.

| Module | Responsibility | Key tables |
|---|---|---|
| `auth` | Register, login (email or username), JWT, email verification, password reset, lockout | `users`, `user_agreements` |
| `profiles` | User/mentor/mentee profile CRUD, avatar, topics | `users`, `mentor_profiles`, `mentee_profiles`, `mentor_topics` |
| `discovery` | Mentor catalogue, search/filter, reviews | `topics`, `mentor_services`, `reviews`, `slots` |
| `scheduling` | Availability rules, exceptions, slot generation, services | `availability_rules`, `availability_exceptions`, `slots`, `mentor_services` |
| `booking` | Hold → confirm → cancel flow, concurrency guard | `slots`, `sessions` |
| `sessions` | Session list/detail, video room, notes, reviews | `sessions`, `video_rooms`, `session_notes`, `reviews` |
| `payments` | Stripe payment intent, webhook, payouts, admin overrides | `payments`, `payouts` |
| `chat` | Conversations, messages, attachments + Socket.IO gateway | `conversations`, `messages`, `attachments` |
| `notifications` | In-app notifications + email (Nodemailer/MailHog → SMTP) | `notifications` |
| `trust` | Complaints, mentor regalia moderation, user blocks, audit log | `complaints*`, `mentor_regalia`, `moderation_actions`, `admin_audit_logs` |
| `subscriptions` | Mentorship plans, subscriptions, tasks, bookmarks, credits | `mentorship_*`, `mentee_credit_*` |

Global setup in `main.ts`: `ValidationPipe` (whitelist + transform), global prefix `/api` (except `/admin`), CORS `origin: true`, JSON body limit 130 MB (for base64 attachments), Swagger at `/api/docs`, AdminJS at `/admin` (authenticated via `users` table with `role=admin`).

### Auth flow

- Login accepts `login` field = email or username.
- Email must be verified before login succeeds.
- 5 failed attempts → 15-minute lockout.
- Terms acceptance is required at registration (stored in `user_agreements`).
- JWT stored in `localStorage` on the frontend; passed as `Authorization: Bearer <token>`.

### Booking flow

```
mentee holds slot (POST /api/booking/hold)
  → Redis distributed lock on slotId
  → DB transaction: slot free→held, session created (status: requested)
  → 10-minute hold window
mentee pays → POST /api/booking/confirm
  → slot held→booked, session→booked/paid
hold expires → slot auto-released (held→free), session canceled
```

### Chat / WebSocket

Chat gateway at Socket.IO namespace `/chat`. Architecture: DB is the source of truth — all message mutations go through REST (`POST /api/chat/conversations/:id/messages`); the gateway only pushes `new_message`, `message_read`, `typing` events. Auth via JWT in Socket.IO handshake `auth` or `query`. Users join rooms named `conversation:{conversationId}`.

### Scheduling / Timezone

All datetimes stored as UTC in PostgreSQL. Availability rules store `startTime`/`endTime` in `HH:mm` format in the mentor's timezone. Slot generation converts to UTC. Frontend is responsible for converting UTC to the user's local timezone. `date-fns-tz` is used for timezone math.

### Frontend (SvelteKit)

- Auth state managed by `src/lib/stores/auth.ts` (Svelte writable stores).
- API calls via `src/lib/api.ts` — a thin `fetch` wrapper (`api.get/post/patch/delete`) that reads JWT from `localStorage` and prepends `PUBLIC_API_URL/api`.
- `@tanstack/svelte-query` used for server-state caching.
- UI: Skeleton UI (`@skeletonlabs/skeleton`) + Tailwind CSS.
- Routes follow SvelteKit file-based routing under `src/routes/`.
- No `+page.server.ts` load functions except `register/+page.server.ts` — most data fetching is client-side via TanStack Query.

### Shared package

`packages/shared/src` exports TypeScript types (`User`, `Mentor`, `Session`) and DTOs used by both API and web. **Must be built before api or web**: `pnpm --filter @mentory/shared build`.

### Infrastructure

- Dev: Docker Compose with hot-reload volume mounts; MinIO for object storage; MailHog for email capture.
- Prod: Multi-stage Docker builds; Caddy as reverse proxy with auto-HTTPS (ACME for domains, internal TLS for raw IPs). Caddy routes `/api/*`, `/admin*`, `/socket.io*` to `api:4000`, everything else to `web:3000`.
- CI/CD: GitHub Actions (`.github/workflows/deploy-main.yml`) — on push to `main`, runs lint/check/build, then SSH-deploys via `scripts/deploy_prod.sh`.

### Environment variables

Key vars (see `.env.example` for full list):

- `DATABASE_URL` — PostgreSQL connection string
- `REDIS_URL` / `REDIS_HOST` / `REDIS_PORT` — Redis connection
- `JWT_SECRET` — must be ≥32 chars in production
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_COOKIE_SECRET`
- `SMTP_HOST` / `SMTP_PORT` — email (MailHog in dev)
- `MINIO_*` — object storage (dev only)
- `PUBLIC_API_URL` — used by the frontend to construct API URLs
- `DOMAIN` / `TLS_EMAIL` — production Caddy TLS config

### Code conventions

- **Naming**: files kebab-case, Svelte components PascalCase, functions/vars camelCase, constants UPPER_SNAKE_CASE.
- **TypeScript strict mode** enabled everywhere; shared `tsconfig.base.json` extended by each package.
- API DTOs use `class-validator` decorators; `ValidationPipe` with `whitelist: true` strips undeclared properties.
- Each NestJS module exports an `index.ts` barrel re-exporting the module class.
- Prisma schema uses snake_case column names mapped from camelCase model fields via `@map`.
