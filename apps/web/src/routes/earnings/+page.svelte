<script lang="ts">
  import AppHeader from '$lib/components/AppHeader.svelte';
  import Loading from '$lib/components/Loading.svelte';
  import { api } from '$lib/api';
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
    createdAt: string;
  }

  let balance: Balance | null = null;
  let payouts: Payout[] = [];
  let isLoading = true;
  let message: string | null = null;

  const loadData = async () => {
    balance = await api.get<Balance>('/payouts/balance');
    payouts = await api.get<Payout[]>('/payouts');
  };

  const requestPayout = async () => {
    message = null;
    await api.post('/payouts/request');
    message = 'Заявка на выплату создана.';
    await loadData();
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
          <button class="btn btn-primary" style="width:100%;margin-top:12px;" on:click={requestPayout}>
            Запросить выплату
          </button>
        </div>
      </div>
    </main>
  {/if}
</div>
