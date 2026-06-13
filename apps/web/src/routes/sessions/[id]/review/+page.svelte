<script lang="ts">
  import AppHeader from '$lib/components/AppHeader.svelte';
  import Loading from '$lib/components/Loading.svelte';
  import { api, ApiError } from '$lib/api';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { user, isAuthenticated, isLoading as authLoading } from '$lib/stores/auth';
  import { ArrowLeft, Star } from 'lucide-svelte';

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
    review?: { id: string } | null;
  }

  let session: SessionDetail | null = null;
  let isLoading = true;
  let isSubmitting = false;
  let didLoad = false;
  let error: string | null = null;
  let actionError: string | null = null;
  let rating = 5;
  let reviewText = '';

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

  const formatTime = (value: string) =>
    new Date(value).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

  const reviewAvailableAt = () => {
    if (!session) return null;
    return new Date(new Date(session.endAt).getTime() + 24 * 60 * 60 * 1000);
  };

  const isReviewAvailable = () => {
    const availableAt = reviewAvailableAt();
    return !!availableAt && new Date() >= availableAt;
  };

  const loadSession = async () => {
    try {
      session = await api.get<SessionDetail>(`/sessions/${$page.params.id}`);
    } catch {
      error = 'Сессия не найдена или недоступна.';
    } finally {
      isLoading = false;
    }
  };

  const submitReview = async () => {
    if (!session || !isReviewAvailable()) return;

    isSubmitting = true;
    actionError = null;

    try {
      await api.post(`/reviews/${session.id}`, {
        rating,
        text: reviewText.trim() || undefined,
      });
      await goto('/sessions?tab=past&review=1');
    } catch (err) {
      if (err instanceof ApiError) {
        actionError = err.data?.message || 'Не удалось отправить отзыв.';
      } else {
        actionError = 'Не удалось отправить отзыв.';
      }
    } finally {
      isSubmitting = false;
    }
  };

  $: if (!$authLoading) {
    if (!$isAuthenticated) {
      goto('/login');
    } else if (!didLoad) {
      didLoad = true;
      loadSession();
    }
  }

  $: canReview =
    !!session &&
    session.menteeId === $user?.id &&
    session.status === 'completed' &&
    !session.review &&
    isReviewAvailable();

  $: unavailableDate = reviewAvailableAt()
    ? reviewAvailableAt()!.toLocaleString('ru-RU', {
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';
</script>

<svelte:head>
  <title>Оценить ментора — Mentory</title>
</svelte:head>

<div class="page">
  <AppHeader />

  {#if $authLoading || isLoading}
    <Loading />
  {:else if error || !session}
    <main class="container section">
      <div class="card">
        <h1 class="section-title">Отзыв недоступен</h1>
        <p class="muted">{error || 'Не удалось открыть сессию.'}</p>
        <a class="btn btn-ghost" href="/sessions">
          <ArrowLeft size={16} />
          К сессиям
        </a>
      </div>
    </main>
  {:else}
    <main class="review-shell">
      <a class="btn btn-ghost back-link" href={`/sessions/${session.id}`}>
        <ArrowLeft size={16} />
        Назад к сессии
      </a>

      <section class="review-panel">
        <div class="session-summary">
          <div class="mentor-avatar">{session.mentor.fullName.slice(0, 1)}</div>
          <div class="summary-copy">
            <p class="eyebrow">Прошедшая сессия</p>
            <h1>Оценить ментора</h1>
            <p class="mentor-name">{session.mentor.fullName}</p>
            <p class="muted">
              {session.service.title} · {formatDate(session.startAt)} · {formatTime(session.startAt)}
            </p>
          </div>
        </div>

        {#if session.menteeId !== $user?.id}
          <div class="state-box state-error">
            Оставить отзыв может только менти этой сессии.
          </div>
        {:else if session.status !== 'completed'}
          <div class="state-box state-warning">
            Отзыв откроется после завершения сессии.
          </div>
        {:else if session.review}
          <div class="state-box state-success">
            Отзыв по этой сессии уже отправлен.
          </div>
        {:else if !isReviewAvailable()}
          <div class="state-box state-warning">
            Отзыв можно отправить после {unavailableDate}.
          </div>
        {:else}
          <div class="review-form">
            <label class="field-group">
              <span>Оценка</span>
              <div class="star-row">
                {#each [1, 2, 3, 4, 5] as star}
                  <button
                    type="button"
                    class:active-star={rating >= star}
                    class="star-button"
                    aria-label={`Оценка ${star} из 5`}
                    aria-pressed={rating === star}
                    on:click={() => (rating = star)}
                  >
                    <Star size={30} strokeWidth={2.2} fill={rating >= star ? 'currentColor' : 'none'} />
                  </button>
                {/each}
              </div>
            </label>

            <label class="field-group">
              <span>Отзыв</span>
              <textarea
                class="textarea"
                bind:value={reviewText}
                maxlength={10000}
                placeholder="Что было полезно на сессии?"
              ></textarea>
              <small>{reviewText.length}/10000</small>
            </label>

            {#if actionError}
              <div class="state-box state-error">{actionError}</div>
            {/if}

            <div class="actions-row">
              <button class="btn btn-primary" on:click={submitReview} disabled={!canReview || isSubmitting}>
                {isSubmitting ? 'Отправка...' : 'Отправить отзыв'}
              </button>
              <a class="btn btn-ghost" href={`/sessions/${session.id}`}>Отмена</a>
            </div>
          </div>
        {/if}
      </section>
    </main>
  {/if}
</div>

<style>
  .review-shell {
    width: 100%;
    max-width: 780px;
    margin: 0 auto;
    padding: 40px 20px 90px;
  }

  .back-link {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 16px;
  }

  .review-panel {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: clamp(22px, 4vw, 34px);
    box-shadow: var(--shadow-sm);
  }

  .session-summary {
    display: grid;
    grid-template-columns: 72px 1fr;
    gap: 18px;
    align-items: center;
    padding-bottom: 24px;
    border-bottom: 1px solid var(--border);
  }

  .mentor-avatar {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: var(--accent-muted);
    color: var(--accent);
    font-size: 1.7rem;
    font-weight: 800;
  }

  .summary-copy {
    min-width: 0;
  }

  .eyebrow {
    margin: 0 0 4px;
    color: var(--muted);
    font-size: 0.82rem;
    font-weight: 700;
    text-transform: uppercase;
  }

  h1 {
    margin: 0;
    color: var(--ink);
    font-size: clamp(1.5rem, 4vw, 2rem);
    line-height: 1.2;
  }

  .mentor-name {
    margin: 8px 0 0;
    color: var(--ink-secondary);
    font-weight: 700;
  }

  .review-form {
    display: flex;
    flex-direction: column;
    gap: 22px;
    padding-top: 24px;
  }

  .field-group {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .field-group > span {
    color: var(--ink);
    font-weight: 700;
  }

  .field-group small {
    color: var(--muted);
    font-size: 0.8rem;
  }

  .star-row {
    display: flex;
    gap: 6px;
  }

  .star-button {
    width: 42px;
    height: 42px;
    border: 1px solid transparent;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--muted-light);
    display: grid;
    place-items: center;
    cursor: pointer;
  }

  .star-button:hover,
  .star-button:focus-visible {
    border-color: var(--amber);
    color: var(--amber);
    outline: none;
  }

  .star-button.active-star {
    color: var(--amber);
  }

  .textarea {
    min-height: 150px;
    resize: vertical;
  }

  .state-box {
    margin-top: 24px;
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 14px 16px;
    font-weight: 600;
  }

  .state-success {
    background: var(--status-success-bg);
    border-color: var(--status-success-border);
    color: var(--status-success-ink);
  }

  .state-warning {
    background: var(--status-warning-bg);
    border-color: var(--status-warning-border);
    color: var(--status-warning-ink);
  }

  .state-error {
    background: var(--status-error-bg);
    border-color: var(--status-error-border);
    color: var(--status-error-ink);
  }

  .actions-row {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  @media (max-width: 560px) {
    .review-shell {
      padding: 28px 16px 70px;
    }

    .session-summary {
      grid-template-columns: 1fr;
    }

    .mentor-avatar {
      width: 60px;
      height: 60px;
    }

    .star-button {
      width: 38px;
      height: 38px;
    }
  }
</style>
