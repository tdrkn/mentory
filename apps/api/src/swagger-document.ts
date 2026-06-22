import { OpenAPIObject } from '@nestjs/swagger';

const API_TAGS = [
  { name: 'Health', description: 'Health checks and service readiness.' },
  { name: 'Auth', description: 'Registration, login, email verification and password recovery.' },
  { name: 'Notifications', description: 'In-app notifications and notification settings.' },
  { name: 'Profile', description: 'Current user, mentor and mentee profile management.' },
  { name: 'Discovery', description: 'Public mentor catalog, topics, services and reviews.' },
  { name: 'Scheduling', description: 'Mentor availability rules, slots and services.' },
  { name: 'Booking', description: 'Slot holds, booking confirmation and cancellation.' },
  { name: 'Sessions', description: 'Session details, decisions, notes, video links and reviews.' },
  { name: 'Payments', description: 'Payments, checkout intents, payouts and admin payment actions.' },
  { name: 'Chat', description: 'Conversations, messages, read state and typing indicators.' },
  { name: 'Subscriptions', description: 'Mentorship plans, subscriptions, tasks, bookmarks and credits.' },
  { name: 'Trust', description: 'Complaints, regalia verification and trust operations.' },
  { name: 'Admin', description: 'Administrative moderation and platform operations.' },
];

const PUBLIC_OPERATIONS = new Set([
  'GET /api/health',
  'GET /api/health/ready',
  'GET /api/health/live',
  'POST /api/auth/register',
  'POST /api/auth/login',
  'POST /api/auth/forgot-password',
  'POST /api/auth/reset-password',
  'POST /api/auth/verify-email',
  'POST /api/auth/resend-verification',
  'GET /api/mentors',
  'GET /api/mentors/{id}',
  'GET /api/mentors/{id}/services',
  'GET /api/mentors/{id}/reviews',
  'GET /api/topics',
  'GET /api/scheduling/mentors/{mentorId}/slots',
  'POST /api/payments/webhook',
]);

const METHOD_LABELS: Record<string, string> = {
  get: 'Получить',
  post: 'Создать',
  put: 'Заменить',
  patch: 'Обновить',
  delete: 'Удалить',
};

export function enhanceSwaggerDocument(document: OpenAPIObject): OpenAPIObject {
  document.tags = API_TAGS;

  for (const [path, pathItem] of Object.entries(document.paths)) {
    const tag = resolveTag(path);
    for (const method of Object.keys(pathItem)) {
      const operation = (pathItem as Record<string, any>)[method];
      if (!operation || typeof operation !== 'object') continue;

      operation.tags = operation.tags?.length ? operation.tags : [tag];
      operation.summary = operation.summary || buildSummary(method, path);
      operation.description = operation.description || buildDescription(method, path);

      const operationKey = `${method.toUpperCase()} ${path}`;
      if (!PUBLIC_OPERATIONS.has(operationKey)) {
        operation.security = operation.security?.length ? operation.security : [{ bearer: [] }];
      }
    }
  }

  return document;
}

function resolveTag(path: string) {
  if (path.startsWith('/api/health')) return 'Health';
  if (path.startsWith('/api/auth')) return 'Auth';
  if (path.startsWith('/api/notifications')) return 'Notifications';
  if (path.startsWith('/api/profile')) return 'Profile';
  if (path.startsWith('/api/mentors') || path.startsWith('/api/topics')) return 'Discovery';
  if (path.startsWith('/api/scheduling') || path.startsWith('/api/services')) return 'Scheduling';
  if (path.startsWith('/api/booking')) return 'Booking';
  if (path.startsWith('/api/sessions') || path.startsWith('/api/reviews')) return 'Sessions';
  if (path.startsWith('/api/payments') || path.startsWith('/api/payouts')) return 'Payments';
  if (path.startsWith('/api/chat') || path.startsWith('/api/conversations')) return 'Chat';
  if (path.startsWith('/api/subscriptions')) return 'Subscriptions';
  if (path.startsWith('/api/complaints') || path.startsWith('/api/regalia')) return 'Trust';
  if (path.startsWith('/api/admin')) return 'Admin';
  return 'Mentory API';
}

function buildSummary(method: string, path: string) {
  const label = METHOD_LABELS[method.toLowerCase()] || method.toUpperCase();
  return `${label}: ${humanizePath(path)}`;
}

function buildDescription(method: string, path: string) {
  const publicNote = PUBLIC_OPERATIONS.has(`${method.toUpperCase()} ${path}`)
    ? 'Публичный endpoint.'
    : 'Требуется Bearer JWT.';
  return `${publicNote} Маршрут: ${method.toUpperCase()} ${path}.`;
}

function humanizePath(path: string) {
  return path
    .replace(/^\/api\//, '')
    .replace(/\{([^}]+)\}/g, ':$1')
    .replace(/[/-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
