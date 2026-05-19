<script lang="ts">
  import AppHeader from '$lib/components/AppHeader.svelte';
  import Loading from '$lib/components/Loading.svelte';
  import { api } from '$lib/api';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { user, isAuthenticated, isLoading as authLoading } from '$lib/stores/auth';
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

  let sessions: SessionItem[] = [];
  let isLoading = true;
  let filter: 'upcoming' | 'past' | 'all' = 'upcoming';

  const showSuccess = () => $page.url.searchParams.get('success') === '1';

  const loadSessions = async () => {
    isLoading = true;
    sessions = await api.get<SessionItem[]>('/sessions');
    isLoading = false;
  };

  onMount(async () => {
    if (!$isAuthenticated && !$authLoading) {
      goto('/login');
      return;
    }
    if ($isAuthenticated) {
      await loadSessions();
    }
  });

  const filtered = () => {
    const now = new Date();
    return sessions.filter((session) => {
      const sessionDate = new Date(session.startAt);
      if (filter === 'upcoming') {
        return sessionDate > now && session.status !== 'canceled';
      }
      if (filter === 'past') {
        return sessionDate <= now || session.status === 'completed';
      }
      return true;
    });
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case 'requested':
        return 'Ожидает подтверждения';
      case 'booked':
        return 'Подтверждена';
      case 'paid':
        return 'Оплачена, ждет подтверждения';
      case 'completed':
        return 'Завершена';
      case 'canceled':
        return 'Отменена';
      default:
        return status;
    }
  };

  const statusClass = (status: string) => {
    if (status === 'completed') return 'status-success';
    if (status === 'requested' || status === 'paid') return 'status-warning';
    if (status === 'canceled') return 'status-error';
    return '';
  };
</script>

<div class="page">
  <AppHeader />

  {#if $authLoading || isLoading}
    <Loading />
  {:else}
    <main class="container section" style="max-width:860px;">
      <h1 class="section-title">Мои сессии</h1>

      {#if showSuccess()}
        <div class="surface" style="margin-top:12px;background:var(--status-success-bg);border-color:var(--status-success-border);color:var(--status-success-ink);">
          🎉 Сессия успешно забронирована!
        </div>
      {/if}

      <div style="display:flex;gap:8px;margin:16px 0;flex-wrap:wrap;">
        <button class={`btn ${filter === 'upcoming' ? 'btn-primary' : 'btn-ghost'}`} on:click={() => (filter = 'upcoming')}>
          Предстоящие
        </button>
        <button class={`btn ${filter === 'past' ? 'btn-primary' : 'btn-ghost'}`} on:click={() => (filter = 'past')}>
          Прошедшие
        </button>
        <button class={`btn ${filter === 'all' ? 'btn-primary' : 'btn-ghost'}`} on:click={() => (filter = 'all')}>
          Все
        </button>
      </div>

      {#if filtered().length === 0}
        <div class="card">
          <p class="muted">Сессии не найдены.</p>
          <a class="btn btn-primary" href="/mentors">Найти ментора</a>
        </div>
      {:else}
        <div class="stack">
          {#each filtered() as session}
            {@const partner = $user?.role === 'mentor' || $user?.role === 'both' ? session.mentee : session.mentor}
            <div class="card">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <div>
                  <strong>{partner.fullName}</strong>
                  <div class="muted">{session.service.title}</div>
                </div>
                <span class={`badge ${statusClass(session.status)}`}>{statusLabel(session.status)}</span>
              </div>
              <div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:10px;" class="muted">
                <span>📅 {new Date(session.startAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                <span>🕐 {new Date(session.startAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div style="display:flex;gap:8px;margin-top:12px;">
                <a class="btn btn-outline" href={`/sessions/${session.id}`}>Подробнее</a>
                <a class="btn btn-ghost" href={`/chat?session=${session.id}`}>Открыть чат</a>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </main>
  {/if}
</div>
