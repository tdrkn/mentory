'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api, Session, ApiError } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';

export default function SessionsPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'upcoming' | 'past' | 'all'>('upcoming');

  const showSuccess = searchParams.get('success') === '1';

  useEffect(() => {
    if (!isAuthenticated && !authLoading) {
      window.location.href = '/login';
      return;
    }

    const loadSessions = async () => {
      try {
        const data = await api.get<Session[]>('/sessions');
        setSessions(data);
      } catch (err) {
        console.error('Failed to load sessions:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (isAuthenticated) {
      loadSessions();
    }
  }, [isAuthenticated, authLoading]);

  const filteredSessions = sessions.filter(session => {
    const sessionDate = new Date(session.startAt);
    const now = new Date();

    if (filter === 'upcoming') {
      return sessionDate > now && session.status !== 'canceled';
    }
    if (filter === 'past') {
      return sessionDate <= now || session.status === 'completed';
    }
    return true;
  });

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-green-100 text-green-800',
      completed: 'bg-gray-100 text-gray-800',
      canceled: 'bg-red-100 text-red-800',
    };
    const labels = {
      pending: 'Ожидает',
      confirmed: 'Подтверждена',
      completed: 'Завершена',
      canceled: 'Отменена',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status as keyof typeof styles] || 'bg-gray-100'}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/mentors" className="text-2xl font-bold text-indigo-600">Mentory</Link>
          <nav className="flex gap-4">
            <Link href="/mentors" className="text-gray-600 hover:text-gray-900">Менторы</Link>
            <Link href="/sessions" className="text-indigo-600 font-medium">Мои сессии</Link>
            <Link href="/chat" className="text-gray-600 hover:text-gray-900">Чат</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Мои сессии</h1>

        {/* Success message */}
        {showSuccess && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-6">
            🎉 Сессия успешно забронирована!
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          {(['upcoming', 'past', 'all'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === f
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {f === 'upcoming' ? 'Предстоящие' : f === 'past' ? 'Прошедшие' : 'Все'}
            </button>
          ))}
        </div>

        {/* Sessions list */}
        {filteredSessions.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600 mb-4">
              {filter === 'upcoming' ? 'Нет предстоящих сессий' : 'Нет сессий'}
            </p>
            <Link
              href="/mentors"
              className="inline-block px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Найти ментора
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSessions.map(session => {
              const partner = user?.role === 'mentor' ? session.mentee : session.mentor;
              const startDate = new Date(session.startAt);
              
              return (
                <div key={session.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-xl">
                        {partner.fullName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{partner.fullName}</p>
                        <p className="text-sm text-gray-600">
                          {user?.role === 'mentor' ? 'Менти' : 'Ментор'}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(session.status)}
                  </div>

                  <div className="mt-4 flex items-center gap-6 text-sm text-gray-600">
                    <span>
                      📅 {startDate.toLocaleDateString('ru-RU', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </span>
                    <span>
                      🕐 {startDate.toLocaleTimeString('ru-RU', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>

                  <div className="mt-4 flex gap-2">
                    {session.status === 'confirmed' && (
                      <button className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700">
                        Присоединиться
                      </button>
                    )}
                    <Link
                      href={`/chat?session=${session.id}`}
                      className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50"
                    >
                      Открыть чат
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
