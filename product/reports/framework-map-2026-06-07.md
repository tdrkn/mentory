# Карта фреймворков Mentory

Дата: 2026-06-07

Документ раскладывает продукт по фреймворкам: система, домен, UI, CJM, C4, стадия зрелости.

## 1. Technical framework

| Слой   | As-is                                                  | Зачем нужен                                                                      | Зрелость                                        |
| ------ | ------------------------------------------------------ | -------------------------------------------------------------------------------- | ----------------------------------------------- |
| Web    | SvelteKit 2, Svelte 5, Tailwind/Skeleton, lucide icons | Пользовательские и админские экраны                                              | Хороший MVP, нужен design-system pass           |
| API    | NestJS modular monolith                                | Домены auth/profile/discovery/booking/sessions/payments/chat/trust/subscriptions | Подходит стадии alpha; микросервисы пока лишние |
| Shared | `packages/shared`                                      | Общие типы и DTO между web/api                                                   | Полезно, надо расширять контрактами             |
| DB     | PostgreSQL + Prisma                                    | Транзакционные данные                                                            | Хорошая база, нужны backup/load evidence        |
| Redis  | Locks/cache/socket boundary                            | Hold слотов, future queues/rate limits                                           | Используется прагматично                        |
| Files  | Local uploads + MinIO в окружении                      | Фото, документы, вложения                                                        | Нужен production storage adapter                |
| Infra  | Docker Compose, Caddy                                  | Dev/prod запуск и reverse proxy                                                  | Работает, нужны runbooks и monitoring           |

## 2. Product domain framework

| Домен         | Что есть                                                                          | Следующий уровень                                 |
| ------------- | --------------------------------------------------------------------------------- | ------------------------------------------------- |
| Auth          | Login, register, reset, lockout                                                   | Admin 2FA backend, sessions management            |
| Profiles      | Mentor/mentee profile, avatar, career, skills, hobbies, docs                      | Better media handling, profile completeness score |
| Discovery     | Каталог, фильтры, карточки, профиль                                               | Saved filters, ranking, richer cards              |
| Booking       | Hold, payment, mentor decision, session lifecycle, participant cancel with reason | Reschedule, refund policy                         |
| Sessions      | Notes, meeting link, chat, complete, review                                       | Dedicated review screen, reminders                |
| Subscriptions | Programs, request, approval, checkout, workspace                                  | Program marketplace UX, billing automation        |
| Chat          | REST + Socket.IO, attachments, Enter behavior                                     | Notifications, read receipts polish               |
| Help/Safety   | Appeals, mentor docs, admin review                                                | SLA queues, object cards without UUID             |
| Payments      | Mock acquiring, delayed payout                                                    | Real acquiring, refunds, provider reconciliation  |
| Admin         | Trust, finance, audit, moderation actions                                         | Queues instead of raw technical forms             |

## 3. UI framework

| Surface        | Status                              | Gap level   |
| -------------- | ----------------------------------- | ----------- |
| Landing        | Stable demo                         | Low         |
| Mentor catalog | 15 rich profiles, photos, RUB       | Low         |
| Mentor detail  | Matches latest profile logic        | Low-medium  |
| Mentor edit    | Main blocks from PNG                | Medium      |
| Sessions       | Better CTA and pending priority     | Medium      |
| Chat           | Enter/Shift+Enter fixed             | Low-medium  |
| Subscriptions  | Simpler workspace, less technical   | Medium      |
| Help/Safety    | Renamed and simplified              | Medium      |
| Admin          | Functional, but technical in places | Medium-high |

## 4. C4 framework

| Level  | Artifact                           | Purpose                                           |
| ------ | ---------------------------------- | ------------------------------------------------- |
| C4 L1  | `2026-06-07-c4-l1-context.puml`    | Who uses Mentory and which external systems exist |
| C4 L2  | `2026-06-07-c4-l2-containers.puml` | Web/API/DB/Redis/files/proxy containers           |
| CJM    | `2026-06-07-cjm-core-loop.puml`    | Main user journey from mentor discovery to result |
| Deploy | `2026-06-07-deploy-flow.puml`      | Local -> GitHub -> server -> compose -> Caddy     |
| Stage  | `2026-06-07-product-stage.puml`    | Current product maturity                          |

## 5. Stage framework

Current stage: **demo-ready alpha / functional MVP+**.

Beta checklist:

- real payment/refund/payout providers;
- reschedule UX and policy;
- moderation/admin queues;
- production file storage;
- monitoring, backup, load tests;
- final Figma polish for high-traffic flows.

Production checklist:

- provider reconciliation and audit;
- SLA support workflow;
- RTO/RPO evidence;
- security hardening;
- data retention/export policy.
