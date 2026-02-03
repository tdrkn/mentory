<script lang="ts">
  import AppHeader from '$lib/components/AppHeader.svelte';
  import Loading from '$lib/components/Loading.svelte';
  import { api } from '$lib/api';
  import { onMount } from 'svelte';
  import { isAuthenticated, isLoading as authLoading, isMentor } from '$lib/stores/auth';
  import { goto } from '$app/navigation';

  interface Topic {
    id: string;
    name: string;
  }

  interface Service {
    id: string;
    title: string;
    durationMin: number;
    priceAmount: string;
    currency: string;
    isActive: boolean;
  }

  let isLoading = true;
  let saving = false;
  let message: string | null = null;

  let fullName = '';
  let timezone = 'UTC';

  let headline = '';
  let bio = '';
  let languages = '';

  let background = '';
  let goals = '';
  let interests = '';

  let topics: Topic[] = [];
  let selectedTopicIds: string[] = [];

  let services: Service[] = [];
  let newService = { title: '', durationMin: 60, priceAmount: '0', currency: 'RUB' };

  const loadProfile = async () => {
    const profile = await api.get<any>('/profile');
    fullName = profile.fullName || '';
    timezone = profile.timezone || 'UTC';

    if ($isMentor) {
      const mentorProfile = await api.get<any>('/profile/mentor');
      headline = mentorProfile.headline || '';
      bio = mentorProfile.bio || '';
      languages = (mentorProfile.languages || []).join(', ');
      selectedTopicIds = (mentorProfile.topics || []).map((t: any) => t.topic?.id || t.topicId).filter(Boolean);
      services = await api.get<Service[]>('/services');
    } else {
      const menteeProfile = await api.get<any>('/profile/mentee');
      background = menteeProfile.background || '';
      goals = menteeProfile.goals || '';
      interests = (menteeProfile.interests || []).join(', ');
    }

    topics = await api.get<Topic[]>('/topics');
  };

  const saveProfile = async () => {
    saving = true;
    message = null;
    try {
      await api.patch('/profile', { fullName, timezone });

      if ($isMentor) {
        await api.patch('/profile/mentor', {
          headline,
          bio,
          languages: languages.split(',').map((l) => l.trim()).filter(Boolean),
          timezone,
        });
        await api.put('/profile/mentor/topics', { topicIds: selectedTopicIds });
      } else {
        await api.patch('/profile/mentee', {
          background,
          goals,
          interests: interests.split(',').map((i) => i.trim()).filter(Boolean),
        });
      }

      message = 'Изменения сохранены.';
    } finally {
      saving = false;
    }
  };

  const addService = async () => {
    const created = await api.post<Service>('/services', {
      ...newService,
      durationMin: Number(newService.durationMin),
      priceAmount: Number(newService.priceAmount),
    });
    services = [...services, created];
    newService = { title: '', durationMin: 60, priceAmount: '0', currency: 'RUB' };
  };

  const updateService = async (service: Service) => {
    await api.patch(`/services/${service.id}`, {
      title: service.title,
      durationMin: Number(service.durationMin),
      priceAmount: Number(service.priceAmount),
      currency: service.currency,
    });
    message = 'Услуга обновлена.';
  };

  const removeService = async (serviceId: string) => {
    await api.delete(`/services/${serviceId}`);
    services = services.filter((s) => s.id !== serviceId);
  };

  const toggleTopic = (event: Event, topicId: string) => {
    const target = event.currentTarget as HTMLInputElement | null;
    const checked = !!target?.checked;
    if (checked) {
      selectedTopicIds = [...selectedTopicIds, topicId];
    } else {
      selectedTopicIds = selectedTopicIds.filter((id) => id !== topicId);
    }
  };

  onMount(async () => {
    if (!$isAuthenticated && !$authLoading) {
      goto('/login');
      return;
    }

    await loadProfile();
    isLoading = false;
  });
</script>

