<script lang="ts">
  import AppHeader from '$lib/components/AppHeader.svelte';
  import { onMount } from 'svelte';
  import { login, error, isAuthenticated, isLoading } from '$lib/stores/auth';
  import { goto } from '$app/navigation';

  let email = '';
  let password = '';
  let submitting = false;

  onMount(() => {
    if ($isAuthenticated && !$isLoading) {
      goto('/mentors');
    }
  });

  const handleSubmit = async () => {
    submitting = true;
    try {
      const user = await login(email, password);
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

  <main class="container section" style="max-width:520px;">
    <div class="card">
      <h1 class="section-title">Войти в аккаунт</h1>
      <p class="muted">Используйте почту и пароль.</p>

      {#if $error}
        <div class="surface" style="margin-top:12px;background:#fee2e2;border-color:#fecaca;color:#991b1b;">
          {$error}
        </div>
      {/if}

      <form class="stack" style="margin-top:18px;" on:submit|preventDefault={handleSubmit}>
        <label>
          <div class="muted" style="font-size:0.9rem;margin-bottom:6px;">Email</div>
          <input class="input" type="email" bind:value={email} placeholder="you@example.com" />
        </label>
        <label>
          <div class="muted" style="font-size:0.9rem;margin-bottom:6px;">Пароль</div>
          <input class="input" type="password" bind:value={password} placeholder="••••••••" />
        </label>
        <button class="btn btn-primary" type="submit" disabled={submitting}>
          {submitting ? 'Вход...' : 'Войти'}
        </button>
      </form>

      <p class="muted" style="margin-top:16px;">
        Нет аккаунта? <a href="/register" style="color:var(--accent);">Зарегистрироваться</a>
      </p>

      <div class="surface" style="margin-top:16px;">
        <strong>Тестовые аккаунты</strong>
        <div class="muted" style="margin-top:6px;">
          mentor@test.com / password123
        </div>
        <div class="muted">mentee@test.com / password123</div>
      </div>
    </div>
  </main>
</div>
