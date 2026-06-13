# Figma/Product Gap Report

Дата: 2026-06-13

## Краткий вывод

Mentory стал заметно ближе к последним макетам и пользовательской логике: high-gap по отдельным страницам деталей заявок и отдельному экрану отзыва закрыты на MVP-уровне. Figma все еще шире текущей реализации в переносе встреч, админских очередях, real-provider финансовом контуре и pixel-perfect полировке форм.

## Закрыто в последнем pass

| Gap                | Было                                    | Стало                                                                                                                                        |
| ------------------ | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Demo catalog       | 2 ментора, мало данных                  | 16 менторов с фото, услугами, программами и слотами; добавлен профиль Растяпина Данила                                                       |
| Photos             | В карточках и header были initials/icon | Фото есть в каталоге и меню пользователя                                                                                                     |
| Sessions           | Важные заявки терялись в табах          | `На согласовании` идет первым, CTA понятный                                                                                                  |
| Cancel session     | Отмена была backend-only                | `/sessions/:id` дает участникам отменить `requested/paid/booked` встречу с причиной; слот освобождается, платеж помечается к возврату/failed |
| Meeting link/notes | Save без результата                     | Есть success/error feedback                                                                                                                  |
| Chat               | Enter не отправлял                      | Enter отправляет, Shift+Enter переносит строку                                                                                               |
| Heavy terms        | Траст, кредиты, регалии                 | Помощь, бонусный баланс, документы ментора                                                                                                   |
| Dark theme         | Низкая читаемость                       | Контрастные токены для bg/surface/text/status                                                                                                |
| Subscriptions      | Ручной ID был основным сценарием        | Основной UX через программы и заявки, ручной код спрятан                                                                                     |

## Дополнительный UX-pass 2026-06-07

| Area        | Было                                                                 | Стало                                                                                                     |
| ----------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Light theme | Декоративные gradient-фоны на странице, кнопках, карточках и иконках | Светлая тема стала плоской и ближе к Figma: surface/background/accent без `linear/radial-gradient`        |
| Chat tools  | Большая раскрывающаяся карточка `Инструменты чата` под composer      | Действия перенесены в compact composer: эмодзи, фото, документ, ссылка встречи и send рядом с полем       |
| Video call  | Кнопка создавала placeholder-room и вела в непонятный внешний сервис | `Открыть встречу` появляется только когда в диалоге есть ссылка и открывает последнюю ссылку из чата      |
| Meeting URL | Ссылка в чате не синхронизировалась с session card                   | Если ментор отправляет ссылку из привязанного чата, она дополнительно сохраняется как `session.videoLink` |

## Product/UI-pass 2026-06-08

| Area    | Было                                                                                 | Стало                                                                                                                               |
| ------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| Finance | `/earnings` был только для ментора и предполагал, что каждый платеж связан с сессией | Раздел `Финансы` доступен менти и ментору; история оплат умеет session/subscription payments; суммы из cents отображаются как рубли |
| Header  | У менти не было финансового раздела                                                  | Wallet-ссылка ведет в `Финансы` для mentor/mentee; admin остается в своем финансовом контуре `/admin/trust#database`                |

## Product/UI-pass 2026-06-09

| Area            | Было                                                                   | Стало                                                                                                                                   |
| --------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Request details | `/requests` вел на общую встречу или общий раздел подписок             | Добавлены `/requests/sessions/:id` и `/requests/subscriptions/:id` с contact info, целью, мотивацией, summary card и действиями решения |
| Subscriptions   | Для одной подписочной заявки не было read endpoint                     | Добавлен `GET /api/subscriptions/:subscriptionId` с проверкой участника, планом, ментором и менти                                       |
| QA evidence     | Browser evidence был только для списков requests/subscriptions/finance | Добавлены desktop/mobile screenshots деталей session/subscription request, HTTP 200, console errors = 0, horizontal overflow = 0        |

## Product/UI-pass 2026-06-13

| Area        | Было                                                                                     | Стало                                                                                                                                      |
| ----------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Review page | Отзыв был inline-формой в `/sessions/:id`, а Figma требует отдельный экран               | Добавлен `/sessions/:id/review` со звездами, textarea, lock-states и redirect на `/sessions?tab=past&review=1`                             |
| Sessions    | Список не знал, создан ли отзыв, и мог предлагать действие без учета `review`            | `GET /api/sessions` включает `review.id`; `/sessions` показывает `Оценить ментора` или `Отзыв отправлен`                                  |
| Backend     | Пересчет рейтинга после отзыва был через raw SQL и падал в Postgres на `uuid = text`     | `createReview` создает review и обновляет `mentor_profiles.ratingAvg/ratingCount` через Prisma transaction                                |
| QA evidence | Gap был только в Figma-derived плане                                                     | Browser QA: completed session открывает review page, mobile overflow = 0, submit успешен, success banner виден на `/sessions?tab=past&review=1` |

## Открытые различия с Figma

| Area          | Gap                                                                                                  | Priority |
| ------------- | ---------------------------------------------------------------------------------------------------- | -------: |
| Booking       | Pay-first/session request screen отличается от target                                                |     High |
| Reschedule    | Перенос оплаченной встречи в новый слот отсутствует                                                  |     High |
| Admin support | Есть формы, но нет объектных очередей и карточек                                                     |     High |
| Requests      | Detail pages есть MVP; остаются profile/chat shortcuts и pixel-perfect карточки списка               |   Medium |
| Subscriptions | `/subscriptions/new?planId=` есть, но форма и states требуют полного Figma polish                    |   Medium |
| Chat polish   | Нужны states для reply/edit/delete, loading attachments, mobile bottom safe-area                     |   Medium |
| Finance       | Базовый mentor/mentee finance UI есть; real provider, saved payout methods и reconciliation остаются |   Medium |
| Notifications | Нет полноценного центра уведомлений и настроек                                                       |   Medium |
| Mobile polish | Основные экраны работают, но нужен полный visual pass                                                |   Medium |

## Рекомендованный порядок закрытия

1. **Reschedule:** без переноса сложно считать scheduling продуктовым.
2. **Admin queues:** убрать ручные UUID и технические формы.
3. **Booking request polish:** привести `/booking/new` к Figma pay-first форме.
4. **Provider readiness:** payments, payouts, storage.
5. **Finance provider polish:** saved payout methods, reconciliation и edge cases.
6. **Visual polish:** spacing, typography, empty/loading/error states.

## Как оценивать дальше

- Все новые UI flows проверять в браузере на desktop и mobile.
- Для каждого gap делать difference-коммит с коротким QA evidence.
- Если Figma противоречит коду, фиксировать решение в этом документе или в `product/README.md`.
