<script lang="ts">
  import AppHeader from '$lib/components/AppHeader.svelte';
  import { onMount } from 'svelte';
  import { login, error, isAuthenticated, isLoading, clearAuthError } from '$lib/stores/auth';
  import { goto } from '$app/navigation';
  import { superForm } from 'sveltekit-superforms/client';
  import { zodClient } from 'sveltekit-superforms/adapters';
  import { loginSchema, type LoginForm } from '$lib/validators/auth';
  import { Mail, Lock, ArrowRight, Sparkles } from 'lucide-svelte';

  export let data;

  const form = superForm<LoginForm>(data.form, {
    validators: zodClient(loginSchema as any),
    SPA: true,
    resetForm: false,
  });

  const { form: formData, errors } = form;
  const errorMessage = (err: unknown) => (Array.isArray(err) ? err[0] : err);
  let submitting = false;

  onMount(() => {
    clearAuthError();
    if ($isAuthenticated && !$isLoading) {
      goto('/mentors');
    }
  });

  const handleSubmit = async () => {
    const validation = await form.validateForm({ update: true });
    if (!validation.valid) {
      return;
    }
    submitting = true;
    try {
      const user = await login($formData.email, $formData.password);
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

  <main class="auth-container">
    <div class="auth-card reveal">
      <div class="auth-header">
        <div class="auth-logo">
          <Sparkles size={24} />
        </div>
        <h1 class="auth-title">С возвращением!</h1>
        <p class="auth-subtitle">Войдите, чтобы продолжить обучение</p>
      </div>

      {#if $error}
        <div class="alert alert-error">
          {$error}
        </div>
      {/if}

      <form class="auth-form" on:submit|preventDefault={handleSubmit}>
        <div class="form-group">
          <label class="label" for="email">Email</label>
          <div class="input-with-icon">
            <Mail size={18} />
            <input 
              id="email"
              class="input" 
              type="email" 
              bind:value={$formData.email} 
              placeholder="you@example.com" 
            />
          </div>
          {#if $errors.email}
            <span class="form-error">{errorMessage($errors.email)}</span>
          {/if}
        </div>

        <div class="form-group">
          <label class="label" for="password">Пароль</label>
          <div class="input-with-icon">
            <Lock size={18} />
            <input 
              id="password"
              class="input" 
              type="password" 
              bind:value={$formData.password} 
              placeholder="••••••••" 
            />
          </div>
          {#if $errors.password}
            <span class="form-error">{errorMessage($errors.password)}</span>
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
        <div class="test-accounts-header">Тестовые аккаунты</div>
        <div class="test-accounts-grid">
          <div class="test-account">
            <span class="test-role">Ментор</span>
            <code>maria.mentor@example.com</code>
          </div>
          <div class="test-account">
            <span class="test-role">Менти</span>
            <code>ivan.mentee@example.com</code>
          </div>
        </div>
        <div class="test-password">Пароль: <code>password123</code></div>
      </div>
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
  }

  .auth-header {
    text-align: center;
    margin-bottom: 32px;
  }

  .auth-logo {
    width: 56px;
    height: 56px;
    background: linear-gradient(135deg, var(--accent) 0%, var(--violet) 100%);
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    margin: 0 auto 20px;
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
    color: #dc2626;
    margin-top: 4px;
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

  @media (max-width: 480px) {
    .auth-card {
      padding: 28px 20px;
    }

    .test-accounts-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
