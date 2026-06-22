<script lang="ts">
  import AppHeader from '$lib/components/AppHeader.svelte';
  import Loading from '$lib/components/Loading.svelte';
  import { api, ApiError } from '$lib/api';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { isLoading as authLoading, isAuthenticated, isMentor, user } from '$lib/stores/auth';

  interface UserRef {
    id: string;
    fullName: string;
    email: string;
  }

  interface MentorshipPlan {
    id: string;
    mentorId: string;
    title: string;
    description?: string | null;
    kind: 'subscription' | 'one_off';
    priceAmount: number | string;
    currency: string;
    billingIntervalMonths: number;
    callsPerMonth?: number | null;
    sessionDurationMin?: number | null;
    responseTimeHours?: number | null;
    includesUnlimitedChat: boolean;
    isActive: boolean;
    createdAt: string;
    mentor?: UserRef;
  }

  interface MentorshipSubscription {
    id: string;
    mentorId: string;
    menteeId: string;
    planId: string;
    status: 'pending' | 'approved_pending_payment' | 'active' | 'paused' | 'ended' | 'rejected';
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

  interface MentorshipTask {
    id: string;
    subscriptionId: string;
    createdById: string;
    assigneeId: string;
    title: string;
    description?: string | null;
    status: 'todo' | 'in_progress' | 'done';
    startDate?: string | null;
    dueDate?: string | null;
    completedAt?: string | null;
    createdAt: string;
  }

  interface MentorshipBookmark {
    id: string;
    subscriptionId: string;
    createdById: string;
    title: string;
    description?: string | null;
    url: string;
    createdAt: string;
  }

  interface WorkspacePayload {
    subscription: MentorshipSubscription;
    tasks: MentorshipTask[];
    bookmarks: MentorshipBookmark[];
  }

  interface CreditsPayload {
    balance: {
      menteeId: string;
      amountCents: number;
      currency: string;
      expiresAt?: string | null;
    };
    transactions: Array<{
      id: string;
      type: string;
      status: string;
      amountCents: number;
      description?: string;
      createdAt: string;
      externalRef?: string | null;
    }>;
  }

  let isPageLoading = true;
  let isBusy = false;
  let errorMessage = '';
  let infoMessage = '';

  let subscriptions: MentorshipSubscription[] = [];
  let selectedSubscriptionId = '';
  let workspace: WorkspacePayload | null = null;

  let myPlans: MentorshipPlan[] = [];
  let mentorLookupId = '';
  let mentorPlans: MentorshipPlan[] = [];

  let credits: CreditsPayload | null = null;

  const taskForm = {
    title: '',
    description: '',
    assigneeId: '',
    startDate: '',
    dueDate: '',
  };

  const bookmarkForm = {
    title: '',
    description: '',
    url: '',
  };

  const planForm = {
    title: '',
    description: '',
    priceAmount: 0,
    callsPerMonth: 2,
    sessionDurationMin: 60,
    responseTimeHours: 24,
    billingIntervalMonths: 1,
  };

  const subscribeForm = {
    planId: '',
    requestGoal: '',
    requestMotivation: '',
    notes: '',
  };

  const creditsForm = {
    topupAmountRub: 500,
    expiresInDays: 365,
    redeemCode: '',
  };

  $: selectedSubscription = subscriptions.find((item) => item.id === selectedSubscriptionId) || null;
  $: selectedPlanForSubscription = mentorPlans.find((plan) => plan.id === subscribeForm.planId) || null;
  $: sortedSubscriptions = sortSubscriptions(subscriptions);
  $: canManagePlans = $isMentor || $user?.role === 'admin';
  $: canCreateSubscription = $user?.role === 'mentee' || $user?.role === 'both' || $user?.role === 'admin';
  $: canUseCredits = $user?.role === 'mentee' || $user?.role === 'both' || $user?.role === 'admin';

  onMount(async () => {
    if (!$isAuthenticated && !$authLoading) {
      goto('/login');
      return;
    }

    await loadPage();
  });

  async function loadPage() {
    errorMessage = '';
    infoMessage = '';
    isPageLoading = true;

    try {
      await Promise.all([loadSubscriptions(), loadMyPlans()]);
    } catch (err) {
      errorMessage = extractError(err);
    } finally {
      isPageLoading = false;
    }
  }

  async function loadSubscriptions() {
    subscriptions = await api.get<MentorshipSubscription[]>('/subscriptions/mine');

    if (subscriptions.length === 0) {
      selectedSubscriptionId = '';
      workspace = null;
      return;
    }

    const workspaceCandidate =
      subscriptions.find((item) => item.id === selectedSubscriptionId && canOpenWorkspace(item.status)) ||
      subscriptions.find((item) => canOpenWorkspace(item.status));

    if (!workspaceCandidate) {
      selectedSubscriptionId = subscriptions[0].id;
      workspace = null;
      return;
    }

    if (!selectedSubscriptionId || selectedSubscriptionId !== workspaceCandidate.id) {
      selectedSubscriptionId = workspaceCandidate.id;
    }

    await loadWorkspace(selectedSubscriptionId);
  }

  async function loadWorkspace(subscriptionId: string) {
    workspace = await api.get<WorkspacePayload>(`/subscriptions/${subscriptionId}/workspace`);

    if (!taskForm.assigneeId) {
      taskForm.assigneeId = workspace.subscription.menteeId;
    }
  }

  async function loadCredits() {
    if (!canUseCredits) {
      credits = null;
      return;
    }

    credits = await api.get<CreditsPayload>('/subscriptions/credits/me');
  }

  async function loadMyPlans() {
    if (!canManagePlans) {
      myPlans = [];
      return;
    }

    myPlans = await api.get<MentorshipPlan[]>('/subscriptions/plans/me');
  }

  async function withBusy(action: () => Promise<void>) {
    errorMessage = '';
    infoMessage = '';
    isBusy = true;

    try {
      await action();
    } catch (err) {
      errorMessage = extractError(err);
    } finally {
      isBusy = false;
    }
  }

  async function createPlan() {
    await withBusy(async () => {
      if (!planForm.title.trim()) {
        throw new Error('Укажите название программы');
      }

      if (Number(planForm.priceAmount) <= 0) {
        throw new Error('Укажите стоимость больше нуля');
      }

      await api.post('/subscriptions/plans', {
        title: planForm.title.trim(),
        description: planForm.description || undefined,
        priceAmount: Number(planForm.priceAmount),
        currency: 'RUB',
        billingIntervalMonths: Number(planForm.billingIntervalMonths),
        callsPerMonth: Number(planForm.callsPerMonth),
        sessionDurationMin: Number(planForm.sessionDurationMin),
        responseTimeHours: Number(planForm.responseTimeHours),
        includesUnlimitedChat: true,
      });

      planForm.title = '';
      planForm.description = '';
      planForm.priceAmount = 0;
      infoMessage = 'Программа опубликована';
      await loadMyPlans();
    });
  }

  async function searchMentorPlans() {
    await withBusy(async () => {
      mentorPlans = [];

      if (!mentorLookupId.trim()) {
        throw new Error('Введите ID ментора');
      }

      mentorPlans = await api.get<MentorshipPlan[]>(`/subscriptions/plans/mentor/${mentorLookupId.trim()}`);
      infoMessage = `Найдено планов: ${mentorPlans.length}`;
    });
  }

  async function subscribeToPlan(planId?: string) {
    await withBusy(async () => {
      const targetPlanId = planId || subscribeForm.planId.trim();

      if (!targetPlanId) {
        throw new Error('Выберите программу или вставьте код программы');
      }

      await api.post('/subscriptions', {
        planId: targetPlanId,
        requestGoal: subscribeForm.requestGoal.trim() || undefined,
        requestMotivation: subscribeForm.requestMotivation.trim() || undefined,
        notes: subscribeForm.notes || undefined,
      });

      subscribeForm.planId = '';
      subscribeForm.requestGoal = '';
      subscribeForm.requestMotivation = '';
      subscribeForm.notes = '';
      infoMessage = 'Заявка на подключение отправлена ментору';
      await loadSubscriptions();
    });
  }

  function selectPlanForSubscription(planId: string) {
    subscribeForm.planId = planId;
    infoMessage = 'Программа выбрана. Расскажите ментору, с чем нужна помощь, и отправьте заявку.';
  }

  async function changeSubscriptionStatus(subscriptionId: string, status: MentorshipSubscription['status']) {
    await withBusy(async () => {
      await api.patch(`/subscriptions/${subscriptionId}/status`, { status });
      infoMessage = 'Статус подключения обновлён';
      await loadSubscriptions();
    });
  }

  async function selectSubscription(subscriptionId: string) {
    if (!subscriptionId || subscriptionId === selectedSubscriptionId) {
      return;
    }

    await withBusy(async () => {
      selectedSubscriptionId = subscriptionId;
      const selected = subscriptions.find((item) => item.id === subscriptionId);
      if (!selected || !canOpenWorkspace(selected.status)) {
        workspace = null;
        return;
      }
      await loadWorkspace(subscriptionId);
    });
  }

  async function createTask() {
    if (!selectedSubscriptionId) {
      return;
    }

    await withBusy(async () => {
      if (!taskForm.title.trim() || !taskForm.assigneeId) {
        throw new Error('Укажите название задачи и исполнителя');
      }

      await api.post(`/subscriptions/${selectedSubscriptionId}/tasks`, {
        title: taskForm.title.trim(),
        description: taskForm.description || undefined,
        assigneeId: taskForm.assigneeId,
        startDate: taskForm.startDate || undefined,
        dueDate: taskForm.dueDate || undefined,
      });

      taskForm.title = '';
      taskForm.description = '';
      taskForm.startDate = '';
      taskForm.dueDate = '';

      infoMessage = 'Задача создана';
      await loadWorkspace(selectedSubscriptionId);
    });
  }

  async function setTaskStatus(task: MentorshipTask, status: 'todo' | 'in_progress' | 'done') {
    if (!selectedSubscriptionId) {
      return;
    }

    await withBusy(async () => {
      await api.patch(`/subscriptions/${selectedSubscriptionId}/tasks/${task.id}`, { status });
      await loadWorkspace(selectedSubscriptionId);
    });
  }

  async function createBookmark() {
    if (!selectedSubscriptionId) {
      return;
    }

    await withBusy(async () => {
      if (!bookmarkForm.title.trim() || !bookmarkForm.url.trim()) {
        throw new Error('Укажите название и ссылку');
      }

      await api.post(`/subscriptions/${selectedSubscriptionId}/bookmarks`, {
        title: bookmarkForm.title.trim(),
        description: bookmarkForm.description || undefined,
        url: bookmarkForm.url.trim(),
      });

      bookmarkForm.title = '';
      bookmarkForm.description = '';
      bookmarkForm.url = '';
      infoMessage = 'Закладка создана';
      await loadWorkspace(selectedSubscriptionId);
    });
  }

  async function deleteBookmark(bookmarkId: string) {
    if (!selectedSubscriptionId) {
      return;
    }

    await withBusy(async () => {
      await api.delete(`/subscriptions/${selectedSubscriptionId}/bookmarks/${bookmarkId}`);
      await loadWorkspace(selectedSubscriptionId);
    });
  }

  async function topupCredits() {
    await withBusy(async () => {
      await api.post('/subscriptions/credits/topup', {
        amountCents: Math.round(Number(creditsForm.topupAmountRub) * 100),
        expiresInDays: Number(creditsForm.expiresInDays),
      });

      infoMessage = 'Баланс пополнен';
      await loadCredits();
    });
  }

  async function redeemCode() {
    await withBusy(async () => {
      if (!creditsForm.redeemCode.trim()) {
        throw new Error('Введите код');
      }

      await api.post('/subscriptions/credits/redeem', {
        code: creditsForm.redeemCode.trim(),
      });

      creditsForm.redeemCode = '';
      infoMessage = 'Код активирован';
      await loadCredits();
    });
  }

  function formatMoney(value: number | string | null | undefined, currency = 'RUB') {
    const numeric = Number(value || 0);
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(numeric);
  }

  function formatDate(value?: string | null) {
    if (!value) {
      return '—';
    }
    return new Date(value).toLocaleDateString('ru-RU');
  }

  function formatSubscriptionStatus(status: MentorshipSubscription['status']) {
    if (status === 'pending') {
      return 'На рассмотрении';
    }

    if (status === 'active') {
      return 'Активна';
    }

    if (status === 'approved_pending_payment') {
      return 'Одобрена, ожидает оплаты';
    }

    if (status === 'paused') {
      return 'На паузе';
    }

    if (status === 'ended') {
      return 'Завершена';
    }

    return 'Отклонена';
  }

  function subscriptionBadgeClass(status: MentorshipSubscription['status']) {
    if (status === 'active') return 'success';
    if (status === 'paused' || status === 'pending' || status === 'approved_pending_payment') return 'warning';
    return 'error';
  }

  function canOpenWorkspace(status: MentorshipSubscription['status']) {
    return status === 'active' || status === 'paused';
  }

  function canReviewSubscription(item: MentorshipSubscription) {
    return item.status === 'pending' && ($user?.role === 'admin' || item.mentorId === $user?.id);
  }

  function sortSubscriptions(items: MentorshipSubscription[]) {
    const order: Record<MentorshipSubscription['status'], number> = {
      pending: 0,
      approved_pending_payment: 1,
      active: 2,
      paused: 3,
      rejected: 4,
      ended: 5,
    };

    return [...items].sort((a, b) => {
      const statusDiff = order[a.status] - order[b.status];
      if (statusDiff !== 0) return statusDiff;
      return new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime();
    });
  }

  function formatTaskStatus(status: MentorshipTask['status']) {
    if (status === 'todo') {
      return 'К выполнению';
    }

    if (status === 'in_progress') {
      return 'В работе';
    }

    return 'Готово';
  }

  function formatAssigneeLabel(assigneeId: string) {
    if (!workspace) {
      return assigneeId;
    }

    if (workspace.subscription.mentorId === assigneeId) {
      return `Ментор: ${workspace.subscription.mentor?.fullName || '—'}`;
    }

    if (workspace.subscription.menteeId === assigneeId) {
      return `Менти: ${workspace.subscription.mentee?.fullName || '—'}`;
    }

    return assigneeId;
  }

  function formatTransactionType(type: string) {
    const normalizedType = type.toLowerCase();

    if (normalizedType.includes('topup') || normalizedType.includes('deposit')) {
      return 'Пополнение';
    }

    if (normalizedType.includes('redeem')) {
      return 'Активация кода';
    }

    if (normalizedType.includes('debit') || normalizedType.includes('charge')) {
      return 'Списание';
    }

    return type;
  }

  function extractError(err: unknown) {
    if (err instanceof ApiError) {
      const message = err.data?.message;
      if (Array.isArray(message)) {
        return message.join(', ');
      }
      if (typeof message === 'string') {
        return message;
      }
      return `Ошибка API (${err.status})`;
    }

    if (err instanceof Error) {
      return err.message;
    }

    return 'Неизвестная ошибка';
  }
</script>

<div class="page">
  <AppHeader />

  {#if $authLoading || isPageLoading}
    <Loading />
  {:else}
    <main class="container section">
      <div class="page-head">
        <div>
          <h1 class="section-title">Мои подписки</h1>
          <p class="muted">Подписки на менторов и их текущие статусы. Новую подписку оформляйте из профиля ментора.</p>
        </div>
        <button class="btn btn-outline" on:click={loadPage} disabled={isBusy}>Обновить</button>
      </div>

      {#if errorMessage}
        <div class="alert status-error">{errorMessage}</div>
      {/if}

      {#if infoMessage}
        <div class="alert status-success">{infoMessage}</div>
      {/if}

      <div class="grid cols-3 stats-row">
        <div class="card">
          <div class="muted">Подписок всего</div>
          <div class="kpi">{subscriptions.length}</div>
        </div>
        <div class="card">
          <div class="muted">Активных</div>
          <div class="kpi kpi-accent">{subscriptions.filter((item) => item.status === 'active').length}</div>
        </div>
        <div class="card">
          <div class="muted">Ждут решения</div>
          <div class="kpi kpi-warn">{subscriptions.filter((item) => item.status === 'pending').length}</div>
        </div>
      </div>

      <section class="card info-card">
        <h2 class="section-title">Как это работает</h2>
        <div class="grid cols-3 compact-grid">
          <div class="surface info-step">
            <strong>1. Выберите ментора</strong>
            <p class="muted">Откройте профиль ментора в каталоге и выберите подходящую подписку.</p>
          </div>
          <div class="surface info-step">
            <strong>2. Дождитесь решения</strong>
            <p class="muted">Ментор видит цель, принимает заявку, а вы оплачиваете подключение.</p>
          </div>
          <div class="surface info-step">
            <strong>3. Работайте по плану</strong>
            <p class="muted">После оплаты подписка появится здесь отдельной карточкой.</p>
          </div>
        </div>
      </section>

      <section class="card">
        <h2 class="section-title">{canManagePlans ? 'Подписки учеников' : 'Мои подписки'}</h2>
        <p class="muted">
          Каждая карточка показывает выбранного ментора, программу, стоимость и текущий статус.
        </p>

        {#if subscriptions.length === 0}
          <p class="muted">Подписок пока нет.</p>
          {#if canCreateSubscription}
            <a class="btn btn-outline" href="/mentors">Открыть каталог менторов</a>
          {/if}
        {:else}
          <div class="stack">
            {#each sortedSubscriptions as item}
              <div class="surface subscription-row {selectedSubscriptionId === item.id ? 'active-subscription' : ''}">
                <button class="subscription-select" on:click={() => selectSubscription(item.id)} disabled={isBusy}>
                  <div class="subscription-main">
                    <strong>{item.plan?.title || 'Программа менторства'}</strong>
                    <span class="badge {subscriptionBadgeClass(item.status)}">{formatSubscriptionStatus(item.status)}</span>
                  </div>
                  <div class="muted">
                    Ментор: {item.mentor?.fullName || item.mentorId}
                  </div>
                  <div class="muted">
                    Старт: {formatDate(item.startedAt)} · Следующее списание: {formatDate(item.nextBillingAt)}
                  </div>
                  <div class="muted">
                    Цена: {formatMoney(item.monthlyPrice ?? item.plan?.priceAmount, item.currency || item.plan?.currency || 'RUB')}
                  </div>
                  {#if item.requestGoal}
                    <div class="muted">Цель: {item.requestGoal}</div>
                  {/if}
                  {#if item.requestMotivation}
                    <div class="muted">Мотивация: {item.requestMotivation}</div>
                  {/if}
                </button>
                <div class="subscription-actions">
                  {#if canReviewSubscription(item)}
                    <button class="btn btn-sm btn-primary" on:click={() => changeSubscriptionStatus(item.id, 'approved_pending_payment')} disabled={isBusy}>Одобрить</button>
                    <button class="btn btn-sm btn-outline" on:click={() => changeSubscriptionStatus(item.id, 'rejected')} disabled={isBusy}>Отклонить</button>
                  {:else if item.status === 'approved_pending_payment' && item.menteeId === $user?.id}
                    <a class="btn btn-sm btn-primary" href={`/checkout/subscriptions/${item.id}`}>Оплатить</a>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </section>

      {#if canManagePlans}
        <section class="card bottom-card">
          <h2 class="section-title">Мои программы</h2>
          <p class="muted">Создайте программу, которую смогут выбрать ваши менти.</p>

          <div class="grid cols-2 compact-grid">
            <form class="stack-sm plan-form" on:submit|preventDefault={createPlan}>
              <div class="surface plan-form-group">
                <h3 class="section-subtitle">Описание программы</h3>
                <label class="label" for="plan-title">Название программы</label>
                <input id="plan-title" class="input" placeholder="Например: Рост до Middle за 3 месяца" bind:value={planForm.title} />
                <label class="label" for="plan-description">Что входит в программу</label>
                <textarea
                  id="plan-description"
                  class="textarea"
                  placeholder="Опишите формат работы, результаты и ожидания."
                  bind:value={planForm.description}
                ></textarea>
              </div>

              <div class="surface plan-form-group">
                <h3 class="section-subtitle">Условия подключения</h3>
                <div class="grid cols-2 compact-grid">
                  <div class="stack-sm">
                    <label class="label" for="plan-price">Стоимость за период, руб.</label>
                    <input id="plan-price" class="input" type="number" min="0" step="0.01" bind:value={planForm.priceAmount} />
                  </div>
                  <div class="stack-sm">
                    <label class="label" for="plan-interval">Период списания (мес.)</label>
                    <input id="plan-interval" class="input" type="number" min="1" bind:value={planForm.billingIntervalMonths} />
                  </div>
                  <div class="stack-sm">
                    <label class="label" for="plan-calls">Звонков в период</label>
                    <input id="plan-calls" class="input" type="number" min="0" bind:value={planForm.callsPerMonth} />
                  </div>
                  <div class="stack-sm">
                    <label class="label" for="plan-sla">Ответ в течение (часов)</label>
                    <input id="plan-sla" class="input" type="number" min="1" bind:value={planForm.responseTimeHours} />
                  </div>
                </div>
              </div>

              <button class="btn btn-primary" type="submit" disabled={isBusy}>Опубликовать программу</button>
            </form>

            <div class="stack">
              <h3 class="section-subtitle">Опубликованные программы</h3>
              {#if myPlans.length === 0}
                <p class="muted">Вы ещё не создали ни одной программы.</p>
              {:else}
                {#each myPlans as plan}
                  <div class="surface">
                    <div class="flex-between gap-sm">
                      <strong>{plan.title}</strong>
                      <span class="badge {plan.isActive ? 'success' : 'error'}">{plan.isActive ? 'Активна' : 'Отключена'}</span>
                    </div>
                    <div class="muted">Стоимость: {formatMoney(plan.priceAmount, plan.currency)} / {plan.billingIntervalMonths} мес.</div>
                    <div class="muted">
                      Звонков: {plan.callsPerMonth ?? '—'} · Ответ: до {plan.responseTimeHours ?? '—'} ч.
                    </div>
                    <details class="muted plan-code">
                      <summary>Код программы</summary>
                      <div>{plan.id}</div>
                    </details>
                  </div>
                {/each}
              {/if}
            </div>
          </div>
        </section>
      {/if}

    </main>
  {/if}
</div>

<style>
  .page-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    margin-bottom: 16px;
  }

  .stats-row {
    margin-bottom: 16px;
  }

  .info-card {
    margin-bottom: 16px;
  }

  .info-step {
    display: grid;
    gap: 6px;
    min-height: 100%;
  }

  .kpi {
    font-size: 1.35rem;
    font-weight: 700;
    margin-top: 4px;
  }

  .kpi-accent {
    color: var(--accent-link);
  }

  .kpi-warn {
    color: var(--status-warning-ink);
  }

  .bottom-card {
    margin-top: 16px;
  }

  .section-subtitle {
    font-size: 1rem;
    margin-bottom: 10px;
  }

  .workspace-meta {
    display: grid;
    gap: 4px;
  }

  .workspace-description {
    margin: 4px 0 12px;
  }

  .subscription-row {
    display: grid;
    gap: 8px;
  }

  .active-subscription {
    border-color: var(--accent);
    box-shadow: 0 0 0 2px var(--accent-muted);
  }

  .subscription-select {
    text-align: left;
    border: none;
    background: transparent;
    color: inherit;
    padding: 0;
    cursor: pointer;
    display: grid;
    gap: 4px;
  }

  .subscription-main {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .subscription-actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .task-list,
  .bookmark-list {
    margin-top: 10px;
  }

  .task-row,
  .bookmark-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
  }

  .task-actions {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .bookmark-link {
    color: var(--accent-link);
    text-decoration: none;
    font-weight: 600;
  }

  .bookmark-link:hover {
    text-decoration: underline;
  }

  .transactions {
    margin-top: 8px;
  }

  .plan-form {
    align-items: stretch;
  }

  .plan-form-group {
    display: grid;
    gap: 8px;
  }

  .plan-option {
    display: grid;
    gap: 6px;
  }

  .manual-connect {
    display: grid;
    gap: 10px;
  }

  .plan-code summary {
    cursor: pointer;
    font-weight: 600;
    color: var(--ink-secondary);
  }

  .manual-connect-body {
    display: grid;
    gap: 10px;
    margin-top: 10px;
  }

  .selected-plan {
    border-color: var(--accent);
    box-shadow: 0 0 0 2px var(--accent-muted);
  }

  .plan-code {
    word-break: break-all;
  }

  .tx-row {
    display: grid;
    grid-template-columns: auto auto 1fr;
    gap: 8px;
    align-items: center;
    border-bottom: 1px solid var(--border);
    padding-bottom: 6px;
  }

  .compact-grid {
    align-items: start;
  }

  @media (max-width: 980px) {
    .page-head {
      flex-direction: column;
      align-items: stretch;
    }

    .tx-row {
      grid-template-columns: 1fr;
      gap: 4px;
      justify-items: start;
    }
  }
</style>
