<script lang="ts">
  import AppHeader from '$lib/components/AppHeader.svelte';
  import Loading from '$lib/components/Loading.svelte';
  import { api } from '$lib/api';
  import { page } from '$app/stores';
  import { user, isAuthenticated, isLoading as authLoading, isMentor } from '$lib/stores/auth';
  import { goto } from '$app/navigation';

  interface SessionItem {
    id: string;
    mentorId: string;
    menteeId: string;
    status: string;
    startAt: string;
    endAt: string;
    mentor: { id: string; fullName: string };
    mentee: { id: string; fullName: string };
    service: { id: string; title: string; durationMin: number };
  }

  interface SlotItem {
    id: string;
    startAt: string;
    endAt: string;
    status: string;
  }

  let sessions: SessionItem[] = [];
  let freeSlots: SlotItem[] = [];
  let isLoading = true;
  let isSlotsLoading = false;
  let didLoad = false;
  let didInitTab = false;

  // Tabs: upcoming / past / pending / all
  type SessionTab = 'upcoming' | 'past' | 'pending' | 'all';
  let tab: SessionTab = 'upcoming';

  const showSuccess = () => $page.url.searchParams.get('success') === '1';

  const parseTab = (value: string | null): SessionTab | null => {
    if (value === 'upcoming' || value === 'past' || value === 'pending' || value === 'all') {
      return value;
    }
    return null;
  };

  const loadSessions = async () => {
    isLoading = true;
    try {
      sessions = await api.get<SessionItem[]>('/sessions');
      const explicitTab = parseTab($page.url.searchParams.get('tab'));
      if (!explicitTab && sessions.some((s) => s.status === 'requested' || s.status === 'paid')) {
        tab = 'pending';
      }
    } finally {
      isLoading = false;
    }
  };

  const loadFreeSlots = async () => {
    if (!$isMentor) return;
    isSlotsLoading = true;
    try {
      const data = await api.get<SlotItem[] | { slots: SlotItem[] }>('/scheduling/slots?status=free');
      freeSlots = Array.isArray(data) ? data : (data as any).slots ?? [];
      // Sort by date, show upcoming only
      const now = new Date();
      freeSlots = freeSlots
        .filter((s) => new Date(s.startAt) > now)
        .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
        .slice(0, 10);
    } catch {
      freeSlots = [];
    } finally {
      isSlotsLoading = false;
    }
  };

  $: if (!$authLoading) {
    if (!didInitTab) {
      tab = parseTab($page.url.searchParams.get('tab')) ?? (showSuccess() ? 'pending' : 'upcoming');
      didInitTab = true;
    }

    if (!$isAuthenticated) {
      goto('/login');
    } else if (!didLoad) {
      didLoad = true;
      loadSessions();
      loadFreeSlots();
    }
  }

  const filtered = (sessions: SessionItem[], activeTab: SessionTab) => {
    const now = new Date();
    return sessions.filter((s) => {
      const date = new Date(s.startAt);
      switch (activeTab) {
        case 'upcoming':
          return date > now && s.status !== 'canceled' && s.status !== 'rejected' && s.status !== 'requested' && s.status !== 'paid';
        case 'past':
          return date <= now || s.status === 'completed' || s.status === 'canceled' || s.status === 'rejected';
        case 'pending':
          return s.status === 'requested' || s.status === 'paid';
        case 'all':
          return true;
      }
    });
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case 'requested': return 'Ожидает подтверждения';
      case 'booked':    return 'Подтверждена';
      case 'paid':      return 'Оплачена, ждёт подтверждения';
      case 'completed': return 'Завершена';
      case 'rejected':  return 'Отклонена';
      case 'canceled':  return 'Отменена';
      default:          return status;
    }
  };

  const statusClass = (status: string) => {
    if (status === 'completed') return 'badge-success';
    if (status === 'booked')    return 'badge-info';
    if (status === 'requested' || status === 'paid') return 'badge-warning';
    if (status === 'canceled' || status === 'rejected') return 'badge-error';
    return '';
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

  const formatSlotFull = (iso: string) =>
    new Date(iso).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

  const sessionActionLabel = (status: string) => {
    if (status === 'requested' || status === 'paid') {
      return $isMentor ? 'Согласовать встречу' : 'Посмотреть заявку';
    }
    if (status === 'completed' && !$isMentor) return 'Оценить ментора';
    return 'Открыть сессию';
  };

  const sortSessions = (items: SessionItem[]) => {
    return [...items].sort((a, b) => {
      const pendingA = a.status === 'requested' || a.status === 'paid';
      const pendingB = b.status === 'requested' || b.status === 'paid';
      if (pendingA !== pendingB) return pendingA ? -1 : 1;
      return new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
    });
  };

  // Pending count badge
  $: pendingCount = sessions.filter((s) => s.status === 'requested' || s.status === 'paid').length;

  // Active tab list (reactive)
  $: list = sortSessions(filtered(sessions, tab));
</script>

<div class="page">
  <AppHeader />

  {#if $authLoading || isLoading}
    <Loading />
  {:else}
    <main class="shell">
      <h1 class="page-title">Мои сессии</h1>

      {#if showSuccess()}
        <div class="alert alert-success">
          🎉 Сессия успешно забронирована!
        </div>
      {/if}

      <!-- Tab row -->
      <div class="tab-row">
        <button class="tab-btn {tab === 'pending' ? 'tab-active' : ''}" on:click={() => (tab = 'pending')}>
          На согласовании
          {#if pendingCount > 0}
            <span class="badge-count">{pendingCount}</span>
          {/if}
        </button>
        <button class="tab-btn {tab === 'upcoming' ? 'tab-active' : ''}" on:click={() => (tab = 'upcoming')}>
          Предстоящие
        </button>
        <button class="tab-btn {tab === 'past' ? 'tab-active' : ''}" on:click={() => (tab = 'past')}>
          Прошедшие
        </button>
        <button class="tab-btn {tab === 'all' ? 'tab-active' : ''}" on:click={() => (tab = 'all')}>
          Все
        </button>
      </div>

      <!-- Session list -->
      {#if list.length === 0}
        <div class="empty-card">
          <p>Сессии не найдены.</p>
          {#if tab === 'upcoming' || tab === 'all'}
            <a class="btn btn-primary" href="/mentors">Найти ментора</a>
          {/if}
        </div>
      {:else}
        <div class="session-list">
          {#each list as s}
            {@const partner = $user?.role === 'mentor' || $user?.role === 'both' ? s.mentee : s.mentor}
            <div class="session-card">
              <div class="session-card-top">
                <div class="session-info">
                  <strong class="session-partner">{partner.fullName}</strong>
                  <span class="session-service">{s.service.title}</span>
                </div>
                <span class="badge {statusClass(s.status)}">{statusLabel(s.status)}</span>
              </div>

              <div class="session-meta">
                <span>📅 {formatDate(s.startAt)}</span>
                <span>🕐 {formatTime(s.startAt)}</span>
                <span>⏱ {s.service.durationMin} мин</span>
              </div>

              <div class="session-actions">
                <a class="btn btn-outline" href={`/sessions/${s.id}`}>{sessionActionLabel(s.status)}</a>
                <a class="btn btn-ghost" href={`/chat?session=${s.id}`}>Чат с {$isMentor ? 'менти' : 'ментором'}</a>
              </div>
            </div>
          {/each}
        </div>
      {/if}

      <!-- Mentor: free slots block -->
      {#if $isMentor}
        <section class="slots-section">
          <h2 class="slots-title">Свободные временные слоты</h2>
          {#if isSlotsLoading}
            <p class="muted-text">Загрузка…</p>
          {:else if freeSlots.length === 0}
            <p class="muted-text">Нет предстоящих свободных слотов.</p>
            <a class="btn btn-outline" href="/schedule">Управление расписанием</a>
          {:else}
            <div class="slots-grid">
              {#each freeSlots as slot}
                <div class="slot-pill">
                  {formatSlotFull(slot.startAt)}
                </div>
              {/each}
            </div>
            <a class="btn btn-ghost" href="/schedule" style="margin-top:12px;display:inline-flex;">
              Управление расписанием →
            </a>
          {/if}
        </section>
      {/if}
    </main>
  {/if}
</div>

<style>
  .shell {
    max-width: 880px;
    margin: 0 auto;
    padding: 48px 20px 100px;
  }

  .page-title {
    font-size: 1.75rem;
    font-weight: 800;
    margin: 0 0 24px;
    color: var(--ink);
  }

  .alert-success {
    background: var(--status-success-bg);
    border: 1px solid var(--status-success-border);
    color: var(--status-success-ink);
    border-radius: var(--radius-md);
    padding: 12px 16px;
    margin-bottom: 20px;
    font-weight: 500;
  }

  /* Tabs */
  .tab-row {
    display: flex;
    gap: 4px;
    margin-bottom: 20px;
    flex-wrap: wrap;
    border-bottom: 2px solid var(--border);
    padding-bottom: 0;
  }

  .tab-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 10px 18px;
    border: none;
    background: transparent;
    cursor: pointer;
    font-size: 0.92rem;
    font-weight: 600;
    color: var(--muted);
    border-bottom: 2px solid transparent;
    margin-bottom: -2px;
    transition: all 0.15s ease;
    border-radius: var(--radius-md) var(--radius-md) 0 0;
  }

  .tab-btn:hover {
    color: var(--accent);
    background: var(--accent-muted);
  }

  .tab-btn.tab-active {
    color: var(--accent);
    border-bottom-color: var(--accent);
  }

  .badge-count {
    background: var(--status-warning-bg);
    color: var(--status-warning-ink);
    border-radius: 999px;
    padding: 1px 7px;
    font-size: 0.75rem;
    font-weight: 700;
  }

  /* Session cards */
  .session-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .session-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 20px 22px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .session-card-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  .session-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .session-partner {
    font-size: 1rem;
    color: var(--ink);
  }

  .session-service {
    font-size: 0.88rem;
    color: var(--muted);
  }

  .badge {
    display: inline-flex;
    align-items: center;
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 0.78rem;
    font-weight: 600;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .badge-success {
    background: var(--status-success-bg);
    color: var(--status-success-ink);
  }

  .badge-warning {
    background: var(--status-warning-bg);
    color: var(--status-warning-ink);
  }

  .badge-error {
    background: var(--status-error-bg);
    color: var(--status-error-ink);
  }

  .badge-info {
    background: var(--accent-muted);
    color: var(--accent);
  }

  .session-meta {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
    font-size: 0.88rem;
    color: var(--muted);
  }

  .session-actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  /* Empty state */
  .empty-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 32px 24px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
  }

  .empty-card p {
    color: var(--muted);
    margin: 0;
  }

  /* Free slots block */
  .slots-section {
    margin-top: 40px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 24px;
  }

  .slots-title {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--ink);
    margin: 0 0 16px;
  }

  .muted-text {
    color: var(--muted);
    font-size: 0.9rem;
    margin: 0 0 12px;
  }

  .slots-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .slot-pill {
    background: var(--bg-alt);
    border: 1.5px solid var(--border);
    border-radius: 999px;
    padding: 6px 14px;
    font-size: 0.85rem;
    color: var(--ink-secondary);
    font-weight: 500;
  }

  @media (max-width: 600px) {
    .shell {
      padding: 28px 16px 80px;
    }

    .tab-row {
      overflow-x: auto;
      flex-wrap: nowrap;
      padding-bottom: 0;
    }

    .tab-btn {
      white-space: nowrap;
    }

    .session-card-top {
      flex-direction: column;
    }
  }
</style>
