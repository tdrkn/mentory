# Notifications Module

## Overview

Система уведомлений:
- In-app notifications
- Email notifications (via MailHog in dev)
- Push notifications (future)

## Notification Types

| Type | Trigger |
|------|---------|
| session_booked | Mentee books session |
| session_confirmed | Mentor confirms |
| session_canceled | Either party cancels |
| session_reminder | 15min before session |
| new_message | New chat message |
| new_review | Review received |
| payment_received | Payment succeeded |
| payout_sent | Payout initiated |

## Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/notifications | Get notifications |
| GET | /api/notifications/unread-count | Unread count |
| GET | /api/notifications/settings | Get settings |
| PATCH | /api/notifications/settings | Update settings |
| PATCH | /api/notifications/:id/read | Mark as read |
| PATCH | /api/notifications/read-all | Mark all as read |

## curl Examples

```bash
# Get notifications
curl http://localhost:4000/api/notifications \
  -H "Authorization: Bearer TOKEN"

# Get unread count
curl http://localhost:4000/api/notifications/unread-count \
  -H "Authorization: Bearer TOKEN"

# Mark all as read
curl -X PATCH http://localhost:4000/api/notifications/read-all \
  -H "Authorization: Bearer TOKEN"
```

## Settings Structure

```json
{
  "email": {
    "sessionReminder": true,
    "sessionBooked": true,
    "sessionCanceled": true,
    "newMessage": true,
    "newReview": true,
    "paymentReceived": true,
    "marketingEmails": false
  },
  "push": {
    "sessionReminder": true,
    "sessionBooked": true,
    "sessionCanceled": true,
    "newMessage": true,
    "newReview": true,
    "paymentReceived": true
  }
}
```
