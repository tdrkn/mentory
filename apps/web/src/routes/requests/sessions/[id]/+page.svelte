<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { ArrowLeft, Calendar, CheckCircle, CreditCard, MessageCircle, XCircle } from 'lucide-svelte';
  import AppHeader from '$lib/components/AppHeader.svelte';
  import Loading from '$lib/components/Loading.svelte';
  import { api, ApiError } from '$lib/api';
  import { isAuthenticated, isLoading as authLoading, user } from '$lib/stores/auth';

  interface UserRef {
    id: string;
    fullName: string;
    email?: string;
  }

  interface MentorService {
    id: string;
    title: string;
    durationMin: number;
    priceAmount?: number | string | null;
    currency?: string | null;
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
    service: MentorService;
  }

  let request: SessionRequest | null = null;
  let decisionComment = '';
  let isLoading = true;
  let isBusy = false;
  let errorMessage = '';
  let actionMessage = '';
  let didLoad = false;

  $: requestId = $page.params.id;
  $: canDecide =
    request &&
    request.mentorId === $user?.id &&
    (request.status === 'requested' || request.status === 'paid');
  $: canPay = request && request.menteeId === $user?.id && request.status === 'requested';

  $: if (!$authLoading) {
    if (!$isAuthenticated) {
      goto('/login');
    } else if (!didLoad) {
      didLoad = true;
      loadRequest();
    }
  }

  async function loadRequest() {
    isLoading = true;
    errorMessage = '';
    actionMessage = '';

    try {
      request = await api.get<SessionRequest>(`/sessions/${requestId}`);
      decisionComment = request.decisionComment || '';
    } catch (err) {
      errorMessage = extractError(err);
    } finally {
      isLoading = false;
    }
  }

  async function approveRequest() {
    await withBusy(async () => {
      await api.patch(`/sessions/${requestId}/confirm`, {
        reason: decisionComment.trim() || undefined,
      });
      actionMessage = 'Заявка на сессию подтверждена.';
      await loadRequest();
    });
  }

  async function rejectRequest() {
    await withBusy(async () => {
      await api.patch(`/sessions/${requestId}/reject`, {
        reason: decisionComment.trim() || 'Ментор отклонил заявку',
      });
      actionMessage = 'Заявка на сессию отклонена.';
      await loadRequest();
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

  function statusLabel(status: string) {
    if (status === 'requested') return 'Ожидает оплаты';
    if (status === 'paid') return 'Оплачена, ждет решения';
    if (status === 'booked') return 'Подтверждена';
    if (status === 'rejected') return 'Отклонена';
    if (status === 'canceled') return 'Отменена';
    if (status === 'completed') return 'Завершена';
    return status;
  }

  function badgeClass(status: string) {
    if (status === 'requested' || status === 'paid') return 'warning';
    if (status === 'booked' || status === 'completed') return 'success';
    if (status === 'rejected' || status === 'canceled') return 'error';
    return '';
  }

  function formatDateTime(value: string) {
    return new Date(value).toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function formatTimeRange(startAt: string, endAt: string) {
    const start = new Date(startAt);
    const end = new Date(endAt);

    return `${start.toLocaleDateString('ru-RU', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })}, ${start.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    })}-${end.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  }

  function formatMoney(value: number | string | null | undefined, currency = 'RUB') {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: currency || 'RUB',
      maximumFractionDigits: 2,
    }).format(Number(value || 0));
  }

  function participantLabel(participant: UserRef) {
    return participant.email ? `${participant.fullName} · ${participant.email}` : participant.fullName;
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
    <main class="request-detail-shell">
      <a class="back-link" href="/requests"><ArrowLeft size={17} /> Все заявки</a>

      {#if actionMessage}
        <div class="alert status-success">{actionMessage}</div>
      {/if}
      {#if errorMessage}
        <div class="alert status-error">{errorMessage}</div>
      {/if}

      {#if request}
        <header class="detail-head">
          <div>
            <span class="eyebrow">Заявка на сессию</span>
            <h1>{request.service.title}</h1>
            <p class="muted">{formatTimeRange(request.startAt, request.endAt)}</p>
          </div>
          <span class="badge {badgeClass(request.status)}">{statusLabel(request.status)}</span>
        </header>

        <div class="detail-grid">
          <section class="panel">
            <h2>Контактная информация</h2>
            <div class="meta-grid">
              <div>
                <span>Ментор</span>
                <strong>{participantLabel(request.mentor)}</strong>
              </div>
              <div>
                <span>Менти</span>
                <strong>{participantLabel(request.mentee)}</strong>
              </div>
            </div>

            <div class="section-block">
              <span class="field-label">Цель</span>
              <p>{request.requestGoal || 'Цель не указана.'}</p>
            </div>

            <div class="section-block">
              <span class="field-label">Мотивационное письмо</span>
              <p>{request.requestMotivation || 'Мотивационное письмо не заполнено.'}</p>
            </div>

            {#if request.decisionComment || request.cancelReason}
              <div class="decision-box">
                <span class="field-label">Комментарий к решению</span>
                <p>{request.decisionComment || request.cancelReason}</p>
                {#if request.decidedAt}
                  <small>{formatDateTime(request.decidedAt)}</small>
                {/if}
              </div>
            {/if}
          </section>

          <aside class="summary-panel">
            <div class="summary-icon"><Calendar size={22} /></div>
            <h2>{request.service.title}</h2>
            <dl>
              <div>
                <dt>Стоимость</dt>
                <dd>{formatMoney(request.service.priceAmount, request.service.currency || 'RUB')}</dd>
              </div>
              <div>
                <dt>Длительность</dt>
                <dd>{request.service.durationMin} мин</dd>
              </div>
              <div>
                <dt>Дата и время</dt>
                <dd>{formatDateTime(request.startAt)}</dd>
              </div>
            </dl>

            <div class="detail-actions">
              <a class="btn btn-outline" href={`/sessions/${request.id}`}>
                <MessageCircle size={16} /> Открыть встречу
              </a>
              {#if canPay}
                <a class="btn btn-primary" href={`/checkout/${request.id}`}>
                  <CreditCard size={16} /> Оплатить
                </a>
              {/if}
            </div>
          </aside>
        </div>

        {#if canDecide}
          <section class="decision-panel">
            <label for="decision-comment">Комментарий для менти</label>
            <textarea
              id="decision-comment"
              class="input"
              rows="4"
              placeholder="Коротко объясните решение или добавьте вводные перед встречей"
              bind:value={decisionComment}
            ></textarea>
            <div class="decision-actions">
              <button class="btn btn-primary" on:click={approveRequest} disabled={isBusy}>
                <CheckCircle size={16} /> Принять
              </button>
              <button class="btn btn-outline" on:click={rejectRequest} disabled={isBusy}>
                <XCircle size={16} /> Отклонить
              </button>
            </div>
          </section>
        {/if}
      {/if}
    </main>
  {/if}
</div>

<style>
  .request-detail-shell {
    width: min(1080px, calc(100vw - 32px));
    margin: 0 auto;
    padding: 28px 0 52px;
  }

  .back-link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--accent-link);
    font-weight: 700;
    margin-bottom: 18px;
  }

  .detail-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 18px;
  }

  .eyebrow {
    display: inline-block;
    color: var(--accent-link);
    font-weight: 800;
    margin-bottom: 4px;
  }

  .detail-head h1 {
    margin: 0 0 6px;
    font-size: clamp(1.8rem, 4vw, 2.4rem);
    line-height: 1.12;
  }

  .detail-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 360px;
    gap: 16px;
    align-items: start;
  }

  .panel,
  .summary-panel,
  .decision-panel {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 18px;
  }

  .panel h2,
  .summary-panel h2 {
    margin: 0 0 16px;
    font-size: 1.15rem;
  }

  .meta-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    margin-bottom: 18px;
  }

  .meta-grid span,
  .field-label,
  dt {
    display: block;
    color: var(--ink-secondary);
    font-size: 0.84rem;
    font-weight: 700;
    margin-bottom: 4px;
  }

  .meta-grid strong {
    overflow-wrap: anywhere;
  }

  .section-block {
    border-top: 1px solid var(--border-light);
    padding-top: 14px;
    margin-top: 14px;
  }

  .section-block p,
  .decision-box p {
    margin: 0;
    color: var(--ink);
  }

  .decision-box {
    margin-top: 16px;
    padding: 14px;
    border: 1px solid var(--status-info-border);
    border-radius: var(--radius-sm);
    background: var(--status-info-bg);
    color: var(--status-info-ink);
  }

  .decision-box small {
    display: block;
    margin-top: 6px;
    color: var(--ink-secondary);
  }

  .summary-panel {
    display: grid;
    gap: 14px;
  }

  .summary-icon {
    width: 44px;
    height: 44px;
    border-radius: var(--radius-md);
    display: grid;
    place-items: center;
    background: var(--accent-muted);
    color: var(--accent-link);
  }

  dl {
    display: grid;
    gap: 10px;
    margin: 0;
  }

  dl div {
    display: flex;
    justify-content: space-between;
    gap: 14px;
    padding-top: 10px;
    border-top: 1px solid var(--border-light);
  }

  dd {
    margin: 0;
    font-weight: 800;
    text-align: right;
  }

  .detail-actions,
  .decision-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .detail-actions .btn,
  .decision-actions .btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .decision-panel {
    margin-top: 16px;
    display: grid;
    gap: 10px;
  }

  .decision-panel label {
    font-weight: 800;
  }

  .decision-panel textarea {
    min-height: 112px;
    resize: vertical;
  }

  @media (max-width: 860px) {
    .request-detail-shell {
      width: min(100vw - 24px, 1080px);
      padding-top: 18px;
    }

    .detail-head {
      flex-direction: column;
    }

    .detail-grid {
      grid-template-columns: 1fr;
    }

    .meta-grid {
      grid-template-columns: 1fr;
    }

    dl div {
      display: grid;
    }

    dd {
      text-align: left;
    }

    .detail-actions .btn,
    .decision-actions .btn {
      width: 100%;
      justify-content: center;
    }
  }
</style>
