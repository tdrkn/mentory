# Auth Module

## Overview

Модуль аутентификации реализует:
- Регистрация с email/password
- Логин с выдачей JWT
- Роли: `mentee`, `mentor`, `both`
- Guards и декораторы для защиты эндпоинтов

## Architecture Decision: JWT vs Cookie Sessions

**Выбор: JWT Access Token**

| Критерий | JWT | Cookie Session |
|----------|-----|----------------|
| Stateless | ✅ Да | ❌ Нет (нужен Redis) |
| Mobile apps | ✅ Просто | ⚠️ Сложнее |
| Микросервисы | ✅ Легко масштабировать | ⚠️ Shared session store |
| CSRF | ✅ Не нужна защита | ❌ Нужна |
| Logout | ⚠️ Нужен blacklist | ✅ Просто удалить |

Для MVP с мобильным приложением JWT — оптимальный выбор.

## Files Structure

```
src/modules/auth/
├── auth.module.ts
├── auth.controller.ts
├── auth.service.ts
├── strategies/
│   ├── local.strategy.ts      # Email/password validation
│   ├── jwt.strategy.ts        # JWT token validation
│   └── index.ts
├── guards/
│   ├── jwt-auth.guard.ts      # Protect routes
│   ├── roles.guard.ts         # Role-based access
│   └── index.ts
├── decorators/
│   ├── current-user.decorator.ts
│   ├── roles.decorator.ts
│   ├── public.decorator.ts
│   └── index.ts
└── dto/
    ├── register.dto.ts
    ├── login.dto.ts
    ├── change-password.dto.ts
    └── index.ts
```

## Endpoints

### POST /api/auth/register

Регистрация нового пользователя.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "fullName": "John Doe",
  "role": "mentee"
}
```

**Response (201):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "fullName": "John Doe",
    "role": "mentee"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

### POST /api/auth/login

Аутентификация пользователя.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "fullName": "John Doe",
    "role": "mentee"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

### GET /api/auth/me

Получение данных текущего пользователя.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "fullName": "John Doe",
  "role": "mentee",
  "avatarUrl": null,
  "createdAt": "2026-01-30T10:00:00Z"
}
```

### PATCH /api/auth/password

Смена пароля.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request:**
```json
{
  "currentPassword": "oldPassword123",
  "newPassword": "newSecurePassword456"
}
```

## curl Examples

```bash
# Register
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","fullName":"Test User","role":"mentee"}'

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Get current user
curl http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"

# Change password
curl -X PATCH http://localhost:3001/api/auth/password \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"currentPassword":"password123","newPassword":"newpassword456"}'
```

## Guards Usage

```typescript
// Protect route with JWT
@UseGuards(JwtAuthGuard)
@Get('protected')
protectedRoute() {}

// Require specific role
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('mentor')
@Get('mentor-only')
mentorOnly() {}

// Get current user in handler
@Get('me')
getMe(@CurrentUser() user: User) {
  return user;
}

// Make route public (skip JWT)
@Public()
@Get('public')
publicRoute() {}
```

## Security

- Passwords hashed with bcrypt (10 rounds)
- JWT expires in 7 days (configurable)
- Token contains: `{ sub: userId, email, role }`
