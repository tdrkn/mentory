<script lang="ts">
  import AppHeader from '$lib/components/AppHeader.svelte';
  import Loading from '$lib/components/Loading.svelte';
  import { api } from '$lib/api';
  import { onMount } from 'svelte';
  import { isMentor, isAuthenticated, isLoading as authLoading } from '$lib/stores/auth';
  import { goto } from '$app/navigation';

  interface Rule {
    id: string;
    weekday: number;
    startTime: string;
    endTime: string;
    timezone: string;
  }

  let rules: Rule[] = [];
  let timezone = 'UTC';
  let isLoading = true;

  let newWeekday = 1;
  let newStart = '10:00';
  let newEnd = '18:00';

  let fromDate = '';
  let toDate = '';
  let slotDurationMin = 60;
  let generateResult: { created: number; skipped: number } | null = null;

  const weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  const loadRules = async () => {
    const data = await api.get<{ rules: Rule[]; timezone: string }>('/scheduling/rules');
    rules = data.rules || [];
    timezone = data.timezone || 'UTC';
  };

  const addRule = async () => {
    await api.post('/scheduling/rules', {
      weekday: newWeekday,
      startTime: newStart,
      endTime: newEnd,
      timezone,
    });
    await loadRules();
  };

  const deleteRule = async (id: string) => {
    await api.delete(`/scheduling/rules/${id}`);
    await loadRules();
  };

  const generateSlots = async () => {
    if (!fromDate || !toDate) return;
    generateResult = await api.post('/scheduling/slots/generate', {
      from: fromDate,
      to: toDate,
      slotDurationMin,
    });
  };

  onMount(async () => {
    if (!$isAuthenticated && !$authLoading) {
      goto('/login');
      return;
    }
    if ($isAuthenticated && !$isMentor) {
      goto('/mentors');
      return;
    }

    await loadRules();
    isLoading = false;
  });
</script>

<div class="page">
  <AppHeader />

  {#if $authLoading || isLoading}
    <Loading />
  {:else}
    <main class="container section">
      <h1 class="section-title">Управление расписанием</h1>
      <p class="muted">Часовой пояс: {timezone}</p>

      <div class="grid" style="grid-template-columns:1.2fr 1fr;gap:20px;">
        <div class="card">
          <h2 class="section-title">Правила доступности</h2>
          {#if rules.length === 0}
            <p class="muted">Правила не заданы.</p>
          {:else}
            <div class="stack">
              {#each rules as rule}
                <div class="surface" style="display:flex;justify-content:space-between;align-items:center;">
                  <div>
                    <strong>{weekdays[rule.weekday - 1]}</strong>
                    <div class="muted">{rule.startTime} — {rule.endTime}</div>
                  </div>
                  <button class="btn btn-ghost" on:click={() => deleteRule(rule.id)}>Удалить</button>
                </div>
              {/each}
            </div>
          {/if}

          <div class="surface" style="margin-top:16px;">
            <h3 style="margin-top:0;">Добавить правило</h3>
            <div class="grid" style="grid-template-columns:1fr 1fr 1fr;gap:8px;">
              <select class="select" bind:value={newWeekday}>
                {#each weekdays as label, i}
                  <option value={i + 1}>{label}</option>
                {/each}
              </select>
              <input class="input" type="time" bind:value={newStart} />
              <input class="input" type="time" bind:value={newEnd} />
            </div>
            <button class="btn btn-primary" style="margin-top:12px;" on:click={addRule}>Добавить</button>
          </div>
        </div>

        <div class="card">
          <h2 class="section-title">Генерация слотов</h2>
          <div class="stack">
            <label>
              <div class="muted" style="margin-bottom:6px;">С</div>
              <input class="input" type="date" bind:value={fromDate} />
            </label>
            <label>
              <div class="muted" style="margin-bottom:6px;">По</div>
              <input class="input" type="date" bind:value={toDate} />
            </label>
            <label>
              <div class="muted" style="margin-bottom:6px;">Длительность (мин)</div>
              <input class="input" type="number" min="15" max="180" bind:value={slotDurationMin} />
            </label>
            <button class="btn btn-primary" on:click={generateSlots}>Сгенерировать</button>
          </div>

          {#if generateResult}
            <div class="surface" style="margin-top:16px;">
              Создано: {generateResult.created} · Пропущено: {generateResult.skipped}
            </div>
          {/if}
        </div>
      </div>
    </main>
  {/if}
</div>
