# ER-диаграмма Mentory для бизнеса (V1)

Дата: 2026-03-09

Цель этой версии: зафиксировать основной путь продукта простым языком.

## Как читать

- `PK` — основной идентификатор записи.
- `FK` — ссылка на связанную запись.
- Названия сущностей и полей оставлены на английском, подписи связей на русском.

## ER (ядро бизнеса)

```mermaid
erDiagram
  users {
    uuid id PK
    string email
    string username
    string full_name
    string role
    bool is_email_verified
  }

  mentor_profiles {
    uuid user_id PK,FK
    string headline
    string verification_status
    bool is_active
    decimal rating_avg
  }

  mentee_profiles {
    uuid user_id PK,FK
    string background
  }

  topics {
    uuid id PK
    string name
  }

  mentor_topics {
    uuid mentor_id PK,FK
    uuid topic_id PK,FK
  }

  mentor_services {
    uuid id PK
    uuid mentor_id FK
    string title
    int duration_min
    decimal price_amount
    string currency
    bool is_active
  }

  slots {
    uuid id PK
    uuid mentor_id FK
    datetime start_at
    datetime end_at
    string status
  }

  sessions {
    uuid id PK
    uuid mentor_id FK
    uuid mentee_id FK
    uuid service_id FK
    uuid slot_id FK
    string status
    datetime start_at
    datetime end_at
  }

  payments {
    uuid id PK
    uuid session_id FK
    uuid mentee_id FK
    uuid mentor_id FK
    int amount
    int platform_fee
    int mentor_amount
    string currency
    string status
  }

  reviews {
    uuid id PK
    uuid session_id FK
    uuid mentee_id FK
    uuid mentor_id FK
    int rating
  }

  conversations {
    uuid id PK
    uuid mentor_id FK
    uuid mentee_id FK
    uuid session_id FK
  }

  messages {
    uuid id PK
    uuid conversation_id FK
    uuid sender_id FK
    string content
    bool is_read
    datetime created_at
  }

  users ||--o| mentor_profiles : "пользователь может иметь профиль ментора"
  users ||--o| mentee_profiles : "пользователь может иметь профиль менти"
  mentor_profiles ||--o{ mentor_topics : "у ментора несколько тем"
  topics ||--o{ mentor_topics : "одна тема у многих менторов"
  users ||--o{ mentor_services : "ментор публикует услуги"
  users ||--o{ slots : "ментор открывает слоты в календаре"
  mentor_services ||--o{ sessions : "сессия выбирает услугу"
  slots ||--o| sessions : "слот закрепляется за одной сессией"
  users ||--o{ sessions : "пользователь участвует в сессиях"
  sessions ||--o| payments : "на сессию приходится одна оплата"
  sessions ||--o| reviews : "после сессии можно оставить один отзыв"
  sessions ||--o| conversations : "для сессии может быть чат"
  conversations ||--o{ messages : "чат состоит из сообщений"
  users ||--o{ messages : "пользователь отправляет сообщения"
```

## Бизнес-смысл (кратко)

- Платформа связывает `mentee` и `mentor` через `sessions`.
- До сессии есть этап выбора: темы (`topics`) -> услуги (`mentor_services`) -> свободный слот (`slots`).
- Финансовая фиксация проходит через `payments`.
- Качество услуги фиксируется через `reviews`.
- Коммуникация по работе идёт через `conversations` и `messages`.

## Что намеренно не включено в V1

- Контур `trust` (жалобы, модерация, блокировки).
- Подписки и кредиты (`mentorship_*`, `mentee_credit_*`).
- Операционные сущности второго уровня (уведомления, выплаты ментору, вывод комиссии).

## Вопросы для согласования перед V2

1. В следующую версию ER добавляем только `trust` или сразу `trust + subscriptions`?
2. В бизнес-материалах показываем одну большую ER или три отдельные (Core, Trust, Subscriptions)?
3. Для C4 считать `subscriptions` частью MVP-контейнера или отдельным bounded context?
