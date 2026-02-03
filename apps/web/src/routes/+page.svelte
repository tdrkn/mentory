<script lang="ts">
  import AppHeader from '$lib/components/AppHeader.svelte';
</script>

<div class="page">
  <AppHeader />

  <main class="container">
    <section class="hero">
      <div class="reveal">
        <div class="eyebrow">Платформа менторства</div>
        <h1>Находите экспертов и растите быстрее вместе с Mentory</h1>
        <p>
          Соберите карьерный план, забронируйте слот, получите консультацию и
          держите фокус на прогрессе — всё в одном месте.
        </p>
        <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:18px;">
          <a class="btn btn-primary" href="/mentors">Найти ментора</a>
          <a class="btn btn-outline" href="/register?role=mentor">Стать ментором</a>
        </div>
      </div>
      <div class="card soft reveal">
        <h2 class="section-title">Что внутри</h2>
        <div class="stack">
          <div>
            <strong>Поиск по темам</strong>
            <p class="muted">Фильтры, рейтинги и быстрый выбор.</p>
          </div>
          <div>
            <strong>Расписание и слоты</strong>
            <p class="muted">Гибкая доступность и автоматическая генерация.</p>
          </div>
          <div>
            <strong>Сессии и оплата</strong>
            <p class="muted">Бронирование, подтверждение и история встреч.</p>
          </div>
          <div>
            <strong>Чат и заметки</strong>
            <p class="muted">Обсуждения до и после встречи.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="grid cols-3">
        <div class="card reveal">
          <div class="tag">🔍 Поиск</div>
          <h3 style="margin-top:12px;">Найдите своего эксперта</h3>
          <p class="muted">Фильтры по цене, рейтингу и специализациям.</p>
        </div>
        <div class="card reveal" style="animation-delay:0.1s;">
          <div class="tag">📅 Гибкость</div>
          <h3 style="margin-top:12px;">Управляйте слотами</h3>
          <p class="muted">Создавайте правила доступности на недели вперёд.</p>
        </div>
        <div class="card reveal" style="animation-delay:0.2s;">
          <div class="tag">💬 Коммуникация</div>
          <h3 style="margin-top:12px;">Обсуждайте детали</h3>
          <p class="muted">Чат, заметки и напоминания — всё под рукой.</p>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="card">
        <h2 class="section-title">Готовы начать?</h2>
        <p class="muted">Создайте аккаунт, заполните профиль и начните работать с менторами.</p>
        <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:16px;">
          <a class="btn btn-primary" href="/register">Создать аккаунт</a>
          <a class="btn btn-ghost" href="/login">Уже есть аккаунт</a>
        </div>
      </div>
    </section>
  </main>

  <footer class="container" style="padding:40px 0;color:var(--muted);font-size:0.9rem;">
    © 2026 Mentory. Все права защищены.
  </footer>
</div>
