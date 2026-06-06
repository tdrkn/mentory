# Карта фреймворков Mentory

Дата: 2026-05-25

Этот документ раскладывает Mentory не по файлам, а по фреймворкам мышления: как система работает, как выглядит, чем текущий продукт отличается от DOCX/Figma и где он находится по зрелости.

## 1. Технический фреймворк

| Слой | As-is | Роль в продукте | Комментарий зрелости |
|---|---|---|---|
| Frontend | SvelteKit 2, Svelte 5, Tailwind, Skeleton UI | Все пользовательские и админские интерфейсы | Работает как SSR/web app; нужен единый дизайн-системный pass и больше demo-data |
| Backend | NestJS 10 modular monolith, Prisma | Домены auth/profile/discovery/booking/sessions/payments/chat/trust/subscriptions | Хорошая MVP-архитектура; не микросервисы, хотя DOCX использует такую формулировку |
| Shared | pnpm workspace `packages/shared` | Общие типы и DTO | Помогает держать FE/BE контракт |
| Data | PostgreSQL 16 | Основная транзакционная модель | Подходит для MVP; нужны perf evidence, backup/retention планы |
| Runtime infra | Redis, Docker Compose, Caddy target | Locks, dev/prod запуск, reverse proxy | Redis нужен для hold/lock; Caddy описан для prod |
| Files | Local `FileStorageService`, `/uploads/*`; MinIO provisioned | Regalia, complaints, chat files | Production storage adapter еще не доведен |
| External providers | Mock acquiring, SMTP/MailHog, video placeholder | Payments, email, video | Для идеального продукта нужны production providers |

## 2. Product-domain framework

| Домен | Что уже есть | Что мешает идеальному продукту |
|---|---|---|
| Auth | Email/username login, verification, password reset, lockout | 2FA для admin есть только как UI-поле, backend не подключен |
| Profiles | Mentor/mentee profiles, avatar, skills, hobbies, regalia | Demo profiles пустые; нет хорошего наполнения под презентацию |
| Discovery | Каталог, фильтры, profile detail | Фильтры работают, но не все Figma/NFR поля являются first-class domain fields |
| Booking | Hold, request goal/motivation, payment, mentor approve/reject | Нет полноценного request detail UX с комментарием reject |
| Sessions | Session detail, notes, chat/video, review | Figma требует внешний video link; текущий room placeholder отличается |
| Subscriptions | Plans, pending/active/rejected, workspace | Нет полноценного checkout/pay-after-approval flow |
| Scheduling | Rules, slots, weekly calendar | Базово хорошо; нужен UX-polish для больших календарей и timezone edge cases |
| Payments/Payouts | Mock acquiring, delayed payout after completion | Нет real acquiring/refunds/payout provider и операторского payout UI |
| Chat | REST + Socket.IO, messages/attachments | Базовый flow есть; notification/presence UX можно улучшать |
| Trust/Admin | Complaints, regalia review, blocks, audit, custom admin pages | Admin moderation UI еще технический: UUID forms вместо очередей объектов |
| Notifications | Email/in-app foundation | Нет push, settings center, SLA support workflow |

## 3. UI framework

| Surface | Текущее состояние | Степень отличия от Figma/PNG |
|---|---|---|
| Landing | Близко к Figma: hero, stat cards, features, steps, stories, CTA, footer | Низкая |
| Mentor catalog | Близко: headline, pills, cards, price from N rub | Низкая-средняя: нужны реальные фото/богатые cards |
| Mentor profile view | Структура совпадает с последним PNG: hero, sections, right blocks | Средняя: пустые данные, placeholder avatar, USD в demo subscription |
| Mentor profile edit | Основные блоки совпадают с PNG, фото и карьерный блок есть | Средняя: dense form, placeholder photo, не все fields prefilled |
| Booking/session request | Работает, но не полностью как Figma request screens | Высокая |
| Subscription request | Есть pending/approval, но payment flow не тот | Высокая |
| Sessions | Есть основные страницы, но Figma требует отдельные states/details/review | Средняя-высокая |
| Finance | Есть earnings/payout foundation | Высокая: Figma KPI/table/payment method UX не закрыт полностью |
| Admin | Custom UI есть и работает | Средняя: dashboard близко, moderation database tab остается technical |

## 4. C4 artifact framework

| Уровень | Файл | Что показывает |
|---|---|---|
| L1 Context | `product/diagrams/2026-05-25-c4-l1-context.puml` | Люди, Mentory и внешние системы |
| L2 Containers | `product/diagrams/2026-05-25-c4-l2-containers.puml` | Web, API, shared, DB, Redis, uploads, proxy |
| L3 Components | `product/diagrams/2026-05-25-c4-l3-api-components.puml` | NestJS modules и их зависимости от DB/Redis/files/providers |
| CJM | `product/diagrams/2026-05-25-cjm-core-loop.puml` | Пользовательский loop от поиска до выплаты и trust |
| Gap heatmap | `product/diagrams/2026-05-25-gap-heatmap.puml` | Green/yellow/red карта недостающих зон |
| Stage model | `product/diagrams/2026-05-25-product-stage.puml` | Где продукт находится между MVP, alpha, beta и production |

PNG-версии лежат рядом после render pass.

## 5. Product stage framework

Текущая стадия: **demo-ready alpha / functional MVP+**.

Оценка: **65-70% от идеального продукта**.

Почему не beta:

- core paths есть, но часть flows еще mock/placeholder;
- Figma UI закрыт точечно, но нет единого design-system polish;
- демо-данные пока не продают продукт визуально;
- production providers и NFR evidence не закрыты.

Что нужно для beta:

1. Завершить заявки и подписки как продуктовые flows, а не как набор технических экранов.
2. Привести demo data к Figma: фото, навыки, хобби, achievements, RUB-only.
3. Довести admin moderation до очередей и actionable cards.
4. Закрыть finance UX: KPI, payout table, payout actions.
5. Заменить placeholders на production provider boundaries или явно выключенные post-MVP flags.

Что нужно для production-grade:

1. Реальный acquiring/refund/payout provider.
2. S3/MinIO production storage adapter.
3. Monitoring, audit, backup/restore, RTO/RPO evidence.
4. Load/performance tests под NFR.
5. SLA поддержки, notification center, retention/DWH strategy.
