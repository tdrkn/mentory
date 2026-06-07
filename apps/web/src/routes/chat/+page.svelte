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
  import { FileText, ImageIcon, Link2, Phone, Send, Smile, X } from 'lucide-svelte';

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
    session?: { id: string; startAt: string; status: string; videoLink?: string | null } | null;
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
  let showEmojiPicker = false;
  let showVideoLinkEditor = false;
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
      conversations = conversations.map((conversation) =>
        conversation.id === activeConversation
          ? { ...conversation, lastMessage: { ...message, contentType: message.contentType || 'text' } }
          : conversation,
      );
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
      showEmojiPicker = false;
    }
  };

  const handleComposerKeydown = (event: KeyboardEvent) => {
    if (event.key !== 'Enter' || event.shiftKey) return;
    event.preventDefault();
    handleSend();
  };

  const handleSendEmoji = async (emoji: string) => {
    composerNotice = null;
    await sendPayload({ content: emoji, contentType: 'emoji' });
    showEmojiPicker = false;
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
    documentFile = null;
    composerError = null;
    composerNotice = null;
  };

  const handleDocumentFileChange = (event: Event) => {
    const target = event.currentTarget as HTMLInputElement;
    documentFile = target.files?.[0] || null;
    imageFile = null;
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
      if (activeConversationData?.session?.id && $user?.id === activeConversationData.mentor.id) {
        try {
          const updated = await api.patch<{ id: string; videoLink: string | null }>(
            `/sessions/${activeConversationData.session.id}/video-link`,
            { videoLink: candidate },
          );
          conversations = conversations.map((conversation) =>
            conversation.id === activeConversation
              ? {
                  ...conversation,
                  session: conversation.session ? { ...conversation.session, videoLink: updated.videoLink } : conversation.session,
                }
              : conversation,
          );
        } catch {
          composerNotice = 'Ссылка отправлена в чат, но не сохранилась в карточке сессии.';
        }
      }
      videoLink = '';
      if (!composerNotice) composerNotice = 'Ссылка на видеовстречу отправлена.';
      showVideoLinkEditor = false;
    }
  };

  const getFirstHttpLink = (content: string) => {
    const match = content.match(/https?:\/\/[^\s]+/i);
    return match ? match[0] : null;
  };

  const getLastHttpLink = (messageList: Message[], fallbackLink?: string | null) => {
    for (let index = messageList.length - 1; index >= 0; index -= 1) {
      const link = getFirstHttpLink(messageList[index].content);
      if (link) return link;
    }
    return fallbackLink || null;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    if (bytes >= 1024) return `${Math.ceil(bytes / 1024)} KB`;
    return `${bytes} B`;
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

  const handleJoinCall = () => {
    const link = latestMeetingLink;
    if (!link) {
      composerNotice = 'Ссылка на встречу пока не отправлена.';
      return;
    }
    window.open(link, '_blank', 'noopener,noreferrer');
  };

  onMount(async () => {
    if (!$isAuthenticated && !$authLoading) {
      goto('/login');
      return;
    }

    await loadConversations();

    const sessionId = $page.url.searchParams.get('session');
    const mentorId = $page.url.searchParams.get('mentorId');
    if (sessionId) {
      const conv = await api.post<Conversation>(`/conversations/${sessionId}`);
      activeConversation = conv.id;
    } else if (mentorId) {
      const match = conversations.find((c) => c.mentor?.id === mentorId || c.mentee?.id === mentorId);
      activeConversation = match?.id ?? (conversations.length > 0 ? conversations[0].id : null);
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
  $: latestMeetingLink = getLastHttpLink(messages, activeConversationData?.session?.videoLink);
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
                <strong>{activeConversationData ? partnerName(activeConversationData) : ''}</strong>
                {#if latestMeetingLink}
                  <button class="btn btn-ghost btn-sm chat-call-button" on:click={handleJoinCall} title="Открыть последнюю ссылку из чата">
                    <Phone size={14} /> Открыть встречу
                  </button>
                {/if}
              </div>
              <span class="muted chat-thread-status">
                {#if activeConversationData?.session?.id}
                  {latestMeetingLink ? 'Последняя ссылка из чата' : 'Ссылка на встречу появится в чате'}
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

            <div class="chat-composer-shell">
              {#if showEmojiPicker}
                <div class="emoji-picker" aria-label="Эмодзи">
                  {#each ALLOWED_CHAT_EMOJIS as emoji}
                    <button class="emoji-button" on:click={() => handleSendEmoji(emoji)} disabled={isSending} title={`Отправить ${emoji}`}>
                      {emoji}
                    </button>
                  {/each}
                </div>
              {/if}

              {#if imageFile || documentFile}
                <div class="attachment-preview">
                  <div class="attachment-preview-main">
                    {#if imageFile}
                      <ImageIcon size={16} />
                      <span>{imageFile.name}</span>
                      <span class="muted">{formatFileSize(imageFile.size)}</span>
                    {:else if documentFile}
                      <FileText size={16} />
                      <span>{documentFile.name}</span>
                      <span class="muted">{formatFileSize(documentFile.size)}</span>
                    {/if}
                  </div>
                  <div class="attachment-preview-actions">
                    {#if imageFile}
                      <button class="btn btn-primary btn-sm" on:click={handleSendImage} disabled={isSending}>Отправить</button>
                      <button class="icon-button" on:click={resetImageSelection} title="Убрать фото"><X size={16} /></button>
                    {:else if documentFile}
                      <button class="btn btn-primary btn-sm" on:click={handleSendDocument} disabled={isSending}>Отправить</button>
                      <button class="icon-button" on:click={resetDocumentSelection} title="Убрать документ"><X size={16} /></button>
                    {/if}
                  </div>
                </div>
              {/if}

              {#if showVideoLinkEditor}
                <div class="meeting-link-panel">
                  <Link2 size={16} />
                  <input class="input meeting-link-input" bind:value={videoLink} placeholder="https://zoom.us/... или https://meet.google.com/..." />
                  <button class="btn btn-primary btn-sm" on:click={handleSendVideoLink} disabled={isSending || !videoLink.trim()}>
                    Отправить
                  </button>
                  <button class="icon-button" on:click={() => { showVideoLinkEditor = false; videoLink = ''; }} title="Закрыть"><X size={16} /></button>
                </div>
              {/if}

              <div class="chat-composer">
                <textarea
                  class="input chat-input"
                  bind:value={newMessage}
                  placeholder="Сообщение"
                  maxlength={1000}
                  on:input={handleTyping}
                  on:keydown={handleComposerKeydown}
                  rows="1"
                ></textarea>
                <button class="send-button" on:click={handleSend} disabled={isSending || !newMessage.trim()} title="Отправить">
                  <Send size={18} />
                </button>
              </div>

              <div class="composer-toolbar">
                <button class="icon-button" on:click={() => { showEmojiPicker = !showEmojiPicker; showVideoLinkEditor = false; }} title="Эмодзи">
                  <Smile size={18} />
                </button>
                <button class="icon-button" on:click={() => imageInput?.click()} title="Фото">
                  <ImageIcon size={18} />
                </button>
                <button class="icon-button" on:click={() => documentInput?.click()} title="Документ">
                  <FileText size={18} />
                </button>
                {#if activeConversationData?.session?.id}
                  <button class="icon-button" on:click={() => { showVideoLinkEditor = !showVideoLinkEditor; showEmojiPicker = false; }} title="Ссылка на встречу">
                    <Link2 size={18} />
                  </button>
                {/if}
                <span class="chat-counter">{newMessage.length}/1000</span>
              </div>

              <input bind:this={imageInput} class="visually-hidden-file" type="file" accept="image/*" on:change={handleImageFileChange} />
              <input bind:this={documentInput} class="visually-hidden-file" type="file" accept=".pptx,.pdf,.txt,.mvd" on:change={handleDocumentFileChange} />
            </div>

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
    height: calc(100vh - 72px);
    padding-top: 16px;
    padding-bottom: 16px;
    overflow: hidden;
  }

  .chat-layout {
    display: grid;
    grid-template-columns: 280px 1fr;
    gap: 20px;
    height: 100%;
    min-height: 0;
    overflow: hidden;
  }

  .chat-sidebar {
    border-right: 1px solid var(--border);
    padding-right: 16px;
    min-width: 0;
    min-height: 0;
    overflow: auto;
  }

  .chat-thread {
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
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
    flex-wrap: wrap;
  }

  .chat-call-button {
    padding-inline: 12px;
  }

  .chat-thread-status {
    font-size: 0.8rem;
    flex-shrink: 0;
  }

  .chat-messages {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
    min-height: 0;
    padding-right: 4px;
    overscroll-behavior: contain;
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
    white-space: pre-wrap;
  }

  .chat-message-bubble.mine {
    background: var(--accent);
    color: var(--on-accent);
    border-color: color-mix(in srgb, var(--accent) 82%, var(--border));
  }

  .chat-composer-shell {
    position: relative;
    margin-top: 12px;
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    background: var(--surface);
    padding: 10px;
  }

  .chat-composer {
    display: flex;
    gap: 8px;
    align-items: flex-end;
  }

  .chat-input {
    min-height: 44px;
    max-height: 140px;
    line-height: 1.35;
    resize: vertical;
    border: 0;
    box-shadow: none;
    padding: 10px 8px;
    background: transparent;
  }

  .chat-input:focus {
    box-shadow: none;
  }

  .send-button,
  .icon-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 38px;
    height: 38px;
    border-radius: 999px;
    border: 1px solid transparent;
    background: var(--bg-alt);
    color: var(--ink-secondary);
    cursor: pointer;
    transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
    flex-shrink: 0;
  }

  .send-button {
    background: var(--accent);
    color: var(--on-accent);
  }

  .send-button:disabled,
  .icon-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .icon-button:hover:not(:disabled) {
    background: var(--accent-muted);
    color: var(--accent-link);
    border-color: var(--border);
  }

  .composer-toolbar {
    display: flex;
    align-items: center;
    gap: 6px;
    padding-top: 6px;
    border-top: 1px solid var(--border-light);
  }

  .chat-counter {
    font-size: 0.8rem;
    color: var(--muted);
    margin-left: auto;
  }

  .emoji-picker {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding: 8px;
    margin-bottom: 8px;
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    background: var(--bg-alt);
  }

  .emoji-button {
    width: 36px;
    height: 32px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--surface);
    cursor: pointer;
    font-size: 1rem;
  }

  .emoji-button:hover:not(:disabled) {
    border-color: var(--accent);
  }

  .attachment-preview,
  .meeting-link-panel {
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    padding: 8px;
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    background: var(--bg-alt);
  }

  .attachment-preview-main,
  .attachment-preview-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .attachment-preview-main span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .meeting-link-panel {
    cursor: default;
  }

  .meeting-link-input {
    min-width: 180px;
    padding: 9px 12px;
  }

  .visually-hidden-file {
    position: absolute;
    inline-size: 1px;
    block-size: 1px;
    opacity: 0;
    pointer-events: none;
  }

  @media (max-width: 900px) {
    .chat-main {
      height: auto;
      min-height: calc(100vh - 61px);
      overflow: visible;
    }

    .chat-layout {
      grid-template-columns: 1fr;
      height: auto;
      min-height: calc(100vh - 93px);
      overflow: visible;
    }

    .chat-sidebar {
      border-right: none;
      border-bottom: 1px solid var(--border);
      padding-right: 0;
      padding-bottom: 12px;
      max-height: 260px;
    }

    .chat-messages {
      min-height: 360px;
      max-height: 55vh;
    }

    .chat-message-bubble {
      max-width: 84%;
    }
  }

  @media (max-width: 640px) {
    .chat-main {
      height: auto;
      padding-bottom: 24px;
    }

    .chat-layout {
      gap: 14px;
      padding: 14px;
    }

    .chat-composer {
      align-items: flex-end;
    }

    .attachment-preview,
    .meeting-link-panel {
      flex-direction: column;
      align-items: stretch;
    }

    .attachment-preview-actions {
      justify-content: flex-end;
    }

    .meeting-link-panel .btn,
    .meeting-link-panel .meeting-link-input {
      width: 100%;
    }

    .chat-message-bubble {
      max-width: 100%;
    }
  }
</style>
