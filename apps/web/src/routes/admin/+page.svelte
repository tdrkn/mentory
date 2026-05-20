<script lang="ts">
  import { api } from '$lib/api';
  import { getApiUrl } from '$lib/env';
  import { isAuthenticated, isLoading as authLoading, isAdmin, logout } from '$lib/stores/auth';
  import { goto } from '$app/navigation';

  interface Complaint {
    id: string;
    description: string;
    createdAt: string;
    author?: { id: string; fullName: string; email: string } | null;
    targetUser?: { id: string; fullName: string; email: string } | null;
  }

  interface Regalia {
    id: string;
    fileName: string;
    fileUrl: string;
    createdAt: string;
    mentor?: { id: string; fullName: string; email: string } | null;
  }

  interface AdminStats {
    mentorCount: number;
    menteeCount: number;
    mentorDelta24h: number;
    menteeDelta24h: number;
  }

  type RequiredActionKind = 'verification' | 'support';

  interface RequiredAction {
    kind: RequiredActionKind;
    idLabel: string;
    actionLabel: string;
    userName: string;
    userRole: 'Ментор' | 'Менти';
    userId?: string;
    chatHref: string;
    fileUrl?: string;
    sourceId: string;
    createdAt: string;
  }

  let isPageLoading = true;
  let didLoad = false;

  let stats: AdminStats | null = null;
  let newComplaints: Complaint[] = [];
  let pendingRegalia: Regalia[] = [];

  const resolveFileUrl = (value?: string | null) => {
    if (!value) return '';
    if (value.startsWith('http') || value.startsWith('data:') || value.startsWith('blob:')) return value;
    return `${getApiUrl()}${value.startsWith('/') ? value : `/${value}`}`;
  };

  $: if (!$authLoading) {
    if (!$isAuthenticated) {
      goto('/admin/login');
    } else if (!$isAdmin) {
      goto('/mentors');
    } else if (!didLoad) {
      didLoad = true;
      loadDashboard();
    }
  }

  const loadDashboard = async () => {
    isPageLoading = true;
    try {
      const [statsResp, complaintsResp, regaliaResp] = await Promise.all([
        api.get<AdminStats>('/admin/trust/stats').catch(() => null),
        api.get<Complaint[]>('/admin/trust/complaints?status=new').catch(() => []),
        api.get<Regalia[]>('/admin/trust/regalia?status=pending').catch(() => []),
      ]);
      stats = statsResp;
      newComplaints = Array.isArray(complaintsResp) ? complaintsResp : [];
      pendingRegalia = Array.isArray(regaliaResp) ? regaliaResp : [];
    } finally {
      isPageLoading = false;
    }
  };

  $: requiredActions = (() => {
    let n = 0;
    const rows: RequiredAction[] = [];
    for (const r of pendingRegalia) {
      n += 1;
      rows.push({
        kind: 'verification',
        idLabel: `id ${n}`,
        actionLabel: 'Требуется верификация',
        userName: r.mentor?.fullName || '—',
        userRole: 'Ментор',
        userId: r.mentor?.id,
        chatHref: r.mentor?.id ? `/chat?mentorId=${r.mentor.id}` : '/chat',
        fileUrl: r.fileUrl,
        sourceId: r.id,
        createdAt: r.createdAt,
      });
    }
    for (const c of newComplaints) {
      n += 1;
      rows.push({
        kind: 'support',
        idLabel: `id ${n}`,
        actionLabel: 'Заявка в поддержку',
        userName: c.author?.fullName || '—',
        userRole: 'Менти',
        userId: c.author?.id,
        chatHref: c.author?.id ? `/chat?userId=${c.author.id}` : '/chat',
        sourceId: c.id,
        createdAt: c.createdAt,
      });
    }
    return rows;
  })();

  const handleLogout = () => {
    logout(false);
    goto('/admin/login');
  };
</script>

