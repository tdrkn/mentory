# Frontend gap-анализ: DOCX-отчет vs текущий web UI

Дата ревизии: 2026-05-19

Источник сравнения:

- Последний отчет: `1-Отчет_обновленный.docx`.
- Текущий frontend: `apps/web/src/routes`, `apps/web/src/lib`.

## Проверенные браузерные сценарии

Среда:

- Web: `http://localhost:3000`
- API: `http://localhost:4000`
- База/Redis: Docker Compose dev stack.
- Seed accounts: `ivan.mentee@example.com`, `alex.mentor@example.com`, `admin@mentory.local`.

Скриншоты QA сохранены в корне репозитория через Playwright MCP:

- `product/qa-screenshots/qa-home.png`
- `product/qa-screenshots/qa-mentors.png`
- `product/qa-screenshots/qa-mentor-detail.png`
- `product/qa-screenshots/qa-checkout.png`
- `product/qa-screenshots/qa-acquiring.png`
- `product/qa-screenshots/qa-sessions-paid.png`
- `product/qa-screenshots/qa-dashboard-pending.png`
- `product/qa-screenshots/qa-dashboard-accepted.png`
- `product/qa-screenshots/qa-session-detail-booked-localized.png`
- `product/qa-screenshots/qa-subscriptions-plan-created.png`
- `product/qa-screenshots/qa-subscriptions-pending-mentee.png`
- `product/qa-screenshots/qa-subscriptions-pending-mentor.png`
- `product/qa-screenshots/qa-subscriptions-active-mentor.png`
- `product/qa-screenshots/qa-trust-complaint-created.png`
- `product/qa-screenshots/qa-admin-trust-fixed2.png`
- `product/qa-screenshots/qa-mobile-mentors.png`
- `product/qa-screenshots/qa-mobile-mentor-detail.png`
- `product/qa-screenshots/qa-mobile-subscriptions.png`
- `product/qa-screenshots/qa-mobile-admin-trust-after-responsive-fix.png`

Пройдено:

| Сценарий | Итог |
|---|---|
| Каталог менторов | Работает: список, быстрые фильтры, карточки, переход в профиль |
| Профиль ментора и запись | Работает: выбор услуги/слота, цель и мотивация заявки |
| Checkout и demo acquiring | Работает: hold, payment intent, mock card form, возврат на `/sessions` |
| Mentor request review | Работает: ментор видит оплаченную заявку, цель/мотивацию, подтверждает |
| Session details | Работает: `booked` сессия показывает вход в видео, чат, mentor notes; статус локализован |
| Subscription plan | Работает: ментор создает программу |
| Subscription request | Работает: менти находит план по ID ментора, отправляет заявку с целью/мотивацией |
| Subscription approval | Работает: ментор подтверждает заявку, workspace открывается |
| Trust complaint | Работает: пользователь создает жалобу, она появляется в списке |
| Admin trust | Работает после фикса API prefix: админ видит жалобы и платформенный баланс |
| Mobile smoke | Работает после responsive-фикса admin/trust и trust grids; критичных JS-ошибок нет |

## Найденные и исправленные frontend/runtime дефекты

| Дефект | Статус | Исправление |
|---|---|---|
| `/admin/trust` UI дергал `/api/admin/trust/*`, но backend регистрировал REST admin routes без `/api`, из-за чего страница получала 404 | Исправлено | `apps/api/src/main.ts`: глобальный prefix теперь применяется к Nest controllers; AdminJS остается на `/admin` как Express middleware |
| `GET /api/health/ready` был `degraded` в Docker из-за `REDIS_HOST=localhost` из `.env` | Исправлено | `apps/api/src/health/health.controller.ts`: readiness использует `REDIS_URL` с приоритетом |
| Детальная страница сессии показывала raw status `booked` | Исправлено | `apps/web/src/routes/sessions/[id]/+page.svelte`: добавлен `statusLabel` |
| Admin/trust и trust grids были слишком плотными на mobile из-за inline `grid-template-columns` | Исправлено | Добавлены responsive classes в `admin/trust` и `trust` routes |

## Frontend-расхождения с отчетом

| Область | В отчете | В текущем UI | Статус |
|---|---|---|---|
| Оплата подписки | Сценарий покупки подписки входит в оплату услуг | UI подписки создает `pending` заявку без checkout/payment screen | Gap |
| Отмена/перенос оплаченной сессии | UC10 описывает отмену или перенос оплаченной сессии | UI показывает детали/чат/video, но нет отдельного reschedule flow | Gap |
| Причина отказа ментора | Ментор подтверждает или отклоняет заявку, ожидается понятная причина/комментарий | Для session reject frontend отправляет hardcoded `Rejected by mentor`; в UI нет поля причины | Gap |
| Видеосвязь | Отчет ближе к external VKS/link-in-chat сценарию | UI использует platform video room через `/sessions/:id/video` | Намеренное отличие |
| Админская модерация контента | Модерация профилей/контента как операторский workflow | UI имеет техническую форму `targetType/targetId/action`, без контент-очереди по профилям/отзывам/сообщениям | Частично |
| Уведомления | Push на телефон + email | Header не имеет полноценного notification center/settings UI; push delivery не реализован | Gap |
| Верификация регалий | Админ проверяет документы, ментор получает статус и причину | Upload/review/status есть; deep-link коммуникация по конкретной regalia-заявке ограничена | Частично |
| Подбор по критериям | Стаж, компания, специализация, цели и др. | Каталог фильтрует topic/price/rating/education/workplace/hobby/skill; нет обязательных gender/stage fields из части NFR | Частично |
| Payout admin processing | Отчет описывает контроль выплат и жалоб | Backend endpoint `process-ready` есть; отдельной UI-кнопки в admin panel нет | Gap |

## Рекомендуемый frontend backlog

1. Добавить subscription checkout:
   - plan -> payment intent -> paid/pending -> mentor approval;
   - явно связать billing period и активацию workspace.
2. Добавить cancel/reschedule UI для оплаченной сессии:
   - правила 24h;
   - причина отмены;
   - возврат/освобождение слота.
3. Добавить поля комментария при reject:
   - session requests;
   - subscription requests.
4. Расширить admin moderation UI:
   - очереди профилей, отзывов, сообщений;
   - действия без ручного ввода UUID там, где объект уже известен.
5. Добавить notification center/settings:
   - in-app list;
   - email/push toggles;
   - честно пометить push как disabled, пока нет delivery.
6. Добавить UI для admin payout processing:
   - список ready payouts;
   - кнопка process-ready;
   - журнал ошибок.
