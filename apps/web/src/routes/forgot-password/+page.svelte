<script lang="ts">
  import AppHeader from '$lib/components/AppHeader.svelte';
  import { forgotPassword } from '$lib/stores/auth';

  let email = '';
  let submitting = false;
  let success: string | null = null;
  let error: string | null = null;

  const handleSubmit = async () => {
    if (!email.trim()) {
      error = 'Введите email';
      return;
    }

    submitting = true;
    success = null;
    error = null;

    try {
      await forgotPassword(email.trim());
      success = 'Если аккаунт с таким email существует, мы отправили письмо с инструкцией.';
    } catch (err) {
      error = err instanceof Error ? err.message : 'Не удалось отправить письмо';
    } finally {
      submitting = false;
    }
  };
</script>

<div class="page">
  <AppHeader />

  <main class="auth-container">
    <div class="auth-card reveal">
      <h1 class="auth-title">Восстановление пароля</h1>
      <p class="auth-subtitle">
        Введите email, привязанный к аккаунту. Мы отправим ссылку для сброса пароля.
      </p>

      {#if error}
        <div class="alert alert-error">{error}</div>
      {/if}

      {#if success}
        <div class="alert" style="background:#dcfce7;border-color:#bbf7d0;color:#166534;">
          {success}
        </div>
      {/if}

      <form class="auth-form" on:submit|preventDefault={handleSubmit}>
        <label for="email" class="label">Email</label>
        <input
          id="email"
          class="input"
          type="email"
          bind:value={email}
          placeholder="you@example.com"
          autocomplete="email"
        />
        <button class="btn btn-primary btn-lg auth-submit" type="submit" disabled={submitting}>
          {submitting ? 'Отправка...' : 'Отправить ссылку'}
        </button>
      </form>

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
    max-width: 440px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-xl);
    padding: 40px;
    box-shadow: var(--shadow-xl);
    text-align: left;
  }

  .auth-title {
    font-size: 1.5rem;
    margin-bottom: 12px;
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
    gap: 12px;
  }

  .auth-submit {
    width: 100%;
    justify-content: center;
    margin-top: 8px;
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
