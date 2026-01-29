# Mentory API Documentation

## Architecture

Mentory API построен как **модульный монолит** на NestJS с Prisma ORM.

### Modules

| Module | Description | Tables |
|--------|-------------|--------|
| [Auth](./auth.md) | Аутентификация, JWT, роли | users |
| [Profiles](./profiles.md) | Профили менторов/менти | users, mentor_profiles, mentee_profiles, mentor_topics |
| [Discovery](./discovery.md) | Поиск менторов, топики | topics, mentor_topics, reviews |
| [Scheduling](./scheduling.md) | Расписание, слоты, услуги | availability_rules, slots, mentor_services |
| [Sessions](./sessions.md) | Бронирование, сессии | sessions, video_rooms, session_notes, reviews |
| [Payments](./payments.md) | Платежи, выплаты | payments, payouts |
| [Chat](./chat.md) | Чат, сообщения | conversations, messages, attachments |
| [Notifications](./notifications.md) | Уведомления | notifications |

### Tech Stack

- **Runtime**: Node.js 20+
- **Framework**: NestJS 10
- **ORM**: Prisma 6.2
- **Database**: PostgreSQL 16
- **Auth**: JWT (passport-jwt)
- **Validation**: class-validator + class-transformer

### API Conventions

- Base URL: `/api`
- Auth: `Authorization: Bearer <token>`
- Content-Type: `application/json`
- Errors: `{ statusCode, message, error }`

### Running Locally

```bash
# Start services
make dev

# Run migrations
make migrate

# Seed database
make seed

# API available at
http://localhost:3001/api
```
