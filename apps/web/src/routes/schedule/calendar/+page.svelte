<script lang="ts">
  import AppHeader from '$lib/components/AppHeader.svelte';
  import Loading from '$lib/components/Loading.svelte';
  import { api } from '$lib/api';
  import { isMentor, isAuthenticated, isLoading as authLoading } from '$lib/stores/auth';
  import { goto } from '$app/navigation';
  import { onMount, onDestroy } from 'svelte';

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

  // Time-grid: hours shown 8..22 (15 rows). 1 hour = 60px tall.
  const HOUR_START = 8;
  const HOUR_END = 22;
  const HOUR_HEIGHT = 60;
  const HOURS = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);

  // Live "now" tick — used for red current-time line
  let now = new Date();
  let nowTimer: ReturnType<typeof setInterval> | null = null;

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

  const isToday = (d: Date) => isSameDay(d, now);

  // Convert ISO datetime → top-offset in pixels relative to grid top (HOUR_START)
  const topPx = (iso: string) => {
    const d = new Date(iso);
    const h = d.getHours() + d.getMinutes() / 60;
    return Math.max(0, (h - HOUR_START) * HOUR_HEIGHT);
  };

  const heightPx = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    const diffH = (e.getTime() - s.getTime()) / (1000 * 60 * 60);
    return Math.max(30, diffH * HOUR_HEIGHT);
  };

  // Current-time line position (only when the displayed week contains today)
  $: showNowLine = weekDays.some((d) => isSameDay(d, now));
  $: nowLineTop = (() => {
    const h = now.getHours() + now.getMinutes() / 60;
    if (h < HOUR_START || h > HOUR_END) return null;
    return (h - HOUR_START) * HOUR_HEIGHT;
  })();
  $: nowLineLabel = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

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

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const formatWeekRange = (start: Date) => {
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const monthName = (d: Date) => d.toLocaleDateString('ru-RU', { month: 'long' });
    if (start.getMonth() === end.getMonth()) {
      return `${start.getDate()} - ${end.getDate()} ${monthName(start)}`;
    }
    return `${start.getDate()} ${monthName(start)} - ${end.getDate()} ${monthName(end)}`;
  };

  const monthDayNames = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
  const dayFullName = (d: Date) => monthDayNames[d.getDay()];

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

  onMount(() => {
    nowTimer = setInterval(() => { now = new Date(); }, 60_000);
  });
  onDestroy(() => {
    if (nowTimer) clearInterval(nowTimer);
  });

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

<svelte:head>
  <title>Календарь сессий — Mentory</title>
</svelte:head>

