# Gap-анализ: последний DOCX-отчет vs текущая реализация Mentory

Дата ревизии: 2026-05-18

Источник сравнения:

- Последний отчет: `1-Отчет_обновленный.docx`, предоставлен в текущем диалоге.
- Текущая реализация: `apps/api`, `apps/web`, `apps/api/prisma/schema.prisma`, `infra`.

Принятый подход:

- Код, Prisma schema и инфраструктурные файлы считаются источником истины для **as-is**.
- DOCX-отчет считается источником целевых/учебных требований и терминологии.
- Если отчет и код расходятся, в документации фиксируем расхождение, а не маскируем его.

Статусы:

- `Реализовано` - покрыто текущим кодом.
- `Частично` - реализовано, но отличается от отчета или требует доработки.
- `Отсутствует` - рабочей реализации в коде нет.
- `Намеренное отличие` - код осознанно устроен иначе, чем описано в отчете.

## 1) Главные расхождения

| Тема | В отчете | В текущем проекте | Решение |
|---|---|---|---|
| Архитектура | Микросервисная архитектура | TypeScript monorepo + NestJS modular monolith, SvelteKit web, PostgreSQL, Redis | В product/C4/CLAUDE писать "modular monolith as-is"; микросервисы оставить как target/report wording |
| Заявки | Отдельная заявка/application, которую ментор подтверждает/отклоняет | Отдельной таблицы `applications` нет; роль заявки выполняет `sessions.status = requested`, есть `requestGoal`/`requestMotivation` | Оставить session-as-request как as-is; отдельную таблицу добавлять только при новом scope |
| Запись и оплата | Менти создает заявку, оплачивает, ментор подтверждает или отклоняет, при отказе возврат | Hold + payment intent + mock webhook + mentor confirm/reject выровнены: `paid` = ждет ментора, `booked` = подтверждено | Остается заменить mock-acquirer/refund на реального провайдера |
| Подписки | Менти отправляет заявку на подписку, ментор рассматривает | `POST /subscriptions` создает `pending`; ментор/admin переводит в `active` или `rejected`; есть goal/motivation | Payment behavior подписок остается отдельным gap |
| Payout | Выплата через 5 рабочих дней после проведенной сессии, если нет жалоб | `completeSession` создает delayed pending payout с `availableAt`; active complaints блокируют создание/процессинг; idempotency по `sessionId` | Реальный payout provider/job scheduler остается gap |
| Видео | Ссылка на внешний ВКС в чате | Есть `video_rooms` и `GET /sessions/:id/video` с provider `daily` placeholder | Решить: platform-generated room или external link |
| Файлы | PDF/PNG/JPG до 128MB; документы не должны храниться как платежные данные | Trust/chat/regalia data URLs сохраняются в local uploads через `FileStorageService`; в БД хранится `/uploads/*` URL | MinIO/S3 production storage остается optional upgrade |
| Админка | Часто описана как работа через стороннюю БД/платформу | Есть first-party `/admin/trust`, AdminJS, Prisma tables, audit/block/moderation | Оставить first-party admin как as-is, отчетную формулировку считать упрощением |
| NFR | 50k concurrent users, 99.9%, RTO/RPO, DWH, retention 6 месяцев | Нет load tests, DWH export, retention jobs, SLO/SLA controls | Фиксировать как непокрытые NFR/операционный backlog |

## 2) Functional Requirements

