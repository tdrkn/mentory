'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

export default function ReviewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) return;
    
    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    router.push('/sessions?review=success');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-lg w-full mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
            Оцените сессию
          </h1>
          <p className="text-gray-600 text-center mb-8">
            Ваш отзыв поможет другим менти выбрать ментора
          </p>

          {/* Star Rating */}
          <div className="flex justify-center gap-2 mb-8">
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="text-4xl transition-transform hover:scale-110"
              >
                {star <= (hoverRating || rating) ? '⭐' : '☆'}
              </button>
            ))}
          </div>

          {/* Rating Labels */}
          <div className="flex justify-between text-sm text-gray-500 mb-8 px-4">
            <span>Плохо</span>
            <span>Отлично</span>
          </div>

          {/* Comment */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Расскажите подробнее (опционально)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Что вам понравилось? Что можно улучшить?"
              className="w-full h-32 border border-gray-300 rounded-lg p-3 resize-none"
            />
          </div>

          {/* Quick Tags */}
          <div className="mb-6">
            <p className="text-sm font-medium text-gray-700 mb-2">Быстрые теги:</p>
            <div className="flex flex-wrap gap-2">
              {['Профессионал', 'Понятные объяснения', 'Дружелюбный', 'Полезные советы', 'Рекомендую'].map(tag => (
                <button
                  key={tag}
                  onClick={() => setComment(prev => prev ? `${prev}, ${tag}` : tag)}
                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={rating === 0 || isSubmitting}
            className="w-full py-3 px-4 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Отправка...' : 'Отправить отзыв'}
          </button>

          <Link
            href="/sessions"
            className="block mt-4 text-center text-gray-600 hover:text-gray-900"
          >
            Пропустить
          </Link>
        </div>
      </div>
    </div>
  );
}
