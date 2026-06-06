# Мини-отчет Mentory

Дата: 2026-05-25

## TL;DR

Mentory сейчас находится на стадии **functional MVP+ / demo-ready alpha**. Архитектурно продукт уже широкий: есть SvelteKit web, NestJS API, PostgreSQL/Redis, booking, sessions, subscriptions, chat, trust/admin, uploads и payment/payout boundary. Но до “идеального продукта” не хватает цельности UX, production providers, сильных демо-данных и доказательств NFR.

Оценка готовности: **65-70% от идеального продукта**.

## Что уже хорошо

- Core loop для разовой консультации работает: каталог -> профиль -> booking -> payment mock -> mentor approval -> session.
- Публичный профиль ментора и редактор профиля структурно приведены к последним PNG-макетам.
- Landing и каталог стали намного ближе к Figma.
- `/schedule/calendar` уже есть и проходит desktop/mobile smoke.
- Trust/admin контур работает: complaints, regalia, database/admin operations, audit foundation.
- Документация честно фиксирует as-is vs target: код является источником истины, DOCX/Figma - target.

## Степень различий с предыдущими материалами

| Источник | Степень различий | Главное |
|---|---:|---|
| DOCX-отчет | Высокая на архитектуре, средняя на доменах | DOCX говорит “микросервисы”; код - modular monolith. Заявки не отдельная таблица, а session-as-request. NFR в основном target-only. |
| Figma basics PDF | Средняя | Большинство основных экранов уже есть, но часть flows реализована иначе: sessions/reviews/finance/request details/subscription payment. |
| Последние PNG по профилям | Средняя-низкая по структуре, средняя по качеству данных | Блоки совпадают, но demo data пустые: placeholder avatars, нет skills/hobbies/achievements, в плане подписки USD. |
| Browser QA 2026-05-25 | Технически низкая, продуктово средняя | Horizontal overflow не найден; главные проблемы теперь не версточные, а UX/product polish и data realism. |

## Свежий browser QA

Проверено через Playwright на `http://localhost:3000`:

| Экран | Desktop | Mobile | Итог |
|---|---|---|---|
| Landing | `qa-2026-05-25-home-desktop.png` | `qa-2026-05-25-home-mobile.png` | Работает, overflow = 0 |
| Mentor catalog | `qa-2026-05-25-mentors-desktop.png` | `qa-2026-05-25-mentors-mobile.png` | Работает, overflow = 0 |
| Mentor profile | `qa-2026-05-25-mentor-detail-desktop.png` | `qa-2026-05-25-mentor-detail-mobile.png` | Работает, overflow = 0; есть product/data gaps |
| Profile edit | `qa-2026-05-25-profile-edit-desktop.png` | - | Работает, структура совпадает с PNG |
| Calendar | `qa-2026-05-25-calendar-desktop.png` | - | Работает, overflow = 0 |
| Admin dashboard | `qa-2026-05-25-admin-dashboard-desktop.png` | - | Работает |
| Admin trust | `qa-2026-05-25-admin-trust-desktop.png` | - | Работает |

## UI/UX проблемы, которые я бы правил следующими

1. **Демо-профили не выглядят как живой продукт.** Нужны реальные фото, заполненные skills/hobbies/achievements, образование/должность/место работы.
2. **Валюты расходятся.** В профиле ментора подписка показывает `120 USD`, а Figma/RU-продукт ожидает RUB-first интерфейс.
3. **Публичный профиль слишком “пустой” ниже hero.** Структура правильная, но много `Не указано` и empty-state блоков.
4. **Admin database tab технический.** Сейчас это формы `targetType/targetId/action`; идеальный продукт требует очереди профилей/отзывов/сообщений с действиями.
5. **Заявки как отдельный UX не доведены.** Figma требует отдельные детальные экраны заявки на сессию/подписку с комментарием и прозрачными states.
6. **Subscription payment flow неполный.** Есть pending/approval, но нет полноценного “approved -> pay -> active” сценария.
7. **Video flow расходится с Figma.** Код имеет platform room placeholder, Figma просит внешнюю ссылку, прикрепляемую ментором.
8. **Finance UX не финальный.** Нужны KPI, payout table, payment methods, process-ready admin UI.

## Архитектурная оценка

Текущий выбор “SvelteKit + NestJS modular monolith + PostgreSQL + Redis” прагматичен для стадии MVP. Он лучше текущего масштаба проекта, чем ранние микросервисы из DOCX. Микросервисы сейчас дали бы больше операционной сложности, чем пользы.

Риски архитектуры:

- payment/payout provider пока mock/manual boundary;
- uploads local adapter не production-grade;
- Redis используется как lock/cache boundary, но нет load evidence;
- NFR 50k/99.9/RTO/RPO не доказаны;
- нет production-grade observability/playbooks.

## Чего не хватает до идеального продукта

### Product/UX

- End-to-end request center для ментора и менти.
- Комментарии при approve/reject.
- Subscription checkout после approval.
- Cancel/reschedule policy UI.
- Notification center/settings.
- Красивые demo profiles и seed-data.
- Единый design-system pass на плотность, карточки, состояния, loading/error/empty.

### Business operations

- Real acquiring/refund integration.
- Real payout provider + scheduled job.
- Admin payout processing UI.
- Support SLA workflow и очередь обращений.
- Модерация контента без ручного UUID ввода.

### Engineering/Production

- S3/MinIO production file storage adapter.
- Monitoring/alerts/logging dashboard.
- Backup/restore runbook, RTO/RPO evidence.
- Load tests and performance budget.
- Retention/DWH/export policy.
- Security hardening: admin 2FA backend, audit completeness, rate limits.

## Рекомендованная стадийность

1. **Alpha polish sprint:** demo data, profile UI, request detail screens, admin queues.
2. **Beta flow sprint:** subscription payment, cancel/reschedule, reject comments, video link decision.
3. **Production readiness sprint:** real providers, storage, monitoring, backup, NFR tests.

## Артефакты

- `reports/framework-map-2026-05-25.md` - раскладка по technical/product/UI/C4/stage frameworks.
- `diagrams/2026-05-25-c4-l1-context.puml`
- `diagrams/2026-05-25-c4-l2-containers.puml`
- `diagrams/2026-05-25-c4-l3-api-components.puml`
- `diagrams/2026-05-25-cjm-core-loop.puml`
- `diagrams/2026-05-25-gap-heatmap.puml`
- `diagrams/2026-05-25-product-stage.puml`
- PNG-рендеры этих схем рядом с `.puml`.
- Свежие QA-скриншоты в `product/qa-screenshots/qa-2026-05-25-*.png`.
