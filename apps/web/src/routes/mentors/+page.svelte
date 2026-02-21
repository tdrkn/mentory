<script lang="ts">
  import AppHeader from '$lib/components/AppHeader.svelte';
  import Loading from '$lib/components/Loading.svelte';
  import { api, ApiError } from '$lib/api';
  import { createQuery } from '@tanstack/svelte-query';
  import { Search, Star, Users, ChevronRight, SlidersHorizontal, X } from 'lucide-svelte';

  type Topic = { id: string; name: string };
  type MentorProfile = {
    id: string;
    fullName: string;
    avatarUrl: string | null;
    headline: string;
    bio: string;
    education: string | null;
    workplace: string | null;
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
  let showFilters = false;

  let topicId = '';
  let minPrice = '';
  let maxPrice = '';
  let minRating = '';
  let sort = '';
  let education = '';
  let workplace = '';
  let hobby = '';
  let skill = '';
  let searchQuery = '';

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
    queryKey: ['mentors', topicId, minPrice, maxPrice, minRating, sort, education, workplace, hobby, skill],
    queryFn: async () => {
      error = null;
      const params = new URLSearchParams();
      if (topicId) params.set('topicId', topicId);
      if (minPrice) params.set('minPrice', minPrice);
      if (maxPrice) params.set('maxPrice', maxPrice);
      if (minRating) params.set('minRating', minRating);
      if (sort) params.set('sort', sort);
      if (education) params.set('education', education);
      if (workplace) params.set('workplace', workplace);
      if (hobby) params.set('hobby', hobby);
      if (skill) params.set('skill', skill);

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

  $: filteredMentors = searchQuery
    ? mentors.filter(m => 
        m.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.headline?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.education?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.workplace?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.topics?.some(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : mentors;

  const clearFilters = () => {
    topicId = '';
    minPrice = '';
    maxPrice = '';
    minRating = '';
    sort = '';
    education = '';
    workplace = '';
    hobby = '';
    skill = '';
    searchQuery = '';
  };

  const hasActiveFilters = () =>
    topicId || minPrice || maxPrice || minRating || sort || education || workplace || hobby || skill;
</script>

<div class="page">
  <AppHeader />

  <main class="container section">
    <!-- Hero section -->
    <div class="mentors-hero reveal">
      <h1 class="section-title" style="font-size:2.25rem;">Найдите идеального ментора</h1>
      <p class="section-subtitle" style="max-width:560px;">
        Более {total > 0 ? total : '100'} экспертов готовы помочь вам с карьерой, навыками и профессиональным ростом.
      </p>

      <!-- Search bar -->
      <div class="search-bar">
        <Search size={20} />
        <input 
          class="search-input" 
          type="text" 
          placeholder="Поиск по имени, специальности или теме..." 
          bind:value={searchQuery}
        />
        <button class="btn btn-icon btn-ghost" on:click={() => showFilters = !showFilters}>
          <SlidersHorizontal size={20} />
        </button>
      </div>
    </div>

    <!-- Filters panel -->
    {#if showFilters}
      <div class="filters-panel card reveal">
        <div class="flex-between" style="margin-bottom:16px;">
          <h3 style="margin:0;">Фильтры</h3>
          {#if hasActiveFilters()}
            <button class="btn btn-sm btn-ghost" on:click={clearFilters}>
              <X size={14} /> Сбросить
            </button>
          {/if}
        </div>
        <div class="filters-grid">
          <div class="form-group">
            <div class="label">Тема</div>
            <select class="select" bind:value={topicId}>
              <option value="">Все темы</option>
              {#each topics as topic}
                <option value={topic.id}>{topic.name}</option>
              {/each}
            </select>
          </div>
          <div class="form-group">
            <div class="label">Мин. цена</div>
            <input class="input" type="number" min="0" placeholder="От" bind:value={minPrice} />
          </div>
          <div class="form-group">
            <div class="label">Макс. цена</div>
            <input class="input" type="number" min="0" placeholder="До" bind:value={maxPrice} />
          </div>
          <div class="form-group">
            <div class="label">Рейтинг</div>
            <select class="select" bind:value={minRating}>
              <option value="">Любой</option>
              <option value="4">4+ ⭐</option>
              <option value="4.5">4.5+ ⭐</option>
            </select>
          </div>
          <div class="form-group">
            <div class="label">Сортировка</div>
            <select class="select" bind:value={sort}>
              <option value="">По умолчанию</option>
              <option value="rating">По рейтингу</option>
              <option value="price_asc">Цена ↑</option>
              <option value="price_desc">Цена ↓</option>
              <option value="sessions">По кол-ву сессий</option>
            </select>
          </div>
          <div class="form-group">
            <div class="label">Образование</div>
            <input class="input" type="text" placeholder="Например, магистратура" bind:value={education} />
          </div>
          <div class="form-group">
            <div class="label">Место работы</div>
            <input class="input" type="text" placeholder="Например, продуктовая компания" bind:value={workplace} />
          </div>
          <div class="form-group">
            <div class="label">Хобби</div>
            <input class="input" type="text" placeholder="Например, спорт" bind:value={hobby} />
          </div>
          <div class="form-group">
            <div class="label">Навык</div>
            <input class="input" type="text" placeholder="Например, TypeScript" bind:value={skill} />
          </div>
        </div>
      </div>
    {/if}

    <!-- Quick topic filters -->
    <div class="topics-scroll reveal">
      <button 
        class={`topic-chip ${!topicId ? 'active' : ''}`} 
        on:click={() => topicId = ''}
      >
        Все
      </button>
      {#each topics.slice(0, 8) as topic}
        <button 
          class={`topic-chip ${topicId === topic.id ? 'active' : ''}`}
          on:click={() => topicId = topic.id}
        >
          {topic.name}
        </button>
      {/each}
    </div>

    <!-- Results info -->
    <div class="results-info">
      <span class="muted">
        {#if isLoading}
          Загрузка...
        {:else}
          Найдено: <strong>{filteredMentors.length}</strong> менторов
        {/if}
      </span>
    </div>

    {#if isLoading}
      <Loading />
    {:else}
      {#if error}
        <div class="alert alert-error" style="margin-bottom:24px;">
          {error}
        </div>
      {/if}

      {#if filteredMentors.length === 0}
        <div class="empty-state card">
          <div class="empty-icon">
            <Users size={48} />
          </div>
          <h3>Менторы не найдены</h3>
          <p class="muted">Попробуйте изменить фильтры или поисковый запрос.</p>
          <button class="btn btn-outline" on:click={clearFilters}>Сбросить фильтры</button>
        </div>
      {:else}
        <div class="mentors-grid">
          {#each filteredMentors as mentor, i}
            <a class="mentor-card reveal" href={`/mentors/${mentor.id}`} style={`animation-delay:${i * 0.05}s`}>
              <div class="mentor-card-header">
                <div class="avatar avatar-lg">
                  {#if mentor.avatarUrl}
                    <img src={mentor.avatarUrl} alt={mentor.fullName} />
                  {:else}
                    {mentor.fullName?.charAt(0) || 'M'}
                  {/if}
                </div>
                <div class="mentor-card-info">
                  <div class="mentor-card-name">{mentor.fullName}</div>
                  <div class="mentor-card-title">{mentor.headline || 'Эксперт'}</div>
                  {#if mentor.workplace || mentor.education}
                    <div class="mentor-card-subtitle muted">
                      {[mentor.workplace, mentor.education].filter(Boolean).join(' • ')}
                    </div>
                  {/if}
                  <div class="mentor-card-meta">
                    <span class="rating">
                      <Star size={14} fill="currentColor" />
                      {mentor.rating?.average || '0'}
                    </span>
                    <span class="muted">
                      <Users size={14} style="display:inline;vertical-align:-2px;" />
                      {mentor.completedSessions} сессий
                    </span>
                  </div>
                </div>
              </div>

              {#if mentor.topics?.length}
                <div class="mentor-card-topics">
                  {#each (mentor.topics || []).slice(0, 3) as topic}
                    <span class="tag">{topic.name}</span>
                  {/each}
                  {#if mentor.topics.length > 3}
                    <span class="tag violet">+{mentor.topics.length - 3}</span>
                  {/if}
                </div>
              {/if}

              <div class="mentor-card-footer">
                <div class="mentor-card-price">
                  {mentor.startingPrice 
                    ? `${mentor.startingPrice.priceAmount} ${mentor.startingPrice.currency}` 
                    : 'По запросу'}
                  {#if mentor.startingPrice}
                    <span>/ {mentor.startingPrice.durationMin} мин</span>
                  {/if}
                </div>
                <span class="view-profile">
                  Профиль <ChevronRight size={16} />
                </span>
              </div>
            </a>
          {/each}
        </div>
      {/if}
    {/if}
  </main>
</div>

<style>
  .mentors-hero {
    text-align: center;
    padding: 40px 0 32px;
  }

  .search-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    max-width: 600px;
    margin: 24px auto 0;
    background: var(--surface);
    border: 1.5px solid var(--border);
    border-radius: var(--radius-xl);
    padding: 8px 16px;
    transition: all 0.2s ease;
  }

  .search-bar:focus-within {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-muted);
  }

  .search-input {
    flex: 1;
    border: none;
    background: transparent;
    font-size: 1rem;
    padding: 8px 0;
    outline: none;
    font-family: var(--font-body);
    color: var(--ink);
  }

  .search-input::placeholder {
    color: var(--muted-light);
  }

  .filters-panel {
    margin-bottom: 24px;
  }

  .filters-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 16px;
  }

  .topics-scroll {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    padding: 8px 0 16px;
    margin-bottom: 8px;
    scrollbar-width: none;
  }

  .topics-scroll::-webkit-scrollbar {
    display: none;
  }

  .topic-chip {
    flex-shrink: 0;
    padding: 8px 16px;
    border-radius: 999px;
    border: 1.5px solid var(--border);
    background: var(--surface);
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--ink-secondary);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .topic-chip:hover {
    border-color: var(--accent);
    color: var(--accent);
  }

  .topic-chip.active {
    background: var(--accent);
    border-color: var(--accent);
    color: #fff;
  }

  .results-info {
    margin-bottom: 24px;
  }

  .mentor-card-subtitle {
    font-size: 0.82rem;
    margin-top: 2px;
  }

  .mentors-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 24px;
  }

  .empty-state {
    text-align: center;
    padding: 64px 24px;
  }

  .empty-icon {
    width: 80px;
    height: 80px;
    margin: 0 auto 24px;
    background: var(--bg-alt);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--muted);
  }

  .view-profile {
    display: flex;
    align-items: center;
    gap: 4px;
    color: var(--accent);
    font-weight: 500;
    font-size: 0.875rem;
  }

  @media (max-width: 768px) {
    .mentors-grid {
      grid-template-columns: 1fr;
    }

    .filters-grid {
      grid-template-columns: 1fr 1fr;
    }
  }
</style>