| FR | Статус | Комментарий |
|---|---|---|
| FR1 - регистрация по email, пароль, роль | Реализовано | Self-signup для `mentor`/`mentee`; пароль >=8 и спецсимвол; email verification gate; username добавлен сверх отчета |
| FR2 - пользовательское соглашение | Реализовано | В коде требуется явный `termsAccepted=true`; отчет местами говорит об автоматическом согласии, это лучше оставить как более строгую реализацию |
| FR3 - авторизация и восстановление доступа | Реализовано | Логин по email/username, reset password по email, lockout после 5 ошибок на 15 минут |
| FR4 - профиль mentor/mentee | Реализовано | Возраст, образование, работа, цели, хобби, сертификаты, навыки есть в Prisma/DTO; часть полей опциональна |
| FR5 - чат text/photo/emoji/docs | Реализовано | Поддержаны `text`, `emoji`, `image`, `file`; документы `.pptx/.pdf/.txt/.mvd`, лимит 128MB |
| FR6 - видеосвязь | Частично | Есть `video_rooms` и кнопка входа в сессию; отличается от отчетного сценария "ментор добавляет внешнюю ссылку в чат" |
| FR7 - поиск менторов | Реализовано | Каталог и фильтры есть, но точный набор полей может отличаться от отчета |
| FR8 - запись в свободный слот | Реализовано | Hold + session-as-request + цель/мотивация + mentor confirm/reject; отдельной таблицы `applications` нет |
| FR9 - оплата сессии/подписки | Частично | Разовая сессия покрыта mock-acquirer flow; подписки не имеют полноценного payment flow |
| FR10 - просмотр профиля ментора | Реализовано | Профиль, услуги, рейтинг и слоты доступны |
| FR11 - отзыв 1..5 после сессии | Реализовано | Отзыв после `completed`, окно +24h, уникальность по session |
| FR12 - слоты и тарифы ментора | Реализовано | Сервисы, правила доступности, исключения и генерация слотов есть |
| FR13 - принять/отклонить заявки | Реализовано | Есть mentor dashboard + `PATCH /sessions/:id/confirm|reject`; `paid` заявки ожидают решения ментора |
| FR14 - ментор видит профиль менти | Реализовано | Есть страница `mentees/[id]` и серверная проверка доступа по shared sessions |
| FR15 - вывод средств ментором | Частично | Payout methods/request payout есть; auto-payout delayed + complaint gate добавлены; провайдер моковый |
| FR16 - заметки ментора | Реализовано | `session_notes` с private/shared полями; место сценария отличается от отчета |
| FR17 - жалобы | Реализовано | `/trust` поддерживает жалобы, дату, описание, вложения `.png/.jpg/.jpeg/.pdf` до 128MB |
| FR18 - обработка жалоб админом | Реализовано | `/admin/trust` поддерживает просмотр, переписку, смену статусов, назначение и audit |
| FR19 - верификация регалий | Частично | PDF до 128MB, approve/reject, комментарий и download есть; deep-link в чат по конкретной regalia-заявке требует доработки |
| FR20 - модерация контента | Частично | Есть `moderation_actions` и audit; полноценный UI для профилей/отзывов/сообщений как "контент-модерация" не завершен |
| FR21 - блокировка пользователей | Частично | `users.is_blocked`, `user_blocks`, запрет login для blocked users есть; workflow разблокировки/операторский UX неполный |
| FR22 - обработка платежей админом | Частично | Admin payments cancel/refund-like действия и platform withdrawals частично есть; реального провайдера нет |

## 3) Non-Functional Requirements

