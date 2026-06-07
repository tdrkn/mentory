# Frontend gap-анализ: DOCX/Figma vs текущий web UI

Дата ревизии: 2026-06-06

Источник сравнения:

- Последний отчет: `1-Отчет_обновленный.docx`.
- Figma: `Figma basics.pdf` (72 экрана) и приложенные PNG-макеты профиля ментора.
- Текущий frontend: `apps/web/src/routes`, `apps/web/src/lib`.

## Проверенные браузерные сценарии

Среда:

- Web: `http://localhost:3000`
- API: `http://localhost:4000`
- База/Redis: Docker Compose dev stack.
- Seed accounts: `danil.rastyapin@example.com`, `ivan.mentee@example.com`, `alex.mentor@example.com`, `admin@mentory.local`.

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
- `product/qa-screenshots/qa-2026-05-25-home-desktop.png`
- `product/qa-screenshots/qa-2026-05-25-home-mobile.png`
- `product/qa-screenshots/qa-2026-05-25-mentors-desktop.png`
- `product/qa-screenshots/qa-2026-05-25-mentors-mobile.png`
- `product/qa-screenshots/qa-2026-05-25-mentor-detail-desktop.png`
- `product/qa-screenshots/qa-2026-05-25-mentor-detail-mobile.png`
- `product/qa-screenshots/qa-2026-05-25-profile-edit-desktop.png`
- `product/qa-screenshots/qa-2026-05-25-calendar-desktop.png`
- `product/qa-screenshots/qa-2026-05-25-admin-dashboard-desktop.png`
- `product/qa-screenshots/qa-2026-05-25-admin-trust-desktop.png`
- `product/qa-screenshots/qa-2026-06-06-requests-mentor.png`
- `product/qa-screenshots/qa-2026-06-06-requests-mentee.png`
- `product/qa-screenshots/qa-2026-06-06-subscription-checkout.png`
- `product/qa-screenshots/qa-2026-06-06-subscriptions-mentor.png`
- `product/qa-screenshots/qa-2026-06-06-mentors-demo-data.png`
- `product/qa-screenshots/qa-2026-06-06-mentor-profile-demo-data.png`
- `product/qa-screenshots/qa-2026-06-06-admin-payout-processing.png`
- `product/qa-screenshots/qa-2026-06-06-mentors-rub.png`
- `product/qa-screenshots/qa-2026-06-06-profile-edit-rub.png`
- `product/qa-screenshots/qa-2026-06-06-subscriptions-rub.png`
- `product/qa-screenshots/qa-2026-06-06-requests-rub.png`
- `product/qa-screenshots/qa-2026-06-06-admin-rub.png`
- `product/qa-screenshots/qa-2026-06-06-sessions-mentor-pending.png`

Пройдено:

