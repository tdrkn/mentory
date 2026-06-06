<script lang="ts">
  import AppHeader from '$lib/components/AppHeader.svelte';
  import Loading from '$lib/components/Loading.svelte';
  import { api, ApiError } from '$lib/api';
  import { goto } from '$app/navigation';
  import { isAuthenticated, isLoading as authLoading, user } from '$lib/stores/auth';

  type RequestKind = 'sessions' | 'subscriptions';
  type RequestFilter = 'waiting' | 'approved' | 'paid' | 'rejected' | 'all';
  type SubscriptionStatus = 'pending' | 'approved_pending_payment' | 'active' | 'paused' | 'ended' | 'rejected';

  interface UserRef {
    id: string;
    fullName: string;
    email?: string;
  }

  interface SessionRequest {
    id: string;
    mentorId: string;
    menteeId: string;
    status: string;
    startAt: string;
    endAt: string;
    requestGoal?: string | null;
    requestMotivation?: string | null;
    cancelReason?: string | null;
    decisionComment?: string | null;
    decidedAt?: string | null;
    mentor: UserRef;
    mentee: UserRef;
    service: { id: string; title: string; durationMin: number };
  }

  interface MentorshipSubscription {
    id: string;
    mentorId: string;
    menteeId: string;
    status: SubscriptionStatus;
    startedAt: string;
    requestGoal?: string | null;
    requestMotivation?: string | null;
    notes?: string | null;
    monthlyPrice?: number | string | null;
    currency: string;
    plan?: {
      id: string;
      title: string;
      priceAmount: number | string;
      currency: string;
      billingIntervalMonths: number;
    };
    mentor?: UserRef;
    mentee?: UserRef;
  }

  let kind: RequestKind = 'sessions';
  let filter: RequestFilter = 'waiting';
  let sessions: SessionRequest[] = [];
  let subscriptions: MentorshipSubscription[] = [];
  let reasonById: Record<string, string> = {};
  let isLoading = true;
  let isBusy = false;
  let actionMessage = '';
  let errorMessage = '';
  let didLoad = false;

  $: isMentorScope = $user?.role === 'mentor' || $user?.role === 'both' || $user?.role === 'admin';
  $: sessionRequests = sessions.filter((item) => matchesFilter(normalizeSessionState(item.status), filter));
  $: subscriptionRequests = subscriptions.filter((item) => matchesFilter(normalizeSubscriptionState(item.status), filter));
  $: waitingCount = sessions.filter((item) => normalizeSessionState(item.status) === 'waiting').length +
    subscriptions.filter((item) => normalizeSubscriptionState(item.status) === 'waiting').length;

  $: if (!$authLoading) {
    if (!$isAuthenticated) {
      goto('/login');
    } else if (!didLoad) {
      didLoad = true;
      loadPage();
    }
  }

  async function loadPage() {
    isLoading = true;
    errorMessage = '';
    actionMessage = '';

    try {
      const [sessionData, subscriptionData] = await Promise.all([
        api.get<SessionRequest[]>('/sessions'),
        api.get<MentorshipSubscription[]>('/subscriptions/mine'),
      ]);
      sessions = sessionData;
      subscriptions = subscriptionData;
    } catch (err) {
      errorMessage = extractError(err);
    } finally {
      isLoading = false;
    }
  }

  async function approveSession(sessionId: string) {
    await withBusy(async () => {
      await api.patch(`/sessions/${sessionId}/confirm`, {
        reason: reasonById[sessionId]?.trim() || undefined,
      });
      actionMessage = 'Заявка на сессию подтверждена.';
      await loadPage();
    });
  }

  async function rejectSession(sessionId: string) {
    await withBusy(async () => {
      await api.patch(`/sessions/${sessionId}/reject`, {
        reason: reasonById[sessionId]?.trim() || 'Ментор отклонил заявку',
      });
      actionMessage = 'Заявка на сессию отклонена.';
      await loadPage();
    });
  }

  async function approveSubscription(subscriptionId: string) {
    await withBusy(async () => {
      await api.patch(`/subscriptions/${subscriptionId}/status`, {
        status: 'approved_pending_payment',
        reason: reasonById[subscriptionId]?.trim() || undefined,
      });
      actionMessage = 'Подписка одобрена. Менти может перейти к оплате.';
      await loadPage();
    });
  }

  async function rejectSubscription(subscriptionId: string) {
    await withBusy(async () => {
      await api.patch(`/subscriptions/${subscriptionId}/status`, {
        status: 'rejected',
        reason: reasonById[subscriptionId]?.trim() || 'Ментор отклонил заявку',
      });
      actionMessage = 'Заявка на подписку отклонена.';
      await loadPage();
    });
  }

  async function withBusy(action: () => Promise<void>) {
    isBusy = true;
    errorMessage = '';
    actionMessage = '';
    try {
      await action();
    } catch (err) {
      errorMessage = extractError(err);
    } finally {
      isBusy = false;
    }
  }

  function normalizeSessionState(status: string): RequestFilter {
    if (status === 'requested' || status === 'paid') return 'waiting';
    if (status === 'booked') return 'approved';
    if (status === 'rejected') return 'rejected';
    return 'all';
  }

  function normalizeSubscriptionState(status: SubscriptionStatus): RequestFilter {
    if (status === 'pending') return 'waiting';
    if (status === 'approved_pending_payment') return 'approved';
    if (status === 'active' || status === 'paused') return 'paid';
    if (status === 'rejected') return 'rejected';
    return 'all';
  }

  function matchesFilter(state: RequestFilter, activeFilter: RequestFilter) {
    return activeFilter === 'all' || state === activeFilter;
  }

  function formatSessionStatus(status: string) {
    if (status === 'requested') return 'Ожидает оплаты';
    if (status === 'paid') return 'Оплачена, ждет решения';
    if (status === 'booked') return 'Подтверждена';
    if (status === 'rejected') return 'Отклонена';
    if (status === 'canceled') return 'Отменена';
    if (status === 'completed') return 'Завершена';
    return status;
  }

  function formatSubscriptionStatus(status: SubscriptionStatus) {
    if (status === 'pending') return 'На рассмотрении';
    if (status === 'approved_pending_payment') return 'Одобрена, ожидает оплаты';
    if (status === 'active') return 'Оплачена и активна';
    if (status === 'paused') return 'На паузе';
    if (status === 'ended') return 'Завершена';
    return 'Отклонена';
  }

  function badgeClass(state: RequestFilter) {
    if (state === 'waiting') return 'warning';
    if (state === 'approved' || state === 'paid') return 'success';
    if (state === 'rejected') return 'error';
    return '';
  }

  function formatDateTime(value: string) {
    return new Date(value).toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function formatMoney(value: number | string | null | undefined, currency = 'RUB') {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(Number(value || 0));
  }

  function partnerName(item: { mentorId: string; menteeId: string; mentor?: UserRef; mentee?: UserRef }) {
    return item.mentorId === $user?.id ? item.mentee?.fullName : item.mentor?.fullName;
  }

  function extractError(err: unknown) {
    if (err instanceof ApiError) {
      const message = err.data?.message;
      if (Array.isArray(message)) return message.join(', ');
      if (typeof message === 'string') return message;
      return `Ошибка API (${err.status})`;
    }
    if (err instanceof Error) return err.message;
    return 'Неизвестная ошибка';
  }
</script>

<div class="page">
  <AppHeader />

  {#if $authLoading || isLoading}
    <Loading />
  {:else}
    <main class="requests-shell">
      <header class="page-head">
        <div>
          <h1>Управление заявками</h1>
          <p class="muted">Разовые сессии и подписки проходят отдельные стадии согласования.</p>
        </div>
        <button class="btn btn-outline" on:click={loadPage} disabled={isBusy}>Обновить</button>
      </header>

      {#if actionMessage}
        <div class="alert status-success">{actionMessage}</div>
      {/if}
      {#if errorMessage}
        <div class="alert status-error">{errorMessage}</div>
      {/if}

      <div class="toolbar">
        <div class="segmented">
          <button class:active={kind === 'sessions'} on:click={() => (kind = 'sessions')}>Разовые сессии</button>
          <button class:active={kind === 'subscriptions'} on:click={() => (kind = 'subscriptions')}>Подписки</button>
        </div>
        <div class="filters">
          <button class:active={filter === 'waiting'} on:click={() => (filter = 'waiting')}>
            В ожидании {#if waitingCount > 0}<span>{waitingCount}</span>{/if}
          </button>
          <button class:active={filter === 'approved'} on:click={() => (filter = 'approved')}>Одобренные</button>
          <button class:active={filter === 'paid'} on:click={() => (filter = 'paid')}>Оплаченные</button>
          <button class:active={filter === 'rejected'} on:click={() => (filter = 'rejected')}>Отклоненные</button>
          <button class:active={filter === 'all'} on:click={() => (filter = 'all')}>Все</button>
        </div>
      </div>

      {#if kind === 'sessions'}
        {#if sessionRequests.length === 0}
          <section class="empty-state">
            <strong>Заявок по разовым сессиям нет.</strong>
            <p class="muted">Когда менти оплатит сессию, она появится здесь для решения ментора.</p>
          </section>
        {:else}
          <section class="request-list">
            {#each sessionRequests as item}
              {@const state = normalizeSessionState(item.status)}
              <article class="request-card">
                <div class="card-top">
                  <div>
                    <h2>{item.service.title}</h2>
                    <p class="muted">С {partnerName(item) || 'участником'} · {formatDateTime(item.startAt)}</p>
                  </div>
                  <span class="badge {badgeClass(state)}">{formatSessionStatus(item.status)}</span>
                </div>

                <div class="meta-grid">
                  <div><span>Ментор</span><strong>{item.mentor.fullName}</strong></div>
                  <div><span>Менти</span><strong>{item.mentee.fullName}</strong></div>
                  <div><span>Длительность</span><strong>{item.service.durationMin} мин</strong></div>
                </div>

                {#if item.requestGoal || item.requestMotivation}
                  <div class="surface compact">
                    {#if item.requestGoal}<p><strong>Цель:</strong> {item.requestGoal}</p>{/if}
                    {#if item.requestMotivation}<p><strong>Мотивация:</strong> {item.requestMotivation}</p>{/if}
                  </div>
                {/if}

                {#if item.decisionComment || item.cancelReason}
                  <p class="decision">Комментарий: {item.decisionComment || item.cancelReason}</p>
                {/if}

                <div class="actions">
                  <a class="btn btn-outline" href={`/sessions/${item.id}`}>Открыть</a>
                  {#if isMentorScope && item.mentorId === $user?.id && (item.status === 'requested' || item.status === 'paid')}
                    <input
                      class="input decision-input"
                      placeholder="Комментарий к решению"
                      bind:value={reasonById[item.id]}
                    />
                    <button class="btn btn-primary" on:click={() => approveSession(item.id)} disabled={isBusy}>Подтвердить</button>
                    <button class="btn btn-ghost" on:click={() => rejectSession(item.id)} disabled={isBusy}>Отклонить</button>
                  {/if}
                </div>
              </article>
            {/each}
          </section>
        {/if}
      {:else}
        {#if subscriptionRequests.length === 0}
          <section class="empty-state">
            <strong>Заявок по подпискам нет.</strong>
            <p class="muted">Заявки на менторские программы появятся здесь после отправки формы менти.</p>
          </section>
        {:else}
          <section class="request-list">
            {#each subscriptionRequests as item}
              {@const state = normalizeSubscriptionState(item.status)}
              <article class="request-card">
                <div class="card-top">
                  <div>
                    <h2>{item.plan?.title || 'Программа менторства'}</h2>
                    <p class="muted">С {partnerName(item) || 'участником'} · заявка от {formatDateTime(item.startedAt)}</p>
                  </div>
                  <span class="badge {badgeClass(state)}">{formatSubscriptionStatus(item.status)}</span>
                </div>

                <div class="meta-grid">
                  <div><span>Ментор</span><strong>{item.mentor?.fullName || item.mentorId}</strong></div>
                  <div><span>Менти</span><strong>{item.mentee?.fullName || item.menteeId}</strong></div>
                  <div><span>Стоимость</span><strong>{formatMoney(item.monthlyPrice ?? item.plan?.priceAmount, item.currency || item.plan?.currency)}</strong></div>
                </div>

                {#if item.requestGoal || item.requestMotivation || item.notes}
                  <div class="surface compact">
                    {#if item.requestGoal}<p><strong>Цель:</strong> {item.requestGoal}</p>{/if}
                    {#if item.requestMotivation}<p><strong>Мотивация:</strong> {item.requestMotivation}</p>{/if}
                    {#if item.notes}<p><strong>Комментарий:</strong> {item.notes}</p>{/if}
                  </div>
                {/if}

                <div class="actions">
                  <a class="btn btn-outline" href="/subscriptions">Открыть подписки</a>
                  {#if isMentorScope && item.mentorId === $user?.id && item.status === 'pending'}
                    <input
                      class="input decision-input"
                      placeholder="Комментарий к решению"
                      bind:value={reasonById[item.id]}
                    />
                    <button class="btn btn-primary" on:click={() => approveSubscription(item.id)} disabled={isBusy}>Одобрить</button>
                    <button class="btn btn-ghost" on:click={() => rejectSubscription(item.id)} disabled={isBusy}>Отклонить</button>
                  {/if}
                  {#if item.menteeId === $user?.id && item.status === 'approved_pending_payment'}
                    <a class="btn btn-primary" href={`/checkout/subscriptions/${item.id}`}>Оплатить подписку</a>
                  {/if}
                </div>
              </article>
            {/each}
          </section>
        {/if}
      {/if}
    </main>
  {/if}
</div>

<style>
  .requests-shell {
    width: min(1120px, calc(100vw - 32px));
    margin: 0 auto;
    padding: 28px 0 48px;
  }

  .page-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    margin-bottom: 18px;
  }

  .page-head h1 {
    margin: 0 0 6px;
    font-size: 2rem;
    line-height: 1.15;
  }

  .toolbar {
    display: grid;
    gap: 12px;
    margin: 18px 0;
  }

  .segmented,
  .filters {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .segmented button,
  .filters button {
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--ink-secondary);
    border-radius: var(--radius-md);
    padding: 9px 12px;
    font-weight: 600;
    cursor: pointer;
  }

  .segmented button.active,
  .filters button.active {
    color: var(--accent-link);
    border-color: var(--accent);
    background: var(--accent-muted);
  }

  .filters span {
    margin-left: 6px;
    font-size: 0.8rem;
    color: var(--status-warning-ink);
  }

  .request-list {
    display: grid;
    gap: 12px;
  }

  .request-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 16px;
    display: grid;
    gap: 12px;
  }

  .card-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  .card-top h2 {
    margin: 0 0 4px;
    font-size: 1.05rem;
  }

  .meta-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }

  .meta-grid span {
    display: block;
    color: var(--ink-secondary);
    font-size: 0.82rem;
    margin-bottom: 2px;
  }

  .compact {
    display: grid;
    gap: 4px;
    padding: 12px;
  }

  .compact p,
  .decision {
    margin: 0;
  }

  .decision {
    color: var(--ink-secondary);
    font-size: 0.92rem;
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .decision-input {
    min-width: 220px;
    flex: 1 1 260px;
  }

  .empty-state {
    border: 1px dashed var(--border);
    border-radius: var(--radius-md);
    padding: 22px;
    background: var(--surface);
  }

  @media (max-width: 760px) {
    .requests-shell {
      width: min(100vw - 24px, 1120px);
      padding-top: 18px;
    }

    .page-head,
    .card-top {
      flex-direction: column;
      align-items: stretch;
    }

    .meta-grid {
      grid-template-columns: 1fr;
    }

    .actions .btn,
    .actions a,
    .decision-input {
      width: 100%;
    }
  }
</style>
