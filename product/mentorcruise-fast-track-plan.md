# Fast-track план: parity с MentorCruise

Дата: 2026-03-07

## Цель

Быстро довести Mentory до рабочего набора сценариев MentorCruise:
- подписка менти на план ментора,
- рабочее пространство менторства (tasks/bookmarks),
- credit balance для менти,
- переключение статуса подписки (active/paused/ended).

## Что уже добавлено в код (MVP foundation)

### 1) Домен в БД

В `apps/api/prisma/schema.prisma` добавлены:
- enums: `MentorshipPlanKind`, `MentorshipSubscriptionStatus`, `MentorshipTaskStatus`, `CreditTransactionType`, `CreditTransactionStatus`;
- модели: `MentorshipPlan`, `MentorshipSubscription`, `MentorshipTask`, `MentorshipBookmark`, `MenteeCreditBalance`, `MenteeCreditTransaction`;
- связи в `User` для планов, подписок, задач/закладок и credit-данных.

### 2) API модуль `subscriptions`

Добавлен новый модуль:
- `apps/api/src/modules/subscriptions/subscriptions.module.ts`
- `apps/api/src/modules/subscriptions/subscriptions.controller.ts`
- `apps/api/src/modules/subscriptions/subscriptions.service.ts`
- DTO в `apps/api/src/modules/subscriptions/dto/*`

Подключение:
- `apps/api/src/app.module.ts`
- `apps/api/src/modules/index.ts`

### 3) Эндпоинты (JWT protected)

Планы:
- `POST /api/subscriptions/plans`
- `GET /api/subscriptions/plans/me`
- `GET /api/subscriptions/plans/mentor/:mentorId`
- `PATCH /api/subscriptions/plans/:planId`

Подписки:
- `POST /api/subscriptions`
- `GET /api/subscriptions/mine`
- `PATCH /api/subscriptions/:subscriptionId/status`
- `GET /api/subscriptions/:subscriptionId/workspace`

Workspace:
- `GET /api/subscriptions/:subscriptionId/tasks`
- `POST /api/subscriptions/:subscriptionId/tasks`
- `PATCH /api/subscriptions/:subscriptionId/tasks/:taskId`
- `GET /api/subscriptions/:subscriptionId/bookmarks`
- `POST /api/subscriptions/:subscriptionId/bookmarks`
- `PATCH /api/subscriptions/:subscriptionId/bookmarks/:bookmarkId`
- `DELETE /api/subscriptions/:subscriptionId/bookmarks/:bookmarkId`

Credits:
- `GET /api/subscriptions/credits/me`
- `POST /api/subscriptions/credits/topup`
- `POST /api/subscriptions/credits/redeem`

## Фаза 2 (следующая, 2-4 дня)

1. Веб-UI под новые API:
- страница “My Subscriptions” (mentee + mentor),
- карточка подписки с status, billing window, plan details,
- вкладки Tasks/Bookmarks в чате или отдельном workspace-экране,
- форма top-up/redeem баланса.

2. Billing orchestration:
- cron job по `nextBillingAt`,
- списание credit balance перед fallback на эквайринг,
- idempotency-key для повторных попыток биллинга.

3. Политики доступа:
- более строгий RBAC на уровне контроллеров (mentor-only для plans),
- audit trail по изменению статусов подписки.

## Фаза 3 (следующая, 4-7 дней)

1. Интеграция планирования звонков в подписке:
- связь подписки с расписанием и лимитом calls/month,
- consume counter при бронировании.

2. Улучшение Chat workspace parity:
- voice messages,
- системные events в треде (plan changed, status paused, etc).

3. Платежная надежность:
- webhook-driven transitions,
- retry policy,
- reconciliation job.

## Что намеренно отложено (ради скорости)

- сложные промо/coupon-правила и комбинаторные скидки;
- частичная пауза по календарным окнам;
- многоуровневые планы и seat-based billing;
- полная аналитика MRR/churn/LTV.

## Как раскатить локально

1. Сгенерировать Prisma client:

```bash
pnpm --filter @mentory/api prisma:generate
```

2. Применить схему в dev базе:

```bash
pnpm --filter @mentory/api prisma:push
```

3. Запустить API:

```bash
pnpm --filter @mentory/api dev
```
