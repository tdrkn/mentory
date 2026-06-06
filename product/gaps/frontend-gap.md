# Frontend gap-анализ: DOCX/Figma vs текущий web UI

Дата ревизии: 2026-05-25

Источник сравнения:

- Последний отчет: `1-Отчет_обновленный.docx`.
- Figma: `Figma basics.pdf` (72 экрана) и приложенные PNG-макеты профиля ментора.
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
| Mentor profile edit | Работает: есть `Основная информация`, `Фото профиля`, `Карьера`, `Навыки`, `Хобби`, `Достижения`; старого блока `Сертификаты` нет |
| Mentor public profile | Работает: левая колонка с профилем/карьерой/навыками/хобби/достижениями/отзывами, правая колонка с отдельными блоками `Планы подписки` и `Разовые сессии и услуги` |
| Mentor calendar | Работает: `/schedule/calendar` показывает weekly grid, свободные слоты и не дает горизонтального overflow на desktop/mobile |
| Admin login/dashboard/trust | Работает: `/admin/login` обновляет auth store, `/admin` не уходит обратно на login, hash-вкладки `/admin/trust#...` переключаются корректно |
| 2026-05-25 visual QA | Работает: landing, catalog, mentor profile, profile edit, calendar, admin dashboard/trust; на проверенных desktop/mobile viewport horizontal overflow = 0 |

## Найденные и исправленные frontend/runtime дефекты

| Дефект | Статус | Исправление |
|---|---|---|
| `/admin/trust` UI дергал `/api/admin/trust/*`, но backend регистрировал REST admin routes без `/api`, из-за чего страница получала 404 | Исправлено | `apps/api/src/main.ts`: глобальный prefix теперь применяется к Nest controllers; AdminJS остается на `/admin` как Express middleware |
| `GET /api/health/ready` был `degraded` в Docker из-за `REDIS_HOST=localhost` из `.env` | Исправлено | `apps/api/src/health/health.controller.ts`: readiness использует `REDIS_URL` с приоритетом |
| Детальная страница сессии показывала raw status `booked` | Исправлено | `apps/web/src/routes/sessions/[id]/+page.svelte`: добавлен `statusLabel` |
| Admin/trust и trust grids были слишком плотными на mobile из-за inline `grid-template-columns` | Исправлено | Добавлены responsive classes в `admin/trust` и `trust` routes |
| `/admin/login` сохранял JWT в `localStorage`, но не обновлял Svelte auth store; после входа админ мог сразу вернуться на login | Исправлено | `apps/web/src/routes/admin/login/+page.svelte`: вход идет через общий `authLogin` |
| `/admin/trust` зависел от состояния auth store в момент mount и ломал прямые hash-входы; после SSR фикса отдельно проверен `200 OK` | Исправлено | `apps/web/src/routes/admin/trust/+page.svelte`: загрузка привязана к завершению auth loading, hash sync защищен `browser` guard |
| На admin/trust в блоке финансов были английские labels `Total fees`, `Total withdrawn`, `Available` | Исправлено | Labels переведены на `Всего комиссий`, `Выведено`, `Доступно к выводу` |
| В SvelteKit live announcer попадал `untitled page`; это было видно в browser QA как технический артефакт | Исправлено | Добавлен default `<title>` в layout, page titles для ключевых экранов и visually-hidden стиль для `#svelte-announcer` |
| Ссылки на `/uploads/*` в trust/admin открывались с web-host `:3000`, хотя файлы раздает API `:4000` | Исправлено | Добавлен `resolveFileUrl()` в trust/admin маршруты |
| Публичный профиль ментора показывал старый таб-переключатель `Сессия/Подписка`, хотя последний макет требует два отдельных блока справа | Исправлено | `apps/web/src/routes/mentors/[id]/+page.svelte`: правый sidebar пересобран в `Планы подписки` + `Разовые сессии и услуги` |
| На mobile `/admin/trust#database` вкладки давали небольшой body overflow | Исправлено | Tabs теперь wrap'ятся и уменьшают padding на narrow viewport |

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
| Данные профилей в seed/runtime | Макеты показывают фото, навыки, хобби и достижения у демонстрационного ментора | Структурные блоки есть, но часть seed-профилей остается пустой (`Не указано`, placeholder avatar) | Data gap |

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
7. Донаполнить seed/demo profiles под Figma:
   - avatar URL или локальный upload для демонстрационных менторов;
   - skills/hobbies/achievements для обоих seed-менторов;
   - согласовать валюту demo-планов с RUB-first интерфейсом.
