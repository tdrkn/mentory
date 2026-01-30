'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';

// API response type for single mentor
interface MentorDetail {
  id: string;
  fullName: string;
  timezone: string;
  createdAt: string;
  mentorProfile: {
    headline: string;
    bio: string;
    languages: string[];
    ratingAvg: string;
    ratingCount: number;
    topics: { topic: { id: string; name: string } }[];
  };
  mentorServices: {
    id: string;
    title: string;
    durationMin: number;
    priceAmount: string;
    currency: string;
  }[];
  _count: {
    sessionsAsMentor: number;
  };
}

interface Slot {
  id: string;
  startAt: string;
  endAt: string;
  status: string;
}

export default function MentorProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  
  const [mentor, setMentor] = useState<MentorDetail | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBooking, setIsBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load mentor profile
  useEffect(() => {
    const loadData = async () => {
      try {
        const mentorData = await api.get<MentorDetail>(`/mentors/${id}`);
        setMentor(mentorData);
        
        // Set first service as default
        if (mentorData.mentorServices?.length > 0) {
          setSelectedService(mentorData.mentorServices[0].id);
        }
        
        // Try to load slots, but don't fail if endpoint doesn't exist
        try {
          const slotsResponse = await api.get<{ slots: Slot[] }>(`/scheduling/mentors/${id}/slots`);
          setSlots((slotsResponse.slots || []).filter(s => s.status === 'free'));
        } catch {
          // Slots endpoint might not be implemented yet
          setSlots([]);
        }
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
        serviceId: selectedService,
      });
      
      // Redirect to checkout
      router.push(`/checkout/${result.session.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setError('Этот слот уже занят. Выберите другое время.');
          // Reload slots
          try {
            const slotsResponse = await api.get<{ slots: Slot[] }>(`/scheduling/mentors/${id}/slots`);
            setSlots((slotsResponse.slots || []).filter(s => s.status === 'free'));
          } catch {}
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

  const profile = mentor.mentorProfile;
  const topics = profile?.topics?.map(t => t.topic) || [];
  const services = mentor.mentorServices || [];
  const minPrice = services.length > 0 
    ? Math.min(...services.map(s => parseFloat(s.priceAmount)))
    : null;

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
                <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center text-4xl shrink-0 text-indigo-600 font-bold">
                  {mentor.fullName?.charAt(0) || 'M'}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{mentor.fullName}</h1>
                  <p className="text-gray-600">{profile?.headline}</p>
                  <div className="flex items-center gap-4 mt-2 flex-wrap">
                    <span className="text-yellow-500">⭐ {profile?.ratingAvg || '0'}</span>
                    <span className="text-gray-600">{profile?.ratingCount || 0} отзывов</span>
                    <span className="text-gray-600">{mentor._count?.sessionsAsMentor || 0} сессий</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bio */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">О менторе</h2>
              <p className="text-gray-700 whitespace-pre-line">{profile?.bio || 'Описание не указано'}</p>
            </div>

            {/* Topics */}
            {topics.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Темы</h2>
                <div className="flex flex-wrap gap-2">
                  {topics.map(topic => (
                    <span key={topic.id} className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full">
                      {topic.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Services */}
            {services.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Услуги</h2>
                <div className="space-y-3">
                  {services.map(service => (
                    <div 
                      key={service.id} 
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedService === service.id 
                          ? 'border-indigo-600 bg-indigo-50' 
                          : 'border-gray-200 hover:border-indigo-300'
                      }`}
                      onClick={() => setSelectedService(service.id)}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-medium text-gray-900">{service.title}</h3>
                          <p className="text-sm text-gray-600">{service.durationMin} минут</p>
                        </div>
                        <span className="text-lg font-bold text-indigo-600">
                          ${service.priceAmount} {service.currency}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Booking Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 sticky top-4">
              {minPrice !== null && (
                <div className="text-center mb-6">
                  <span className="text-sm text-gray-600">от</span>
                  <span className="text-3xl font-bold text-indigo-600 ml-1">${minPrice}</span>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 text-sm">
                  {error}
                </div>
              )}

              <h3 className="font-semibold text-gray-900 mb-4">Доступные слоты</h3>

              {Object.keys(slotsByDate).length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-gray-600 mb-4">Нет доступных слотов</p>
                  <p className="text-sm text-gray-500">
                    Ментор пока не добавил расписание
                  </p>
                </div>
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
                disabled={!selectedSlot || isBooking || !selectedService}
                className="mt-6 w-full py-3 px-4 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isBooking ? 'Бронирование...' : 'Забронировать'}
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