<svelte:head>
  <title>Панель администратора — Mentory</title>
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
    <div class="loading-wrap">
      <div class="loading-spinner"></div>
    </div>
  {:else}
    <div class="shell">
      <div class="dashboard-card">
        <!-- Navigation cards -->
        <div class="nav-cards">
          <a class="nav-card" href="/admin/trust#verification">
            {#if pendingRegalia.length > 0}
              <span class="nav-dot" aria-label="Новые задачи"></span>
            {/if}
            <span class="nav-label">Верификация</span>
          </a>
          <a class="nav-card" href="/admin/trust#support">
            {#if newComplaints.length > 0}
              <span class="nav-dot" aria-label="Новые задачи"></span>
            {/if}
            <span class="nav-label">Поддержка</span>
          </a>
          <a class="nav-card" href="/admin/trust#database">
            <span class="nav-label">База данных</span>
          </a>
        </div>

        <!-- Counters -->
        <div class="counter-row">
          <div class="counter">
            {#if stats && stats.mentorDelta24h !== 0}
              <span class="delta {stats.mentorDelta24h >= 0 ? 'delta-up' : 'delta-down'}">
                {stats.mentorDelta24h > 0 ? '+' : ''}{stats.mentorDelta24h} за сутки
              </span>
            {/if}
            <div class="counter-value">{stats?.mentorCount ?? 0}</div>
            <div class="counter-label">менторы</div>
          </div>
          <div class="counter">
            {#if stats && stats.menteeDelta24h !== 0}
              <span class="delta {stats.menteeDelta24h >= 0 ? 'delta-up' : 'delta-down'}">
                {stats.menteeDelta24h > 0 ? '+' : ''}{stats.menteeDelta24h} за сутки
              </span>
            {/if}
            <div class="counter-value">{stats?.menteeCount ?? 0}</div>
            <div class="counter-label">менти</div>
          </div>
        </div>

        <!-- Required actions -->
        <div class="actions-block">
          <div class="actions-title">Требуемые действия:</div>

          {#if requiredActions.length === 0}
            <div class="actions-empty">Нет требуемых действий. Всё в порядке!</div>
          {:else}
            <div class="actions-list">
              {#each requiredActions as action}
                <div class="action-row">
                  <span class="action-id">{action.idLabel}</span>
                  <span class="action-pill">{action.actionLabel}</span>
                  <span class="action-pill action-pill-wide">{action.userName}</span>
                  <span class="action-pill action-pill-role">{action.userRole}</span>

                  {#if action.kind === 'verification'}
                    <a
                      class="icon-btn icon-download"
                      href={resolveFileUrl(action.fileUrl)}
                      target="_blank"
                      rel="noreferrer"
                      title="Скачать файл"
                      aria-label="Скачать файл"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    </a>
                    <a
                      class="icon-btn icon-check"
                      href="/admin/trust#verification"
                      title="Одобрить"
                      aria-label="Одобрить"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    </a>
                    <a
                      class="icon-btn icon-x"
                      href="/admin/trust#verification"
                      title="Отклонить"
                      aria-label="Отклонить"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </a>
                  {:else}
                    <a class="db-btn" href="/admin/trust#database">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
                      БД
                    </a>
                  {/if}

                  <a class="chat-btn" href={action.chatHref}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M2 21l1.65-3.8a9 9 0 1 1 3.4 2.9z"/></svg>
                    Чат
                  </a>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .admin-page {
    min-height: 100vh;
    background: #2a2a30;
    color: #fff;
    display: flex;
    flex-direction: column;
  }

  /* Top bar */
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

  .topbar-actions {
    display: flex;
    gap: 10px;
  }

  .topbar-btn {
    padding: 6px 14px;
    border-radius: 999px;
    background: #f3f4f6;
    color: #111;
    font-size: 0.85rem;
    text-decoration: none;
    border: none;
    cursor: pointer;
    transition: background 0.15s ease;
  }
  .topbar-btn:hover { background: #e5e7eb; }

  /* Loading */
  .loading-wrap {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 80px 0;
  }
  .loading-spinner {
    width: 32px;
    height: 32px;
    border: 3px solid rgba(255, 255, 255, 0.2);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* Shell */
  .shell {
    flex: 1;
    padding: 40px 20px;
    display: flex;
    justify-content: center;
  }

  /* Dashboard panel */
  .dashboard-card {
    width: 100%;
    max-width: 880px;
    background: #36363c;
    border-radius: 14px;
    padding: 32px 36px 40px;
    display: flex;
    flex-direction: column;
    gap: 36px;
  }

  /* Navigation cards */
  .nav-cards {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 18px;
  }

  .nav-card {
    position: relative;
    background: #3a3f5c;
    color: #fff;
    border-radius: 12px;
    padding: 28px 12px;
    text-align: center;
    font-size: 1rem;
    font-weight: 500;
    text-decoration: none;
    min-height: 100px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s ease, transform 0.15s ease;
  }
  .nav-card:hover { background: #444a72; transform: translateY(-1px); }

  .nav-dot {
    position: absolute;
    top: -8px;
    right: 50%;
    transform: translateX(50%);
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #2563eb;
    box-shadow: 0 0 0 3px #36363c;
  }

  .nav-label {
    line-height: 1.2;
  }

  /* Counters */
  .counter-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 32px;
    padding: 16px 30px;
  }

  .counter {
    position: relative;
    text-align: left;
  }

  .delta {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 6px;
    font-size: 0.72rem;
    font-weight: 600;
    margin-bottom: 6px;
  }
  .delta-up {
    background: #064e3b;
    color: #6ee7b7;
  }
  .delta-down {
    background: #7f1d1d;
    color: #fca5a5;
  }

  .counter-value {
    font-size: 4rem;
    font-weight: 700;
    line-height: 1;
    color: #fff;
  }

  .counter-label {
    margin-top: 4px;
    font-size: 0.95rem;
    color: #d4d4d8;
  }

  /* Required actions */
  .actions-block {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .actions-title {
    font-size: 0.95rem;
    font-weight: 600;
    color: #fff;
    margin-bottom: 6px;
  }

  .actions-empty {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    padding: 18px;
    color: #a1a1aa;
    text-align: center;
    font-size: 0.88rem;
  }

  .actions-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .action-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .action-id {
    background: #2563eb;
    color: #fff;
    border-radius: 5px;
    padding: 5px 8px;
    font-size: 0.78rem;
    font-weight: 700;
    min-width: 36px;
    text-align: center;
  }

  .action-pill {
    background: #4a4a52;
    color: #e5e7eb;
    border-radius: 16px;
    padding: 5px 14px;
    font-size: 0.82rem;
    white-space: nowrap;
  }

  .action-pill-wide {
    background: #5a5a64;
  }

  .action-pill-role {
    background: #4a4a52;
  }

  .icon-btn {
    width: 28px;
    height: 28px;
    border-radius: 5px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    color: #fff;
    border: none;
    cursor: pointer;
  }

  .icon-download {
    background: #fff;
    color: #111;
  }
  .icon-download:hover { background: #e5e7eb; }

  .icon-check {
    background: #2563eb;
    color: #fff;
  }
  .icon-check:hover { background: #1d4ed8; }

  .icon-x {
    background: #4a4a52;
    color: #fff;
  }
  .icon-x:hover { background: #5a5a64; }

  .db-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: #1f1f24;
    color: #fff;
    padding: 5px 10px;
    border-radius: 5px;
    font-size: 0.78rem;
    font-weight: 600;
    text-decoration: none;
  }
  .db-btn:hover { background: #2a2a30; }

  .chat-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: #2563eb;
    color: #fff;
    padding: 5px 12px;
    border-radius: 5px;
    font-size: 0.8rem;
    font-weight: 600;
    text-decoration: none;
  }
  .chat-btn:hover { background: #1d4ed8; }

  /* Responsive */
  @media (max-width: 760px) {
    .nav-cards {
      grid-template-columns: 1fr;
    }
    .counter-row {
      grid-template-columns: 1fr;
      padding: 0;
    }
    .counter-value {
      font-size: 3rem;
    }
  }

  @media (max-width: 480px) {
    .dashboard-card {
      padding: 20px;
    }
    .topbar {
      padding: 10px 16px;
      flex-wrap: wrap;
      gap: 8px;
    }
  }
</style>
