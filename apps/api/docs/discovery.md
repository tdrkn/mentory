# Discovery Module

## Overview

Модуль поиска и просмотра:
- Поиск менторов с фильтрами
- Публичные профили менторов
- Каталог топиков
- Отзывы о менторах

## Endpoints

### GET /api/mentors

Поиск менторов с фильтрацией.

**Query Parameters:**
- `topicId` - id топика
- `topic` - имя топика (поиск по названию)
- `minPrice` - мин. цена
- `maxPrice` - макс. цена
- `minRating` - мин. рейтинг (1-5)
- `language` - язык (например: `ru` или `en`)
- `search` - поиск по имени/headline
- `page` - страница (default: 1)
- `limit` - лимит (default: 20, max: 100)

**Response:**
```json
{
  "data": [...],
  "meta": {
    "total": 150,
    "limit": 20,
    "offset": 0,
    "hasMore": true,
    "page": 1,
    "totalPages": 8
  }
}
```

### GET /api/mentors/:id

Публичный профиль ментора.

### GET /api/mentors/:id/reviews

Отзывы о менторе.

### GET /api/topics

Список всех топиков.

### GET /api/topics/:slug

Топик по slug.

## curl Examples

```bash
# Search mentors
curl "http://localhost:4000/api/mentors?topic=javascript&minRating=4"

# Get mentor profile
curl http://localhost:4000/api/mentors/MENTOR_ID

# Get mentor reviews
curl http://localhost:4000/api/mentors/MENTOR_ID/reviews

# List topics
curl http://localhost:4000/api/topics
```
