<script lang="ts">
  import AppHeader from '$lib/components/AppHeader.svelte';
  import Loading from '$lib/components/Loading.svelte';
  import { api } from '$lib/api';
  import { onMount } from 'svelte';
  import { isAuthenticated, isLoading as authLoading, isMentor } from '$lib/stores/auth';
  import { goto } from '$app/navigation';
  import { superForm } from 'sveltekit-superforms/client';
  import { zodClient } from 'sveltekit-superforms/adapters';
  import { profileSchema, type ProfileForm } from '$lib/validators/profile';

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

  const form = superForm<ProfileForm>(
    {
      fullName: '',
      timezone: 'UTC',
      headline: '',
      bio: '',
      languages: '',
      background: '',
      goals: '',
      interests: '',
    },
    {
      validators: zodClient(profileSchema as any),
      SPA: true,
      resetForm: false,
    },
  );

  const { form: formData, errors } = form;
  const errorMessage = (err: unknown) => (Array.isArray(err) ? err[0] : err);

  let topics: Topic[] = [];
  let selectedTopicIds: string[] = [];

  let services: Service[] = [];
  let newService = { title: '', durationMin: 60, priceAmount: '0', currency: 'RUB' };

  const loadProfile = async () => {
    const profile = await api.get<any>('/profile');
    const nextForm: ProfileForm = {
      fullName: profile.fullName || '',
      timezone: profile.timezone || 'UTC',
      headline: '',
      bio: '',
      languages: '',
      background: '',
      goals: '',
      interests: '',
    };

    if ($isMentor) {
      const mentorProfile = await api.get<any>('/profile/mentor');
      nextForm.headline = mentorProfile.headline || '';
      nextForm.bio = mentorProfile.bio || '';
      nextForm.languages = (mentorProfile.languages || []).join(', ');
      selectedTopicIds = (mentorProfile.topics || []).map((t: any) => t.topic?.id || t.topicId).filter(Boolean);
      services = await api.get<Service[]>('/services');
    } else {
      const menteeProfile = await api.get<any>('/profile/mentee');
      nextForm.background = menteeProfile.background || '';
      nextForm.goals = menteeProfile.goals || '';
      nextForm.interests = (menteeProfile.interests || []).join(', ');
    }

    formData.set(nextForm);
    topics = await api.get<Topic[]>('/topics');
  };

  const saveProfile = async () => {
    const validation = await form.validateForm({ update: true });
    if (!validation.valid) {
      message = 'Проверьте корректность заполнения профиля.';
      return;
    }
    saving = true;
    message = null;
    try {
      await api.patch('/profile', { fullName: $formData.fullName, timezone: $formData.timezone });

      if ($isMentor) {
        await api.patch('/profile/mentor', {
          headline: $formData.headline,
          bio: $formData.bio,
          languages: $formData.languages.split(',').map((l) => l.trim()).filter(Boolean),
          timezone: $formData.timezone,
        });
        await api.put('/profile/mentor/topics', { topicIds: selectedTopicIds });
      } else {
        await api.patch('/profile/mentee', {
          background: $formData.background,
          goals: $formData.goals,
          interests: $formData.interests.split(',').map((i) => i.trim()).filter(Boolean),
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
              <input class="input" bind:value={$formData.fullName} />
              {#if $errors.fullName}
                <div class="muted" style="font-size:0.8rem;color:#b45309;">{errorMessage($errors.fullName)}</div>
              {/if}
            </label>
            <label style="margin-top:12px;display:block;">
              <div class="muted" style="margin-bottom:6px;">Часовой пояс</div>
              <input class="input" bind:value={$formData.timezone} placeholder="Europe/Moscow" />
              {#if $errors.timezone}
                <div class="muted" style="font-size:0.8rem;color:#b45309;">{errorMessage($errors.timezone)}</div>
              {/if}
            </label>
          </div>

          {#if $isMentor}
            <div class="card">
              <h2 class="section-title">Профиль ментора</h2>
              <label>
                <div class="muted" style="margin-bottom:6px;">Заголовок</div>
                <input class="input" bind:value={$formData.headline} />
              </label>
              <label style="margin-top:12px;display:block;">
                <div class="muted" style="margin-bottom:6px;">О себе</div>
                <textarea class="textarea" bind:value={$formData.bio}></textarea>
              </label>
              <label style="margin-top:12px;display:block;">
                <div class="muted" style="margin-bottom:6px;">Языки (через запятую)</div>
                <input class="input" bind:value={$formData.languages} placeholder="Русский, English" />
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
                <textarea class="textarea" bind:value={$formData.background}></textarea>
              </label>
              <label style="margin-top:12px;display:block;">
                <div class="muted" style="margin-bottom:6px;">Цели</div>
                <textarea class="textarea" bind:value={$formData.goals}></textarea>
              </label>
              <label style="margin-top:12px;display:block;">
                <div class="muted" style="margin-bottom:6px;">Интересы (через запятую)</div>
                <input class="input" bind:value={$formData.interests} />
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
