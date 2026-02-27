<script lang="ts">
  import AppHeader from '$lib/components/AppHeader.svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { isAuthenticated, isLoading as authLoading } from '$lib/stores/auth';
  import { onMount } from 'svelte';

  let cardNumber = '';
  let cardHolder = '';
  let expiry = '';
  let cvv = '';
  let isProcessing = false;
  let error: string | null = null;

  const resolveReturnUrl = (value: string, fallbackSessionId: string) => {
    if (value && value.startsWith('/')) return value;
    if (fallbackSessionId) return `/checkout/${fallbackSessionId}`;
    return '/mentors';
  };

  $: sessionId = $page.url.searchParams.get('sessionId') ?? '';
  $: paymentIntentId = $page.url.searchParams.get('paymentIntentId') ?? '';
  $: amount = $page.url.searchParams.get('amount') ?? '';
  $: currency = $page.url.searchParams.get('currency') ?? '';
  $: mentor = $page.url.searchParams.get('mentor') ?? 'Ментор';
  $: service = $page.url.searchParams.get('service') ?? 'Сессия';
  $: returnUrl = $page.url.searchParams.get('returnUrl') ?? '';
  $: safeReturnUrl = resolveReturnUrl(returnUrl, sessionId);
  $: canPay = Boolean(sessionId && paymentIntentId && amount && currency);

  const formatCardNumber = (value: string) =>
    value
      .replace(/\D/g, '')
      .slice(0, 16)
      .replace(/(\d{4})(?=\d)/g, '$1 ');

  const formatExpiry = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    if (digits.length < 3) return digits;
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  };

  const withQuery = (base: string, params: URLSearchParams) => {
    const joiner = base.includes('?') ? '&' : '?';
    return `${base}${joiner}${params.toString()}`;
  };

  const handleCardNumberInput = (event: Event) => {
    const target = event.currentTarget as HTMLInputElement;
    cardNumber = formatCardNumber(target.value);
  };

  const handleExpiryInput = (event: Event) => {
    const target = event.currentTarget as HTMLInputElement;
    expiry = formatExpiry(target.value);
  };

  const handleCvvInput = (event: Event) => {
    const target = event.currentTarget as HTMLInputElement;
    cvv = target.value.replace(/\D/g, '').slice(0, 4);
  };

  const handleCancel = () => {
    const params = new URLSearchParams({ mockCanceled: '1' });
    goto(withQuery(safeReturnUrl, params));
  };

  const validate = () => {
    const cardDigits = cardNumber.replace(/\s/g, '');
    if (!canPay) return 'Не хватает данных для оплаты. Вернитесь в checkout.';
    if (cardDigits.length !== 16) return 'Введите номер карты из 16 цифр.';
    if (cardHolder.trim().length < 3) return 'Укажите имя держателя карты.';
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry)) return 'Срок действия должен быть в формате MM/YY.';
    if (!/^\d{3,4}$/.test(cvv)) return 'CVV должен содержать 3 или 4 цифры.';
    return null;
  };

  const handlePay = async () => {
    error = validate();
    if (error) return;

    isProcessing = true;

    try {
      await new Promise((resolve) => setTimeout(resolve, 900));

      const params = new URLSearchParams({
        mockPaid: '1',
        paymentIntentId,
        last4: cardNumber.replace(/\s/g, '').slice(-4),
      });
      goto(withQuery(safeReturnUrl, params));
    } catch {
      error = 'Не удалось обработать платёж. Попробуйте ещё раз.';
    } finally {
      isProcessing = false;
    }
  };

  onMount(() => {
    if (!$isAuthenticated && !$authLoading) {
      goto('/login');
    }
  });
</script>

<div class="page">
  <AppHeader />

  <main class="container section" style="max-width: 980px;">
    <div class="layout">
      <section class="card">
        <h1 class="section-title">Эквайринг (демо)</h1>
        <p class="muted">
          Это тестовая страница имитации оплаты картой. Реальные реквизиты не отправляются во внешний платёжный шлюз.
        </p>

        {#if error}
          <div class="surface error-box">{error}</div>
        {/if}

        <div class="form-stack">
          <label class="field">
            <span class="field-label">Номер карты</span>
            <input
              class="input"
              inputmode="numeric"
              placeholder="4242 4242 4242 4242"
              value={cardNumber}
              on:input={handleCardNumberInput}
              disabled={!canPay || isProcessing}
            />
          </label>

          <label class="field">
            <span class="field-label">Имя держателя</span>
            <input
              class="input"
              placeholder="IVAN IVANOV"
              bind:value={cardHolder}
              disabled={!canPay || isProcessing}
            />
          </label>

          <div class="row">
            <label class="field">
              <span class="field-label">Срок действия</span>
              <input
                class="input"
                inputmode="numeric"
                placeholder="MM/YY"
                value={expiry}
                on:input={handleExpiryInput}
                disabled={!canPay || isProcessing}
              />
            </label>

            <label class="field">
              <span class="field-label">CVV</span>
              <input
                class="input"
                inputmode="numeric"
                placeholder="123"
                value={cvv}
                on:input={handleCvvInput}
                disabled={!canPay || isProcessing}
              />
            </label>
          </div>
        </div>

        <div class="actions">
          <button class="btn btn-primary" on:click={handlePay} disabled={!canPay || isProcessing}>
            {isProcessing ? 'Обрабатываем платёж...' : 'Оплатить'}
          </button>
          <button class="btn btn-ghost" on:click={handleCancel} disabled={isProcessing}>
            Отменить
          </button>
        </div>
      </section>

      <aside class="card summary">
        <h2 style="margin-top: 0;">Сводка заказа</h2>
        <div class="summary-item">
          <span class="muted">Услуга</span>
          <strong>{service}</strong>
        </div>
        <div class="summary-item">
          <span class="muted">Ментор</span>
          <strong>{mentor}</strong>
        </div>
        <div class="summary-item">
          <span class="muted">Сумма</span>
          <strong class="amount">{amount} {currency}</strong>
        </div>
        <div class="surface" style="margin-top: 16px;">
          <div class="muted" style="font-size: 0.85rem;">
            Тестовые данные карты:
            <br />
            4242 4242 4242 4242, срок 12/30, CVV 123.
          </div>
        </div>
      </aside>
    </div>
  </main>
</div>

<style>
  .layout {
    display: grid;
    gap: 16px;
    grid-template-columns: 1.4fr 1fr;
    align-items: start;
  }

  .form-stack {
    margin-top: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .field-label {
    font-size: 0.9rem;
    color: var(--muted);
  }

  .row {
    display: grid;
    gap: 12px;
    grid-template-columns: 1fr 1fr;
  }

  .actions {
    margin-top: 16px;
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  .summary {
    position: sticky;
    top: 90px;
  }

  .summary-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    margin-top: 10px;
  }

  .amount {
    color: var(--accent);
    font-size: 1.25rem;
  }

  .error-box {
    margin-top: 12px;
    background: var(--status-error-bg);
    border-color: var(--status-error-border);
    color: var(--status-error-ink);
  }

  @media (max-width: 900px) {
    .layout {
      grid-template-columns: 1fr;
    }

    .summary {
      position: static;
    }

    .row {
      grid-template-columns: 1fr;
    }
  }
</style>
