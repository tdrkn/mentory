# Scheduling Module

## Overview

Управление расписанием ментора:
- Правила доступности (еженедельные)
- Исключения (отпуск, занятость)
- Генерация слотов
- Услуги ментора

## Endpoints

### Availability Rules

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/scheduling/rules | Мои правила |
| POST | /api/scheduling/rules | Создать правило |
| DELETE | /api/scheduling/rules/:id | Удалить правило |

### Exceptions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/scheduling/exceptions | Мои исключения |
| POST | /api/scheduling/exceptions | Создать исключение |
| DELETE | /api/scheduling/exceptions/:id | Удалить исключение |

### Slots

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/scheduling/slots/generate | Сгенерировать слоты |
| GET | /api/scheduling/slots | Слоты ментора (mentor only) |
| GET | /api/scheduling/mentors/:mentorId/slots | Публичные доступные слоты |
| GET | /api/scheduling/calendar | Календарь (mentor only) |

### Services

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/services | Мои услуги |
| POST | /api/services | Создать услугу |
| PATCH | /api/services/:id | Обновить услугу |
| DELETE | /api/services/:id | Удалить услугу |

## curl Examples

```bash
# Create availability rule (Mon-Fri 10:00-18:00)
curl -X POST http://localhost:4000/api/scheduling/rules \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"weekday":1,"startTime":"10:00","endTime":"18:00"}'

# Generate slots for next week
curl -X POST http://localhost:4000/api/scheduling/slots/generate \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"from":"2026-02-01","to":"2026-02-07","slotDurationMin":60}'

# Get mentor slots
curl "http://localhost:4000/api/scheduling/slots?from=2026-02-01"

# Create service
curl -X POST http://localhost:4000/api/services \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"1-on-1 Mentoring","description":"Personal session","durationMin":60,"priceCents":5000}'
```
