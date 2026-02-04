<script lang="ts">
  import AppHeader from '$lib/components/AppHeader.svelte';
  import { register, error, isAuthenticated, isLoading } from '$lib/stores/auth';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { superForm } from 'sveltekit-superforms/client';
  import { zodClient } from 'sveltekit-superforms/adapters';
  import { registerSchema, type RegisterForm } from '$lib/validators/auth';

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
          <input class="input" bind:value={$formData.fullName} placeholder="Иван Иванов" />
          {#if $errors.fullName}
            <div class="muted" style="font-size:0.8rem;color:#b45309;">{errorMessage($errors.fullName)}</div>
          {/if}
        </label>
        <label>
          <div class="muted" style="font-size:0.9rem;margin-bottom:6px;">Email</div>
          <input class="input" type="email" bind:value={$formData.email} placeholder="you@example.com" />
          {#if $errors.email}
            <div class="muted" style="font-size:0.8rem;color:#b45309;">{errorMessage($errors.email)}</div>
          {/if}
        </label>
        <label>
          <div class="muted" style="font-size:0.9rem;margin-bottom:6px;">Пароль</div>
          <input class="input" type="password" bind:value={$formData.password} placeholder="Минимум 8 символов" />
          {#if $errors.password}
            <div class="muted" style="font-size:0.8rem;color:#b45309;">{errorMessage($errors.password)}</div>
          {/if}
        </label>

        <div>
          <div class="muted" style="font-size:0.9rem;margin-bottom:10px;">Я хочу</div>
          <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;">
            <button type="button" class="card" style={`border:2px solid ${$formData.role === 'mentee' ? 'var(--accent)' : 'transparent'};`} on:click={() => formData.update((current) => ({ ...current, role: 'mentee' }))}>
              <strong>Найти ментора</strong>
              <p class="muted" style="margin-top:6px;">Получить консультацию</p>
            </button>
            <button type="button" class="card" style={`border:2px solid ${$formData.role === 'mentor' ? 'var(--accent)' : 'transparent'};`} on:click={() => formData.update((current) => ({ ...current, role: 'mentor' }))}>
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
