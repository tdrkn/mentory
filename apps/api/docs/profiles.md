# Profiles Module

## Overview

Модуль профилей управляет:
- Базовый профиль пользователя: ФИО, имя/фамилия, аватар, таймзона
- Профиль ментора: bio, карьера, навыки, темы, регалии, рейтинг
- Профиль менти: карьера, background, goals, hobbies, skills, interests
- Публичные профили менторов и доступный ментору просмотр профиля менти

## Files Structure

```
src/modules/profiles/
├── profiles.module.ts
├── profiles.controller.ts        # /profile/*
├── mentor-profile.controller.ts  # /profile/mentor
├── mentee-profile.controller.ts  # /profile/mentee
├── profiles.service.ts
└── dto/
    ├── update-user.dto.ts
    ├── update-mentor-profile.dto.ts
    ├── update-mentee-profile.dto.ts
    ├── update-topics.dto.ts
    └── index.ts
```

## Endpoints

### GET /api/profile

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
    "skills": ["TypeScript", "Architecture"],
    "ratingAvg": 4.8,
    "ratingCount": 25
  }
}
```

### PATCH /api/profile

Обновление базового профиля.

**Request:**
```json
{
  "firstName": "John",
  "lastName": "Smith",
  "fullName": "John Smith",
  "avatarUrl": "data:image/png;base64,...",
  "timezone": "America/New_York"
}
```

### GET /api/profile/mentor

Получение профиля ментора (для ментора).

**Response:**
```json
{
  "userId": "uuid",
  "headline": "Senior Developer",
  "bio": "10 years experience in web development",
  "position": "Staff Engineer",
  "workplace": "Mentory",
  "activityFields": ["Software Engineering"],
  "skills": ["TypeScript", "Architecture"],
  "languages": ["en", "ru"],
  "ratingAvg": 4.8,
  "ratingCount": 25,
  "isActive": true,
  "topics": [
    { "id": "uuid", "name": "JavaScript" }
  ]
}
```

### PATCH /api/profile/mentor

Обновление профиля ментора.

**Request:**
```json
{
  "headline": "Full-Stack Developer & Mentor",
  "bio": "I help junior developers grow...",
  "position": "Staff Engineer",
  "workplace": "Mentory",
  "activityFields": ["Software Engineering"],
  "skills": ["TypeScript", "Architecture"],
  "languages": ["en", "ru", "es"]
}
```

### PUT /api/profile/mentor/topics

Обновление топиков ментора (полная замена).

**Request:**
```json
{
  "topicIds": ["topic-uuid-1", "topic-uuid-2"]
}
```

### GET /api/profile/mentee

Получение профиля менти.

### PATCH /api/profile/mentee

Обновление профиля менти.

**Request:**
```json
{
  "education": "HSE",
  "position": "Junior Developer",
  "workplace": "Startup",
  "activityFields": ["Software Engineering"],
  "background": "I know JavaScript and want to grow into backend.",
  "goals": ["Learn React", "Master TypeScript"],
  "hobbies": ["Books"],
  "skills": ["JavaScript"],
  "interests": ["web-development", "career-growth"]
}
```

### Загрузка аватара

Аватар загружается через `PATCH /api/profile` как data URL. API сохраняет файл через `FileStorageService` и возвращает `/uploads/*` URL.

## curl Examples

```bash
# Get my profile
curl http://localhost:4000/api/profile \
  -H "Authorization: Bearer YOUR_TOKEN"

# Update profile
curl -X PATCH http://localhost:4000/api/profile \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fullName":"New Name","timezone":"Europe/London"}'

# Get mentor profile
curl http://localhost:4000/api/profile/mentor \
  -H "Authorization: Bearer YOUR_TOKEN"

# Update mentor profile
curl -X PATCH http://localhost:4000/api/profile/mentor \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"headline":"Expert Mentor","skills":["TypeScript"],"activityFields":["Software Engineering"]}'

# Update mentor topics
curl -X PUT http://localhost:4000/api/profile/mentor/topics \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"topicIds":["topic-id-1","topic-id-2"]}'

# Get mentee profile
curl http://localhost:4000/api/profile/mentee \
  -H "Authorization: Bearer YOUR_TOKEN"

# Update mentee profile
curl -X PATCH http://localhost:4000/api/profile/mentee \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"goals":["Master TypeScript"],"skills":["JavaScript"],"background":"Frontend junior"}'
```

## Validation Rules

### UpdateMentorProfileDto
- `age`: number, 18..120
- `birthDate`: ISO date
- `education`, `position`, `workplace`, `headline`, `bio`: string
- `activityFields`, `goals`, `hobbies`, `certificates`, `skills`, `languages`: array of strings
- `timezone`: string

### UpdateMenteeProfileDto
- `age`: number, 18..120
- `education`, `position`, `workplace`, `background`: string
- `activityFields`, `goals`, `hobbies`, `certificates`, `skills`: array of strings
- `interests`: array of strings

## Access Control

| Endpoint | Access |
|----------|--------|
| GET /profile | Any authenticated |
| PATCH /profile | Any authenticated |
| GET /profile/mentor | Mentor only |
| PATCH /profile/mentor | Mentor only |
| PUT /profile/mentor/topics | Mentor only |
| GET /profile/mentee | Mentee only |
| PATCH /profile/mentee | Mentee only |
| GET /profile/mentor/mentees/:id | Mentor with shared session |
