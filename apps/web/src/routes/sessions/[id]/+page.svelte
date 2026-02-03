<script lang="ts">
  import AppHeader from '$lib/components/AppHeader.svelte';
  import Loading from '$lib/components/Loading.svelte';
  import { api } from '$lib/api';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { user, isAuthenticated, isLoading as authLoading, isMentor } from '$lib/stores/auth';
  import { goto } from '$app/navigation';

  interface SessionDetail {
    id: string;
    mentorId: string;
    menteeId: string;
    status: string;
    startAt: string;
    endAt: string;
    mentor: { id: string; fullName: string; email: string };
    mentee: { id: string; fullName: string; email: string };
    service: { id: string; title: string; durationMin: number; priceAmount: string; currency: string };
    videoRoom?: { joinUrlMentor?: string; joinUrlMentee?: string } | null;
  }

  let session: SessionDetail | null = null;
  let notes = '';
  let sharedSummary = '';
  let isLoading = true;
  let isSaving = false;
  let error: string | null = null;

  const loadSession = async () => {
    session = await api.get<SessionDetail>(`/sessions/${$page.params.id}`);
  };

  const loadNotes = async () => {
    try {
      const data = await api.get<{ privateNotes?: string; sharedSummary?: string }>(`/sessions/${$page.params.id}/notes`);
      notes = data?.privateNotes || '';
      sharedSummary = data?.sharedSummary || '';
    } catch {
      // ignore
    }
  };

  const handleSaveNotes = async () => {
    isSaving = true;
    await api.patch(`/sessions/${$page.params.id}/notes`, {
      privateNotes: notes,
      sharedSummary,
    });
    isSaving = false;
  };

  const handleJoin = async () => {
    const room = await api.get<{ joinUrlMentor?: string; joinUrlMentee?: string }>(`/sessions/${$page.params.id}/video`);
    const url = ($isMentor ? room.joinUrlMentor : room.joinUrlMentee) || room.joinUrlMentor || room.joinUrlMentee;
    if (url) {
      window.open(url, '_blank');
    }
  };

  onMount(async () => {
    if (!$isAuthenticated && !$authLoading) {
      goto('/login');
      return;
    }
    try {
      await loadSession();
      if ($isMentor) {
        await loadNotes();
      }
    } catch {
      error = 'Сессия не найдена или недоступна.';
    } finally {
      isLoading = false;
    }
  });
</script>

<div class="page">
  <AppHeader />

  {#if $authLoading || isLoading}
    <Loading />
  {:else if error || !session}
    <main class="container section">
      <div class="card">
        <h2>Сессия недоступна</h2>
        <p class="muted">{error}</p>
        <a class="btn btn-ghost" href="/sessions">Назад</a>
      </div>
    </main>
  {:else}
    <main class="container section" style="max-width:900px;">
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
          <div>
            <h1 class="section-title">{session.service.title}</h1>
            <p class="muted">
              С {session.mentorId === $user?.id ? session.mentee.fullName : session.mentor.fullName}
            </p>
          </div>
          <span class="badge">{session.status}</span>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:16px;margin-top:16px;">
          <div>
            <div class="muted">Дата</div>
            <strong>{new Date(session.startAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
          </div>
          <div>
            <div class="muted">Время</div>
            <strong>{new Date(session.startAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</strong>
          </div>
          <div>
            <div class="muted">Длительность</div>
            <strong>{session.service.durationMin} минут</strong>
          </div>
          <div>
            <div class="muted">Стоимость</div>
            <strong>{session.service.priceAmount} {session.service.currency}</strong>
          </div>
        </div>

        <div style="display:flex;gap:10px;margin-top:18px;flex-wrap:wrap;">
          <button class="btn btn-primary" on:click={handleJoin}>Присоединиться</button>
          <a class="btn btn-ghost" href={`/chat?session=${session.id}`}>Открыть чат</a>
        </div>
      </div>

      {#if $isMentor}
        <div class="card" style="margin-top:18px;">
          <h2 class="section-title">Заметки по сессии</h2>
          <label>
            <div class="muted" style="margin-bottom:6px;">Приватные заметки</div>
            <textarea class="textarea" bind:value={notes}></textarea>
          </label>
          <label style="margin-top:12px;display:block;">
            <div class="muted" style="margin-bottom:6px;">Резюме для менти</div>
            <textarea class="textarea" bind:value={sharedSummary}></textarea>
          </label>
          <button class="btn btn-primary" style="margin-top:12px;" on:click={handleSaveNotes} disabled={isSaving}>
            {isSaving ? 'Сохранение...' : 'Сохранить заметки'}
          </button>
        </div>
      {/if}
    </main>
  {/if}
</div>
