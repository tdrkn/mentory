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
    videoLink?: string | null;
  }

  let session: SessionDetail | null = null;
  let notes = '';
  let sharedSummary = '';
  let isLoading = true;
  let isSaving = false;
  let isCompleting = false;
  let isSubmittingReview = false;
  let error: string | null = null;
  let actionMessage: string | null = null;
  let reviewRating = 5;
  let reviewText = '';
  let showReviewForm = false;

  // Video link
  let videoLinkInput = '';
  let isSavingVideoLink = false;

  const loadSession = async () => {
    session = await api.get<SessionDetail>(`/sessions/${$page.params.id}`);
    videoLinkInput = session?.videoLink || '';
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

  const handleSaveVideoLink = async () => {
    if (!session) return;
    isSavingVideoLink = true;
    try {
      const result = await api.patch<{ id: string; videoLink: string | null }>(
        `/sessions/${session.id}/video-link`,
        { videoLink: videoLinkInput.trim() || null },
      );
      if (session) session = { ...session, videoLink: result.videoLink };
    } catch {
      // silent — link stays in input
    } finally {
      isSavingVideoLink = false;
    }
  };

  const handleCompleteSession = async () => {
    if (!session) return;
    isCompleting = true;
    actionMessage = null;
    try {
      await api.patch(`/sessions/${session.id}/complete`, {});
      actionMessage = 'Сессия завершена. Выплата будет начислена автоматически.';
      session = await api.get<SessionDetail>(`/sessions/${$page.params.id}`);
    } catch {
      actionMessage = 'Не удалось завершить сессию.';
    } finally {
      isCompleting = false;
    }
  };

  const handleSubmitReview = async () => {
    if (!session) return;
    isSubmittingReview = true;
    actionMessage = null;
    try {
      await api.post(`/reviews/${session.id}`, { rating: reviewRating, text: reviewText.trim() || undefined });
      actionMessage = 'Отзыв успешно сохранён!';
      showReviewForm = false;
    } catch {
      actionMessage = 'Не удалось сохранить отзыв.';
    } finally {
      isSubmittingReview = false;
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case 'requested':
        return 'Ожидает подтверждения';
      case 'paid':
        return 'Оплачена, ждет подтверждения';
      case 'booked':
        return 'Подтверждена';
      case 'completed':
        return 'Завершена';
      case 'canceled':
        return 'Отменена';
      default:
        return status;
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
          <span class="badge">{statusLabel(session.status)}</span>
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

        {#if actionMessage}
          <div class="surface" style="margin-top:14px;background:var(--status-success-bg);border-color:var(--status-success-border);color:var(--status-success-ink);">
            {actionMessage}
          </div>
        {/if}

        <!-- Video link section -->
        {#if session.status === 'booked' || session.status === 'completed'}
          <div style="margin-top:18px;padding:16px;background:var(--bg-alt);border-radius:var(--radius-md);">
            {#if $isMentor}
              <div class="muted" style="font-size:0.88rem;margin-bottom:8px;font-weight:600;">
                Ссылка на встречу
              </div>
              <div style="display:flex;gap:8px;align-items:center;">
                <input
                  class="input"
                  style="flex:1;"
                  bind:value={videoLinkInput}
                  placeholder="https://meet.google.com/... или zoom.us/..."
                  on:blur={handleSaveVideoLink}
                />
                <button
                  class="btn btn-outline"
                  on:click={handleSaveVideoLink}
                  disabled={isSavingVideoLink}
                >
                  {isSavingVideoLink ? '...' : 'Сохранить'}
                </button>
              </div>
              {#if videoLinkInput}
                <a
                  href={videoLinkInput}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="btn btn-primary"
                  style="margin-top:10px;display:inline-flex;"
                >
                  Открыть встречу
                </a>
              {/if}
            {:else}
              {#if session.videoLink}
                <div class="muted" style="font-size:0.88rem;margin-bottom:8px;">Ссылка на встречу</div>
                <a
                  href={session.videoLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="btn btn-primary"
                >
                  Присоединиться к встрече
                </a>
              {:else}
                <p class="muted" style="margin:0;font-size:0.9rem;">
                  Ментор ещё не добавил ссылку на встречу.
                </p>
              {/if}
            {/if}
          </div>
        {/if}

        <div style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap;">
          <a class="btn btn-ghost" href={`/chat?session=${session.id}`}>Открыть чат</a>
          {#if $isMentor && session.status === 'booked'}
            <button class="btn btn-outline" on:click={handleCompleteSession} disabled={isCompleting}>
              {isCompleting ? 'Завершение...' : 'Завершить сессию'}
            </button>
          {/if}
        </div>

        {#if !$isMentor && session.status === 'completed'}
          <div style="margin-top:16px;">
            {#if !showReviewForm}
              <button class="btn btn-primary" on:click={() => (showReviewForm = true)}>Оставить отзыв</button>
            {:else}
              <div class="surface" style="margin-top:12px;">
                <h3 style="margin:0 0 12px;">Ваш отзыв</h3>
                <label style="display:block;margin-bottom:10px;">
                  <div class="muted" style="margin-bottom:4px;">Оценка</div>
                  <div style="display:flex;gap:6px;">
                    {#each [1,2,3,4,5] as star}
                      <button
                        type="button"
                        style="background:none;border:none;cursor:pointer;font-size:1.5rem;color:{reviewRating >= star ? 'var(--amber)' : 'var(--muted-soft)'};"
                        on:click={() => (reviewRating = star)}
                      >{reviewRating >= star ? '★' : '☆'}</button>
                    {/each}
                  </div>
                </label>
                <label style="display:block;margin-bottom:10px;">
                  <div class="muted" style="margin-bottom:4px;">Комментарий (необязательно)</div>
                  <textarea class="textarea" bind:value={reviewText} maxlength={10000} placeholder="Поделитесь впечатлениями..."></textarea>
                </label>
                <div style="display:flex;gap:8px;">
                  <button class="btn btn-primary" on:click={handleSubmitReview} disabled={isSubmittingReview}>
                    {isSubmittingReview ? 'Сохранение...' : 'Сохранить отзыв'}
                  </button>
                  <button class="btn btn-ghost" on:click={() => (showReviewForm = false)}>Отмена</button>
                </div>
              </div>
            {/if}
          </div>
        {/if}
      </div>

      {#if $isMentor}
        <div class="card" style="margin-top:18px;">
          <h2 class="section-title">Заметки по сессии</h2>
          <label>
            <div class="muted" style="margin-bottom:6px;">Приватные заметки</div>
            <textarea class="textarea" bind:value={notes} maxlength={10000}></textarea>
          </label>
          <label style="margin-top:12px;display:block;">
            <div class="muted" style="margin-bottom:6px;">Резюме для менти</div>
            <textarea class="textarea" bind:value={sharedSummary} maxlength={10000}></textarea>
          </label>
          <div class="muted" style="font-size:0.82rem;margin-top:8px;">
            Приватные заметки: {notes.length}/10000 · Резюме: {sharedSummary.length}/10000
          </div>
          <button class="btn btn-primary" style="margin-top:12px;" on:click={handleSaveNotes} disabled={isSaving}>
            {isSaving ? 'Сохранение...' : 'Сохранить заметки'}
          </button>
        </div>
      {/if}
    </main>
  {/if}
</div>