| Сценарий                            | Итог                                                                                                                                                                                                     |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Каталог менторов                    | Работает: список, быстрые фильтры, карточки, переход в профиль                                                                                                                                           |
| Профиль ментора и запись            | Работает: выбор услуги/слота, цель и мотивация заявки                                                                                                                                                    |
| Checkout и demo acquiring           | Работает: hold, payment intent, mock card form, возврат на `/sessions`                                                                                                                                   |
| Mentor request review               | Работает: ментор видит оплаченную заявку, цель/мотивацию, подтверждает                                                                                                                                   |
| Session details                     | Работает: `booked` сессия показывает вход в видео, чат, mentor notes; статус локализован                                                                                                                 |
| Subscription plan                   | Работает: ментор создает программу                                                                                                                                                                       |
| Subscription request                | Работает: менти находит план по ID ментора, отправляет заявку с целью/мотивацией                                                                                                                         |
| Subscription approval               | Работает: ментор подтверждает заявку, workspace открывается                                                                                                                                              |
| Trust complaint                     | Работает: пользователь создает жалобу, она появляется в списке                                                                                                                                           |
| Admin trust                         | Работает после фикса API prefix: админ видит жалобы и платформенный баланс                                                                                                                               |
| Mobile smoke                        | Работает после responsive-фикса admin/trust и trust grids; критичных JS-ошибок нет                                                                                                                       |
| Mentor profile edit                 | Работает: есть `Основная информация`, `Фото профиля`, `Карьера`, `Навыки`, `Хобби`, `Достижения`; старого блока `Сертификаты` нет                                                                        |
| Mentor public profile               | Работает: левая колонка с профилем/карьерой/навыками/хобби/достижениями/отзывами, правая колонка с отдельными блоками `Планы подписки` и `Разовые сессии и услуги`                                       |
| Mentor calendar                     | Работает: `/schedule/calendar` показывает weekly grid, свободные слоты и не дает горизонтального overflow на desktop/mobile                                                                              |
| Admin login/dashboard/trust         | Работает: `/admin/login` обновляет auth store, `/admin` не уходит обратно на login, hash-вкладки `/admin/trust#...` переключаются корректно                                                              |
| 2026-05-25 visual QA                | Работает: landing, catalog, mentor profile, profile edit, calendar, admin dashboard/trust; на проверенных desktop/mobile viewport horizontal overflow = 0                                                |
| 2026-06-06 requests/subscription QA | Работает: mentor/mentee `/requests`, `/subscriptions`, `/sessions?tab=pending`, `/checkout/subscriptions/:id`; protected routes не падают в 401, horizontal overflow = 0                                 |
| 2026-06-06 RUB/ru localization QA   | Работает: `/mentors`, `/profile/edit`, `/subscriptions`, `/requests`, `/admin/trust#database`; видимого `USD`/`$` нет, новые defaults в API/Prisma переведены на `RUB`, даты форматируются через `ru-RU` |

## Найденные и исправленные frontend/runtime дефекты

| Дефект                                                                                                                                  | Статус         | Исправление                                                                                                                          |
| --------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `/admin/trust` UI дергал `/api/admin/trust/*`, но backend регистрировал REST admin routes без `/api`, из-за чего страница получала 404  | Исправлено     | `apps/api/src/main.ts`: глобальный prefix теперь применяется к Nest controllers; AdminJS остается на `/admin` как Express middleware |
| `GET /api/health/ready` был `degraded` в Docker из-за `REDIS_HOST=localhost` из `.env`                                                  | Исправлено     | `apps/api/src/health/health.controller.ts`: readiness использует `REDIS_URL` с приоритетом                                           |
| Детальная страница сессии показывала raw status `booked`                                                                                | Исправлено     | `apps/web/src/routes/sessions/[id]/+page.svelte`: добавлен `statusLabel`                                                             |
| Admin/trust и trust grids были слишком плотными на mobile из-за inline `grid-template-columns`                                          | Исправлено     | Добавлены responsive classes в `admin/trust` и `trust` routes                                                                        |
| `/admin/login` сохранял JWT в `localStorage`, но не обновлял Svelte auth store; после входа админ мог сразу вернуться на login          | Исправлено     | `apps/web/src/routes/admin/login/+page.svelte`: вход идет через общий `authLogin`                                                    |
| `/admin/trust` зависел от состояния auth store в момент mount и ломал прямые hash-входы; после SSR фикса отдельно проверен `200 OK`     | Исправлено     | `apps/web/src/routes/admin/trust/+page.svelte`: загрузка привязана к завершению auth loading, hash sync защищен `browser` guard      |
| На admin/trust в блоке финансов были английские labels `Total fees`, `Total withdrawn`, `Available`                                     | Исправлено     | Labels переведены на `Всего комиссий`, `Выведено`, `Доступно к выводу`                                                               |
| В SvelteKit live announcer попадал `untitled page`; это было видно в browser QA как технический артефакт                                | Исправлено     | Добавлен default `<title>` в layout, page titles для ключевых экранов и visually-hidden стиль для `#svelte-announcer`                |
| Ссылки на `/uploads/*` в trust/admin открывались с web-host `:3000`, хотя файлы раздает API `:4000`                                     | Исправлено     | Добавлен `resolveFileUrl()` в trust/admin маршруты                                                                                   |
| Публичный профиль ментора показывал старый таб-переключатель `Сессия/Подписка`, хотя последний макет требует два отдельных блока справа | Исправлено     | `apps/web/src/routes/mentors/[id]/+page.svelte`: правый sidebar пересобран в `Планы подписки` + `Разовые сессии и услуги`            |
| На mobile `/admin/trust#database` вкладки давали небольшой body overflow                                                                | Исправлено     | Tabs теперь wrap'ятся и уменьшают padding на narrow viewport                                                                         |
| Подписки не имели checkout после одобрения ментором                                                                                     | Исправлено MVP | Добавлен `approved_pending_payment`, `/checkout/subscriptions/[subscriptionId]`, mock acquiring и активация подписки после webhook   |
| Reject/approve заявки не давали нормальный комментарий для менти                                                                        | Исправлено MVP | Добавлен `decisionComment`, `rejected`, поле комментария в `/requests` и на детальной странице сессии                                |
| Демо-профили выглядели пустыми: placeholder avatar, мало навыков/хобби/достижений, валютный шум                                         | Исправлено MVP | Seed теперь создает avatar URL, career fields, skills, hobbies, verified profiles, RUB plans и approved regalia                      |
| Admin payout processing был backend-only                                                                                                | Исправлено MVP | `AdminPaymentsController` подключен в `PaymentsModule`; `/admin/trust#database` получил кнопку `Обработать готовые выплаты`          |