<div class="page">
  <AppHeader />

  {#if $authLoading}
    <Loading />
  {:else}
    <main class="shell">
      <!-- Page header -->
      <div class="cal-header">
        <div class="cal-header-left">
          <a class="back-link" href="/schedule">← Управление слотами</a>
          <h1 class="cal-title">Календарь сессий</h1>
        </div>
        <a class="btn btn-primary add-slots-btn" href="/schedule">
          Добавить новые слоты
        </a>
      </div>

      {#if isLoading}
        <Loading />
      {:else}
        <!-- Calendar card -->
        <div class="cal-card">
          <!-- Week navigation -->
          <div class="week-nav">
            <button class="nav-arrow" on:click={() => weekOffset--} aria-label="Предыдущая неделя">◀</button>
            <span class="week-range">{formatWeekRange(weekStart)}</span>
            <button class="nav-arrow" on:click={() => weekOffset++} aria-label="Следующая неделя">▶</button>
            {#if weekOffset !== 0}
              <button class="today-btn" on:click={() => weekOffset = 0}>Сегодня</button>
            {/if}
          </div>

          <!-- Day headers -->
          <div class="day-headers">
            <div class="time-axis-header"></div>
            {#each weekDays as day}
              <div class="day-head {isToday(day) ? 'day-today' : ''}">
                <div class="day-name">{dayFullName(day)}</div>
                <div class="day-num">{day.getDate()}</div>
              </div>
            {/each}
          </div>

          <!-- Time grid -->
          <div class="time-grid">
            <!-- Y-axis time labels -->
            <div class="time-axis">
              {#each HOURS as h}
                <div class="time-label" style="height: {HOUR_HEIGHT}px;">
                  <span>{String(h).padStart(2, '0')}:00</span>
                </div>
              {/each}
            </div>

            <!-- Day columns with absolutely-positioned events -->
            {#each weekDays as day}
              {@const events = getEventsForDay(day)}
              <div class="day-col {isToday(day) ? 'day-col-today' : ''}">
                <!-- Hour grid lines (background) -->
                {#each HOURS as h}
                  <div class="hour-cell" style="height: {HOUR_HEIGHT}px;"></div>
                {/each}

                <!-- Empty-state pill if no events for the day -->
                {#if events.length === 0}
                  <div class="empty-day-pill" style="top: {HOUR_HEIGHT * 0.5}px;">
                    Записи пока нет
                  </div>
                {/if}

                <!-- Events (absolute, positioned by start time) -->
                {#each events as event}
                  {@const top = topPx(event.startAt)}
                  {@const height = heightPx(event.startAt, event.endAt)}
                  {#if event.type === 'session'}
                    <a
                      class="cal-event cal-session cal-{event.status}"
                      href="/sessions/{event.id}"
                      style="top: {top}px; height: {height}px;"
                    >
                      <div class="event-time-row">
                        <span class="event-time">{formatTime(event.startAt)} - {formatTime(event.endAt)}</span>
                        <span class="event-status-badge">{sessionStatusLabel(event.status)}</span>
                      </div>
                      <div class="event-service">{event.service.title}</div>
                      <div class="event-mentee">Менти {event.mentee.fullName}</div>
                    </a>
                  {:else}
                    <div
                      class="cal-event cal-free"
                      style="top: {top}px; height: {height}px;"
                    >
                      <div class="event-time-row">
                        <span class="event-time">{formatTime(event.startAt)} - {formatTime(event.endAt)}</span>
                      </div>
                      <div class="event-service">Свободный слот</div>
                    </div>
                  {/if}
                {/each}
              </div>
            {/each}

            <!-- Current-time red line (overlays the whole grid) -->
            {#if showNowLine && nowLineTop !== null}
              <div class="now-line" style="top: {nowLineTop}px;">
                <span class="now-label">{nowLineLabel}</span>
                <span class="now-bar"></span>
              </div>
            {/if}
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
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
    margin-bottom: 20px;
  }

  .cal-header-left {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .back-link {
    font-size: 0.85rem;
    color: var(--muted);
    text-decoration: none;
  }
  .back-link:hover { color: var(--accent); }

  .cal-title {
    font-size: 1.6rem;
    font-weight: 800;
    color: var(--ink);
    margin: 0;
  }

  .add-slots-btn {
    padding: 12px 20px;
    font-size: 0.95rem;
  }

  /* Calendar card container */
  .cal-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 18px 18px 8px;
  }

  /* Week navigation row */
  .week-nav {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 14px;
    padding: 0 4px;
  }

  .nav-arrow {
    width: 32px;
    height: 32px;
    border: none;
    background: none;
    color: var(--ink-secondary);
    font-size: 1rem;
    cursor: pointer;
    border-radius: var(--radius-md);
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .nav-arrow:hover { background: var(--bg-alt); color: var(--accent); }

  .week-range {
    font-size: 1rem;
    font-weight: 700;
    color: var(--ink);
  }

  .today-btn {
    margin-left: auto;
    padding: 6px 14px;
    font-size: 0.82rem;
    background: none;
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    color: var(--ink-secondary);
    cursor: pointer;
  }
  .today-btn:hover { border-color: var(--accent); color: var(--accent); }

  /* Day headers row */
  .day-headers {
    display: grid;
    grid-template-columns: 56px repeat(7, minmax(0, 1fr));
    background: var(--accent-soft, #eef2ff);
    border-radius: var(--radius-md) var(--radius-md) 0 0;
    border-bottom: 1px solid var(--border);
  }

  .day-head {
    padding: 8px 4px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    text-align: center;
    border-left: 1px solid var(--border);
  }

  .day-head.day-today {
    background: #c7d2fe;
  }

  .day-name {
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--ink);
  }

  .day-num {
    font-size: 1rem;
    font-weight: 700;
    color: var(--ink);
  }

  /* Time grid container */
  .time-grid {
    display: grid;
    grid-template-columns: 56px repeat(7, minmax(0, 1fr));
    position: relative;
  }

  /* Y-axis */
  .time-axis {
    display: flex;
    flex-direction: column;
  }

  .time-label {
    display: flex;
    align-items: flex-start;
    justify-content: flex-end;
    padding-right: 8px;
    padding-top: 2px;
    font-size: 0.72rem;
    color: var(--muted);
    box-sizing: border-box;
  }

  /* Day column with positioned events */
  .day-col {
    position: relative;
    border-left: 1px solid var(--border);
    overflow: hidden;
  }

  .day-col-today {
    background: rgba(199, 210, 254, 0.18);
  }

  .hour-cell {
    border-bottom: 1px solid var(--border);
    box-sizing: border-box;
  }

  /* Events */
  .cal-event {
    position: absolute;
    left: 4px;
    right: 4px;
    border-radius: var(--radius-md);
    padding: 4px 6px;
    overflow: hidden;
    text-decoration: none;
    font-size: 0.72rem;
    display: flex;
    flex-direction: column;
    gap: 1px;
    z-index: 2;
  }

  .cal-session {
    background: #dbeafe;
    border: 1px solid #93c5fd;
    color: #1e3a8a;
  }
  .cal-session:hover { background: #bfdbfe; }

  .cal-session.cal-completed {
    background: #dcfce7;
    border-color: #86efac;
    color: #166534;
  }
  .cal-session.cal-requested,
  .cal-session.cal-paid {
    background: #fef3c7;
    border-color: #fcd34d;
    color: #92400e;
  }

  .cal-free {
    background: #f1f5f9;
    border: 1px dashed #94a3b8;
    color: #475569;
  }

  .event-time-row {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-wrap: wrap;
  }

  .event-time {
    font-size: 0.7rem;
    font-weight: 600;
  }

  .event-status-badge {
    font-size: 0.62rem;
    padding: 0 5px;
    border-radius: 3px;
    background: rgba(255, 255, 255, 0.5);
    font-weight: 600;
  }

  .event-service {
    font-size: 0.72rem;
    font-weight: 700;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .event-mentee {
    font-size: 0.68rem;
    opacity: 0.85;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* Empty day pill */
  .empty-day-pill {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    background: #e5e7eb;
    color: #6b7280;
    padding: 4px 10px;
    border-radius: var(--radius-md);
    font-size: 0.72rem;
    white-space: nowrap;
    z-index: 1;
  }

  /* Current-time red line */
  .now-line {
    position: absolute;
    left: 0;
    right: 0;
    height: 0;
    pointer-events: none;
    display: flex;
    align-items: center;
    z-index: 3;
  }

  .now-label {
    position: absolute;
    left: 4px;
    transform: translateY(-50%);
    background: #fff;
    color: #dc2626;
    font-size: 0.7rem;
    font-weight: 700;
    padding: 0 4px;
  }

  .now-bar {
    flex: 1;
    height: 1.5px;
    background: #dc2626;
    margin-left: 56px;
  }

  /* Responsive */
  @media (max-width: 800px) {
    .shell {
      padding: 20px 12px 80px;
    }
    .day-headers,
    .time-grid {
      grid-template-columns: 44px repeat(7, minmax(78px, 1fr));
      min-width: 600px;
    }
    .cal-card {
      overflow-x: auto;
    }
  }

  @media (max-width: 560px) {
    .cal-title { font-size: 1.25rem; }
  }
</style>
