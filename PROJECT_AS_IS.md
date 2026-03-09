# Mentory: As-Is архитектура и устройство проекта

Дата ревизии: 2026-03-09

## Цель документа

Этот документ фиксирует текущее состояние проекта `mentory` на уровне:

- структуры репозитория;
- фактической runtime-архитектуры;
- модулей backend/frontend;
- доменной модели данных (Prisma/PostgreSQL);
- сквозных пользовательских и админских сценариев;
- ограничений и зон неопределённости перед построением ER-диаграммы и C4.

Важно: здесь описано именно **как реализовано сейчас**, а не целевая архитектура.

## Метод и источники

Приоритет источников:

1. Код в `apps/api`, `apps/web`, `infra`, `apps/api/prisma/schema.prisma`.
2. Конфиги запуска/деплоя (`docker-compose`, `Dockerfile`, `Makefile`, workflow).
3. Документация в `apps/api/docs`, `README.md`, `product/*` (с проверкой на актуальность).

## Монорепо и пакеты

Корень:

- `apps/api` — NestJS 10, модульный монолит, REST + Socket.IO + AdminJS.
- `apps/web` — SvelteKit 2 (adapter-node), клиентское SPA/SSR-приложение.
- `packages/shared` — общие типы/DTO/константы.
- `infra` — compose, Dockerfile, Caddy, init SQL.
- `product` — продуктовые артефакты (USM, gap-анализ, ER-черновики).

Технологии по коду:

- Node.js 22, pnpm workspace.
- Backend: NestJS + Prisma + PostgreSQL + Redis.
- Frontend: Svelte 5 + SvelteKit + TanStack Query + socket.io-client.
- Объектное хранилище в dev-контуре: MinIO.
- Почта в dev-контуре: MailHog + Nodemailer.

## Runtime-архитектура

### Dev topology (`infra/docker-compose.dev.yml`)

Компоненты:

- `db` (PostgreSQL 16)
- `redis` (Redis 7)
- `minio` (S3-compatible storage)
- `mailhog` (profile `mail`)
- `api` (NestJS, hot reload)
- `web` (SvelteKit dev server)

Порты:

- Web: `:3000`
- API: `:4000`
- DB: `:5432`
- Redis: `:6379`
- MinIO API/Console: `:9000/:9001`
- MailHog UI: `:8025` (если включён профиль)

### Prod topology (`infra/docker-compose.prod.yml`)

Компоненты:

- `db`, `redis`, `api`, `web`, `caddy`.

Маршрутизация в Caddy:

- `/api/*` -> `api:4000`
- `/admin*` -> `api:4000`
- `/socket.io*` -> `api:4000`
- остальное -> `web:3000`

Особенность:

- TLS настроен через статический сертификат для raw IP (без SNI) в `infra/Caddyfile`.

## Backend (NestJS): устройство и ответственность

Вход и bootstrap:

- `main.ts`: CORS `origin:true`, JSON limit `130mb`, `ValidationPipe` (whitelist/forbid/transform), global prefix `/api` (кроме `/admin`), Swagger `/api/docs`.
- `AppModule`: подключает feature-модули, request logging middleware, `ConfigModule`, `PrismaModule`.
- `AdminBootstrapService`: при старте гарантирует наличие admin-пользователя по env.
- `setupAdmin` в `main.ts`: поднимает AdminJS на `/admin`, auth через таблицу `users` (role=`admin` + bcrypt).

### Карта модулей

| Модуль | Основная зона | Ключевые таблицы |
|---|---|---|
| `auth` | регистрация, логин, verify email, reset password, JWT | `users`, `user_agreements` |
| `profiles` | профиль пользователя/ментора/менти | `users`, `mentor_profiles`, `mentee_profiles`, `mentor_topics` |
| `discovery` | каталог менторов, фильтры, топики, отзывы | `users`, `topics`, `mentor_topics`, `mentor_services`, `reviews`, `slots` |
| `scheduling` | правила доступности, исключения, генерация слотов, услуги | `availability_rules`, `availability_exceptions`, `slots`, `mentor_services` |
| `booking` | hold/confirm/cancel сессии, защита от гонок | `slots`, `sessions`, `payments` |
| `sessions` | список/детали сессий, видеокомната, заметки, отзывы | `sessions`, `video_rooms`, `session_notes`, `reviews` |
| `payments` | payment intent, webhook, payout, admin actions по платежам | `payments`, `payouts`, `sessions` |
| `chat` | conversations/messages/attachments + websocket gateway | `conversations`, `messages`, `attachments` |
| `notifications` | in-app уведомления + email service | `notifications` |
| `trust` | жалобы, regalia, модерация, блокировки, audit, platform withdrawals | `complaints*`, `mentor_regalia`, `moderation_actions`, `user_blocks`, `admin_audit_logs`, `platform_withdrawals` |
| `subscriptions` | mentorship plans/subscriptions/workspace/credits | `mentorship_*`, `mentee_credit_*` |

