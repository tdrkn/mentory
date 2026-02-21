<script lang="ts">
  import AppHeader from '$lib/components/AppHeader.svelte';
  import Loading from '$lib/components/Loading.svelte';
  import { api, ApiError } from '$lib/api';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { user } from '$lib/stores/auth';
  import { goto } from '$app/navigation';
  import { Star, Clock, Users, Globe, CheckCircle2, Calendar, ArrowLeft, MessageCircle, Video, ChevronRight } from 'lucide-svelte';

  interface MentorDetail {
    id: string;
    fullName: string;
    timezone: string;
    createdAt: string;
    mentorProfile: {
      headline: string;
      bio: string;
      education?: string | null;
      workplace?: string | null;
      goals?: string[];
      hobbies?: string[];
      languages: string[];
      ratingAvg: string;
      ratingCount: number;
      topics: { topic: { id: string; name: string } }[];
    };
    mentorServices: {
      id: string;
      title: string;
      durationMin: number;
      priceAmount: string;
      currency: string;
    }[];
    _count: { sessionsAsMentor: number };
  }

  interface Slot {
    id: string;
    startAt: string;
    endAt: string;
    status: string;
  }

  let mentor: MentorDetail | null = null;
  let slots: Slot[] = [];
  let selectedSlot: string | null = null;
  let selectedService: string | null = null;
  let isLoading = true;
  let isBooking = false;
  let error: string | null = null;

  const loadMentor = async (id: string) => {
    try {
      const mentorData = await api.get<MentorDetail>(`/mentors/${id}`);
      mentor = mentorData;
      selectedService = mentorData.mentorServices?.[0]?.id || null;

      try {
        const slotsResponse = await api.get<{ slots: Slot[] }>(`/scheduling/mentors/${id}/slots`);
        slots = (slotsResponse.slots || []).filter((s) => s.status === 'free');
      } catch {
        slots = [];
      }
    } catch {
      error = 'Не удалось загрузить профиль ментора';
    } finally {
      isLoading = false;
    }
  };

  onMount(() => {
    loadMentor($page.params.id);
  });

  const groupedSlots = () => {
    const map: Record<string, Slot[]> = {};
    slots.forEach((slot) => {
      const date = new Date(slot.startAt).toLocaleDateString('ru-RU', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      });
      if (!map[date]) map[date] = [];
      map[date].push(slot);
    });
    return map;
  };

  const handleHold = async () => {
    if (!selectedSlot || !selectedService) return;

    if (!$user) {
      goto(`/login?redirect=/mentors/${$page.params.id}`);
      return;
    }

    isBooking = true;
    error = null;

    try {
      const result = await api.post<{ session: { id: string } }>('/booking/hold', {
        slotId: selectedSlot,
        serviceId: selectedService,
      });
      goto(`/checkout/${result.session.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        error = 'Этот слот уже занят. Выберите другое время.';
      } else {
        error = 'Не удалось забронировать слот.';
      }
      selectedSlot = null;
      try {
        const slotsResponse = await api.get<{ slots: Slot[] }>(`/scheduling/mentors/${$page.params.id}/slots`);
        slots = (slotsResponse.slots || []).filter((s) => s.status === 'free');
      } catch {
        slots = [];
      }
    } finally {
      isBooking = false;
    }
  };

  $: selectedServiceData = mentor?.mentorServices?.find(s => s.id === selectedService);
</script>

<div class="page">
  <AppHeader />

  {#if isLoading}
    <Loading />
  {:else if error && !mentor}
    <main class="container section">
      <div class="error-state card">
        <h2>Ментор не найден</h2>
        <p class="muted">{error || 'Проверьте ссылку.'}</p>
        <a class="btn btn-outline" href="/mentors">
          <ArrowLeft size={16} /> Вернуться к каталогу
        </a>
      </div>
    </main>
  {:else if mentor}
    <main class="container section">
      <!-- Back link -->
      <a class="back-link" href="/mentors">
        <ArrowLeft size={16} /> Все менторы
      </a>

      <div class="mentor-layout">
        <!-- Main content -->
        <div class="mentor-main">
          <!-- Profile header -->
          <div class="profile-header card">
            <div class="profile-avatar">
              {mentor.fullName.charAt(0)}
            </div>
            <div class="profile-info">
              <h1 class="profile-name">{mentor.fullName}</h1>
              <p class="profile-headline">{mentor.mentorProfile?.headline || 'Эксперт'}</p>
              
              <div class="profile-stats">
                <div class="profile-stat">
                  <Star size={16} fill="currentColor" class="star-icon" />
                  <span class="stat-value">{mentor.mentorProfile?.ratingAvg || '0'}</span>
                  <span class="muted">({mentor.mentorProfile?.ratingCount || 0} отзывов)</span>
                </div>
                <div class="profile-stat">
                  <Users size={16} />
                  <span>{mentor._count?.sessionsAsMentor || 0} сессий</span>
                </div>
                {#if mentor.mentorProfile?.languages?.length}
                  <div class="profile-stat">
                    <Globe size={16} />
                    <span>{mentor.mentorProfile.languages.join(', ')}</span>
                  </div>
                {/if}
              </div>
            </div>
          </div>

          <!-- Bio -->
          <div class="card">
            <h2 class="card-title">
              <MessageCircle size={20} /> О менторе
            </h2>
            <p class="bio-text">{mentor.mentorProfile?.bio || 'Описание не указано.'}</p>
          </div>

          <div class="card">
            <h2 class="card-title">Профиль ментора</h2>
            <div class="stack" style="gap:10px;">
              <div>
                <div class="muted">Место работы</div>
                <div>{mentor.mentorProfile?.workplace || 'Не указано'}</div>
              </div>
              <div>
                <div class="muted">Образование</div>
                <div>{mentor.mentorProfile?.education || 'Не указано'}</div>
              </div>
              <div>
                <div class="muted">Хобби</div>
                <div>
                  {#if mentor.mentorProfile?.hobbies?.length}
                    {mentor.mentorProfile.hobbies.join(', ')}
                  {:else}
                    Не указано
                  {/if}
                </div>
              </div>
              <div>
                <div class="muted">Цели</div>
                <div>
                  {#if mentor.mentorProfile?.goals?.length}
                    {mentor.mentorProfile.goals.join(', ')}
                  {:else}
                    Не указано
                  {/if}
                </div>
              </div>
            </div>
          </div>

          <!-- Topics -->
          {#if mentor.mentorProfile?.topics?.length}
            <div class="card">
              <h2 class="card-title">
                <CheckCircle2 size={20} /> Экспертиза
              </h2>
              <div class="topics-grid">
                {#each mentor.mentorProfile.topics as topic}
                  <span class="topic-badge">
                    <CheckCircle2 size={14} /> {topic.topic.name}
                  </span>
                {/each}
              </div>
            </div>
          {/if}

          <!-- Services -->
          {#if mentor.mentorServices?.length}
            <div class="card">
              <h2 class="card-title">
                <Video size={20} /> Услуги
              </h2>
              <div class="services-list">
                {#each mentor.mentorServices as service}
                  <button
                    class="service-card {selectedService === service.id ? 'selected' : ''}"
                    on:click={() => (selectedService = service.id)}
                  >
                    <div class="service-info">
                      <div class="service-name">{service.title}</div>
                      <div class="service-duration">
                        <Clock size={14} /> {service.durationMin} минут
                      </div>
                    </div>
                    <div class="service-price">
                      {service.priceAmount} {service.currency}
                    </div>
                    {#if selectedService === service.id}
                      <div class="service-check">
                        <CheckCircle2 size={18} />
                      </div>
                    {/if}
                  </button>
                {/each}
              </div>
            </div>
          {/if}
        </div>

        <!-- Sidebar - Booking -->
        <aside class="booking-sidebar">
          <div class="booking-card card">
            <div class="booking-header">
              <Calendar size={20} />
              <h3>Забронировать сессию</h3>
            </div>

            {#if selectedServiceData}
              <div class="booking-service">
                <span>{selectedServiceData.title}</span>
                <span class="booking-price">{selectedServiceData.priceAmount} {selectedServiceData.currency}</span>
              </div>
            {/if}

            {#if error}
              <div class="alert alert-error">{error}</div>
            {/if}

            {#if Object.keys(groupedSlots()).length === 0}
              <div class="no-slots">
                <Calendar size={32} />
                <p>Нет доступных слотов</p>
                <span class="muted">Ментор пока не добавил расписание</span>
              </div>
            {:else}
              <div class="slots-container">
                {#each Object.entries(groupedSlots()) as [date, dateSlots]}
                  <div class="slots-day">
                    <div class="slots-date">{date}</div>
                    <div class="slots-grid">
                      {#each dateSlots as slot}
                        {@const time = new Date(slot.startAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                        <button
                          class="slot-btn {selectedSlot === slot.id ? 'selected' : ''}"
                          on:click={() => (selectedSlot = slot.id)}
                        >
                          {time}
                        </button>
                      {/each}
                    </div>
                  </div>
                {/each}
              </div>
            {/if}

            <button 
              class="btn btn-primary btn-lg booking-btn" 
              on:click={handleHold} 
              disabled={!selectedSlot || isBooking || !selectedService}
            >
              {#if isBooking}
                Бронирование...
              {:else}
                Забронировать <ChevronRight size={18} />
              {/if}
            </button>

            <p class="booking-note muted">
              Слот удерживается на 10 минут для оплаты
            </p>
          </div>
        </aside>
      </div>
    </main>
  {/if}
</div>

<style>
  .back-link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--muted);
    font-size: 0.9rem;
    margin-bottom: 24px;
    transition: color 0.2s ease;
  }

  .back-link:hover {
    color: var(--ink);
  }

  .mentor-layout {
    display: grid;
    grid-template-columns: 1fr 380px;
    gap: 32px;
    align-items: start;
  }

  .mentor-main {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .profile-header {
    display: flex;
    gap: 24px;
    align-items: flex-start;
  }

  .profile-avatar {
    width: 100px;
    height: 100px;
    border-radius: 20px;
    background: linear-gradient(135deg, var(--accent) 0%, var(--violet) 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 2.5rem;
    color: #fff;
    font-family: var(--font-display);
    flex-shrink: 0;
  }

  .profile-info {
    flex: 1;
  }

  .profile-name {
    font-size: 1.75rem;
    margin-bottom: 4px;
  }

  .profile-headline {
    color: var(--ink-secondary);
    font-size: 1.1rem;
    margin-bottom: 16px;
  }

  .profile-stats {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
  }

  .profile-stat {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.9rem;
    color: var(--ink-secondary);
  }

  .profile-stat :global(.star-icon) {
    color: #f59e0b;
  }

  .stat-value {
    font-weight: 600;
    color: var(--ink);
  }

  .card-title {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 1.1rem;
    margin-bottom: 16px;
    color: var(--ink);
  }

  .card-title :global(svg) {
    color: var(--accent);
  }

  .bio-text {
    color: var(--ink-secondary);
    line-height: 1.7;
    white-space: pre-line;
  }

  .topics-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .topic-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    background: var(--accent-muted);
    color: var(--accent);
    border-radius: 999px;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .services-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .service-card {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px 20px;
    background: var(--bg-alt);
    border: 2px solid transparent;
    border-radius: var(--radius-lg);
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: left;
    width: 100%;
  }

  .service-card:hover {
    border-color: var(--border);
  }

  .service-card.selected {
    background: var(--accent-muted);
    border-color: var(--accent);
  }

  .service-info {
    flex: 1;
  }

  .service-name {
    font-weight: 600;
    margin-bottom: 4px;
  }

  .service-duration {
    display: flex;
    align-items: center;
    gap: 4px;
    color: var(--muted);
    font-size: 0.875rem;
  }

  .service-price {
    font-weight: 700;
    font-size: 1.1rem;
    color: var(--accent);
  }

  .service-check {
    color: var(--accent);
  }

  /* Booking sidebar */
  .booking-sidebar {
    position: sticky;
    top: 100px;
  }

  .booking-card {
    padding: 24px;
  }

  .booking-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 20px;
  }

  .booking-header :global(svg) {
    color: var(--accent);
  }

  .booking-header h3 {
    margin: 0;
    font-size: 1.1rem;
  }

  .booking-service {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: var(--bg-alt);
    border-radius: var(--radius-md);
    margin-bottom: 16px;
    font-size: 0.9rem;
  }

  .booking-price {
    font-weight: 700;
    color: var(--accent);
  }

  .no-slots {
    text-align: center;
    padding: 32px 16px;
    color: var(--muted);
  }

  .no-slots :global(svg) {
    margin-bottom: 12px;
    opacity: 0.5;
  }

  .no-slots p {
    font-weight: 600;
    color: var(--ink-secondary);
    margin-bottom: 4px;
  }

  .slots-container {
    max-height: 320px;
    overflow-y: auto;
    margin-bottom: 20px;
    padding-right: 8px;
  }

  .slots-day {
    margin-bottom: 16px;
  }

  .slots-day:last-child {
    margin-bottom: 0;
  }

  .slots-date {
    font-size: 0.8rem;
    font-weight: 600;
    text-transform: capitalize;
    color: var(--ink-secondary);
    margin-bottom: 8px;
  }

  .slots-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }

  .slot-btn {
    padding: 10px 8px;
    border: 1.5px solid var(--border);
    border-radius: var(--radius-md);
    background: var(--surface);
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--ink-secondary);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .slot-btn:hover {
    border-color: var(--accent);
    color: var(--accent);
  }

  .slot-btn.selected {
    background: var(--accent);
    border-color: var(--accent);
    color: #fff;
  }

  .booking-btn {
    width: 100%;
    justify-content: center;
    margin-bottom: 12px;
  }

  .booking-note {
    text-align: center;
    font-size: 0.8rem;
  }

  .error-state {
    text-align: center;
    padding: 48px 24px;
  }

  .alert {
    margin-bottom: 16px;
  }

  @media (max-width: 900px) {
    .mentor-layout {
      grid-template-columns: 1fr;
    }

    .booking-sidebar {
      position: static;
    }

    .profile-header {
      flex-direction: column;
      align-items: center;
      text-align: center;
    }

    .profile-stats {
      justify-content: center;
    }
  }

  @media (max-width: 480px) {
    .profile-avatar {
      width: 80px;
      height: 80px;
      font-size: 2rem;
    }

    .slots-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
</style>
