# Product Documentation

Эта папка описывает продукт Mentory с двумя разными углами зрения:

1. **As-is реализация** - то, что реально есть в коде, Prisma schema и infra.
2. **Target/report требования** - то, что описано в последнем DOCX-отчете.

Важно: если отчет и код расходятся, источником истины для текущей архитектуры считается код. Расхождения фиксируются явно, чтобы их можно было согласовать и постепенно закрывать.

## Source Hierarchy

1. `apps/api/prisma/schema.prisma`, `apps/api`, `apps/web`, `infra` - фактическая реализация.
2. Последний DOCX-отчет `1-Отчет_обновленный.docx` - целевые/учебные требования.
3. `requirements-gap.md` - матрица различий между отчетом и текущей backend/domain реализацией.
4. `frontend-gap.md` - frontend/UI gap-анализ и browser QA evidence.
5. Диаграммы `*.puml` - визуальное описание согласованного as-is состояния, если рядом не указано обратное.

## Key Files

- `requirements-gap.md` - главный документ для планирования доработок по отчету.
  Здесь зафиксированы различия по архитектуре, заявкам, подпискам, payout, video, uploads, admin/trust и NFR.

- `nfr-evidence.md` - проверяемые артефакты по NFR: какие команды прошли, какие target-NFR пока не имеют evidence.

- `frontend-gap.md` - расхождения web UI с отчетом, пройденные браузерные сценарии, найденные/исправленные runtime дефекты и frontend backlog.

- `usm.txt` - User Story Map и Use Cases из последнего DOCX-отчета с пометками текущего статуса реализации.

- `er-user-panel.puml` - as-is ER пользовательского контура.
  Показывает реальные сущности текущего кода: users/profiles/topics, mentor services, mentorship plans/subscriptions, slots, sessions, chat, attachments, payments, payouts, reviews.

- `er-admin-panel.puml` - as-is ER админского и trust-контура.
  Показывает complaints, complaint attachments/messages, mentor regalia, moderation actions, user blocks, admin audit logs, platform withdrawals.

- `с4_and_sequence/c4-L1-context.puml` и `с4_and_sequence/c4-L2-containers.puml` - C4-контекст и контейнеры.
  Описывают текущую реализацию как SvelteKit web + NestJS modular monolith, а не микросервисную схему из формулировок отчета.

- `с4_and_sequence/sequence-diagrams-final/01-booking-payment_FIXED.puml` - сценарий бронирования и оплаты.
  Диаграмма должна читаться вместе с `requirements-gap.md`, потому что booking/payment state machine сейчас требует выравнивания.

## Current Documentation Decisions

- Архитектура: **modular monolith as-is**. Микросервисы из отчета считаются target/report wording.
- Заявки: отдельной таблицы `applications` нет; текущий аналог заявки - `sessions.status = requested`, дополненный `requestGoal` и `requestMotivation`.
- Booking/payment: `paid` означает "оплачено и ждет решения ментора"; `booked` означает "ментор подтвердил"; отказ ментора переводит платеж в refund-like состояние.
- Подписки: домен реализован (`mentorship_*`, credits) с `pending/active/paused/ended/rejected` approval flow; workspace доступен только после approval.
- Payout: после `completeSession` создается delayed pending payout с `availableAt` через 5 рабочих дней; активные complaints блокируют создание/процессинг выплаты.
- Uploads: trust/chat/regalia data URL payloads сохраняются через local `FileStorageService`; в БД остается `/uploads/*` URL. MinIO/S3 - будущая production-замена.
- NFR: 50k users, 99.9%, RTO/RPO, retention, DWH и SLA поддержки пока являются target-only требованиями без нагрузочного/операционного evidence.
