# Sessions Module

## Overview

Управление сессиями:
- Бронирование слотов
- Подтверждение/отклонение
- Видео-комнаты
- Заметки и отзывы

## Session Flow

```
[mentee] POST /booking → status: requested
    ↓
[mentor] PATCH /booking/:id/confirm → status: booked
    ↓
[mentee] POST /payments/intent → payment created
    ↓
[webhook] payment.succeeded → status: paid
    ↓
[both] GET /sessions/:id/video → join video call
    ↓
[mentor] PATCH /sessions/:id/complete → status: completed
    ↓
[mentee] POST /reviews/:sessionId → review created
```

## Endpoints

### Sessions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/sessions | Мои сессии |
| GET | /api/sessions/:id | Детали сессии |
| GET | /api/sessions/:id/video | Видео-комната |
| GET | /api/sessions/:id/notes | Заметки (mentor) |
| PATCH | /api/sessions/:id/notes | Обновить заметки |
| PATCH | /api/sessions/:id/complete | Завершить |

### Booking

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/booking | Забронировать |
| PATCH | /api/booking/:id/confirm | Подтвердить |
| PATCH | /api/booking/:id/reject | Отклонить |
| PATCH | /api/booking/:id/cancel | Отменить |

### Reviews

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/reviews/:sessionId | Оставить отзыв |

## curl Examples

```bash
# Book session
curl -X POST http://localhost:3001/api/booking \
  -H "Authorization: Bearer MENTEE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"slotId":"SLOT_ID","serviceId":"SERVICE_ID"}'

# Confirm booking
curl -X PATCH http://localhost:3001/api/booking/SESSION_ID/confirm \
  -H "Authorization: Bearer MENTOR_TOKEN"

# Get my sessions
curl http://localhost:3001/api/sessions \
  -H "Authorization: Bearer TOKEN"

# Leave review
curl -X POST http://localhost:3001/api/reviews/SESSION_ID \
  -H "Authorization: Bearer MENTEE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"rating":5,"text":"Great session!"}'
```
