<script lang="ts">
  import AppHeader from '$lib/components/AppHeader.svelte';
  import { onMount } from 'svelte';
  import {
    login,
    error,
    isAuthenticated,
    isLoading,
    clearAuthError,
    resendVerificationEmail,
  } from '$lib/stores/auth';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { loginSchema } from '$lib/validators/auth';
  import BrandLogo from '$lib/components/BrandLogo.svelte';
  import { User, Lock, ArrowRight } from 'lucide-svelte';

  let loginValue = '';
  let password = '';
  let fieldErrors: { login?: string; password?: string } = {};
  let submitting = false;
  let pendingVerificationEmail = '';
  let verificationInfo: string | null = null;
  let verificationBusy = false;
  let showErrorModal = false;

  const closeErrorModal = () => {
    clearAuthError();
  };

  const handleBackdropKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      closeErrorModal();
    }
    if (event.key === 'Escape') {
      closeErrorModal();
    }
  };

  onMount(() => {
    clearAuthError();
    const verifyEmail = $page.url.searchParams.get('verifyEmail');
    if (verifyEmail) {
      pendingVerificationEmail = verifyEmail;
      verificationInfo = `Мы отправили письмо для подтверждения на ${verifyEmail}.`;
    }
    if ($isAuthenticated && !$isLoading) {
      goto('/mentors');
    }
  });

  $: showErrorModal = !!$error;

  const fillTestAccount = (e: string, p: string) => {
    loginValue = e;
    password = p;
  };

  const handleSubmit = async () => {
    // Validate with zod
    fieldErrors = {};
    const result = loginSchema.safeParse({ login: loginValue, password });
    if (!result.success) {
      for (const issue of result.error.issues) {
        const key = issue.path[0] as 'login' | 'password';
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      return;
    }

    submitting = true;
    try {
      const u = await login(loginValue, password);
      if (u.role === 'mentor' || u.role === 'both') {
        await goto('/dashboard');
      } else {
        await goto('/mentors');
      }
    } catch {
      const authError = ($error || '').toLowerCase();
      const emailCandidate = loginValue.trim();
      if (authError.includes('email не подтвержден') && emailCandidate.includes('@')) {
        pendingVerificationEmail = emailCandidate;
        verificationInfo = `Ваш email ${emailCandidate} не подтвержден. Отправьте письмо повторно.`;
      }
    } finally {
      submitting = false;
    }
  };

  const handleResendVerification = async () => {
    if (!pendingVerificationEmail || verificationBusy) return;

    verificationBusy = true;
    try {
      await resendVerificationEmail(pendingVerificationEmail);
      verificationInfo = `Письмо отправлено повторно на ${pendingVerificationEmail}.`;
    } catch (err) {
      verificationInfo = err instanceof Error ? err.message : 'Не удалось отправить письмо';
    } finally {
      verificationBusy = false;
    }
  };
</script>

<div class="page">
  <AppHeader />

  <main class="auth-container">
    <div class="auth-card reveal">
      <div class="auth-header">
        <div class="auth-logo">
          <BrandLogo href="/" height={34} />
        </div>
        <h1 class="auth-title">С возвращением!</h1>
        <p class="auth-subtitle">Войдите, чтобы продолжить обучение</p>
      </div>

      {#if verificationInfo}
        <div class="surface" style="margin-bottom:16px;background:var(--status-info-bg);border-color:var(--status-info-border);color:var(--status-info-ink);">
          <div>{verificationInfo}</div>
          {#if pendingVerificationEmail}
            <button
              class="btn btn-outline btn-sm"
              style="margin-top:10px;"
              on:click={handleResendVerification}
              disabled={verificationBusy}
            >
              {verificationBusy ? 'Отправка...' : 'Отправить письмо ещё раз'}
            </button>
          {/if}
        </div>
      {/if}

      {#if $error}
        <div class="alert alert-error">
          {$error}
        </div>
      {/if}

      <form class="auth-form" on:submit|preventDefault={handleSubmit}>
        <div class="form-group">
          <label class="label" for="login">Логин или email</label>
          <div class="input-with-icon">
            <User size={18} />
            <input 
              id="login"
              class="input" 
              type="text" 
              bind:value={loginValue} 
              placeholder="username или you@example.com" 
            />
          </div>
          {#if fieldErrors.login}
            <span class="form-error">{fieldErrors.login}</span>
          {/if}
        </div>

        <div class="form-group">
          <div class="password-label-row">
            <label class="label" for="password">Пароль</label>
            <a href="/forgot-password" class="forgot-link">Забыли пароль?</a>
          </div>
          <div class="input-with-icon">
            <Lock size={18} />
            <input 
              id="password"
              class="input" 
              type="password" 
              bind:value={password} 
              placeholder="••••••••" 
            />
          </div>
          {#if fieldErrors.password}
            <span class="form-error">{fieldErrors.password}</span>
          {/if}
        </div>

        <button class="btn btn-primary btn-lg auth-submit" type="submit" disabled={submitting}>
          {submitting ? 'Вход...' : 'Войти'}
          <ArrowRight size={18} />
        </button>
      </form>

      <div class="auth-footer">
        <p>
          Нет аккаунта? <a href="/register" class="auth-link">Зарегистрироваться</a>
        </p>
      </div>

      <div class="test-accounts">
        <div class="test-accounts-header">Тестовые аккаунты <span class="test-hint">(нажмите, чтобы заполнить)</span></div>
        <div class="test-accounts-grid">
          <button class="test-account" type="button" on:click={() => fillTestAccount('maria.mentor@example.com', 'password123')}>
            <span class="test-role">Ментор</span>
            <code>maria.mentor@example.com</code>
          </button>
          <button class="test-account" type="button" on:click={() => fillTestAccount('ivan.mentee@example.com', 'password123')}>
            <span class="test-role">Менти</span>
            <code>ivan.mentee@example.com</code>
          </button>
        </div>
        <div class="test-password">Пароль: <code>password123</code></div>
      </div>
    </div>
  </main>
</div>

{#if showErrorModal}
  <div
    class="error-modal-backdrop"
    role="button"
    tabindex="0"
    aria-label="Закрыть окно ошибки"
    on:click={closeErrorModal}
    on:keydown={handleBackdropKeydown}
  >
    <div class="error-modal">
      <h3>Ошибка входа</h3>
      <p>{$error}</p>
      <button class="btn btn-primary" on:click={closeErrorModal}>Повторить</button>
    </div>
  </div>
{/if}

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
  }

  .auth-header {
    text-align: center;
    margin-bottom: 32px;
  }

  .auth-logo {
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 14px;
  }

  .auth-title {
    font-size: 1.5rem;
    margin-bottom: 8px;
  }

  .auth-subtitle {
    color: var(--muted);
  }

  .auth-form {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .input-with-icon {
    position: relative;
  }

  .input-with-icon :global(svg) {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--muted);
    pointer-events: none;
  }

  .input-with-icon .input {
    padding-left: 44px;
  }

  .form-error {
    font-size: 0.8rem;
    color: var(--status-error-ink);
    margin-top: 4px;
  }

  .password-label-row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
  }

  .forgot-link {
    font-size: 0.82rem;
    color: var(--accent);
    font-weight: 500;
    line-height: 1;
  }

  .forgot-link:hover {
    text-decoration: underline;
  }

  .auth-submit {
    margin-top: 8px;
    width: 100%;
    justify-content: center;
  }

  .auth-footer {
    text-align: center;
    margin-top: 24px;
    padding-top: 24px;
    border-top: 1px solid var(--border);
    color: var(--muted);
  }

  .auth-link {
    color: var(--accent);
    font-weight: 500;
  }

  .auth-link:hover {
    text-decoration: underline;
  }

  .test-accounts {
    margin-top: 24px;
    padding: 16px;
    background: var(--bg-alt);
    border-radius: var(--radius-lg);
    font-size: 0.85rem;
  }

  .test-accounts-header {
    font-weight: 600;
    color: var(--ink-secondary);
    margin-bottom: 12px;
  }

  .test-hint {
    font-weight: 400;
    font-size: 0.75rem;
    color: var(--muted);
  }

  .test-accounts-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-bottom: 8px;
  }

  .test-account {
    display: flex;
    flex-direction: column;
    gap: 2px;
    background: var(--surface);
    border: 1.5px solid var(--border);
    border-radius: var(--radius-md);
    padding: 10px 12px;
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: left;
    font-family: inherit;
    font-size: 0.85rem;
  }

  .test-account:hover {
    border-color: var(--accent);
    background: var(--accent-soft, rgba(13, 148, 136, 0.06));
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  }

  .test-account:active {
    transform: translateY(0);
  }

  .test-role {
    font-size: 0.75rem;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .test-account code,
  .test-password code {
    font-size: 0.8rem;
    color: var(--ink-secondary);
    background: none;
    padding: 0;
  }

  .test-password {
    color: var(--muted);
    padding-top: 8px;
    border-top: 1px solid var(--border);
  }

  .error-modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 120;
    padding: 20px;
  }

  .error-modal {
    background: var(--surface-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 20px;
    max-width: 420px;
    width: 100%;
    box-shadow: var(--shadow-xl);
  }

  .error-modal h3 {
    margin: 0 0 8px;
  }

  .error-modal p {
    margin: 0 0 14px;
    color: var(--ink-secondary);
  }

  @media (max-width: 480px) {
    .auth-card {
      padding: 28px 20px;
    }

    .test-accounts-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
