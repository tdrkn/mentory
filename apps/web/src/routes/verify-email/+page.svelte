<script lang="ts">
  import AppHeader from '$lib/components/AppHeader.svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { verifyEmail } from '$lib/stores/auth';
  import { onMount } from 'svelte';

  let verifying = true;
  let success = false;
  let message = '';

  onMount(async () => {
    const token = $page.url.searchParams.get('token');

    if (!token) {
      verifying = false;
      success = false;
      message = 'Токен подтверждения не найден.';
      return;
    }

    try {
      const result = await verifyEmail(token);
      success = true;
      message = result.alreadyVerified
        ? 'Email уже подтвержден. Войдите в аккаунт.'
        : 'Email успешно подтверждён. Теперь можно войти.';
      setTimeout(() => goto('/login'), 1200);
    } catch (err) {
      success = false;
      message = err instanceof Error ? err.message : 'Не удалось подтвердить email.';
    } finally {
      verifying = false;
    }
  });
</script>

<div class="page">
  <AppHeader />

  <main class="auth-container">
    <div class="auth-card reveal">
      <h1 class="auth-title">Подтверждение email</h1>

      {#if verifying}
        <p class="auth-subtitle">Проверяем ссылку подтверждения...</p>
      {:else}
        <div class={`alert ${success ? '' : 'alert-error'}`} style={success ? 'background:var(--status-success-bg);border-color:var(--status-success-border);color:var(--status-success-ink);' : ''}>
          {message}
        </div>
      {/if}

      <a class="back-link" href="/login">Перейти ко входу</a>
    </div>
  </main>
</div>

<style>
  .auth-container {
    min-height: calc(100vh - 80px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px 24px;
  }

  .auth-card {
    width: 100%;
    max-width: 460px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-xl);
    padding: 40px;
    box-shadow: var(--shadow-xl);
    text-align: center;
  }

  .auth-title {
    font-size: 1.5rem;
    margin-bottom: 12px;
  }

  .auth-subtitle {
    color: var(--muted);
    margin-bottom: 24px;
  }

  .back-link {
    display: inline-block;
    margin-top: 16px;
    color: var(--accent);
    font-weight: 500;
  }

  .back-link:hover {
    text-decoration: underline;
  }
</style>
