<script lang="ts">
  import AppHeader from '$lib/components/AppHeader.svelte';
  import Loading from '$lib/components/Loading.svelte';
  import { api } from '$lib/api';
  import { isAuthenticated, isLoading as authLoading, isAdmin, user } from '$lib/stores/auth';
  import { goto } from '$app/navigation';
  import {
    ShieldCheck,
    AlertTriangle,
    BadgeCheck,
    MessageSquareWarning,
    Database,
    RefreshCw,
    ChevronRight,
    Coins,
  } from 'lucide-svelte';

  interface Complaint {
    id: string;
    category: string;
    description: string;
    status: string;
    createdAt: string;
    author?: { id: string; fullName: string } | null;
  }

  interface Regalia {
    id: string;
    fileName: string;
    status: string;
    createdAt: string;
    mentor?: { id: string; fullName: string } | null;
  }

  interface PlatformBalance {
    totalFees: number;
    totalWithdrawn: number;
    available: number;
    currency: string;
  }

  type RequiredAction =
    | { kind: 'complaint'; id: string; label: string; createdAt: string }
    | { kind: 'regalia'; id: string; label: string; createdAt: string };

  let isPageLoading = true;
  let didLoad = false;

  let newComplaints: Complaint[] = [];
  let pendingRegalia: Regalia[] = [];
  let balance: PlatformBalance | null = null;

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
      const [complaints, regalia, bal] = await Promise.all([
        api.get<Complaint[]>('/admin/trust/complaints?status=new'),
        api.get<Regalia[]>('/admin/trust/regalia?status=pending'),
        api.get<PlatformBalance>('/admin/trust/platform/balance'),
      ]);
      newComplaints = Array.isArray(complaints) ? complaints : [];
      pendingRegalia = Array.isArray(regalia) ? regalia : [];
      balance = bal;
    } catch {
      // partial failure is okay, show what we have
    } finally {
      isPageLoading = false;
    }
  };

  $: requiredActions = [
    ...newComplaints.slice(0, 10).map(
      (c): RequiredAction => ({
        kind: 'complaint',
        id: c.id,
        label: `Жалоба от ${c.author?.fullName || 'пользователя'}: ${c.description.slice(0, 60)}${c.description.length > 60 ? '…' : ''}`,
        createdAt: c.createdAt,
      })
    ),
    ...pendingRegalia.slice(0, 10).map(
      (r): RequiredAction => ({
        kind: 'regalia',
        id: r.id,
        label: `Регалия ментора ${r.mentor?.fullName || 'неизвестен'}: ${r.fileName}`,
        createdAt: r.createdAt,
      })
    ),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  const categoryLabel: Record<string, string> = {
    platform_issue: 'Проблема платформы',
    user_behavior: 'Поведение пользователя',
    session_issue: 'Проблема сессии',
    payment_issue: 'Проблема оплаты',
    content_violation: 'Нарушение контента',
    other: 'Другое',
  };
</script>

<div class="page">
  <AppHeader />

  {#if $authLoading || isPageLoading}
    <Loading />
  {:else}
    <main class="shell">
      <!-- Page header -->
      <div class="page-head">
        <div>
          <div class="page-eyebrow">
            <ShieldCheck size={16} />
            <span>Панель администратора</span>
          </div>
          <h1 class="page-title">Обзор системы</h1>
          <p class="page-sub">Добро пожаловать, {$user?.fullName || 'администратор'}</p>
        </div>
        <button class="btn btn-outline refresh-btn" on:click={loadDashboard}>
          <RefreshCw size={15} />
          Обновить
        </button>
      </div>

      <!-- KPI Cards -->
      <div class="kpi-grid">
        <div class="kpi-card kpi-warning">
          <div class="kpi-icon"><AlertTriangle size={22} /></div>
          <div class="kpi-value">{newComplaints.length}</div>
          <div class="kpi-label">Новых жалоб</div>
          <a class="kpi-link" href="/admin/trust#support">Перейти →</a>
        </div>
        <div class="kpi-card kpi-info">
          <div class="kpi-icon"><BadgeCheck size={22} /></div>
          <div class="kpi-value">{pendingRegalia.length}</div>
          <div class="kpi-label">На верификации</div>
          <a class="kpi-link" href="/admin/trust#verification">Перейти →</a>
        </div>
        <div class="kpi-card kpi-accent">
          <div class="kpi-icon"><Coins size={22} /></div>
          <div class="kpi-value">{balance ? balance.available.toLocaleString('ru-RU') : '—'}</div>
          <div class="kpi-label">Доступно к выводу, ₽</div>
          <a class="kpi-link" href="/admin/trust#finances">Перейти →</a>
        </div>
      </div>

      <!-- Required actions + Sub-section navigation -->
      <div class="content-grid">

        <!-- Required actions -->
        <section class="panel">
          <div class="panel-head">
            <h2>Требуемые действия</h2>
            <span class="count-badge">{requiredActions.length}</span>
          </div>

          {#if requiredActions.length === 0}
            <div class="empty-state">
              <ShieldCheck size={32} style="color:var(--accent);opacity:0.5;" />
              <p>Нет требуемых действий. Всё в порядке!</p>
            </div>
          {:else}
            <div class="action-list">
              {#each requiredActions as action}
                <a
                  class="action-item action-{action.kind}"
                  href="/admin/trust#{action.kind === 'complaint' ? 'support' : 'verification'}"
                >
                  <div class="action-icon">
                    {#if action.kind === 'complaint'}
                      <MessageSquareWarning size={16} />
                    {:else}
                      <BadgeCheck size={16} />
                    {/if}
                  </div>
                  <div class="action-body">
                    <span class="action-label">{action.label}</span>
                    <span class="action-time">{formatDate(action.createdAt)}</span>
                  </div>
                  <ChevronRight size={14} class="action-arrow" />
                </a>
              {/each}
            </div>
          {/if}
        </section>

        <!-- Sub-section navigation -->
        <aside class="nav-panel">
          <h2 class="nav-title">Разделы</h2>

          <a class="nav-item" href="/admin/trust#verification">
            <div class="nav-icon nav-blue">
              <BadgeCheck size={20} />
            </div>
            <div class="nav-body">
              <span class="nav-name">Верификация</span>
              <span class="nav-desc">Регалии и документы менторов</span>
            </div>
            <span class="nav-badge {pendingRegalia.length > 0 ? 'nav-badge-warn' : ''}">
              {pendingRegalia.length}
            </span>
          </a>

          <a class="nav-item" href="/admin/trust#support">
            <div class="nav-icon nav-orange">
              <MessageSquareWarning size={20} />
            </div>
            <div class="nav-body">
              <span class="nav-name">Поддержка</span>
              <span class="nav-desc">Жалобы, переписка, блокировки</span>
            </div>
            <span class="nav-badge {newComplaints.length > 0 ? 'nav-badge-warn' : ''}">
              {newComplaints.length}
            </span>
          </a>

          <a class="nav-item" href="/admin/trust#database">
            <div class="nav-icon nav-purple">
              <Database size={20} />
            </div>
            <div class="nav-body">
              <span class="nav-name">База данных</span>
              <span class="nav-desc">Аудит, модерация, баланс</span>
            </div>
            <ChevronRight size={14} style="color:var(--muted);" />
          </a>

          <div class="nav-divider"></div>

          <a class="nav-item nav-external" href="http://localhost:4000/admin" target="_blank" rel="noreferrer">
            <div class="nav-icon nav-gray">
              <Database size={20} />
            </div>
            <div class="nav-body">
              <span class="nav-name">AdminJS</span>
              <span class="nav-desc">Полный доступ к данным</span>
            </div>
            <ChevronRight size={14} style="color:var(--muted);" />
          </a>
        </aside>
      </div>
    </main>
  {/if}
</div>

<style>
  .shell {
    max-width: 1100px;
    margin: 0 auto;
    padding: 40px 20px 100px;
  }

  /* Page header */
  .page-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    flex-wrap: wrap;
    margin-bottom: 28px;
  }

  .page-eyebrow {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.78rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--accent);
    margin-bottom: 6px;
  }

  .page-title {
    font-size: 1.75rem;
    font-weight: 800;
    color: var(--ink);
    margin: 0 0 4px;
  }

  .page-sub {
    font-size: 0.9rem;
    color: var(--muted);
    margin: 0;
  }

  .refresh-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  /* KPI cards */
  .kpi-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    margin-bottom: 24px;
  }

  .kpi-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 22px 20px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    position: relative;
    overflow: hidden;
  }

  .kpi-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
  }

  .kpi-warning::before { background: var(--status-warning-ink, #d97706); }
  .kpi-info::before { background: #3b82f6; }
  .kpi-accent::before { background: var(--accent); }

  .kpi-icon {
    color: var(--muted);
    margin-bottom: 4px;
  }

  .kpi-warning .kpi-icon { color: var(--status-warning-ink, #d97706); }
  .kpi-info .kpi-icon { color: #3b82f6; }
  .kpi-accent .kpi-icon { color: var(--accent); }

  .kpi-value {
    font-size: 2rem;
    font-weight: 800;
    color: var(--ink);
    line-height: 1;
  }

  .kpi-label {
    font-size: 0.85rem;
    color: var(--muted);
  }

  .kpi-link {
    font-size: 0.78rem;
    color: var(--accent);
    text-decoration: none;
    font-weight: 600;
    margin-top: 8px;
  }

  .kpi-link:hover { text-decoration: underline; }

  /* Content grid */
  .content-grid {
    display: grid;
    grid-template-columns: 1fr 300px;
    gap: 20px;
    align-items: start;
  }

  /* Panel */
  .panel {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 22px 24px;
  }

  .panel-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 16px;
  }

  .panel-head h2 {
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--ink);
    margin: 0;
  }

  .count-badge {
    background: var(--bg-alt);
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 2px 10px;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--muted);
  }

  /* Empty state */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 32px 16px;
    color: var(--muted);
    font-size: 0.9rem;
    text-align: center;
  }

  .empty-state p { margin: 0; }

  /* Action list */
  .action-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .action-item {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 10px 12px;
    border-radius: var(--radius-md);
    background: var(--bg-alt);
    text-decoration: none;
    transition: background 0.15s ease;
    border: 1px solid transparent;
  }

  .action-item:hover {
    background: var(--accent-muted);
    border-color: var(--accent);
  }

  .action-icon {
    flex-shrink: 0;
    width: 28px;
    height: 28px;
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: 2px;
  }

  .action-complaint .action-icon {
    background: var(--status-warning-bg, #fef3c7);
    color: var(--status-warning-ink, #d97706);
  }

  .action-regalia .action-icon {
    background: #dbeafe;
    color: #3b82f6;
  }

  .action-body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .action-label {
    font-size: 0.85rem;
    color: var(--ink);
    line-height: 1.4;
    word-break: break-word;
  }

  .action-time {
    font-size: 0.75rem;
    color: var(--muted);
  }

  .action-arrow {
    flex-shrink: 0;
    color: var(--muted);
    margin-top: 6px;
  }

  /* Nav panel */
  .nav-panel {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    position: sticky;
    top: 24px;
  }

  .nav-title {
    font-size: 0.78rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted);
    margin: 0 0 8px;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    border-radius: var(--radius-md);
    text-decoration: none;
    transition: background 0.15s ease;
    border: 1px solid transparent;
  }

  .nav-item:hover {
    background: var(--bg-alt);
    border-color: var(--border);
  }

  .nav-icon {
    width: 36px;
    height: 36px;
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .nav-blue { background: #dbeafe; color: #3b82f6; }
  .nav-orange { background: var(--status-warning-bg, #fef3c7); color: var(--status-warning-ink, #d97706); }
  .nav-purple { background: #ede9fe; color: #7c3aed; }
  .nav-gray { background: var(--bg-alt); color: var(--muted); }

  .nav-body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .nav-name {
    font-size: 0.88rem;
    font-weight: 600;
    color: var(--ink);
  }

  .nav-desc {
    font-size: 0.76rem;
    color: var(--muted);
  }

  .nav-badge {
    background: var(--bg-alt);
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 2px 8px;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--muted);
    flex-shrink: 0;
  }

  .nav-badge-warn {
    background: var(--status-warning-bg, #fef3c7);
    border-color: var(--status-warning-ink, #d97706);
    color: var(--status-warning-ink, #d97706);
  }

  .nav-divider {
    height: 1px;
    background: var(--border);
    margin: 4px 0;
  }

  .nav-external .nav-name { color: var(--muted); }

  /* Responsive */
  @media (max-width: 800px) {
    .kpi-grid {
      grid-template-columns: 1fr 1fr;
    }

    .content-grid {
      grid-template-columns: 1fr;
    }

    .nav-panel {
      position: static;
    }
  }

  @media (max-width: 480px) {
    .shell {
      padding: 24px 16px 80px;
    }

    .kpi-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
