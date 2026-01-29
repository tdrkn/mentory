# Chat Module

## Overview

Система обмена сообщениями:
- Conversations привязаны к сессиям
- Text и file сообщения
- Read receipts

## Endpoints

### Conversations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/conversations | Мои чаты |
| POST | /api/conversations/:sessionId | Создать/получить чат |
| GET | /api/conversations/:id | Детали чата |
| GET | /api/conversations/:id/messages | Сообщения |

### Chat

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/chat/:id/messages | Отправить сообщение |
| PATCH | /api/chat/:id/read | Прочитано |
| POST | /api/chat/:id/typing | Typing indicator |

## curl Examples

```bash
# Get conversations
curl http://localhost:3001/api/conversations \
  -H "Authorization: Bearer TOKEN"

# Get or create conversation
curl -X POST http://localhost:3001/api/conversations/SESSION_ID \
  -H "Authorization: Bearer TOKEN"

# Send message
curl -X POST http://localhost:3001/api/chat/CONV_ID/messages \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"Hello!"}'

# Get messages
curl http://localhost:3001/api/conversations/CONV_ID/messages \
  -H "Authorization: Bearer TOKEN"

# Mark as read
curl -X PATCH http://localhost:3001/api/chat/CONV_ID/read \
  -H "Authorization: Bearer TOKEN"
```
