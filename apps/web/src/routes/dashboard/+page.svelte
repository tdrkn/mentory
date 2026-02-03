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
  const pending = () => sessions.filter((s) => s.status === 'requested');
</script>

<div class="page">
  <AppHeader />

  {#if $authLoading || isLoading}
    <Loading />
  {:else}
    <main class="container section">
      <h1 class="section-title">Добро пожаловать, {$user?.fullName}</h1>
      <p class="muted">Ваш центр управления менторством</p>

      <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr));margin:18px 0;gap:12px;">
        <div class="card">
          <div class="muted">Всего сессий</div>
          <div style="font-size:1.8rem;font-weight:700;">{sessions.length}</div>
        </div>
        <div class="card">
          <div class="muted">Предстоящие</div>
          <div style="font-size:1.8rem;font-weight:700;color:var(--accent);">{upcoming().length}</div>
        </div>
        <div class="card">
          <div class="muted">Ожидают подтверждения</div>
          <div style="font-size:1.8rem;font-weight:700;color:var(--amber);">{pending().length}</div>
        </div>
        <div class="card">
          <div class="muted">Баланс</div>
          <div style="font-size:1.4rem;font-weight:700;">
            {balance ? `${balance.available} ${balance.currency}` : '—'}
          </div>
        </div>
      </div>

      <div class="grid" style="grid-template-columns:2fr 1fr;gap:20px;">
        <div class="card">
          <h2 class="section-title">Предстоящие сессии</h2>
          {#if upcoming().length === 0}
            <p class="muted">Пока нет предстоящих сессий.</p>
          {:else}
            <div class="stack">
              {#each upcoming().slice(0, 4) as session}
                <div class="surface" style="display:flex;justify-content:space-between;align-items:center;">
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
          <h2 class="section-title">Быстрые действия</h2>
          <div class="stack">
            <a class="btn btn-primary" href="/schedule">Управлять расписанием</a>
            <a class="btn btn-ghost" href="/profile/edit">Редактировать профиль</a>
            <a class="btn btn-ghost" href="/earnings">Вывод средств</a>
          </div>
        </div>
      </div>
    </main>
  {/if}
</div>
