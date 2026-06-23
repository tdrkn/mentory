<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { api, ApiError } from '$lib/api';
  import { user, isMentor, isAdmin } from '$lib/stores/auth';
  import { logout } from '$lib/stores/auth';
  import BrandLogo from '$lib/components/BrandLogo.svelte';
  import { getApiUrl } from '$lib/env';
  import { Menu, X, User, LogOut, LayoutDashboard, Calendar, Wallet, MessageCircle, Video, Settings, ClipboardList, ShieldCheck, Bell, CheckCheck } from 'lucide-svelte';

  interface NotificationItem {
    id: string;
    type: string;
    title?: string | null;
    body?: string | null;
    isRead: boolean;
    payloadJson?: Record<string, unknown> | null;
    createdAt: string;
  }

  let mobileMenuOpen = false;
  let notificationsOpen = false;
  let notificationsLoading = false;
  let notificationError = '';
  let notifications: NotificationItem[] = [];
  let unreadCount = 0;
  let lastLoadedUserId = '';
  let avatarImageFailed = false;
  let lastAvatarUrl = '';

  const isActive = (path: string) => $page.url.pathname.startsWith(path);

  const toggleMenu = () => mobileMenuOpen = !mobileMenuOpen;
  const closeMenu = () => {
    mobileMenuOpen = false;
    notificationsOpen = false;
  };

  const resolveAvatarUrl = (value?: string | null) => {
    if (!value) return '';
    if (value.startsWith('http') || value.startsWith('data:') || value.startsWith('blob:')) return value;
    return `${getApiUrl()}${value.startsWith('/') ? value : `/${value}`}`;
  };

  $: currentAvatarUrl = $user?.avatarUrl || '';
  $: if (currentAvatarUrl !== lastAvatarUrl) {
    lastAvatarUrl = currentAvatarUrl;
    avatarImageFailed = false;
  }

  const notificationTarget = (item: NotificationItem) => {
    const payload = item.payloadJson ?? {};
    if (typeof payload.sessionId === 'string') return `/sessions/${payload.sessionId}`;
    if (typeof payload.conversationId === 'string') return '/chat';
    if (typeof payload.payoutId === 'string' || typeof payload.paymentId === 'string') return '/earnings';
    return '/requests';
  };

  const formatNotificationTime = (value: string) =>
    new Date(value).toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });

  const loadNotifications = async () => {
    if (!$user) return;
    notificationsLoading = true;
    notificationError = '';

    try {
      const [list, unread] = await Promise.all([
        api.get<{ notifications: NotificationItem[] }>('/notifications?limit=6'),
        api.get<{ count: number }>('/notifications/unread-count'),
      ]);
      notifications = list.notifications ?? [];
      unreadCount = unread.count ?? 0;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return;
      notificationError = 'Не удалось загрузить уведомления';
    } finally {
      notificationsLoading = false;
    }
  };

  const toggleNotifications = async () => {
    notificationsOpen = !notificationsOpen;
    if (notificationsOpen) {
      await loadNotifications();
    }
  };

  const markNotificationRead = async (item: NotificationItem) => {
    if (item.isRead) return;
    notifications = notifications.map((notification) =>
      notification.id === item.id ? { ...notification, isRead: true } : notification,
    );
    unreadCount = Math.max(0, unreadCount - 1);
    try {
      await api.patch(`/notifications/${item.id}/read`);
    } catch {
      await loadNotifications();
    }
  };

  const markAllNotificationsRead = async () => {
    if (unreadCount === 0) return;
    notifications = notifications.map((notification) => ({ ...notification, isRead: true }));
    unreadCount = 0;
    try {
      await api.patch('/notifications/read-all');
    } catch {
      await loadNotifications();
    }
  };

  const openNotification = async (item: NotificationItem) => {
    const target = notificationTarget(item);
    await markNotificationRead(item);
    notificationsOpen = false;
    mobileMenuOpen = false;
    await goto(target);
  };

  onMount(() => {
    const handleClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      if (!event.target.closest('.notifications-menu, .mobile-notifications')) {
        notificationsOpen = false;
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  });

  $: if ($user?.id && $user.id !== lastLoadedUserId) {
    lastLoadedUserId = $user.id;
    loadNotifications();
  } else if (!$user && lastLoadedUserId) {
    lastLoadedUserId = '';
    notifications = [];
    unreadCount = 0;
    notificationError = '';
    notificationsOpen = false;
  }
</script>

<header class="header">
  <div class="container header-inner">
    <BrandLogo href="/" height={30} hideTextOnMobile className="logo" />

    <nav class="nav-desktop">
      <a class="nav-link {isActive('/mentors') ? 'active' : ''}" href="/mentors">Найти ментора</a>
      {#if $user}
        <a class="nav-link {isActive('/subscriptions') ? 'active' : ''}" href="/subscriptions">
          Мои подписки
        </a>
        <a class="nav-link {isActive('/sessions') ? 'active' : ''}" href="/sessions">
          <Video size={16} /> Сессии
        </a>
        <a class="nav-link {isActive('/requests') ? 'active' : ''}" href="/requests">
          <ClipboardList size={16} /> Заявки
        </a>
        <a class="nav-link {isActive('/trust') ? 'active' : ''}" href="/trust">
          <ShieldCheck size={16} /> Помощь
        </a>
        <a class="nav-link {isActive('/chat') ? 'active' : ''}" href="/chat">
          <MessageCircle size={16} /> Чат
        </a>
        {#if $isMentor}
          <a class="nav-link {isActive('/dashboard') ? 'active' : ''}" href="/dashboard">
            <LayoutDashboard size={16} /> Дашборд
          </a>
        {/if}
      {/if}
    </nav>

    <div class="nav-actions">
      {#if $user}
        {#if $isMentor}
          <a class="nav-link-icon {isActive('/schedule') ? 'active' : ''}" href="/schedule" title="Расписание">
            <Calendar size={20} />
          </a>
        {/if}
        {#if !$isAdmin}
          <a class="nav-link-icon {isActive('/earnings') ? 'active' : ''}" href="/earnings" title="Финансы">
            <Wallet size={20} />
          </a>
        {/if}

        <div class="notifications-menu">
          <button
            class="nav-link-icon notification-trigger {notificationsOpen ? 'active' : ''}"
            type="button"
            title="Уведомления"
            aria-label="Уведомления"
            aria-expanded={notificationsOpen}
            on:click|stopPropagation={toggleNotifications}
          >
            <Bell size={20} />
            {#if unreadCount > 0}
              <span class="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
            {/if}
          </button>

          {#if notificationsOpen}
            <div class="notifications-dropdown">
              <div class="notifications-head">
                <div>
                  <strong>Уведомления</strong>
                  <span class="muted">{unreadCount > 0 ? `${unreadCount} новых` : 'Новых нет'}</span>
                </div>
                <button class="mark-read-btn" type="button" on:click={markAllNotificationsRead} disabled={unreadCount === 0}>
                  <CheckCheck size={16} /> Прочитано
                </button>
              </div>

              {#if notificationsLoading}
                <div class="notifications-state">Загрузка...</div>
              {:else if notificationError}
                <div class="notifications-state error">{notificationError}</div>
              {:else if notifications.length === 0}
                <div class="notifications-state">Пока нет уведомлений</div>
              {:else}
                <div class="notifications-list">
                  {#each notifications as item}
                    <a
                      class="notification-item {item.isRead ? 'read' : 'unread'}"
                      href={notificationTarget(item)}
                      on:click|preventDefault={() => openNotification(item)}
                    >
                      <span class="notification-dot"></span>
                      <span class="notification-copy">
                        <strong>{item.title || 'Уведомление'}</strong>
                        {#if item.body}
                          <span>{item.body}</span>
                        {/if}
                        <small>{formatNotificationTime(item.createdAt)}</small>
                      </span>
                    </a>
                  {/each}
                </div>
              {/if}
            </div>
          {/if}
        </div>

        <div class="user-menu">
          <button class="user-avatar" aria-label="Меню пользователя">
            {#if currentAvatarUrl && !avatarImageFailed}
              <img
                src={resolveAvatarUrl(currentAvatarUrl)}
                alt={$user.fullName || 'Пользователь'}
                on:error={() => (avatarImageFailed = true)}
              />
            {:else}
              <span class="avatar-fallback">{$user.fullName?.slice(0, 1) || 'П'}</span>
            {/if}
          </button>
          <div class="user-dropdown">
            <div class="user-dropdown-header">
              <span class="user-name">{$user.fullName || 'Пользователь'}</span>
              <span class="user-email muted">{$user.email}</span>
            </div>
            <div class="user-dropdown-divider"></div>
            <a class="user-dropdown-item" href="/profile/edit">
              <Settings size={16} /> Настройки профиля
            </a>
            <a class="user-dropdown-item" href="/trust">
              <ShieldCheck size={16} /> Помощь и безопасность
            </a>
            {#if $isAdmin}
              <a class="user-dropdown-item" href="/admin">
                <LayoutDashboard size={16} /> Админ-панель
              </a>
            {/if}
            <div class="user-dropdown-divider"></div>
            <button class="user-dropdown-item logout" on:click={() => logout()}>
              <LogOut size={16} /> Выйти
            </button>
          </div>
        </div>
      {:else}
        <a class="btn btn-ghost btn-sm" href="/login">Войти</a>
        <a class="btn btn-primary btn-sm" href="/register">Зарегистрироваться</a>
      {/if}

      <button class="mobile-menu-toggle" on:click={toggleMenu} aria-label="Меню">
        {#if mobileMenuOpen}
          <X size={24} />
        {:else}
          <Menu size={24} />
        {/if}
      </button>
    </div>
  </div>

  <!-- Mobile menu -->
  {#if mobileMenuOpen}
    <div class="mobile-menu">
      <nav class="mobile-nav">
        <a class="mobile-nav-link {isActive('/mentors') ? 'active' : ''}" href="/mentors" on:click={closeMenu}>
          Найти ментора
        </a>
        {#if $user}
          <a class="mobile-nav-link {isActive('/subscriptions') ? 'active' : ''}" href="/subscriptions" on:click={closeMenu}>
            Мои подписки
          </a>
          <a class="mobile-nav-link {isActive('/sessions') ? 'active' : ''}" href="/sessions" on:click={closeMenu}>
            <Video size={18} /> Сессии
          </a>
          <a class="mobile-nav-link {isActive('/requests') ? 'active' : ''}" href="/requests" on:click={closeMenu}>
            <ClipboardList size={18} /> Заявки
          </a>
          <a class="mobile-nav-link {isActive('/trust') ? 'active' : ''}" href="/trust" on:click={closeMenu}>
            <ShieldCheck size={18} /> Помощь
          </a>
          <a class="mobile-nav-link {isActive('/chat') ? 'active' : ''}" href="/chat" on:click={closeMenu}>
            <MessageCircle size={18} /> Чат
          </a>
          <button class="mobile-nav-link" type="button" on:click|stopPropagation={toggleNotifications}>
            <Bell size={18} /> Уведомления
            {#if unreadCount > 0}
              <span class="mobile-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
            {/if}
          </button>
          {#if notificationsOpen}
            <div class="mobile-notifications">
              {#if notificationsLoading}
                <div class="notifications-state">Загрузка...</div>
              {:else if notificationError}
                <div class="notifications-state error">{notificationError}</div>
              {:else if notifications.length === 0}
                <div class="notifications-state">Пока нет уведомлений</div>
              {:else}
                {#each notifications.slice(0, 4) as item}
                  <a
                    class="notification-item {item.isRead ? 'read' : 'unread'}"
                    href={notificationTarget(item)}
                    on:click|preventDefault={() => openNotification(item)}
                  >
                    <span class="notification-dot"></span>
                    <span class="notification-copy">
                      <strong>{item.title || 'Уведомление'}</strong>
                      {#if item.body}
                        <span>{item.body}</span>
                      {/if}
                      <small>{formatNotificationTime(item.createdAt)}</small>
                    </span>
                  </a>
                {/each}
              {/if}
            </div>
          {/if}
          {#if !$isAdmin}
            <a class="mobile-nav-link {isActive('/earnings') ? 'active' : ''}" href="/earnings" on:click={closeMenu}>
              <Wallet size={18} /> Финансы
            </a>
          {/if}
          {#if $isMentor}
            <div class="mobile-nav-divider"></div>
            <span class="mobile-nav-label">Ментору</span>
            <a class="mobile-nav-link {isActive('/dashboard') ? 'active' : ''}" href="/dashboard" on:click={closeMenu}>
              <LayoutDashboard size={18} /> Дашборд
            </a>
            <a class="mobile-nav-link {isActive('/schedule') ? 'active' : ''}" href="/schedule" on:click={closeMenu}>
              <Calendar size={18} /> Расписание
            </a>
          {/if}
          <div class="mobile-nav-divider"></div>
          <a class="mobile-nav-link" href="/profile/edit" on:click={closeMenu}>
            <Settings size={18} /> Настройки
          </a>
          <a class="mobile-nav-link" href="/trust" on:click={closeMenu}>
            <ShieldCheck size={18} /> Помощь и безопасность
          </a>
          {#if $isAdmin}
            <a class="mobile-nav-link" href="/admin" on:click={closeMenu}>
              Админ-панель
            </a>
          {/if}
          <button class="mobile-nav-link logout" on:click={() => { logout(); closeMenu(); }}>
            <LogOut size={18} /> Выйти
          </button>
        {:else}
          <div class="mobile-nav-divider"></div>
          <a class="btn btn-outline" style="width:100%;" href="/login" on:click={closeMenu}>Войти</a>
          <a class="btn btn-primary" style="width:100%;" href="/register" on:click={closeMenu}>Зарегистрироваться</a>
        {/if}
      </nav>
    </div>
  {/if}
</header>

<style>
  .header {
    position: sticky;
    top: 0;
    z-index: 100;
    background: color-mix(in srgb, var(--surface) 92%, transparent);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--border);
  }

  .header-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 24px;
    gap: 24px;
  }

  .nav-desktop {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .nav-link {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    white-space: nowrap;
    border-radius: var(--radius-md);
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--ink-secondary);
    text-decoration: none;
    transition: all 0.2s ease;
  }

  .nav-link:hover {
    color: var(--ink);
    background: var(--bg-alt);
  }

  .nav-link.active {
    color: var(--accent-link);
    background: var(--accent-muted);
  }

  .nav-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .nav-link-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: var(--radius-md);
    color: var(--ink-secondary);
    transition: all 0.2s ease;
  }

  .nav-link-icon:hover {
    color: var(--ink);
    background: var(--bg-alt);
  }

  .nav-link-icon.active {
    color: var(--accent-link);
    background: var(--accent-muted);
  }

  .user-menu {
    position: relative;
  }

  .notifications-menu {
    position: relative;
  }

  .notification-trigger {
    position: relative;
    border: none;
    background: transparent;
    cursor: pointer;
  }

  .notification-badge,
  .mobile-badge {
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    border-radius: 999px;
    background: var(--status-error-bg);
    color: var(--status-error-ink);
    border: 1px solid var(--status-error-border);
    font-size: 0.7rem;
    font-weight: 700;
    line-height: 16px;
    text-align: center;
  }

  .notification-badge {
    position: absolute;
    top: -4px;
    right: -5px;
  }

  .mobile-badge {
    margin-left: auto;
  }

  .notifications-dropdown {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    width: min(360px, calc(100vw - 32px));
    max-height: min(520px, calc(100vh - 96px));
    overflow: auto;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-xl);
  }

  .notifications-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 14px 16px;
    border-bottom: 1px solid var(--border);
  }

  .notifications-head > div {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .mark-read-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--ink-secondary);
    border-radius: var(--radius-md);
    padding: 6px 8px;
    font-size: 0.78rem;
    cursor: pointer;
  }

  .mark-read-btn:hover:not(:disabled) {
    background: var(--bg-alt);
    color: var(--ink);
  }

  .mark-read-btn:disabled {
    opacity: 0.5;
    cursor: default;
  }

  .notifications-list {
    display: flex;
    flex-direction: column;
  }

  .notification-item {
    display: grid;
    grid-template-columns: 8px minmax(0, 1fr);
    gap: 10px;
    padding: 12px 16px;
    color: var(--ink);
    text-decoration: none;
    border-bottom: 1px solid var(--border);
  }

  .notification-item:last-child {
    border-bottom: 0;
  }

  .notification-item:hover {
    background: var(--bg-alt);
  }

  .notification-item.read {
    color: var(--ink-secondary);
  }

  .notification-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    margin-top: 7px;
    background: transparent;
  }

  .notification-item.unread .notification-dot {
    background: var(--accent);
  }

  .notification-copy {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
    font-size: 0.86rem;
    line-height: 1.35;
  }

  .notification-copy strong,
  .notification-copy span {
    overflow-wrap: anywhere;
  }

  .notification-copy small {
    color: var(--muted);
    font-size: 0.74rem;
  }

  .notifications-state {
    padding: 20px 16px;
    color: var(--ink-secondary);
    font-size: 0.9rem;
  }

  .notifications-state.error {
    color: var(--status-error-ink);
  }

  .mobile-notifications {
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    overflow: hidden;
    margin: 2px 0 8px;
    background: var(--bg-alt);
  }

  .user-avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: var(--accent-muted);
    color: var(--accent-link);
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    overflow: hidden;
  }

  .user-avatar:hover {
    background: var(--accent);
    color: var(--on-accent);
  }

  .user-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .avatar-fallback {
    font-size: 0.9rem;
    font-weight: 800;
    line-height: 1;
    text-transform: uppercase;
  }

  .user-dropdown {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    min-width: 220px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-xl);
    opacity: 0;
    visibility: hidden;
    transform: translateY(-8px);
    transition: all 0.2s ease;
  }

  .user-menu:hover .user-dropdown,
  .user-menu:focus-within .user-dropdown {
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
  }

  .user-dropdown-header {
    padding: 12px 16px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .user-name {
    font-weight: 600;
    font-size: 0.95rem;
  }

  .user-email {
    font-size: 0.8rem;
  }

  .user-dropdown-divider {
    height: 1px;
    background: var(--border);
    margin: 4px 0;
  }

  .user-dropdown-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 16px;
    font-size: 0.9rem;
    color: var(--ink-secondary);
    text-decoration: none;
    background: none;
    border: none;
    width: 100%;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .user-dropdown-item:hover {
    background: var(--bg-alt);
    color: var(--ink);
  }

  .user-dropdown-item.logout {
    color: var(--status-error-ink);
  }

  .user-dropdown-item.logout:hover {
    background: var(--status-error-bg);
  }

  .mobile-menu-toggle {
    display: none;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    background: none;
    border: none;
    color: var(--ink);
    cursor: pointer;
  }

  .mobile-menu {
    display: none;
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    box-shadow: var(--shadow-lg);
    padding: 16px;
  }

  .mobile-nav {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .mobile-nav-link {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-radius: var(--radius-md);
    font-size: 1rem;
    font-weight: 500;
    color: var(--ink-secondary);
    text-decoration: none;
    background: none;
    border: none;
    width: 100%;
    text-align: left;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .mobile-nav-link:hover,
  .mobile-nav-link.active {
    background: var(--bg-alt);
    color: var(--ink);
  }

  .mobile-nav-link.logout {
    color: var(--status-error-ink);
  }

  .mobile-nav-divider {
    height: 1px;
    background: var(--border);
    margin: 8px 0;
  }

  .mobile-nav-label {
    padding: 8px 16px 4px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--muted);
  }

  @media (max-width: 1180px) {
    .nav-desktop {
      display: none;
    }

    .nav-link-icon {
      display: none;
    }

    .notifications-menu {
      display: none;
    }

    .nav-actions > .btn {
      display: none;
    }

    .user-menu {
      display: none;
    }

    .mobile-menu-toggle {
      display: flex;
    }

    .mobile-menu {
      display: block;
    }

    .header-inner {
      padding: 10px 12px;
      gap: 12px;
    }
  }
</style>
