<script lang="ts">
  import AppHeader from '$lib/components/AppHeader.svelte';
  import Loading from '$lib/components/Loading.svelte';
  import { api, ApiError } from '$lib/api';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { user } from '$lib/stores/auth';
  import { goto } from '$app/navigation';

  interface MentorDetail {
    id: string;
    fullName: string;
    timezone: string;
    createdAt: string;
    mentorProfile: {
      headline: string;
      bio: string;
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
</script>

<div class="page">
  <AppHeader />

  {#if isLoading}
    <Loading />
  {:else if error || !mentor}
    <main class="container section">
      <div class="card">
        <h2>Ментор не найден</h2>
        <p class="muted">{error || 'Проверьте ссылку.'}</p>
        <a class="btn btn-ghost" href="/mentors">Вернуться к каталогу</a>
      </div>
    </main>
  {:else}
    <main class="container section">
      <div class="grid" style="grid-template-columns:2fr 1fr;gap:24px;">
        <div class="stack">
          <div class="card">
            <div style="display:flex;gap:18px;align-items:center;">
              <div style="width:78px;height:78px;border-radius:50%;background:#e7f5f3;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:1.8rem;color:var(--accent);">
                {mentor.fullName.charAt(0)}
              </div>
              <div>
                <h1 style="margin-bottom:6px;">{mentor.fullName}</h1>
                <p class="muted">{mentor.mentorProfile?.headline || 'Эксперт'}</p>
                <div style="display:flex;gap:10px;align-items:center;margin-top:8px;">
                  <span class="badge">⭐ {mentor.mentorProfile?.ratingAvg || '0'}</span>
                  <span class="muted">{mentor.mentorProfile?.ratingCount || 0} отзывов</span>
                  <span class="muted">{mentor._count?.sessionsAsMentor || 0} сессий</span>
                </div>
              </div>
            </div>
          </div>

          <div class="card">
            <h2 class="section-title">О менторе</h2>
            <p class="muted">{mentor.mentorProfile?.bio || 'Описание не указано.'}</p>
          </div>

          {#if mentor.mentorProfile?.topics?.length}
            <div class="card">
              <h2 class="section-title">Темы</h2>
              <div style="display:flex;flex-wrap:wrap;gap:8px;">
                {#each mentor.mentorProfile.topics as topic}
                  <span class="tag">{topic.topic.name}</span>
                {/each}
              </div>
            </div>
          {/if}

          {#if mentor.mentorServices?.length}
            <div class="card">
              <h2 class="section-title">Услуги</h2>
              <div class="stack">
                {#each mentor.mentorServices as service}
                  <button
                    class="surface"
                    style={`text-align:left;border:2px solid ${selectedService === service.id ? 'var(--accent)' : 'transparent'};`}
                    on:click={() => (selectedService = service.id)}
                  >
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                      <div>
                        <strong>{service.title}</strong>
                        <div class="muted">{service.durationMin} минут</div>
                      </div>
                      <strong style="color:var(--accent);">{service.priceAmount} {service.currency}</strong>
                    </div>
                  </button>
                {/each}
              </div>
            </div>
          {/if}
        </div>

        <aside class="card" style="position:sticky;top:20px;align-self:start;">
          <h3 style="margin-top:0;">Доступные слоты</h3>
          {#if error}
            <div class="surface" style="margin-bottom:12px;background:#fee2e2;border-color:#fecaca;color:#991b1b;">{error}</div>
          {/if}

          {#if Object.keys(groupedSlots()).length === 0}
            <p class="muted">Нет доступных слотов.</p>
            <p class="muted">Ментор пока не добавил расписание.</p>
          {:else}
            <div class="stack" style="max-height:380px;overflow:auto;">
              {#each Object.entries(groupedSlots()) as [date, dateSlots]}
                <div>
                  <div class="muted" style="font-weight:600;text-transform:capitalize;margin-bottom:6px;">{date}</div>
                  <div class="grid" style="grid-template-columns:repeat(2,1fr);gap:8px;">
                    {#each dateSlots as slot}
                      {@const time = new Date(slot.startAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                      <button
                        class="btn btn-outline"
                        style={`padding:8px 10px;border-radius:12px;${selectedSlot === slot.id ? 'background:var(--accent);color:#fff;border-color:var(--accent);' : ''}`}
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

          <button class="btn btn-primary" style="width:100%;margin-top:16px;" on:click={handleHold} disabled={!selectedSlot || isBooking || !selectedService}>
            {isBooking ? 'Бронирование...' : 'Забронировать'}
          </button>
          <p class="muted" style="font-size:0.85rem;margin-top:8px;">Слот удерживается на 10 минут для оплаты.</p>
        </aside>
      </div>
    </main>
  {/if}
</div>
