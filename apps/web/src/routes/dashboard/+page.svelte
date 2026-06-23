<script lang="ts">
  import AppHeader from '$lib/components/AppHeader.svelte';
  import Loading from '$lib/components/Loading.svelte';
  import { api } from '$lib/api';
  import { onMount } from 'svelte';
  import { isMentor, isAuthenticated, isLoading as authLoading, user } from '$lib/stores/auth';
  import { goto } from '$app/navigation';

  interface SessionItem {
    id: string;
    status: string;
    startAt: string;
    requestGoal?: string | null;
    requestMotivation?: string | null;
    mentee: { id: string; fullName: string };
    service: { title: string };
  }

  interface Balance {
    available: number;
    pending: number;
    currency: string;
  }

  let sessions: SessionItem[] = [];
  let balance: Balance | null = null;
  let isLoading = true;
  let actionInProgressId: string | null = null;

  onMount(async () => {
    if (!$isAuthenticated && !$authLoading) {
      goto('/login');
      return;
    }
    if ($isAuthenticated && !$isMentor) {
      goto('/mentors');
      return;
    }

    try {
      sessions = await api.get<SessionItem[]>('/sessions?role=mentor');
      balance = await api.get<Balance>('/payouts/balance');
    } catch {
      // ignore
    } finally {
      isLoading = false;
    }
  });

  const now = new Date();
  const upcoming = () => sessions.filter((s) => new Date(s.startAt) > now && s.status !== 'canceled');
  const pending = () => sessions.filter((s) => s.status === 'requested' || s.status === 'paid');

  const approveRequest = async (sessionId: string) => {
    actionInProgressId = sessionId;
    try {
      await api.patch(`/sessions/${sessionId}/confirm`, {});
      sessions = await api.get<SessionItem[]>('/sessions?role=mentor');
    } finally {
      actionInProgressId = null;
    }
  };

  const rejectRequest = async (sessionId: string) => {
    actionInProgressId = sessionId;
    try {
      await api.patch(`/sessions/${sessionId}/reject`, {
      reason: 'Ментор отклонил заявку',
      });
      sessions = await api.get<SessionItem[]>('/sessions?role=mentor');
    } finally {
      actionInProgressId = null;
    }
  };
</script>

