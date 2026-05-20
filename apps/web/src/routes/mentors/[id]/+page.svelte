<script lang="ts">
  import AppHeader from '$lib/components/AppHeader.svelte';
  import Loading from '$lib/components/Loading.svelte';
  import { api } from '$lib/api';
  import { getApiUrl } from '$lib/env';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { user } from '$lib/stores/auth';
  import {
    BriefcaseBusiness,
    Calendar,
    CheckCircle2,
    MessageCircle,
    Star,
    Users,
  } from 'lucide-svelte';

  interface MentorDetail {
    id: string;
    fullName: string;
    avatarUrl?: string | null;
    timezone: string;
    createdAt: string;
    mentorProfile: {
      headline?: string | null;
      bio?: string | null;
      education?: string | null;
      position?: string | null;
      workplace?: string | null;
      activityFields?: string[];
      hobbies?: string[];
      skills?: string[];
      languages: string[];
      ratingAvg: string;
      ratingCount: number;
      topics?: { topic: { id: string; name: string } }[];
      verificationStatus?: string | null;
    };
    regaliaUploaded?: {
      id: string;
      title?: string | null;
      fileName: string;
      fileUrl: string;
      status: string;
    }[];
    mentorServices: {
      id: string;
      title: string;
      durationMin: number;
      priceAmount: string;
      currency: string;
    }[];
    mentorPlans?: {
      id: string;
      title: string;
      description?: string | null;
      kind: string;
      priceAmount: string;
      currency: string;
      billingIntervalMonths: number;
      callsPerMonth?: number | null;
      sessionDurationMin?: number | null;
      responseTimeHours?: number | null;
      includesUnlimitedChat: boolean;
    }[];
    _count: { sessionsAsMentor: number };
  }

  interface ReviewItem {
    id: string;
    rating: number;
    text?: string | null;
    mentee?: { fullName: string };
  }

  interface Slot {
    id: string;
    startAt: string;
    endAt: string;
    status: string;
  }

  let mentor: MentorDetail | null = null;
  let reviews: ReviewItem[] = [];
  let isLoading = true;
  let error: string | null = null;

  // ── Sidebar state ──────────────────────────────────────────────
  let selectedServiceId: string | null = null;
  let selectedPlanId: string | null = null;
  let nearestSlot: string | null = null;

  $: isOwnProfile = !!mentor && $user?.id === mentor.id;
  $: canBook = !!$user && $user.role !== 'mentor' && !isOwnProfile;
  $: isVerified = mentor?.mentorProfile?.verificationStatus === 'verified';
  $: hasPlans = (mentor?.mentorPlans?.length ?? 0) > 0;
  $: hasServices = (mentor?.mentorServices?.length ?? 0) > 0;

  const resolveFileUrl = (value?: string | null) => {
    if (!value) return '';
    if (value.startsWith('http') || value.startsWith('data:')) return value;
    return `${getApiUrl()}${value}`;
  };

  const formatMoney = (amount: string | number, currency: string) => {
    const value = Number(amount);
    if (!Number.isFinite(value)) return `${amount} ${currency}`;
    return `${value.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ${currency}`;
  };

  const normalizeRating = (value?: string | number | null) => {
    const numeric = Number(value || 0);
    return numeric > 0 ? numeric.toFixed(1) : '0.0';
  };

  const planFeatures = (plan: MentorDetail['mentorPlans'][number]) => {
    const explicit = (plan.description || '')
      .split('\n')
      .map((item) => item.replace(/^[-•]\s*/, '').trim())
      .filter(Boolean);

    if (explicit.length > 0) return explicit;

    return [
      plan.includesUnlimitedChat ? 'Поддержка в чате' : null,
      plan.callsPerMonth ? `${plan.callsPerMonth} созвона с ментором` : null,
      plan.responseTimeHours ? `Ответ до ${plan.responseTimeHours} ч` : null,
      'Видео-встречи',
    ].filter(Boolean) as string[];
  };

  const activityItems = (profile: MentorDetail['mentorProfile']) => {
    if (profile.activityFields?.length) return profile.activityFields;
    return profile.topics?.map((item) => item.topic.name) || [];
  };

  const formatSlotHint = (isoString: string) => {
    return new Date(isoString).toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const loadNearestSlot = async (id: string) => {
    try {
      const data = await api.get<{ slots?: Slot[] }>(`/scheduling/mentors/${id}/slots`);
      const slots: Slot[] = data.slots || (Array.isArray(data) ? (data as unknown as Slot[]) : []);
      const free = slots
        .filter((s) => s.status === 'free')
        .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
      nearestSlot = free.length ? free[0].startAt : null;
    } catch {
      nearestSlot = null;
    }
  };

  const loadMentor = async (id: string) => {
    try {
      const mentorData = await api.get<MentorDetail>(`/mentors/${id}`);
      mentor = mentorData;

      // Pre-select first service and plan
      if (mentorData.mentorServices?.length) {
        selectedServiceId = mentorData.mentorServices[0].id;
      }
      if (mentorData.mentorPlans?.length) {
        selectedPlanId = mentorData.mentorPlans[0].id;
      }

      // Load nearest slot in parallel
      loadNearestSlot(id);

      try {
        const reviewData = await api.get<{ data: ReviewItem[] }>(`/mentors/${id}/reviews?limit=3`);
        reviews = reviewData.data || [];
      } catch {
        reviews = [];
      }
    } catch {
      error = 'Не удалось загрузить профиль ментора';
    } finally {
      isLoading = false;
    }
  };

  const handleBook = () => {
    if (!mentor || !selectedServiceId) return;
    goto(`/booking/new?serviceId=${selectedServiceId}&mentorId=${mentor.id}`);
  };

  const handleSubscribe = () => {
    if (!mentor || !selectedPlanId) return;
    goto(`/subscriptions/new?planId=${selectedPlanId}&mentorId=${mentor.id}`);
  };

  onMount(() => {
    loadMentor($page.params.id);
  });
</script>

<svelte:head>
  <title>{mentor ? `${mentor.fullName} — Mentory` : 'Профиль ментора — Mentory'}</title>
</svelte:head>

<div class="page">
  <AppHeader />

  {#if isLoading}
    <Loading />
  {:else if error && !mentor}
    <main class="mentor-view-shell">
      <section class="profile-card empty-state">
        <h1>Ментор не найден</h1>
        <p>{error}</p>
        <a class="btn btn-outline" href="/mentors">Вернуться к каталогу</a>
      </section>
    </main>
  {:else if mentor}
    <main class="mentor-view-shell">
      <div class="mentor-view-header">
        <div class="title-row">
          <h1>Просмотр профиля</h1>
          {#if isVerified}
            <span class="verified-badge">Профиль верифицирован</span>
          {/if}
        </div>
        {#if isOwnProfile}
          <a class="btn btn-primary" href="/profile/edit">Редактировать</a>
        {/if}
      </div>

      <div class="mentor-grid">
        <div class="mentor-main">
          <section class="profile-card hero-card">
            <div class="avatar">
              {#if mentor.avatarUrl}
                <img src={resolveFileUrl(mentor.avatarUrl)} alt="Фото ментора" />
              {:else}
                <span>{mentor.fullName.slice(0, 1)}</span>
              {/if}
            </div>
            <div class="hero-info">
              <h2>{mentor.fullName}</h2>
              <p>Ментор</p>
              <div class="hero-stats">
                <span class="rating">
                  <Star size={16} fill="currentColor" />
                  <strong>{normalizeRating(mentor.mentorProfile?.ratingAvg)}</strong>
                  <span>({mentor.mentorProfile?.ratingCount || 0} отзывов)</span>
                </span>
                <span>
                  <Users size={16} />
                  {mentor._count?.sessionsAsMentor || 0} сессии
                </span>
              </div>
            </div>
          </section>

          <section class="profile-card">
            <h2 class="section-title">
              <MessageCircle size={20} />
              О себе
            </h2>
            <p class="plain-text">{mentor.mentorProfile?.bio || 'Описание пока не добавлено.'}</p>
          </section>

          <section class="profile-card career-card">
            <h2>Карьера</h2>
            <div class="career-list">
              <div>
                <span>Образование</span>
                <strong>{mentor.mentorProfile?.education || 'Не указано'}</strong>
              </div>
              <div>
                <span>Должность</span>
                <strong>{mentor.mentorProfile?.position || 'Не указано'}</strong>
              </div>
              <div>
                <span>Место работы</span>
                <strong>{mentor.mentorProfile?.workplace || 'Не указано'}</strong>
              </div>
              <div>
                <span>Сфера деятельности</span>
                {#if activityItems(mentor.mentorProfile).length}
                  <div class="chip-row">
                    {#each activityItems(mentor.mentorProfile) as item}
                      <span class="outline-chip">{item}</span>
                    {/each}
                  </div>
                {:else}
                  <strong>Не указано</strong>
                {/if}
              </div>
            </div>
          </section>

          <section class="profile-card">
            <h2>Навыки</h2>
            {#if mentor.mentorProfile?.skills?.length}
              <div class="chip-grid">
                {#each mentor.mentorProfile.skills as skill}
                  <span class="outline-chip">{skill}</span>
                {/each}
              </div>
            {:else}
              <p class="plain-text">Навыки пока не добавлены.</p>
            {/if}
          </section>

          <section class="profile-card">
            <h2>Хобби</h2>
            {#if mentor.mentorProfile?.hobbies?.length}
              <div class="chip-grid">
                {#each mentor.mentorProfile.hobbies as hobby}
                  <span class="outline-chip">{hobby}</span>
                {/each}
              </div>
            {:else}
              <p class="plain-text">Хобби пока не добавлены.</p>
            {/if}
          </section>

          <section class="profile-card">
            <h2>Достижения</h2>
            {#if mentor.regaliaUploaded?.length}
              <div class="achievement-list">
                {#each mentor.regaliaUploaded as item}
                  <a class="achievement-item" href={resolveFileUrl(item.fileUrl)} target="_blank" rel="noreferrer">
                    <span>{item.title || item.fileName}</span>
                    <CheckCircle2 size={18} />
                  </a>
                {/each}
              </div>
            {:else}
              <p class="plain-text">Достижения пока не добавлены.</p>
            {/if}
          </section>

          <section class="profile-card reviews-card">
            <h2>Отзывы</h2>
            {#if reviews.length}
              <div class="review-list">
                {#each reviews as review}
                  <div class="review-item">
                    <div class="review-avatar">{review.mentee?.fullName?.slice(0, 1) || 'M'}</div>
                    <p>{review.text || 'Отзыв без текста.'}</p>
                    <div class="review-rating">
                      <strong>{normalizeRating(review.rating)}</strong>
                      <Star size={16} fill="currentColor" />
                    </div>
                  </div>
                {/each}
              </div>
            {:else}
              <p class="plain-text">Отзывы появятся после завершенных сессий.</p>
            {/if}
          </section>
        </div>

        <!-- ── SIDEBAR ── -->
        <aside class="mentor-sidebar">
          <section class="profile-card booking-card">
            <h2 class="sidebar-title">
              <Calendar size={18} />
              Планы подписки
            </h2>

            {#if hasPlans}
              <div class="option-list">
                {#each mentor.mentorPlans as plan}
                  <button
                    class="option-card {selectedPlanId === plan.id ? 'option-selected' : ''}"
                    on:click={() => (selectedPlanId = plan.id)}
                  >
                    <span class="option-title">{plan.title}</span>
                    <div class="plan-facts">
                      <span>{formatMoney(plan.priceAmount, plan.currency)}</span>
                      <span>{Math.max(1, plan.billingIntervalMonths || 1) * 30} дней</span>
                      {#if plan.callsPerMonth}
                        <span>{plan.callsPerMonth} сессии</span>
                      {/if}
                      {#if plan.sessionDurationMin}
                        <span>{plan.sessionDurationMin} мин</span>
                      {/if}
                    </div>
                    {#if planFeatures(plan).length}
                      <ul class="plan-features">
                        {#each planFeatures(plan).slice(0, 3) as feat}
                          <li>{feat}</li>
                        {/each}
                      </ul>
                    {/if}
                  </button>
                {/each}
              </div>

              {#if canBook}
                <button
                  class="btn btn-primary cta-btn"
                  on:click={handleSubscribe}
                  disabled={!selectedPlanId}
                >
                  Отправить запрос
                </button>
              {/if}
            {:else}
              <p class="plain-text tab-empty">У ментора пока нет планов подписки.</p>
            {/if}
          </section>

          <section class="profile-card booking-card">
            <h2 class="sidebar-title">
              <BriefcaseBusiness size={18} />
              Разовые сессии и услуги
            </h2>

            {#if hasServices}
              <div class="option-list">
                {#each mentor.mentorServices as service}
                  <button
                    class="option-card {selectedServiceId === service.id ? 'option-selected' : ''}"
                    on:click={() => (selectedServiceId = service.id)}
                  >
                    <span class="option-title">{service.title}</span>
                    <div class="option-meta">
                      <span class="option-price">{formatMoney(service.priceAmount, service.currency)}</span>
                      <span class="option-dur">{service.durationMin} мин</span>
                    </div>
                  </button>
                {/each}
              </div>

              {#if nearestSlot}
                <p class="slot-hint">Ближайший свободный слот: {formatSlotHint(nearestSlot)}</p>
              {:else}
                <p class="slot-hint slot-hint-none">Свободных слотов пока нет</p>
              {/if}

              {#if canBook}
                <button
                  class="btn btn-primary cta-btn"
                  on:click={handleBook}
                  disabled={!selectedServiceId}
                >
                  Забронировать
                </button>
                <p class="hold-notice">Слот удерживается 10 минут для оплаты</p>
              {/if}
            {:else}
              <p class="plain-text tab-empty">У ментора пока нет разовых услуг.</p>
            {/if}
          </section>
        </aside>
      </div>
    </main>
  {/if}
</div>

<style>
  .mentor-view-shell {
    width: 100%;
    max-width: 1060px;
    margin: 0 auto;
    padding: 60px 20px 120px;
  }

  .mentor-view-header,
  .title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }

  .title-row {
    justify-content: flex-start;
  }

  h1,
  h2,
  p {
    margin: 0;
  }

  h1,
  h2 {
    color: var(--ink);
    font-family: var(--font-body);
    line-height: 1.15;
  }

  h1 {
    font-size: 1.75rem;
    font-weight: 800;
  }

  h2 {
    font-size: 1.5rem;
    font-weight: 800;
  }

  .verified-badge {
    border: 1px solid var(--status-success-border);
    color: var(--status-success-ink);
    background: var(--surface);
    border-radius: var(--radius-md);
    padding: 12px 18px;
    font-weight: 600;
  }

  .mentor-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 320px;
    gap: 28px;
    margin-top: 24px;
    align-items: start;
  }

  .mentor-main,
  .mentor-sidebar,
  .review-list,
  .achievement-list {
    display: flex;
    flex-direction: column;
  }

  .mentor-main,
  .mentor-sidebar {
    gap: 20px;
    min-width: 0;
  }

  .profile-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 24px;
  }

  .hero-card {
    display: flex;
    align-items: center;
    gap: 24px;
    min-height: 132px;
  }

  .avatar {
    width: 82px;
    height: 82px;
    flex: 0 0 82px;
    border: 2px solid var(--accent);
    border-radius: 18px;
    overflow: hidden;
    background: var(--accent-soft);
    color: var(--accent);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2.4rem;
    font-weight: 800;
  }

  .avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .hero-info {
    min-width: 0;
  }

  .hero-info h2 {
    font-size: 1.8rem;
    margin-bottom: 6px;
  }

  .hero-info p,
  .plain-text,
  .career-list span {
    color: var(--muted);
  }

  .hero-stats {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 14px;
    margin-top: 10px;
  }

  .hero-stats span,
  .rating {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--ink-secondary);
  }

  .rating :global(svg),
  .review-rating :global(svg) {
    color: var(--amber);
  }

  .rating strong,
  .review-rating strong {
    color: var(--ink);
    font-size: 1.45rem;
    line-height: 1;
  }

  .section-title {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .plain-text {
    margin-top: 12px;
    line-height: 1.55;
  }

  .career-card h2,
  .profile-card > h2 {
    margin-bottom: 18px;
  }

  .career-list {
    display: grid;
    gap: 14px;
  }

  .career-list span {
    display: block;
    margin-bottom: 4px;
  }

  .career-list strong {
    color: var(--ink-secondary);
    font-weight: 700;
  }

  .chip-row,
  .chip-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }

  .chip-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .outline-chip {
    min-height: 42px;
    border: 1.5px solid var(--accent);
    border-radius: var(--radius-md);
    color: var(--accent);
    background: var(--surface);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 10px 18px;
    font-weight: 700;
    text-align: center;
  }

  .achievement-list,
  .review-list {
    gap: 12px;
  }

  .achievement-item {
    min-height: 52px;
    border: 1.5px solid var(--accent);
    border-radius: var(--radius-md);
    background: var(--accent-soft);
    color: var(--accent);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 14px 18px;
    font-weight: 700;
  }

  .achievement-item span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .review-item {
    display: grid;
    grid-template-columns: 48px minmax(0, 1fr) auto;
    gap: 16px;
    align-items: center;
    border: 1.5px solid var(--accent);
    border-radius: var(--radius-md);
    background: var(--accent-soft);
    padding: 14px;
  }

  .review-avatar {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: var(--surface);
    color: var(--accent);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
  }

  .review-item p {
    background: var(--surface);
    border-radius: var(--radius-md);
    padding: 12px 16px;
    color: var(--ink-secondary);
    line-height: 1.45;
  }

  .review-rating {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  /* ── Booking card (sidebar) ── */
  .booking-card {
    padding: 20px;
  }

  .mentor-sidebar {
    position: sticky;
    top: 24px;
  }

  .sidebar-title {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 16px;
    font-size: 1.05rem;
  }

  .option-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 14px;
  }

  .option-card {
    width: 100%;
    text-align: left;
    background: var(--bg-alt);
    border: 1.5px solid var(--border);
    border-radius: var(--radius-md);
    padding: 14px 16px;
    cursor: pointer;
    transition: all 0.15s ease;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .option-card:hover {
    border-color: var(--accent);
  }

  .option-card.option-selected {
    border-color: var(--accent);
    background: var(--accent-muted);
  }

  .option-title {
    font-weight: 700;
    font-size: 0.9rem;
    color: var(--ink);
    line-height: 1.3;
  }

  .option-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .plan-facts {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .plan-facts span {
    min-height: 36px;
    border-radius: var(--radius-sm);
    background: var(--surface);
    color: var(--accent);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 8px 10px;
    font-size: 0.82rem;
    font-weight: 800;
    text-align: center;
  }

  .option-price {
    font-weight: 800;
    font-size: 1rem;
    color: var(--accent);
  }

  .option-dur {
    font-size: 0.82rem;
    color: var(--muted);
  }

  .plan-features {
    margin: 4px 0 0;
    padding-left: 16px;
    font-size: 0.8rem;
    color: var(--ink-secondary);
    line-height: 1.5;
  }

  .slot-hint {
    font-size: 0.82rem;
    color: var(--accent);
    margin: 0 0 14px;
    font-weight: 500;
  }

  .slot-hint-none {
    color: var(--muted);
  }

  .cta-btn {
    width: 100%;
    justify-content: center;
  }

  .hold-notice {
    font-size: 0.78rem;
    color: var(--muted);
    text-align: center;
    margin-top: 8px;
  }

  .tab-empty {
    margin-top: 8px;
    font-size: 0.9rem;
  }

  .empty-state {
    text-align: center;
  }

  .empty-state p {
    margin: 12px 0 20px;
    color: var(--muted);
  }

  @media (max-width: 900px) {
    .mentor-grid {
      grid-template-columns: minmax(0, 1fr);
    }

    .chip-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .mentor-sidebar {
      position: static;
    }
  }

  @media (max-width: 560px) {
    .mentor-view-shell {
      padding: 32px 16px 80px;
    }

    .hero-card,
    .review-item {
      grid-template-columns: minmax(0, 1fr);
      flex-direction: column;
      align-items: flex-start;
    }

    .chip-grid {
      grid-template-columns: minmax(0, 1fr);
    }

    .hero-info h2 {
      font-size: 1.45rem;
    }

    .outline-chip {
      width: 100%;
    }
  }
</style>
