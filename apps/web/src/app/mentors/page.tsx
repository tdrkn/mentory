'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { api, MentorProfile, ApiError } from '@/lib/api-client';

interface Filters {
  topic?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  sort?: string;
}

export default function MentorsPage() {
  const [mentors, setMentors] = useState<MentorProfile[]>([]);
  const [topics, setTopics] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({});
  const [total, setTotal] = useState(0);
  
  const searchParams = useSearchParams();
  const router = useRouter();

  // Load topics
  useEffect(() => {
    api.get<{ id: string; name: string }[]>('/topics')
      .then(setTopics)
      .catch(() => {});
  }, []);

  // Load mentors
  useEffect(() => {
    const loadMentors = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (filters.topic) params.set('topic', filters.topic);
        if (filters.minPrice) params.set('minPrice', String(filters.minPrice));
        if (filters.maxPrice) params.set('maxPrice', String(filters.maxPrice));
        if (filters.minRating) params.set('minRating', String(filters.minRating));
        if (filters.sort) params.set('sort', filters.sort);
        
        const query = params.toString() ? `?${params.toString()}` : '';
        const response = await api.get<{ data: MentorProfile[]; meta: { total: number } }>(`/mentors${query}`);
        setMentors(response.data || []);
        setTotal(response.meta?.total || 0);
      } catch (err) {
        if (err instanceof ApiError) {
          setError('Не удалось загрузить менторов');
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadMentors();
  }, [filters]);

  const updateFilter = (key: keyof Filters, value: string | number | undefined) => {
    setFilters(prev => ({ ...prev, [key]: value || undefined }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-indigo-600">Mentory</Link>
          <nav className="flex gap-4">
            <Link href="/sessions" className="text-gray-600 hover:text-gray-900">Мои сессии</Link>
            <Link href="/chat" className="text-gray-600 hover:text-gray-900">Чат</Link>
            <Link href="/login" className="text-indigo-600 hover:text-indigo-700">Выйти</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Найти ментора</h1>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Topic */}
            <select
              value={filters.topic || ''}
              onChange={(e) => updateFilter('topic', e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">Все темы</option>
              {topics.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>

            {/* Price Range */}
            <input
              type="number"
              placeholder="Мин. цена"
              value={filters.minPrice || ''}
              onChange={(e) => updateFilter('minPrice', Number(e.target.value))}
              className="border border-gray-300 rounded-md px-3 py-2"
            />
            <input
              type="number"
              placeholder="Макс. цена"
              value={filters.maxPrice || ''}
              onChange={(e) => updateFilter('maxPrice', Number(e.target.value))}
              className="border border-gray-300 rounded-md px-3 py-2"
            />

            {/* Rating */}
            <select
              value={filters.minRating || ''}
              onChange={(e) => updateFilter('minRating', Number(e.target.value))}
              className="border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">Любой рейтинг</option>
              <option value="4">4+ ⭐</option>
              <option value="4.5">4.5+ ⭐</option>
            </select>

            {/* Sort */}
            <select
              value={filters.sort || ''}
              onChange={(e) => updateFilter('sort', e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">Сортировка</option>
              <option value="rating">По рейтингу</option>
              <option value="price_asc">Цена ↑</option>
              <option value="price_desc">Цена ↓</option>
              <option value="sessions">По кол-ву сессий</option>
            </select>
          </div>
        </div>

        {/* Results count */}
        <p className="text-gray-600 mb-4">Найдено: {total} менторов</p>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Loading */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Загрузка...</p>
          </div>
        ) : (
          /* Mentors Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mentors.map(mentor => (
              <Link
                key={mentor.id}
                href={`/mentors/${mentor.id}`}
                className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6"
              >
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center text-2xl">
                    {mentor.avatarUrl ? (
                      <img src={mentor.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      mentor.fullName?.charAt(0) || 'M'
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{mentor.fullName}</h3>
                    <p className="text-sm text-gray-600 truncate">{mentor.headline}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-yellow-500">⭐ {mentor.rating?.average || '0'}</span>
                      <span className="text-gray-400">•</span>
                      <span className="text-gray-600">{mentor.completedSessions || 0} сессий</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {(mentor.topics || []).slice(0, 3).map(topic => (
                    <span key={topic.id} className="px-2 py-1 bg-indigo-50 text-indigo-700 text-xs rounded">
                      {topic.name}
                    </span>
                  ))}
                </div>
                <div className="mt-4 flex justify-between items-center">
                  <span className="text-lg font-bold text-indigo-600">
                    {mentor.startingPrice ? `$${mentor.startingPrice.priceAmount}` : 'Цена по запросу'}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && mentors.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600">Менторы не найдены. Попробуйте изменить фильтры.</p>
          </div>
        )}
      </main>
    </div>
  );
}
