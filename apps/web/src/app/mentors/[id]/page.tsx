'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, MentorProfile, Slot, ApiError } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';

export default function MentorProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  
  const [mentor, setMentor] = useState<MentorProfile | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBooking, setIsBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load mentor profile
  useEffect(() => {
    const loadData = async () => {
      try {
        const [mentorData, slotsData] = await Promise.all([
          api.get<MentorProfile>(`/mentors/${id}`),
          api.get<Slot[]>(`/scheduling/mentors/${id}/slots`),
        ]);
        setMentor(mentorData);
        setSlots(slotsData.filter(s => s.status === 'available'));
      } catch (err) {
        setError('Не удалось загрузить профиль ментора');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [id]);

  // Group slots by date
  const slotsByDate = slots.reduce((acc, slot) => {
    const date = new Date(slot.startAt).toLocaleDateString('ru-RU', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(slot);
    return acc;
  }, {} as Record<string, Slot[]>);

  const handleHoldSlot = async () => {
    if (!selectedSlot) return;
    
    if (!isAuthenticated) {
      router.push(`/login?redirect=/mentors/${id}`);
      return;
    }

    setIsBooking(true);
    setError(null);

    try {
      const result = await api.post<{ session: { id: string } }>('/booking/hold', {
        slotId: selectedSlot,
      });
      
      // Redirect to checkout
      router.push(`/checkout/${result.session.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setError('Этот слот уже занят. Выберите другое время.');
          // Reload slots
          const newSlots = await api.get<Slot[]>(`/scheduling/mentors/${id}/slots`);
          setSlots(newSlots.filter(s => s.status === 'available'));
          setSelectedSlot(null);
        } else {
          setError('Не удалось забронировать слот');
        }
      }
    } finally {
      setIsBooking(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!mentor) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Ментор не найден</h1>
          <Link href="/mentors" className="text-indigo-600 hover:underline">
            Вернуться к каталогу
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/mentors" className="text-indigo-600 hover:text-indigo-700">
            ← Назад к каталогу
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start gap-6">
                <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center text-4xl shrink-0">
                  {mentor.user.avatarUrl ? (
                    <img src={mentor.user.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    mentor.user.fullName.charAt(0)
                  )}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{mentor.user.fullName}</h1>
                  <p className="text-gray-600">{mentor.title}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-yellow-500">⭐ {mentor.rating.toFixed(1)}</span>
                    <span className="text-gray-600">{mentor.reviewCount} отзывов</span>
                    <span className="text-gray-600">{mentor.sessionCount} сессий</span>
                    {mentor.isVerified && (
                      <span className="text-green-600">✓ Проверен</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Bio */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">О менторе</h2>
              <p className="text-gray-700 whitespace-pre-line">{mentor.bio}</p>
            </div>

            {/* Topics */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Темы</h2>
              <div className="flex flex-wrap gap-2">
                {mentor.topics.map(topic => (
                  <span key={topic.id} className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full">
                    {topic.name}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Booking Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 sticky top-4">
              <div className="text-center mb-6">
                <span className="text-3xl font-bold text-indigo-600">${mentor.hourlyRate}</span>
                <span className="text-gray-600">/час</span>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 text-sm">
                  {error}
                </div>
              )}

              <h3 className="font-semibold text-gray-900 mb-4">Доступные слоты</h3>

              {Object.keys(slotsByDate).length === 0 ? (
                <p className="text-gray-600 text-center py-4">
                  Нет доступных слотов
                </p>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {Object.entries(slotsByDate).map(([date, dateSlots]) => (
                    <div key={date}>
                      <p className="text-sm font-medium text-gray-700 mb-2 capitalize">{date}</p>
                      <div className="grid grid-cols-2 gap-2">
                        {dateSlots.map(slot => {
                          const time = new Date(slot.startAt).toLocaleTimeString('ru-RU', {
                            hour: '2-digit',
                            minute: '2-digit'
                          });
                          const isSelected = selectedSlot === slot.id;
                          
                          return (
                            <button
                              key={slot.id}
                              onClick={() => setSelectedSlot(slot.id)}
                              className={`px-3 py-2 text-sm rounded border transition-colors ${
                                isSelected
                                  ? 'bg-indigo-600 text-white border-indigo-600'
                                  : 'border-gray-300 hover:border-indigo-600 hover:text-indigo-600'
                              }`}
                            >
                              {time}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={handleHoldSlot}
                disabled={!selectedSlot || isBooking}
                className="mt-6 w-full py-3 px-4 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isBooking ? 'Бронирование...' : 'Забронировать (10 мин)'}
              </button>

              <p className="mt-2 text-xs text-gray-500 text-center">
                Слот будет удержан на 10 минут для оплаты
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
