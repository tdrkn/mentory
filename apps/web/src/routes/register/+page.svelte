<script lang="ts">
  import AppHeader from '$lib/components/AppHeader.svelte';
  import { register, error, isAuthenticated, isLoading } from '$lib/stores/auth';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';

  let email = '';
  let password = '';
  let fullName = '';
  let role: 'mentor' | 'mentee' = 'mentee';
  let submitting = false;

  onMount(() => {
    const urlRole = $page.url.searchParams.get('role');
    if (urlRole === 'mentor' || urlRole === 'mentee') {
      role = urlRole;
    }
    if ($isAuthenticated && !$isLoading) {
      goto('/mentors');
    }
  });

  const handleSubmit = async () => {
    submitting = true;
    try {
      const user = await register(email, password, fullName, role);
      if (user.role === 'mentor' || user.role === 'both') {
        goto('/dashboard');
      } else {
        goto('/mentors');
      }
    } finally {
      submitting = false;
    }
  };
</script>

<div class="page">
  <AppHeader />

  <main class="container section" style="max-width:560px;">
    <div class="card">
      <h1 class="section-title">Создать аккаунт</h1>
      <p class="muted">Заполните основные данные.</p>

      {#if $error}
        <div class="surface" style="margin-top:12px;background:#fee2e2;border-color:#fecaca;color:#991b1b;">
          {$error}
        </div>
      {/if}

      <form class="stack" style="margin-top:18px;" on:submit|preventDefault={handleSubmit}>
        <label>
          <div class="muted" style="font-size:0.9rem;margin-bottom:6px;">Имя и фамилия</div>
          <input class="input" bind:value={fullName} placeholder="Иван Иванов" />
        </label>
        <label>
          <div class="muted" style="font-size:0.9rem;margin-bottom:6px;">Email</div>
          <input class="input" type="email" bind:value={email} placeholder="you@example.com" />
        </label>
        <label>
          <div class="muted" style="font-size:0.9rem;margin-bottom:6px;">Пароль</div>
          <input class="input" type="password" bind:value={password} placeholder="Минимум 8 символов" />
        </label>

        <div>
          <div class="muted" style="font-size:0.9rem;margin-bottom:10px;">Я хочу</div>
          <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;">
            <button type="button" class="card" style={`border:2px solid ${role === 'mentee' ? 'var(--accent)' : 'transparent'};`} on:click={() => (role = 'mentee')}>
              <strong>Найти ментора</strong>
              <p class="muted" style="margin-top:6px;">Получить консультацию</p>
            </button>
            <button type="button" class="card" style={`border:2px solid ${role === 'mentor' ? 'var(--accent)' : 'transparent'};`} on:click={() => (role = 'mentor')}>
              <strong>Стать ментором</strong>
              <p class="muted" style="margin-top:6px;">Делиться опытом</p>
            </button>
          </div>
        </div>

        <button class="btn btn-primary" type="submit" disabled={submitting}>
          {submitting ? 'Регистрация...' : 'Зарегистрироваться'}
        </button>
      </form>

      <p class="muted" style="margin-top:16px;">
        Уже есть аккаунт? <a href="/login" style="color:var(--accent);">Войти</a>
      </p>
    </div>
  </main>
</div>
