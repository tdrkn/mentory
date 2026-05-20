<script lang="ts">
  import AppHeader from '$lib/components/AppHeader.svelte';
  import Loading from '$lib/components/Loading.svelte';
  import { api, ApiError } from '$lib/api';
  import { user, isAuthenticated, isLoading as authLoading } from '$lib/stores/auth';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { ChevronLeft, ChevronRight, Clock, Calendar as CalendarIcon } from 'lucide-svelte';

  interface Service {
    id: string;
    title: string;
    durationMin: number;
    priceAmount: string;
    currency: string;
  }

  interface MentorBasic {
    id: string;
    fullName: string;
    avatarUrl?: string | null;
  }

  interface Slot {
    id: string;
    startAt: string;
    endAt: string;
    status: string;
  }

  // URL params
  $: serviceId = $page.url.searchParams.get('serviceId') || '';
  $: mentorId = $page.url.searchParams.get('mentorId') || '';

  // Contact form (prefilled from user)
  let firstName = '';
  let lastName = '';
  let email = '';

  // Motivation
  let motivation = '';

  // Data
  let service: Service | null = null;
  let mentor: MentorBasic | null = null;
  let slots: Slot[] = [];
  let selectedSlotId: string | null = null;

  // UI state
  let isLoading = true;
  let loadError: string | null = null;
  let isSubmitting = false;
  let submitError: string | null = null;
  let slotPage = 0;
  const SLOTS_PER_PAGE = 5;
  let didLoad = false;

  // Derived
  $: slotPageCount = Math.max(1, Math.ceil(slots.length / SLOTS_PER_PAGE));
  $: visibleSlots = slots.slice(slotPage * SLOTS_PER_PAGE, (slotPage + 1) * SLOTS_PER_PAGE);
  $: selectedSlot = slots.find((s) => s.id === selectedSlotId) ?? null;

  const formatMoney = (amount: string | number, currency: string) => {
    const value = Number(amount);
    if (!Number.isFinite(value)) return `${amount} ${currency}`;
    return `${value.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ${currency}`;
  };

  const formatSlotDate = (isoString: string) =>
    new Date(isoString).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'short' });

  const formatSlotTime = (isoString: string) =>
    new Date(isoString).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

  const loadData = async () => {
    if (!serviceId || !mentorId) {
      loadError = 'Не указана услуга или ментор.';
      isLoading = false;
      return;
    }

    try {
      // Load mentor + service in parallel
      const [mentorData, slotsData] = await Promise.all([
        api.get<{ id: string; fullName: string; avatarUrl?: string | null; mentorServices: Service[] }>(
          `/mentors/${mentorId}`
        ),
        api.get<{ slots?: Slot[] } | Slot[]>(`/scheduling/mentors/${mentorId}/slots`),
      ]);

      mentor = { id: mentorData.id, fullName: mentorData.fullName, avatarUrl: mentorData.avatarUrl };
      service = mentorData.mentorServices?.find((s) => s.id === serviceId) ?? null;

      if (!service) {
        loadError = 'Услуга не найдена.';
        isLoading = false;
        return;
      }

      // Normalize slots response (array or {slots: [...]})
      const rawSlots: Slot[] = Array.isArray(slotsData)
        ? slotsData
        : (slotsData as { slots?: Slot[] }).slots ?? [];
      slots = rawSlots
        .filter((s) => s.status === 'free')
        .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

      // Pre-fill contact info from logged-in user
      if ($user) {
        firstName = ($user as any).firstName || $user.fullName?.split(' ')[0] || '';
        lastName = ($user as any).lastName || $user.fullName?.split(' ').slice(1).join(' ') || '';
        email = $user.email || '';
      }
    } catch (err) {
      loadError = 'Не удалось загрузить данные.';
    } finally {
      isLoading = false;
    }
  };

  $: if (!$authLoading) {
    if (!$isAuthenticated) {
      goto('/login');
    } else if (!didLoad) {
      didLoad = true;
      loadData();
    }
  }

  const handleSubmit = async () => {
    if (!selectedSlotId) {
      submitError = 'Выберите дату и время.';
      return;
    }
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      submitError = 'Заполните контактную информацию.';
      return;
    }

    isSubmitting = true;
    submitError = null;

    try {
      const result = await api.post<{ session: { id: string } }>('/booking/hold', {
        slotId: selectedSlotId,
        serviceId,
        requestMotivation: motivation.trim() || undefined,
      });

      goto(`/checkout/${result.session.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        submitError = err.data?.message || 'Не удалось зарезервировать слот.';
      } else {
        submitError = 'Ошибка соединения.';
      }
    } finally {
      isSubmitting = false;
    }
  };
</script>

<div class="page">
  <AppHeader />

  {#if $authLoading || isLoading}
    <Loading />
  {:else if loadError}
    <main class="shell">
      <div class="error-card">
        <h2>Не удалось загрузить страницу</h2>
        <p>{loadError}</p>
        <a class="btn btn-outline" href="/mentors">Вернуться к каталогу</a>
      </div>
    </main>
  {:else if service && mentor}
    <main class="shell">
      <a class="back-link" href="/mentors/{mentor.id}">
        <ChevronLeft size={18} /> Вернуться к профилю
      </a>

      <h1 class="page-title">Заявка на консультацию</h1>

      <div class="booking-layout">
        <!-- Left column: form -->
        <div class="booking-form-col">

          <!-- Contact info -->
          <section class="booking-section">
            <h2>Контактная информация</h2>
            <div class="name-row">
              <div class="form-group">
                <label class="label" for="firstName">Имя</label>
                <input id="firstName" class="input" bind:value={firstName} placeholder="Иван" />
              </div>
              <div class="form-group">
                <label class="label" for="lastName">Фамилия</label>
                <input id="lastName" class="input" bind:value={lastName} placeholder="Иванов" />
              </div>
            </div>
            <div class="form-group">
              <label class="label" for="email">Email</label>
              <input id="email" class="input" type="email" bind:value={email} placeholder="you@example.com" />
            </div>
          </section>

          <!-- Motivational letter -->
          <section class="booking-section">
            <h2>Мотивационное письмо <span class="optional">(необязательно)</span></h2>
            <p class="hint">Расскажите, что вас привело к этому ментору и чего вы хотите достичь.</p>
            <textarea
              class="input motivation-textarea"
              bind:value={motivation}
              rows="4"
              placeholder="Я хочу разобраться с..."
            ></textarea>
          </section>

          <!-- Slot selector -->
          <section class="booking-section">
            <h2>Выберите дату и время</h2>

            {#if slots.length === 0}
              <p class="no-slots">У ментора пока нет свободных слотов.</p>
            {:else}
              <div class="slot-nav">
                <button
                  class="slot-nav-btn"
                  on:click={() => (slotPage = Math.max(0, slotPage - 1))}
                  disabled={slotPage === 0}
                  aria-label="Предыдущие слоты"
                >
                  <ChevronLeft size={20} />
                </button>

                <div class="slot-cards">
                  {#each visibleSlots as slot}
                    <button
                      class="slot-card {selectedSlotId === slot.id ? 'slot-selected' : ''}"
                      on:click={() => (selectedSlotId = slot.id)}
                    >
                      <span class="slot-day">{formatSlotDate(slot.startAt)}</span>
                      <span class="slot-time">{formatSlotTime(slot.startAt)}</span>
                    </button>
                  {/each}
                </div>

                <button
                  class="slot-nav-btn"
                  on:click={() => (slotPage = Math.min(slotPageCount - 1, slotPage + 1))}
                  disabled={slotPage >= slotPageCount - 1}
                  aria-label="Следующие слоты"
                >
                  <ChevronRight size={20} />
                </button>
              </div>

              <p class="slot-counter">
                {slotPage * SLOTS_PER_PAGE + 1}–{Math.min((slotPage + 1) * SLOTS_PER_PAGE, slots.length)} из {slots.length}
              </p>
            {/if}
          </section>

          {#if submitError}
            <p class="submit-error">{submitError}</p>
          {/if}

          <button
            class="btn btn-primary submit-btn"
            on:click={handleSubmit}
            disabled={isSubmitting || !selectedSlotId}
          >
            {isSubmitting ? 'Резервируем...' : 'Оплатить'}
          </button>
          <p class="hold-notice">Слот удерживается 10 минут для оплаты</p>
        </div>

        <!-- Right column: sticky summary card -->
        <aside class="booking-summary">
          <div class="summary-card">
            <div class="summary-mentor">
              <div class="summary-avatar">
                {mentor.fullName.slice(0, 1)}
              </div>
              <div>
                <p class="summary-mentor-name">{mentor.fullName}</p>
                <p class="summary-mentor-role">Ментор</p>
              </div>
            </div>

            <div class="summary-service">
              <p class="summary-label">Услуга</p>
              <p class="summary-value">{service.title}</p>
            </div>

            <div class="summary-row">
              <span class="summary-label">
                <Clock size={14} />
                Длительность
              </span>
              <span class="summary-value">{service.durationMin} мин</span>
            </div>

            {#if selectedSlot}
              <div class="summary-row">
                <span class="summary-label">
                  <CalendarIcon size={14} />
                  Дата консультации
                </span>
                <span class="summary-value">
                  {formatSlotDate(selectedSlot.startAt)},
                  {formatSlotTime(selectedSlot.startAt)}
                </span>
              </div>
            {:else}
              <div class="summary-row">
                <span class="summary-label">
                  <CalendarIcon size={14} />
                  Дата консультации
                </span>
                <span class="summary-value summary-placeholder">Не выбрана</span>
              </div>
            {/if}

            <div class="summary-divider"></div>

            <div class="summary-total">
              <span>Стоимость</span>
              <strong>{formatMoney(service.priceAmount, service.currency)}</strong>
            </div>
          </div>
        </aside>
      </div>
    </main>
  {/if}
</div>

<style>
  .shell {
    max-width: 1040px;
    margin: 0 auto;
    padding: 48px 20px 100px;
  }

  .back-link {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: var(--muted);
    font-size: 0.9rem;
    margin-bottom: 24px;
    transition: color 0.15s ease;
  }

  .back-link:hover {
    color: var(--accent);
  }

  .page-title {
    font-size: 1.75rem;
    font-weight: 800;
    margin: 0 0 32px;
    color: var(--ink);
  }

  .booking-layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 300px;
    gap: 28px;
    align-items: start;
  }

  .booking-form-col {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .booking-section {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .booking-section h2 {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--ink);
    margin: 0;
  }

  .optional {
    font-size: 0.8rem;
    font-weight: 400;
    color: var(--muted);
  }

  .hint {
    font-size: 0.88rem;
    color: var(--muted);
    margin: 0;
    line-height: 1.5;
  }

  .name-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .label {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--ink-secondary);
  }

  .motivation-textarea {
    resize: vertical;
    font-family: inherit;
    line-height: 1.5;
  }

  /* Slot selector */
  .slot-nav {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .slot-nav-btn {
    flex: 0 0 36px;
    width: 36px;
    height: 36px;
    border: 1.5px solid var(--border);
    border-radius: var(--radius-md);
    background: var(--surface);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.15s ease;
    color: var(--ink-secondary);
  }

  .slot-nav-btn:hover:not(:disabled) {
    border-color: var(--accent);
    color: var(--accent);
  }

  .slot-nav-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .slot-cards {
    display: flex;
    gap: 8px;
    flex: 1;
    overflow: hidden;
  }

  .slot-card {
    flex: 1;
    min-width: 0;
    background: var(--bg-alt);
    border: 1.5px solid var(--border);
    border-radius: var(--radius-md);
    padding: 10px 6px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    cursor: pointer;
    transition: all 0.15s ease;
    font-family: inherit;
  }

  .slot-card:hover {
    border-color: var(--accent);
  }

  .slot-card.slot-selected {
    border-color: var(--accent);
    background: var(--accent-muted);
  }

  .slot-day {
    font-size: 0.72rem;
    color: var(--muted);
    text-align: center;
    line-height: 1.3;
  }

  .slot-time {
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--ink);
  }

  .slot-selected .slot-time {
    color: var(--accent);
  }

  .slot-counter {
    font-size: 0.8rem;
    color: var(--muted);
    margin: 0;
    text-align: center;
  }

  .no-slots {
    color: var(--muted);
    font-size: 0.9rem;
    margin: 0;
  }

  .submit-error {
    color: var(--status-error-ink);
    font-size: 0.9rem;
    margin: 0;
  }

  .submit-btn {
    width: 100%;
    justify-content: center;
    font-size: 1rem;
  }

  .hold-notice {
    font-size: 0.78rem;
    color: var(--muted);
    text-align: center;
    margin: 0;
  }

  /* Summary card */
  .booking-summary {
    position: sticky;
    top: 24px;
  }

  .summary-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 22px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .summary-mentor {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .summary-avatar {
    width: 44px;
    height: 44px;
    flex: 0 0 44px;
    border-radius: 12px;
    background: var(--accent-soft);
    color: var(--accent);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.3rem;
    font-weight: 800;
  }

  .summary-mentor-name {
    font-weight: 700;
    color: var(--ink);
    margin: 0;
    font-size: 0.95rem;
  }

  .summary-mentor-role {
    font-size: 0.8rem;
    color: var(--muted);
    margin: 0;
  }

  .summary-service {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .summary-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
  }

  .summary-label {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.82rem;
    color: var(--muted);
    flex-shrink: 0;
  }

  .summary-value {
    font-size: 0.88rem;
    font-weight: 600;
    color: var(--ink-secondary);
    text-align: right;
  }

  .summary-placeholder {
    color: var(--muted);
    font-weight: 400;
  }

  .summary-divider {
    height: 1px;
    background: var(--border);
  }

  .summary-total {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .summary-total span {
    font-size: 0.9rem;
    color: var(--muted);
  }

  .summary-total strong {
    font-size: 1.3rem;
    font-weight: 800;
    color: var(--accent);
  }

  .error-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 40px;
    text-align: center;
    max-width: 500px;
    margin: 80px auto;
  }

  .error-card h2 {
    margin: 0 0 12px;
    color: var(--ink);
  }

  .error-card p {
    color: var(--muted);
    margin: 0 0 24px;
  }

  @media (max-width: 860px) {
    .booking-layout {
      grid-template-columns: minmax(0, 1fr);
    }

    .booking-summary {
      position: static;
      order: -1;
    }
  }

  @media (max-width: 560px) {
    .shell {
      padding: 28px 16px 80px;
    }

    .name-row {
      grid-template-columns: 1fr;
    }

    .slot-cards {
      gap: 4px;
    }

    .slot-card {
      padding: 8px 4px;
    }

    .slot-day {
      font-size: 0.65rem;
    }

    .slot-time {
      font-size: 0.82rem;
    }
  }
</style>
