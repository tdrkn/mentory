<script lang="ts">
  import AppHeader from '$lib/components/AppHeader.svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { resetPassword } from '$lib/stores/auth';
  import { resetPasswordSchema } from '$lib/validators/auth';

  let newPassword = '';
  let confirmPassword = '';
  let submitting = false;
  let success: string | null = null;
  let error: string | null = null;

  $: token = $page.url.searchParams.get('token') || '';

  const handleSubmit = async () => {
    error = null;
    success = null;

    const validation = resetPasswordSchema.safeParse({
      token,
      newPassword,
      confirmPassword,
    });

    if (!validation.success) {
      error = validation.error.issues[0]?.message || 'Проверьте форму';
      return;
    }

    submitting = true;
    try {
      await resetPassword(token, newPassword);
      success = 'Пароль обновлён. Теперь можно войти в аккаунт.';
      setTimeout(() => goto('/login'), 1000);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Не удалось обновить пароль';
    } finally {
      submitting = false;
    }
  };
</script>

<div class="page">
  <AppHeader />

  <main class="auth-container">
    <div class="auth-card reveal">
      <h1 class="auth-title">Новый пароль</h1>
      <p class="auth-subtitle">Укажите новый пароль для вашего аккаунта.</p>

      {#if !token}
        <div class="alert alert-error">
          Токен восстановления не найден. Запросите новую ссылку.
        </div>
      {:else}
        {#if error}
          <div class="alert alert-error">{error}</div>
        {/if}

        {#if success}
          <div class="alert" style="background:var(--status-success-bg);border-color:var(--status-success-border);color:var(--status-success-ink);">
            {success}
          </div>
        {/if}

        <form class="auth-form" on:submit|preventDefault={handleSubmit}>
          <label for="newPassword" class="label">Новый пароль</label>
          <input
            id="newPassword"
            class="input"
            type="password"
            bind:value={newPassword}
            placeholder="Минимум 8 символов и спецсимвол"
            autocomplete="new-password"
          />

          <label for="confirmPassword" class="label">Повторите пароль</label>
          <input
            id="confirmPassword"
            class="input"
            type="password"
            bind:value={confirmPassword}
            placeholder="Повторите пароль"
            autocomplete="new-password"
          />

          <button class="btn btn-primary btn-lg auth-submit" type="submit" disabled={submitting}>
            {submitting ? 'Сохранение...' : 'Сохранить пароль'}
          </button>
        </form>
      {/if}

      <a class="back-link" href="/login">Вернуться ко входу</a>
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
  }

  .auth-title {
    font-size: 1.5rem;
    margin-bottom: 8px;
    text-align: center;
  }

  .auth-subtitle {
    color: var(--muted);
    margin-bottom: 24px;
    line-height: 1.5;
    text-align: center;
  }

  .auth-form {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .auth-submit {
    width: 100%;
    justify-content: center;
    margin-top: 10px;
  }

  .back-link {
    display: block;
    margin-top: 16px;
    text-align: center;
    color: var(--accent);
    font-weight: 500;
  }

  .back-link:hover {
    text-decoration: underline;
  }

  @media (max-width: 480px) {
    .auth-card {
      padding: 28px 20px;
    }
  }
</style>
