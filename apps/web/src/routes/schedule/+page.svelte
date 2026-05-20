<script lang="ts">
  import AppHeader from '$lib/components/AppHeader.svelte';
  import Loading from '$lib/components/Loading.svelte';
  import { api } from '$lib/api';
  import { isMentor, isAuthenticated, isLoading as authLoading } from '$lib/stores/auth';
  import { goto } from '$app/navigation';
  import { CalendarDays, Plus, Trash2, Zap } from 'lucide-svelte';

  interface Rule {
    id: string;
    weekday: number;
    startTime: string;
    endTime: string;
    timezone: string;
  }

  interface Slot {
    id: string;
    startAt: string;
    endAt: string;
    status: string;
  }

  let rules: Rule[] = [];
  let freeSlots: Slot[] = [];
  let timezone = 'UTC';
  let isLoading = true;
  let didLoad = false;

  let newWeekday = 1;
  let newStart = '10:00';
  let newEnd = '18:00';

  let fromDate = '';
  let toDate = '';
  let slotDurationMin = 60;
  let generateResult: { created: number; skipped: number } | null = null;
  let isGenerating = false;

  const weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const weekdayFull = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];

  const formatSlot = (iso: string) =>
    new Date(iso).toLocaleDateString('ru-RU', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });

  const loadAll = async () => {
    const [rulesData, slotsData] = await Promise.all([
      api.get<{ rules: Rule[]; timezone: string }>('/scheduling/rules'),
      api.get<Slot[] | { slots: Slot[] }>('/scheduling/slots?status=free'),
    ]);
    rules = rulesData.rules || [];
    timezone = rulesData.timezone || 'UTC';

    const raw = Array.isArray(slotsData) ? slotsData : (slotsData as any).slots ?? [];
    const now = new Date();
    freeSlots = raw
      .filter((s: Slot) => new Date(s.startAt) > now)
      .sort((a: Slot, b: Slot) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
      .slice(0, 20);
  };

  $: if (!$authLoading) {
    if (!$isAuthenticated) {
      goto('/login');
    } else if (!$isMentor) {
      goto('/mentors');
    } else if (!didLoad) {
      didLoad = true;
      loadAll().finally(() => { isLoading = false; });
    }
  }

  const addRule = async () => {
    await api.post('/scheduling/rules', {
      weekday: Number(newWeekday),
      startTime: newStart,
      endTime: newEnd,
      timezone,
    });
    await loadAll();
  };

  const deleteRule = async (id: string) => {
    await api.delete(`/scheduling/rules/${id}`);
    rules = rules.filter((r) => r.id !== id);
  };

  const deleteSlot = async (id: string) => {
    await api.delete(`/scheduling/slots/${id}`);
    freeSlots = freeSlots.filter((s) => s.id !== id);
  };

  const generateSlots = async () => {
    if (!fromDate || !toDate) return;
    isGenerating = true;
    generateResult = null;
    try {
      generateResult = await api.post('/scheduling/slots/generate', {
        from: fromDate,
        to: toDate,
        slotDurationMin: Number(slotDurationMin),
      });
      await loadAll();
    } finally {
      isGenerating = false;
    }
  };
</script>

<div class="page">
  <AppHeader />

  {#if $authLoading || isLoading}
    <Loading />
  {:else}
    <main class="shell">
      <!-- Page header -->
      <div class="page-header">
        <div>
          <h1 class="page-title">Управление расписанием</h1>
          <p class="page-tz">Часовой пояс: <strong>{timezone}</strong></p>
        </div>
        <a class="btn btn-outline calendar-btn" href="/schedule/calendar">
          <CalendarDays size={16} />
          Календарь сессий
        </a>
      </div>

      <div class="content-grid">

        <!-- ─── Left: slots list + availability rules ─── -->
        <div class="left-col">

          <!-- Free slots list -->
          <section class="panel">
            <div class="panel-head">
              <h2>Свободные слоты</h2>
              <span class="slot-count">{freeSlots.length}</span>
            </div>

            {#if freeSlots.length === 0}
              <p class="empty-hint">Нет предстоящих свободных слотов. Сгенерируйте их с помощью формы справа.</p>
            {:else}
              <div class="slot-list">
                {#each freeSlots as slot}
                  <div class="slot-row">
                    <span class="slot-label">{formatSlot(slot.startAt)}</span>
                    <button
                      class="icon-btn danger"
                      on:click={() => deleteSlot(slot.id)}
                      title="Удалить слот"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                {/each}
              </div>
            {/if}
          </section>

          <!-- Availability rules -->
          <section class="panel">
            <h2>Правила доступности</h2>

            {#if rules.length === 0}
              <p class="empty-hint">Правила не заданы. Добавьте правило ниже.</p>
            {:else}
              <div class="rule-list">
                {#each rules as rule}
                  <div class="rule-row">
                    <div class="rule-info">
                      <span class="rule-day">{weekdayFull[rule.weekday - 1]}</span>
                      <span class="rule-time">{rule.startTime} — {rule.endTime}</span>
                    </div>
                    <button
                      class="icon-btn danger"
                      on:click={() => deleteRule(rule.id)}
                      title="Удалить правило"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                {/each}
              </div>
            {/if}

            <!-- Add rule form -->
            <div class="add-rule-form">
              <p class="form-label">Добавить правило</p>
              <div class="rule-inputs">
                <select class="input select-input" bind:value={newWeekday}>
                  {#each weekdays as label, i}
                    <option value={i + 1}>{label}</option>
                  {/each}
                </select>
                <input class="input" type="time" bind:value={newStart} />
                <input class="input" type="time" bind:value={newEnd} />
              </div>
              <button class="btn btn-outline add-btn" on:click={addRule}>
                <Plus size={14} /> Добавить правило
              </button>
            </div>
          </section>
        </div>

        <!-- ─── Right: slot generation ─── -->
        <aside class="right-col">
          <section class="panel panel-sticky">
            <div class="panel-head">
              <h2>Генерация слотов</h2>
              <Zap size={16} style="color:var(--accent);" />
            </div>
            <p class="generate-hint">
              Создаёт слоты по заданным правилам доступности за выбранный период.
            </p>

            <div class="generate-form">
              <label class="form-field">
                <span>С</span>
                <input class="input" type="date" bind:value={fromDate} />
              </label>
              <label class="form-field">
                <span>По</span>
                <input class="input" type="date" bind:value={toDate} />
              </label>
              <label class="form-field">
                <span>Длительность слота (мин)</span>
                <input class="input" type="number" min="15" max="180" step="15" bind:value={slotDurationMin} />
              </label>
            </div>

            <button
              class="btn btn-primary generate-btn"
              on:click={generateSlots}
              disabled={isGenerating || !fromDate || !toDate}
            >
              {isGenerating ? 'Генерация...' : 'Сгенерировать слоты'}
            </button>

            {#if generateResult}
              <div class="generate-result">
                <div class="result-row">
                  <span>Создано</span>
                  <strong class="accent">{generateResult.created}</strong>
                </div>
                <div class="result-row">
                  <span>Пропущено</span>
                  <strong>{generateResult.skipped}</strong>
                </div>
              </div>
            {/if}
          </section>
        </aside>
      </div>
    </main>
  {/if}
</div>

<style>
  .shell {
    max-width: 980px;
    margin: 0 auto;
    padding: 44px 20px 100px;
  }

  /* Page header */
  .page-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
    margin-bottom: 28px;
  }

  .page-title {
    font-size: 1.75rem;
    font-weight: 800;
    color: var(--ink);
    margin: 0 0 4px;
  }

  .page-tz {
    font-size: 0.88rem;
    color: var(--muted);
    margin: 0;
  }

  .calendar-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    white-space: nowrap;
  }

  /* Two-column grid */
  .content-grid {
    display: grid;
    grid-template-columns: 1fr 320px;
    gap: 20px;
    align-items: start;
  }

  .left-col,
  .right-col {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  /* Panel (card) */
  .panel {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 22px 24px;
  }

  .panel-sticky {
    position: sticky;
    top: 24px;
  }

  .panel-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 16px;
  }

  .panel h2 {
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--ink);
    margin: 0 0 16px;
  }

  .panel-head h2 {
    margin-bottom: 0;
  }

  /* Slot count badge */
  .slot-count {
    background: var(--bg-alt);
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 2px 10px;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--muted);
  }

  /* Free slots list */
  .slot-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-height: 300px;
    overflow-y: auto;
  }

  .slot-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 8px 10px;
    border-radius: var(--radius-md);
    background: var(--bg-alt);
  }

  .slot-row:hover {
    background: var(--accent-muted);
  }

  .slot-label {
    font-size: 0.88rem;
    color: var(--ink-secondary);
    font-weight: 500;
  }

  /* Availability rules */
  .rule-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 16px;
  }

  .rule-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 10px 12px;
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    background: var(--bg-alt);
  }

  .rule-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .rule-day {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--ink);
  }

  .rule-time {
    font-size: 0.82rem;
    color: var(--muted);
  }

  /* Icon-only buttons */
  .icon-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border: none;
    background: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    color: var(--muted);
    transition: all 0.15s ease;
    flex-shrink: 0;
  }

  .icon-btn.danger:hover {
    background: var(--status-error-bg);
    color: var(--status-error-ink);
  }

  /* Add rule form */
  .add-rule-form {
    padding-top: 16px;
    border-top: 1px solid var(--border);
  }

  .form-label {
    font-size: 0.8rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--muted);
    margin: 0 0 10px;
  }

  .rule-inputs {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 8px;
    margin-bottom: 10px;
  }

  .select-input {
    appearance: none;
  }

  .add-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 0.88rem;
  }

  /* Generate form */
  .generate-hint {
    font-size: 0.85rem;
    color: var(--muted);
    margin: 0 0 18px;
    line-height: 1.5;
  }

  .generate-form {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 16px;
  }

  .form-field {
    display: block;
  }

  .form-field span {
    display: block;
    font-size: 0.82rem;
    color: var(--muted);
    font-weight: 600;
    margin-bottom: 4px;
  }

  .generate-btn {
    width: 100%;
    justify-content: center;
  }

  /* Generate result */
  .generate-result {
    margin-top: 14px;
    background: var(--bg-alt);
    border-radius: var(--radius-md);
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .result-row {
    display: flex;
    justify-content: space-between;
    font-size: 0.88rem;
    color: var(--muted);
  }

  .result-row strong {
    color: var(--ink);
  }

  .result-row strong.accent {
    color: var(--accent);
  }

  /* Empty hints */
  .empty-hint {
    font-size: 0.88rem;
    color: var(--muted);
    margin: 0;
    line-height: 1.5;
  }

  @media (max-width: 760px) {
    .content-grid {
      grid-template-columns: 1fr;
    }

    .panel-sticky {
      position: static;
    }

    .rule-inputs {
      grid-template-columns: 1fr 1fr;
    }
  }

  @media (max-width: 480px) {
    .shell {
      padding: 24px 16px 80px;
    }

    .rule-inputs {
      grid-template-columns: 1fr;
    }
  }
</style>