<div class="page">
  <AppHeader />

  {#if $authLoading || isLoading}
    <Loading />
  {:else}
    <main class="container section mentor-dashboard">
      <h1 class="section-title dashboard-title">Добро пожаловать, {$user?.fullName}</h1>
      <p class="muted dashboard-subtitle">Ваш центр управления менторством</p>

      <div class="dashboard-stats">
        <div class="card stat-card">
          <div class="muted">Всего сессий</div>
          <div class="stat-value">{sessions.length}</div>
        </div>
        <div class="card stat-card">
          <div class="muted">Предстоящие</div>
          <div class="stat-value stat-accent">{upcoming().length}</div>
        </div>
        <div class="card stat-card">
          <div class="muted">Ожидают подтверждения</div>
          <div class="stat-value stat-warning">{pending().length}</div>
        </div>
        <div class="card stat-card">
          <div class="muted">Баланс</div>
          <div class="stat-value stat-balance">
            {balance ? `${balance.available} ${balance.currency}` : '—'}
          </div>
        </div>
      </div>

      <div class="card requests-card">
        <div class="card-head">
          <h2 class="section-title card-title">Заявки на встречи со мной</h2>
          <a class="btn btn-outline btn-sm" href="/requests">Все заявки</a>
        </div>
        {#if pending().length === 0}
          <p class="muted">Новых заявок нет.</p>
        {:else}
          <div class="stack">
            {#each pending() as request}
              <div class="surface request-row">
                <div class="request-copy">
                  <strong>{request.mentee.fullName}</strong>
                  <div class="muted">{request.service.title}</div>
                  {#if request.status === 'paid'}
                    <div class="muted request-note request-paid">Оплачено, ожидает вашего подтверждения</div>
                  {/if}
                  {#if request.requestGoal}
                    <div class="muted request-note">Цель: {request.requestGoal}</div>
                  {/if}
                  {#if request.requestMotivation}
                    <div class="muted request-note request-motivation">{request.requestMotivation}</div>
                  {/if}
                  <div class="muted request-note">
                    {new Date(request.startAt).toLocaleDateString('ru-RU')} · {new Date(request.startAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <div class="request-actions">
                  <button
                    class="btn btn-primary"
                    on:click={() => approveRequest(request.id)}
                    disabled={actionInProgressId === request.id}
                  >
                    Принять
                  </button>
                  <button
                    class="btn btn-ghost"
                    on:click={() => rejectRequest(request.id)}
                    disabled={actionInProgressId === request.id}
                  >
                    Отклонить
                  </button>
                  <a class="btn btn-outline" href={`/chat?session=${request.id}`}>Чат</a>
                  <a class="btn btn-outline" href={`/mentees/${request.mentee.id}`}>Профиль менти</a>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <div class="dashboard-main-grid">
        <div class="card">
          <h2 class="section-title card-title">Предстоящие сессии</h2>
          {#if upcoming().length === 0}
            <p class="muted">Пока нет предстоящих сессий.</p>
          {:else}
            <div class="stack">
              {#each upcoming().slice(0, 4) as session}
                <div class="surface session-row">
                  <div>
                    <strong>{session.mentee.fullName}</strong>
                    <div class="muted">{session.service.title}</div>
                  </div>
                  <div class="muted">
                    {new Date(session.startAt).toLocaleDateString('ru-RU')} · {new Date(session.startAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>

        <div class="card">
          <h2 class="section-title card-title">Быстрые действия</h2>
          <div class="stack quick-actions">
            <a class="btn btn-primary" href="/schedule">Управлять расписанием</a>
            <a class="btn btn-ghost" href="/profile/edit">Редактировать профиль</a>
            <a class="btn btn-ghost" href="/earnings">Вывод средств</a>
          </div>
        </div>
      </div>
    </main>
  {/if}
</div>

<style>
  .mentor-dashboard {
    min-width: 0;
    overflow-x: hidden;
  }

  .dashboard-title {
    max-width: 100%;
    overflow-wrap: anywhere;
    line-height: 1.18;
  }

  .dashboard-subtitle {
    margin-top: 6px;
  }

  .dashboard-stats {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
    margin: 18px 0;
  }

  .stat-card {
    min-height: 110px;
    display: grid;
    align-content: start;
    gap: 8px;
  }

  .stat-value {
    font-size: 1.8rem;
    line-height: 1.1;
    font-weight: 700;
    overflow-wrap: anywhere;
  }

  .stat-accent {
    color: var(--accent);
  }

  .stat-warning {
    color: var(--amber);
  }

  .stat-balance {
    font-size: 1.35rem;
  }

  .requests-card {
    margin-bottom: 20px;
  }

  .card-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 8px;
  }

  .card-title {
    margin: 0;
    line-height: 1.18;
    overflow-wrap: anywhere;
  }

  .request-row,
  .session-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    min-width: 0;
  }

  .request-copy {
    min-width: min(100%, 260px);
    flex: 1 1 320px;
  }

  .request-note {
    font-size: 0.86rem;
  }

  .request-paid {
    color: var(--accent);
  }

  .request-motivation {
    max-width: 520px;
  }

  .request-actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: flex-end;
    min-width: 0;
  }

  .dashboard-main-grid {
    display: grid;
    grid-template-columns: minmax(0, 2fr) minmax(260px, 1fr);
    gap: 20px;
  }

  .quick-actions .btn {
    width: 100%;
    justify-content: center;
    white-space: normal;
    text-align: center;
  }

  @media (max-width: 1100px) {
    .dashboard-stats {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 980px) {
    .dashboard-main-grid {
      grid-template-columns: minmax(0, 1fr);
    }

    .quick-actions {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
    }
  }

  @media (max-width: 700px) {
    .dashboard-stats,
    .quick-actions {
      grid-template-columns: minmax(0, 1fr);
    }

    .card-head,
    .request-row,
    .session-row {
      align-items: stretch;
    }

    .card-head .btn,
    .request-actions,
    .request-actions .btn {
      width: 100%;
    }

    .request-actions {
      justify-content: stretch;
    }
  }

  @media (max-width: 480px) {
    .mentor-dashboard {
      padding-inline: 14px;
    }

    .stat-card,
    .mentor-dashboard :global(.card) {
      padding: 18px;
    }
  }
</style>