| NFR | Статус | Комментарий |
|---|---|---|
| NFR1 - все поля обязательные | Намеренное отличие | В текущем MVP часть полей опциональна, что лучше соответствует UX профиля |
| NFR2 - возраст/цена/пол/стаж не пустые | Частично | Возраст и цена валидируются; `пол` и `стаж` не являются обязательными доменными полями |
| NFR3 - 1s/3s/8s при 1k/10k/50k запросов | Отсутствует | Нет нагрузочных тестов и perf budget |
| NFR4 - лаг данных <= 1 минута | Отсутствует | Нет отдельного механизма контроля data freshness |
| NFR5 - витрина `bdm.histrical_data` | Отсутствует | DWH/export pipeline не реализован |
| NFR6 - хранение в БД 6 месяцев | Отсутствует | Нет retention jobs/policies |
| NFR7 - формат ссылки `PLATFORM/####_(№)` | Отсутствует | URL scheme не enforced |
| NFR8 - PDF до 128MB | Реализовано | Проверяется для regalia/trust/chat files |
| NFR9 - JSON | Реализовано | REST API JSON-oriented |
| NFR10 - PDF | Реализовано | Regalia только PDF; жалобы поддерживают PDF |
| NFR11 - PNG/JPG | Реализовано | Жалобы поддерживают PNG/JPG/JPEG |
| NFR12 - лицензированные интеграции | Частично | Используются open-source libs и mock/daily placeholder; юридический реестр лицензий не ведется |
| NFR13 - до 1000 заявок на ментора и 1M менторов | Отсутствует | Индексы есть частично, capacity не доказана |
| NFR14 - 99.9%, RTO <=30m, RPO <=5m | Отсутствует | Нет backup/restore/SLO playbook в репозитории |
| NFR15 - до 50000 пользователей в моменте | Отсутствует | Нет stress/load evidence |
| NFR16 - push + email | Частично | Email/in-app есть; queue stats честно отражают `direct-smtp`; push delivery и production queue не реализованы |
| NFR17 - до 10 админов без деградации | Отсутствует | Нет отдельного теста или лимита |
| NFR18 - ответ <=24ч | Отсутствует | SLA поддержки не реализован процессно |

## 4) User Stories

| US | Статус | Комментарий |
|---|---|---|
| US1 - регистрация и вход | Реализовано | Реализация строже отчета: обязательное подтверждение email и явное terms acceptance |
| US2 - структурированный профиль | Реализовано | Профили есть; админская валидация всего профиля как обязательный pre-publish gate неполная |
| US3 - чат | Реализовано | REST + Socket.IO, история, read/typing |
| US4 - видеосессии | Частично | Platform-generated video room placeholder вместо простого external-link-only flow |
| US5 - поиск ментора | Реализовано | Каталог и фильтры есть |
| US6 - профиль ментора | Реализовано | Профиль, услуги, рейтинг, слоты |
| US7 - запись к ментору | Реализовано | Слот и заявка через `Session requested`; request goal/motivation сохраняются на session |
| US8 - оплата сессий и подписок | Частично | Разовая оплата есть; оплата подписок не доведена до полного flow |
| US9 - отзыв | Реализовано | После completed + 24h |
| US10 - тарифы | Реализовано | Разовые услуги и mentorship plans |
| US11 - подтверждение/отклонение запросов | Реализовано | Mentor dashboard использует `PATCH /sessions/:id/confirm|reject`, отказ отменяет/возвращает платеж в mock-flow |
| US12 - календарь | Реализовано | Rules/exceptions/slots |
| US13 - автоматическое начисление | Частично | Delayed pending payout через 5 рабочих дней + complaint gate + idempotency; реальный payout provider/job scheduler не реализован |
| US14 - жалобы | Реализовано | Trust flow работает |
| US15 - модерация контента | Частично | Audit/actions есть; UI и policy workflow неполные |
| US16 - верификация регалий | Частично | Основной upload/review есть; deep-link/chat/status UX можно улучшить |

## 5) Implementation backlog

Приоритетные задачи, если приводим продукт ближе к DOCX-отчету:

1. Subscription payments:
   - определить payment behavior для подписок;
   - связать approval, billing period и списания.
2. Real payout provider/job:
   - заменить mock/manual processing на провайдера или scheduled worker;
   - добавить audit/error handling для failed payouts.
3. Production storage:
   - решить, оставляем local uploads или подключаем MinIO/S3 в prod;
   - добавить миграционный путь для уже сохраненных локальных файлов.
4. Notifications:
   - решить, push входит в MVP или явно post-MVP;
   - заменить `direct-smtp` delivery на рабочую очередь, если нужен production-like контур.
5. NFR evidence:
   - добавить load-test скрипты или явно пометить NFR как target-only;
   - описать retention, backup/RPO/RTO и SLA поддержки, если это требуется для сдачи.
