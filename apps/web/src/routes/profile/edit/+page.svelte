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
  import {
    EDUCATION_SUGGESTIONS,
    HOBBY_OPTIONS,
    SKILL_OPTIONS,
    WORKPLACE_SUGGESTIONS,
  } from '$lib/constants/profile-options';

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
      age: null,
      education: '',
      workplace: '',
      goals: [],
      hobbies: [],
      certificates: [],
      skills: [],
      headline: '',
      bio: '',
      languages: '',
      background: '',
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

  let hobbySearch = '';
  let skillSearch = '';

  const normalizeStringArray = (items: string[]) => items.map((item) => item.trim()).filter(Boolean);
  const inputValue = (event: Event) => (event.currentTarget as HTMLInputElement | null)?.value || '';
  const inputChecked = (event: Event) => !!(event.currentTarget as HTMLInputElement | null)?.checked;

  const addGoal = () => {
    formData.update((current) => ({ ...current, goals: [...current.goals, ''] }));
  };

  const updateGoal = (index: number, value: string) => {
    formData.update((current) => ({
      ...current,
      goals: current.goals.map((goal, i) => (i === index ? value : goal)),
    }));
  };

  const removeGoal = (index: number) => {
    formData.update((current) => ({
      ...current,
      goals: current.goals.filter((_, i) => i !== index),
    }));
  };

  const addCertificate = () => {
    formData.update((current) => ({ ...current, certificates: [...current.certificates, ''] }));
  };

  const updateCertificate = (index: number, value: string) => {
    formData.update((current) => ({
      ...current,
      certificates: current.certificates.map((certificate, i) => (i === index ? value : certificate)),
    }));
  };

  const removeCertificate = (index: number) => {
    formData.update((current) => ({
      ...current,
      certificates: current.certificates.filter((_, i) => i !== index),
    }));
  };

  const toggleSelectable = (field: 'hobbies' | 'skills', value: string, checked: boolean) => {
    formData.update((current) => {
      const currentValues = current[field] || [];
      if (checked && !currentValues.includes(value)) {
        return { ...current, [field]: [...currentValues, value] };
      }
      if (!checked) {
        return { ...current, [field]: currentValues.filter((item) => item !== value) };
      }
      return current;
    });
  };

  $: filteredHobbyOptions = HOBBY_OPTIONS.filter((item) =>
    item.toLowerCase().includes(hobbySearch.trim().toLowerCase()),
  );

  $: filteredSkillOptions = SKILL_OPTIONS.filter((item) =>
    item.toLowerCase().includes(skillSearch.trim().toLowerCase()),
  );

  const loadProfile = async () => {
    const profile = await api.get<any>('/profile');
    const nextForm: ProfileForm = {
      fullName: profile.fullName || '',
      timezone: profile.timezone || 'UTC',
      age: null,
      education: '',
      workplace: '',
      goals: [],
      hobbies: [],
      certificates: [],
      skills: [],
      headline: '',
      bio: '',
      languages: '',
      background: '',
      interests: '',
    };

    if ($isMentor) {
      const mentorProfile = await api.get<any>('/profile/mentor');
      nextForm.age = mentorProfile.age ?? null;
      nextForm.education = mentorProfile.education || '';
      nextForm.workplace = mentorProfile.workplace || '';
      nextForm.goals = mentorProfile.goals || [];
      nextForm.hobbies = mentorProfile.hobbies || [];
      nextForm.certificates = mentorProfile.certificates || [];
      nextForm.skills = mentorProfile.skills || [];
      nextForm.headline = mentorProfile.headline || '';
      nextForm.bio = mentorProfile.bio || '';
      nextForm.languages = (mentorProfile.languages || []).join(', ');
      selectedTopicIds = (mentorProfile.topics || []).map((t: any) => t.topic?.id || t.topicId).filter(Boolean);
      services = await api.get<Service[]>('/services');
    } else {
      const menteeProfile = await api.get<any>('/profile/mentee');
      nextForm.age = menteeProfile.age ?? null;
      nextForm.education = menteeProfile.education || '';
      nextForm.workplace = menteeProfile.workplace || '';
      nextForm.background = menteeProfile.background || '';
      nextForm.goals = Array.isArray(menteeProfile.goals)
        ? menteeProfile.goals
        : menteeProfile.goals
          ? [menteeProfile.goals]
          : [];
      nextForm.hobbies = menteeProfile.hobbies || menteeProfile.interests || [];
      nextForm.certificates = menteeProfile.certificates || [];
      nextForm.skills = menteeProfile.skills || [];
      nextForm.interests = (menteeProfile.interests || []).join(', ');
    }

    formData.set(nextForm);
    topics = await api.get<Topic[]>('/topics');
  };

  const saveProfile = async () => {
    const preparedGoals = normalizeStringArray($formData.goals || []);
    const preparedCertificates = normalizeStringArray($formData.certificates || []);
    const preparedHobbies = normalizeStringArray($formData.hobbies || []);
    const preparedSkills = normalizeStringArray($formData.skills || []);

    formData.update((current) => ({
      ...current,
      goals: preparedGoals,
      certificates: preparedCertificates,
      hobbies: preparedHobbies,
      skills: preparedSkills,
    }));

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
          age: $formData.age,
          education: $formData.education,
          workplace: $formData.workplace,
          goals: preparedGoals,
          hobbies: preparedHobbies,
          certificates: preparedCertificates,
          skills: preparedSkills,
          headline: $formData.headline,
          bio: $formData.bio,
          languages: $formData.languages.split(',').map((l) => l.trim()).filter(Boolean),
          timezone: $formData.timezone,
        });
        await api.put('/profile/mentor/topics', { topicIds: selectedTopicIds });
      } else {
        await api.patch('/profile/mentee', {
          age: $formData.age,
          education: $formData.education,
          workplace: $formData.workplace,
          background: $formData.background,
          goals: preparedGoals,
          hobbies: preparedHobbies,
          certificates: preparedCertificates,
          skills: preparedSkills,
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
      <datalist id="education-suggestions">
        {#each EDUCATION_SUGGESTIONS as education}
          <option value={education}></option>
        {/each}
      </datalist>

      <datalist id="workplace-suggestions">
        {#each WORKPLACE_SUGGESTIONS as workplace}
          <option value={workplace}></option>
        {/each}
      </datalist>

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
            <label style="margin-top:12px;display:block;">
              <div class="muted" style="margin-bottom:6px;">Возраст</div>
              <input class="input" type="number" min="18" max="120" bind:value={$formData.age} />
              {#if $errors.age}
                <div class="muted" style="font-size:0.8rem;color:#b45309;">{errorMessage($errors.age)}</div>
              {/if}
            </label>
            <label style="margin-top:12px;display:block;">
              <div class="muted" style="margin-bottom:6px;">Образование</div>
              <input
                class="input"
                list="education-suggestions"
                bind:value={$formData.education}
                placeholder="Начните вводить и выберите подсказку"
              />
            </label>
            <label style="margin-top:12px;display:block;">
              <div class="muted" style="margin-bottom:6px;">Место работы</div>
              <input
                class="input"
                list="workplace-suggestions"
                bind:value={$formData.workplace}
                placeholder="Начните вводить и выберите подсказку"
              />
            </label>
          </div>

          <div class="card">
            <h2 class="section-title">Цели</h2>
            <p class="muted" style="margin-bottom:10px;">Добавляйте отдельные цели в разных полях.</p>
            <div class="stack" style="gap:8px;">
              {#if $formData.goals.length === 0}
                <div class="muted">Пока нет целей.</div>
              {/if}
              {#each $formData.goals as goal, goalIndex}
                <div class="list-field-row">
                  <input
                    class="input"
                    value={goal}
                    on:input={(event) => updateGoal(goalIndex, inputValue(event))}
                    placeholder="Например: Подготовиться к собеседованию"
                  />
                  <button class="btn btn-ghost" on:click={() => removeGoal(goalIndex)}>Удалить</button>
                </div>
              {/each}
            </div>
            <button class="btn btn-outline" style="margin-top:12px;" on:click={addGoal}>Добавить цель</button>
          </div>

          <div class="card">
            <h2 class="section-title">Хобби (выбор и поиск)</h2>
            <input
              class="input"
              bind:value={hobbySearch}
              placeholder="Найти хобби в списке"
              style="margin-bottom:10px;"
            />
            <div class="chips">
              {#each $formData.hobbies as hobby}
                <button
                  class="chip selected"
                  on:click={() => toggleSelectable('hobbies', hobby, false)}
                  title="Убрать"
                >
                  {hobby}
                </button>
              {/each}
            </div>
            <div class="selection-grid" style="margin-top:10px;">
              {#if filteredHobbyOptions.length === 0}
                <div class="muted">Ничего не найдено.</div>
              {/if}
              {#each filteredHobbyOptions as hobbyOption}
                <label class="surface select-item">
                  <input
                    type="checkbox"
                    checked={$formData.hobbies.includes(hobbyOption)}
                    on:change={(event) =>
                      toggleSelectable(
                        'hobbies',
                        hobbyOption,
                        inputChecked(event),
                      )}
                  />
                  <span>{hobbyOption}</span>
                </label>
              {/each}
            </div>
          </div>

          <div class="card">
            <h2 class="section-title">Навыки (выбор и поиск)</h2>
            <input
              class="input"
              bind:value={skillSearch}
              placeholder="Найти навык в списке"
              style="margin-bottom:10px;"
            />
            <div class="chips">
              {#each $formData.skills as skill}
                <button
                  class="chip selected"
                  on:click={() => toggleSelectable('skills', skill, false)}
                  title="Убрать"
                >
                  {skill}
                </button>
              {/each}
            </div>
            <div class="selection-grid" style="margin-top:10px;">
              {#if filteredSkillOptions.length === 0}
                <div class="muted">Ничего не найдено.</div>
              {/if}
              {#each filteredSkillOptions as skillOption}
                <label class="surface select-item">
                  <input
                    type="checkbox"
                    checked={$formData.skills.includes(skillOption)}
                    on:change={(event) =>
                      toggleSelectable(
                        'skills',
                        skillOption,
                        inputChecked(event),
                      )}
                  />
                  <span>{skillOption}</span>
                </label>
              {/each}
            </div>
          </div>

          <div class="card">
            <h2 class="section-title">Сертификаты и дипломы</h2>
            <div class="stack" style="gap:8px;">
              {#if $formData.certificates.length === 0}
                <div class="muted">Пока не добавлены.</div>
              {/if}
              {#each $formData.certificates as certificate, certificateIndex}
                <div class="list-field-row">
                  <input
                    class="input"
                    value={certificate}
                    on:input={(event) => updateCertificate(certificateIndex, inputValue(event))}
                    placeholder="Например: Google Professional Cloud Architect"
                  />
                  <button class="btn btn-ghost" on:click={() => removeCertificate(certificateIndex)}>Удалить</button>
                </div>
              {/each}
            </div>
            <button class="btn btn-outline" style="margin-top:12px;" on:click={addCertificate}>
              Добавить сертификат/диплом
            </button>
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
                      <button class="btn btn-outline" style="margin-top:8px;" on:click={() => updateService(service)}>
                        Сохранить
                      </button>
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

<style>
  .list-field-row {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 8px;
  }

  .selection-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 8px;
  }

  .select-item {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .chip {
    border: 1px solid var(--border);
    border-radius: 999px;
    background: var(--surface);
    color: var(--ink-secondary);
    font-size: 0.8rem;
    padding: 5px 10px;
  }

  .chip.selected {
    border-color: var(--accent);
    color: var(--accent);
    background: color-mix(in srgb, var(--accent) 10%, #fff);
  }

  @media (max-width: 900px) {
    .list-field-row {
      grid-template-columns: 1fr;
    }
  }
</style>
