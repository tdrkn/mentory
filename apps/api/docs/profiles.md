# Profiles Module

## Overview

Модуль профилей управляет:
- Базовый профиль пользователя
- Профиль ментора (bio, rate, topics)
- Профиль менти (goals, interests)
- Публичные профили менторов

## Files Structure

```
src/modules/profiles/
├── profiles.module.ts
├── profiles.controller.ts        # /profiles/*
├── mentor-profile.controller.ts  # /profiles/mentor
├── mentee-profile.controller.ts  # /profiles/mentee
├── profiles.service.ts
└── dto/
    ├── update-profile.dto.ts
    ├── update-mentor-profile.dto.ts
    ├── update-mentee-profile.dto.ts
    ├── update-topics.dto.ts
    └── index.ts
```

## Endpoints

### GET /api/profiles/me

Получение профиля текущего пользователя.

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "fullName": "John Doe",
  "avatarUrl": null,
  "role": "mentor",
  "timezone": "Europe/Moscow",
  "mentorProfile": {
    "headline": "Senior Developer",
    "bio": "10 years of experience...",
    "hourlyRateCents": 5000,
    "ratingAvg": 4.8,
    "ratingCount": 25
  }
}
```

### PATCH /api/profiles/me

Обновление базового профиля.

**Request:**
```json
{
  "fullName": "John Smith",
  "timezone": "America/New_York"
}
```

### GET /api/profiles/mentor

Получение профиля ментора (для ментора).

**Response:**
```json
{
  "userId": "uuid",
  "headline": "Senior Developer",
  "bio": "10 years experience in web development",
  "hourlyRateCents": 5000,
  "currency": "USD",
  "languages": ["en", "ru"],
  "ratingAvg": 4.8,
  "ratingCount": 25,
  "isVisible": true,
  "topics": [
    { "id": "uuid", "name": "JavaScript", "slug": "javascript" }
  ]
}
```

### PATCH /api/profiles/mentor

Обновление профиля ментора.

**Request:**
```json
{
  "headline": "Full-Stack Developer & Mentor",
  "bio": "I help junior developers grow...",
  "hourlyRateCents": 7500,
  "languages": ["en", "ru", "es"],
  "isVisible": true
}
```

### PUT /api/profiles/mentor/topics

Обновление топиков ментора (полная замена).

**Request:**
```json
{
  "topicIds": ["topic-uuid-1", "topic-uuid-2"]
}
```

### GET /api/profiles/mentee

Получение профиля менти.

### PATCH /api/profiles/mentee

Обновление профиля менти.

**Request:**
```json
{
  "goals": "Learn React and Node.js",
  "interests": ["web-development", "career-growth"]
}
```

### POST /api/profiles/avatar

Загрузка аватара.

**Request:** multipart/form-data with `file` field

## curl Examples

```bash
# Get my profile
curl http://localhost:3001/api/profiles/me \
  -H "Authorization: Bearer YOUR_TOKEN"

# Update profile
curl -X PATCH http://localhost:3001/api/profiles/me \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fullName":"New Name","timezone":"Europe/London"}'

# Get mentor profile
curl http://localhost:3001/api/profiles/mentor \
  -H "Authorization: Bearer YOUR_TOKEN"

# Update mentor profile
curl -X PATCH http://localhost:3001/api/profiles/mentor \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"headline":"Expert Mentor","hourlyRateCents":10000}'

# Update mentor topics
curl -X PUT http://localhost:3001/api/profiles/mentor/topics \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"topicIds":["topic-id-1","topic-id-2"]}'

# Get mentee profile
curl http://localhost:3001/api/profiles/mentee \
  -H "Authorization: Bearer YOUR_TOKEN"

# Update mentee profile
curl -X PATCH http://localhost:3001/api/profiles/mentee \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"goals":"Master TypeScript"}'
```

## Validation Rules

### UpdateMentorProfileDto
- `headline`: string, max 200 chars
- `bio`: string, max 5000 chars
- `hourlyRateCents`: number, min 0
- `currency`: enum (USD, EUR, RUB)
- `languages`: array of strings
- `isVisible`: boolean

### UpdateMenteeProfileDto
- `goals`: string, max 2000 chars
- `interests`: array of strings

## Access Control

| Endpoint | Access |
|----------|--------|
| GET /profiles/me | Any authenticated |
| PATCH /profiles/me | Any authenticated |
| GET /profiles/mentor | Mentor only |
| PATCH /profiles/mentor | Mentor only |
| PUT /profiles/mentor/topics | Mentor only |
| GET /profiles/mentee | Mentee only |
| PATCH /profiles/mentee | Mentee only |