<div class="page">
  <AppHeader />

  {#if $authLoading || isLoading}
    <Loading />
  {:else}
    <main class="container section" style="max-width:980px;">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
        <h1 class="section-title">Редактирование профиля</h1>
        <button class="btn btn-primary" on:click={saveProfile} disabled={saving}>
          {saving ? 'Сохранение...' : 'Сохранить'}
        </button>
      </div>

      {#if message}
        <div class="surface" style="margin-top:12px;background:#dcfce7;border-color:#bbf7d0;color:#166534;">
          {message}
        </div>
      {/if}

      <div class="grid" style="grid-template-columns:1.2fr 1fr;gap:20px;">
        <div class="stack">
          <div class="card">
            <h2 class="section-title">Основная информация</h2>
            <label>
              <div class="muted" style="margin-bottom:6px;">Полное имя</div>
              <input class="input" bind:value={fullName} />
            </label>
            <label style="margin-top:12px;display:block;">
              <div class="muted" style="margin-bottom:6px;">Часовой пояс</div>
              <input class="input" bind:value={timezone} placeholder="Europe/Moscow" />
            </label>
          </div>

          {#if $isMentor}
            <div class="card">
              <h2 class="section-title">Профиль ментора</h2>
              <label>
                <div class="muted" style="margin-bottom:6px;">Заголовок</div>
                <input class="input" bind:value={headline} />
              </label>
              <label style="margin-top:12px;display:block;">
                <div class="muted" style="margin-bottom:6px;">О себе</div>
                <textarea class="textarea" bind:value={bio}></textarea>
              </label>
              <label style="margin-top:12px;display:block;">
                <div class="muted" style="margin-bottom:6px;">Языки (через запятую)</div>
                <input class="input" bind:value={languages} placeholder="Русский, English" />
              </label>
            </div>

            <div class="card">
              <h2 class="section-title">Темы менторства</h2>
              <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px;">
                {#each topics as topic}
                  <label class="surface" style={`border:2px solid ${selectedTopicIds.includes(topic.id) ? 'var(--accent)' : 'transparent'};`}>
                    <input
                      type="checkbox"
                      checked={selectedTopicIds.includes(topic.id)}
                      on:change={(e) => toggleTopic(e, topic.id)}
                    />
                    <span style="margin-left:8px;">{topic.name}</span>
                  </label>
                {/each}
              </div>
            </div>
          {:else}
            <div class="card">
              <h2 class="section-title">Профиль менти</h2>
              <label>
                <div class="muted" style="margin-bottom:6px;">Бэкграунд</div>
                <textarea class="textarea" bind:value={background}></textarea>
              </label>
              <label style="margin-top:12px;display:block;">
                <div class="muted" style="margin-bottom:6px;">Цели</div>
                <textarea class="textarea" bind:value={goals}></textarea>
              </label>
              <label style="margin-top:12px;display:block;">
                <div class="muted" style="margin-bottom:6px;">Интересы (через запятую)</div>
                <input class="input" bind:value={interests} />
              </label>
            </div>
          {/if}
        </div>

        {#if $isMentor}
          <div class="stack">
            <div class="card">
              <h2 class="section-title">Услуги и тарифы</h2>
              {#if services.length === 0}
                <p class="muted">Услуги пока не добавлены.</p>
              {:else}
                <div class="stack">
                  {#each services as service}
                    <div class="surface">
                      <input class="input" bind:value={service.title} placeholder="Название" />
                      <div class="grid" style="grid-template-columns:1fr 1fr;gap:8px;margin-top:8px;">
                        <input class="input" type="number" min="15" bind:value={service.durationMin} />
                        <input class="input" type="number" min="0" bind:value={service.priceAmount} />
                      </div>
                      <div class="grid" style="grid-template-columns:1fr auto;gap:8px;margin-top:8px;">
                        <input class="input" bind:value={service.currency} />
                        <button class="btn btn-ghost" on:click={() => removeService(service.id)}>Удалить</button>
                      </div>
                      <button class="btn btn-outline" style="margin-top:8px;" on:click={() => updateService(service)}>Сохранить</button>
                    </div>
                  {/each}
                </div>
              {/if}
            </div>

            <div class="card">
              <h2 class="section-title">Добавить услугу</h2>
              <input class="input" bind:value={newService.title} placeholder="Название услуги" />
              <div class="grid" style="grid-template-columns:1fr 1fr;gap:8px;margin-top:8px;">
                <input class="input" type="number" min="15" bind:value={newService.durationMin} />
                <input class="input" type="number" min="0" bind:value={newService.priceAmount} />
              </div>
              <input class="input" style="margin-top:8px;" bind:value={newService.currency} />
              <button class="btn btn-primary" style="margin-top:10px;" on:click={addService}>Добавить</button>
            </div>
          </div>
        {/if}
      </div>
    </main>
  {/if}
</div>
