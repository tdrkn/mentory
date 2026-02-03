# Payments Module

## Overview

Платежи и выплаты:
- Payment Intents (Stripe)
- Webhooks
- Баланс ментора
- Выплаты

## Payment Flow

```
[mentee] POST /payments/intent
    ↓
Frontend: stripe.confirmPayment(clientSecret)
    ↓
[stripe] POST /payments/webhook (payment_intent.succeeded)
    ↓
Session status → paid, Payment status → succeeded
    ↓
After session completed:
[mentor] POST /payouts/request → payout initiated
```

## Fee Structure

- **Platform fee**: 15%
- **Mentor receives**: 85%

Example: $50 session
- Mentee pays: $50
- Platform takes: $7.50
- Mentor receives: $42.50

## Endpoints

### Payments

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/payments/intent | Create payment intent |
| POST | /api/payments/webhook | Stripe webhook |
| GET | /api/payments | Payment history |
| GET | /api/payments/:id | Payment details |

### Payouts

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/payouts | Payout history |
| GET | /api/payouts/balance | Current balance |
| POST | /api/payouts/account | Connect Stripe |
| POST | /api/payouts/request | Request payout |

## curl Examples

```bash
# Create payment intent
curl -X POST http://localhost:4000/api/payments/intent \
  -H "Authorization: Bearer MENTEE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"SESSION_ID"}'

# Get balance
curl http://localhost:4000/api/payouts/balance \
  -H "Authorization: Bearer MENTOR_TOKEN"

# Request payout
curl -X POST http://localhost:4000/api/payouts/request \
  -H "Authorization: Bearer MENTOR_TOKEN"
```
