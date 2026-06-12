<script lang="ts">
  import AppHeader from '$lib/components/AppHeader.svelte';
  import Loading from '$lib/components/Loading.svelte';
  import { api, ApiError } from '$lib/api';
  import { isMentor, isAuthenticated, isLoading as authLoading, user } from '$lib/stores/auth';
  import { goto } from '$app/navigation';

  type FinanceRole = 'mentor' | 'mentee';
  type SubscriptionStatus = 'pending' | 'approved_pending_payment' | 'active' | 'paused' | 'ended' | 'rejected';

  interface UserRef {
    id: string;
    fullName: string;
    email?: string;
  }

  interface Balance {
    totalEarned: number;
    available: number;
    pending: number;
    currency: string;
    sessionsCount: number;
    ratingAvg: number;
    ratingCount: number;
  }

  interface PaymentItem {
    id: string;
    amount: number;
    mentorAmount?: number | null;
    currency: string;
    status: string;
    createdAt: string;
    paidAt?: string | null;
    session?: {
      id: string;
      startAt: string;
      mentee: UserRef;
      mentor?: UserRef;
      service: { id: string; title: string };
    } | null;
    subscription?: {
      id: string;
      status: SubscriptionStatus;
      mentor: UserRef;
      mentee: UserRef;
      plan?: {
        id: string;
        title: string;
        priceAmount: number | string;
        currency: string;
        billingIntervalMonths: number;
      };
    } | null;
  }

  interface MentorshipSubscription {
    id: string;
    status: SubscriptionStatus;
    startedAt: string;
    monthlyPrice?: number | string | null;
    currency: string;
    mentor?: UserRef;
    plan?: {
      id: string;
      title: string;
      priceAmount: number | string;
      currency: string;
    };
  }

  interface PayoutMethod {
    id: 'card' | 'sbp';
    label: string;
    description: string;
  }

  let balance: Balance | null = null;
  let payments: PaymentItem[] = [];
  let subscriptions: MentorshipSubscription[] = [];
  let payoutMethods: PayoutMethod[] = [];
  let selectedMethod: PayoutMethod['id'] | '' = '';
  let isLoading = true;
  let isSubmitting = false;
  let message: string | null = null;
  let errorMsg: string | null = null;
  let didLoad = false;

  $: financeRole = ($isMentor ? 'mentor' : 'mentee') as FinanceRole;
  $: pendingSubscriptions = subscriptions.filter((item) => item.status === 'approved_pending_payment');
  $: activeSubscriptions = subscriptions.filter((item) => item.status === 'active' || item.status === 'paused');
  $: paidTotal = payments
    .filter((payment) => payment.status === 'succeeded' || payment.status === 'paid')
    .reduce((sum, payment) => sum + payment.amount, 0);
  $: refundedTotal = payments
    .filter((payment) => payment.status === 'refunded')
    .reduce((sum, payment) => sum + payment.amount, 0);

  $: if (!$authLoading) {
    if (!$isAuthenticated) {
      goto('/login');
    } else if (!didLoad) {
      didLoad = true;
      loadData(financeRole);
    }
  }

  const loadData = async (role: FinanceRole = financeRole) => {
    isLoading = true;
    errorMsg = null;

    try {
      if (role === 'mentor') {
        const [bal, pmts, methods] = await Promise.all([
          api.get<Balance>('/payouts/balance'),
          api.get<PaymentItem[]>('/payments?role=mentor'),
          api.get<PayoutMethod[]>('/payouts/methods'),
        ]);
        balance = bal;
        payments = pmts;
        payoutMethods = methods;
        subscriptions = [];
        if (!selectedMethod && methods.length > 0) {
          selectedMethod = methods[0].id;
        }
      } else {
        const [pmts, subs] = await Promise.all([
          api.get<PaymentItem[]>('/payments?role=mentee'),
          api.get<MentorshipSubscription[]>('/subscriptions/mine'),
        ]);
        balance = null;
        payments = pmts;
        payoutMethods = [];
        subscriptions = subs;
      }
    } catch (err) {
      errorMsg = extractError(err);
    } finally {
      isLoading = false;
    }
  };

  const requestPayout = async () => {
    if (!selectedMethod || !balance || balance.available <= 0) return;
    isSubmitting = true;
    message = null;
    errorMsg = null;

    try {
      await api.post('/payouts/request', { method: selectedMethod });
      message = 'Заявка на выплату создана.';
      await loadData('mentor');
    } catch (err) {
      errorMsg = extractError(err);
    } finally {
      isSubmitting = false;
    }
  };

  const formatCents = (amount: number | null | undefined, currency = 'RUB') =>
    new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(Number(amount || 0) / 100);

  const formatMajorMoney = (amount: number | string | null | undefined, currency = 'RUB') =>
    new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(Number(amount || 0));

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

  const paymentStatusLabel = (status: string) => {
    switch (status) {
      case 'succeeded':
      case 'paid':
        return 'Оплачено';
      case 'pending':
        return 'Ожидает';
      case 'failed':
        return 'Ошибка';
      case 'refunded':
        return 'Возврат';
      default:
        return status;
    }
  };

  const paymentStatusClass = (status: string) => {
    switch (status) {
      case 'succeeded':
      case 'paid':
        return 'st-success';
      case 'pending':
        return 'st-warning';
      case 'failed':
        return 'st-error';
      case 'refunded':
        return 'st-muted';
      default:
        return '';
    }
  };

  const paymentKindLabel = (payment: PaymentItem) => (payment.subscription ? 'Подписка' : 'Сессия');

  const paymentSubject = (payment: PaymentItem) =>
    payment.session?.service.title || payment.subscription?.plan?.title || 'Платеж Mentory';

  const paymentPartner = (payment: PaymentItem) => {
    if (financeRole === 'mentor') {
      return payment.session?.mentee.fullName || payment.subscription?.mentee.fullName || 'Менти';
    }

    return payment.session?.mentor?.fullName || payment.subscription?.mentor.fullName || 'Ментор';
  };

  const paymentAmount = (payment: PaymentItem) =>
    financeRole === 'mentor' ? (payment.mentorAmount ?? payment.amount) : payment.amount;

  const subscriptionPrice = (subscription: MentorshipSubscription) =>
    formatMajorMoney(
      subscription.monthlyPrice ?? subscription.plan?.priceAmount,
      subscription.currency || subscription.plan?.currency || 'RUB',
    );

  const extractError = (err: unknown) => {
    if (err instanceof ApiError) {
      const message = err.data?.message;
      if (Array.isArray(message)) return message.join(', ');
      if (typeof message === 'string') return message;
      return `Ошибка API (${err.status})`;
    }
    if (err instanceof Error) return err.message;
    return 'Не удалось загрузить финансы.';
  };
