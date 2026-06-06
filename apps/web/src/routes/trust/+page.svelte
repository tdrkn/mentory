<script lang="ts">
  import AppHeader from '$lib/components/AppHeader.svelte';
  import Loading from '$lib/components/Loading.svelte';
  import { api, ApiError } from '$lib/api';
  import { getApiUrl } from '$lib/env';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { isAuthenticated, isLoading as authLoading, user } from '$lib/stores/auth';

  type ComplaintStatus = 'new' | 'in_progress' | 'resolved' | 'rejected';
  type ComplaintCategory =
    | 'platform_issue'
    | 'user_behavior'
    | 'session_issue'
    | 'payment_issue'
    | 'content_violation'
    | 'other';
  type ComplaintScope = 'platform' | 'user' | 'session';

  interface ComplaintAttachment {
    id: string;
    fileName: string;
    fileUrl: string;
    mimeType: string;
    size?: number | null;
    sizeBytes?: number | null;
  }

  interface ComplaintListItem {
    id: string;
    category: ComplaintCategory;
    description: string;
    occurredAt?: string | null;
    status: ComplaintStatus;
    createdAt: string;
    targetSessionId?: string | null;
    targetUser?: { id: string; fullName: string } | null;
    assignedAdmin?: { id: string; fullName: string } | null;
    attachments?: ComplaintAttachment[];
  }

  interface ComplaintMessage {
    id: string;
    body: string;
    createdAt: string;
    sender: { id: string; fullName: string; role: string };
  }

  interface ComplaintDetails extends ComplaintListItem {
    author?: { id: string; fullName: string; email: string } | null;
    messages: ComplaintMessage[];
    resolutionComment?: string | null;
  }

  type RegaliaStatus = 'pending' | 'approved' | 'rejected';

  interface RegaliaItem {
    id: string;
    fileUrl: string;
    fileName: string;
    mimeType?: string | null;
    size?: number | null;
    sizeBytes?: number | null;
    status: RegaliaStatus;
    rejectionReason?: string | null;
    createdAt: string;
    reviewedAt?: string | null;
  }

  const MAX_UPLOAD_SIZE_BYTES = 128 * 1024 * 1024;
  const COMPLAINT_CATEGORIES: Array<{ value: ComplaintCategory; label: string }> = [
    { value: 'platform_issue', label: 'Проблема с сайтом' },
    { value: 'user_behavior', label: 'Поведение пользователя' },
    { value: 'session_issue', label: 'Проблема со встречей' },
    { value: 'payment_issue', label: 'Проблема с оплатой' },
    { value: 'content_violation', label: 'Неподходящий контент' },
    { value: 'other', label: 'Другое' },
  ];

  let isPageLoading = true;
  let isBusy = false;
  let notice: string | null = null;
  let error: string | null = null;

  let complaints: ComplaintListItem[] = [];
  let selectedComplaint: ComplaintDetails | null = null;
  let complaintMessage = '';

  let category: ComplaintCategory = 'platform_issue';
  let occurredOn = '';
  let description = '';
  let complaintScope: ComplaintScope = 'platform';
  let targetUserId = '';
  let targetSessionId = '';
  let complaintFiles: File[] = [];
  let complaintFileInput: HTMLInputElement | null = null;

  let regalia: RegaliaItem[] = [];
  let regaliaFile: File | null = null;
  let regaliaFileInput: HTMLInputElement | null = null;

  const isMentorRole = () => $user?.role === 'mentor' || $user?.role === 'both';

  const statusLabel: Record<ComplaintStatus | RegaliaStatus, string> = {
    new: 'Новая',
    in_progress: 'В работе',
    resolved: 'Решена',
    rejected: 'Отклонена',
    pending: 'На проверке',
    approved: 'Одобрена',
  };

  const categoryLabel: Record<ComplaintCategory, string> = {
    platform_issue: 'Проблема с сайтом',
    user_behavior: 'Поведение пользователя',
    session_issue: 'Проблема со встречей',
    payment_issue: 'Проблема с оплатой',
    content_violation: 'Неподходящий контент',
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

  const toRuDate = (isoDate: string) => {
    const [year, month, day] = isoDate.split('-');
    return `${day}.${month}.${year}`;
  };

  const formatRuDate = (dateTime?: string | null) => {
    if (!dateTime) return '—';
    const parsed = new Date(dateTime);
    if (Number.isNaN(parsed.getTime())) return '—';
    return parsed.toLocaleDateString('ru-RU');
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

  const fileToDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
          return;
        }
        reject(new Error('Не удалось прочитать файл'));
      };
      reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
      reader.readAsDataURL(file);
    });

  const getFileExtension = (fileName: string) => {
    const dotIndex = fileName.lastIndexOf('.');
    return dotIndex < 0 ? '' : fileName.slice(dotIndex).toLowerCase();
  };

  const validateComplaintAttachment = (file: File) => {
    const extension = getFileExtension(file.name);
    if (!['.png', '.jpg', '.jpeg', '.pdf'].includes(extension)) {
      error = 'Вложения обращения: только .png, .jpg, .jpeg, .pdf.';
      return false;
    }
    if (file.size < 1 || file.size > MAX_UPLOAD_SIZE_BYTES) {
      error = 'Каждый файл должен быть от 1 байта до 128MB.';
      return false;
    }
    return true;
  };

  const validateRegaliaFile = (file: File) => {
    if (getFileExtension(file.name) !== '.pdf') {
      error = 'Для проверки документов ментора допускается только PDF.';
      return false;
    }
    if (file.size < 1 || file.size > MAX_UPLOAD_SIZE_BYTES) {
      error = 'Размер PDF должен быть от 1 байта до 128MB.';
      return false;
    }
    return true;
  };

  const loadComplaints = async () => {
    complaints = await api.get<ComplaintListItem[]>('/complaints/mine');

    if (selectedComplaint) {
      const stillExists = complaints.find((item) => item.id === selectedComplaint?.id);
      if (stillExists) {
        await openComplaint(stillExists.id);
      } else {
        selectedComplaint = null;
      }
    }
  };

  const openComplaint = async (id: string) => {
    selectedComplaint = await api.get<ComplaintDetails>(`/complaints/${id}`);
  };

  const handleComplaintFilesChange = (event: Event) => {
    const target = event.currentTarget as HTMLInputElement;
    complaintFiles = Array.from(target.files || []);
    error = null;
    notice = null;
  };

  const clearComplaintFiles = () => {
    complaintFiles = [];
    if (complaintFileInput) complaintFileInput.value = '';
  };

  const createComplaint = async () => {
    notice = null;
    error = null;

    if (!description.trim()) {
      error = 'Укажите описание проблемы.';
      return;
    }
    if (description.trim().length > 1000) {
      error = 'Описание не должно превышать 1000 символов.';
      return;
    }
    if (!occurredOn) {
      error = 'Укажите дату возникновения проблемы.';
      return;
    }
    if (complaintScope === 'user' && !targetUserId.trim()) {
      error = 'Для обращения по пользователю нужно указать ID пользователя.';
      return;
    }
    if (complaintScope === 'session' && !targetSessionId.trim()) {
      error = 'Для обращения по встрече нужно указать ID сессии.';
      return;
    }
    if (complaintFiles.length > 3) {
      error = 'Максимум 3 вложения к одному обращению.';
      return;
    }
    for (const file of complaintFiles) {
      if (!validateComplaintAttachment(file)) return;
    }

    isBusy = true;
    try {
      const attachments = [];
      for (const file of complaintFiles) {
        const fileUrl = await fileToDataUrl(file);
        attachments.push({
          fileName: file.name,
          fileUrl,
          mimeType: file.type || 'application/octet-stream',
          size: file.size,
        });
      }

      await api.post('/complaints', {
        category,
        occurredOn: toRuDate(occurredOn),
        description: description.trim(),
        targetUserId: complaintScope === 'user' ? targetUserId.trim() : undefined,
        targetSessionId: complaintScope === 'session' ? targetSessionId.trim() : undefined,
        attachments: attachments.length ? attachments : undefined,
      });

      occurredOn = '';
      description = '';
      category = 'platform_issue';
      complaintScope = 'platform';
      targetUserId = '';
      targetSessionId = '';
      clearComplaintFiles();
      notice = 'Обращение отправлено.';
      await loadComplaints();
    } catch (err) {
      error = extractError(err, 'Не удалось отправить обращение.');
    } finally {
      isBusy = false;
    }
  };

  const sendComplaintMessage = async () => {
    if (!selectedComplaint || !complaintMessage.trim()) return;
    notice = null;
    error = null;
    isBusy = true;
    try {
      await api.post(`/complaints/${selectedComplaint.id}/messages`, {
        body: complaintMessage.trim(),
      });
      complaintMessage = '';
      await openComplaint(selectedComplaint.id);
    } catch (err) {
      error = extractError(err, 'Не удалось отправить сообщение.');
    } finally {
      isBusy = false;
    }
  };

  const loadRegalia = async () => {
    regalia = await api.get<RegaliaItem[]>('/regalia/mine');
  };

  const handleRegaliaFileChange = (event: Event) => {
    const target = event.currentTarget as HTMLInputElement;
    regaliaFile = target.files?.[0] || null;
    error = null;
    notice = null;
  };

  const clearRegaliaFile = () => {
    regaliaFile = null;
    if (regaliaFileInput) regaliaFileInput.value = '';
  };

  const uploadRegalia = async () => {
    notice = null;
    error = null;
    if (!regaliaFile) {
      error = 'Выберите PDF-файл с документом ментора.';
      return;
    }
    if (!validateRegaliaFile(regaliaFile)) return;

    isBusy = true;
    try {
      const fileUrl = await fileToDataUrl(regaliaFile);
      await api.post('/regalia', {
        fileUrl,
        fileName: regaliaFile.name,
        mimeType: regaliaFile.type || 'application/pdf',
        size: regaliaFile.size,
      });
      clearRegaliaFile();
      notice = 'Файл отправлен на проверку.';
      await loadRegalia();
    } catch (err) {
      error = extractError(err, 'Не удалось отправить документ.');
    } finally {
      isBusy = false;
    }
  };

  onMount(async () => {
    if (!$isAuthenticated && !$authLoading) {
      goto('/login');
      return;
    }

    try {
      await loadComplaints();
      if (isMentorRole()) {
        await loadRegalia();
      }
    } catch (err) {
      error = extractError(err, 'Не удалось загрузить данные раздела помощи.');
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
      <h1 class="section-title">Помощь и безопасность</h1>
      <p class="muted">Обращения в поддержку, спорные ситуации и проверка документов ментора.</p>

      {#if notice}
        <div class="surface" style="margin-top:12px;background:var(--status-success-bg);border-color:var(--status-success-border);color:var(--status-success-ink);">{notice}</div>
      {/if}
      {#if error}
        <div class="surface" style="margin-top:12px;background:var(--status-error-bg);border-color:var(--status-error-border);color:var(--status-error-ink);">{error}</div>
      {/if}

      <div class="grid trust-complaints-grid">
        <section class="card">
          <h2 class="section-title">Новое обращение</h2>
          <div class="stack-sm">
            <label>
              <div class="muted" style="margin-bottom:6px;">Тема обращения</div>
              <select class="input" bind:value={category}>
                {#each COMPLAINT_CATEGORIES as option}
                  <option value={option.value}>{option.label}</option>
                {/each}
              </select>
            </label>
            <label>
              <div class="muted" style="margin-bottom:6px;">Дата возникновения</div>
              <input class="input" type="date" bind:value={occurredOn} />
            </label>
            <label>
              <div class="muted" style="margin-bottom:6px;">Описание (до 1000 символов)</div>
              <textarea class="input" bind:value={description} rows={4} maxlength="1000"></textarea>
            </label>
            <label>
              <div class="muted" style="margin-bottom:6px;">К чему относится обращение</div>
              <select class="input" bind:value={complaintScope}>
                <option value="platform">К сайту</option>
                <option value="user">К пользователю</option>
                <option value="session">К встрече</option>
              </select>
            </label>
            {#if complaintScope === 'user'}
              <label>
                <div class="muted" style="margin-bottom:6px;">ID пользователя</div>
                <input class="input" bind:value={targetUserId} placeholder="UUID пользователя" />
              </label>
            {/if}
            {#if complaintScope === 'session'}
              <label>
                <div class="muted" style="margin-bottom:6px;">ID сессии</div>
                <input class="input" bind:value={targetSessionId} placeholder="UUID сессии" />
              </label>
            {/if}
            <label>
              <div class="muted" style="margin-bottom:6px;">Вложения (.png, .jpg, .pdf; до 128MB)</div>
              <input
                bind:this={complaintFileInput}
                class="input"
                type="file"
                multiple
                accept=".png,.jpg,.jpeg,.pdf"
                on:change={handleComplaintFilesChange}
              />
            </label>
            {#if complaintFiles.length > 0}
              <div class="surface">
                {#each complaintFiles as file}
                  <div style="display:flex;justify-content:space-between;gap:8px;">
                    <span style="word-break:break-all;">{file.name}</span>
                    <span class="muted">{formatBytes(file.size)}</span>
                  </div>
                {/each}
              </div>
            {/if}
            <button class="btn btn-primary" on:click={createComplaint} disabled={isBusy}>
              {isBusy ? 'Отправка...' : 'Отправить обращение'}
            </button>
          </div>
        </section>

        <section class="card">
          <h2 class="section-title">Мои обращения</h2>
          {#if complaints.length === 0}
            <p class="muted">Пока обращений нет.</p>
          {:else}
            <div class="stack-sm">
              {#each complaints as complaint}
                <button class="surface" style="text-align:left;" on:click={() => openComplaint(complaint.id)}>
                  <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;">
                    <strong>{categoryLabel[complaint.category] || complaint.category}</strong>
                    <span class={statusClass(complaint.status)}>{statusLabel[complaint.status]}</span>
                  </div>
                  <div class="muted" style="margin-top:6px;font-size:0.86rem;">
                    Создана: {new Date(complaint.createdAt).toLocaleString('ru-RU')}
                  </div>
                  <div class="muted" style="margin-top:2px;font-size:0.84rem;">
                    Дата проблемы: {formatRuDate(complaint.occurredAt)}
                  </div>
                  <div style="margin-top:6px;">{complaint.description}</div>
                  {#if complaint.attachments && complaint.attachments.length > 0}
                    <div class="muted" style="margin-top:6px;font-size:0.84rem;">
                      Вложений: {complaint.attachments.length}
                    </div>
                  {/if}
                </button>
              {/each}
            </div>
          {/if}
        </section>
      </div>

      <section class="card" style="margin-top:20px;">
        <h2 class="section-title">Детали обращения</h2>
        {#if !selectedComplaint}
          <p class="muted">Выберите обращение из списка выше.</p>
        {:else}
          <div class="surface" style="margin-bottom:12px;">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
              <strong>{categoryLabel[selectedComplaint.category] || selectedComplaint.category}</strong>
              <span class={statusClass(selectedComplaint.status)}>{statusLabel[selectedComplaint.status]}</span>
            </div>
            <div class="muted" style="margin-top:6px;">Дата проблемы: {formatRuDate(selectedComplaint.occurredAt)}</div>
            <p style="margin:8px 0 0;">{selectedComplaint.description}</p>
            {#if selectedComplaint.attachments && selectedComplaint.attachments.length > 0}
              <div class="stack-sm" style="margin-top:8px;">
                {#each selectedComplaint.attachments as attachment}
                  <a href={resolveFileUrl(attachment.fileUrl)} target="_blank" rel="noreferrer" style="word-break:break-all;">
                    {attachment.fileName} ({formatBytes(attachment.size ?? attachment.sizeBytes ?? 0)})
                  </a>
                {/each}
              </div>
            {/if}
            {#if selectedComplaint.resolutionComment}
              <p class="muted" style="margin-top:8px;">Решение: {selectedComplaint.resolutionComment}</p>
            {/if}
          </div>

          <div class="stack-sm" style="max-height:280px;overflow:auto;">
            {#if selectedComplaint.messages.length === 0}
              <p class="muted">Сообщений пока нет.</p>
            {:else}
              {#each selectedComplaint.messages as msg}
                <div class="surface">
                  <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;">
                    <strong>{msg.sender.fullName}</strong>
                    <span class="muted" style="font-size:0.82rem;">{new Date(msg.createdAt).toLocaleString('ru-RU')}</span>
                  </div>
                  <div style="margin-top:6px;">{msg.body}</div>
                </div>
              {/each}
            {/if}
          </div>

          <div style="margin-top:12px;display:flex;gap:8px;">
            <textarea class="input" rows={2} bind:value={complaintMessage} placeholder="Сообщение по обращению..."></textarea>
            <button class="btn btn-outline" on:click={sendComplaintMessage} disabled={isBusy || !complaintMessage.trim()}>
              Отправить
            </button>
          </div>
        {/if}
      </section>

      {#if isMentorRole()}
        <section class="card" style="margin-top:20px;">
          <h2 class="section-title">Документы ментора</h2>
          <div class="grid trust-regalia-grid">
            <div class="stack-sm">
              <label>
                <div class="muted" style="margin-bottom:6px;">PDF файл (до 128MB)</div>
                <input
                  bind:this={regaliaFileInput}
                  class="input"
                  type="file"
                  accept=".pdf,application/pdf"
                  on:change={handleRegaliaFileChange}
                />
              </label>
              {#if regaliaFile}
                <div class="surface">
                  <div style="word-break:break-all;">{regaliaFile.name}</div>
                  <div class="muted" style="margin-top:4px;">{formatBytes(regaliaFile.size)}</div>
                </div>
              {/if}
              <button class="btn btn-primary" on:click={uploadRegalia} disabled={isBusy}>
                {isBusy ? 'Отправка...' : 'Отправить на проверку'}
              </button>
            </div>

            <div>
              {#if regalia.length === 0}
                <p class="muted">Вы ещё не отправляли документы.</p>
              {:else}
                <div class="stack-sm">
                  {#each regalia as item}
                    <div class="surface">
                      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;">
                        <a href={resolveFileUrl(item.fileUrl)} target="_blank" rel="noreferrer"><strong>{item.fileName}</strong></a>
                        <span class={statusClass(item.status)}>{statusLabel[item.status]}</span>
                      </div>
                      <div class="muted" style="font-size:0.84rem;margin-top:6px;">
                        {new Date(item.createdAt).toLocaleString('ru-RU')}
                      </div>
                      <div class="muted" style="font-size:0.84rem;margin-top:4px;">
                        {item.mimeType || 'application/pdf'} · {formatBytes(item.size ?? item.sizeBytes ?? 0)}
                      </div>
                      {#if item.rejectionReason}
                        <div style="margin-top:6px;color:var(--status-error-ink);">Причина отклонения: {item.rejectionReason}</div>
                      {/if}
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
          </div>
        </section>
      {/if}
    </main>
  {/if}
</div>

<style>
  .trust-complaints-grid {
    grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
    gap: 20px;
    margin-top: 18px;
  }

  .trust-regalia-grid {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr);
    gap: 20px;
  }

  .trust-complaints-grid > *,
  .trust-regalia-grid > * {
    min-width: 0;
  }

  @media (max-width: 760px) {
    .trust-complaints-grid,
    .trust-regalia-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
