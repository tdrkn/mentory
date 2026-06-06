<script lang="ts">
  import Loading from '$lib/components/Loading.svelte';
  import { api, ApiError } from '$lib/api';
  import { browser } from '$app/environment';
  import { getApiUrl } from '$lib/env';
  import { onDestroy, onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { isAuthenticated, isLoading as authLoading, isAdmin, logout } from '$lib/stores/auth';

  type ComplaintStatus = 'new' | 'in_progress' | 'resolved' | 'rejected';
  type ComplaintCategory =
    | 'platform_issue'
    | 'user_behavior'
    | 'session_issue'
    | 'payment_issue'
    | 'content_violation'
    | 'other';
  type RegaliaStatus = 'pending' | 'approved' | 'rejected';

  interface ComplaintAttachment {
    id: string;
    fileName: string;
    fileUrl: string;
    mimeType: string;
    size?: number | null;
    sizeBytes?: number | null;
  }

  interface AdminComplaint {
    id: string;
    category: ComplaintCategory;
    description: string;
    occurredAt?: string | null;
    status: ComplaintStatus;
    createdAt: string;
    attachments?: ComplaintAttachment[];
    resolutionComment?: string | null;
    author?: { id: string; fullName: string; email: string } | null;
    targetUser?: { id: string; fullName: string; email: string } | null;
    assignedAdmin?: { id: string; fullName: string; email: string } | null;
  }

  interface ComplaintMessage {
    id: string;
    body: string;
    createdAt: string;
    sender: { id: string; fullName: string; role: string };
  }

  interface AdminComplaintDetails extends AdminComplaint {
    messages: ComplaintMessage[];
  }

  interface AdminRegalia {
    id: string;
    fileUrl: string;
    fileName: string;
    mimeType?: string | null;
    size?: number | null;
    sizeBytes?: number | null;
    status: RegaliaStatus;
    rejectionReason?: string | null;
    createdAt: string;
    mentor?: { id: string; fullName: string; email: string } | null;
  }

  interface AuditLogItem {
    id: string;
    action: string;
    targetType: string;
    targetId?: string | null;
    createdAt: string;
    admin?: { id: string; fullName: string; email: string } | null;
  }

  interface AuditLogResponse {
    data: AuditLogItem[];
    total: number;
    hasMore: boolean;
  }

  interface PlatformBalance {
    totalFees: number;
    totalWithdrawn: number;
    available: number;
    currency: string;
  }

  let isPageLoading = true;
  let isBusy = false;
  let didLoad = false;
  let notice: string | null = null;
  let error: string | null = null;

  let complaintFilter = '';
  let complaints: AdminComplaint[] = [];
  let selectedComplaint: AdminComplaintDetails | null = null;
  let complaintStatusUpdate: ComplaintStatus = 'in_progress';
  let complaintResolution = '';
  let complaintReply = '';

  let regaliaFilter = '';
  let regaliaItems: AdminRegalia[] = [];
  let regaliaReasonById: Record<string, string> = {};

  let blockUserId = '';
  let blockReason = '';
  let unblockUserId = '';
  let unblockReason = '';

  let moderationTargetType = 'session';
  let moderationTargetId = '';
  let moderationAction = 'warn';
  let moderationReason = '';

  let balance: PlatformBalance | null = null;
  let withdrawAmount = '';
  let withdrawCurrency = 'RUB';
  let withdrawProvider = 'manual';

  let auditLogs: AuditLogItem[] = [];

  const complaintStatusOptions: ComplaintStatus[] = ['new', 'in_progress', 'resolved', 'rejected'];
  const regaliaStatusOptions: RegaliaStatus[] = ['pending', 'approved', 'rejected'];

  const statusLabel: Record<ComplaintStatus | RegaliaStatus, string> = {
    new: 'Новая',
    in_progress: 'В работе',
    resolved: 'Решена',
    rejected: 'Отклонена',
    pending: 'На проверке',
    approved: 'Одобрена',
  };

  const categoryLabel: Record<ComplaintCategory, string> = {
    platform_issue: 'Проблема платформы',
    user_behavior: 'Поведение пользователя',
    session_issue: 'Проблема сессии',
    payment_issue: 'Проблема оплаты',
    content_violation: 'Нарушение контента',
    other: 'Другое',
  };

  const statusClass = (status: ComplaintStatus | RegaliaStatus) => {
    if (status === 'resolved' || status === 'approved') return 'badge success';
    if (status === 'rejected') return 'badge error';
    if (status === 'in_progress') return 'badge warning';
    return 'badge info';
  };

  const extractError = (err: unknown, fallback: string) => {
    if (err instanceof ApiError) {
      if (typeof err.data?.message === 'string') return err.data.message;
      if (Array.isArray(err.data?.message) && err.data.message.length > 0) return err.data.message[0];
    }
    return fallback;
  };

  const formatRuDate = (dateTime?: string | null) => {
    if (!dateTime) return '—';
    const date = new Date(dateTime);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('ru-RU');
  };

  const formatBytes = (value?: number | null) => {
    if (!value || value <= 0) return '—';
    if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
    if (value >= 1024) return `${(value / 1024).toFixed(1)} KB`;
    return `${value} B`;
  };

  const resolveFileUrl = (value?: string | null) => {
    if (!value) return '';
    if (value.startsWith('http') || value.startsWith('data:') || value.startsWith('blob:')) return value;
    return `${getApiUrl()}${value.startsWith('/') ? value : `/${value}`}`;
  };

  const withBusy = async (fn: () => Promise<void>) => {
    notice = null;
    error = null;
    isBusy = true;
    try {
      await fn();
    } catch (err) {
      error = extractError(err, 'Операция не выполнена.');
    } finally {
      isBusy = false;
    }
  };

  const loadComplaints = async () => {
    const query = complaintFilter ? `?status=${encodeURIComponent(complaintFilter)}` : '';
    complaints = await api.get<AdminComplaint[]>(`/admin/trust/complaints${query}`);
  };

  const openComplaint = async (id: string) => {
    selectedComplaint = await api.get<AdminComplaintDetails>(`/complaints/${id}`);
    complaintStatusUpdate = selectedComplaint.status;
    complaintResolution = selectedComplaint.resolutionComment || '';
  };

  const updateComplaint = async () => {
    if (!selectedComplaint) return;
    await withBusy(async () => {
      await api.patch(`/admin/trust/complaints/${selectedComplaint?.id}`, {
        status: complaintStatusUpdate,
        resolutionComment: complaintResolution.trim() || undefined,
      });
      notice = 'Статус обращения обновлён.';
      await loadComplaints();
      await openComplaint(selectedComplaint.id);
    });
  };

  const sendComplaintReply = async () => {
    if (!selectedComplaint || !complaintReply.trim()) return;
    await withBusy(async () => {
      await api.post(`/complaints/${selectedComplaint.id}/messages`, {
        body: complaintReply.trim(),
      });
      complaintReply = '';
      await openComplaint(selectedComplaint.id);
    });
  };

  const loadRegalia = async () => {
    const query = regaliaFilter ? `?status=${encodeURIComponent(regaliaFilter)}` : '';
    regaliaItems = await api.get<AdminRegalia[]>(`/admin/trust/regalia${query}`);
  };

  const reviewRegalia = async (regaliaId: string, status: 'approved' | 'rejected') => {
    await withBusy(async () => {
      await api.patch(`/admin/trust/regalia/${regaliaId}/review`, {
        status,
        rejectionReason: status === 'rejected' ? regaliaReasonById[regaliaId]?.trim() || undefined : undefined,
      });
      notice = status === 'approved' ? 'Документ одобрен.' : 'Документ отклонён.';
      await loadRegalia();
    });
  };

  const blockUser = async () => {
    if (!blockUserId.trim()) {
      error = 'Укажите user id для блокировки.';
      return;
    }
    await withBusy(async () => {
      await api.post(`/admin/trust/users/${blockUserId.trim()}/block`, {
        reason: blockReason.trim() || undefined,
      });
      notice = 'Пользователь заблокирован.';
      blockUserId = '';
      blockReason = '';
      await loadAudit();
    });
  };

  const unblockUser = async () => {
    if (!unblockUserId.trim()) {
      error = 'Укажите user id для разблокировки.';
      return;
    }
    await withBusy(async () => {
      await api.post(`/admin/trust/users/${unblockUserId.trim()}/unblock`, {
        reason: unblockReason.trim() || undefined,
      });
      notice = 'Пользователь разблокирован.';
      unblockUserId = '';
      unblockReason = '';
      await loadAudit();
    });
  };

  const createModerationAction = async () => {
    if (!moderationTargetId.trim()) {
      error = 'Укажите target id для модерации.';
      return;
    }
    await withBusy(async () => {
      await api.post('/admin/trust/moderation-actions', {
        targetType: moderationTargetType.trim(),
        targetId: moderationTargetId.trim(),
        action: moderationAction.trim(),
        reason: moderationReason.trim() || undefined,
      });
      notice = 'Модерационное действие зафиксировано.';
      moderationTargetId = '';
      moderationReason = '';
      await loadAudit();
    });
  };

  const loadAudit = async () => {
    const logs = await api.get<AuditLogResponse>('/admin/trust/audit-logs?limit=50&offset=0');
    auditLogs = logs.data;
  };

  const loadBalance = async () => {
    balance = await api.get<PlatformBalance>('/admin/trust/platform/balance');
  };

  const withdrawPlatformFees = async () => {
    const amount = Number(withdrawAmount);
    if (!Number.isInteger(amount) || amount <= 0) {
      error = 'Сумма должна быть целым числом > 0.';
      return;
    }
    await withBusy(async () => {
      await api.post('/admin/trust/platform/withdraw', {
        amount,
        currency: withdrawCurrency.toUpperCase(),
        provider: withdrawProvider.trim(),
      });
      notice = 'Заявка на вывод комиссии создана.';
      withdrawAmount = '';
      await loadBalance();
      await loadAudit();
    });
  };

  const processReadyPayouts = async () => {
    await withBusy(async () => {
      const result = await api.post<{ checked: number; completed: number; blocked: number }>(
        '/admin/payments/payouts/process-ready',
      );
      notice = `Выплаты обработаны: проверено ${result.checked}, завершено ${result.completed}, заблокировано обращениями ${result.blocked}.`;
      await loadBalance();
      await loadAudit();
    });
  };

  const refreshAll = async () => {
    await Promise.all([loadComplaints(), loadRegalia(), loadAudit(), loadBalance()]);
  };

  // Tab state — driven by URL hash if present
  let activeTab: 'verification' | 'support' | 'database' = 'support';

  const syncTabFromHash = () => {
    if (!browser) return;
    const hash = window.location.hash.replace('#', '');
    if (hash === 'verification' || hash === 'support' || hash === 'database') {
      activeTab = hash;
    }
  };

  $: if (browser && !$authLoading) {
    if (!$isAuthenticated) {
      goto('/admin/login');
    } else if (!$isAdmin) {
      goto('/mentors');
    } else if (!didLoad) {
      didLoad = true;
      loadInitialData();
    }
  }

  const loadInitialData = async () => {
    syncTabFromHash();

    try {
      await refreshAll();
    } catch (err) {
      error = extractError(err, 'Не удалось загрузить данные trust-админки.');
    } finally {
      isPageLoading = false;
    }
  };

  const setTab = (tab: 'verification' | 'support' | 'database') => {
    activeTab = tab;
    if (browser) {
      window.history.replaceState(null, '', `#${tab}`);
    }
  };

  const handleLogout = () => {
    logout(false);
    goto('/admin/login');
  };

  onMount(() => {
    window.addEventListener('hashchange', syncTabFromHash);
  });

  onDestroy(() => {
    if (browser) {
      window.removeEventListener('hashchange', syncTabFromHash);
    }
  });
</script>

<svelte:head>
  <title>Управление платформой — Mentory</title>
</svelte:head>

<div class="admin-page">
  <!-- Top bar -->
  <div class="topbar">
    <a href="/" class="brand">mentory</a>
    <div class="topbar-actions">
      <button class="topbar-btn" on:click={handleLogout}>Выйти из аккаунта</button>
      <a class="topbar-btn" href="/">Вернуться на сайт</a>
    </div>
  </div>

  {#if $authLoading || isPageLoading}
    <div class="loading-wrap"><Loading /></div>
  {:else}
    <main class="shell">
      <!-- Page header -->
      <div class="page-head">
        <div>
          <a class="back-link" href="/admin">← Панель администратора</a>
          <h1 class="page-title">Управление платформой</h1>
        </div>
        <button class="refresh-btn" on:click={refreshAll} disabled={isBusy}>Обновить всё</button>
      </div>

      {#if notice}
        <div class="notice success">{notice}</div>
      {/if}
      {#if error}
        <div class="notice error">{error}</div>
      {/if}

      <!-- Tab navigation -->
      <div class="tabs">
        <button
          class="tab {activeTab === 'verification' ? 'tab-active' : ''}"
          on:click={() => setTab('verification')}
        >
          Верификация
          {#if regaliaItems.filter(r => r.status === 'pending').length > 0}
            <span class="tab-badge">{regaliaItems.filter(r => r.status === 'pending').length}</span>
          {/if}
        </button>
        <button
          class="tab {activeTab === 'support' ? 'tab-active' : ''}"
          on:click={() => setTab('support')}
        >
          Поддержка
          {#if complaints.filter(c => c.status === 'new').length > 0}
            <span class="tab-badge">{complaints.filter(c => c.status === 'new').length}</span>
          {/if}
        </button>
        <button
          class="tab {activeTab === 'database' ? 'tab-active' : ''}"
          on:click={() => setTab('database')}
        >
          База данных
        </button>
      </div>

      <!-- ─── Верификация tab ─── -->
      {#if activeTab === 'verification'}
        <section id="verification" class="tab-content">
          <div class="section-head">
            <h2>Проверка документов ментора</h2>
            <div class="section-controls">
              <select class="input" bind:value={regaliaFilter}>
                <option value="">Все статусы</option>
                {#each regaliaStatusOptions as status}
                  <option value={status}>{statusLabel[status]}</option>
                {/each}
              </select>
              <button class="btn btn-outline" on:click={loadRegalia} disabled={isBusy}>Применить</button>
            </div>
          </div>

          {#if regaliaItems.length === 0}
            <p class="muted">Документы не найдены.</p>
          {:else}
            <div class="stack-sm">
              {#each regaliaItems as item}
                <div class="surface">
                  <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
                    <div>
                      <a href={resolveFileUrl(item.fileUrl)} target="_blank" rel="noreferrer"><strong>{item.fileName}</strong></a>
                      <div class="muted" style="font-size:0.84rem;">
                        {item.mentor?.fullName || '—'} ({item.mentor?.email || '—'})
                      </div>
                      <div class="muted" style="font-size:0.82rem;margin-top:2px;">
                        {item.mimeType || 'application/pdf'} · {formatBytes(item.size ?? item.sizeBytes ?? 0)}
                      </div>
                    </div>
                    <span class={statusClass(item.status)}>{statusLabel[item.status]}</span>
                  </div>
                  <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
                    {#if item.mentor?.id}
                      <a class="btn btn-outline btn-sm" href={`/chat?mentorId=${item.mentor.id}`}>Чат</a>
                    {:else}
                      <a class="btn btn-outline btn-sm" href="/chat">Чат</a>
                    {/if}
                    {#if item.mentor?.id}
                      <a class="btn btn-outline btn-sm" href={`/mentors/${item.mentor.id}`}>Профиль</a>
                    {/if}
                    <a class="btn btn-outline btn-sm" href={resolveFileUrl(item.fileUrl)} target="_blank" rel="noreferrer" download={item.fileName}>
                      Скачать
                    </a>
                    <input
                      class="input"
                      style="max-width:340px;"
                      placeholder="Причина отклонения (если rejected)"
                      bind:value={regaliaReasonById[item.id]}
                    />
                    <button class="btn btn-primary" on:click={() => reviewRegalia(item.id, 'approved')} disabled={isBusy}>
                      Одобрить
                    </button>
                    <button class="btn btn-ghost" on:click={() => reviewRegalia(item.id, 'rejected')} disabled={isBusy}>
                      Отклонить
                    </button>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </section>
      {/if}

      <!-- ─── Поддержка tab ─── -->
      {#if activeTab === 'support'}
        <section id="support" class="tab-content">
          <div class="section-head">
            <h2>Обращения</h2>
            <div class="section-controls">
              <select class="input" bind:value={complaintFilter}>
                <option value="">Все статусы</option>
                {#each complaintStatusOptions as status}
                  <option value={status}>{statusLabel[status]}</option>
                {/each}
              </select>
              <button class="btn btn-outline" on:click={loadComplaints} disabled={isBusy}>Применить</button>
            </div>
          </div>

          <div class="complaints-layout">
            <!-- List -->
            <div class="stack-sm complaints-list">
              {#if complaints.length === 0}
                <p class="muted">Обращения не найдены.</p>
              {:else}
                {#each complaints as complaint}
                  <button class="surface complaint-btn" on:click={() => openComplaint(complaint.id)}>
                    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
                      <strong>{categoryLabel[complaint.category] || complaint.category}</strong>
                      <span class={statusClass(complaint.status)}>{statusLabel[complaint.status]}</span>
                    </div>
                    <div class="muted" style="margin-top:6px;font-size:0.84rem;">
                      {complaint.author?.fullName || '—'} → {complaint.targetUser?.fullName || '—'}
                    </div>
                    <div class="muted" style="margin-top:2px;font-size:0.82rem;">
                      Дата проблемы: {formatRuDate(complaint.occurredAt)}
                    </div>
                    <div style="margin-top:6px;font-size:0.88rem;">{complaint.description}</div>
                    {#if complaint.attachments && complaint.attachments.length > 0}
                      <div class="muted" style="margin-top:6px;font-size:0.82rem;">
                        Вложений: {complaint.attachments.length}
                      </div>
                    {/if}
                  </button>
                {/each}
              {/if}
            </div>

            <!-- Detail -->
            <div class="complaint-detail">
              {#if !selectedComplaint}
                <p class="muted">Выберите обращение для обработки.</p>
              {:else}
                <div class="surface">
                  <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
                    <strong>{categoryLabel[selectedComplaint.category] || selectedComplaint.category}</strong>
                    <span class={statusClass(selectedComplaint.status)}>{statusLabel[selectedComplaint.status]}</span>
                  </div>
                  <div class="muted" style="margin-top:6px;font-size:0.84rem;">
                    {selectedComplaint.author?.fullName} / {selectedComplaint.author?.email}
                  </div>
                  <div class="muted" style="margin-top:2px;font-size:0.82rem;">
                    Дата проблемы: {formatRuDate(selectedComplaint.occurredAt)}
                  </div>
                  <p style="margin-top:8px;">{selectedComplaint.description}</p>
                  {#if selectedComplaint.attachments && selectedComplaint.attachments.length > 0}
                    <div class="stack-sm" style="margin-top:8px;">
                      {#each selectedComplaint.attachments as attachment}
                        <a href={resolveFileUrl(attachment.fileUrl)} target="_blank" rel="noreferrer" style="word-break:break-all;">
                          {attachment.fileName} ({formatBytes(attachment.size ?? attachment.sizeBytes ?? 0)})
                        </a>
                      {/each}
                    </div>
                  {/if}
                </div>

                <div style="margin-top:10px;" class="stack-sm">
                  <label>
                    <div class="muted" style="margin-bottom:6px;">Новый статус</div>
                    <select class="input" bind:value={complaintStatusUpdate}>
                      {#each complaintStatusOptions as status}
                        <option value={status}>{statusLabel[status]}</option>
                      {/each}
                    </select>
                  </label>
                  <label>
                    <div class="muted" style="margin-bottom:6px;">Комментарий решения</div>
                    <textarea class="input" rows={3} bind:value={complaintResolution}></textarea>
                  </label>
                  <button class="btn btn-primary" on:click={updateComplaint} disabled={isBusy}>Сохранить статус</button>
                </div>

                <div style="margin-top:14px;">
                  <h3 style="margin:0 0 8px 0;font-size:0.95rem;">Переписка</h3>
                  <div class="stack-sm" style="max-height:220px;overflow:auto;">
                    {#if selectedComplaint.messages.length === 0}
                      <p class="muted">Сообщений пока нет.</p>
                    {:else}
                      {#each selectedComplaint.messages as msg}
                        <div class="surface">
                          <div style="display:flex;justify-content:space-between;gap:8px;align-items:center;">
                            <strong>{msg.sender.fullName}</strong>
                            <span class="muted" style="font-size:0.8rem;">{new Date(msg.createdAt).toLocaleString('ru-RU')}</span>
                          </div>
                          <div style="margin-top:6px;">{msg.body}</div>
                        </div>
                      {/each}
                    {/if}
                  </div>
                  <div style="display:flex;gap:8px;margin-top:10px;">
                    <textarea class="input" rows={2} bind:value={complaintReply} placeholder="Ответ модератора..."></textarea>
                    <button class="btn btn-outline" on:click={sendComplaintReply} disabled={isBusy || !complaintReply.trim()}>
                      Ответить
                    </button>
                  </div>
                </div>
              {/if}
            </div>
          </div>
        </section>
      {/if}

      <!-- ─── База данных tab ─── -->
      {#if activeTab === 'database'}
        <div id="database" class="tab-content">
          <!-- Блокировки -->
          <section class="db-section">
            <h2>Блокировки и модерация</h2>
            <div class="db-actions-grid">
              <div class="stack-sm">
                <h3 style="margin:0;font-size:0.95rem;">Блокировка пользователя</h3>
                <input class="input" bind:value={blockUserId} placeholder="User ID" />
                <input class="input" bind:value={blockReason} placeholder="Причина (опционально)" />
                <button class="btn btn-primary" on:click={blockUser} disabled={isBusy}>Заблокировать</button>
              </div>
              <div class="stack-sm">
                <h3 style="margin:0;font-size:0.95rem;">Разблокировка пользователя</h3>
                <input class="input" bind:value={unblockUserId} placeholder="User ID" />
                <input class="input" bind:value={unblockReason} placeholder="Причина (опционально)" />
                <button class="btn btn-outline" on:click={unblockUser} disabled={isBusy}>Разблокировать</button>
              </div>
              <div class="stack-sm">
                <h3 style="margin:0;font-size:0.95rem;">Действие модерации</h3>
                <input class="input" bind:value={moderationTargetType} placeholder="targetType (session/user/message)" />
                <input class="input" bind:value={moderationTargetId} placeholder="targetId (UUID)" />
                <input class="input" bind:value={moderationAction} placeholder="action (warn/remove/...)" />
                <input class="input" bind:value={moderationReason} placeholder="reason (опционально)" />
                <button class="btn btn-primary" on:click={createModerationAction} disabled={isBusy}>Создать</button>
              </div>
            </div>
          </section>

          <!-- Комиссия платформы -->
          <section class="db-section" id="finances">
            <h2>Комиссия платформы</h2>
            <div class="balance-grid">
              <div class="balance-cards">
                <div class="balance-card">
                  <div class="balance-label">Всего комиссий</div>
                  <div class="balance-value">{balance?.totalFees ?? 0} {balance?.currency ?? 'RUB'}</div>
                </div>
                <div class="balance-card">
                  <div class="balance-label">Выведено</div>
                  <div class="balance-value">{balance?.totalWithdrawn ?? 0} {balance?.currency ?? 'RUB'}</div>
                </div>
                <div class="balance-card balance-accent">
                  <div class="balance-label">Доступно к выводу</div>
                  <div class="balance-value accent">{balance?.available ?? 0} {balance?.currency ?? 'RUB'}</div>
                </div>
              </div>
              <div class="stack-sm">
                <h3 style="margin:0;font-size:0.95rem;">Вывод комиссии</h3>
                <input class="input" bind:value={withdrawAmount} placeholder="Сумма (целое число)" />
                <input class="input" bind:value={withdrawCurrency} maxlength="3" placeholder="RUB" />
                <input class="input" bind:value={withdrawProvider} placeholder="Провайдер (например manual)" />
                <button class="btn btn-primary" on:click={withdrawPlatformFees} disabled={isBusy}>Создать вывод</button>
              </div>
              <div class="stack-sm">
                <h3 style="margin:0;font-size:0.95rem;">Выплаты менторам</h3>
                <p class="muted" style="margin:0;">Обрабатывает выплаты, у которых истек период удержания и нет активных обращений.</p>
                <button class="btn btn-outline" on:click={processReadyPayouts} disabled={isBusy}>Обработать готовые выплаты</button>
              </div>
            </div>
          </section>

          <!-- Audit logs -->
          <section class="db-section">
            <h2>Журнал аудита</h2>
            {#if auditLogs.length === 0}
              <p class="muted">Записей пока нет.</p>
            {:else}
              <div class="stack-sm">
                {#each auditLogs as log}
                  <div class="surface audit-row">
                    <div class="audit-main">
                      <strong class="audit-action">{log.action}</strong>
                      <span class="muted audit-meta">{log.admin?.fullName || '—'} · {log.targetType} · {log.targetId || '—'}</span>
                    </div>
                    <span class="muted audit-time">{new Date(log.createdAt).toLocaleString('ru-RU')}</span>
                  </div>
                {/each}
              </div>
            {/if}
          </section>
        </div>
      {/if}

      <!-- Bottom navigation -->
      <div class="bottom-nav">
        <a class="bottom-btn" href="/admin">На главную</a>
        {#if activeTab !== 'database'}
          <button class="bottom-btn" on:click={() => setTab('database')}>В БД</button>
        {/if}
      </div>
    </main>
  {/if}
</div>

<style>
  /* ── Dark admin chrome ───────────────────────────────── */
  .admin-page {
    min-height: 100vh;
    background: #2a2a30;
    color: #e5e7eb;
    display: flex;
    flex-direction: column;
  }

  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 28px;
    background: #fff;
    color: #111;
    border-bottom: 1px solid #e5e7eb;
  }
  .brand {
    font-size: 1.3rem;
    font-weight: 800;
    color: #111;
    text-decoration: none;
  }
  .topbar-actions { display: flex; gap: 10px; }
  .topbar-btn {
    padding: 6px 14px;
    border-radius: 999px;
    background: #f3f4f6;
    color: #111;
    font-size: 0.85rem;
    text-decoration: none;
    border: none;
    cursor: pointer;
  }
  .topbar-btn:hover { background: #e5e7eb; }

  .loading-wrap {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 60px 0;
  }

  /* ── Shell ───────────────────────────────────────────── */
  .shell {
    max-width: 1100px;
    margin: 0 auto;
    padding: 32px 20px 80px;
    width: 100%;
    box-sizing: border-box;
  }

  .page-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
    margin-bottom: 24px;
  }

  .back-link {
    font-size: 0.85rem;
    color: #a1a1aa;
    text-decoration: none;
    display: block;
    margin-bottom: 6px;
  }
  .back-link:hover { color: #fff; }

  .page-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: #fff;
    margin: 0;
  }

  .refresh-btn {
    padding: 8px 16px;
    border-radius: 8px;
    background: transparent;
    color: #e5e7eb;
    border: 1px solid #4a4a52;
    font-size: 0.85rem;
    cursor: pointer;
  }
  .refresh-btn:hover { border-color: #6b6b75; background: rgba(255,255,255,0.04); }
  .refresh-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  /* ── Notices ─────────────────────────────────────────── */
  .notice {
    border-radius: 8px;
    padding: 10px 14px;
    font-size: 0.88rem;
    margin-bottom: 16px;
  }
  .notice.success {
    background: rgba(34, 197, 94, 0.15);
    border: 1px solid rgba(34, 197, 94, 0.35);
    color: #86efac;
  }
  .notice.error {
    background: rgba(239, 68, 68, 0.15);
    border: 1px solid rgba(239, 68, 68, 0.35);
    color: #fca5a5;
  }

  /* ── Tabs ────────────────────────────────────────────── */
  .tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    border-bottom: 2px solid #4a4a52;
    margin-bottom: 24px;
  }
  .tab {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 10px 18px;
    border: none;
    background: none;
    font-size: 0.9rem;
    font-weight: 600;
    color: #a1a1aa;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    margin-bottom: -2px;
    transition: color 0.15s ease;
    border-radius: 8px 8px 0 0;
  }
  .tab:hover { color: #fff; }
  .tab-active {
    color: #fff;
    border-bottom-color: #2563eb;
  }
  .tab-badge {
    background: #2563eb;
    color: #fff;
    border-radius: 999px;
    padding: 1px 7px;
    font-size: 0.72rem;
    font-weight: 700;
  }

  /* ── Tab content ─────────────────────────────────────── */
  .tab-content {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 16px;
  }
  .section-head h2 {
    font-size: 1.1rem;
    font-weight: 700;
    color: #fff;
    margin: 0;
  }
  .section-controls {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  /* ── Reset Skeleton variables inside dark admin ──────── */
  .admin-page :global(.surface) {
    background: #36363c;
    border-color: #4a4a52;
    color: #e5e7eb;
    border-radius: 8px;
  }
  .admin-page :global(.surface:hover) {
    background: #3f3f47;
  }
  .admin-page :global(.muted) { color: #a1a1aa; }
  .admin-page :global(.input) {
    background: #1f1f24;
    color: #fff;
    border: 1px solid #4a4a52;
    border-radius: 6px;
    padding: 8px 10px;
    font-size: 0.88rem;
  }
  .admin-page :global(.input::placeholder) { color: #6b7280; }
  .admin-page :global(.input:focus) { border-color: #2563eb; outline: none; }
  .admin-page :global(.badge) {
    border-radius: 999px;
    padding: 2px 10px;
    font-size: 0.72rem;
    font-weight: 600;
  }
  .admin-page :global(.badge.success) {
    background: rgba(34, 197, 94, 0.18);
    color: #86efac;
  }
  .admin-page :global(.badge.warning) {
    background: rgba(245, 158, 11, 0.18);
    color: #fcd34d;
  }
  .admin-page :global(.badge.error) {
    background: rgba(239, 68, 68, 0.18);
    color: #fca5a5;
  }
  .admin-page :global(.badge.info) {
    background: rgba(59, 130, 246, 0.18);
    color: #93c5fd;
  }
  .admin-page :global(.btn) {
    border-radius: 6px;
    font-size: 0.85rem;
    padding: 7px 12px;
    cursor: pointer;
  }
  .admin-page :global(.btn-primary) {
    background: #2563eb;
    color: #fff;
    border: none;
  }
  .admin-page :global(.btn-primary:hover) { background: #1d4ed8; }
  .admin-page :global(.btn-outline) {
    background: transparent;
    color: #e5e7eb;
    border: 1px solid #4a4a52;
  }
  .admin-page :global(.btn-outline:hover) { border-color: #6b6b75; }
  .admin-page :global(.btn-ghost) {
    background: transparent;
    color: #e5e7eb;
    border: none;
  }
  .admin-page :global(.btn-sm) { padding: 5px 10px; font-size: 0.8rem; }
  .admin-page :global(.btn:disabled) { opacity: 0.5; cursor: not-allowed; }
  .admin-page :global(h2), .admin-page :global(h3), .admin-page :global(strong) {
    color: #fff;
  }
  .admin-page :global(a) { color: #93c5fd; }
  .admin-page :global(a:hover) { color: #bfdbfe; }

  /* ── Complaints layout ───────────────────────────────── */
  .complaints-layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr);
    gap: 18px;
  }
  .complaints-list {
    max-height: 600px;
    overflow-y: auto;
  }
  .complaint-btn {
    text-align: left;
    width: 100%;
    cursor: pointer;
  }

  /* ── Database tab ────────────────────────────────────── */
  .db-section {
    background: #36363c;
    border: 1px solid #4a4a52;
    border-radius: 12px;
    padding: 22px 24px;
  }
  .db-section h2 {
    font-size: 1.05rem;
    font-weight: 700;
    color: #fff;
    margin: 0 0 18px;
  }
  .db-actions-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px;
  }
  .balance-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }
  .balance-cards {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .balance-card {
    background: #1f1f24;
    border: 1px solid #4a4a52;
    border-radius: 8px;
    padding: 12px 16px;
  }
  .balance-label { font-size: 0.8rem; color: #a1a1aa; margin-bottom: 4px; }
  .balance-value { font-size: 1.2rem; font-weight: 700; color: #fff; }
  .balance-value.accent { color: #93c5fd; }

  .audit-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    flex-wrap: wrap;
  }
  .audit-main { display: flex; flex-direction: column; gap: 2px; }
  .audit-action { font-size: 0.9rem; }
  .audit-meta { font-size: 0.82rem; }
  .audit-time { font-size: 0.8rem; white-space: nowrap; }

  /* ── Bottom nav buttons ──────────────────────────────── */
  .bottom-nav {
    display: flex;
    justify-content: center;
    gap: 16px;
    margin-top: 40px;
  }
  .bottom-btn {
    background: #3a3f5c;
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 12px 32px;
    font-size: 0.9rem;
    cursor: pointer;
    text-decoration: none;
    transition: background 0.15s ease;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 160px;
  }
  .bottom-btn:hover { background: #444a72; color: #fff; }

  /* ── Responsive ──────────────────────────────────────── */
  @media (max-width: 800px) {
    .complaints-layout,
    .db-actions-grid,
    .balance-grid {
      grid-template-columns: 1fr;
    }
    .complaints-list {
      max-height: 300px;
    }
  }

  @media (max-width: 480px) {
    .shell {
      padding: 20px 16px 60px;
    }
    .topbar {
      padding: 10px 16px;
      flex-wrap: wrap;
      gap: 8px;
    }
    .tab {
      padding-inline: 12px;
      font-size: 0.84rem;
    }
  }
</style>
