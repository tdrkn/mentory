<script lang="ts">
  import AppHeader from '$lib/components/AppHeader.svelte';
  import Loading from '$lib/components/Loading.svelte';
  import { api, ApiError } from '$lib/api';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { isAuthenticated, isLoading as authLoading, isAdmin } from '$lib/stores/auth';

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
  let withdrawCurrency = 'USD';
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
      notice = 'Статус жалобы обновлён.';
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
      notice = status === 'approved' ? 'Регалия одобрена.' : 'Регалия отклонена.';
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

  const refreshAll = async () => {
    await Promise.all([loadComplaints(), loadRegalia(), loadAudit(), loadBalance()]);
  };

  onMount(async () => {
    if (!$isAuthenticated && !$authLoading) {
      goto('/login');
      return;
    }
    if ($isAuthenticated && !$isAdmin) {
      goto('/mentors');
      return;
    }

    try {
      await refreshAll();
    } catch (err) {
      error = extractError(err, 'Не удалось загрузить данные trust-админки.');
    } finally {
      isPageLoading = false;
    }
  });
</script>

<div class="page">
  <AppHeader />

  {#if $authLoading || isPageLoading}
    <Loading />
  {:else}
    <main class="container section">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
        <div>
          <h1 class="section-title">Admin Trust</h1>
          <p class="muted">Жалобы, верификация, модерация, блокировки и комиссия платформы.</p>
        </div>
        <button class="btn btn-outline" on:click={refreshAll} disabled={isBusy}>Обновить всё</button>
      </div>

      {#if notice}
        <div class="surface" style="margin-top:12px;background:#dcfce7;border-color:#bbf7d0;color:#166534;">{notice}</div>
      {/if}
      {#if error}
        <div class="surface" style="margin-top:12px;background:#fee2e2;border-color:#fecaca;color:#991b1b;">{error}</div>
      {/if}

      <section class="card" style="margin-top:18px;">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
          <h2 class="section-title">Жалобы</h2>
          <div style="display:flex;gap:8px;align-items:center;">
            <select class="input" bind:value={complaintFilter}>
              <option value="">Все статусы</option>
              {#each complaintStatusOptions as status}
                <option value={status}>{statusLabel[status]}</option>
              {/each}
            </select>
            <button class="btn btn-outline" on:click={loadComplaints} disabled={isBusy}>Применить</button>
          </div>
        </div>

        <div class="grid" style="grid-template-columns:1fr 1.1fr;gap:18px;">
          <div class="stack-sm">
            {#if complaints.length === 0}
              <p class="muted">Жалобы не найдены.</p>
            {:else}
              {#each complaints as complaint}
                <button class="surface" style="text-align:left;" on:click={() => openComplaint(complaint.id)}>
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
                  <div style="margin-top:6px;">{complaint.description}</div>
                  {#if complaint.attachments && complaint.attachments.length > 0}
                    <div class="muted" style="margin-top:6px;font-size:0.82rem;">
                      Вложений: {complaint.attachments.length}
                    </div>
                  {/if}
                </button>
              {/each}
            {/if}
          </div>

          <div>
            {#if !selectedComplaint}
              <p class="muted">Выберите жалобу для обработки.</p>
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
                      <a href={attachment.fileUrl} target="_blank" rel="noreferrer" style="word-break:break-all;">
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
                <h3 style="margin:0 0 8px 0;">Переписка</h3>
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

      <section class="card" style="margin-top:20px;">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
          <h2 class="section-title">Верификация регалий</h2>
          <div style="display:flex;gap:8px;align-items:center;">
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
          <p class="muted">Регалий не найдено.</p>
        {:else}
          <div class="stack-sm">
            {#each regaliaItems as item}
              <div class="surface">
                <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
                  <div>
                    <a href={item.fileUrl} target="_blank" rel="noreferrer"><strong>{item.fileName}</strong></a>
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
                  <a class="btn btn-outline btn-sm" href="/chat">Чат</a>
                  {#if item.mentor?.id}
                    <a class="btn btn-outline btn-sm" href={`/mentors/${item.mentor.id}`}>Профиль</a>
                  {/if}
                  <a class="btn btn-outline btn-sm" href={item.fileUrl} target="_blank" rel="noreferrer" download={item.fileName}>
                    Скачать
                  </a>
                  <input
                    class="input"
                    style="max-width:380px;"
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

      <section class="card" style="margin-top:20px;">
        <h2 class="section-title">Блокировки и модерация</h2>
        <div class="grid" style="grid-template-columns:1fr 1fr 1fr;gap:16px;">
          <div class="stack-sm">
            <h3 style="margin:0;">Блокировка</h3>
            <input class="input" bind:value={blockUserId} placeholder="User ID" />
            <input class="input" bind:value={blockReason} placeholder="Причина (опционально)" />
            <button class="btn btn-primary" on:click={blockUser} disabled={isBusy}>Заблокировать</button>
          </div>
          <div class="stack-sm">
            <h3 style="margin:0;">Разблокировка</h3>
            <input class="input" bind:value={unblockUserId} placeholder="User ID" />
            <input class="input" bind:value={unblockReason} placeholder="Причина (опционально)" />
            <button class="btn btn-outline" on:click={unblockUser} disabled={isBusy}>Разблокировать</button>
          </div>
          <div class="stack-sm">
            <h3 style="margin:0;">Moderation action</h3>
            <input class="input" bind:value={moderationTargetType} placeholder="targetType (session/user/message)" />
            <input class="input" bind:value={moderationTargetId} placeholder="targetId (UUID)" />
            <input class="input" bind:value={moderationAction} placeholder="action (warn/remove/...)" />
            <input class="input" bind:value={moderationReason} placeholder="reason (опционально)" />
            <button class="btn btn-primary" on:click={createModerationAction} disabled={isBusy}>Создать</button>
          </div>
        </div>
      </section>

      <section class="card" style="margin-top:20px;">
        <h2 class="section-title">Комиссия платформы</h2>
        <div class="grid" style="grid-template-columns:1fr 1fr;gap:16px;">
          <div class="stack-sm">
            <div class="surface">
              <div class="muted">Total fees</div>
              <strong>{balance?.totalFees ?? 0} {balance?.currency ?? 'USD'}</strong>
            </div>
            <div class="surface">
              <div class="muted">Total withdrawn</div>
              <strong>{balance?.totalWithdrawn ?? 0} {balance?.currency ?? 'USD'}</strong>
            </div>
            <div class="surface">
              <div class="muted">Available</div>
              <strong style="color:var(--accent);">{balance?.available ?? 0} {balance?.currency ?? 'USD'}</strong>
            </div>
          </div>
          <div class="stack-sm">
            <input class="input" bind:value={withdrawAmount} placeholder="Сумма (целое число)" />
            <input class="input" bind:value={withdrawCurrency} maxlength="3" placeholder="USD" />
            <input class="input" bind:value={withdrawProvider} placeholder="Провайдер (например manual)" />
            <button class="btn btn-primary" on:click={withdrawPlatformFees} disabled={isBusy}>Создать вывод</button>
          </div>
        </div>
      </section>

      <section class="card" style="margin-top:20px;">
        <h2 class="section-title">Audit logs</h2>
        {#if auditLogs.length === 0}
          <p class="muted">Записей пока нет.</p>
        {:else}
          <div class="stack-sm">
            {#each auditLogs as log}
              <div class="surface">
                <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
                  <strong>{log.action}</strong>
                  <span class="muted" style="font-size:0.82rem;">{new Date(log.createdAt).toLocaleString('ru-RU')}</span>
                </div>
                <div class="muted" style="margin-top:6px;">
                  {log.admin?.fullName || '—'} · {log.targetType} · {log.targetId || '—'}
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </section>
    </main>
  {/if}
</div>
