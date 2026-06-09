<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { ArrowLeft, CheckCircle, CreditCard, FileText, XCircle } from 'lucide-svelte';
  import AppHeader from '$lib/components/AppHeader.svelte';
  import Loading from '$lib/components/Loading.svelte';
  import { api, ApiError } from '$lib/api';
  import { isAuthenticated, isLoading as authLoading, user } from '$lib/stores/auth';

  type SubscriptionStatus = 'pending' | 'approved_pending_payment' | 'active' | 'paused' | 'ended' | 'rejected';

  interface UserRef {
    id: string;
    fullName: string;
    email?: string;
  }

  interface MentorshipPlan {
    id: string;
    title: string;
    description?: string | null;
    priceAmount: number | string;
    currency: string;
    billingIntervalMonths: number;
    callsPerMonth?: number | null;
    sessionDurationMin?: number | null;
    responseTimeHours?: number | null;
    includesUnlimitedChat: boolean;
  }

  interface MentorshipSubscription {
    id: string;
    mentorId: string;
    menteeId: string;
    planId: string;
    status: SubscriptionStatus;
    startedAt: string;
    pausedAt?: string | null;
    endedAt?: string | null;
    nextBillingAt?: string | null;
    currentPeriodStart?: string | null;
    currentPeriodEnd?: string | null;
    monthlyPrice?: number | string | null;
    currency: string;
    requestGoal?: string | null;
    requestMotivation?: string | null;
    notes?: string | null;
    plan?: MentorshipPlan;
    mentor?: UserRef;
    mentee?: UserRef;
  }

  let request: MentorshipSubscription | null = null;
  let decisionComment = '';
  let isLoading = true;
  let isBusy = false;
  let errorMessage = '';
  let actionMessage = '';
  let didLoad = false;

  $: requestId = $page.params.id;
  $: canDecide =
    request &&
    request.status === 'pending' &&
    ($user?.role === 'admin' || request.mentorId === $user?.id);
  $: canPay = request && request.status === 'approved_pending_payment' && request.menteeId === $user?.id;

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
      request = await api.get<MentorshipSubscription>(`/subscriptions/${requestId}`);
      decisionComment = '';
    } catch (err) {
      errorMessage = extractError(err);
    } finally {
      isLoading = false;
    }
  }

  async function approveRequest() {
    await withBusy(async () => {
      await api.patch(`/subscriptions/${requestId}/status`, {
        status: 'approved_pending_payment',
        reason: decisionComment.trim() || undefined,
      });
      actionMessage = 'Заявка на подписку одобрена. Менти может перейти к оплате.';
      await loadRequest();
    });
  }

  async function rejectRequest() {
    await withBusy(async () => {
      await api.patch(`/subscriptions/${requestId}/status`, {
        status: 'rejected',
        reason: decisionComment.trim() || 'Ментор отклонил заявку',
      });
      actionMessage = 'Заявка на подписку отклонена.';
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

  function statusLabel(status: SubscriptionStatus) {
    if (status === 'pending') return 'На рассмотрении';
    if (status === 'approved_pending_payment') return 'Одобрена, ожидает оплаты';
    if (status === 'active') return 'Оплачена и активна';
    if (status === 'paused') return 'На паузе';
    if (status === 'ended') return 'Завершена';
    return 'Отклонена';
  }

  function badgeClass(status: SubscriptionStatus) {
    if (status === 'pending' || status === 'approved_pending_payment' || status === 'paused') return 'warning';
    if (status === 'active') return 'success';
    return 'error';
  }

  function formatMoney(value: number | string | null | undefined, currency = 'RUB') {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: currency || 'RUB',
      maximumFractionDigits: 2,
    }).format(Number(value || 0));
  }

  function formatDate(value?: string | null) {
    if (!value) return 'Не указано';
    return new Date(value).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  function participantLabel(participant?: UserRef) {
    if (!participant) return 'Не указан';
    return participant.email ? `${participant.fullName} · ${participant.email}` : participant.fullName;
  }

  function periodLabel(request: MentorshipSubscription) {
    if (request.currentPeriodStart || request.currentPeriodEnd) {
      return `${formatDate(request.currentPeriodStart)} - ${formatDate(request.currentPeriodEnd)}`;
    }

    return 'Откроется после оплаты';
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
            <span class="eyebrow">Заявка на подписку</span>
            <h1>{request.plan?.title || 'Программа менторства'}</h1>
            <p class="muted">Создана {formatDate(request.startedAt)}</p>
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

            {#if request.notes}
              <div class="decision-box">
                <span class="field-label">Комментарий</span>
                <p>{request.notes}</p>
              </div>
            {/if}
          </section>

          <aside class="summary-panel">
            <div class="summary-icon"><FileText size={22} /></div>
            <h2>{request.plan?.title || 'Программа менторства'}</h2>
            {#if request.plan?.description}
              <p class="muted">{request.plan.description}</p>
            {/if}

            <dl>
              <div>
                <dt>Стоимость</dt>
                <dd>{formatMoney(request.monthlyPrice ?? request.plan?.priceAmount, request.currency || request.plan?.currency || 'RUB')}</dd>
              </div>
              <div>
                <dt>Период</dt>
                <dd>{request.plan?.billingIntervalMonths || 1} мес.</dd>
              </div>
              <div>
                <dt>Созвоны</dt>
                <dd>{request.plan?.callsPerMonth ? `${request.plan.callsPerMonth} в месяц` : 'По договоренности'}</dd>
              </div>
              <div>
                <dt>Длительность</dt>
                <dd>{request.plan?.sessionDurationMin ? `${request.plan.sessionDurationMin} мин` : 'Не указана'}</dd>
              </div>
              <div>
                <dt>Рабочий период</dt>
                <dd>{periodLabel(request)}</dd>
              </div>
            </dl>

            <div class="detail-actions">
              <a class="btn btn-outline" href="/subscriptions">Открыть программы</a>
              {#if canPay}
                <a class="btn btn-primary" href={`/checkout/subscriptions/${request.id}`}>
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
              placeholder="Добавьте комментарий к одобрению или причине отказа"
              bind:value={decisionComment}
            ></textarea>
            <div class="decision-actions">
              <button class="btn btn-primary" on:click={approveRequest} disabled={isBusy}>
                <CheckCircle size={16} /> Одобрить
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

  .summary-panel h2 {
    margin-bottom: 0;
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
    white-space: pre-wrap;
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