### Ключевые backend-правила

- Auth:
  - вход по `login` (email или username);
  - обязательная верификация email перед логином;
  - lockout после 5 неудачных попыток на 15 минут;
  - согласие с terms обязательно при регистрации.
- Booking:
  - Redis lock + DB transaction при `hold`;
  - hold-окно: 10 минут;
  - автоосвобождение протухших hold.
- Scheduling:
  - хранение в UTC;
  - генерация слотов с учётом timezone и исключений.
- Reviews:
  - только после `completed`;
  - окно отзыва: не раньше чем через 24 часа;
  - ограничение: один отзыв на пару mentee-mentor.
- Trust:
  - жалобы принимают вложения `.png/.jpg/.jpeg/.pdf` до 128MB;
  - regalia только `.pdf` до 128MB.
- Chat:
  - типы сообщений: `text`, `emoji`, `image`, `file`;
  - документы ограничены `.pptx/.pdf/.txt/.mvd`;
  - websocket используется для пуша событий, DB — источник истины.

## База данных (Prisma/PostgreSQL): текущая доменная модель

`apps/api/prisma/schema.prisma` содержит единый schema с несколькими доменами.

### 1) Identity + Profiles

- `users`
- `mentor_profiles`
- `mentee_profiles`
- `topics`
- `mentor_topics`
- `user_agreements`

### 2) Scheduling + Sessions

- `mentor_services`
- `availability_rules`
- `availability_exceptions`
- `slots`
- `sessions`
- `video_rooms`
- `session_notes`
- `reviews`

### 3) Payments + Payouts

- `payments`
- `payouts`

### 4) Chat + Files

- `conversations`
- `messages`
- `attachments`

### 5) Notifications

- `notifications`

### 6) Trust/Admin

- `complaints`
- `complaint_messages`
- `complaint_attachments`
- `mentor_regalia`
- `moderation_actions`
- `user_blocks`
- `admin_audit_logs`
- `platform_withdrawals`

### 7) Subscriptions + Workspace + Credits

- `mentorship_plans`
- `mentorship_subscriptions`
- `mentorship_tasks`
- `mentorship_bookmarks`
- `mentee_credit_balances`
- `mentee_credit_transactions`

## Frontend (SvelteKit): текущий контур

Ключевые механики:

- auth token хранится в `localStorage` (`accessToken`);
- запросы через `apiClient` (`$lib/api.ts`) на `${API_URL}/api/*`;
- WebSocket chat через `socket.io-client` namespace `/chat`;
- role-based UI через store (`isMentor`, `isAdmin`).

### Роуты и функциональные зоны

Публичные:

- `/` — landing.
- `/mentors`, `/mentors/[id]` — каталог и профиль ментора.
- `/faq`, `/terms`.
- `/login`, `/register`, `/verify-email`, `/forgot-password`, `/reset-password`.

Авторизованные:

- `/sessions`, `/sessions/[id]` — сессии, join video, notes.
- `/checkout/[sessionId]` — checkout/оплата hold-сессии.
- `/chat` — диалоги, сообщения, websocket.
- `/profile/edit` — профиль и (для mentor) услуги/темы.
- `/trust` — жалобы и regalia для mentor.
- `/subscriptions` — планы, подписки, workspace, кредиты.

Mentor-only:

- `/dashboard` — входящие заявки/быстрые действия.
- `/schedule` — правила/слоты.
- `/earnings` — балансы и payout.
- `/mentees/[id]` — профиль менти (если есть shared sessions).

Admin-only:

- `/admin/trust` — жалобы, модерация, блокировки, audit, platform withdraw.

Тестовый эквайринг:

- `/acquiring/mock`.

## Сквозные сценарии (как работает сейчас)

### 1) Регистрация -> подтверждение email -> логин

