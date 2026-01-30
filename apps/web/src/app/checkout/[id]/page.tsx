'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

// Fake data for checkout
const fakeSession = {
  id: '123',
  mentor: {
    name: 'Иван Ментор',
    avatar: null,
  },
  service: {
    title: 'Career Consultation',
    duration: 60,
    price: 50,
    currency: 'USD',
  },
  slot: {
    date: '31 января 2026',
    time: '10:00',
  },
};

export default function CheckoutPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'wallet'>('card');
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  const handlePayment = async () => {
    if (!agreed) return;
    
    setIsProcessing(true);
    // Fake payment processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    router.push(`/checkout/${id}/success`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link href="/mentors" className="text-indigo-600 hover:text-indigo-700">
            ← Назад
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Оформление записи</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Order Summary */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Детали сессии</h2>
            
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-xl text-indigo-600 font-bold">
                {fakeSession.mentor.name.charAt(0)}
              </div>
              <div>
                <p className="font-medium text-gray-900">{fakeSession.mentor.name}</p>
                <p className="text-sm text-gray-600">{fakeSession.service.title}</p>
              </div>
            </div>

            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Дата:</span>
                <span className="text-gray-900">{fakeSession.slot.date}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Время:</span>
                <span className="text-gray-900">{fakeSession.slot.time}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Длительность:</span>
                <span className="text-gray-900">{fakeSession.service.duration} минут</span>
              </div>
            </div>

            <div className="border-t mt-4 pt-4">
              <div className="flex justify-between">
                <span className="font-semibold text-gray-900">Итого:</span>
                <span className="text-2xl font-bold text-indigo-600">
                  ${fakeSession.service.price}
                </span>
              </div>
            </div>

            {/* Hold timer */}
            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                ⏱ Слот удержан на 10 минут. Завершите оплату, чтобы подтвердить запись.
              </p>
            </div>
          </div>

          {/* Payment Form */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Способ оплаты</h2>

            <div className="space-y-3 mb-6">
              <label className={`flex items-center p-4 border rounded-lg cursor-pointer ${
                paymentMethod === 'card' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200'
              }`}>
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'card'}
                  onChange={() => setPaymentMethod('card')}
                  className="mr-3"
                />
                <span className="mr-2">💳</span>
                <span>Банковская карта</span>
              </label>

              <label className={`flex items-center p-4 border rounded-lg cursor-pointer ${
                paymentMethod === 'wallet' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200'
              }`}>
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'wallet'}
                  onChange={() => setPaymentMethod('wallet')}
                  className="mr-3"
                />
                <span className="mr-2">👛</span>
                <span>Электронный кошелёк</span>
              </label>
            </div>

            {paymentMethod === 'card' && (
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Номер карты
                  </label>
                  <input
                    type="text"
                    placeholder="4242 4242 4242 4242"
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Срок
                    </label>
                    <input
                      type="text"
                      placeholder="MM/YY"
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      CVC
                    </label>
                    <input
                      type="text"
                      placeholder="123"
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                </div>
              </div>
            )}

            <label className="flex items-start gap-2 mb-6">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1"
              />
              <span className="text-sm text-gray-600">
                Я согласен с <a href="#" className="text-indigo-600">условиями использования</a> и{' '}
                <a href="#" className="text-indigo-600">политикой отмены</a>
              </span>
            </label>

            <button
              onClick={handlePayment}
              disabled={!agreed || isProcessing}
              className="w-full py-3 px-4 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'Обработка...' : `Оплатить $${fakeSession.service.price}`}
            </button>

            <p className="mt-3 text-xs text-gray-500 text-center">
              🔒 Платёж защищён SSL-шифрованием
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
