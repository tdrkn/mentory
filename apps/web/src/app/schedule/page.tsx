'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

// Fake availability data for MVP
const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const timeSlots = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

interface AvailabilitySlot {
  day: number;
  time: string;
  isAvailable: boolean;
}

export default function SchedulePage() {
  const { user, isLoading, isAuthenticated, isMentor, logout } = useAuth();
  const router = useRouter();
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
    if (!isLoading && isAuthenticated && !isMentor) {
      router.push('/mentors');
    }
  }, [isLoading, isAuthenticated, isMentor, router]);

  // Initialize with some fake availability
  useEffect(() => {
    const initial: AvailabilitySlot[] = [];
    for (let day = 0; day < 7; day++) {
      for (const time of timeSlots) {
        initial.push({
          day,
          time,
          isAvailable: day < 5 && time >= '10:00' && time <= '17:00', // Mon-Fri 10-17
        });
      }
    }
    setAvailability(initial);
  }, []);

  const toggleSlot = (day: number, time: string) => {
    setAvailability(prev =>
      prev.map(slot =>
        slot.day === day && slot.time === time
          ? { ...slot, isAvailable: !slot.isAvailable }
          : slot
      )
    );
    setSaved(false);
  };

  const isSlotAvailable = (day: number, time: string) => {
    return availability.find(s => s.day === day && s.time === time)?.isAvailable || false;
  };

  const handleSave = async () => {
    setIsSaving(true);
    // Fake save - just simulate delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    setSaved(true);
  };

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
            <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">Дашборд</Link>
            <Link href="/schedule" className="text-indigo-600 font-medium">Расписание</Link>
            <Link href="/sessions" className="text-gray-600 hover:text-gray-900">Сессии</Link>
            <Link href="/profile/edit" className="text-gray-600 hover:text-gray-900">Профиль</Link>
            <button onClick={logout} className="text-red-600 hover:text-red-700">Выйти</button>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Управление расписанием</h1>
            <p className="text-gray-600 mt-1">Укажите когда вы доступны для сессий</p>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {isSaving ? 'Сохранение...' : saved ? '✓ Сохранено' : 'Сохранить'}
          </button>
        </div>

        {/* Schedule Grid */}
        <div className="bg-white rounded-lg shadow p-6 overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr>
                <th className="p-2 text-left text-sm font-medium text-gray-600">Время</th>
                {weekDays.map((day, i) => (
                  <th key={i} className="p-2 text-center text-sm font-medium text-gray-600">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map(time => (
                <tr key={time}>
                  <td className="p-2 text-sm text-gray-600">{time}</td>
                  {weekDays.map((_, day) => (
                    <td key={day} className="p-1">
                      <button
                        onClick={() => toggleSlot(day, time)}
                        className={`w-full h-10 rounded transition-colors ${
                          isSlotAvailable(day, time)
                            ? 'bg-green-500 hover:bg-green-600'
                            : 'bg-gray-200 hover:bg-gray-300'
                        }`}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="mt-4 flex gap-6 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span>Доступен</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-200 rounded"></div>
            <span>Недоступен</span>
          </div>
        </div>

        {/* Timezone */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Настройки</h2>
          <div className="flex items-center gap-4">
            <label className="text-sm text-gray-600">Часовой пояс:</label>
            <select className="border border-gray-300 rounded-md px-3 py-2">
              <option>Europe/Moscow (UTC+3)</option>
              <option>Europe/Kiev (UTC+2)</option>
              <option>Asia/Almaty (UTC+6)</option>
            </select>
          </div>
        </div>

        {/* Quick Templates */}
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Быстрые шаблоны</h2>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => {
                const newAvail = availability.map(slot => ({
                  ...slot,
                  isAvailable: slot.day < 5 && slot.time >= '09:00' && slot.time <= '18:00',
                }));
                setAvailability(newAvail);
                setSaved(false);
              }}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              Рабочая неделя (9-18)
            </button>
            <button
              onClick={() => {
                const newAvail = availability.map(slot => ({
                  ...slot,
                  isAvailable: slot.time >= '18:00',
                }));
                setAvailability(newAvail);
                setSaved(false);
              }}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              Только вечер
            </button>
            <button
              onClick={() => {
                const newAvail = availability.map(slot => ({
                  ...slot,
                  isAvailable: slot.day >= 5,
                }));
                setAvailability(newAvail);
                setSaved(false);
              }}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              Только выходные
            </button>
            <button
              onClick={() => {
                const newAvail = availability.map(slot => ({
                  ...slot,
                  isAvailable: false,
                }));
                setAvailability(newAvail);
                setSaved(false);
              }}
              className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
            >
              Очистить всё
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
