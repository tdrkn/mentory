'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

export default function ProfileEditPage() {
  const { user, isLoading, isAuthenticated, isMentor, logout } = useAuth();
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Form state
  const [fullName, setFullName] = useState('');
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [timezone, setTimezone] = useState('Europe/Moscow');
  const [languages, setLanguages] = useState<string[]>(['Русский', 'English']);

  // Services (for mentors)
  const [services, setServices] = useState([
    { id: '1', title: 'Career Consultation', duration: 60, price: 50 },
    { id: '2', title: 'Code Review', duration: 45, price: 35 },
  ]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '');
    }
  }, [user]);

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const addService = () => {
    setServices([...services, {
      id: Date.now().toString(),
      title: '',
      duration: 60,
      price: 0,
    }]);
  };

  const removeService = (id: string) => {
    setServices(services.filter(s => s.id !== id));
  };

  const updateService = (id: string, field: string, value: string | number) => {
    setServices(services.map(s => 
      s.id === id ? { ...s, [field]: value } : s
    ));
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href={isMentor ? '/dashboard' : '/mentors'} className="text-2xl font-bold text-indigo-600">
            Mentory
          </Link>
          <nav className="flex gap-6 items-center">
            {isMentor && (
              <>
                <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">Дашборд</Link>
                <Link href="/schedule" className="text-gray-600 hover:text-gray-900">Расписание</Link>
              </>
            )}
            <Link href="/sessions" className="text-gray-600 hover:text-gray-900">Сессии</Link>
            <Link href="/profile/edit" className="text-indigo-600 font-medium">Профиль</Link>
            <button onClick={logout} className="text-red-600 hover:text-red-700">Выйти</button>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Редактирование профиля</h1>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {isSaving ? 'Сохранение...' : saved ? '✓ Сохранено' : 'Сохранить'}
          </button>
        </div>

        <div className="space-y-6">
          {/* Basic Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Основная информация</h2>
            
            <div className="space-y-4">
              {/* Avatar */}
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center text-3xl text-indigo-600 font-bold">
                  {fullName?.charAt(0) || 'U'}
                </div>
                <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                  Загрузить фото
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Полное имя
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>

              {isMentor && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Заголовок профиля
                  </label>
                  <input
                    type="text"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    placeholder="например: Senior Software Engineer в Google"
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isMentor ? 'О себе' : 'Расскажите о себе'}
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder={isMentor 
                    ? "Расскажите о вашем опыте, достижениях и чем вы можете помочь..."
                    : "Расскажите о своём бэкграунде и целях..."
                  }
                  className="w-full h-32 border border-gray-300 rounded-md px-3 py-2 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Часовой пояс
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="Europe/Moscow">Europe/Moscow (UTC+3)</option>
                  <option value="Europe/Kiev">Europe/Kiev (UTC+2)</option>
                  <option value="Asia/Almaty">Asia/Almaty (UTC+6)</option>
                  <option value="America/New_York">America/New_York (UTC-5)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Языки
                </label>
                <div className="flex flex-wrap gap-2">
                  {languages.map((lang, i) => (
                    <span key={i} className="px-3 py-1 bg-gray-100 rounded-full text-sm flex items-center gap-2">
                      {lang}
                      <button 
                        onClick={() => setLanguages(languages.filter((_, idx) => idx !== i))}
                        className="text-gray-500 hover:text-red-500"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <button className="px-3 py-1 border border-dashed border-gray-300 rounded-full text-sm text-gray-600 hover:border-gray-400">
                    + Добавить
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Services (Mentor only) */}
          {isMentor && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-semibold text-gray-900">Услуги и тарифы</h2>
                <button
                  onClick={addService}
                  className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200"
                >
                  + Добавить услугу
                </button>
              </div>

              <div className="space-y-4">
                {services.map((service, i) => (
                  <div key={service.id} className="p-4 border border-gray-200 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Название услуги
                        </label>
                        <input
                          type="text"
                          value={service.title}
                          onChange={(e) => updateService(service.id, 'title', e.target.value)}
                          placeholder="например: Career Consultation"
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Длительность (мин)
                        </label>
                        <select
                          value={service.duration}
                          onChange={(e) => updateService(service.id, 'duration', Number(e.target.value))}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                        >
                          <option value={30}>30 мин</option>
                          <option value={45}>45 мин</option>
                          <option value={60}>60 мин</option>
                          <option value={90}>90 мин</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Цена ($)
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            value={service.price}
                            onChange={(e) => updateService(service.id, 'price', Number(e.target.value))}
                            className="flex-1 border border-gray-300 rounded-md px-3 py-2"
                          />
                          <button
                            onClick={() => removeService(service.id)}
                            className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-md"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Topics (Mentor only) */}
          {isMentor && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Темы менторства</h2>
              <div className="flex flex-wrap gap-2">
                {['Programming', 'Career Growth', 'System Design', 'Leadership'].map(topic => (
                  <span key={topic} className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm flex items-center gap-2">
                    {topic}
                    <button className="text-indigo-500 hover:text-red-500">×</button>
                  </span>
                ))}
                <button className="px-3 py-1 border border-dashed border-gray-300 rounded-full text-sm text-gray-600 hover:border-gray-400">
                  + Добавить тему
                </button>
              </div>
            </div>
          )}

          {/* Mentee Profile */}
          {!isMentor && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Мой бэкграунд</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Текущая позиция
                  </label>
                  <input
                    type="text"
                    placeholder="например: Junior Developer"
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Опыт работы
                  </label>
                  <select className="w-full border border-gray-300 rounded-md px-3 py-2">
                    <option>Менее 1 года</option>
                    <option>1-3 года</option>
                    <option>3-5 лет</option>
                    <option>5+ лет</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Цели менторства
                  </label>
                  <textarea
                    placeholder="Чего вы хотите достичь с помощью менторства?"
                    className="w-full h-24 border border-gray-300 rounded-md px-3 py-2 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Интересующие темы
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['Career Growth', 'Technical Skills', 'Leadership'].map(topic => (
                      <span key={topic} className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm flex items-center gap-2">
                        {topic}
                        <button className="text-indigo-500 hover:text-red-500">×</button>
                      </span>
                    ))}
                    <button className="px-3 py-1 border border-dashed border-gray-300 rounded-full text-sm text-gray-600 hover:border-gray-400">
                      + Добавить
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
