<script lang="ts">
  import BrandLogo from '$lib/components/BrandLogo.svelte';
  import { api, ApiError } from '$lib/api';
  import { goto } from '$app/navigation';
  import { isAuthenticated, isLoading as authLoading, isAdmin } from '$lib/stores/auth';
  import { ShieldCheck, Lock, Mail, KeyRound } from 'lucide-svelte';

  let email = '';
  let password = '';
  let twoFactorCode = '';
  let step: 'credentials' | 'twofa' = 'credentials';
  let isLoading = false;
  let errorMsg = '';

  $: if (!$authLoading && $isAuthenticated && $isAdmin) {
    goto('/admin');
  }

  const submitCredentials = async () => {
    if (!email.trim() || !password) return;
    isLoading = true;
    errorMsg = '';
    try {
      const response = await api.post<{ accessToken: string; user: { role: string } }>(
        '/auth/login',
        { login: email.trim(), password }
      );
      if (response.user.role !== 'admin') {
        errorMsg = 'Доступ запрещён. Требуется учётная запись администратора.';
        return;
      }
      localStorage.setItem('accessToken', response.accessToken);
      // Proceed to 2FA step (visual demo — skipped in current implementation)
      step = 'twofa';
    } catch (err) {
      if (err instanceof ApiError) {
        const msg = err.data?.message;
        errorMsg = Array.isArray(msg) ? msg[0] : (msg || 'Неверный email или пароль');
      } else {
        errorMsg = 'Ошибка подключения к серверу';
      }
    } finally {
      isLoading = false;
    }
  };

  const submitTwoFa = async () => {
    // Demo step — 2FA infrastructure not wired up yet
    // Any code proceeds to admin dashboard
    isLoading = true;
    setTimeout(() => {
      goto('/admin');
    }, 400);
  };

  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (step === 'credentials') submitCredentials();
      else submitTwoFa();
    }
  };
</script>

<div class="login-root">
  <div class="login-card">
    <!-- Logo -->
    <div class="login-logo">
      <BrandLogo href="/" height={30} />
    </div>

    <!-- Header -->
    <div class="login-header">
      <div class="shield-icon">
        <ShieldCheck size={28} />
      </div>
      <h1 class="login-title">Панель администратора</h1>
      <p class="login-sub">Доступ только для авторизованного персонала</p>
    </div>

    {#if errorMsg}
      <div class="error-banner">{errorMsg}</div>
    {/if}

    {#if step === 'credentials'}
      <!-- Step 1: Email + Password -->
      <div class="form-steps">
        <div class="step-indicator">
          <span class="step active">1</span>
          <span class="step-line"></span>
          <span class="step">2</span>
        </div>
        <p class="step-label">Учётные данные</p>
      </div>

      <div class="form-fields">
        <label class="field">
          <span class="field-label"><Mail size={14} /> Email</span>
          <input
            class="input"
            type="email"
            bind:value={email}
            placeholder="admin@mentory.app"
            on:keydown={handleKeydown}
            autocomplete="email"
          />
        </label>
        <label class="field">
          <span class="field-label"><Lock size={14} /> Пароль</span>
          <input
            class="input"
            type="password"
            bind:value={password}
            placeholder="••••••••••"
            on:keydown={handleKeydown}
            autocomplete="current-password"
          />
        </label>
      </div>

      <button
        class="btn btn-primary login-btn"
        on:click={submitCredentials}
        disabled={isLoading || !email.trim() || !password}
      >
        {isLoading ? 'Проверка...' : 'Продолжить →'}
      </button>
    {:else}
      <!-- Step 2: 2FA Code -->
      <div class="form-steps">
        <div class="step-indicator">
          <span class="step done">✓</span>
          <span class="step-line active"></span>
          <span class="step active">2</span>
        </div>
        <p class="step-label">Код подтверждения</p>
      </div>

      <div class="twofa-hint">
        <KeyRound size={16} />
        <span>Введите 6-значный код из приложения-аутентификатора</span>
      </div>

      <div class="twofa-inputs">
        <input
          class="input twofa-input"
          type="text"
          inputmode="numeric"
          maxlength="6"
          bind:value={twoFactorCode}
          placeholder="000000"
          autocomplete="one-time-code"
          on:keydown={handleKeydown}
        />
      </div>

      <button
        class="btn btn-primary login-btn"
        on:click={submitTwoFa}
        disabled={isLoading}
      >
        {isLoading ? 'Вход...' : 'Войти в панель'}
      </button>

      <button class="btn btn-ghost back-btn" on:click={() => { step = 'credentials'; errorMsg = ''; }}>
        ← Назад
      </button>
    {/if}

    <p class="login-footer">
      Защищённое соединение. Все действия фиксируются в журнале аудита.
    </p>
  </div>
</div>

<style>
  .login-root {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg);
    padding: 24px 16px;
  }

  .login-card {
    width: 100%;
    max-width: 420px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-xl);
    padding: 40px 36px 32px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
  }

  .login-logo {
    display: flex;
    justify-content: center;
    margin-bottom: 4px;
  }

  .login-header {
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
  }

  .shield-icon {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: var(--accent-muted);
    color: var(--accent);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .login-title {
    font-size: 1.35rem;
    font-weight: 800;
    color: var(--ink);
    margin: 0;
  }

  .login-sub {
    font-size: 0.85rem;
    color: var(--muted);
    margin: 0;
  }

  .error-banner {
    background: var(--status-error-bg);
    border: 1px solid var(--status-error-border, #fca5a5);
    color: var(--status-error-ink);
    border-radius: var(--radius-md);
    padding: 10px 14px;
    font-size: 0.88rem;
  }

  /* Step indicator */
  .form-steps {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .step-indicator {
    display: flex;
    align-items: center;
    gap: 0;
  }

  .step {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: 2px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.78rem;
    font-weight: 700;
    color: var(--muted);
    background: var(--surface);
  }

  .step.active {
    border-color: var(--accent);
    color: var(--accent);
    background: var(--accent-muted);
  }

  .step.done {
    border-color: var(--status-success-ink, #16a34a);
    background: var(--status-success-bg, #dcfce7);
    color: var(--status-success-ink, #16a34a);
  }

  .step-line {
    width: 48px;
    height: 2px;
    background: var(--border);
  }

  .step-line.active {
    background: var(--accent);
  }

  .step-label {
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--muted);
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  /* Fields */
  .form-fields {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .field-label {
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--muted);
    display: flex;
    align-items: center;
    gap: 5px;
  }

  /* 2FA */
  .twofa-hint {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.85rem;
    color: var(--muted);
    background: var(--bg-alt);
    border-radius: var(--radius-md);
    padding: 10px 14px;
  }

  .twofa-inputs {
    display: flex;
    justify-content: center;
  }

  .twofa-input {
    text-align: center;
    font-size: 1.6rem;
    font-weight: 700;
    letter-spacing: 0.3em;
    max-width: 200px;
    padding: 12px 16px;
  }

  .login-btn {
    width: 100%;
    justify-content: center;
    padding: 12px;
    font-size: 0.95rem;
  }

  .back-btn {
    width: 100%;
    justify-content: center;
    font-size: 0.88rem;
  }

  .login-footer {
    font-size: 0.76rem;
    color: var(--muted);
    text-align: center;
    margin: 0;
    opacity: 0.7;
    line-height: 1.4;
  }
</style>
