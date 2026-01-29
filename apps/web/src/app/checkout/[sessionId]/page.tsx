'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, Session, ApiError } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';

interface Payment {
  id: string;
  sessionId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'refunded';
  stripePaymentIntentId?: string;
}

export default function CheckoutPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(600); // 10 minutes

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // Load session details
  useEffect(() => {
    const loadSession = async () => {
      try {
        const data = await api.get<Session>(`/sessions/${sessionId}`);
        setSession(data);
        
        // Calculate time left based on session creation
        // Assuming slot was held 10 minutes ago max
        const createdAt = new Date(data.startAt).getTime() - 600000; // Approximation
        const elapsed = (Date.now() - createdAt) / 1000;
        setTimeLeft(Math.max(0, 600 - elapsed));
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          setError('Сессия не найдена или истекла');
        } else {
          setError('Ошибка загрузки данных');
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadSession();
  }, [sessionId]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setError('Время на оплату истекло. Слот освобожден.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePayment = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      // Create payment
      const payment = await api.post<Payment>('/payments/create', {
        sessionId,
      });

      // In real app, redirect to Stripe Checkout
      // For MVP, simulate successful payment
      await api.post('/booking/confirm', { sessionId });

      // Redirect to sessions
      router.push('/sessions?success=1');
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 410) {
          setError('Время на оплату истекло. Слот освобожден.');
        } else {
          setError('Ошибка оплаты. Попробуйте еще раз.');
        }
      }
    } finally {
      setIsProcessing(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error && !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">{error}</h1>
          <Link href="/mentors" className="text-indigo-600 hover:underline">
            Вернуться к каталогу
          </Link>
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <Link href={`/mentors/${session.mentorId}`} className="text-indigo-600 hover:text-indigo-700">
            ← Назад
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          {/* Timer */}
          <div className={`text-center mb-6 p-4 rounded-lg ${timeLeft < 60 ? 'bg-red-50' : 'bg-yellow-50'}`}>
            <p className="text-sm text-gray-600 mb-1">Время на оплату</p>
            <p className={`text-3xl font-mono font-bold ${timeLeft < 60 ? 'text-red-600' : 'text-yellow-600'}`}>
              {formatTime(timeLeft)}
            </p>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-6">Оформление сессии</h1>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          {/* Session Details */}
          <div className="border border-gray-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-xl">
                {session.mentor.fullName.charAt(0)}
              </div>
              <div>
                <p className="font-semibold text-gray-900">{session.mentor.fullName}</p>
                <p className="text-sm text-gray-600">Ментор</p>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Дата:</span>
                <span className="font-medium">
                  {new Date(session.startAt).toLocaleDateString('ru-RU', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long'
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Время:</span>
                <span className="font-medium">
                  {new Date(session.startAt).toLocaleTimeString('ru-RU', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                  {' - '}
                  {new Date(session.endAt).toLocaleTimeString('ru-RU', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Длительность:</span>
                <span className="font-medium">1 час</span>
              </div>
            </div>
          </div>

          {/* Price */}
          <div className="border-t border-gray-200 pt-4 mb-6">
            <div className="flex justify-between text-lg">
              <span className="font-medium">Итого:</span>
              <span className="font-bold text-indigo-600">$50.00</span>
            </div>
          </div>

          {/* Payment Button */}
          <button
            onClick={handlePayment}
            disabled={isProcessing || timeLeft <= 0}
            className="w-full py-3 px-4 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Обработка...' : 'Оплатить $50.00'}
          </button>

          <p className="mt-4 text-xs text-gray-500 text-center">
            Нажимая "Оплатить", вы соглашаетесь с условиями сервиса
          </p>

          {/* Dev note */}
          <div className="mt-6 p-4 bg-gray-100 rounded text-sm text-gray-600">
            <p className="font-medium">🔧 Dev Mode:</p>
            <p>Оплата симулируется. В продакшене будет Stripe Checkout.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
