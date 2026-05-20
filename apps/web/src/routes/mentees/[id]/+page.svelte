<script lang="ts">
  import AppHeader from '$lib/components/AppHeader.svelte';
  import Loading from '$lib/components/Loading.svelte';
  import { api } from '$lib/api';
  import { page } from '$app/stores';
  import { isAuthenticated, isLoading as authLoading, isMentor } from '$lib/stores/auth';
  import { goto } from '$app/navigation';

  interface MenteeProfile {
    userId: string;
    age: number | null;
    education: string | null;
    position: string | null;
    workplace: string | null;
    activityFields: string[];
    background: string | null;
    goals: string[];
    hobbies: string[];
    skills: string[];
    user: {
      id: string;
      fullName: string;
      email: string;
      timezone: string;
    };
  }

  let profile: MenteeProfile | null = null;
  let isLoading = true;
  let error: string | null = null;
  let didLoad = false;

  $: if (!$authLoading) {
    if (!$isAuthenticated) {
      goto('/login');
    } else if (!$isMentor) {
      goto('/mentors');
    } else if (!didLoad) {
      didLoad = true;
      api.get<MenteeProfile>(`/profile/mentor/mentees/${$page.params.id}`)
        .then((p) => { profile = p; })
        .catch(() => { error = 'Профиль менти недоступен.'; })
        .finally(() => { isLoading = false; });
    }
  }
</script>

<div class="page">
  <AppHeader />

  {#if $authLoading || isLoading}
    <Loading />
  {:else if !profile}
    <main class="container section">
      <div class="card">
        <h1 class="section-title">Профиль менти</h1>
        <p class="muted">{error || 'Профиль не найден'}</p>
        <a class="btn btn-ghost" href="/sessions">← Назад к сессиям</a>
      </div>
    </main>
  {:else}
    <main class="shell">
      <a class="btn btn-ghost back-link" href="/sessions">← Назад к сессиям</a>

      <!-- Header card -->
      <div class="mentee-card">
        <div class="mentee-header">
          <div class="mentee-avatar">
            {profile.user.fullName.slice(0, 1)}
          </div>
          <div class="mentee-info">
            <h1 class="mentee-name">{profile.user.fullName}</h1>
            <p class="mentee-email">{profile.user.email}</p>
            {#if profile.age}
              <span class="mentee-age">{profile.age} лет</span>
            {/if}
          </div>
        </div>

        <!-- Career -->
        {#if profile.education || profile.position || profile.workplace || (profile.activityFields?.length ?? 0) > 0}
          <div class="section-divider">
            <h2 class="section-heading">Карьера</h2>
            <div class="meta-grid">
              {#if profile.education}
                <div class="meta-item">
                  <span class="meta-label">Образование</span>
                  <span class="meta-value">{profile.education}</span>
                </div>
              {/if}
              {#if profile.position}
                <div class="meta-item">
                  <span class="meta-label">Должность</span>
                  <span class="meta-value">{profile.position}</span>
                </div>
              {/if}
              {#if profile.workplace}
                <div class="meta-item">
                  <span class="meta-label">Место работы</span>
                  <span class="meta-value">{profile.workplace}</span>
                </div>
              {/if}
            </div>
            {#if (profile.activityFields?.length ?? 0) > 0}
              <div class="tag-row">
                {#each profile.activityFields as field}
                  <span class="tag">{field}</span>
                {/each}
              </div>
            {/if}
          </div>
        {/if}

        <!-- Background/context -->
        {#if profile.background}
          <div class="section-divider">
            <h2 class="section-heading">Контекст</h2>
            <p class="section-text">{profile.background}</p>
          </div>
        {/if}
      </div>

      <!-- Goals card (highlighted) -->
      {#if (profile.goals?.length ?? 0) > 0}
        <div class="goals-card">
          <h2 class="goals-title">🎯 Цели менти</h2>
          <div class="goals-list">
            {#each profile.goals as goal}
              <div class="goal-item">{goal}</div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Skills & hobbies -->
      {#if (profile.skills?.length ?? 0) > 0 || (profile.hobbies?.length ?? 0) > 0}
        <div class="info-row">
          {#if (profile.skills?.length ?? 0) > 0}
            <div class="mentee-card flex-card">
              <h2 class="section-heading">Навыки</h2>
              <div class="tag-row">
                {#each profile.skills as skill}
                  <span class="tag">{skill}</span>
                {/each}
              </div>
            </div>
          {/if}
          {#if (profile.hobbies?.length ?? 0) > 0}
            <div class="mentee-card flex-card">
              <h2 class="section-heading">Хобби</h2>
              <div class="tag-row">
                {#each profile.hobbies as hobby}
                  <span class="tag tag-muted">{hobby}</span>
                {/each}
              </div>
            </div>
          {/if}
        </div>
      {/if}
    </main>
  {/if}
</div>

<style>
  .shell {
    max-width: 820px;
    margin: 0 auto;
    padding: 40px 20px 80px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .back-link {
    align-self: flex-start;
  }

  /* Main mentee card */
  .mentee-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 28px;
  }

  .mentee-header {
    display: flex;
    align-items: center;
    gap: 20px;
    margin-bottom: 4px;
  }

  .mentee-avatar {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    background: var(--accent-muted);
    color: var(--accent);
    font-size: 1.8rem;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .mentee-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .mentee-name {
    font-size: 1.4rem;
    font-weight: 800;
    color: var(--ink);
    margin: 0;
  }

  .mentee-email {
    font-size: 0.9rem;
    color: var(--muted);
    margin: 0;
  }

  .mentee-age {
    font-size: 0.85rem;
    color: var(--muted);
  }

  /* Sections inside card */
  .section-divider {
    margin-top: 22px;
    padding-top: 22px;
    border-top: 1px solid var(--border);
  }

  .section-heading {
    font-size: 0.85rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--muted);
    margin: 0 0 12px;
  }

  .meta-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 12px;
    margin-bottom: 12px;
  }

  .meta-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .meta-label {
    font-size: 0.78rem;
    color: var(--muted);
  }

  .meta-value {
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--ink);
  }

  .section-text {
    font-size: 0.92rem;
    color: var(--ink-secondary);
    margin: 0;
    line-height: 1.6;
  }

  /* Goals card */
  .goals-card {
    background: var(--accent-muted);
    border: 1.5px solid var(--accent);
    border-radius: var(--radius-lg);
    padding: 22px 24px;
  }

  .goals-title {
    font-size: 1rem;
    font-weight: 700;
    color: var(--accent);
    margin: 0 0 14px;
  }

  .goals-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .goal-item {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 10px 14px;
    font-size: 0.92rem;
    color: var(--ink);
    font-weight: 500;
  }

  /* Tags */
  .tag-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .tag {
    background: var(--bg-alt);
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 4px 12px;
    font-size: 0.82rem;
    color: var(--ink-secondary);
    font-weight: 500;
  }

  .tag-muted {
    color: var(--muted);
  }

  /* Skills/hobbies row */
  .info-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 16px;
  }

  .flex-card {
    padding: 20px 24px;
  }

  @media (max-width: 600px) {
    .shell {
      padding: 24px 16px 60px;
    }

    .mentee-header {
      flex-direction: column;
      align-items: flex-start;
    }

    .info-row {
      grid-template-columns: 1fr;
    }
  }
</style>
