<script lang="ts">
  import AppHeader from '$lib/components/AppHeader.svelte';
  import BrandLogo from '$lib/components/BrandLogo.svelte';
  import { Search, CalendarDays, MessageCircle, CheckCircle2, Star, TrendingUp } from 'lucide-svelte';

  const testimonials = [
    {
      text: 'За три недели с ментором подготовился к интервью и получил оффер в продуктовую команду уровня Senior.',
      name: 'Мария К.',
      role: 'Frontend → Senior, FAANG',
      initials: 'МК',
    },
    {
      text: 'Настроили регулярные слоты с командой, синхронизировали часовые пояса и убрали хаос в календарях.',
      name: 'Игорь С.',
      role: 'Team Lead, FinTech',
      initials: 'ИС',
    },
    {
      text: 'Ментор помог собрать платёжную воронку и первую сотню пользователей. Сэкономили месяцы экспериментов.',
      name: 'Алина Р.',
      role: 'Фаундер, запустила MVP за 6 недель',
      initials: 'АР',
    },
  ];
</script>

<div class="page">
  <AppHeader />

  <main class="container">
    <!-- Hero -->
    <section class="hero section-lg">
      <div class="hero-content reveal">
        <div class="eyebrow">Платформа менторства</div>
        <h1>
          Находите экспертов и растите быстрее
          <span class="highlight">вместе с Mentory</span>
        </h1>
        <p class="lead">
          Сформируйте индивидуальный план, забронируйте слот, получите консультацию и держите фокус на прогрессе — всё в одном месте.
        </p>
        <div class="flex gap-md" style="flex-wrap:wrap; margin-top:18px;">
          <a class="btn btn-primary" href="/mentors">Найти ментора</a>
          <a class="btn btn-outline" href="/register?role=mentor">Стать ментором</a>
        </div>
        <div class="muted" style="margin-top:16px; display:flex; gap:16px; align-items:center; flex-wrap:wrap;">
          <span class="tag blue">97% довольных пользователей</span>
          <span class="tag amber">4.9/5 средний рейтинг</span>
          <span>Доступно на русском и английском</span>
        </div>
      </div>

      <div class="card glass reveal">
        <div class="stack">
          <div class="flex-between">
            <div>
              <div class="muted" style="font-size:0.9rem;">Активных менторов</div>
              <div class="stat-value accent">750+</div>
            </div>
            <div class="badge info">Обновлено сегодня</div>
          </div>
          <div class="divider"></div>
          <div class="flex gap-md" style="align-items:center;">
            <div class="avatar-lg">
              <Star size="24" />
            </div>
            <div>
              <div class="mentor-card-name">«Нашёл CTO-ментора за 2 дня»</div>
              <div class="muted">Алексей, продуктовый менеджер</div>
            </div>
          </div>
          <div class="surface" style="border-radius: var(--radius-lg);">
            <div class="flex-between" style="gap:12px;">
              <div>
                <div class="muted">Следующая сессия</div>
                <div class="mentor-card-name">Чт, 11:00 (МСК)</div>
              </div>
              <div class="badge warning">Напоминание включено</div>
            </div>
          </div>
          <div class="flex gap-md" style="align-items:center;">
            <CheckCircle2 color="var(--accent)" />
            <div class="muted">Моментальные подтверждения, встроенные платежи и защита отмен.</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Stats -->
    <section class="section">
      <div class="grid cols-3">
        <div class="stat-card reveal">
          <div class="stat-value accent">6 500+</div>
          <div class="stat-label">проведённых сессий</div>
        </div>
        <div class="stat-card reveal reveal-delay-1">
          <div class="stat-value">4.9</div>
          <div class="stat-label">средний рейтинг менторов</div>
        </div>
        <div class="stat-card reveal reveal-delay-2">
          <div class="stat-value">48 ч</div>
          <div class="stat-label">до первой консультации в среднем</div>
        </div>
      </div>
    </section>

    <!-- Features -->
    <section class="section">
      <h2 class="section-title">Возможности платформы</h2>
      <p class="section-subtitle">Всё необходимое для продуктивной работы с ментором — в одном месте.</p>
      <div class="grid cols-3">
        <div class="feature-card reveal">
          <div class="feature-icon"><Search size="20" /></div>
          <div class="feature-title">Найдите своего эксперта</div>
          <div class="feature-desc">Фильтры по цене, опыту, языкам, отрасли и рейтингу. Быстрый просмотр доступных слотов.</div>
        </div>
        <div class="feature-card reveal reveal-delay-1">
          <div class="feature-icon"><CalendarDays size="20" /></div>
          <div class="feature-title">Управляйте временем</div>
          <div class="feature-desc">Гибкие правила доступности, генерация слотов на недели вперёд, защита от накладок.</div>
        </div>
        <div class="feature-card reveal reveal-delay-2">
          <div class="feature-icon"><MessageCircle size="20" /></div>
          <div class="feature-title">Коммуникация без трения</div>
          <div class="feature-desc">Чат, заметки, напоминания и файлы — всё в одном месте, без переключения контекста.</div>
        </div>
      </div>
    </section>

    <!-- How it works -->
    <section class="section">
      <h2 class="section-title">Как это работает</h2>
      <p class="section-subtitle">От поиска до созвона — меньше кликов, больше пользы.</p>
      <div class="grid cols-3">
        <div class="card interactive reveal">
          <div class="tag blue">Шаг 1</div>
          <h3 style="margin-top:12px;">Определите цель</h3>
          <p class="muted">Выберите тему: переход в новую роль, подготовка к интервью, рост в менеджменте или запуск продукта.</p>
        </div>
        <div class="card interactive reveal reveal-delay-1">
          <div class="tag amber">Шаг 2</div>
          <h3 style="margin-top:12px;">Выберите ментора</h3>
          <p class="muted">Смотрите опыт, рейтинг, стоимость и ближайшие окна. Бронь занимает меньше минуты.</p>
        </div>
        <div class="card interactive reveal reveal-delay-2">
          <div class="tag">Шаг 3</div>
          <h3 style="margin-top:12px;">Получите план и поддержку</h3>
          <p class="muted">Создайте роадмап, договоритесь о ритме созвонов и фиксируйте прогресс в заметках.</p>
        </div>
      </div>
    </section>

    <!-- Testimonials -->
    <section class="section">
      <h2 class="section-title">Истории успеха</h2>
      <p class="section-subtitle">Люди, которые уже выросли с Mentory.</p>
      <div class="grid cols-3">
        {#each testimonials as t, i}
          <div class="testimonial-card reveal {i > 0 ? `reveal-delay-${i}` : ''}">
            <div class="testimonial-stars">
              {#each [1,2,3,4,5] as _}
                <Star size={14} fill="var(--amber)" color="var(--amber)" />
              {/each}
            </div>
            <div class="testimonial-content">{t.text}</div>
            <div class="testimonial-author">
              <div class="avatar-initials">{t.initials}</div>
              <div class="testimonial-author-info">
                <div class="testimonial-author-name">{t.name}</div>
                <div class="testimonial-author-role">{t.role}</div>
              </div>
            </div>
          </div>
        {/each}
      </div>
    </section>

    <!-- CTA -->
    <section class="section">
      <div class="cta-block reveal">
        <div class="cta-icon"><TrendingUp size={32} /></div>
        <h2 class="cta-title">Готовы начать?</h2>
        <p class="cta-sub">Создайте аккаунт, выберите ментора и забронируйте первую сессию — займёт меньше пяти минут.</p>
        <div class="flex gap-md" style="flex-wrap:wrap;justify-content:center;margin-top:28px;">
          <a class="btn btn-primary btn-lg" href="/register">Найти ментора</a>
          <a class="btn btn-outline" href="/register?role=mentor">Стать ментором</a>
        </div>
      </div>
    </section>
  </main>

  <footer class="footer">
    <div class="container">
      <div class="grid cols-3" style="align-items:start;">
        <div>
          <BrandLogo href="/" height={28} scheme="dark" className="footer-brand-logo" />
          <div class="footer-desc">Менторы, расписание, чат и оплата — единая платформа, чтобы расти быстрее.</div>
        </div>
        <div>
          <div class="footer-title">Платформа</div>
          <div class="footer-links">
            <a href="/mentors">Каталог менторов</a>
            <a href="/sessions">Мои сессии</a>
            <a href="/chat">Чат</a>
          </div>
        </div>
        <div>
          <div class="footer-title">Ресурсы</div>
          <div class="footer-links">
            <a href="/faq">Частые вопросы</a>
            <a href="/register">Регистрация</a>
            <a href="mailto:hello@mentory.app">Поддержка</a>
          </div>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© 2026 Mentory. Все права защищены.</span>
        <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;">
          <span class="badge">RU</span>
          <span class="badge">EN</span>
        </div>
      </div>
    </div>
  </footer>
</div>

<style>
  /* Testimonial stars row */
  .testimonial-stars {
    display: flex;
    gap: 2px;
    margin-bottom: 14px;
  }

  /* Text-based avatar */
  .avatar-initials {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: var(--accent-muted);
    color: var(--accent);
    font-size: 0.85rem;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    letter-spacing: 0.02em;
  }

  /* CTA block */
  .cta-block {
    background: linear-gradient(135deg, var(--accent-soft) 0%, var(--violet-soft, var(--accent-muted)) 100%);
    border: 1px solid var(--accent);
    border-radius: var(--radius-xl);
    padding: 64px 32px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }

  .cta-icon {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: var(--accent);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 8px;
  }

  .cta-title {
    font-size: clamp(1.6rem, 3vw, 2.2rem);
    font-weight: 800;
    color: var(--ink);
    margin: 0;
  }

  .cta-sub {
    font-size: 1.05rem;
    color: var(--muted);
    max-width: 480px;
    margin: 0;
    line-height: 1.6;
  }

  .btn-lg {
    padding: 14px 28px;
    font-size: 1rem;
  }
</style>
