<script lang="ts">
  import AppHeader from '$lib/components/AppHeader.svelte';
  import Loading from '$lib/components/Loading.svelte';
  import { api, ApiError } from '$lib/api';
  import { isMentor, isAuthenticated, isLoading as authLoading } from '$lib/stores/auth';
  import { goto } from '$app/navigation';

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
    mentorAmount: number;
    currency: string;
    status: string;
    createdAt: string;
    paidAt?: string | null;
    session: {
      id: string;
      startAt: string;
      mentee: { id: string; fullName: string };
      service: { id: string; title: string };
    };
  }

  interface PayoutMethod {
    id: 'card' | 'korona_pay' | 'cbr';
    label: string;
    description: string;
  }

  let balance: Balance | null = null;
  let payments: PaymentItem[] = [];
  let payoutMethods: PayoutMethod[] = [];
  let selectedMethod: PayoutMethod['id'] | '' = '';
  let isLoading = true;
  let isSubmitting = false;
  let message: string | null = null;
  let errorMsg: string | null = null;
  let didLoad = false;

  const loadData = async () => {
    isLoading = true;
    try {
      const [bal, pmts, methods] = await Promise.all([
        api.get<Balance>('/payouts/balance'),
        api.get<PaymentItem[]>('/payments?role=mentor'),
        api.get<PayoutMethod[]>('/payouts/methods'),
      ]);
      balance = bal;
      payments = pmts;
      payoutMethods = methods;
      if (!selectedMethod && methods.length > 0) {
        selectedMethod = methods[0].id;
      }
    } finally {
      isLoading = false;
    }
  };

  $: if (!$authLoading) {
    if (!$isAuthenticated) {
      goto('/login');
    } else if (!$isMentor) {
      goto('/mentors');
    } else if (!didLoad) {
      didLoad = true;
      loadData();
    }
  }

  const requestPayout = async () => {
    if (!selectedMethod || !balance || balance.available <= 0) return;
    isSubmitting = true;
    message = null;
    errorMsg = null;

    try {
      await api.post('/payouts/request', { method: selectedMethod });
      message = 'Заявка на выплату создана.';
      await loadData();
    } catch (err) {
      errorMsg = err instanceof ApiError ? err.data?.message || 'Не удалось создать выплату.' : 'Не удалось создать выплату.';
    } finally {
      isSubmitting = false;
    }
  };

  const formatMoney = (amount: number, currency: string) =>
    `${Number(amount).toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ${currency}`;

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

  const paymentStatusLabel = (status: string) => {
    switch (status) {
      case 'succeeded': return 'Оплачено';
      case 'pending':   return 'Ожидает';
      case 'failed':    return 'Ошибка';
      case 'refunded':  return 'Возврат';
      default:          return status;
    }
  };

  const paymentStatusClass = (status: string) => {
    switch (status) {
      case 'succeeded': return 'st-success';
      case 'pending':   return 'st-warning';
      case 'failed':    return 'st-error';
      case 'refunded':  return 'st-muted';
      default:          return '';
    }
  };
</script>

<div class="page">
  <AppHeader />

  {#if $authLoading || isLoading}
    <Loading />
  {:else}
    <main class="shell">
      <h1 class="page-title">Финансы</h1>

      {#if message}
        <div class="alert alert-success">{message}</div>
      {/if}
      {#if errorMsg}
        <div class="alert alert-error">{errorMsg}</div>
      {/if}

      <!-- ── 4 KPI cards ── -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <p class="kpi-label">Общий заработок</p>
          <p class="kpi-value accent">{formatMoney(balance?.totalEarned ?? 0, balance?.currency ?? 'RUB')}</p>
        </div>
        <div class="kpi-card">
          <p class="kpi-label">Доступно к выводу</p>
          <p class="kpi-value">{formatMoney(balance?.available ?? 0, balance?.currency ?? 'RUB')}</p>
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

      <!-- ── Main content ── -->
      <div class="content-grid">

        <!-- Payment history table -->
        <div class="history-section">
          <h2>История платежей</h2>

          {#if payments.length === 0}
            <p class="empty-text">Платежей пока нет.</p>
          {:else}
            <div class="table-wrap">
              <table class="history-table">
                <thead>
                  <tr>
                    <th>Менти</th>
                    <th>Сессия</th>
                    <th>Дата</th>
                    <th>Статус</th>
                    <th class="col-amount">Сумма</th>
                  </tr>
                </thead>
                <tbody>
                  {#each payments as pmt}
                    <tr>
                      <td class="td-name">{pmt.session.mentee.fullName}</td>
                      <td class="td-service">{pmt.session.service.title}</td>
                      <td class="td-date">{formatDate(pmt.paidAt || pmt.createdAt)}</td>
                      <td>
                        <span class="st-badge {paymentStatusClass(pmt.status)}">
                          {paymentStatusLabel(pmt.status)}
                        </span>
                      </td>
                      <td class="td-amount">
                        {formatMoney(pmt.mentorAmount ?? pmt.amount, pmt.currency)}
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {/if}
        </div>

        <!-- Payout widget -->
        <aside class="payout-aside">
          <div class="payout-card">
            <h2>Вывести средства</h2>

            <div class="payout-balance">
              <span>Доступно</span>
              <strong>{formatMoney(balance?.available ?? 0, balance?.currency ?? 'RUB')}</strong>
            </div>

            <!-- Method list -->
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

            <p class="payout-note">
              Данные карты и платёжные реквизиты не хранятся в Mentory. Реальный процессинг — в разработке.
            </p>
          </div>
        </aside>
      </div>
    </main>
  {/if}
</div>

<style>
  .shell {
    max-width: 1100px;
    margin: 0 auto;
    padding: 48px 20px 100px;
  }

  .page-title {
    font-size: 1.75rem;
    font-weight: 800;
    color: var(--ink);
    margin: 0 0 28px;
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

  /* KPI grid */
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
    letter-spacing: 0.04em;
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

  /* Content grid */
  .content-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 300px;
    gap: 24px;
    align-items: start;
  }

  /* History table */
  .history-section h2 {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--ink);
    margin: 0 0 16px;
  }

  .empty-text {
    color: var(--muted);
    font-size: 0.9rem;
    margin: 0;
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
    letter-spacing: 0.04em;
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
    max-width: 200px;
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

  /* Status badges */
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

  /* Payout aside */
  .payout-aside {
    position: sticky;
    top: 24px;
  }

  .payout-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 22px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .payout-card h2 {
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--ink);
    margin: 0;
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
    letter-spacing: 0.05em;
    color: var(--muted);
    margin: 0;
  }

  .method-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
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

  .withdraw-btn {
    width: 100%;
    justify-content: center;
  }

  .payout-note {
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

  @media (max-width: 760px) {
    .content-grid {
      grid-template-columns: minmax(0, 1fr);
    }

    .payout-aside {
      position: static;
    }
  }

  @media (max-width: 560px) {
    .shell {
      padding: 28px 16px 80px;
    }

    .kpi-grid {
      grid-template-columns: 1fr 1fr;
    }

    .kpi-value {
      font-size: 1.2rem;
    }
  }
</style>