## Frontend-расхождения с отчетом

| Область                          | В отчете                                                                         | В текущем UI                                                                                                                                                                               | Статус                                              |
| -------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------- |
| Оплата подписки                  | Сценарий покупки подписки входит в оплату услуг                                  | Есть approve-first flow: `pending -> approved_pending_payment -> mock checkout -> active`                                                                                                  | Закрыто MVP; real acquiring остается production gap |
| Отмена/перенос оплаченной сессии | UC10 описывает отмену или перенос оплаченной сессии                              | На `/sessions/:id` участники могут отменить `requested/paid/booked` встречу с причиной; слот освобождается, платеж помечается к возврату/failed. Перенос в отдельный слот пока отсутствует | Частично                                            |
| Причина отказа ментора           | Ментор подтверждает или отклоняет заявку, ожидается понятная причина/комментарий | В `/requests` и `/sessions/:id` есть поле комментария, причина сохраняется как `decisionComment`/`cancelReason`                                                                            | Закрыто MVP                                         |
| Видеосвязь                       | Отчет ближе к external VKS/link-in-chat сценарию                                 | Ментор прикрепляет внешнюю ссылку на `/sessions/:id`; менти видит readonly CTA. Legacy `/sessions/:id/video` остается shim под старый placeholder                                          | Закрыто MVP                                         |
| Админская модерация контента     | Модерация профилей/контента как операторский workflow                            | UI имеет техническую форму `targetType/targetId/action`, без контент-очереди по профилям/отзывам/сообщениям                                                                                | Частично                                            |
| Уведомления                      | Push на телефон + email                                                          | Header не имеет полноценного notification center/settings UI; push delivery не реализован                                                                                                  | Gap                                                 |
| Верификация регалий              | Админ проверяет документы, ментор получает статус и причину                      | Upload/review/status есть; deep-link коммуникация по конкретной regalia-заявке ограничена                                                                                                  | Частично                                            |
| Подбор по критериям              | Стаж, компания, специализация, цели и др.                                        | Каталог фильтрует topic/price/rating/education/workplace/hobby/skill; нет обязательных gender/stage fields из части NFR                                                                    | Частично                                            |
| Payout admin processing          | Отчет описывает контроль выплат и жалоб                                          | В admin database/finances есть кнопка обработки ready payouts; endpoint возвращает checked/completed/blocked                                                                               | Закрыто MVP                                         |
| Данные профилей в seed/runtime   | Макеты показывают фото, навыки, хобби и достижения у демонстрационного ментора   | Seed-профили заполнены фото, career fields, skills, hobbies, RUB plans и approved regalia                                                                                                  | Закрыто MVP                                         |

## Рекомендуемый frontend backlog

1. Добавить reschedule UI для оплаченной сессии:
   - правила 24h;
   - выбор нового слота и подтверждение второй стороной;
   - уведомления о переносе.
2. Расширить admin moderation UI:
   - очереди профилей, отзывов, сообщений;
   - действия без ручного ввода UUID там, где объект уже известен.
3. Добавить notification center/settings:
   - in-app list;
   - email/push toggles;
   - честно пометить push как disabled, пока нет delivery.
