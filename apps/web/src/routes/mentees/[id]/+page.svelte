<script lang="ts">
  import AppHeader from '$lib/components/AppHeader.svelte';
  import Loading from '$lib/components/Loading.svelte';
  import { api } from '$lib/api';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { isAuthenticated, isLoading as authLoading, isMentor } from '$lib/stores/auth';

  interface MenteeProfile {
    userId: string;
    age: number | null;
    education: string | null;
    workplace: string | null;
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

  onMount(async () => {
    if (!$isAuthenticated && !$authLoading) {
      goto('/login');
      return;
    }

    if ($isAuthenticated && !$isMentor) {
      goto('/mentors');
      return;
    }

    try {
      profile = await api.get<MenteeProfile>(`/profile/mentor/mentees/${$page.params.id}`);
    } catch {
      error = 'Профиль менти недоступен.';
    } finally {
      isLoading = false;
    }
  });
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
        <a class="btn btn-ghost" href="/dashboard">Назад в дашборд</a>
      </div>
    </main>
  {:else}
    <main class="container section" style="max-width:860px;">
      <a class="btn btn-ghost" href="/dashboard">← Назад в дашборд</a>

      <div class="card" style="margin-top:12px;">
        <h1 class="section-title">{profile.user.fullName}</h1>
        <p class="muted">{profile.user.email}</p>

        <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-top:16px;">
          <div class="surface">
            <div class="muted">Возраст</div>
            <strong>{profile.age ?? 'Не указан'}</strong>
          </div>
          <div class="surface">
            <div class="muted">Образование</div>
            <strong>{profile.education || 'Не указано'}</strong>
          </div>
          <div class="surface">
            <div class="muted">Место работы</div>
            <strong>{profile.workplace || 'Не указано'}</strong>
          </div>
        </div>
      </div>

      <div class="card" style="margin-top:16px;">
        <h2 class="section-title">Цели</h2>
        {#if profile.goals?.length}
          <div class="stack">
            {#each profile.goals as goal}
              <div class="surface">{goal}</div>
            {/each}
          </div>
        {:else}
          <p class="muted">Цели не указаны.</p>
        {/if}
      </div>

      <div class="card" style="margin-top:16px;">
        <h2 class="section-title">Хобби</h2>
        {#if profile.hobbies?.length}
          <p>{profile.hobbies.join(', ')}</p>
        {:else}
          <p class="muted">Хобби не указаны.</p>
        {/if}
      </div>
    </main>
  {/if}
</div>
