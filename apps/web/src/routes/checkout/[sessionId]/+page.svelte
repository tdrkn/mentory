<script lang="ts">
  import AppHeader from '$lib/components/AppHeader.svelte';
  import Loading from '$lib/components/Loading.svelte';
  import { api, ApiError } from '$lib/api';
  import { isAuthenticated, isLoading as authLoading } from '$lib/stores/auth';
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';

  interface SessionDetail {
    id: string;
    mentorId: string;
    menteeId: string;
    status: string;
    startAt: string;
    endAt: string;
    mentor: { id: string; fullName: string };
    service: { id: string; title: string; priceAmount: string; currency: string; durationMin: number };
    slot: { id: string; startAt: string; endAt: string; heldUntil?: string | null };
  }

  let session: SessionDetail | null = null;
  let isLoading = true;
  let error: string | null = null;
  let isProcessing = false;
  let timeLeft = 0;
  let timer: any;

  const loadSession = async () => {
    try {
      session = await api.get<SessionDetail>(`/booking/${$page.params.sessionId}`);
      const heldUntil = session.slot?.heldUntil ? new Date(session.slot.heldUntil).getTime() : null;
      if (heldUntil) {
        timeLeft = Math.max(0, Math.floor((heldUntil - Date.now()) / 1000));
      } else {
        timeLeft = 600;
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        error = 'Сессия не найдена или истекла.';
      } else {
        error = 'Ошибка загрузки данных.';
      }
    } finally {
      isLoading = false;
    }
  };

  const startTimer = () => {
    if (timeLeft <= 0) return;
    timer = setInterval(() => {
      if (timeLeft <= 1) {
        timeLeft = 0;
        error = 'Время на оплату истекло. Слот освобожден.';
        clearInterval(timer);
      } else {
        timeLeft -= 1;
      }
    }, 1000);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePayment = async () => {
    if (!session) return;
    isProcessing = true;
    error = null;

    try {
      await api.post('/payments/intent', { sessionId: session.id });
      await api.post('/booking/confirm', { sessionId: session.id });
      goto('/sessions?success=1');
    } catch (err) {
      if (err instanceof ApiError && err.status === 410) {
        error = 'Время на оплату истекло. Слот освобожден.';
      } else {
        error = 'Ошибка оплаты. Попробуйте ещё раз.';
      }
    } finally {
      isProcessing = false;
    }
  };

  onMount(async () => {
    if (!$isAuthenticated && !$authLoading) {
      goto('/login');
      return;
    }
    await loadSession();
    startTimer();
  });

  onDestroy(() => {
    if (timer) clearInterval(timer);
  });
</script>

<div class="page">
  <AppHeader />

  {#if isLoading}
    <Loading />
  {:else if error && !session}
    <main class="container section">
      <div class="card">
        <h2>Проблема с оплатой</h2>
        <p class="muted">{error}</p>
        <a class="btn btn-ghost" href="/mentors">Вернуться к каталогу</a>
      </div>
    </main>
  {:else if session}
    <main class="container section" style="max-width:820px;">
      <div class="card">
        <div class={`surface ${timeLeft < 60 ? 'status-error' : 'status-warning'}`} style="text-align:center;margin-bottom:16px;">
          <div class="muted">Время на оплату</div>
          <div style="font-size:2rem;font-weight:700;">{formatTime(timeLeft)}</div>
        </div>

        <h1 class="section-title">Оформление сессии</h1>

        {#if error}
          <div class="surface" style="margin-top:12px;background:#fee2e2;border-color:#fecaca;color:#991b1b;">
            {error}
          </div>
        {/if}

        <div class="surface" style="margin-top:16px;">
          <div style="display:flex;gap:14px;align-items:center;">
            <div style="width:52px;height:52px;border-radius:50%;background:#e7f5f3;display:flex;align-items:center;justify-content:center;font-weight:700;color:var(--accent);">
              {session.mentor.fullName.charAt(0)}
            </div>
            <div>
              <strong>{session.mentor.fullName}</strong>
              <div class="muted">{session.service.title}</div>
            </div>
          </div>

          <div class="stack" style="margin-top:12px;font-size:0.95rem;">
            <div style="display:flex;justify-content:space-between;">
              <span class="muted">Дата</span>
              <span>{new Date(session.startAt).toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
            </div>
            <div style="display:flex;justify-content:space-between;">
              <span class="muted">Время</span>
              <span>{new Date(session.startAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} - {new Date(session.endAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div style="display:flex;justify-content:space-between;">
              <span class="muted">Длительность</span>
              <span>{session.service.durationMin} минут</span>
            </div>
          </div>
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:16px;">
          <span class="muted">Итого</span>
          <strong style="font-size:1.4rem;color:var(--accent);">
            {session.service.priceAmount} {session.service.currency}
          </strong>
        </div>

        <button class="btn btn-primary" style="width:100%;margin-top:18px;" on:click={handlePayment} disabled={isProcessing || timeLeft <= 0}>
          {isProcessing ? 'Обработка...' : 'Оплатить'}
        </button>

        <p class="muted" style="margin-top:10px;font-size:0.85rem;text-align:center;">
          Платёж симулируется. В продакшене будет Stripe Checkout.
        </p>
      </div>
    </main>
  {/if}
</div>
