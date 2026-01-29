'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api, Conversation, Message, ApiError } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';

export default function ChatPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session');

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load conversations
  useEffect(() => {
    if (!isAuthenticated && !authLoading) {
      window.location.href = '/login';
      return;
    }

    const loadConversations = async () => {
      try {
        const data = await api.get<Conversation[]>('/conversations');
        setConversations(data);

        // Auto-select conversation if session param provided
        if (sessionId) {
          const conv = await api.post<Conversation>('/conversations/by-session', { sessionId });
          setActiveConversation(conv.id);
        } else if (data.length > 0 && !activeConversation) {
          setActiveConversation(data[0].id);
        }
      } catch (err) {
        console.error('Failed to load conversations:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (isAuthenticated) {
      loadConversations();
    }
  }, [isAuthenticated, authLoading, sessionId]);

  // Load messages when conversation changes
  useEffect(() => {
    if (!activeConversation) return;

    const loadMessages = async () => {
      try {
        const data = await api.get<Message[]>(`/conversations/${activeConversation}/messages?limit=50`);
        setMessages(data);

        // Mark as read
        await api.patch(`/conversations/${activeConversation}/read`);

        // Update unread count in sidebar
        setConversations(prev =>
          prev.map(c => c.id === activeConversation ? { ...c, unreadCount: 0 } : c)
        );
      } catch (err) {
        console.error('Failed to load messages:', err);
      }
    };

    loadMessages();

    // Poll for new messages (simple approach, WebSocket is better)
    pollIntervalRef.current = setInterval(loadMessages, 5000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [activeConversation]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConversation || isSending) return;

    setIsSending(true);
    const messageText = newMessage;
    setNewMessage('');

    try {
      const message = await api.post<Message>(
        `/conversations/${activeConversation}/messages`,
        { content: messageText }
      );
      setMessages(prev => [...prev, message]);
    } catch (err) {
      console.error('Failed to send message:', err);
      setNewMessage(messageText); // Restore message on error
    } finally {
      setIsSending(false);
    }
  };

  const getPartner = (conversation: Conversation) => {
    return user?.id === conversation.mentor.id ? conversation.mentee : conversation.mentor;
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm shrink-0">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/mentors" className="text-2xl font-bold text-indigo-600">Mentory</Link>
          <nav className="flex gap-4">
            <Link href="/mentors" className="text-gray-600 hover:text-gray-900">Менторы</Link>
            <Link href="/sessions" className="text-gray-600 hover:text-gray-900">Сессии</Link>
            <Link href="/chat" className="text-indigo-600 font-medium">Чат</Link>
          </nav>
        </div>
      </header>

      {/* Chat Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Conversations Sidebar */}
        <div className="w-80 bg-white border-r overflow-y-auto">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-gray-900">Диалоги</h2>
          </div>

          {conversations.length === 0 ? (
            <div className="p-4 text-center text-gray-600">
              <p>Нет диалогов</p>
              <Link href="/mentors" className="text-indigo-600 hover:underline text-sm">
                Найти ментора
              </Link>
            </div>
          ) : (
            <div className="divide-y">
              {conversations.map(conv => {
                const partner = getPartner(conv);
                const isActive = conv.id === activeConversation;

                return (
                  <button
                    key={conv.id}
                    onClick={() => setActiveConversation(conv.id)}
                    className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                      isActive ? 'bg-indigo-50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-lg shrink-0">
                        {partner.fullName.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <p className="font-medium text-gray-900 truncate">{partner.fullName}</p>
                          {conv.unreadCount > 0 && (
                            <span className="ml-2 px-2 py-0.5 bg-indigo-600 text-white text-xs rounded-full">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                        {conv.lastMessage && (
                          <p className="text-sm text-gray-600 truncate">
                            {conv.lastMessage.senderId === user?.id ? 'Вы: ' : ''}
                            {conv.lastMessage.content}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Messages Area */}
        <div className="flex-1 flex flex-col bg-gray-50">
          {!activeConversation ? (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              Выберите диалог
            </div>
          ) : (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map(message => {
                  const isOwn = message.senderId === user?.id;

                  return (
                    <div
                      key={message.id}
                      className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-md px-4 py-2 rounded-lg ${
                          isOwn
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white text-gray-900 shadow'
                        }`}
                      >
                        <p>{message.content}</p>
                        <p className={`text-xs mt-1 ${isOwn ? 'text-indigo-200' : 'text-gray-500'}`}>
                          {new Date(message.createdAt).toLocaleTimeString('ru-RU', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <form onSubmit={handleSend} className="p-4 bg-white border-t">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Введите сообщение..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || isSending}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSending ? '...' : 'Отправить'}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
