'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function CheckoutSuccessPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          {/* Success Icon */}
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">✓</span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Оплата прошла успешно!
          </h1>
          
          <p className="text-gray-600 mb-6">
            Ваша сессия подтверждена. Мы отправили детали на вашу почту.
          </p>

          {/* Session Details */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-medium text-gray-900 mb-2">Детали сессии:</h3>
            <div className="space-y-1 text-sm text-gray-600">
              <p><strong>Ментор:</strong> Иван Ментор</p>
              <p><strong>Услуга:</strong> Career Consultation</p>
              <p><strong>Дата:</strong> 31 января 2026, 10:00</p>
              <p><strong>Длительность:</strong> 60 минут</p>
            </div>
          </div>

          {/* What's Next */}
          <div className="bg-indigo-50 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-medium text-indigo-900 mb-2">Что дальше:</h3>
            <ul className="space-y-2 text-sm text-indigo-800">
              <li>📧 Вы получите письмо с подтверждением</li>
              <li>🔔 За 24 часа придёт напоминание</li>
              <li>💬 Вы можете написать ментору в чат</li>
              <li>📹 Ссылка на звонок появится за 15 минут до начала</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <Link
              href="/sessions"
              className="flex-1 py-3 px-4 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 text-center"
            >
              Мои сессии
            </Link>
            <Link
              href="/mentors"
              className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 text-center"
            >
              К каталогу
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
