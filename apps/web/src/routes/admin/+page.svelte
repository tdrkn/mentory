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

  interface DailyMetric {
    date: string;
    mentors: number;
    mentees: number;
    activeUsers: number;
    sessions: number;
    revenueCents: number;
    platformFeeCents: number;
  }

  interface AdminStats {
    mentorCount: number;
    menteeCount: number;
    mentorDelta24h: number;
    menteeDelta24h: number;
    revenueCents: number;
    platformFeeCents: number;
    revenueDelta24h: number;
    platformFeeDelta24h: number;
    sessionCount: number;
    sessionDelta24h: number;
    activeUsers7d: number;
    pendingVerificationCount: number;
    newComplaintCount: number;
    dailyMetrics: DailyMetric[];
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
  let isDemoStats = false;
  let newComplaints: Complaint[] = [];
  let pendingRegalia: Regalia[] = [];

  const demoDailyMetrics = (): DailyMetric[] => {
    const dayMs = 24 * 60 * 60 * 1000;
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const revenue = [420000, 560000, 610000, 730000, 690000, 880000, 940000];
    const activeUsers = [34, 41, 38, 52, 49, 61, 68];
    const mentors = [1, 2, 1, 3, 2, 2, 4];
    const mentees = [9, 13, 11, 16, 14, 18, 21];
    const sessions = [6, 8, 7, 11, 10, 13, 15];

    return Array.from({ length: 7 }, (_, index) => ({
      date: new Date(todayStart - (6 - index) * dayMs).toISOString(),
      mentors: mentors[index],
      mentees: mentees[index],
      activeUsers: activeUsers[index],
      sessions: sessions[index],
      revenueCents: revenue[index],
      platformFeeCents: Math.round(revenue[index] * 0.15),
    }));
  };

  const demoStats = (): AdminStats => ({
    mentorCount: 42,
    menteeCount: 318,
    mentorDelta24h: 4,
    menteeDelta24h: 21,
    revenueCents: 4840000,
    platformFeeCents: 726000,
    revenueDelta24h: 940000,
    platformFeeDelta24h: 141000,
    sessionCount: 176,
    sessionDelta24h: 15,
    activeUsers7d: 68,
    pendingVerificationCount: 7,
    newComplaintCount: 3,
    dailyMetrics: demoDailyMetrics(),
  });

  const hasChartData = (value?: AdminStats | null) =>
    !!value?.dailyMetrics?.some((item) =>
      item.revenueCents > 0 ||
      item.activeUsers > 0 ||
      item.mentors > 0 ||
      item.mentees > 0 ||
      item.sessions > 0
    );

  const shouldUseDemoStats = (value?: AdminStats | null) =>
    !value ||
    (
      !hasChartData(value) &&
      (value.revenueCents ?? 0) === 0 &&
      (value.activeUsers7d ?? 0) === 0 &&
      (value.sessionCount ?? 0) === 0
    );

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
      isDemoStats = shouldUseDemoStats(statsResp);
      stats = isDemoStats ? demoStats() : statsResp;
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

  const formatMoney = (cents = 0) =>
    new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      maximumFractionDigits: 0,
    }).format(cents / 100);

  const formatDate = (value: string) =>
    new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit' }).format(new Date(value));

  $: chartMetrics = stats?.dailyMetrics?.length ? stats.dailyMetrics : demoDailyMetrics();

  const maxMetric = (field: keyof DailyMetric) => {
    const values = chartMetrics.map((item) => Number(item[field]) || 0);
    return Math.max(1, ...values);
  };

  const barHeight = (value: number, max: number) => {
    if (value <= 0) return '2%';
    return `${Math.max(8, Math.round((value / max) * 100))}%`;
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
        <div class="dashboard-head">
          <div>
            <p class="eyebrow">Админ-панель</p>
            <div class="dashboard-title-row">
              <h1>Статистика и графики</h1>
              {#if isDemoStats}
                <span class="demo-badge">демо-данные</span>
              {/if}
            </div>
            <p>Выручка, активность, пользователи и текущие задачи платформы.</p>
          </div>
          <a class="topbar-btn dashboard-link" href="/admin/trust">Модерация и база</a>
        </div>

        <!-- Navigation cards -->
        <div class="nav-cards">
          <a class="nav-card nav-card-active" href="/admin">
            <span class="nav-label">Дашборд</span>
          </a>
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

        <div class="summary-grid">
          <div class="summary-item">
            <div class="summary-label">Выручка</div>
            <div class="summary-value">{formatMoney(stats?.revenueCents ?? 0)}</div>
            <div class="summary-note">+{formatMoney(stats?.revenueDelta24h ?? 0)} за сутки</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Комиссия платформы</div>
            <div class="summary-value">{formatMoney(stats?.platformFeeCents ?? 0)}</div>
            <div class="summary-note">+{formatMoney(stats?.platformFeeDelta24h ?? 0)} за сутки</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Активные входы</div>
            <div class="summary-value">{stats?.activeUsers7d ?? 0}</div>
            <div class="summary-note">за последние 7 дней</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Сессии</div>
            <div class="summary-value">{stats?.sessionCount ?? 0}</div>
            <div class="summary-note">+{stats?.sessionDelta24h ?? 0} за сутки</div>
          </div>
        </div>

        <div class="charts-grid">
          <section class="chart-panel" aria-label="Выручка за 7 дней">
            <div class="chart-head">
              <div>
                <div class="chart-title">Выручка</div>
                <div class="chart-caption">успешные платежи за 7 дней</div>
              </div>
            </div>
            <div class="bar-chart">
              {#each chartMetrics as item}
                <div class="bar-column">
                  <div class="bar-track">
                    <div class="bar-fill revenue-bar" style={`height: ${barHeight(item.revenueCents, maxMetric('revenueCents'))}`}></div>
                  </div>
                  <div class="bar-label">{formatDate(item.date)}</div>
                </div>
              {/each}
            </div>
          </section>

          <section class="chart-panel" aria-label="Активность за 7 дней">
            <div class="chart-head">
              <div>
                <div class="chart-title">Посещения</div>
                <div class="chart-caption">активные входы пользователей</div>
              </div>
            </div>
            <div class="bar-chart">
              {#each chartMetrics as item}
                <div class="bar-column">
                  <div class="bar-track">
                    <div class="bar-fill activity-bar" style={`height: ${barHeight(item.activeUsers, maxMetric('activeUsers'))}`}></div>
                  </div>
                  <div class="bar-label">{formatDate(item.date)}</div>
                </div>
              {/each}
            </div>
          </section>
        </div>

        <div class="charts-grid charts-grid-secondary">
          <section class="chart-panel" aria-label="Новые пользователи за 7 дней">
            <div class="chart-title">Новые пользователи</div>
            <div class="user-bars">
              {#each chartMetrics as item}
                <div class="user-bar-row">
                  <span class="user-date">{formatDate(item.date)}</span>
                  <div class="stack-track">
                    <span
                      class="stack-segment mentors-segment"
                      style={`width: ${Math.round((item.mentors / maxMetric('mentors')) * 100)}%`}
                    ></span>
                    <span
                      class="stack-segment mentees-segment"
                      style={`width: ${Math.round((item.mentees / maxMetric('mentees')) * 100)}%`}
                    ></span>
                  </div>
                  <span class="user-count">{item.mentors + item.mentees}</span>
                </div>
              {/each}
            </div>
            <div class="legend">
              <span><i class="legend-dot mentors-dot"></i>менторы</span>
              <span><i class="legend-dot mentees-dot"></i>менти</span>
            </div>
          </section>

          <section class="chart-panel" aria-label="Операционная очередь">
            <div class="chart-title">Очередь задач</div>
            <div class="task-meters">
              <div class="task-meter">
                <div class="task-meter-head">
                  <span>Верификация</span>
                  <strong>{stats?.pendingVerificationCount ?? pendingRegalia.length}</strong>
                </div>
                <div class="meter-track">
                  <span
                    class="meter-fill verification-fill"
                    style={`width: ${Math.min(100, ((stats?.pendingVerificationCount ?? pendingRegalia.length) / Math.max(1, requiredActions.length)) * 100)}%`}
                  ></span>
                </div>
              </div>
              <div class="task-meter">
                <div class="task-meter-head">
                  <span>Поддержка</span>
                  <strong>{stats?.newComplaintCount ?? newComplaints.length}</strong>
                </div>
                <div class="meter-track">
                  <span
                    class="meter-fill support-fill"
                    style={`width: ${Math.min(100, ((stats?.newComplaintCount ?? newComplaints.length) / Math.max(1, requiredActions.length)) * 100)}%`}
                  ></span>
                </div>
              </div>
            </div>
          </section>
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
    max-width: 1040px;
    background: #36363c;
    border-radius: 14px;
    padding: 32px 36px 40px;
    display: flex;
    flex-direction: column;
    gap: 36px;
  }

  .dashboard-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
  }

  .dashboard-head h1 {
    margin: 0;
    font-size: 1.8rem;
    line-height: 1.15;
  }

  .dashboard-title-row {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    margin: 4px 0 6px;
  }

  .demo-badge {
    display: inline-flex;
    align-items: center;
    min-height: 24px;
    padding: 3px 9px;
    border-radius: 999px;
    background: rgba(245, 158, 11, 0.18);
    color: #fbbf24;
    border: 1px solid rgba(245, 158, 11, 0.34);
    font-size: 0.72rem;
    font-weight: 800;
    text-transform: uppercase;
  }

  .dashboard-head p {
    margin: 0;
    color: #cbd5e1;
    font-size: 0.92rem;
  }

  .eyebrow {
    color: #93c5fd !important;
    font-size: 0.75rem !important;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .dashboard-link {
    flex: 0 0 auto;
    background: #e5e7eb;
  }

  /* Navigation cards */
  .nav-cards {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
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

  .nav-card-active {
    background: #2563eb;
  }

  .nav-card-active:hover {
    background: #1d4ed8;
  }

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

  .summary-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
  }

  .summary-item {
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    padding: 14px;
    min-width: 0;
  }

  .summary-label {
    color: #a1a1aa;
    font-size: 0.78rem;
    line-height: 1.25;
  }

  .summary-value {
    color: #fff;
    font-size: 1.35rem;
    font-weight: 750;
    line-height: 1.15;
    margin-top: 8px;
    overflow-wrap: anywhere;
  }

  .summary-note {
    color: #cbd5e1;
    font-size: 0.78rem;
    margin-top: 4px;
  }

  .charts-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
  }

  .charts-grid-secondary {
    margin-top: -20px;
  }

  .chart-panel {
    background: rgba(20, 20, 24, 0.34);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    padding: 16px;
    min-width: 0;
  }

  .chart-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 14px;
  }

  .chart-title {
    color: #fff;
    font-size: 0.95rem;
    font-weight: 700;
  }

  .chart-caption {
    color: #a1a1aa;
    font-size: 0.78rem;
    margin-top: 2px;
  }

  .bar-chart {
    height: 148px;
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    align-items: end;
    gap: 9px;
  }

  .bar-column {
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
  }

  .bar-track {
    flex: 1;
    display: flex;
    align-items: end;
    justify-content: center;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 7px;
    overflow: hidden;
  }

  .bar-fill {
    width: 100%;
    border-radius: 7px 7px 0 0;
    transition: height 0.2s ease;
  }

  .revenue-bar {
    background: linear-gradient(180deg, #60a5fa 0%, #2563eb 100%);
  }

  .activity-bar {
    background: linear-gradient(180deg, #34d399 0%, #059669 100%);
  }

  .bar-label,
  .user-date,
  .user-count {
    color: #a1a1aa;
    font-size: 0.68rem;
    text-align: center;
    white-space: nowrap;
  }

  .user-bars,
  .task-meters {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 14px;
  }

  .user-bar-row {
    display: grid;
    grid-template-columns: 40px minmax(0, 1fr) 24px;
    align-items: center;
    gap: 10px;
  }

  .stack-track,
  .meter-track {
    height: 9px;
    background: rgba(255, 255, 255, 0.07);
    border-radius: 999px;
    overflow: hidden;
    display: flex;
  }

  .stack-segment,
  .meter-fill {
    min-width: 0;
    height: 100%;
    display: block;
  }

  .mentors-segment {
    background: #60a5fa;
  }

  .mentees-segment {
    background: #34d399;
  }

  .legend {
    display: flex;
    gap: 14px;
    color: #cbd5e1;
    font-size: 0.76rem;
    margin-top: 14px;
  }

  .legend-dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 999px;
    margin-right: 5px;
  }

  .mentors-dot {
    background: #60a5fa;
  }

  .mentees-dot {
    background: #34d399;
  }

  .task-meter-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    color: #e5e7eb;
    font-size: 0.84rem;
    margin-bottom: 7px;
  }

  .task-meter-head strong {
    color: #fff;
    font-size: 1rem;
  }

  .verification-fill {
    background: #60a5fa;
  }

  .support-fill {
    background: #f59e0b;
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
    .dashboard-head {
      flex-direction: column;
    }
    .dashboard-link {
      width: 100%;
      text-align: center;
    }
    .nav-cards {
      grid-template-columns: 1fr;
    }
    .counter-row {
      grid-template-columns: 1fr;
      padding: 0;
    }
    .summary-grid,
    .charts-grid {
      grid-template-columns: 1fr;
    }
    .charts-grid-secondary {
      margin-top: -20px;
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
