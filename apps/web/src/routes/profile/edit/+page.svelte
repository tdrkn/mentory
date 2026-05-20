<script lang="ts">
  import AppHeader from '$lib/components/AppHeader.svelte';
  import Loading from '$lib/components/Loading.svelte';
  import { api } from '$lib/api';
  import { getApiUrl } from '$lib/env';
  import { onMount } from 'svelte';
  import { isAuthenticated, isLoading as authLoading, isMentor } from '$lib/stores/auth';
  import { goto } from '$app/navigation';
  import { superForm } from 'sveltekit-superforms/client';
  import { zodClient } from 'sveltekit-superforms/adapters';
  import { profileSchema, type ProfileForm } from '$lib/validators/profile';
  import {
    ACTIVITY_FIELD_OPTIONS,
    HOBBY_OPTIONS,
    SKILL_OPTIONS,
  } from '$lib/constants/profile-options';

  interface Service {
    id: string;
    title: string;
    durationMin: number;
    priceAmount: string;
    currency: string;
    isActive: boolean;
  }

  interface RegaliaItem {
    id: string;
    title?: string | null;
    fileName: string;
    fileUrl: string;
    status: string;
  }

  interface MentorshipPlan {
    id: string;
    title: string;
    description?: string | null;
    priceAmount: string;
    currency: string;
  }

  let isLoading = true;
  let saving = false;
  let isUploadingAvatar = false;
  let isUploadingAchievement = false;
  let message: string | null = null;
  let profileEmail = '';
  let profileRole = '';
  let avatarUrl: string | null = null;
  let avatarInput: HTMLInputElement;
  let achievementInput: HTMLInputElement;
  let mentorVerificationStatus: string | null = null;

  const form = superForm<ProfileForm>(
    {
      firstName: '',
      lastName: '',
      fullName: '',
      timezone: 'Europe/Moscow',
      birthDate: '',
      age: null,
      education: '',
      position: '',
      workplace: '',
      activityFields: [],
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
  $: isProfileMentor = $isMentor || profileRole === 'mentor' || profileRole === 'both';
  $: isVerified = isProfileMentor && mentorVerificationStatus === 'verified';

  let selectedTopicIds: string[] = [];
  let selectedActivitySearch = '';
  let skillSearch = '';
  let hobbySearch = '';

  // Goals management (for mentees)
  let newGoalInput = '';

  const addGoal = () => {
    const trimmed = newGoalInput.trim();
    if (!trimmed) return;
    formData.update((f) => ({ ...f, goals: [...(f.goals || []), trimmed] }));
    newGoalInput = '';
  };

  const removeGoal = (index: number) => {
    formData.update((f) => ({ ...f, goals: (f.goals || []).filter((_, i) => i !== index) }));
  };

  // Service edit state
  let editingServiceId: string | null = null;
  let editServiceDraft: { title: string; durationMin: number; priceAmount: string; currency: string } | null = null;

  const startEditService = (svc: Service) => {
    editingServiceId = svc.id;
    editServiceDraft = { title: svc.title, durationMin: svc.durationMin, priceAmount: String(svc.priceAmount), currency: svc.currency };
  };
  const cancelEditService = () => { editingServiceId = null; editServiceDraft = null; };
  const saveService = async (id: string) => {
    if (!editServiceDraft) return;
    await api.patch(`/services/${id}`, {
      title: editServiceDraft.title,
      durationMin: Number(editServiceDraft.durationMin),
      priceAmount: Number(editServiceDraft.priceAmount),
      currency: editServiceDraft.currency,
    });
    services = services.map((s) => s.id === id ? { ...s, title: editServiceDraft!.title, durationMin: Number(editServiceDraft!.durationMin), priceAmount: editServiceDraft!.priceAmount } : s);
    cancelEditService();
    message = 'Услуга обновлена.';
  };
  const deleteService = async (id: string) => {
    await api.delete(`/services/${id}`);
    services = services.filter((s) => s.id !== id);
  };

  // Plan edit state
  let editingPlanId: string | null = null;
  let editPlanDraft: { title: string; priceAmount: string; description: string } | null = null;

  const startEditPlan = (p: MentorshipPlan) => {
    editingPlanId = p.id;
    editPlanDraft = { title: p.title, priceAmount: String(p.priceAmount), description: p.description || '' };
  };
  const cancelEditPlan = () => { editingPlanId = null; editPlanDraft = null; };
  const savePlan = async (id: string) => {
    if (!editPlanDraft) return;
    await api.patch(`/subscriptions/plans/${id}`, {
      title: editPlanDraft.title,
      priceAmount: Number(editPlanDraft.priceAmount),
      description: editPlanDraft.description,
    });
    plans = plans.map((p) => p.id === id ? { ...p, title: editPlanDraft!.title, priceAmount: editPlanDraft!.priceAmount, description: editPlanDraft!.description } : p);
    cancelEditPlan();
    message = 'План обновлён.';
  };
  const deletePlan = async (id: string) => {
    await api.delete(`/subscriptions/plans/${id}`);
    plans = plans.filter((p) => p.id !== id);
  };

  let services: Service[] = [];
  let newService = { title: '', durationMin: 60, priceAmount: '0', currency: 'RUB' };

  let regalia: RegaliaItem[] = [];
  let achievementTitle = '';
  let achievementFile: File | null = null;

  let plans: MentorshipPlan[] = [];
  let newPlan = {
    title: '',
    callsPerMonth: 4,
    sessionDurationMin: 60,
    durationDays: 30,
    currency: 'RUB',
    priceAmount: '0',
    description: '',
  };

  const normalizeStringArray = (items: string[]) => items.map((item) => item.trim()).filter(Boolean);
  const inputChecked = (event: Event) => !!(event.currentTarget as HTMLInputElement | null)?.checked;

  const toggleSelectable = (
    field: 'activityFields' | 'hobbies' | 'skills',
    value: string,
    checked: boolean,
  ) => {
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

  const fileToDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error || new Error('Не удалось прочитать файл.'));
      reader.readAsDataURL(file);
    });

  const resolveFileUrl = (value?: string | null) => {
    if (!value) return '';
    if (value.startsWith('http') || value.startsWith('data:')) return value;
    return `${getApiUrl()}${value}`;
  };

  const formatBirthDate = (value?: string | null) => {
    if (!value) return '';
    return value.slice(0, 10);
  };

  const calculateAge = (birthDate: string) => {
    if (!birthDate) return null;
    const born = new Date(birthDate);
    if (Number.isNaN(born.getTime())) return null;
    const now = new Date();
    let age = now.getFullYear() - born.getFullYear();
    const monthDelta = now.getMonth() - born.getMonth();
    if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < born.getDate())) age -= 1;
    return age;
  };

  $: filteredActivityOptions = ACTIVITY_FIELD_OPTIONS.filter((item) =>
    item.toLowerCase().includes(selectedActivitySearch.trim().toLowerCase()),
  );

  $: filteredSkillOptions = SKILL_OPTIONS.filter((item) =>
    item.toLowerCase().includes(skillSearch.trim().toLowerCase()),
  );

  $: filteredHobbyOptions = HOBBY_OPTIONS.filter((item) =>
    item.toLowerCase().includes(hobbySearch.trim().toLowerCase()),
  );

  const loadProfile = async () => {
    const profile = await api.get<any>('/profile');
    profileEmail = profile.email || '';
    profileRole = profile.role || '';
    avatarUrl = profile.avatarUrl || null;

    const fn = profile.firstName || (profile.fullName || '').split(' ')[0] || '';
    const ln = profile.lastName || (profile.fullName || '').split(' ').slice(1).join(' ') || '';

    const nextForm: ProfileForm = {
      firstName: fn,
      lastName: ln,
      fullName: profile.fullName || [fn, ln].filter(Boolean).join(' ') || '',
      timezone: profile.timezone || 'Europe/Moscow',
      birthDate: '',
      age: null,
      education: '',
      position: '',
      workplace: '',
      activityFields: [],
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

    if (profile.role === 'mentor' || profile.role === 'both') {
      const mentorProfile = await api.get<any>('/profile/mentor');
      mentorVerificationStatus = mentorProfile.verificationStatus ?? null;
      nextForm.age = mentorProfile.age ?? null;
      nextForm.birthDate = formatBirthDate(mentorProfile.birthDate);
      nextForm.education = mentorProfile.education || '';
      nextForm.position = mentorProfile.position || '';
      nextForm.workplace = mentorProfile.workplace || '';
      nextForm.activityFields = mentorProfile.activityFields || [];
      nextForm.goals = mentorProfile.goals || [];
      nextForm.hobbies = mentorProfile.hobbies || [];
      nextForm.certificates = mentorProfile.certificates || [];
      nextForm.skills = mentorProfile.skills || [];
      nextForm.headline = mentorProfile.headline || '';
      nextForm.bio = mentorProfile.bio || '';
      nextForm.languages = (mentorProfile.languages || []).join(', ');
      selectedTopicIds = (mentorProfile.topics || []).map((t: any) => t.topic?.id || t.topicId).filter(Boolean);
      services = await api.get<Service[]>('/services');
      regalia = await api.get<RegaliaItem[]>('/regalia/mine');
      plans = await api.get<MentorshipPlan[]>('/subscriptions/plans/me');
    } else {
      const menteeProfile = await api.get<any>('/profile/mentee');
      nextForm.age = menteeProfile.age ?? null;
      nextForm.education = menteeProfile.education || '';
      nextForm.position = menteeProfile.position || '';
      nextForm.workplace = menteeProfile.workplace || '';
      nextForm.activityFields = menteeProfile.activityFields || [];
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
  };

  const saveProfile = async () => {
    const preparedActivityFields = normalizeStringArray($formData.activityFields || []);
    const preparedHobbies = normalizeStringArray($formData.hobbies || []);
    const preparedSkills = normalizeStringArray($formData.skills || []);

    formData.update((current) => ({
      ...current,
      activityFields: preparedActivityFields,
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

    // Keep fullName in sync before save
    const fn = ($formData.firstName || '').trim();
    const ln = ($formData.lastName || '').trim();
    if (fn || ln) {
      formData.update((f) => ({ ...f, fullName: [fn, ln].filter(Boolean).join(' ') }));
    }

    try {
      await api.patch('/profile', {
        firstName: fn || undefined,
        lastName: ln || undefined,
        fullName: [fn, ln].filter(Boolean).join(' ') || $formData.fullName,
        timezone: $formData.timezone || 'Europe/Moscow',
      });

      if (isProfileMentor) {
        await api.patch('/profile/mentor', {
          age: $formData.birthDate ? calculateAge($formData.birthDate) : $formData.age,
          birthDate: $formData.birthDate || undefined,
          education: $formData.education,
          position: $formData.position,
          workplace: $formData.workplace,
          activityFields: preparedActivityFields,
          hobbies: preparedHobbies,
          certificates: [],
          skills: preparedSkills,
          headline: $formData.headline,
          bio: $formData.bio,
          languages: $formData.languages.split(',').map((l) => l.trim()).filter(Boolean),
          timezone: $formData.timezone || 'Europe/Moscow',
        });
        await api.put('/profile/mentor/topics', { topicIds: selectedTopicIds });
      } else {
        await api.patch('/profile/mentee', {
          age: $formData.age,
          education: $formData.education,
          position: $formData.position,
          workplace: $formData.workplace,
          activityFields: preparedActivityFields,
          background: $formData.background,
          goals: normalizeStringArray($formData.goals || []),
          hobbies: preparedHobbies,
          certificates: [],
          skills: preparedSkills,
          interests: $formData.interests.split(',').map((i) => i.trim()).filter(Boolean),
        });
      }

      message = 'Изменения сохранены.';
    } finally {
      saving = false;
    }
  };

  const uploadAvatar = async (event: Event) => {
    const file = (event.currentTarget as HTMLInputElement).files?.[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg'].includes(file.type) || file.size > 20 * 1024 * 1024) {
      message = 'Фото должно быть в формате PNG/JPG и не больше 20MB.';
      return;
    }

    isUploadingAvatar = true;
    try {
      const fileUrl = await fileToDataUrl(file);
      const updated = await api.patch<{ avatarUrl: string }>('/profile', {
        avatarUrl: fileUrl,
        avatarFileName: file.name,
        avatarMimeType: file.type,
        avatarSize: file.size,
      });
      avatarUrl = updated.avatarUrl;
      message = 'Фото профиля обновлено.';
    } finally {
      isUploadingAvatar = false;
      if (avatarInput) avatarInput.value = '';
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

  const createPlan = async () => {
    const created = await api.post<MentorshipPlan>('/subscriptions/plans', {
      title: newPlan.title,
      description: newPlan.description,
      callsPerMonth: Number(newPlan.callsPerMonth),
      sessionDurationMin: Number(newPlan.sessionDurationMin),
      billingIntervalMonths: Math.max(1, Math.min(12, Math.ceil(Number(newPlan.durationDays || 30) / 30))),
      currency: newPlan.currency,
      priceAmount: Number(newPlan.priceAmount),
    });
    plans = [created, ...plans];
    newPlan = {
      title: '',
      callsPerMonth: 4,
      sessionDurationMin: 60,
      durationDays: 30,
      currency: 'RUB',
      priceAmount: '0',
      description: '',
    };
    message = 'План подписки добавлен.';
  };

  const handleAchievementFile = (event: Event) => {
    achievementFile = (event.currentTarget as HTMLInputElement).files?.[0] || null;
  };

  const clearAchievementDraft = () => {
    achievementTitle = '';
    achievementFile = null;
    if (achievementInput) achievementInput.value = '';
  };

  const uploadAchievement = async () => {
    if (!achievementTitle.trim()) {
      message = 'Укажите название достижения.';
      return;
    }
    if (!achievementFile) {
      message = 'Выберите файл достижения.';
      return;
    }
    if (!['image/png', 'image/jpeg', 'application/pdf'].includes(achievementFile.type) || achievementFile.size > 20 * 1024 * 1024) {
      message = 'Файл должен быть PNG, JPG или PDF и не больше 20MB.';
      return;
    }

    isUploadingAchievement = true;
    try {
      const fileUrl = await fileToDataUrl(achievementFile);
      await api.post('/regalia', {
        title: achievementTitle.trim(),
        fileUrl,
        fileName: achievementFile.name,
        mimeType: achievementFile.type,
        size: achievementFile.size,
      });
      regalia = await api.get<RegaliaItem[]>('/regalia/mine');
      clearAchievementDraft();
      message = 'Достижение отправлено на проверку.';
    } finally {
      isUploadingAchievement = false;
    }
  };

  const removeAchievement = async (id: string) => {
    await api.delete(`/regalia/${id}`);
    regalia = regalia.filter((item) => item.id !== id);
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
    <main class="profile-edit-shell">
      <div class="profile-edit-header">
        <div class="title-row">
          <h1>Редактирование профиля</h1>
          {#if isVerified}
            <span class="verified-badge">Профиль верифицирован</span>
          {:else if isProfileMentor}
            <span class="verified-badge verified-badge-pending">На модерации</span>
          {/if}
        </div>
        <button class="btn btn-primary" on:click={saveProfile} disabled={saving}>
          {saving ? 'Сохранение...' : 'Сохранить'}
        </button>
      </div>

      {#if message}
        <div class="notice">{message}</div>
      {/if}

      <div class="profile-grid">
        <div class="left-column">
          <section class="profile-card">
            <h2>Основная информация</h2>
            <div class="name-row">
              <label class="field">
                <span>Имя*</span>
                <input class="input" bind:value={$formData.firstName} placeholder="Иван" />
              </label>
              <label class="field">
                <span>Фамилия*</span>
                <input class="input" bind:value={$formData.lastName} placeholder="Иванов" />
              </label>
            </div>
            {#if $errors.fullName}
              <small style="color:var(--status-warning-ink);">{errorMessage($errors.fullName)}</small>
            {/if}
            <label class="field">
              <span>Дата рождения</span>
              <input class="input" type="date" bind:value={$formData.birthDate} />
            </label>
            <label class="field">
              <span>О себе</span>
              <input class="input" bind:value={$formData.bio} placeholder="Коротко о себе" />
            </label>
            <label class="field">
              <span>Email*</span>
              <input class="input" value={profileEmail} disabled />
            </label>
          </section>

          <section class="profile-card">
            <h2>Карьера</h2>
            <label class="field">
              <span>Образование{isProfileMentor ? '*' : ''}</span>
              <input class="input" bind:value={$formData.education} />
            </label>
            <label class="field">
              <span>Должность</span>
              <input class="input" bind:value={$formData.position} />
            </label>
            <label class="field">
              <span>Место работы</span>
              <input class="input" bind:value={$formData.workplace} />
            </label>
            <label class="field">
              <span>Сфера деятельности{isProfileMentor ? '*' : ''}</span>
              <input class="input" bind:value={selectedActivitySearch} placeholder="Найти сферу деятельности в поиске" />
            </label>
            <div class="selection-grid compact">
              {#each filteredActivityOptions as activity}
                <label class="select-item">
                  <input
                    type="checkbox"
                    checked={($formData.activityFields || []).includes(activity)}
                    on:change={(event) => toggleSelectable('activityFields', activity, inputChecked(event))}
                  />
                  <span>{activity}</span>
                </label>
              {/each}
            </div>
            {#if !isProfileMentor}
              <label class="field" style="margin-top:14px;">
                <span>Контекст и цели</span>
                <textarea
                  class="input"
                  rows="3"
                  bind:value={$formData.background}
                  placeholder="Чему хотите научиться, какой опыт уже есть"
                ></textarea>
              </label>
            {/if}
          </section>

          <section class="profile-card">
            <h2>Навыки{isProfileMentor ? '*' : ''}</h2>
            <input class="input" bind:value={skillSearch} placeholder="Найти навык в поиске" />
            <div class="selection-grid">
              {#each filteredSkillOptions as skill}
                <label class="select-item">
                  <input
                    type="checkbox"
                    checked={$formData.skills.includes(skill)}
                    on:change={(event) => toggleSelectable('skills', skill, inputChecked(event))}
                  />
                  <span>{skill}</span>
                </label>
              {/each}
            </div>
          </section>

          <section class="profile-card">
            <h2>Хобби</h2>
            <input class="input" bind:value={hobbySearch} placeholder="Найти хобби в списке" />
            <div class="selection-grid">
              {#each filteredHobbyOptions as hobby}
                <label class="select-item">
                  <input
                    type="checkbox"
                    checked={$formData.hobbies.includes(hobby)}
                    on:change={(event) => toggleSelectable('hobbies', hobby, inputChecked(event))}
                  />
                  <span>{hobby}</span>
                </label>
              {/each}
            </div>
          </section>

          <section class="profile-card">
            <h2>Достижения</h2>
            <label class="field">
              <span>Название</span>
              <div class="achievement-row">
                <input class="input" bind:value={achievementTitle} placeholder="Диплом" />
                <input
                  bind:this={achievementInput}
                  class="sr-only"
                  type="file"
                  accept=".png,.jpg,.jpeg,.pdf"
                  on:change={handleAchievementFile}
                />
                <button class="btn btn-primary" on:click={() => achievementInput?.click()}>
                  Загрузить файл
                </button>
                <button class="btn btn-ghost" on:click={clearAchievementDraft}>Удалить</button>
              </div>
            </label>
            <div class="file-hint">
              {achievementFile ? achievementFile.name : '(.png, .jpg, .pdf; до 20MB)'}
            </div>
            <button class="btn btn-primary" on:click={uploadAchievement} disabled={isUploadingAchievement}>
              {isUploadingAchievement ? 'Загрузка...' : 'Добавить достижение'}
            </button>

            {#if regalia.length > 0}
              <div class="achievement-list">
                {#each regalia as item}
                  <div class="achievement-item">
                    <a href={resolveFileUrl(item.fileUrl)} target="_blank" rel="noreferrer">
                      {item.title || item.fileName}
                    </a>
                    <span>{item.status}</span>
                    <button class="btn btn-ghost btn-sm" on:click={() => removeAchievement(item.id)}>Удалить</button>
                  </div>
                {/each}
              </div>
            {/if}
          </section>
        </div>

        {#if isProfileMentor}
          <aside class="right-column">
            <section class="profile-card">
              <h2>Фото профиля</h2>
              <div class="avatar-preview">
                {#if avatarUrl}
                  <img src={resolveFileUrl(avatarUrl)} alt="Фото профиля" />
                {:else}
                  <span>{$formData.fullName?.slice(0, 1) || 'M'}</span>
                {/if}
              </div>
              <input
                bind:this={avatarInput}
                class="sr-only"
                type="file"
                accept=".png,.jpg,.jpeg"
                on:change={uploadAvatar}
              />
              <div class="upload-row">
                <button class="btn btn-primary" on:click={() => avatarInput?.click()} disabled={isUploadingAvatar}>
                  {isUploadingAvatar ? 'Загрузка...' : 'Загрузить фото'}
                </button>
                <span>(.png, .jpg; до 20MB)</span>
              </div>
            </section>

            <section class="profile-card">
              <h2>Услуги</h2>
              {#if services.length > 0}
                <div class="item-cards">
                  {#each services as svc}
                    {#if editingServiceId === svc.id && editServiceDraft}
                      <div class="item-card item-edit">
                        <input class="input" bind:value={editServiceDraft.title} placeholder="Название" />
                        <div class="two-fields" style="margin-top:6px;">
                          <input class="input" type="number" min="15" bind:value={editServiceDraft.durationMin} placeholder="Минуты" />
                          <input class="input" type="number" min="0" bind:value={editServiceDraft.priceAmount} placeholder="Цена" />
                        </div>
                        <div class="item-card-actions">
                          <button class="btn btn-primary btn-sm" on:click={() => saveService(svc.id)}>Сохранить</button>
                          <button class="btn btn-ghost btn-sm" on:click={cancelEditService}>Отмена</button>
                        </div>
                      </div>
                    {:else}
                      <div class="item-card">
                        <div class="item-card-info">
                          <strong class="item-title">{svc.title}</strong>
                          <span class="item-meta">{svc.durationMin} мин · {Number(svc.priceAmount).toLocaleString('ru-RU')} {svc.currency}</span>
                        </div>
                        <div class="item-card-actions">
                          <button class="btn btn-ghost btn-sm" on:click={() => startEditService(svc)}>Ред.</button>
                          <button class="btn btn-ghost btn-sm danger" on:click={() => deleteService(svc.id)}>Удалить</button>
                        </div>
                      </div>
                    {/if}
                  {/each}
                </div>
              {/if}
              <p class="section-label" style="margin-top:{services.length > 0 ? '16px' : '0'};">Добавить услугу</p>
              <input class="input" style="margin-top:6px;" bind:value={newService.title} placeholder="Название услуги (разовая сессия)" />
              <div class="two-fields">
                <input class="input" type="number" min="15" bind:value={newService.durationMin} placeholder="Продолжительность (мин)" />
                <input class="input" type="number" min="0" bind:value={newService.priceAmount} placeholder="Цена" />
              </div>
              <input class="input" bind:value={newService.currency} placeholder="Валюта (RUB)" />
              <button class="btn btn-primary" on:click={addService}>Добавить услугу</button>
            </section>

            <section class="profile-card">
              <h2>Планы подписки</h2>
              {#if plans.length > 0}
                <div class="item-cards">
                  {#each plans as plan}
                    {#if editingPlanId === plan.id && editPlanDraft}
                      <div class="item-card item-edit">
                        <input class="input" bind:value={editPlanDraft.title} placeholder="Название" />
                        <input class="input" style="margin-top:6px;" type="number" min="0" bind:value={editPlanDraft.priceAmount} placeholder="Цена" />
                        <input class="input" style="margin-top:6px;" bind:value={editPlanDraft.description} placeholder="Описание" />
                        <div class="item-card-actions">
                          <button class="btn btn-primary btn-sm" on:click={() => savePlan(plan.id)}>Сохранить</button>
                          <button class="btn btn-ghost btn-sm" on:click={cancelEditPlan}>Отмена</button>
                        </div>
                      </div>
                    {:else}
                      <div class="item-card">
                        <div class="item-card-info">
                          <strong class="item-title">{plan.title}</strong>
                          <span class="item-meta">{Number(plan.priceAmount).toLocaleString('ru-RU')} {plan.currency}/мес</span>
                          {#if plan.description}
                            <span class="item-desc">{plan.description}</span>
                          {/if}
                        </div>
                        <div class="item-card-actions">
                          <button class="btn btn-ghost btn-sm" on:click={() => startEditPlan(plan)}>Ред.</button>
                          <button class="btn btn-ghost btn-sm danger" on:click={() => deletePlan(plan.id)}>Удалить</button>
                        </div>
                      </div>
                    {/if}
                  {/each}
                </div>
              {/if}
              <p class="section-label" style="margin-top:{plans.length > 0 ? '16px' : '0'};">Добавить план подписки</p>
              <input class="input" style="margin-top:6px;" bind:value={newPlan.title} placeholder="Название плана подписки" />
              <div class="two-fields">
                <input class="input" type="number" min="1" bind:value={newPlan.callsPerMonth} placeholder="Сессий / мес" />
                <input class="input" type="number" min="15" bind:value={newPlan.sessionDurationMin} placeholder="Длительность (мин)" />
              </div>
              <input class="input" type="number" min="1" bind:value={newPlan.durationDays} placeholder="Срок действия в днях" />
              <div class="two-fields">
                <input class="input" bind:value={newPlan.currency} placeholder="Валюта (RUB)" />
                <input class="input" type="number" min="0" bind:value={newPlan.priceAmount} placeholder="Цена" />
              </div>
              <input class="input" bind:value={newPlan.description} placeholder="Описание подписки" />
              <button class="btn btn-primary" on:click={createPlan}>Добавить план</button>
            </section>
          </aside>
        {:else}
          <!-- Mentee right column -->
          <aside class="right-column">
            <!-- Avatar upload -->
            <section class="profile-card">
              <h2>Фото профиля</h2>
              <div class="avatar-preview">
                {#if avatarUrl}
                  <img src={resolveFileUrl(avatarUrl)} alt="Фото профиля" />
                {:else}
                  <span>{$formData.fullName?.slice(0, 1) || '?'}</span>
                {/if}
              </div>
              <input
                bind:this={avatarInput}
                class="sr-only"
                type="file"
                accept=".png,.jpg,.jpeg"
                on:change={uploadAvatar}
              />
              <div class="upload-row">
                <button class="btn btn-primary" on:click={() => avatarInput?.click()} disabled={isUploadingAvatar}>
                  {isUploadingAvatar ? 'Загрузка...' : 'Загрузить фото'}
                </button>
                <span>(.png, .jpg; до 20MB)</span>
              </div>
            </section>

            <!-- Goals management -->
            <section class="profile-card">
              <h2>Добавить цели</h2>
              <p class="goal-hint">Укажите, чему хотите научиться или чего достичь с ментором.</p>
              <div class="goal-input-row">
                <input
                  class="input"
                  bind:value={newGoalInput}
                  placeholder="Например: освоить Python за 3 месяца"
                  on:keydown={(e) => e.key === 'Enter' && addGoal()}
                />
                <button class="btn btn-primary" on:click={addGoal}>+</button>
              </div>
              {#if ($formData.goals || []).length > 0}
                <div class="goal-list">
                  {#each ($formData.goals || []) as goal, i}
                    <div class="goal-item">
                      <span class="goal-text">{goal}</span>
                      <button class="btn btn-ghost btn-sm goal-remove" on:click={() => removeGoal(i)}>×</button>
                    </div>
                  {/each}
                </div>
              {:else}
                <p class="empty-hint">Цели не добавлены</p>
              {/if}
            </section>
          </aside>
        {/if}
      </div>
    </main>
  {/if}
</div>

<style>
  .profile-edit-shell {
    width: 100%;
    max-width: 980px;
    margin: 0 auto;
    padding: 60px 20px;
  }

  .profile-edit-header,
  .title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }

  h1,
  h2 {
    margin: 0;
    color: var(--ink);
    font-family: var(--font-body);
    line-height: 1.15;
  }

  h1 {
    font-size: 1.6rem;
    font-weight: 800;
  }

  h2 {
    font-size: 1.45rem;
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

  .verified-badge-pending {
    border-color: var(--status-warning-border);
    color: var(--status-warning-ink);
  }

  .notice {
    margin-top: 16px;
    padding: 14px 18px;
    border: 1px solid var(--status-success-border);
    border-radius: var(--radius-md);
    background: var(--status-success-bg);
    color: var(--status-success-ink);
  }

  .profile-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.1fr) minmax(300px, 0.9fr);
    gap: 20px;
    margin-top: 16px;
    align-items: start;
  }

  .left-column,
  .right-column {
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-width: 0;
  }

  .profile-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 24px;
  }

  .field {
    display: block;
    margin-top: 14px;
  }

  .field span,
  .file-hint {
    display: block;
    margin-bottom: 6px;
    color: var(--muted);
    font-size: 0.9rem;
  }


  .selection-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
    margin-top: 16px;
  }

  .selection-grid.compact {
    margin-top: 8px;
  }

  .select-item {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 44px;
    padding: 12px;
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    background: var(--surface);
  }

  .avatar-preview {
    width: 240px;
    max-width: 100%;
    aspect-ratio: 1;
    margin: 16px auto 16px;
    overflow: hidden;
    border-radius: var(--radius-lg);
    background: var(--accent-soft);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--accent);
    font-size: 4rem;
    font-weight: 800;
  }

  .avatar-preview img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .upload-row,
  .achievement-row,
  .two-fields {
    display: grid;
    gap: 8px;
  }

  .upload-row {
    grid-template-columns: 1fr auto;
    align-items: center;
  }

  .upload-row span {
    color: var(--muted);
    font-size: 0.9rem;
  }

  .achievement-row {
    grid-template-columns: minmax(0, 1fr) auto auto;
    align-items: center;
  }

  .two-fields {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    margin-top: 8px;
  }

  .right-column .input,
  .right-column .btn {
    margin-top: 8px;
  }

  .achievement-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 14px;
  }

  .achievement-item {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    gap: 8px;
    align-items: center;
    padding: 10px;
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
  }

  .achievement-item a {
    color: var(--accent-link);
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .achievement-item span {
    color: var(--muted);
    font-size: 0.85rem;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  /* Goals */
  .goal-hint {
    font-size: 0.85rem;
    color: var(--muted);
    margin: 0 0 10px;
  }

  .goal-input-row {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 8px;
    align-items: center;
  }

  .goal-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-top: 12px;
  }

  .goal-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 10px 12px;
    background: var(--accent-muted);
    border: 1px solid var(--accent);
    border-radius: var(--radius-md);
  }

  .goal-text {
    font-size: 0.9rem;
    color: var(--ink);
    flex: 1;
    min-width: 0;
    word-break: break-word;
  }

  .goal-remove {
    flex-shrink: 0;
    font-size: 1.1rem;
    line-height: 1;
    padding: 2px 8px;
    color: var(--muted);
  }

  .goal-remove:hover {
    color: var(--status-error-ink);
  }

  .empty-hint {
    font-size: 0.88rem;
    color: var(--muted);
    margin: 10px 0 0;
    text-align: center;
  }

  /* Name row (Имя + Фамилия) */
  .name-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  /* Section label (small uppercase heading) */
  .section-label {
    font-size: 0.78rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--muted);
    margin: 0;
  }

  /* Service/plan item cards */
  .item-cards {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .item-card {
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 12px 14px;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
    background: var(--bg-alt);
  }

  .item-edit {
    flex-direction: column;
    align-items: stretch;
    gap: 0;
    background: var(--surface);
  }

  .item-card-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
    min-width: 0;
  }

  .item-title {
    font-size: 0.9rem;
    color: var(--ink);
    font-weight: 600;
  }

  .item-meta {
    font-size: 0.8rem;
    color: var(--muted);
  }

  .item-desc {
    font-size: 0.82rem;
    color: var(--ink-secondary);
    margin-top: 2px;
  }

  .item-card-actions {
    display: flex;
    gap: 4px;
    flex-shrink: 0;
    margin-top: 8px;
  }

  .btn-sm {
    padding: 4px 10px;
    font-size: 0.8rem;
  }

  .danger {
    color: var(--status-error-ink);
  }

  .danger:hover {
    background: var(--status-error-bg);
  }

  @media (max-width: 560px) {
    .name-row {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 900px) {
    .profile-grid,
    .achievement-row,
    .upload-row {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  @media (max-width: 560px) {
    .profile-edit-shell {
      padding: 32px 20px;
    }

    .selection-grid,
    .two-fields,
    .achievement-item {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
