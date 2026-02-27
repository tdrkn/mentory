<script lang="ts">
  import { page } from '$app/stores';
  import { user, isMentor, isAdmin } from '$lib/stores/auth';
  import { logout } from '$lib/stores/auth';
  import BrandLogo from '$lib/components/BrandLogo.svelte';
  import { Menu, X, User, LogOut, LayoutDashboard, Calendar, Wallet, MessageCircle, Video, Settings } from 'lucide-svelte';

  let mobileMenuOpen = false;

  const isActive = (path: string) => $page.url.pathname.startsWith(path);

  const toggleMenu = () => mobileMenuOpen = !mobileMenuOpen;
  const closeMenu = () => mobileMenuOpen = false;
</script>

<header class="header">
  <div class="container header-inner">
    <BrandLogo href="/" height={30} hideTextOnMobile className="logo" />

    <nav class="nav-desktop">
      <a class="nav-link {isActive('/mentors') ? 'active' : ''}" href="/mentors">Найти ментора</a>
      {#if $user}
        <a class="nav-link {isActive('/sessions') ? 'active' : ''}" href="/sessions">
          <Video size={16} /> Сессии
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
          <a class="nav-link-icon {isActive('/earnings') ? 'active' : ''}" href="/earnings" title="Заработок">
            <Wallet size={20} />
          </a>
        {/if}

        <div class="user-menu">
          <button class="user-avatar" aria-label="Меню пользователя">
            <User size={18} />
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
              <LayoutDashboard size={16} /> Траст-центр
            </a>
            {#if $isAdmin}
              <a class="user-dropdown-item" href="/admin/trust">
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
        <a class="btn btn-primary btn-sm" href="/register">Начать бесплатно</a>
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
          <a class="mobile-nav-link {isActive('/sessions') ? 'active' : ''}" href="/sessions" on:click={closeMenu}>
            <Video size={18} /> Сессии
          </a>
          <a class="mobile-nav-link {isActive('/chat') ? 'active' : ''}" href="/chat" on:click={closeMenu}>
            <MessageCircle size={18} /> Чат
          </a>
          {#if $isMentor}
            <div class="mobile-nav-divider"></div>
            <span class="mobile-nav-label">Ментору</span>
            <a class="mobile-nav-link {isActive('/dashboard') ? 'active' : ''}" href="/dashboard" on:click={closeMenu}>
              <LayoutDashboard size={18} /> Дашборд
            </a>
            <a class="mobile-nav-link {isActive('/schedule') ? 'active' : ''}" href="/schedule" on:click={closeMenu}>
              <Calendar size={18} /> Расписание
            </a>
            <a class="mobile-nav-link {isActive('/earnings') ? 'active' : ''}" href="/earnings" on:click={closeMenu}>
              <Wallet size={18} /> Заработок
            </a>
          {/if}
          <div class="mobile-nav-divider"></div>
          <a class="mobile-nav-link" href="/profile/edit" on:click={closeMenu}>
            <Settings size={18} /> Настройки
          </a>
          <a class="mobile-nav-link" href="/trust" on:click={closeMenu}>
            Траст-центр
          </a>
          {#if $isAdmin}
            <a class="mobile-nav-link" href="/admin/trust" on:click={closeMenu}>
              Админ-панель
            </a>
          {/if}
          <button class="mobile-nav-link logout" on:click={() => { logout(); closeMenu(); }}>
            <LogOut size={18} /> Выйти
          </button>
        {:else}
          <div class="mobile-nav-divider"></div>
          <a class="btn btn-outline" style="width:100%;" href="/login" on:click={closeMenu}>Войти</a>
          <a class="btn btn-primary" style="width:100%;" href="/register" on:click={closeMenu}>Начать бесплатно</a>
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
  }

  .user-avatar:hover {
    background: var(--accent);
    color: var(--on-accent);
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

  @media (max-width: 900px) {
    .nav-desktop {
      display: none;
    }

    .nav-link-icon {
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
      padding: 12px 16px;
    }
  }
</style>
