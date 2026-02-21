<script lang="ts">
  import AppHeader from '$lib/components/AppHeader.svelte';
  import Loading from '$lib/components/Loading.svelte';
  import { api } from '$lib/api';
  import { connectSocket, disconnectSocket } from '$lib/socket';
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { user, isAuthenticated, isLoading as authLoading } from '$lib/stores/auth';
  import { goto } from '$app/navigation';
  import type { Socket } from 'socket.io-client';
  import { Phone } from 'lucide-svelte';

  interface Conversation {
    id: string;
    mentor: { id: string; fullName: string };
    mentee: { id: string; fullName: string };
    lastMessage?: { content: string; createdAt: string; senderId: string } | null;
    unreadCount: number;
    session?: { id: string; startAt: string; status: string } | null;
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
  let socket: Socket | null = null;
  let typingUserId: string | null = null;
  let typingTimeout: any;

  const loadConversations = async () => {
    conversations = await api.get<Conversation[]>('/conversations');
  };

  const loadMessages = async () => {
    if (!activeConversation) return;
    messages = await api.get<Message[]>(`/conversations/${activeConversation}/messages?limit=50`);
    await api.patch(`/chat/${activeConversation}/read`);
    socket?.emit('mark_read', { conversationId: activeConversation });
    conversations = conversations.map((c) => (c.id === activeConversation ? { ...c, unreadCount: 0 } : c));
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !activeConversation || isSending) return;
    if (newMessage.length > 1000) return;
    isSending = true;
    const text = newMessage;
    newMessage = '';

    try {
      const message = await api.post<Message>(`/chat/${activeConversation}/messages`, { content: text });
      if (!messages.find((m) => m.id === message.id)) {
        messages = [...messages, message];
      }
    } finally {
      isSending = false;
    }
  };

  const ensureSocket = () => {
    if (socket) return socket;
    const token = localStorage.getItem('accessToken');
    socket = connectSocket(token);
    if (!socket) return null;

    socket.on('connect', () => {
      if (activeConversation) {
        socket?.emit('join_conversation', { conversationId: activeConversation });
      }
    });

    socket.on('new_message', ({ conversationId, message }) => {
      conversations = conversations.map((c) =>
        c.id === conversationId ? { ...c, lastMessage: message, unreadCount: c.unreadCount + 1 } : c,
      );
      if (conversationId === activeConversation) {
        if (!messages.find((m) => m.id === message.id)) {
          messages = [...messages, message];
        }
        socket?.emit('mark_read', { conversationId });
        conversations = conversations.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c));
      }
    });

    socket.on('messages_read', ({ conversationId }) => {
      if (conversationId === activeConversation) {
        conversations = conversations.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c));
      }
    });

    socket.on('user_typing', ({ conversationId, userId, isTyping }) => {
      if (conversationId === activeConversation && userId !== $user?.id) {
        typingUserId = isTyping ? userId : null;
      }
    });

    return socket;
  };

  const partnerName = (conv: Conversation) => {
    return $user?.id === conv.mentor.id ? conv.mentee.fullName : conv.mentor.fullName;
  };

  const handleJoinCall = async () => {
    if (!activeConversationData?.session?.id) return;
    const room = await api.get<{ joinUrlMentor?: string; joinUrlMentee?: string }>(
      `/sessions/${activeConversationData.session.id}/video`,
    );
    const isMentorSide = $user?.id === activeConversationData.mentor.id;
    const url = isMentorSide ? room.joinUrlMentor : room.joinUrlMentee;
    const fallbackUrl = room.joinUrlMentor || room.joinUrlMentee;
    if (url || fallbackUrl) {
      window.open(url || fallbackUrl, '_blank');
    }
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
      ensureSocket();
      socket?.emit('join_conversation', { conversationId: activeConversation });
    }

    isLoading = false;
  });

  onDestroy(() => {
    if (typingTimeout) clearTimeout(typingTimeout);
    if (socket) {
      socket.off('new_message');
      socket.off('messages_read');
      socket.off('user_typing');
    }
    disconnectSocket();
  });

  const emitTyping = (isTyping: boolean) => {
    if (!activeConversation) return;
    ensureSocket();
    socket?.emit('typing', { conversationId: activeConversation, isTyping });
  };

  const handleTyping = () => {
    emitTyping(true);
    if (typingTimeout) clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => emitTyping(false), 1200);
  };

  $: activeConversationData = conversations.find((conv) => conv.id === activeConversation) || null;
  $: remainingChars = 1000 - newMessage.length;
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
                    typingUserId = null;
                    loadMessages();
                    ensureSocket();
                    socket?.emit('join_conversation', { conversationId: conv.id });
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
            <div class="surface" style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:10px;">
              <div style="display:flex;align-items:center;gap:8px;">
                <button
                  class="btn btn-ghost btn-sm"
                  on:click={handleJoinCall}
                  disabled={!activeConversationData?.session?.id}
                >
                  <Phone size={14} /> Видеозвонок
                </button>
                <strong>{activeConversationData ? partnerName(activeConversationData) : ''}</strong>
              </div>
              <span class="muted" style="font-size:0.8rem;">
                {#if activeConversationData?.session?.id}
                  Сессия привязана
                {:else}
                  Без сессии
                {/if}
              </span>
            </div>

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

            {#if typingUserId}
              <div class="muted" style="font-size:0.85rem;margin-top:8px;">Печатает...</div>
            {/if}

            <div style="display:flex;gap:8px;margin-top:12px;">
              <input
                class="input"
                bind:value={newMessage}
                placeholder="Введите сообщение..."
                maxlength={1000}
                on:input={handleTyping}
              />
              <button class="btn btn-primary" on:click={handleSend} disabled={isSending || !newMessage.trim()}>
                {isSending ? '...' : 'Отправить'}
              </button>
            </div>
            <div class="muted" style="font-size:0.8rem;margin-top:6px;text-align:right;">
              {newMessage.length}/1000
            </div>
            {#if remainingChars < 0}
              <div class="muted" style="font-size:0.8rem;color:#dc2626;">Превышен лимит 1000 символов.</div>
            {/if}
          {/if}
        </section>
      </div>
    </main>
  {/if}
</div>
