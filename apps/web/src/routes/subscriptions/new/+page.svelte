<script lang="ts">
  import AppHeader from '$lib/components/AppHeader.svelte';
  import Loading from '$lib/components/Loading.svelte';
  import { api, ApiError } from '$lib/api';
  import { user, isAuthenticated, isLoading as authLoading } from '$lib/stores/auth';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { CheckCircle2 } from 'lucide-svelte';

  interface Plan {
    id: string;
    title: string;
    description?: string | null;
    kind: string;
    priceAmount: string;
    currency: string;
    billingIntervalMonths: number;
    callsPerMonth?: number | null;
    sessionDurationMin?: number | null;
    responseTimeHours?: number | null;
    includesUnlimitedChat: boolean;
  }

  interface MentorBasic {
    id: string;
    fullName: string;
    avatarUrl?: string | null;
    mentorPlans?: Plan[];
  }

  // URL params
  $: planId = $page.url.searchParams.get('planId') || '';
  $: mentorId = $page.url.searchParams.get('mentorId') || '';

  // Contact form
  let firstName = '';
  let lastName = '';
  let email = '';

  // Application fields
  let goal = '';
  let motivation = '';

  // Data
  let plan: Plan | null = null;
  let mentor: MentorBasic | null = null;

  // UI state
  let isLoading = true;
  let loadError: string | null = null;
  let isSubmitting = false;
  let submitError: string | null = null;
  let submitted = false;
  let didLoad = false;

  const formatMoney = (amount: string | number, currency: string) => {
    const value = Number(amount);
    if (!Number.isFinite(value)) return `${amount} ${currency}`;
    return `${value.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ${currency}`;
  };

  const planFeatures = (p: Plan) => {
    const explicit = (p.description || '')
      .split('\n')
      .map((item) => item.replace(/^[-•]\s*/, '').trim())
      .filter(Boolean);

    if (explicit.length > 0) return explicit;

    return [
      p.includesUnlimitedChat ? 'Поддержка в чате без ограничений' : null,
      p.callsPerMonth ? `${p.callsPerMonth} созвона в месяц` : null,
      p.sessionDurationMin ? `Длительность встречи ${p.sessionDurationMin} мин` : null,
      p.responseTimeHours ? `Ответ в течение ${p.responseTimeHours} ч` : null,
    ].filter(Boolean) as string[];
  };

  const loadData = async () => {
    if (!planId || !mentorId) {
      loadError = 'Не указан план или ментор.';
      isLoading = false;
      return;
    }

    try {
      const mentorData = await api.get<MentorBasic & { mentorPlans?: Plan[] }>(`/mentors/${mentorId}`);
      mentor = { id: mentorData.id, fullName: mentorData.fullName, avatarUrl: mentorData.avatarUrl };
      plan = mentorData.mentorPlans?.find((p) => p.id === planId) ?? null;

      if (!plan) {
        loadError = 'План подписки не найден.';
        isLoading = false;
        return;
      }

      // Pre-fill contact info
      if ($user) {
        firstName = ($user as any).firstName || $user.fullName?.split(' ')[0] || '';
        lastName = ($user as any).lastName || $user.fullName?.split(' ').slice(1).join(' ') || '';
        email = $user.email || '';
      }
    } catch {
      loadError = 'Не удалось загрузить данные.';
    } finally {
      isLoading = false;
    }
  };

  $: if (!$authLoading) {
    if (!$isAuthenticated) {
      goto('/login');
    } else if (!didLoad) {
      didLoad = true;
      loadData();
    }
  }

  const handleSubmit = async () => {
    if (!goal.trim()) {
      submitError = 'Укажите цель — это поможет ментору принять решение.';
      return;
    }
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      submitError = 'Заполните контактную информацию.';
      return;
    }

    isSubmitting = true;
    submitError = null;

    try {
      await api.post('/subscriptions', {
        planId,
        requestGoal: goal.trim(),
        requestMotivation: motivation.trim() || undefined,
      });

      submitted = true;
    } catch (err) {
      if (err instanceof ApiError) {
        submitError = err.data?.message || 'Не удалось отправить заявку.';
      } else {
        submitError = 'Ошибка соединения.';
      }
    } finally {
      isSubmitting = false;
    }
  };
</script>

