# Chat WebSocket API

## Overview

Real-time messaging via WebSocket. Database is the source of truth — WebSocket only pushes events to connected clients.

## Connection

```javascript
import { io } from 'socket.io-client';

const socket = io('ws://localhost:4000/chat', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

### Authentication

JWT token must be provided in one of these ways:
- `auth.token` in handshake
- `Authorization: Bearer <token>` header
- `?token=<token>` query parameter

## Events

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `join_conversation` | `{ conversationId: string }` | Join a conversation room |
| `leave_conversation` | `{ conversationId: string }` | Leave a conversation room |
| `typing` | `{ conversationId: string, isTyping: boolean }` | Send typing indicator |
| `mark_read` | `{ conversationId: string }` | Mark messages as read |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `new_message` | `{ conversationId, message }` | New message in conversation |
| `user_typing` | `{ conversationId, userId, isTyping }` | User typing indicator |
| `messages_read` | `{ conversationId, readBy, count }` | Messages marked as read |

## REST Endpoints

### GET /api/conversations
Get user's conversations with last message and unread count.

**Query Parameters:**
- `limit` (number, default: 20)
- `offset` (number, default: 0)

**Response:**
```json
{
  "id": "uuid",
  "mentor": { "id": "uuid", "fullName": "John Doe", "avatarUrl": "..." },
  "mentee": { "id": "uuid", "fullName": "Jane Doe", "avatarUrl": "..." },
  "session": { "id": "uuid", "startAt": "2024-01-15T10:00:00Z", "status": "completed" },
  "lastMessage": { "id": "uuid", "content": "Hello!", "createdAt": "...", "senderId": "uuid" },
  "unreadCount": 3,
  "updatedAt": "2024-01-15T12:00:00Z"
}
```

### POST /api/conversations/by-session
Get or create conversation for a session.

**Body:**
```json
{ "sessionId": "uuid" }
```

### GET /api/conversations/:id
Get conversation details.

### GET /api/conversations/:id/messages
Get messages with cursor pagination.

**Query Parameters:**
- `limit` (number, default: 50)
- `before` (string, message ID for cursor)

### POST /api/conversations/:id/messages
Send a message.

**Body:**
```json
{
  "content": "Hello, mentor!",
  "contentType": "text",
  "attachments": [
    {
      "filename": "doc.pdf",
      "mimeType": "application/pdf",
      "url": "https://...",
      "size": 12345
    }
  ]
}
```

### PATCH /api/conversations/:id/read
Mark all messages in conversation as read.

## Example Client Usage

```typescript
// Connect
const socket = io('ws://localhost:4000/chat', {
  auth: { token: localStorage.getItem('accessToken') }
});

// Join conversation
socket.emit('join_conversation', { conversationId: 'xxx' });

// Listen for new messages
socket.on('new_message', ({ conversationId, message }) => {
  console.log('New message:', message);
  // Add to UI, update unread count
});

// Send typing indicator
socket.emit('typing', { conversationId: 'xxx', isTyping: true });

// Listen for typing
socket.on('user_typing', ({ conversationId, userId, isTyping }) => {
  // Show/hide typing indicator
});

// Mark as read
socket.emit('mark_read', { conversationId: 'xxx' });

// Cleanup on unmount
socket.disconnect();
```

## Architecture Notes

1. **DB is truth**: Messages are saved via REST API first, then pushed via WebSocket
2. **Auto-join**: On connection, user automatically joins all their conversation rooms
3. **Offline support**: If recipient is offline, notification is queued for email
4. **Reconnection**: Socket.io handles reconnection automatically
