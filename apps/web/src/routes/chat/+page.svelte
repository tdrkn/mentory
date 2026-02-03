<script lang="ts">
  import AppHeader from '$lib/components/AppHeader.svelte';
  import Loading from '$lib/components/Loading.svelte';
  import { api } from '$lib/api';
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { user, isAuthenticated, isLoading as authLoading } from '$lib/stores/auth';
  import { goto } from '$app/navigation';

  interface Conversation {
    id: string;
    mentor: { id: string; fullName: string };
    mentee: { id: string; fullName: string };
    lastMessage?: { content: string; createdAt: string; senderId: string } | null;
    unreadCount: number;
  }

  interface Message {
    id: string;
    senderId: string;
    content: string;
    createdAt: string;
  }

  let conversations: Conversation[] = [];
  let activeConversation: string | null = null;
  let messages: Message[] = [];
  let newMessage = '';
  let isLoading = true;
  let isSending = false;
  let pollTimer: any;

  const loadConversations = async () => {
    conversations = await api.get<Conversation[]>('/conversations');
  };

  const loadMessages = async () => {
    if (!activeConversation) return;
    messages = await api.get<Message[]>(`/conversations/${activeConversation}/messages?limit=50`);
    await api.patch(`/chat/${activeConversation}/read`);
    conversations = conversations.map((c) => (c.id === activeConversation ? { ...c, unreadCount: 0 } : c));
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !activeConversation || isSending) return;
    isSending = true;
    const text = newMessage;
    newMessage = '';

    try {
      const message = await api.post<Message>(`/chat/${activeConversation}/messages`, { content: text });
      messages = [...messages, message];
    } finally {
      isSending = false;
    }
  };

  const partnerName = (conv: Conversation) => {
    return $user?.id === conv.mentor.id ? conv.mentee.fullName : conv.mentor.fullName;
  };

  onMount(async () => {
    if (!$isAuthenticated && !$authLoading) {
      goto('/login');
      return;
    }

    await loadConversations();

    const sessionId = $page.url.searchParams.get('session');
    if (sessionId) {
      const conv = await api.post<Conversation>(`/conversations/${sessionId}`);
      activeConversation = conv.id;
    } else if (conversations.length > 0) {
      activeConversation = conversations[0].id;
    }

    if (activeConversation) {
      await loadMessages();
      pollTimer = setInterval(loadMessages, 5000);
    }

    isLoading = false;
  });

  onDestroy(() => {
    if (pollTimer) clearInterval(pollTimer);
  });
</script>

<div class="page">
  <AppHeader />

  {#if $authLoading || isLoading}
    <Loading />
  {:else}
    <main class="container" style="padding-bottom:40px;">
      <div class="card" style="display:grid;grid-template-columns:280px 1fr;gap:20px;min-height:540px;">
        <aside style="border-right:1px solid var(--border);padding-right:16px;">
          <h3>Диалоги</h3>
          {#if conversations.length === 0}
            <p class="muted">Нет диалогов.</p>
            <a class="btn btn-primary" href="/mentors">Найти ментора</a>
          {:else}
            <div class="stack" style="margin-top:12px;">
              {#each conversations as conv}
                <button
                  class="surface"
                  style={`text-align:left;border:2px solid ${activeConversation === conv.id ? 'var(--accent)' : 'transparent'};`}
                  on:click={() => {
                    activeConversation = conv.id;
                    loadMessages();
                  }}
                >
                  <div style="display:flex;justify-content:space-between;align-items:center;">
                    <strong>{partnerName(conv)}</strong>
                    {#if conv.unreadCount > 0}
                      <span class="badge">{conv.unreadCount}</span>
                    {/if}
                  </div>
                  <div class="muted" style="margin-top:4px;font-size:0.85rem;">
                    {conv.lastMessage?.content || 'Без сообщений'}
                  </div>
                </button>
              {/each}
            </div>
          {/if}
        </aside>

        <section style="display:flex;flex-direction:column;">
          {#if !activeConversation}
            <div class="muted">Выберите диалог</div>
          {:else}
            <div style="flex:1;overflow:auto;display:flex;flex-direction:column;gap:12px;">
              {#each messages as msg}
                <div style={`display:flex;justify-content:${msg.senderId === $user?.id ? 'flex-end' : 'flex-start'};`}>
                  <div class="surface" style={`max-width:70%;${msg.senderId === $user?.id ? 'background:var(--accent);color:#fff;' : ''}`}
                    >
                    <div>{msg.content}</div>
                    <div style="font-size:0.75rem;opacity:0.7;margin-top:4px;">
                      {new Date(msg.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              {/each}
            </div>

            <div style="display:flex;gap:8px;margin-top:12px;">
              <input class="input" bind:value={newMessage} placeholder="Введите сообщение..." />
              <button class="btn btn-primary" on:click={handleSend} disabled={isSending || !newMessage.trim()}>
                {isSending ? '...' : 'Отправить'}
              </button>
            </div>
          {/if}
        </section>
      </div>
    </main>
  {/if}
</div>