1. Пользователь регистрируется (`/auth/register`) с `termsAccepted=true`.
2. Backend создаёт `user` + `user_agreement`.
3. Отправляется verification email.
4. До verify логин запрещён.
5. После `/auth/verify-email` вход через `/auth/login`.

### 2) Поиск ментора -> hold -> checkout -> confirm

1. Менти выбирает ментора, сервис, слот.
2. `/booking/hold`:
   - слот `free -> held`;
   - создаётся session `requested`;
   - hold 10 минут.
3. `/payments/intent` создаёт payment (mock acquirer).
4. На успешной оплате webhook переводит payment в `succeeded`, session в `paid`.
5. `/booking/confirm` переводит `held -> booked` и session `-> booked` (или подтверждает после оплаты).

### 3) Сессия -> видео -> заметки -> отзыв

1. Участники открывают `/sessions/:id/video` (создаётся `video_room` при необходимости).
2. Ментор ведёт private/shared notes.
3. Ментор завершает сессию.
4. Менти может оставить отзыв после 24 часов.

### 4) Чат (REST + WS)

1. Conversation создаётся/получается по session.
2. Сообщения пишутся через REST.
3. Gateway пушит `new_message`, `user_typing`, `messages_read`.
4. История хранится в БД.

### 5) Trust flow

1. Пользователь создаёт complaint с категорией/датой/описанием/вложениями.
2. Админ обрабатывает, ведёт переписку, меняет статус.
3. Ментор загружает regalia PDF; админ approve/reject.
4. Все действия фиксируются в audit.

### 6) Subscriptions flow

1. Ментор создаёт mentorship plan.
2. Менти оформляет subscription.
3. В workspace: задачи и закладки.
4. Управление статусом subscription (`active/paused/ended`).
5. Credits: topup/redeem + баланс/транзакции.

## Интеграции и внешние зависимости

Фактически подключено:

- PostgreSQL, Redis, MinIO, MailHog, Caddy.
- Nodemailer SMTP.
- Socket.IO.
- AdminJS.

Частично/мок:

- эквайринг и payout провайдеры — mock-реализация (`acquirer_mock*`).
- notifications queue (BullMQ) — пока stub.
- push notifications — не реализованы.

## CI/CD и деплой

- GitHub Actions: `.github/workflows/deploy-main.yml`.
- На `push main`:
  - install/lint/check/build;
  - SSH deploy;
  - `docker compose build api web`;
  - запуск `db/redis`;
  - `prisma migrate deploy` или `prisma db push`;
  - запуск `api/web/caddy`.

## Наблюдения и расхождения в документации

1. `README.md` ссылается на `product/er.puml` и `product/er-admin.puml`, но в репозитории сейчас файлы `product/er-new1.puml` и `product/er-admin_new1.puml`.
2. `apps/api/docs/*` частично не совпадают с фактическими endpoint-ами и текущими сценариями.
3. В коде уже есть полноценный домен `subscriptions`, но в верхнеуровневом README и части product-описаний он отражён не полностью.
4. Notifications queue описана как BullMQ, но в `notifications.service.ts` очередь пока заглушена.

## Что важно для будущих ER/C4

Для ER:

- использовать Prisma schema как источник истины;
- отдельно выделить домены: Core mentoring, Trust/Admin, Subscriptions/Credits;
- явно фиксировать enum-статусы (session/payment/payout/complaint/subscription/...).

Для C4:

- показать как минимум контейнеры: Web, API, PostgreSQL, Redis, MinIO, SMTP/MailHog, Caddy;
- отдельно отметить внешние провайдеры (video/payment) как integration points с текущим mock-статусом.

Черновик бизнес-ER (RU):

- `product/er-business-ru.md`

## Вопросы перед построением ER/C4

1. В ER/C4 берём только текущую реализацию "as-is" или смешиваем с целевой моделью из `product/usm.txt` и `requirements-gap.md`?
2. Показываем домен `subscriptions` в основном ER (единая диаграмма) или отдельной диаграммой?
3. В C4 payment/video провайдеры отражать как реальные внешние системы или как mock boundary (учитывая текущую реализацию)?
4. MinIO включать как активный контейнер в C4 уровня контейнеров (даже при частично data-url потоке вложений)?
5. Нужен ли отдельный C4-контур для admin/trust (как отдельный пользовательский поток и набор контроллеров)?
