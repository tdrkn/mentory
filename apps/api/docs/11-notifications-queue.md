# Notifications & Email Queue API

## Overview

In-app notifications stored in database + async email sending via BullMQ.

## Architecture

```
[Event] → NotificationsService
            ├── Create in-app notification (DB)
            └── Queue email job (BullMQ → Redis)
                        ↓
                  EmailProcessor
                        ↓
                  EmailService → SMTP (Mailhog/Prod)
```

## REST Endpoints

### GET /api/notifications
Get user's notifications.

**Query Parameters:**
- `limit` (number, default: 20)
- `offset` (number, default: 0)
- `unreadOnly` (boolean, default: false)

**Response:**
```json
{
  "notifications": [
    {
      "id": "uuid",
      "type": "session_booked",
      "title": "New Session Request",
      "body": "John Doe has requested a session",
      "data": { "sessionId": "uuid" },
      "isRead": false,
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ],
  "total": 42,
  "hasMore": true
}
```

### GET /api/notifications/unread-count
Get unread notifications count.

**Response:**
```json
{ "count": 5 }
```

### PATCH /api/notifications/:id/read
Mark single notification as read.

### PATCH /api/notifications/read-all
Mark all notifications as read.

**Response:**
```json
{ "markedAsRead": 5 }
```

### GET /api/notifications/settings
Get notification settings.

### PATCH /api/notifications/settings
Update notification settings.

**Body:**
```json
{
  "email": {
    "sessionReminder": true,
    "sessionBooked": true,
    "newMessage": false
  },
  "push": {
    "sessionReminder": true
  }
}
```

### GET /api/notifications/queue-stats
Get email queue statistics (admin only).

**Response:**
```json
{
  "queue": "email",
  "waiting": 0,
  "active": 1,
  "completed": 150,
  "failed": 2
}
```

## Notification Types

| Type | Trigger | Email | Push |
|------|---------|-------|------|
| `session_booked` | Session created | ✅ | ✅ |
| `session_confirmed` | Mentor confirms | ✅ | ✅ |
| `session_canceled` | Session canceled | ✅ | ✅ |
| `session_reminder` | 24h/1h before | ✅ | ✅ |
| `new_message` | Chat message | ✅ | ✅ |
| `new_review` | Review posted | ✅ | ❌ |
| `payment_received` | Payment completed | ✅ | ✅ |
| `payout_sent` | Payout processed | ✅ | ❌ |

## Email Templates

Templates are embedded in `EmailService`. Available templates:
- `session_booked` - New session notification
- `payment_received` - Payment confirmation
- `new_message` - New chat message
- `session_reminder` - Session reminder

## BullMQ Configuration

```typescript
{
  attempts: 3,              // Retry 3 times
  backoff: {
    type: 'exponential',
    delay: 2000             // 2s → 4s → 8s
  },
  removeOnComplete: 100,    // Keep last 100 completed
  removeOnFail: 50          // Keep last 50 failed
}
```

## Development: Mailhog

View sent emails at: **http://localhost:8025**

SMTP Configuration:
```env
SMTP_HOST=mailhog
SMTP_PORT=1025
EMAIL_FROM=noreply@mentory.local
```

## Usage in Services

```typescript
// Inject NotificationsService
constructor(private readonly notifications: NotificationsService) {}

// Send notification
await this.notifications.notifySessionBooked(mentorId, {
  id: session.id,
  mentor: { email: mentor.email, fullName: mentor.fullName },
  mentee: { fullName: mentee.fullName },
  startAt: session.startAt,
  topic: { name: 'JavaScript' }
});
```

## Queue Monitoring

Use Bull Board or similar for production monitoring:

```typescript
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { ExpressAdapter } from '@bull-board/express';

const serverAdapter = new ExpressAdapter();
createBullBoard({
  queues: [new BullAdapter(emailQueue)],
  serverAdapter,
});
```
