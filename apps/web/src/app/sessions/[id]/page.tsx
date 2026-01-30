'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

// Fake session data
const fakeSession = {
  id: '1',
  mentorName: 'Иван Ментор',
  menteeName: 'Анна Менти',
  service: 'Career Consultation',
  date: '2026-01-31',
  time: '10:00',
  duration: 60,
  status: 'confirmed',
  price: 50,
  notes: '',
  recordingUrl: null,
};

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isLoading, isAuthenticated, isMentor, logout } = useAuth();
  const [notes, setNotes] = useState(fakeSession.notes);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  const handleSaveNotes = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const isUpcoming = new Date(fakeSession.date) > new Date();
  const canJoin = fakeSession.status === 'confirmed' && isUpcoming;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/sessions" className="text-indigo-600 hover:text-indigo-700">
            ← Назад к сессиям
          </Link>
          <button onClick={logout} className="text-red-600 hover:text-red-700">Выйти</button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{fakeSession.service}</h1>
              <p className="text-gray-600 mt-1">
                с {isMentor ? fakeSession.menteeName : fakeSession.mentorName}
              </p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm ${
              fakeSession.status === 'confirmed' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              {fakeSession.status === 'confirmed' ? 'Подтверждена' : 'Завершена'}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div>
              <p className="text-sm text-gray-600">Дата</p>
              <p className="font-medium text-gray-900">
                {new Date(fakeSession.date).toLocaleDateString('ru-RU', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Время</p>
              <p className="font-medium text-gray-900">{fakeSession.time}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Длительность</p>
              <p className="font-medium text-gray-900">{fakeSession.duration} минут</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Стоимость</p>
              <p className="font-medium text-gray-900">${fakeSession.price}</p>
            </div>
          </div>

          {canJoin && (
            <div className="bg-indigo-50 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-indigo-900">Сессия скоро начнётся</p>
                  <p className="text-sm text-indigo-700">Ссылка на звонок активна за 15 минут до начала</p>
                </div>
                <Link
                  href={`/room/${id}`}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700"
                >
                  📹 Присоединиться
                </Link>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Link
              href="/chat"
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              💬 Написать сообщение
            </Link>
            {isUpcoming && (
              <button className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200">
                Отменить сессию
              </button>
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">
            {isMentor ? 'Заметки по сессии' : 'Мои заметки'}
          </h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Добавьте заметки к сессии..."
            className="w-full h-32 border border-gray-300 rounded-lg p-3 resize-none"
          />
          <button
            onClick={handleSaveNotes}
            disabled={isSaving}
            className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {isSaving ? 'Сохранение...' : 'Сохранить заметки'}
          </button>
        </div>

        {/* Recording (if completed) */}
        {fakeSession.status === 'completed' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Запись сессии</h2>
            {fakeSession.recordingUrl ? (
              <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center">
                <p className="text-white">Видео плеер</p>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-8 text-center">
                <p className="text-gray-600">Запись пока недоступна</p>
                <p className="text-sm text-gray-500 mt-1">Обычно запись появляется в течение 24 часов</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
