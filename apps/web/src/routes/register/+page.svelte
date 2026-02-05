<script lang="ts">
  import AppHeader from '$lib/components/AppHeader.svelte';
  import { register, error, isAuthenticated, isLoading, clearAuthError } from '$lib/stores/auth';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { superForm } from 'sveltekit-superforms/client';
  import { zodClient } from 'sveltekit-superforms/adapters';
  import { registerSchema, type RegisterForm } from '$lib/validators/auth';
  import { User, Mail, Lock, ArrowRight, Sparkles, Search, BookOpen } from 'lucide-svelte';

  export let data;

  const form = superForm<RegisterForm>(data.form, {
    validators: zodClient(registerSchema as any),
    SPA: true,
    resetForm: false,
  });

  const { form: formData, errors } = form;
  const errorMessage = (err: unknown) => (Array.isArray(err) ? err[0] : err);
  let submitting = false;

  onMount(() => {
    clearAuthError();
    const urlRole = $page.url.searchParams.get('role');
    if (urlRole === 'mentor' || urlRole === 'mentee') {
      formData.update((current) => ({ ...current, role: urlRole }));
    } else if (!$formData.role) {
      formData.update((current) => ({ ...current, role: 'mentee' }));
    }
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
      const user = await register($formData.email, $formData.password, $formData.fullName, $formData.role);
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
        <h1 class="auth-title">Создать аккаунт</h1>
        <p class="auth-subtitle">Начните свой путь к новым знаниям</p>
      </div>

      {#if $error}
        <div class="alert alert-error">
          {$error}
        </div>
      {/if}

      <form class="auth-form" on:submit|preventDefault={handleSubmit}>
        <div class="form-group">
          <label class="label" for="fullName">Имя и фамилия</label>
          <div class="input-with-icon">
            <User size={18} />
            <input 
              id="fullName"
              class="input" 
              bind:value={$formData.fullName} 
              placeholder="Иван Иванов" 
            />
          </div>
          {#if $errors.fullName}
            <span class="form-error">{errorMessage($errors.fullName)}</span>
          {/if}
        </div>

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
              placeholder="Минимум 8 символов" 
            />
          </div>
          {#if $errors.password}
            <span class="form-error">{errorMessage($errors.password)}</span>
          {/if}
        </div>

        <div class="form-group">
          <label class="label">Я хочу</label>
          <div class="role-selector">
            <button 
              type="button" 
              class="role-option {$formData.role === 'mentee' ? 'selected' : ''}"
              on:click={() => formData.update((current) => ({ ...current, role: 'mentee' }))}
            >
              <div class="role-icon mentee">
                <Search size={20} />
              </div>
              <div class="role-content">
                <strong>Найти ментора</strong>
                <span>Получить консультацию от экспертов</span>
              </div>
            </button>
            <button 
              type="button" 
              class="role-option {$formData.role === 'mentor' ? 'selected' : ''}"
              on:click={() => formData.update((current) => ({ ...current, role: 'mentor' }))}
            >
              <div class="role-icon mentor">
                <BookOpen size={20} />
              </div>
              <div class="role-content">
                <strong>Стать ментором</strong>
                <span>Делиться знаниями и опытом</span>
              </div>
            </button>
          </div>
        </div>

        <button class="btn btn-primary btn-lg auth-submit" type="submit" disabled={submitting}>
          {submitting ? 'Регистрация...' : 'Создать аккаунт'}
          <ArrowRight size={18} />
        </button>
      </form>

      <div class="auth-footer">
        <p>
          Уже есть аккаунт? <a href="/login" class="auth-link">Войти</a>
        </p>
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
    max-width: 480px;
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

  .role-selector {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .role-option {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 20px 16px;
    background: var(--bg-alt);
    border: 2px solid transparent;
    border-radius: var(--radius-lg);
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: center;
  }

  .role-option:hover {
    border-color: var(--border);
  }

  .role-option.selected {
    background: var(--accent-muted);
    border-color: var(--accent);
  }

  .role-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .role-icon.mentee {
    background: var(--accent-muted);
    color: var(--accent);
  }

  .role-icon.mentor {
    background: var(--violet-muted);
    color: var(--violet);
  }

  .role-content {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .role-content strong {
    font-size: 0.95rem;
  }

  .role-content span {
    font-size: 0.8rem;
    color: var(--muted);
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

  @media (max-width: 480px) {
    .auth-card {
      padding: 28px 20px;
    }

    .role-selector {
      grid-template-columns: 1fr;
    }

    .role-option {
      flex-direction: row;
      text-align: left;
    }
  }
</style>
