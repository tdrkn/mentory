<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import AppHeader from '$lib/components/AppHeader.svelte';

  $: status = $page.status;
  $: title = status === 404 ? 'Страница не найдена' : 'Что-то пошло не так';
  $: message =
    status === 404
      ? 'Похоже, этот маршрут больше не доступен или ссылка была набрана с ошибкой.'
      : 'Мы уже знаем, что путь прервался. Попробуйте обновить страницу или вернуться на главную.';
</script>

<svelte:head>
  <title>{title} — Mentory</title>
</svelte:head>

<div class="page">
  <AppHeader />

  <main class="error-shell">
    <section class="error-hero">
      <img src="/illustrations/error-state.png" alt="" />
      <div class="error-copy">
        <span class="error-code">{status}</span>
        <h1>{title}</h1>
        <p>{message}</p>
        <div class="error-actions">
          <button class="btn btn-outline" type="button" on:click={() => history.back()}>Назад</button>
          <a class="btn btn-primary" href="/">На главную</a>
          <a class="btn btn-ghost" href="/mentors">Найти ментора</a>
        </div>
      </div>
    </section>
  </main>
</div>

<style>
  .error-shell {
    max-width: 1040px;
    margin: 0 auto;
    padding: 48px 20px 96px;
  }

  .error-hero {
    display: grid;
    gap: 28px;
    justify-items: center;
    text-align: center;
  }

  .error-hero img {
    width: min(100%, 760px);
    aspect-ratio: 16 / 9;
    object-fit: cover;
    border-radius: var(--radius-lg);
    border: 1px solid var(--border);
    box-shadow: var(--shadow-md);
  }

  .error-copy {
    max-width: 620px;
  }

  .error-code {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 64px;
    min-height: 36px;
    padding: 6px 14px;
    border-radius: var(--radius-md);
    background: var(--accent-muted);
    color: var(--accent);
    font-weight: 800;
    font-size: 0.95rem;
  }

  h1 {
    margin: 16px 0 10px;
    color: var(--ink);
    font-size: clamp(1.8rem, 4vw, 2.6rem);
    line-height: 1.1;
  }

  p {
    margin: 0;
    color: var(--muted);
    font-size: 1rem;
    line-height: 1.6;
  }

  .error-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 12px;
    margin-top: 24px;
  }

  @media (max-width: 640px) {
    .error-shell {
      padding-top: 28px;
    }

    .error-hero img {
      border-radius: var(--radius-md);
    }

    .error-actions .btn {
      width: 100%;
    }
  }
</style>
