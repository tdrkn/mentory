<script lang="ts">
  import AppHeader from '$lib/components/AppHeader.svelte';
  import Loading from '$lib/components/Loading.svelte';
  import { api, ApiError } from '$lib/api';
  import { onMount } from 'svelte';
  import { isMentor, isAuthenticated, isLoading as authLoading } from '$lib/stores/auth';
  import { goto } from '$app/navigation';

  interface Balance {
    available: number;
    pending: number;
    currency: string;
  }

  interface Payout {
    id: string;
    amount: string;
    currency: string;
    status: string;
    provider?: string;
    createdAt: string;
  }

  interface PayoutMethod {
    id: 'card' | 'korona_pay' | 'cbr';
    label: string;
    description: string;
  }

  let balance: Balance | null = null;
  let payouts: Payout[] = [];
  let payoutMethods: PayoutMethod[] = [];
  let selectedMethod: PayoutMethod['id'] | '' = '';
  let destinationToken = '';
  let isLoading = true;
  let isSubmitting = false;
  let message: string | null = null;
  let error: string | null = null;

  const loadData = async () => {
    balance = await api.get<Balance>('/payouts/balance');
    payouts = await api.get<Payout[]>('/payouts');
    payoutMethods = await api.get<PayoutMethod[]>('/payouts/methods');

    if (!selectedMethod && payoutMethods.length > 0) {
      selectedMethod = payoutMethods[0].id;
    }
  };

  const requestPayout = async () => {
    if (!selectedMethod) return;

    isSubmitting = true;
    message = null;
    error = null;

    try {
      await api.post('/payouts/request', {
        method: selectedMethod,
        destinationToken: destinationToken.trim() || undefined,
      });
      message = 'Заявка на выплату создана и отправлена в эквайринг.';
      destinationToken = '';
      await loadData();
    } catch (err) {
      error = err instanceof ApiError ? err.data?.message || 'Не удалось создать выплату.' : 'Не удалось создать выплату.';
    } finally {
      isSubmitting = false;
    }
  };

  const payoutMethodLabel = (provider?: string) => {
    if (!provider) return 'Не указано';
    const methodId = provider.replace('acquirer_mock_', '');
    return payoutMethods.find((method) => method.id === methodId)?.label || provider;
  };

  onMount(async () => {
    if (!$isAuthenticated && !$authLoading) {
      goto('/login');
      return;
    }
    if ($isAuthenticated && !$isMentor) {
      goto('/mentors');
      return;
    }
    await loadData();
    isLoading = false;
  });
</script>

<div class="page">
  <AppHeader />

  {#if $authLoading || isLoading}
    <Loading />
  {:else}
    <main class="container section">
      <h1 class="section-title">Заработок и выплаты</h1>

      {#if message}
        <div class="surface" style="margin-top:12px;background:#dcfce7;border-color:#bbf7d0;color:#166534;">{message}</div>
      {/if}

      {#if error}
        <div class="surface" style="margin-top:12px;background:#fee2e2;border-color:#fecaca;color:#991b1b;">{error}</div>
      {/if}

      <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin:18px 0;">
        <div class="card">
          <div class="muted">Доступно</div>
          <div style="font-size:1.6rem;font-weight:700;color:var(--accent);">{balance?.available ?? 0} {balance?.currency || ''}</div>
        </div>
        <div class="card">
          <div class="muted">В ожидании</div>
          <div style="font-size:1.6rem;font-weight:700;color:var(--amber);">{balance?.pending ?? 0} {balance?.currency || ''}</div>
        </div>
      </div>

      <div class="grid" style="grid-template-columns:2fr 1fr;gap:20px;">
        <div class="card">
          <h2 class="section-title">История выплат</h2>
          {#if payouts.length === 0}
            <p class="muted">Пока нет выплат.</p>
          {:else}
            <div class="stack">
              {#each payouts as payout}
                <div class="surface" style="display:flex;justify-content:space-between;align-items:center;">
                  <div>
                    <strong>{payout.amount} {payout.currency}</strong>
                    <div class="muted">{new Date(payout.createdAt).toLocaleDateString('ru-RU')}</div>
                    <div class="muted" style="font-size:0.8rem;">Метод: {payoutMethodLabel(payout.provider)}</div>
                  </div>
                  <span class="badge">{payout.status}</span>
                </div>
              {/each}
            </div>
          {/if}
        </div>

        <div class="card">
          <h2 class="section-title">Вывод средств</h2>
          <p class="muted">Доступно к выводу: {balance?.available ?? 0} {balance?.currency || ''}</p>
          <label style="display:block;margin-top:12px;">
            <div class="muted" style="margin-bottom:6px;">Способ вывода</div>
            <select class="input" bind:value={selectedMethod}>
              {#each payoutMethods as method}
                <option value={method.id}>{method.label}</option>
              {/each}
            </select>
          </label>
          {#if selectedMethod}
            <p class="muted" style="margin-top:6px;font-size:0.84rem;">
              {payoutMethods.find((method) => method.id === selectedMethod)?.description}
            </p>
          {/if}
          <label style="display:block;margin-top:10px;">
            <div class="muted" style="margin-bottom:6px;">Токен/идентификатор в эквайринге (опционально)</div>
            <input class="input" bind:value={destinationToken} placeholder="Например, ext_payout_token_123" />
          </label>
          <button
            class="btn btn-primary"
            style="width:100%;margin-top:12px;"
            on:click={requestPayout}
            disabled={isSubmitting || !selectedMethod}
          >
            {isSubmitting ? 'Отправка...' : 'Запросить выплату'}
          </button>
          <p class="muted" style="margin-top:8px;font-size:0.82rem;">
            Данные карты и платёжные реквизиты не хранятся в Mentory.
          </p>
        </div>
      </div>
    </main>
  {/if}
</div>
