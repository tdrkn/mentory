# Discovery Module

## Overview

Модуль поиска и просмотра:
- Поиск менторов с фильтрами
- Публичные профили менторов
- Каталог топиков
- Отзывы о менторах

## Endpoints

### GET /api/discovery/mentors

Поиск менторов с фильтрацией.

**Query Parameters:**
- `topic` - slug топика
- `minPrice` - мин. цена (cents)
- `maxPrice` - макс. цена (cents)
- `minRating` - мин. рейтинг (1-5)
- `languages` - языки (comma-separated)
- `search` - поиск по имени/headline
- `page` - страница (default: 1)
- `limit` - лимит (default: 20, max: 100)

**Response:**
```json
{
  "mentors": [...],
  "total": 150,
  "page": 1,
  "totalPages": 8
}
```

### GET /api/discovery/mentors/:id

Публичный профиль ментора.

### GET /api/discovery/mentors/:id/reviews

Отзывы о менторе.

### GET /api/topics

Список всех топиков.

### GET /api/topics/:slug

Топик по slug.

## curl Examples

```bash
# Search mentors
curl "http://localhost:3001/api/discovery/mentors?topic=javascript&minRating=4"

# Get mentor profile
curl http://localhost:3001/api/discovery/mentors/MENTOR_ID

# Get mentor reviews
curl http://localhost:3001/api/discovery/mentors/MENTOR_ID/reviews

# List topics
curl http://localhost:3001/api/topics
```
