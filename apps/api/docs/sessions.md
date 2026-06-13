# Sessions Module

## Overview

Управление сессиями:
- Бронирование слотов
- Оплата и решение ментора
- Внешняя ссылка на встречу
- Заметки и отзывы

## Session Flow

```
[mentee] POST /booking/hold → status: requested (slot held)
    ↓
[mentee] POST /payments/intent → payment created
    ↓
[webhook] payment.succeeded → status: paid (waiting mentor decision)
    ↓
[mentor] PATCH /sessions/:id/confirm → status: booked
    ↓
[mentor] PATCH /sessions/:id/video-link → external meeting URL
    ↓
[both] open /sessions/:id and join via videoLink
    ↓
[mentor] PATCH /sessions/:id/complete → status: completed
    ↓
[mentee] open /sessions/:id/review after 24h
    ↓
[mentee] POST /reviews/:sessionId → review created, mentor rating updated
```

`GET /sessions/:id/video` и `video_rooms` остаются legacy shim для старого placeholder UX. Основной продуктовый сценарий - внешний URL в `sessions.videoLink`.

## Endpoints

### Sessions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/sessions | Мои сессии; элементы включают `review.id`, если отзыв уже создан |
| GET | /api/sessions/:id | Детали сессии, включая participants, service, payments, notes, videoLink и review |
| PATCH | /api/sessions/:id/confirm | Подтвердить оплаченную заявку; mentor only |
| PATCH | /api/sessions/:id/reject | Отклонить оплаченную заявку с причиной/комментарием; mentor only |
| PATCH | /api/sessions/:id/cancel | Отменить `requested`/`paid`/`booked` встречу с причиной |
| PATCH | /api/sessions/:id/video-link | Сохранить внешнюю ссылку на встречу; mentor only |
| GET | /api/sessions/:id/video | Legacy video-room shim |
| GET | /api/sessions/:id/notes | Заметки (mentor) |
| PATCH | /api/sessions/:id/notes | Обновить заметки |
| PATCH | /api/sessions/:id/complete | Завершить |

### Booking

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/booking/hold | Создать session-as-request и удержать слот |
| POST | /api/booking/confirm | Legacy confirm alias |
| GET | /api/booking/:id | Детали бронирования |
| PATCH | /api/booking/:id/cancel | Legacy cancel alias |

### Reviews

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/reviews/:sessionId | Оставить отзыв после `completed` + 24h |

Ограничения отзывов:

- отправитель должен быть mentee этой сессии;
- session должна быть `completed`;
- `endAt + 24h` уже наступил;
- rating 1..5;
- один отзыв на session и один отзыв от mentee к mentor pair;
- создание отзыва и пересчет `mentor_profiles.ratingAvg/ratingCount` выполняются одной Prisma transaction.

## curl Examples

```bash
# Book session
curl -X POST http://localhost:4000/api/booking/hold \
  -H "Authorization: Bearer MENTEE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"slotId":"SLOT_ID","serviceId":"SERVICE_ID"}'

# Confirm paid session request
curl -X PATCH http://localhost:4000/api/sessions/SESSION_ID/confirm \
  -H "Authorization: Bearer MENTOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"comment":"Готов встретиться в выбранное время"}'

# Attach external meeting link
curl -X PATCH http://localhost:4000/api/sessions/SESSION_ID/video-link \
  -H "Authorization: Bearer MENTOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"videoLink":"https://meet.example.com/session"}'

# Get my sessions
curl http://localhost:4000/api/sessions \
  -H "Authorization: Bearer TOKEN"

# Leave review
curl -X POST http://localhost:4000/api/reviews/SESSION_ID \
  -H "Authorization: Bearer MENTEE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"rating":5,"text":"Great session!"}'
```