<div class="page">
  <AppHeader />

  {#if $authLoading || isLoading}
    <Loading />
  {:else if loadError}
    <main class="shell">
      <div class="error-card">
        <h2>Не удалось загрузить страницу</h2>
        <p>{loadError}</p>
        <a class="btn btn-outline" href="/mentors">Вернуться к каталогу</a>
      </div>
    </main>
  {:else if submitted}
    <main class="shell">
      <div class="success-card">
        <div class="success-icon">
          <CheckCircle2 size={48} />
        </div>
        <h1>Заявка отправлена!</h1>
        <p>
          Ментор <strong>{mentor?.fullName}</strong> получит вашу заявку и свяжется с вами.
          Обычно ответ приходит в течение 24 часов.
        </p>
        <div class="success-actions">
          <a class="btn btn-primary" href="/subscriptions">Мои подписки</a>
          <a class="btn btn-ghost" href="/mentors">К каталогу</a>
        </div>
      </div>
    </main>
  {:else if plan && mentor}
    <main class="shell">
      <a class="back-link" href="/mentors/{mentor.id}">
        ← Вернуться к профилю
      </a>

      <h1 class="page-title">Заявка на подписку</h1>

      <div class="layout">
        <!-- Left: form -->
        <div class="form-col">

          <!-- Contact info -->
          <section class="form-section">
            <h2>Контактная информация</h2>
            <div class="name-row">
              <div class="form-group">
                <label class="label" for="firstName">Имя</label>
                <input id="firstName" class="input" bind:value={firstName} placeholder="Иван" />
              </div>
              <div class="form-group">
                <label class="label" for="lastName">Фамилия</label>
                <input id="lastName" class="input" bind:value={lastName} placeholder="Иванов" />
              </div>
            </div>
            <div class="form-group">
              <label class="label" for="email">Email</label>
              <input id="email" class="input" type="email" bind:value={email} placeholder="you@example.com" />
            </div>
          </section>

          <!-- Goal (required) -->
          <section class="form-section">
            <h2>Цель <span class="required">*</span></h2>
            <p class="hint">Опишите, чего вы хотите достичь с помощью этого ментора. Это поле обязательно.</p>
            <input
              class="input"
              bind:value={goal}
              placeholder="Например: хочу перейти в продуктовый менеджмент..."
              maxlength="500"
            />
            <span class="char-count">{goal.length}/500</span>
          </section>

          <!-- Motivation (optional) -->
          <section class="form-section">
            <h2>Мотивационное письмо <span class="optional">(необязательно)</span></h2>
            <p class="hint">Расскажите о себе подробнее: опыт, контекст, почему выбрали именно этого ментора.</p>
            <textarea
              class="input motivation-textarea"
              bind:value={motivation}
              rows="5"
              placeholder="Я работаю в IT уже 3 года и хочу..."
            ></textarea>
          </section>

          {#if submitError}
            <p class="submit-error">{submitError}</p>
          {/if}

          <button
            class="btn btn-primary submit-btn"
            on:click={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Отправка...' : 'Подать заявку'}
          </button>

          <p class="submit-notice">
            Ментор рассмотрит заявку и свяжется с вами. Оплата — только после одобрения.
          </p>
        </div>

        <!-- Right: plan summary -->
        <aside class="summary-col">
          <div class="summary-card">
            <div class="summary-mentor">
              <div class="summary-avatar">{mentor.fullName.slice(0, 1)}</div>
              <div>
                <p class="summary-mentor-name">{mentor.fullName}</p>
                <p class="summary-role">Ментор</p>
              </div>
            </div>

            <div class="summary-divider"></div>

            <div class="plan-info">
              <h3>{plan.title}</h3>
              {#if plan.billingIntervalMonths}
                <p class="plan-period">
                  {Math.max(1, plan.billingIntervalMonths) * 30} дней
                  {#if plan.callsPerMonth}· {plan.callsPerMonth} сессии{/if}
                </p>
              {/if}
            </div>

            {#if planFeatures(plan).length}
              <ul class="plan-features">
                {#each planFeatures(plan) as feat}
                  <li>{feat}</li>
                {/each}
              </ul>
            {/if}

            <div class="summary-divider"></div>

            <div class="summary-price">
              <span>Стоимость</span>
              <strong>{formatMoney(plan.priceAmount, plan.currency)}<span class="price-period">/мес</span></strong>
            </div>

            <p class="payment-note">
              Оплата возможна только после одобрения заявки ментором.
            </p>
          </div>
        </aside>
      </div>
    </main>
  {/if}
</div>

<style>
  .shell {
    max-width: 1040px;
    margin: 0 auto;
    padding: 48px 20px 100px;
  }

  .back-link {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: var(--muted);
    font-size: 0.9rem;
    margin-bottom: 24px;
    transition: color 0.15s ease;
    text-decoration: none;
  }

  .back-link:hover {
    color: var(--accent);
  }

  .page-title {
    font-size: 1.75rem;
    font-weight: 800;
    margin: 0 0 32px;
    color: var(--ink);
  }

  .layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 300px;
    gap: 28px;
    align-items: start;
  }

  .form-col {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .form-section {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .form-section h2 {
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--ink);
    margin: 0;
  }

  .required {
    color: var(--status-error-ink);
    font-size: 1rem;
  }

  .optional {
    font-size: 0.8rem;
    font-weight: 400;
    color: var(--muted);
  }

  .hint {
    font-size: 0.88rem;
    color: var(--muted);
    margin: 0;
    line-height: 1.5;
  }

  .name-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .label {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--ink-secondary);
  }

  .motivation-textarea {
    resize: vertical;
    font-family: inherit;
    line-height: 1.5;
  }

  .char-count {
    font-size: 0.78rem;
    color: var(--muted);
    text-align: right;
  }

  .submit-error {
    color: var(--status-error-ink);
    font-size: 0.9rem;
    margin: 0;
  }

  .submit-btn {
    width: 100%;
    justify-content: center;
    font-size: 1rem;
  }

  .submit-notice {
    font-size: 0.8rem;
    color: var(--muted);
    text-align: center;
    margin: 0;
    line-height: 1.5;
  }

  /* Summary card */
  .summary-col {
    position: sticky;
    top: 24px;
  }

  .summary-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 22px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .summary-mentor {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .summary-avatar {
    width: 44px;
    height: 44px;
    flex: 0 0 44px;
    border-radius: 12px;
    background: var(--accent-soft);
    color: var(--accent);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.3rem;
    font-weight: 800;
  }

  .summary-mentor-name {
    font-weight: 700;
    color: var(--ink);
    margin: 0;
    font-size: 0.95rem;
  }

  .summary-role {
    font-size: 0.8rem;
    color: var(--muted);
    margin: 0;
  }

  .summary-divider {
    height: 1px;
    background: var(--border);
  }

  .plan-info h3 {
    font-size: 1rem;
    font-weight: 700;
    color: var(--ink);
    margin: 0 0 4px;
  }

  .plan-period {
    font-size: 0.82rem;
    color: var(--muted);
    margin: 0;
  }

  .plan-features {
    margin: 0;
    padding-left: 18px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .plan-features li {
    font-size: 0.85rem;
    color: var(--ink-secondary);
    line-height: 1.4;
  }

  .summary-price {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .summary-price span {
    font-size: 0.9rem;
    color: var(--muted);
  }

  .summary-price strong {
    font-size: 1.25rem;
    font-weight: 800;
    color: var(--accent);
  }

  .price-period {
    font-size: 0.75rem;
    font-weight: 500;
  }

  .payment-note {
    font-size: 0.78rem;
    color: var(--muted);
    margin: 0;
    line-height: 1.5;
    padding: 10px 12px;
    background: var(--bg-alt);
    border-radius: var(--radius-md);
  }

  /* Success state */
  .success-card {
    max-width: 520px;
    margin: 80px auto;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 48px 40px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
  }

  .success-icon {
    color: var(--status-success-ink);
  }

  .success-card h1 {
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--ink);
    margin: 0;
  }

  .success-card p {
    color: var(--muted);
    line-height: 1.6;
    margin: 0;
  }

  .success-actions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    justify-content: center;
    margin-top: 8px;
  }

  /* Error card */
  .error-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 40px;
    text-align: center;
    max-width: 500px;
    margin: 80px auto;
  }

  .error-card h2 {
    margin: 0 0 12px;
    color: var(--ink);
  }

  .error-card p {
    color: var(--muted);
    margin: 0 0 24px;
  }

  @media (max-width: 860px) {
    .layout {
      grid-template-columns: minmax(0, 1fr);
    }

    .summary-col {
      position: static;
      order: -1;
    }
  }

  @media (max-width: 560px) {
    .shell {
      padding: 28px 16px 80px;
    }

    .name-row {
      grid-template-columns: 1fr;
    }

    .success-card {
      margin: 40px auto;
      padding: 32px 20px;
    }
  }
</style>
