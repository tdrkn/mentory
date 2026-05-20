<script lang="ts">
  import { ApiError } from '$lib/api';
  import { goto } from '$app/navigation';
  import { isAuthenticated, isLoading as authLoading, isAdmin, login as authLogin } from '$lib/stores/auth';

  let login = '';
  let password = '';
  let code = '';
  let isLoading = false;
  let errorMsg = '';

  $: if (!$authLoading && $isAuthenticated && $isAdmin) {
    goto('/admin');
  }

  const submit = async () => {
    if (!login.trim() || !password) return;
    isLoading = true;
    errorMsg = '';
    try {
      // Code field is shown per Figma but 2FA backend is not yet wired up.
      // We still call the standard login endpoint with login + password.
      const user = await authLogin(login.trim(), password);
      if (user.role !== 'admin') {
        errorMsg = 'Доступ запрещён. Требуется учётная запись администратора.';
        return;
      }
      goto('/admin');
    } catch (err) {
      if (err instanceof ApiError) {
        const msg = err.data?.message;
        errorMsg = Array.isArray(msg) ? msg[0] : (msg || 'Неверный логин или пароль');
      } else {
        errorMsg = 'Ошибка подключения к серверу';
      }
    } finally {
      isLoading = false;
    }
  };

  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') submit();
  };
</script>

<svelte:head>
  <title>Вход администратора — Mentory</title>
</svelte:head>

<div class="admin-page">
  <!-- Top bar -->
  <div class="topbar">
    <div class="brand">
      <a href="/" class="brand-link">mentory</a>
    </div>
    <a class="topbar-btn" href="/">Вернуться на сайт</a>
  </div>

  <!-- Centered login card -->
  <div class="login-wrap">
    <div class="login-card">
      <div class="card-brand">mentory</div>
      <div class="card-sub">Авторизация</div>

      {#if errorMsg}
        <div class="error-banner">{errorMsg}</div>
      {/if}

      <form class="form" on:submit|preventDefault={submit}>
        <div class="field">
          <label for="admin-login">Логин</label>
          <div class="input-wrap">
            <span class="input-icon" aria-hidden="true">
              <!-- user icon -->
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </span>
            <input
              id="admin-login"
              class="input"
              type="text"
              bind:value={login}
              placeholder="admin_1"
              autocomplete="username"
              on:keydown={handleKeydown}
            />
          </div>
        </div>

        <div class="field">
          <label for="admin-password">Пароль</label>
          <div class="input-wrap">
            <span class="input-icon" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </span>
            <input
              id="admin-password"
              class="input"
              type="password"
              bind:value={password}
              placeholder="Минимум 16 символов"
              autocomplete="current-password"
              on:keydown={handleKeydown}
            />
          </div>
        </div>

        <div class="field">
          <label for="admin-code">Код</label>
          <div class="input-wrap">
            <span class="input-icon" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </span>
            <input
              id="admin-code"
              class="input"
              type="text"
              inputmode="numeric"
              maxlength="6"
              bind:value={code}
              placeholder="6 цифр"
              autocomplete="one-time-code"
              on:keydown={handleKeydown}
            />
          </div>
        </div>

        <button
          class="submit-btn"
          type="submit"
          disabled={isLoading || !login.trim() || !password}
        >
          {isLoading ? 'Вход...' : 'Войти'}
        </button>
      </form>
    </div>
  </div>
</div>

<style>
  .admin-page {
    min-height: 100vh;
    background: #2a2a30;
    color: #fff;
    display: flex;
    flex-direction: column;
  }

  /* Top bar */
  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 28px;
    background: #fff;
    color: #111;
    border-bottom: 1px solid #e5e7eb;
  }

  .brand-link {
    font-size: 1.3rem;
    font-weight: 800;
    color: #111;
    text-decoration: none;
  }

  .topbar-btn {
    padding: 6px 14px;
    border-radius: 999px;
    background: #f3f4f6;
    color: #111;
    font-size: 0.85rem;
    text-decoration: none;
    transition: background 0.15s ease;
  }
  .topbar-btn:hover { background: #e5e7eb; }

  /* Centered card */
  .login-wrap {
    flex: 1;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 60px 16px;
  }

  .login-card {
    background: #fff;
    color: #111;
    width: 100%;
    max-width: 380px;
    border-radius: 14px;
    padding: 38px 36px 36px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
    display: flex;
    flex-direction: column;
    gap: 22px;
  }

  .card-brand {
    text-align: center;
    font-size: 1.8rem;
    font-weight: 800;
    color: #111;
    line-height: 1;
  }

  .card-sub {
    text-align: center;
    font-size: 1rem;
    color: #111;
    margin-top: -16px;
    font-weight: 500;
  }

  .error-banner {
    background: #fee2e2;
    border: 1px solid #fca5a5;
    color: #991b1b;
    border-radius: 8px;
    padding: 8px 12px;
    font-size: 0.85rem;
  }

  .form {
    display: flex;
    flex-direction: column;
    gap: 14px;
    margin-top: 14px;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .field label {
    font-size: 0.85rem;
    color: #111;
    font-weight: 500;
  }

  .input-wrap {
    position: relative;
  }

  .input-icon {
    position: absolute;
    left: 10px;
    top: 50%;
    transform: translateY(-50%);
    color: #6b7280;
    display: flex;
    align-items: center;
    pointer-events: none;
  }

  .input {
    width: 100%;
    padding: 9px 12px 9px 32px;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    font-size: 0.9rem;
    color: #111;
    background: #fff;
    box-sizing: border-box;
    outline: none;
    transition: border-color 0.15s ease;
  }
  .input:focus { border-color: #3b82f6; }
  .input::placeholder { color: #9ca3af; }

  .submit-btn {
    margin-top: 8px;
    padding: 10px 12px;
    background: #2563eb;
    color: #fff;
    border: none;
    border-radius: 8px;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s ease;
  }
  .submit-btn:hover:not(:disabled) { background: #1d4ed8; }
  .submit-btn:disabled { background: #93c5fd; cursor: not-allowed; }
</style>
