# Product Documentation

Эта папка описывает Mentory с двух углов:

1. **As-is реализация** - то, что реально есть в коде, Prisma schema и infra.
2. **Target/report требования** - то, что описано в DOCX-отчете, Figma PDF и приложенных PNG-макетах.

Если отчет и код расходятся, источником истины для текущей архитектуры считается код. Расхождения фиксируются явно, чтобы их можно было закрывать отдельными difference-коммитами.

## Навигация

```text
product/
  README.md
  reports/          краткие отчеты, framework map, оценка стадии
  gaps/             gap-анализ DOCX/Figma vs текущий продукт
  architecture/     ER, NFR evidence, data model, architecture notes
  backlog/          USM, use cases, fast-track планы
  diagrams/         актуальные C4/CJM/gap/stage схемы + legacy C4/sequence
  qa-screenshots/   browser QA evidence
```

## Source Hierarchy

1. `apps/api/prisma/schema.prisma`, `apps/api`, `apps/web`, `infra` - фактическая реализация.
2. Последний DOCX-отчет `1-Отчет_обновленный.docx` - целевые/учебные требования.
3. Figma source `Figma basics.pdf` и приложенные PNG-макеты - целевое UI/CJM-направление. Raw PDF не коммитится; выводы фиксируются в `gaps/figma-alignment-plan.md` и `gaps/frontend-gap.md`.
4. `gaps/requirements-gap.md` - матрица различий между отчетом и текущей backend/domain реализацией.
5. `gaps/frontend-gap.md` - frontend/UI gap-анализ и browser QA evidence.
6. Диаграммы `*.puml` - визуальное описание согласованного as-is состояния, если рядом не указано обратное.

## Ключевые файлы

- `handbook/mentory-leadership-intro.md` и `handbook/mentory-leadership-intro.pdf` - большой вводный документ для нового лидера проекта.
- `reports/mini-report-2026-06-07.md` - свежий мини-отчет после pass по demo-data, фото, сессиям, чату, терминам, темной теме и подпискам.
- `reports/framework-map-2026-06-07.md` - свежая раскладка продукта по technical/product/UI/C4/stage frameworks.
- `gaps/figma-product-gap-2026-06-07.md` - свежая степень различий с Figma/product и порядок закрытия gaps.
- `reports/mini-report-2026-05-25.md` - краткий отчет по стадии продукта, browser QA, степени расхождений с DOCX/Figma и недостающим частям до идеального продукта.
- `reports/framework-map-2026-05-25.md` - раскладка продукта по technical/product/UI/C4/stage frameworks.
- `gaps/requirements-gap.md` - главный документ для планирования доработок по отчету: архитектура, заявки, подписки, payout, video, uploads, admin/trust и NFR.
- `gaps/frontend-gap.md` - расхождения web UI с отчетом, пройденные браузерные сценарии, исправленные runtime дефекты и frontend backlog.
- `gaps/figma-alignment-plan.md` - план выравнивания интерфейса с Figma/PNG.
- `architecture/nfr-evidence.md` - проверяемые артефакты по NFR: какие команды прошли, какие target-NFR пока не имеют evidence.
- `architecture/er-user-panel.puml` - as-is ER пользовательского контура.
- `architecture/er-admin-panel.puml` - as-is ER админского и trust-контура.
- `architecture/er-business-ru.md` - бизнесовое объяснение ER-модели.
- `backlog/usm.txt` - User Story Map и Use Cases из последнего DOCX-отчета с пометками текущего статуса реализации.
- `backlog/mentorcruise-fast-track-plan.md` - продуктовый fast-track план по MentorCruise-like опыту.
- `diagrams/2026-05-25-*.puml/.png/.svg` - актуальные C4 L1/L2/L3, CJM, gap heatmap и product stage model.
- `diagrams/2026-06-07-*.puml/.png/.svg` - свежие C4/CJM/deploy/stage схемы после последнего product pass.
- `diagrams/legacy/с4_and_sequence/` - ранние C4/sequence диаграммы, сохранены как legacy reference.
- `qa-screenshots/` - скриншоты browser QA, используемые как evidence по UI.

## Current Documentation Decisions

- Архитектура: **modular monolith as-is**. Микросервисы из отчета считаются target/report wording.
- Заявки: отдельной таблицы `applications` нет; текущий аналог заявки - `sessions.status = requested/paid` плюс `requestGoal`, `requestMotivation`, `decisionComment`.
- Booking/payment: `paid` означает "оплачено и ждет решения ментора"; `booked` означает "ментор подтвердил"; `rejected` означает отказ ментора с сохраненной причиной.
- Подписки: заявка проходит `pending -> approved_pending_payment -> active`; workspace доступен только после оплаты одобренной подписки.
- Payout: после `completeSession` создается delayed pending payout с `availableAt` через 5 рабочих дней; активные complaints блокируют создание/процессинг выплаты.
- Uploads: trust/chat/regalia data URL payloads сохраняются через local `FileStorageService`; в БД остается `/uploads/*` URL. MinIO/S3 - будущая production-замена.
- Figma UI: профиль ментора на просмотре использует отдельные правые блоки `Планы подписки` и `Разовые сессии и услуги`; старые табы `Сессия/Подписка` не возвращать без нового согласования.
- NFR: 50k users, 99.9%, RTO/RPO, retention, DWH и SLA поддержки пока являются target-only требованиями без нагрузочного/операционного evidence.

## Current Stage 2026-06-07

- Стадия: **demo-ready alpha / functional MVP+**.
- Готовность: **73-77%** от идеального продукта.
- Закрыто в последнем pass: богатый demo seed, фото в каталоге/header, понятные сессии и чат, простые термины, читаемая темная тема, упрощенные подписки, отмена встречи с причиной.
- Главные gaps до beta: real acquiring/refunds/payouts, reschedule, admin queues без UUID, production storage, monitoring/backups/load tests, финальный Figma polish.
