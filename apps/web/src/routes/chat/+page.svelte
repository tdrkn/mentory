<script lang="ts">
  import AppHeader from '$lib/components/AppHeader.svelte';
  import Loading from '$lib/components/Loading.svelte';
  import { api, ApiError } from '$lib/api';
  import { connectSocket, disconnectSocket } from '$lib/socket';
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { user, isAuthenticated, isLoading as authLoading } from '$lib/stores/auth';
  import { goto } from '$app/navigation';
  import type { Socket } from 'socket.io-client';
  import { Phone } from 'lucide-svelte';

  type MessageType = 'text' | 'emoji' | 'image' | 'file';

  interface MessageAttachment {
    id?: string;
    filename: string;
    mimeType: string;
    url: string;
    size?: number;
    sizeBytes?: number;
  }

  interface Conversation {
    id: string;
    mentor: { id: string; fullName: string };
    mentee: { id: string; fullName: string };
    lastMessage?: { content: string; contentType?: MessageType; createdAt: string; senderId: string } | null;
    unreadCount: number;
    session?: { id: string; startAt: string; status: string } | null;
  }

  interface Message {
    id: string;
    senderId: string;
    content: string;
    contentType?: MessageType;
    attachments?: MessageAttachment[];
    createdAt: string;
  }

  type SendMessagePayload = {
    content?: string;
    contentType?: MessageType;
    attachments?: Array<{ filename: string; mimeType: string; url: string; size: number }>;
  };

  const ALLOWED_CHAT_EMOJIS = ['😀', '😂', '😊', '😍', '👍', '👏', '🔥', '💡', '🎉', '🙏', '🤝', '❤️'];
  const ALLOWED_DOCUMENT_EXTENSIONS = ['.pptx', '.pdf', '.txt', '.mvd'];
  const MAX_ATTACHMENT_BYTES = 128 * 1024 * 1024;

  let conversations: Conversation[] = [];
  let activeConversation: string | null = null;
  let messages: Message[] = [];
  let newMessage = '';
  let videoLink = '';
  let isLoading = true;
  let isSending = false;
  let socket: Socket | null = null;
  let typingUserId: string | null = null;
  let composerError: string | null = null;
  let composerNotice: string | null = null;
  let imageFile: File | null = null;
  let documentFile: File | null = null;
  let imageInput: HTMLInputElement | null = null;
  let documentInput: HTMLInputElement | null = null;
  let typingTimeout: any;

  const extractApiError = (error: unknown, fallback: string) => {
    if (error instanceof ApiError) {
      if (typeof error.data?.message === 'string') return error.data.message;
      if (Array.isArray(error.data?.message) && error.data.message.length > 0) return error.data.message[0];
    }
    return fallback;
  };

  const pushMessageIfMissing = (message: Message) => {
    if (!messages.find((item) => item.id === message.id)) {
      messages = [...messages, message];
    }
  };

  const getMessagePreview = (message: Conversation['lastMessage']) => {
    if (!message) return 'Без сообщений';
    if (message.contentType === 'emoji') return message.content || 'Эмодзи';
    if (message.contentType === 'image') return 'Фото';
    if (message.contentType === 'file') return 'Документ';
    return message.content || 'Сообщение';
  };

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

  const sendPayload = async (payload: SendMessagePayload) => {
    if (!activeConversation || isSending) return false;
    isSending = true;
    composerError = null;

    try {
      const message = await api.post<Message>(`/chat/${activeConversation}/messages`, payload);
      pushMessageIfMissing(message);
      return true;
    } catch (error) {
      composerError = extractApiError(error, 'Не удалось отправить сообщение.');
      return false;
    } finally {
      isSending = false;
    }
  };

  const handleSend = async () => {
    const text = newMessage.trim();
    if (!text || !activeConversation || isSending) return;
    if (text.length > 1000) {
      composerError = 'Превышен лимит 1000 символов.';
      return;
    }

    const sent = await sendPayload({ content: text, contentType: 'text' });
    if (sent) {
      newMessage = '';
      emitTyping(false);
      composerNotice = null;
    }
  };

  const handleSendEmoji = async (emoji: string) => {
    composerNotice = null;
    await sendPayload({ content: emoji, contentType: 'emoji' });
  };

  const fileToDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
          return;
        }
        reject(new Error('Не удалось прочитать файл'));
      };
      reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
      reader.readAsDataURL(file);
    });

  const getFileExtension = (filename: string) => {
    const dot = filename.lastIndexOf('.');
    if (dot < 0) return '';
    return filename.slice(dot).toLowerCase();
  };

  const validateAttachmentSize = (file: File) => {
    if (file.size < 1 || file.size > MAX_ATTACHMENT_BYTES) {
      composerError = 'Размер файла должен быть от 1 байта до 128MB.';
      return false;
    }
    return true;
  };

  const resetImageSelection = () => {
    imageFile = null;
    if (imageInput) imageInput.value = '';
  };

  const resetDocumentSelection = () => {
    documentFile = null;
    if (documentInput) documentInput.value = '';
  };

  const handleImageFileChange = (event: Event) => {
    const target = event.currentTarget as HTMLInputElement;
    imageFile = target.files?.[0] || null;
    composerError = null;
    composerNotice = null;
  };

  const handleDocumentFileChange = (event: Event) => {
    const target = event.currentTarget as HTMLInputElement;
    documentFile = target.files?.[0] || null;
    composerError = null;
    composerNotice = null;
  };

  const handleSendImage = async () => {
    if (!imageFile) {
      composerError = 'Выберите изображение.';
      return;
    }
    if (!imageFile.type.toLowerCase().startsWith('image/')) {
      composerError = 'Допустимы только изображения.';
      return;
    }
    if (!validateAttachmentSize(imageFile)) return;

    composerNotice = null;
    try {
      const dataUrl = await fileToDataUrl(imageFile);
      const sent = await sendPayload({
        contentType: 'image',
        attachments: [
          {
            filename: imageFile.name,
            mimeType: imageFile.type || 'image/png',
            url: dataUrl,
            size: imageFile.size,
          },
        ],
      });
      if (sent) {
        composerNotice = 'Фото отправлено.';
        resetImageSelection();
      }
    } catch {
      composerError = 'Не удалось обработать изображение.';
    }
  };

  const handleSendDocument = async () => {
    if (!documentFile) {
      composerError = 'Выберите документ.';
      return;
    }
    if (!validateAttachmentSize(documentFile)) return;

    const extension = getFileExtension(documentFile.name);
    if (!ALLOWED_DOCUMENT_EXTENSIONS.includes(extension)) {
      composerError = 'Допустимые форматы: .pptx, .pdf, .txt, .mvd.';
      return;
    }

    composerNotice = null;
    try {
      const dataUrl = await fileToDataUrl(documentFile);
      const sent = await sendPayload({
        contentType: 'file',
        attachments: [
          {
            filename: documentFile.name,
            mimeType: documentFile.type || 'application/octet-stream',
            url: dataUrl,
            size: documentFile.size,
          },
        ],
      });
      if (sent) {
        composerNotice = 'Документ отправлен.';
        resetDocumentSelection();
      }
    } catch {
      composerError = 'Не удалось обработать документ.';
    }
  };

  const handleSendVideoLink = async () => {
    const candidate = videoLink.trim();
    if (!candidate) {
      composerError = 'Укажите ссылку на видеовстречу.';
      return;
    }

    try {
      const parsed = new URL(candidate);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        composerError = 'Ссылка должна начинаться с http:// или https://.';
        return;
      }
    } catch {
      composerError = 'Некорректная ссылка на видеовстречу.';
      return;
    }

    const sent = await sendPayload({ content: candidate, contentType: 'text' });
    if (sent) {
      videoLink = '';
      composerNotice = 'Ссылка на видеовстречу отправлена в чат.';
    }
  };

  const getFirstHttpLink = (content: string) => {
    const match = content.match(/https?:\/\/[^\s]+/i);
    return match ? match[0] : null;
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
        pushMessageIfMissing(message);
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
</script>

<div class="page">
  <AppHeader />

  {#if $authLoading || isLoading}
    <Loading />
  {:else}
    <main class="container chat-main">
      <div class="card chat-layout">
        <aside class="chat-sidebar">
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
                    composerError = null;
                    composerNotice = null;
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
                    {getMessagePreview(conv.lastMessage)}
                  </div>
                </button>
              {/each}
            </div>
          {/if}
        </aside>

        <section class="chat-thread">
          {#if !activeConversation}
            <div class="muted">Выберите диалог</div>
          {:else}
            <div class="surface chat-thread-header">
              <div class="chat-thread-header-main">
                <button
                  class="btn btn-ghost btn-sm"
                  on:click={handleJoinCall}
                  disabled={!activeConversationData?.session?.id}
                >
                  <Phone size={14} /> Видеозвонок
                </button>
                <strong>{activeConversationData ? partnerName(activeConversationData) : ''}</strong>
              </div>
              <span class="muted chat-thread-status">
                {#if activeConversationData?.session?.id}
                  Сессия привязана
                {:else}
                  Без сессии
                {/if}
              </span>
            </div>

            <div class="chat-messages">
              {#each messages as msg}
                <div class={`chat-message-row ${msg.senderId === $user?.id ? 'mine' : 'theirs'}`}>
                  <div class={`surface chat-message-bubble ${msg.senderId === $user?.id ? 'mine' : ''}`}>
                    {#if msg.contentType === 'image' && msg.attachments && msg.attachments.length > 0}
                      <div class="stack-sm">
                        {#each msg.attachments as attachment}
                          <a href={attachment.url} target="_blank" rel="noreferrer">
                            <img
                              src={attachment.url}
                              alt={attachment.filename}
                              style="max-width:220px;max-height:220px;display:block;border-radius:8px;object-fit:cover;"
                            />
                          </a>
                        {/each}
                      </div>
                      {#if msg.content}
                        <div style="margin-top:6px;">{msg.content}</div>
                      {/if}
                    {:else if msg.contentType === 'file' && msg.attachments && msg.attachments.length > 0}
                      {#if msg.content}
                        <div>{msg.content}</div>
                      {/if}
                      <div class="stack-sm" style="margin-top:6px;">
                        {#each msg.attachments as attachment}
                          <a
                            href={attachment.url}
                            target="_blank"
                            rel="noreferrer"
                            download={attachment.filename}
                            style={`text-decoration:underline;word-break:break-all;${msg.senderId === $user?.id ? 'color:var(--on-accent);' : 'color:var(--accent-link);'}`}
                          >
                            {attachment.filename}
                          </a>
                        {/each}
                      </div>
                    {:else}
                      <div style={msg.contentType === 'emoji' ? 'font-size:1.8rem;line-height:1.1;' : ''}>{msg.content}</div>
                      {#if getFirstHttpLink(msg.content)}
                        <div style="margin-top:6px;">
                          <a
                            href={getFirstHttpLink(msg.content)}
                            target="_blank"
                            rel="noreferrer"
                            style={`text-decoration:underline;word-break:break-all;${msg.senderId === $user?.id ? 'color:var(--on-accent);' : 'color:var(--accent-link);'}`}
                          >
                            Открыть ссылку
                          </a>
                        </div>
                      {/if}
                    {/if}
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

            <div class="chat-composer">
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
            <div class="muted chat-counter">
              {newMessage.length}/1000
            </div>
            <details class="surface chat-tools">
              <summary class="chat-tools-summary">
                Инструменты чата
                <span class="muted chat-tools-caption">Эмодзи, фото, документы, ВКС</span>
              </summary>

              <div style="display:grid;gap:10px;margin-top:10px;">
                <div>
                  <div class="muted" style="font-size:0.8rem;margin-bottom:8px;">Эмодзи</div>
                  <div style="display:flex;flex-wrap:wrap;gap:6px;">
                    {#each ALLOWED_CHAT_EMOJIS as emoji}
                      <button class="btn btn-ghost btn-sm" on:click={() => handleSendEmoji(emoji)} disabled={isSending}>
                        {emoji}
                      </button>
                    {/each}
                  </div>
                </div>

                <div>
                  <div class="muted" style="font-size:0.8rem;margin-bottom:8px;">Фото (JPG/PNG и другие image/*)</div>
                  <div class="chat-attach-row">
                    <input bind:this={imageInput} type="file" accept="image/*" on:change={handleImageFileChange} />
                    <button class="btn btn-outline btn-sm" on:click={handleSendImage} disabled={isSending || !imageFile}>
                      Отправить фото
                    </button>
                    {#if imageFile}
                      <span class="muted" style="font-size:0.8rem;word-break:break-all;">{imageFile.name}</span>
                    {/if}
                  </div>
                </div>

                <div>
                  <div class="muted" style="font-size:0.8rem;margin-bottom:8px;">Документ (.pptx, .pdf, .txt, .mvd)</div>
                  <div class="chat-attach-row">
                    <input bind:this={documentInput} type="file" accept=".pptx,.pdf,.txt,.mvd" on:change={handleDocumentFileChange} />
                    <button class="btn btn-outline btn-sm" on:click={handleSendDocument} disabled={isSending || !documentFile}>
                      Отправить документ
                    </button>
                    {#if documentFile}
                      <span class="muted" style="font-size:0.8rem;word-break:break-all;">{documentFile.name}</span>
                    {/if}
                  </div>
                </div>

                <div>
                  <div class="muted" style="font-size:0.8rem;margin-bottom:8px;">Ссылка на видеовстречу</div>
                  <div class="chat-attach-row">
                    <input class="input" bind:value={videoLink} placeholder="https://zoom.us/..." />
                    <button class="btn btn-outline btn-sm" on:click={handleSendVideoLink} disabled={isSending || !videoLink.trim()}>
                      Отправить ссылку
                    </button>
                  </div>
                </div>
              </div>
            </details>

            {#if composerNotice}
              <div class="muted" style="font-size:0.8rem;color:var(--status-success-ink);margin-top:8px;">{composerNotice}</div>
            {/if}
            {#if composerError}
              <div class="muted" style="font-size:0.8rem;color:var(--status-error-ink);margin-top:8px;">{composerError}</div>
            {/if}
          {/if}
        </section>
      </div>
    </main>
  {/if}
</div>

<style>
  .chat-main {
    padding-bottom: 40px;
  }

  .chat-layout {
    display: grid;
    grid-template-columns: 280px 1fr;
    gap: 20px;
    min-height: 540px;
  }

  .chat-sidebar {
    border-right: 1px solid var(--border);
    padding-right: 16px;
    min-width: 0;
  }

  .chat-thread {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .chat-thread-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
    flex-wrap: wrap;
  }

  .chat-thread-header-main {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .chat-thread-status {
    font-size: 0.8rem;
    flex-shrink: 0;
  }

  .chat-messages {
    flex: 1;
    overflow: auto;
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
  }

  .chat-message-row {
    display: flex;
  }

  .chat-message-row.mine {
    justify-content: flex-end;
  }

  .chat-message-row.theirs {
    justify-content: flex-start;
  }

  .chat-message-bubble {
    max-width: 70%;
    word-break: break-word;
  }

  .chat-message-bubble.mine {
    background: var(--accent);
    color: var(--on-accent);
  }

  .chat-composer {
    display: flex;
    gap: 8px;
    margin-top: 12px;
  }

  .chat-counter {
    font-size: 0.8rem;
    margin-top: 6px;
    text-align: right;
  }

  .chat-tools {
    margin-top: 10px;
  }

  .chat-tools-summary {
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    font-weight: 600;
  }

  .chat-tools-caption {
    font-size: 0.78rem;
    font-weight: 500;
  }

  .chat-attach-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }

  @media (max-width: 900px) {
    .chat-layout {
      grid-template-columns: 1fr;
    }

    .chat-sidebar {
      border-right: none;
      border-bottom: 1px solid var(--border);
      padding-right: 0;
      padding-bottom: 12px;
    }

    .chat-message-bubble {
      max-width: 84%;
    }
  }

  @media (max-width: 640px) {
    .chat-main {
      padding-bottom: 24px;
    }

    .chat-layout {
      gap: 14px;
      padding: 14px;
    }

    .chat-thread-header-main {
      flex-wrap: wrap;
    }

    .chat-composer {
      flex-direction: column;
    }

    .chat-composer .btn {
      width: 100%;
    }

    .chat-tools-summary {
      flex-direction: column;
      align-items: flex-start;
    }

    .chat-message-bubble {
      max-width: 100%;
    }
  }
</style>
