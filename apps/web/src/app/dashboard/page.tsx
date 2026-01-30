'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

// Fake data for MVP demo
const fakeStats = {
  totalSessions: 25,
  completedSessions: 20,
  upcomingSessions: 3,
  pendingRequests: 2,
  totalEarnings: 1250,
  averageRating: 4.8,
  reviewCount: 18,
};

const fakeUpcomingSessions = [
  { id: '1', menteeName: 'Анна Менти', date: '2026-01-31', time: '10:00', service: 'Career Consultation' },
  { id: '2', menteeName: 'Петр Иванов', date: '2026-01-31', time: '14:00', service: 'Code Review' },
  { id: '3', menteeName: 'Мария Сидорова', date: '2026-02-01', time: '11:00', service: 'Career Consultation' },
];

const fakePendingRequests = [
  { id: '1', menteeName: 'Алексей Козлов', date: '2026-02-02', time: '15:00', message: 'Хотел бы обсудить переход в IT' },
  { id: '2', menteeName: 'Елена Морозова', date: '2026-02-03', time: '10:00', message: 'Интересует менторство по Python' },
];

export default function DashboardPage() {
  const { user, isLoading, isAuthenticated, isMentor, logout } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'requests'>('upcoming');

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
    if (!isLoading && isAuthenticated && !isMentor) {
      router.push('/mentors');
    }
  }, [isLoading, isAuthenticated, isMentor, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!isAuthenticated || !isMentor) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/dashboard" className="text-2xl font-bold text-indigo-600">Mentory</Link>
          <nav className="flex gap-6 items-center">
            <Link href="/dashboard" className="text-indigo-600 font-medium">Дашборд</Link>
            <Link href="/schedule" className="text-gray-600 hover:text-gray-900">Расписание</Link>
            <Link href="/sessions" className="text-gray-600 hover:text-gray-900">Сессии</Link>
            <Link href="/profile/edit" className="text-gray-600 hover:text-gray-900">Профиль</Link>
            <Link href="/chat" className="text-gray-600 hover:text-gray-900">Чат</Link>
            <button onClick={logout} className="text-red-600 hover:text-red-700">Выйти</button>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Привет, {user?.fullName}! 👋</h1>
          <p className="text-gray-600 mt-1">Ваш центр управления менторством</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Всего сессий</p>
            <p className="text-2xl font-bold text-gray-900">{fakeStats.totalSessions}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Предстоящие</p>
            <p className="text-2xl font-bold text-indigo-600">{fakeStats.upcomingSessions}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Заработок</p>
            <p className="text-2xl font-bold text-green-600">${fakeStats.totalEarnings}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Рейтинг</p>
            <p className="text-2xl font-bold text-yellow-500">⭐ {fakeStats.averageRating}</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sessions & Requests */}
          <div className="lg:col-span-2">
            {/* Tabs */}
            <div className="bg-white rounded-lg shadow">
              <div className="border-b flex">
                <button
                  onClick={() => setActiveTab('upcoming')}
                  className={`flex-1 px-4 py-3 text-sm font-medium ${
                    activeTab === 'upcoming'
                      ? 'text-indigo-600 border-b-2 border-indigo-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Предстоящие сессии ({fakeUpcomingSessions.length})
                </button>
                <button
                  onClick={() => setActiveTab('requests')}
                  className={`flex-1 px-4 py-3 text-sm font-medium ${
                    activeTab === 'requests'
                      ? 'text-indigo-600 border-b-2 border-indigo-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Запросы ({fakePendingRequests.length})
                </button>
              </div>

              <div className="p-4">
                {activeTab === 'upcoming' && (
                  <div className="space-y-4">
                    {fakeUpcomingSessions.map(session => (
                      <div key={session.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{session.menteeName}</p>
                          <p className="text-sm text-gray-600">{session.service}</p>
                          <p className="text-sm text-gray-500">{session.date} в {session.time}</p>
                        </div>
                        <div className="flex gap-2">
                          <Link
                            href={`/sessions/${session.id}`}
                            className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700"
                          >
                            Подробнее
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'requests' && (
                  <div className="space-y-4">
                    {fakePendingRequests.map(request => (
                      <div key={request.id} className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-gray-900">{request.menteeName}</p>
                            <p className="text-sm text-gray-500">{request.date} в {request.time}</p>
                            <p className="text-sm text-gray-600 mt-2">&quot;{request.message}&quot;</p>
                          </div>
                          <div className="flex gap-2">
                            <button className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700">
                              Принять
                            </button>
                            <button className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300">
                              Отклонить
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Быстрые действия</h3>
              <div className="space-y-3">
                <Link
                  href="/schedule"
                  className="block w-full px-4 py-3 text-center bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  📅 Управлять расписанием
                </Link>
                <Link
                  href="/profile/edit"
                  className="block w-full px-4 py-3 text-center bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  ✏️ Редактировать профиль
                </Link>
                <Link
                  href="/earnings"
                  className="block w-full px-4 py-3 text-center bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  💰 Вывод средств
                </Link>
              </div>
            </div>

            {/* Recent Reviews */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Последние отзывы</h3>
              <div className="space-y-4">
                <div className="border-b pb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-yellow-500">⭐⭐⭐⭐⭐</span>
                    <span className="text-sm text-gray-500">2 дня назад</span>
                  </div>
                  <p className="text-sm text-gray-700">&quot;Отличная консультация! Помог разобраться с архитектурой.&quot;</p>
                  <p className="text-xs text-gray-500 mt-1">— Анна М.</p>
                </div>
                <div className="border-b pb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-yellow-500">⭐⭐⭐⭐⭐</span>
                    <span className="text-sm text-gray-500">5 дней назад</span>
                  </div>
                  <p className="text-sm text-gray-700">&quot;Очень полезно для карьерного роста!&quot;</p>
                  <p className="text-xs text-gray-500 mt-1">— Петр И.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
