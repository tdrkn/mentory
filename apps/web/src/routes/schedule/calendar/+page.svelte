<script lang="ts">
  import AppHeader from '$lib/components/AppHeader.svelte';
  import Loading from '$lib/components/Loading.svelte';
  import { api } from '$lib/api';
  import { isMentor, isAuthenticated, isLoading as authLoading } from '$lib/stores/auth';
  import { goto } from '$app/navigation';
  import { ChevronLeft, ChevronRight, Plus } from 'lucide-svelte';

  interface CalSlot {
    id: string;
    startAt: string;
    endAt: string;
    status: string;
  }

  interface CalSession {
    id: string;
    startAt: string;
    endAt: string;
    status: string;
    mentee: { id: string; fullName: string };
    service: { title: string };
  }

  let slots: CalSlot[] = [];
  let sessions: CalSession[] = [];
  let isLoading = true;
  let didLoad = false;

  // Week navigation: weekOffset 0 = current week
  let weekOffset = 0;

  // Compute week start (Monday) for given offset
  const getWeekStart = (offset: number): Date => {
    const d = new Date();
    const day = d.getDay(); // 0=Sun
    const diffToMon = day === 0 ? -6 : 1 - day;
    const mon = new Date(d);
    mon.setDate(d.getDate() + diffToMon + offset * 7);
    mon.setHours(0, 0, 0, 0);
    return mon;
  };

  $: weekStart = getWeekStart(weekOffset);
  $: weekEnd = (() => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); return d; })();

  $: weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  $: getEventsForDay = (day: Date) => {
    const s = slots
      .filter((s) => isSameDay(new Date(s.startAt), day))
      .map((s) => ({ ...s, type: 'slot' as const }));
    const ses = sessions
      .filter((s) => isSameDay(new Date(s.startAt), day))
      .map((s) => ({ ...s, type: 'session' as const }));
    return [...s, ...ses].sort(
      (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
    );
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

  const formatDayHeader = (d: Date) => {
    const dayName = d.toLocaleDateString('ru-RU', { weekday: 'short' });
    const num = d.getDate();
    return { name: dayName, num };
  };

  const formatWeekRange = (start: Date) => {
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return `${start.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })} — ${end.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}`;
  };

  const isToday = (d: Date) => isSameDay(d, new Date());

  const loadCalendar = async () => {
    isLoading = true;
    try {
      const from = weekStart.toISOString();
      const to = weekEnd.toISOString();
      const data = await api.get<{ slots: CalSlot[]; sessions: CalSession[] }>(
        `/scheduling/calendar?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
      );
      slots = data.slots || [];
      sessions = data.sessions || [];
    } finally {
      isLoading = false;
    }
  };

  $: if (!$authLoading) {
    if (!$isAuthenticated) {
      goto('/login');
    } else if (!$isMentor) {
      goto('/mentors');
    } else if (!didLoad) {
      didLoad = true;
      loadCalendar();
    }
  }

  // Reload when week changes
  $: weekOffset, didLoad && loadCalendar();

  const sessionStatusLabel = (status: string) => {
    switch (status) {
      case 'booked': return 'Подтверждена';
      case 'completed': return 'Завершена';
      case 'requested': return 'Ожидает';
      case 'paid': return 'Оплачена';
      default: return status;
    }
  };
</script>

<div class="page">
  <AppHeader />

  {#if $authLoading}
    <Loading />
  {:else}
    <main class="shell">
      <!-- Page header -->
      <div class="cal-header">
        <div class="cal-header-left">
          <a class="btn btn-ghost back-btn" href="/schedule">← Расписание</a>
          <h1 class="cal-title">Календарь сессий</h1>
        </div>
        <a class="btn btn-primary add-slots-btn" href="/schedule">
          <Plus size={15} /> Добавить слоты
        </a>
      </div>

      <!-- Week navigation -->
      <div class="week-nav">
        <button class="week-nav-btn" on:click={() => weekOffset--}>
          <ChevronLeft size={18} />
        </button>
        <span class="week-range">{formatWeekRange(weekStart)}</span>
        <button class="week-nav-btn" on:click={() => weekOffset++}>
          <ChevronRight size={18} />
        </button>
        {#if weekOffset !== 0}
          <button class="btn btn-ghost today-btn" on:click={() => weekOffset = 0}>
            Сегодня
          </button>
        {/if}
      </div>

      {#if isLoading}
        <Loading />
      {:else}
        <!-- Weekly grid -->
        <div class="week-grid">
          {#each weekDays as day}
            {@const events = getEventsForDay(day)}
            {@const hdr = formatDayHeader(day)}
            <div class="day-col {isToday(day) ? 'day-today' : ''}">
              <!-- Day header -->
              <div class="day-head">
                <span class="day-name">{hdr.name}</span>
                <span class="day-num {isToday(day) ? 'today-num' : ''}">{hdr.num}</span>
              </div>

              <!-- Events -->
              <div class="day-events">
                {#if events.length === 0}
                  <div class="day-empty">
                    <span>—</span>
                  </div>
                {:else}
                  {#each events as event}
                    {#if event.type === 'session'}
                      <a
                        class="cal-event cal-session cal-{event.status}"
                        href="/sessions/{event.id}"
                      >
                        <span class="event-time">{formatTime(event.startAt)}</span>
                        <span class="event-name">{event.mentee.fullName}</span>
                        <span class="event-service">{event.service.title}</span>
                        <span class="event-status">{sessionStatusLabel(event.status)}</span>
                      </a>
                    {:else}
                      <div class="cal-event cal-free">
                        <span class="event-time">{formatTime(event.startAt)} — {formatTime(event.endAt)}</span>
                        <span class="event-name">Свободно</span>
                      </div>
                    {/if}
                  {/each}
                {/if}
              </div>
            </div>
          {/each}
        </div>

        <!-- Legend -->
        <div class="legend">
          <div class="legend-item">
            <span class="legend-dot session-dot"></span>
            <span>Сессия</span>
          </div>
          <div class="legend-item">
            <span class="legend-dot free-dot"></span>
            <span>Свободный слот</span>
          </div>
        </div>
      {/if}
    </main>
  {/if}
</div>

<style>
  .shell {
    max-width: 1200px;
    margin: 0 auto;
    padding: 32px 20px 100px;
  }

  /* Page header */
  .cal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
    margin-bottom: 20px;
  }

  .cal-header-left {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .back-btn {
    font-size: 0.88rem;
  }

  .cal-title {
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--ink);
    margin: 0;
  }

  .add-slots-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  /* Week navigation */
  .week-nav {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 20px;
    flex-wrap: wrap;
  }

  .week-nav-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    background: var(--surface);
    cursor: pointer;
    color: var(--ink-secondary);
    transition: all 0.15s ease;
  }

  .week-nav-btn:hover {
    border-color: var(--accent);
    color: var(--accent);
  }

  .week-range {
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--ink);
  }

  .today-btn {
    font-size: 0.85rem;
    padding: 6px 12px;
  }

  /* Week grid */
  .week-grid {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: 1px;
    background: var(--border);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    overflow: hidden;
  }

  /* Day column */
  .day-col {
    background: var(--surface);
    min-height: 360px;
    display: flex;
    flex-direction: column;
  }

  .day-col.day-today {
    background: var(--accent-muted);
  }

  /* Day header */
  .day-head {
    padding: 10px 10px 8px;
    border-bottom: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    background: var(--bg-alt);
  }

  .day-today .day-head {
    background: var(--accent-muted);
  }

  .day-name {
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted);
  }

  .day-num {
    font-size: 1.2rem;
    font-weight: 800;
    color: var(--ink);
    line-height: 1;
  }

  .today-num {
    color: var(--accent);
    background: var(--accent);
    color: #fff;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1rem;
  }

  /* Day events area */
  .day-events {
    flex: 1;
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .day-empty {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--muted);
    font-size: 1rem;
    opacity: 0.4;
  }

  /* Calendar events */
  .cal-event {
    border-radius: var(--radius-md);
    padding: 8px 9px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    text-decoration: none;
    font-size: 0.78rem;
    transition: opacity 0.15s ease;
  }

  .cal-session {
    background: var(--accent);
    color: #fff;
  }

  .cal-session:hover {
    opacity: 0.9;
  }

  .cal-session.cal-booked {
    background: var(--accent);
  }

  .cal-session.cal-completed {
    background: var(--status-success-ink);
    opacity: 0.85;
  }

  .cal-session.cal-requested,
  .cal-session.cal-paid {
    background: var(--status-warning-ink);
  }

  .cal-free {
    background: var(--bg-alt);
    border: 1.5px dashed var(--border);
    color: var(--muted);
  }

  .event-time {
    font-size: 0.72rem;
    font-weight: 600;
    opacity: 0.85;
    letter-spacing: 0.01em;
  }

  .event-name {
    font-weight: 700;
    font-size: 0.8rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .event-service {
    font-size: 0.72rem;
    opacity: 0.8;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .event-status {
    font-size: 0.68rem;
    opacity: 0.75;
    margin-top: 2px;
  }

  /* Legend */
  .legend {
    display: flex;
    gap: 20px;
    margin-top: 16px;
    align-items: center;
    flex-wrap: wrap;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.82rem;
    color: var(--muted);
  }

  .legend-dot {
    width: 12px;
    height: 12px;
    border-radius: 3px;
  }

  .session-dot {
    background: var(--accent);
  }

  .free-dot {
    background: var(--bg-alt);
    border: 1.5px dashed var(--border);
  }

  /* Responsive */
  @media (max-width: 800px) {
    .week-grid {
      grid-template-columns: repeat(7, minmax(80px, 1fr));
      overflow-x: auto;
    }

    .shell {
      padding: 20px 12px 80px;
    }
  }

  @media (max-width: 560px) {
    .cal-header-left {
      flex-wrap: wrap;
    }

    .cal-title {
      font-size: 1.25rem;
    }
  }
</style>
