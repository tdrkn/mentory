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
    status: 'active' | 'paused' | 'ended';
    startedAt: string;
    pausedAt?: string | null;
    endedAt?: string | null;
    nextBillingAt?: string | null;
    currentPeriodStart?: string | null;
    currentPeriodEnd?: string | null;
    monthlyPrice?: number | string | null;
    currency: string;
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
    notes: '',
  };

  const creditsForm = {
    topupAmountCents: 5000,
    expiresInDays: 365,
    redeemCode: '',
  };

  $: selectedSubscription = subscriptions.find((item) => item.id === selectedSubscriptionId) || null;
  $: canManagePlans = $isMentor || $user?.role === 'admin';
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
      await Promise.all([loadSubscriptions(), loadCredits(), loadMyPlans()]);
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

    if (!selectedSubscriptionId || !subscriptions.some((item) => item.id === selectedSubscriptionId)) {
      selectedSubscriptionId = subscriptions[0].id;
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
      await api.post('/subscriptions/plans', {
        title: planForm.title,
        description: planForm.description || undefined,
        priceAmount: Number(planForm.priceAmount),
        currency: 'USD',
        billingIntervalMonths: Number(planForm.billingIntervalMonths),
        callsPerMonth: Number(planForm.callsPerMonth),
        sessionDurationMin: Number(planForm.sessionDurationMin),
        responseTimeHours: Number(planForm.responseTimeHours),
        includesUnlimitedChat: true,
      });

      planForm.title = '';
      planForm.description = '';
      planForm.priceAmount = 0;
      infoMessage = 'План создан';
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
        throw new Error('Укажите planId');
      }

      await api.post('/subscriptions', {
        planId: targetPlanId,
        notes: subscribeForm.notes || undefined,
      });

      subscribeForm.planId = '';
      subscribeForm.notes = '';
      infoMessage = 'Подписка создана';
      await loadSubscriptions();
    });
  }

  async function changeSubscriptionStatus(subscriptionId: string, status: 'active' | 'paused' | 'ended') {
    await withBusy(async () => {
      await api.patch(`/subscriptions/${subscriptionId}/status`, { status });
      infoMessage = 'Статус подписки обновлён';
      await loadSubscriptions();
    });
  }

  async function selectSubscription(subscriptionId: string) {
    if (!subscriptionId || subscriptionId === selectedSubscriptionId) {
      return;
    }

    await withBusy(async () => {
      selectedSubscriptionId = subscriptionId;
      await loadWorkspace(subscriptionId);
    });
  }

  async function createTask() {
    if (!selectedSubscriptionId) {
      return;
    }

    await withBusy(async () => {
      if (!taskForm.title.trim() || !taskForm.assigneeId) {
        throw new Error('Заполните title и assignee');
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
        throw new Error('Заполните title и url');
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
        amountCents: Number(creditsForm.topupAmountCents),
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

  function formatMoney(value: number | string | null | undefined, currency = 'USD') {
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
          <h1 class="section-title">Подписки и Workspace</h1>
          <p class="muted">Управление планами, менторствами, задачами, закладками и кредитами.</p>
        </div>
        <button class="btn btn-outline" on:click={loadPage} disabled={isBusy}>Обновить</button>
      </div>

      {#if errorMessage}
        <div class="alert status-error">{errorMessage}</div>
      {/if}

      {#if infoMessage}
        <div class="alert status-success">{infoMessage}</div>
      {/if}

      <div class="grid cols-4 stats-row">
        <div class="card">
          <div class="muted">Подписок всего</div>
          <div class="kpi">{subscriptions.length}</div>
        </div>
        <div class="card">
          <div class="muted">Активных</div>
          <div class="kpi kpi-accent">{subscriptions.filter((item) => item.status === 'active').length}</div>
        </div>
        <div class="card">
          <div class="muted">На паузе</div>
          <div class="kpi kpi-warn">{subscriptions.filter((item) => item.status === 'paused').length}</div>
        </div>
        <div class="card">
          <div class="muted">Баланс credits</div>
          <div class="kpi">{credits ? formatMoney((credits.balance.amountCents || 0) / 100, credits.balance.currency) : '—'}</div>
        </div>
      </div>

      <div class="grid cols-2 top-grid">
        <section class="card">
          <h2 class="section-title">Мои подписки</h2>

          {#if subscriptions.length === 0}
            <p class="muted">Подписок пока нет.</p>
          {:else}
            <div class="stack">
              {#each subscriptions as item}
                <div class="surface subscription-row {selectedSubscriptionId === item.id ? 'active-subscription' : ''}">
                  <button class="subscription-select" on:click={() => selectSubscription(item.id)} disabled={isBusy}>
                    <div class="subscription-main">
                      <strong>{item.plan?.title || 'Plan'}</strong>
                      <span class="badge {item.status === 'active' ? 'success' : item.status === 'paused' ? 'warning' : 'error'}">{item.status}</span>
                    </div>
                    <div class="muted">
                      Ментор: {item.mentor?.fullName || item.mentorId}
                    </div>
                    <div class="muted">
                      Старт: {formatDate(item.startedAt)} · Next billing: {formatDate(item.nextBillingAt)}
                    </div>
                    <div class="muted">
                      Цена: {formatMoney(item.monthlyPrice ?? item.plan?.priceAmount, item.currency || item.plan?.currency || 'USD')}
                    </div>
                  </button>
                  <div class="subscription-actions">
                    {#if item.status === 'active'}
                      <button class="btn btn-sm btn-ghost" on:click={() => changeSubscriptionStatus(item.id, 'paused')} disabled={isBusy}>Пауза</button>
                      <button class="btn btn-sm btn-outline" on:click={() => changeSubscriptionStatus(item.id, 'ended')} disabled={isBusy}>Завершить</button>
                    {:else if item.status === 'paused'}
                      <button class="btn btn-sm btn-primary" on:click={() => changeSubscriptionStatus(item.id, 'active')} disabled={isBusy}>Активировать</button>
                      <button class="btn btn-sm btn-outline" on:click={() => changeSubscriptionStatus(item.id, 'ended')} disabled={isBusy}>Завершить</button>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </section>

        <section class="card">
          <h2 class="section-title">Workspace</h2>

          {#if !selectedSubscription || !workspace}
            <p class="muted">Выберите подписку, чтобы видеть задачи и закладки.</p>
          {:else}
            <div class="workspace-meta">
              <div class="muted">Plan: <strong>{selectedSubscription.plan?.title || selectedSubscription.planId}</strong></div>
              <div class="muted">Mentee: {selectedSubscription.mentee?.fullName || selectedSubscription.menteeId}</div>
              <div class="muted">Mentor: {selectedSubscription.mentor?.fullName || selectedSubscription.mentorId}</div>
            </div>

            <div class="divider"></div>

            <h3 class="section-subtitle">Tasks</h3>
            <form class="stack-sm" on:submit|preventDefault={createTask}>
              <input class="input" placeholder="Название задачи" bind:value={taskForm.title} />
              <textarea class="textarea" placeholder="Описание (опционально)" bind:value={taskForm.description}></textarea>
              <div class="grid cols-2 compact-grid">
                <select class="select" bind:value={taskForm.assigneeId}>
                  <option value="">Кому назначить</option>
                  <option value={workspace.subscription.mentorId}>Ментор</option>
                  <option value={workspace.subscription.menteeId}>Менти</option>
                </select>
                <div class="grid cols-2 compact-grid">
                  <input class="input" type="date" bind:value={taskForm.startDate} />
                  <input class="input" type="date" bind:value={taskForm.dueDate} />
                </div>
              </div>
              <button class="btn btn-primary" type="submit" disabled={isBusy}>Добавить задачу</button>
            </form>

            <div class="stack task-list">
              {#if workspace.tasks.length === 0}
                <p class="muted">Задач пока нет.</p>
              {:else}
                {#each workspace.tasks as task}
                  <div class="surface task-row">
                    <div>
                      <strong>{task.title}</strong>
                      {#if task.description}
                        <div class="muted">{task.description}</div>
                      {/if}
                      <div class="muted">Срок: {formatDate(task.dueDate)} · Assignee: {task.assigneeId}</div>
                    </div>
                    <div class="task-actions">
                      <span class="badge {task.status === 'done' ? 'success' : task.status === 'in_progress' ? 'info' : ''}">{task.status}</span>
                      {#if task.status !== 'todo'}
                        <button class="btn btn-sm btn-outline" on:click={() => setTaskStatus(task, 'todo')} disabled={isBusy}>todo</button>
                      {/if}
                      {#if task.status !== 'in_progress'}
                        <button class="btn btn-sm btn-outline" on:click={() => setTaskStatus(task, 'in_progress')} disabled={isBusy}>in_progress</button>
                      {/if}
                      {#if task.status !== 'done'}
                        <button class="btn btn-sm btn-primary" on:click={() => setTaskStatus(task, 'done')} disabled={isBusy}>done</button>
                      {/if}
                    </div>
                  </div>
                {/each}
              {/if}
            </div>

            <div class="divider"></div>

            <h3 class="section-subtitle">Bookmarks</h3>
            <form class="stack-sm" on:submit|preventDefault={createBookmark}>
              <input class="input" placeholder="Название" bind:value={bookmarkForm.title} />
              <input class="input" placeholder="https://..." bind:value={bookmarkForm.url} />
              <textarea class="textarea" placeholder="Описание (опционально)" bind:value={bookmarkForm.description}></textarea>
              <button class="btn btn-primary" type="submit" disabled={isBusy}>Добавить закладку</button>
            </form>

            <div class="stack bookmark-list">
              {#if workspace.bookmarks.length === 0}
                <p class="muted">Закладок пока нет.</p>
              {:else}
                {#each workspace.bookmarks as bookmark}
                  <div class="surface bookmark-row">
                    <div>
                      <a href={bookmark.url} target="_blank" rel="noreferrer" class="bookmark-link">{bookmark.title}</a>
                      {#if bookmark.description}
                        <div class="muted">{bookmark.description}</div>
                      {/if}
                    </div>
                    <button class="btn btn-sm btn-ghost" on:click={() => deleteBookmark(bookmark.id)} disabled={isBusy}>Удалить</button>
                  </div>
                {/each}
              {/if}
            </div>
          {/if}
        </section>
      </div>

      {#if canManagePlans}
        <section class="card bottom-card">
          <h2 class="section-title">Мои планы менторства</h2>

          <div class="grid cols-2 compact-grid">
            <form class="stack-sm" on:submit|preventDefault={createPlan}>
              <input class="input" placeholder="Название плана" bind:value={planForm.title} />
              <textarea class="textarea" placeholder="Описание" bind:value={planForm.description}></textarea>
              <div class="grid cols-4 compact-grid">
                <input class="input" type="number" min="0" step="0.01" placeholder="Цена" bind:value={planForm.priceAmount} />
                <input class="input" type="number" min="1" placeholder="Интервал мес." bind:value={planForm.billingIntervalMonths} />
                <input class="input" type="number" min="0" placeholder="Звонков/мес" bind:value={planForm.callsPerMonth} />
                <input class="input" type="number" min="1" placeholder="SLA часов" bind:value={planForm.responseTimeHours} />
              </div>
              <button class="btn btn-primary" type="submit" disabled={isBusy}>Создать план</button>
            </form>

            <div class="stack">
              {#if myPlans.length === 0}
                <p class="muted">Планов пока нет.</p>
              {:else}
                {#each myPlans as plan}
                  <div class="surface">
                    <div class="flex-between gap-sm">
                      <strong>{plan.title}</strong>
                      <span class="badge {plan.isActive ? 'success' : 'error'}">{plan.isActive ? 'active' : 'inactive'}</span>
                    </div>
                    <div class="muted">{formatMoney(plan.priceAmount, plan.currency)} / {plan.billingIntervalMonths} мес.</div>
                    <div class="muted">ID: {plan.id}</div>
                  </div>
                {/each}
              {/if}
            </div>
          </div>
        </section>
      {/if}

      <section class="card bottom-card">
        <h2 class="section-title">Подписка на план</h2>
        <p class="muted">Быстрый MVP: можно искать планы по `mentorId` или подписаться по известному `planId`.</p>

        <div class="grid cols-2 compact-grid">
          <div class="stack-sm">
            <div class="flex gap-sm">
              <input class="input" placeholder="mentorId" bind:value={mentorLookupId} />
              <button class="btn btn-outline" on:click={searchMentorPlans} disabled={isBusy}>Найти планы</button>
            </div>

            {#if mentorPlans.length > 0}
              <div class="stack-sm">
                {#each mentorPlans as plan}
                  <div class="surface">
                    <strong>{plan.title}</strong>
                    <div class="muted">{formatMoney(plan.priceAmount, plan.currency)} · calls/month: {plan.callsPerMonth ?? '—'}</div>
                    <div class="muted">planId: {plan.id}</div>
                    <button class="btn btn-sm btn-primary" on:click={() => subscribeToPlan(plan.id)} disabled={isBusy}>Подписаться</button>
                  </div>
                {/each}
              </div>
            {/if}
          </div>

          <form class="stack-sm" on:submit|preventDefault={() => subscribeToPlan()}>
            <input class="input" placeholder="planId" bind:value={subscribeForm.planId} />
            <textarea class="textarea" placeholder="Notes (optional)" bind:value={subscribeForm.notes}></textarea>
            <button class="btn btn-primary" type="submit" disabled={isBusy}>Создать подписку</button>
          </form>
        </div>
      </section>

      {#if canUseCredits}
        <section class="card bottom-card">
          <h2 class="section-title">Credits</h2>

          <div class="grid cols-2 compact-grid">
            <div class="stack-sm">
              <div class="surface">
                <div class="muted">Доступно</div>
                <div class="kpi">{credits ? formatMoney((credits.balance.amountCents || 0) / 100, credits.balance.currency) : '—'}</div>
                <div class="muted">Срок действия: {credits ? formatDate(credits.balance.expiresAt) : '—'}</div>
              </div>

              <form class="stack-sm" on:submit|preventDefault={topupCredits}>
                <label class="label" for="topup-amount-cents">Пополнить (в центах)</label>
                <input
                  id="topup-amount-cents"
                  class="input"
                  type="number"
                  min="100"
                  step="100"
                  bind:value={creditsForm.topupAmountCents}
                />
                <label class="label" for="topup-expires-days">Срок (дней)</label>
                <input
                  id="topup-expires-days"
                  class="input"
                  type="number"
                  min="1"
                  max="3650"
                  bind:value={creditsForm.expiresInDays}
                />
                <button class="btn btn-primary" type="submit" disabled={isBusy}>Пополнить</button>
              </form>
            </div>

            <div class="stack-sm">
              <form class="stack-sm" on:submit|preventDefault={redeemCode}>
                <label class="label" for="redeem-code">Redeem code</label>
                <input
                  id="redeem-code"
                  class="input"
                  placeholder="MENTORY-START-10"
                  bind:value={creditsForm.redeemCode}
                />
                <button class="btn btn-outline" type="submit" disabled={isBusy}>Активировать код</button>
              </form>

              <div class="surface">
                <div class="muted">Последние операции</div>
                {#if !credits || credits.transactions.length === 0}
                  <p class="muted">Операций пока нет.</p>
                {:else}
                  <div class="stack-sm transactions">
                    {#each credits.transactions.slice(0, 8) as tx}
                      <div class="tx-row">
                        <span class="badge {tx.status === 'succeeded' ? 'success' : 'error'}">{tx.type}</span>
                        <span>{formatMoney(tx.amountCents / 100, credits.balance.currency)}</span>
                        <span class="muted">{new Date(tx.createdAt).toLocaleString('ru-RU')}</span>
                      </div>
                    {/each}
                  </div>
                {/if}
              </div>
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

  .top-grid {
    align-items: start;
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
