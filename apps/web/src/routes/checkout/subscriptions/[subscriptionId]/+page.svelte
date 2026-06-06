<script lang="ts">
  import AppHeader from '$lib/components/AppHeader.svelte';
  import Loading from '$lib/components/Loading.svelte';
  import { api, ApiError } from '$lib/api';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { isAuthenticated, isLoading as authLoading } from '$lib/stores/auth';
  import { onMount } from 'svelte';

  interface SubscriptionDetail {
    id: string;
    mentorId: string;
    menteeId: string;
    status: string;
    monthlyPrice?: number | string | null;
    currency: string;
    mentor?: { id: string; fullName: string };
    plan?: {
      id: string;
      title: string;
      priceAmount: number | string;
      currency: string;
      billingIntervalMonths: number;
    };
  }

  interface PaymentIntentResponse {
    payment: {
      id: string;
      providerPaymentId: string;
    };
    checkoutUrl?: string;
    paymentMethods?: string[];
  }

  let subscription: SubscriptionDetail | null = null;
  let isLoading = true;
  let isProcessing = false;
  let paymentRequested = false;
  let paymentIntentId = '';
  let error: string | null = null;

  $: amount = subscription ? Number(subscription.monthlyPrice ?? subscription.plan?.priceAmount ?? 0) : 0;
  $: currency = subscription?.currency || subscription?.plan?.currency || 'USD';

  async function loadSubscription() {
    const items = await api.get<SubscriptionDetail[]>('/subscriptions/mine');
    subscription = items.find((item) => item.id === $page.params.subscriptionId) || null;
    if (!subscription) {
      error = 'Подписка не найдена или недоступна.';
    } else if (subscription.status !== 'approved_pending_payment') {
      error = 'Эта подписка пока не готова к оплате.';
    }
  }

  async function handlePayment() {
    if (!subscription || paymentRequested) return;
    isProcessing = true;
    error = null;

    try {
      const paymentIntent = await api.post<PaymentIntentResponse>('/payments/intent', {
        subscriptionId: subscription.id,
      });
      paymentIntentId = paymentIntent.payment.providerPaymentId;
      paymentRequested = true;

      const params = new URLSearchParams({
        subscriptionId: subscription.id,
        paymentIntentId,
        amount: String(amount),
        currency,
        mentor: subscription.mentor?.fullName || 'Ментор',
        service: subscription.plan?.title || 'Подписка',
        returnUrl: `/checkout/subscriptions/${subscription.id}`,
      });

      goto(`/acquiring/mock?${params.toString()}`);
    } catch (err) {
      error = extractError(err);
    } finally {
      isProcessing = false;
    }
  }

  async function confirmPayment(providerPaymentId: string) {
    isProcessing = true;
    error = null;
    try {
      await api.post('/payments/webhook', {
        type: 'payment_intent.succeeded',
        data: { object: { id: providerPaymentId } },
      });
      goto('/requests?success=subscription-paid');
    } catch (err) {
      error = extractError(err);
    } finally {
      isProcessing = false;
    }
  }

  function extractError(err: unknown) {
    if (err instanceof ApiError) {
      const message = err.data?.message;
      if (Array.isArray(message)) return message.join(', ');
      if (typeof message === 'string') return message;
      return `Ошибка API (${err.status})`;
    }
    if (err instanceof Error) return err.message;
    return 'Не удалось обработать оплату.';
  }

  onMount(async () => {
    if (!$isAuthenticated && !$authLoading) {
      goto('/login');
      return;
    }

    try {
      await loadSubscription();
      const mockPaid = $page.url.searchParams.get('mockPaid');
      const queryPaymentIntentId = $page.url.searchParams.get('paymentIntentId');
      const mockCanceled = $page.url.searchParams.get('mockCanceled');

      if (mockCanceled === '1') {
        error = 'Оплата отменена на странице эквайринга.';
      } else if (mockPaid === '1' && queryPaymentIntentId) {
        await confirmPayment(queryPaymentIntentId);
      }
    } finally {
      isLoading = false;
    }
  });
</script>

<div class="page">
  <AppHeader />

  {#if $authLoading || isLoading}
    <Loading />
  {:else}
    <main class="checkout-shell">
      <section class="checkout-main">
        <h1>Оплата подписки</h1>
        <p class="muted">После оплаты рабочее пространство по программе станет активным.</p>

        {#if error}
          <div class="alert status-error">{error}</div>
        {/if}

        {#if subscription}
          <div class="order">
            <div>
              <span class="muted">Программа</span>
              <strong>{subscription.plan?.title || 'Подписка'}</strong>
            </div>
            <div>
              <span class="muted">Ментор</span>
              <strong>{subscription.mentor?.fullName || subscription.mentorId}</strong>
            </div>
            <div>
              <span class="muted">Период</span>
              <strong>{subscription.plan?.billingIntervalMonths || 1} мес.</strong>
            </div>
            <div>
              <span class="muted">Сумма</span>
              <strong class="amount">{amount} {currency}</strong>
            </div>
          </div>

          <button
            class="btn btn-primary"
            on:click={handlePayment}
            disabled={isProcessing || paymentRequested || subscription.status !== 'approved_pending_payment'}
          >
            {isProcessing ? 'Обработка...' : 'Перейти к эквайрингу'}
          </button>
        {/if}
      </section>
    </main>
  {/if}
</div>

<style>
  .checkout-shell {
    width: min(760px, calc(100vw - 32px));
    margin: 0 auto;
    padding: 32px 0 48px;
  }

  .checkout-main {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 22px;
    display: grid;
    gap: 16px;
  }

  .checkout-main h1 {
    margin: 0;
  }

  .order {
    display: grid;
    gap: 12px;
    padding: 16px;
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    background: var(--bg-alt);
  }

  .order span {
    display: block;
    margin-bottom: 2px;
  }

  .amount {
    color: var(--accent-link);
    font-size: 1.25rem;
  }
</style>