</script>

<svelte:head>
  <title>Финансы — Mentory</title>
</svelte:head>

<div class="page">
  <AppHeader />

  {#if $authLoading || isLoading}
    <Loading />
  {:else}
    <main class="shell">
      <header class="page-head">
        <div>
          <h1 class="page-title">Финансы</h1>
          <p class="page-subtitle">
            {financeRole === 'mentor'
              ? 'Доходы, история оплат и вывод средств по вашим консультациям.'
              : 'История оплат, возвраты и заявки на подписки, ожидающие оплаты.'}
          </p>
        </div>
        <button class="btn btn-outline" on:click={() => loadData(financeRole)} disabled={isSubmitting}>Обновить</button>
      </header>

      {#if message}
        <div class="alert alert-success">{message}</div>
      {/if}
      {#if errorMsg}
        <div class="alert alert-error">{errorMsg}</div>
      {/if}

      {#if financeRole === 'mentor'}
        <div class="kpi-grid">
          <div class="kpi-card">
            <p class="kpi-label">Общий заработок</p>
            <p class="kpi-value accent">{formatCents(balance?.totalEarned, balance?.currency ?? 'RUB')}</p>
          </div>
          <div class="kpi-card">
            <p class="kpi-label">Доступно к выводу</p>
            <p class="kpi-value">{formatCents(balance?.available, balance?.currency ?? 'RUB')}</p>
          </div>
          <div class="kpi-card">
            <p class="kpi-label">Проведённые сессии</p>
            <p class="kpi-value">{balance?.sessionsCount ?? 0}</p>
          </div>
          <div class="kpi-card">
            <p class="kpi-label">Рейтинг</p>
            <p class="kpi-value">
              {balance?.ratingAvg ? Number(balance.ratingAvg).toFixed(1) : '—'}
              {#if balance?.ratingCount}
                <span class="kpi-sub">({balance.ratingCount} отз.)</span>
              {/if}
            </p>
          </div>
        </div>
      {:else}
        <div class="kpi-grid">
          <div class="kpi-card">
            <p class="kpi-label">Оплачено</p>
            <p class="kpi-value accent">{formatCents(paidTotal)}</p>
          </div>
          <div class="kpi-card">
            <p class="kpi-label">Активные программы</p>
            <p class="kpi-value">{activeSubscriptions.length}</p>
          </div>
          <div class="kpi-card">
            <p class="kpi-label">Ожидают оплаты</p>
            <p class="kpi-value">{pendingSubscriptions.length}</p>
          </div>
          <div class="kpi-card">
            <p class="kpi-label">Возвраты</p>
            <p class="kpi-value">{formatCents(refundedTotal)}</p>
          </div>
        </div>
      {/if}

      <div class="content-grid">
        <section class="history-section">
          <h2>{financeRole === 'mentor' ? 'История платежей' : 'История оплат'}</h2>

          {#if payments.length === 0}
            <p class="empty-text">Платежей пока нет.</p>
          {:else}
            <div class="table-wrap">
              <table class="history-table">
                <thead>
                  <tr>
                    <th>Тип</th>
                    <th>{financeRole === 'mentor' ? 'Менти' : 'Ментор'}</th>
                    <th>Услуга</th>
                    <th>Дата</th>
                    <th>Статус</th>
                    <th class="col-amount">{financeRole === 'mentor' ? 'К выплате' : 'Сумма'}</th>
                  </tr>
                </thead>
                <tbody>
                  {#each payments as payment}
                    <tr>
                      <td>{paymentKindLabel(payment)}</td>
                      <td class="td-name">{paymentPartner(payment)}</td>
                      <td class="td-service">{paymentSubject(payment)}</td>
                      <td class="td-date">{formatDate(payment.paidAt || payment.createdAt)}</td>
                      <td>
                        <span class="st-badge {paymentStatusClass(payment.status)}">
                          {paymentStatusLabel(payment.status)}
                        </span>
                      </td>
                      <td class="td-amount">{formatCents(paymentAmount(payment), payment.currency)}</td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {/if}
        </section>

        {#if financeRole === 'mentor'}
          <aside class="side-panel">
            <div class="panel-box">
              <h2>Вывести средства</h2>

              <div class="payout-balance">
                <span>Доступно</span>
                <strong>{formatCents(balance?.available, balance?.currency ?? 'RUB')}</strong>
              </div>

              <p class="section-label">Способ получения</p>
              <div class="method-list">
                {#each payoutMethods as method}
                  <button
                    class="method-item {selectedMethod === method.id ? 'method-selected' : ''}"
                    on:click={() => (selectedMethod = method.id)}
                  >
                    <span class="method-name">{method.label}</span>
                    <span class="method-desc">{method.description}</span>
                  </button>
                {/each}
              </div>

              <button
                class="btn btn-primary withdraw-btn"
                on:click={requestPayout}
                disabled={isSubmitting || !selectedMethod || (balance?.available ?? 0) <= 0}
              >
                {isSubmitting ? 'Отправка...' : 'Вывести средства'}
              </button>

              <p class="panel-note">
                Реквизиты не хранятся в Mentory. Реальный процессинг выплат остается production gap.
              </p>
            </div>
          </aside>
        {:else}
          <aside class="side-panel">
            <div class="panel-box">
              <h2>Ожидают оплаты</h2>

              {#if pendingSubscriptions.length === 0}
                <p class="empty-text">Нет одобренных заявок, ожидающих оплаты.</p>
              {:else}
                <div class="subscription-list">
                  {#each pendingSubscriptions as subscription}
                    <article class="subscription-item">
                      <div>
                        <strong>{subscription.plan?.title || 'Программа менторства'}</strong>
                        <span>{subscription.mentor?.fullName || 'Ментор'} · {subscriptionPrice(subscription)}</span>
                      </div>
                      <a class="btn btn-primary btn-sm" href={`/checkout/subscriptions/${subscription.id}`}>Оплатить</a>
                    </article>
                  {/each}
                </div>
              {/if}

              <a class="btn btn-outline support-link" href="/trust">Помощь с оплатой</a>
            </div>
          </aside>
        {/if}
      </div>
    </main>
  {/if}
</div>

<style>
  .shell {
    max-width: 1120px;
    margin: 0 auto;
    padding: 48px 20px 100px;
  }

  .page-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    margin-bottom: 28px;
  }

  .page-title {
    font-size: 1.75rem;
    font-weight: 800;
    color: var(--ink);
    margin: 0 0 6px;
  }

  .page-subtitle {
    margin: 0;
    color: var(--muted);
    line-height: 1.5;
  }

  .alert-success,
  .alert-error {
    border-radius: var(--radius-md);
    padding: 12px 16px;
    margin-bottom: 20px;
    font-weight: 500;
  }

  .alert-success {
    background: var(--status-success-bg);
    border: 1px solid var(--status-success-border);
    color: var(--status-success-ink);
  }

  .alert-error {
    background: var(--status-error-bg);
    border: 1px solid var(--status-error-border);
    color: var(--status-error-ink);
  }

  .kpi-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    margin-bottom: 32px;
  }

  .kpi-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 20px 22px;
  }

  .kpi-label {
    font-size: 0.82rem;
    color: var(--muted);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0;
    margin: 0 0 8px;
  }

  .kpi-value {
    font-size: 1.55rem;
    font-weight: 800;
    color: var(--ink);
    margin: 0;
    display: flex;
    align-items: baseline;
    gap: 6px;
    flex-wrap: wrap;
  }

  .kpi-value.accent {
    color: var(--accent);
  }

  .kpi-sub {
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--muted);
  }

  .content-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 320px;
    gap: 24px;
    align-items: start;
  }

  .history-section h2,
  .panel-box h2 {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--ink);
    margin: 0 0 16px;
  }

  .empty-text {
    color: var(--muted);
    font-size: 0.9rem;
    margin: 0;
    line-height: 1.5;
  }

  .table-wrap {
    overflow-x: auto;
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
  }

  .history-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.88rem;
  }

  .history-table thead {
    background: var(--bg-alt);
  }

  .history-table th {
    padding: 12px 16px;
    text-align: left;
    font-size: 0.78rem;
    font-weight: 700;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0;
    white-space: nowrap;
  }

  .history-table td {
    padding: 13px 16px;
    border-top: 1px solid var(--border);
    color: var(--ink-secondary);
    vertical-align: middle;
  }

  .history-table tbody tr:hover {
    background: var(--bg-alt);
  }

  .td-name {
    font-weight: 600;
    color: var(--ink);
    white-space: nowrap;
  }

  .td-service {
    max-width: 220px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .td-date {
    white-space: nowrap;
    color: var(--muted);
    font-size: 0.82rem;
  }

  .col-amount,
  .td-amount {
    text-align: right;
  }

  .td-amount {
    font-weight: 700;
    color: var(--accent);
    white-space: nowrap;
  }

  .st-badge {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 600;
    white-space: nowrap;
  }

  .st-success {
    background: var(--status-success-bg);
    color: var(--status-success-ink);
  }

  .st-warning {
    background: var(--status-warning-bg);
    color: var(--status-warning-ink);
  }

  .st-error {
    background: var(--status-error-bg);
    color: var(--status-error-ink);
  }

  .st-muted {
    background: var(--bg-alt);
    color: var(--muted);
  }

  .side-panel {
    position: sticky;
    top: 24px;
  }

  .panel-box {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 22px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .payout-balance {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    background: var(--bg-alt);
    border-radius: var(--radius-md);
    padding: 12px 14px;
  }

  .payout-balance span {
    font-size: 0.85rem;
    color: var(--muted);
  }

  .payout-balance strong {
    font-size: 1.1rem;
    font-weight: 800;
    color: var(--accent);
  }

  .section-label {
    font-size: 0.78rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0;
    color: var(--muted);
    margin: 0;
  }

  .method-list,
  .subscription-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .method-item {
    width: 100%;
    text-align: left;
    padding: 12px 14px;
    background: var(--bg-alt);
    border: 1.5px solid var(--border);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all 0.15s ease;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .method-item:hover {
    border-color: var(--accent);
  }

  .method-item.method-selected {
    border-color: var(--accent);
    background: var(--accent-muted);
  }

  .method-name {
    font-weight: 600;
    font-size: 0.88rem;
    color: var(--ink);
  }

  .method-desc {
    font-size: 0.78rem;
    color: var(--muted);
  }

  .subscription-item {
    display: grid;
    gap: 10px;
    padding: 12px;
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    background: var(--bg-alt);
  }

  .subscription-item strong,
  .subscription-item span {
    display: block;
  }

  .subscription-item span {
    margin-top: 3px;
    color: var(--muted);
    font-size: 0.84rem;
  }

  .withdraw-btn,
  .support-link {
    width: 100%;
    justify-content: center;
  }

  .panel-note {
    font-size: 0.76rem;
    color: var(--muted);
    margin: 0;
    line-height: 1.5;
  }

  @media (max-width: 1000px) {
    .kpi-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 800px) {
    .content-grid {
      grid-template-columns: minmax(0, 1fr);
    }

    .side-panel {
      position: static;
    }
  }

  @media (max-width: 560px) {
    .shell {
      padding: 28px 16px 80px;
    }

    .page-head {
      flex-direction: column;
    }

    .page-head .btn {
      width: 100%;
      justify-content: center;
    }

    .kpi-grid {
      grid-template-columns: 1fr;
    }

    .kpi-value {
      font-size: 1.2rem;
    }
  }
</style>
