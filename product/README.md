# Product Documentation

Эта папка описывает продукт Mentory с двумя разными углами зрения:

1. **As-is реализация** - то, что реально есть в коде, Prisma schema и infra.
2. **Target/report требования** - то, что описано в последнем DOCX-отчете и Figma-макетах.

Важно: если отчет и код расходятся, источником истины для текущей архитектуры считается код. Расхождения фиксируются явно, чтобы их можно было согласовать и постепенно закрывать.

## Source Hierarchy

1. `apps/api/prisma/schema.prisma`, `apps/api`, `apps/web`, `infra` - фактическая реализация.
2. Последний DOCX-отчет `1-Отчет_обновленный.docx` - целевые/учебные требования.
3. Figma source `Figma basics.pdf` и приложенные PNG-макеты - целевое UI/CJM-направление. Raw PDF не коммитится; выводы фиксируются в `figma-alignment-plan.md` и `frontend-gap.md`.
4. `requirements-gap.md` - матрица различий между отчетом и текущей backend/domain реализацией.
5. `frontend-gap.md` - frontend/UI gap-анализ и browser QA evidence.
6. Диаграммы `*.puml` - визуальное описание согласованного as-is состояния, если рядом не указано обратное.

## Key Files

- `requirements-gap.md` - главный документ для планирования доработок по отчету.
  Здесь зафиксированы различия по архитектуре, заявкам, подпискам, payout, video, uploads, admin/trust и NFR.

- `nfr-evidence.md` - проверяемые артефакты по NFR: какие команды прошли, какие target-NFR пока не имеют evidence.

- `frontend-gap.md` - расхождения web UI с отчетом, пройденные браузерные сценарии, найденные/исправленные runtime дефекты и frontend backlog.

- `mini-report-2026-05-25.md` - краткий отчет по текущей стадии продукта, свежему browser QA, степени расхождений с DOCX/Figma и недостающим частям до идеального продукта.

- `framework-map-2026-05-25.md` - раскладка продукта по technical/product/UI/C4/stage frameworks.

- `usm.txt` - User Story Map и Use Cases из последнего DOCX-отчета с пометками текущего статуса реализации.

- `er-user-panel.puml` - as-is ER пользовательского контура.
  Показывает реальные сущности текущего кода: users/profiles/topics, mentor services, mentorship plans/subscriptions, slots, sessions, chat, attachments, payments, payouts, reviews.

- `er-admin-panel.puml` - as-is ER админского и trust-контура.
  Показывает complaints, complaint attachments/messages, mentor regalia, moderation actions, user blocks, admin audit logs, platform withdrawals.

- `с4_and_sequence/c4-L1-context.puml` и `с4_and_sequence/c4-L2-containers.puml` - C4-контекст и контейнеры.
  Описывают текущую реализацию как SvelteKit web + NestJS modular monolith, а не микросервисную схему из формулировок отчета.

- `diagrams/2026-05-25-*.puml` и соответствующие `.png` - свежий набор визуальных артефактов: C4 L1/L2/L3, CJM, gap heatmap и product stage model.

- `с4_and_sequence/sequence-diagrams-final/01-booking-payment_FIXED.puml` - сценарий бронирования и оплаты.
  Диаграмма должна читаться вместе с `requirements-gap.md`, потому что booking/payment state machine сейчас требует выравнивания.

## Current Documentation Decisions

- Архитектура: **modular monolith as-is**. Микросервисы из отчета считаются target/report wording.
- Заявки: отдельной таблицы `applications` нет; текущий аналог заявки - `sessions.status = requested`, дополненный `requestGoal` и `requestMotivation`.
- Booking/payment: `paid` означает "оплачено и ждет решения ментора"; `booked` означает "ментор подтвердил"; отказ ментора переводит платеж в refund-like состояние.
- Подписки: домен реализован (`mentorship_*`, credits) с `pending/active/paused/ended/rejected` approval flow; workspace доступен только после approval.
- Payout: после `completeSession` создается delayed pending payout с `availableAt` через 5 рабочих дней; активные complaints блокируют создание/процессинг выплаты.
- Uploads: trust/chat/regalia data URL payloads сохраняются через local `FileStorageService`; в БД остается `/uploads/*` URL. MinIO/S3 - будущая production-замена.
- Figma UI: профиль ментора на просмотре использует отдельные правые блоки `Планы подписки` и `Разовые сессии и услуги`; старые табы `Сессия/Подписка` не возвращать без нового согласования.
- NFR: 50k users, 99.9%, RTO/RPO, retention, DWH и SLA поддержки пока являются target-only требованиями без нагрузочного/операционного evidence.
