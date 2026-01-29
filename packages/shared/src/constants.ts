export const SESSION_DURATIONS = [30, 45, 60, 90] as const;

export const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'RUB'] as const;

export const USER_ROLES = ['mentee', 'mentor', 'both', 'admin'] as const;

export const SESSION_STATUSES = [
  'requested',
  'booked',
  'paid',
  'canceled',
  'completed',
  'no_show',
] as const;

export const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded'] as const;
