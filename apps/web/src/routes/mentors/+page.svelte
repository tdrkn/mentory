<script lang="ts">
  import AppHeader from '$lib/components/AppHeader.svelte';
  import Loading from '$lib/components/Loading.svelte';
  import { api, ApiError } from '$lib/api';
  import { createQuery } from '@tanstack/svelte-query';

  type Topic = { id: string; name: string };
  type MentorProfile = {
    id: string;
    fullName: string;
    avatarUrl: string | null;
    headline: string;
    bio: string;
    languages: string[];
    rating: { average: number; count: number };
    topics: { id: string; name: string }[];
    startingPrice: {
      id: string;
      mentorId: string;
      title: string;
      durationMin: number;
      priceAmount: string;
      currency: string;
      isActive: boolean;
    } | null;
    completedSessions: number;
  };

  let topics: Topic[] = [];
  let mentors: MentorProfile[] = [];
  let total = 0;
  let isLoading = false;
  let error: string | null = null;

  let topicId = '';
  let minPrice = '';
  let maxPrice = '';
  let minRating = '';
  let sort = '';

  const topicsQuery = createQuery({
    queryKey: ['topics'],
    queryFn: async () => {
      try {
        return await api.get<Topic[]>('/topics');
      } catch {
        return [];
      }
    },
  });

  $: mentorsQuery = createQuery({
    queryKey: ['mentors', topicId, minPrice, maxPrice, minRating, sort],
    queryFn: async () => {
      error = null;
      const params = new URLSearchParams();
      if (topicId) params.set('topicId', topicId);
      if (minPrice) params.set('minPrice', minPrice);
      if (maxPrice) params.set('maxPrice', maxPrice);
      if (minRating) params.set('minRating', minRating);
      if (sort) params.set('sort', sort);

      const query = params.toString() ? `?${params.toString()}` : '';
      try {
        return await api.get<{ data: MentorProfile[]; meta: { total: number } }>(`/mentors${query}`);
      } catch (err) {
        if (err instanceof ApiError) {
          error = 'Не удалось загрузить менторов';
        } else {
          error = 'Ошибка соединения';
        }
        return { data: [], meta: { total: 0 } };
      }
    },
  });

  $: topics = $topicsQuery.data || [];
  $: mentors = $mentorsQuery.data?.data || [];
  $: total = $mentorsQuery.data?.meta?.total || 0;
  $: isLoading =
    $mentorsQuery.isLoading ??
    $mentorsQuery.isPending ??
    $mentorsQuery.status === 'pending';
</script>

<div class="page">
  <AppHeader />

  <main class="container section">
    <h1 class="section-title">Найти ментора</h1>

    <div class="card" style="margin:18px 0;">
      <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;">
        <select class="select" bind:value={topicId}>
          <option value="">Все темы</option>
          {#each topics as topic}
            <option value={topic.id}>{topic.name}</option>
          {/each}
        </select>
        <input class="input" type="number" min="0" placeholder="Мин. цена" bind:value={minPrice} />
        <input class="input" type="number" min="0" placeholder="Макс. цена" bind:value={maxPrice} />
        <select class="select" bind:value={minRating}>
          <option value="">Любой рейтинг</option>
          <option value="4">4+ ⭐</option>
          <option value="4.5">4.5+ ⭐</option>
        </select>
        <select class="select" bind:value={sort}>
          <option value="">Сортировка</option>
          <option value="rating">По рейтингу</option>
          <option value="price_asc">Цена ↑</option>
          <option value="price_desc">Цена ↓</option>
          <option value="sessions">По кол-ву сессий</option>
        </select>
      </div>
    </div>

    {#if isLoading}
      <Loading />
    {:else}
      <p class="muted">Найдено: {total} менторов</p>

      {#if error}
        <div class="surface" style="margin-top:16px;background:#fee2e2;border-color:#fecaca;color:#991b1b;">
          {error}
        </div>
      {/if}

      {#if mentors.length === 0}
        <div class="card" style="margin-top:18px;">
          <p class="muted">Менторы не найдены. Попробуйте изменить фильтры.</p>
        </div>
      {:else}
        <div class="grid cols-3" style="margin-top:18px;">
          {#each mentors as mentor}
            <a class="card" href={`/mentors/${mentor.id}`}>
              <div style="display:flex;gap:14px;align-items:center;">
                <div style="width:54px;height:54px;border-radius:50%;background:#e7f5f3;display:flex;align-items:center;justify-content:center;font-weight:700;color:var(--accent);">
                  {mentor.fullName?.charAt(0) || 'M'}
                </div>
                <div>
                  <strong>{mentor.fullName}</strong>
                  <div class="muted" style="font-size:0.9rem;">{mentor.headline || 'Эксперт'}</div>
                  <div style="display:flex;gap:8px;align-items:center;margin-top:4px;">
                    <span class="badge">⭐ {mentor.rating?.average || 0}</span>
                    <span class="muted">{mentor.completedSessions} сессий</span>
                  </div>
                </div>
              </div>

              <div style="margin-top:14px;display:flex;flex-wrap:wrap;gap:6px;">
                {#each (mentor.topics || []).slice(0, 3) as topic}
                  <span class="tag">{topic.name}</span>
                {/each}
              </div>

              <div style="margin-top:14px;display:flex;justify-content:space-between;align-items:center;">
                <strong style="color:var(--accent);">
                  {mentor.startingPrice ? `${mentor.startingPrice.priceAmount} ${mentor.startingPrice.currency}` : 'Цена по запросу'}
                </strong>
                <span class="muted">→</span>
              </div>
            </a>
          {/each}
        </div>
      {/if}
    {/if}
  </main>
</div>
