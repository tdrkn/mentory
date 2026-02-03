<script lang="ts">
  import { page } from '$app/stores';
  import { user, isMentor, isAdmin } from '$lib/stores/auth';
  import { logout } from '$lib/stores/auth';

  const isActive = (path: string) => $page.url.pathname.startsWith(path);
</script>

<header class="container nav">
  <a class="brand" href="/">Mentory</a>
  <nav class="nav-links">
    <a class={isActive('/mentors') ? 'active' : ''} href="/mentors">Менторы</a>
    {#if $user}
      <a class={isActive('/sessions') ? 'active' : ''} href="/sessions">Сессии</a>
      <a class={isActive('/chat') ? 'active' : ''} href="/chat">Чат</a>
      {#if $isMentor}
        <a class={isActive('/dashboard') ? 'active' : ''} href="/dashboard">Дашборд</a>
        <a class={isActive('/schedule') ? 'active' : ''} href="/schedule">Расписание</a>
        <a class={isActive('/earnings') ? 'active' : ''} href="/earnings">Заработок</a>
      {/if}
      {#if $isAdmin}
        <a href="/admin" target="_blank">Админка</a>
      {/if}
      <a class={isActive('/profile') ? 'active' : ''} href="/profile/edit">Профиль</a>
      <button class="btn btn-ghost" on:click={() => logout()}>Выйти</button>
    {:else}
      <a href="/login">Войти</a>
      <a class="btn btn-primary" href="/register">Начать</a>
    {/if}
  </nav>
</header>
