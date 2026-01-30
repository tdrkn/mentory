'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

// Fake earnings data
const fakeEarnings = {
  available: 450,
  pending: 150,
  totalEarned: 1250,
  totalWithdrawn: 650,
};

const fakeTransactions = [
  { id: '1', type: 'earning', amount: 50, description: 'Сессия с Анна М.', date: '2026-01-28', status: 'completed' },
  { id: '2', type: 'earning', amount: 75, description: 'Сессия с Петр И.', date: '2026-01-27', status: 'completed' },
  { id: '3', type: 'earning', amount: 50, description: 'Сессия с Мария С.', date: '2026-01-25', status: 'pending' },
  { id: '4', type: 'withdrawal', amount: -200, description: 'Вывод на карту *4242', date: '2026-01-20', status: 'completed' },
  { id: '5', type: 'earning', amount: 50, description: 'Сессия с Алексей К.', date: '2026-01-18', status: 'completed' },
];

export default function EarningsPage() {
  const { user, isLoading, isAuthenticated, isMentor, logout } = useAuth();
  const router = useRouter();
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState<'card' | 'bank'>('card');
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
    if (!isLoading && isAuthenticated && !isMentor) {
      router.push('/mentors');
    }
  }, [isLoading, isAuthenticated, isMentor, router]);

  const handleWithdraw = async () => {
    setIsWithdrawing(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsWithdrawing(false);
    setShowWithdrawModal(false);
    setWithdrawAmount('');
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
            <Link href="/schedule" className="text-gray-600 hover:text-gray-900">Расписание</Link>
            <Link href="/sessions" className="text-gray-600 hover:text-gray-900">Сессии</Link>
            <Link href="/earnings" className="text-indigo-600 font-medium">Заработок</Link>
            <button onClick={logout} className="text-red-600 hover:text-red-700">Выйти</button>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Заработок и выплаты</h1>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600">Доступно к выводу</p>
            <p className="text-3xl font-bold text-green-600">${fakeEarnings.available}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600">Ожидает зачисления</p>
            <p className="text-3xl font-bold text-yellow-600">${fakeEarnings.pending}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600">Всего заработано</p>
            <p className="text-3xl font-bold text-gray-900">${fakeEarnings.totalEarned}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600">Выведено</p>
            <p className="text-3xl font-bold text-gray-900">${fakeEarnings.totalWithdrawn}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Transactions */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b">
                <h2 className="font-semibold text-gray-900">История операций</h2>
              </div>
              <div className="divide-y">
                {fakeTransactions.map(tx => (
                  <div key={tx.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        tx.type === 'earning' ? 'bg-green-100' : 'bg-gray-100'
                      }`}>
                        <span>{tx.type === 'earning' ? '💰' : '💳'}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{tx.description}</p>
                        <p className="text-sm text-gray-500">{tx.date}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${tx.amount > 0 ? 'text-green-600' : 'text-gray-900'}`}>
                        {tx.amount > 0 ? '+' : ''}${Math.abs(tx.amount)}
                      </p>
                      <p className={`text-xs ${
                        tx.status === 'completed' ? 'text-green-600' : 'text-yellow-600'
                      }`}>
                        {tx.status === 'completed' ? 'Завершено' : 'В обработке'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Withdraw Card */}
          <div>
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Вывод средств</h2>
              
              <div className="bg-green-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-600">Доступно:</p>
                <p className="text-2xl font-bold text-green-600">${fakeEarnings.available}</p>
              </div>

              <button
                onClick={() => setShowWithdrawModal(true)}
                disabled={fakeEarnings.available === 0}
                className="w-full py-3 px-4 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                Вывести средства
              </button>

              <div className="mt-6 space-y-3 text-sm text-gray-600">
                <p>💳 Карта: **** 4242</p>
                <p>🏦 Банковский счёт: не добавлен</p>
                <Link href="/settings/payments" className="text-indigo-600 hover:underline block">
                  Настроить способы выплаты →
                </Link>
              </div>
            </div>

            {/* Info */}
            <div className="bg-blue-50 rounded-lg p-4 mt-4">
              <h3 className="font-medium text-blue-900 mb-2">Как это работает:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Средства поступают после завершения сессии</li>
                <li>• Период ожидания: 7 дней</li>
                <li>• Минимальный вывод: $20</li>
                <li>• Комиссия платформы: 15%</li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Вывод средств</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Сумма (макс. ${fakeEarnings.available})
                </label>
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  max={fakeEarnings.available}
                  min={20}
                  placeholder="0"
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Способ вывода
                </label>
                <div className="space-y-2">
                  <label className={`flex items-center p-3 border rounded-lg cursor-pointer ${
                    withdrawMethod === 'card' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200'
                  }`}>
                    <input
                      type="radio"
                      checked={withdrawMethod === 'card'}
                      onChange={() => setWithdrawMethod('card')}
                      className="mr-3"
                    />
                    💳 Карта **** 4242
                  </label>
                  <label className={`flex items-center p-3 border rounded-lg cursor-pointer ${
                    withdrawMethod === 'bank' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200'
                  }`}>
                    <input
                      type="radio"
                      checked={withdrawMethod === 'bank'}
                      onChange={() => setWithdrawMethod('bank')}
                      className="mr-3"
                    />
                    🏦 Банковский перевод
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="flex-1 py-2 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Отмена
              </button>
              <button
                onClick={handleWithdraw}
                disabled={!withdrawAmount || Number(withdrawAmount) < 20 || isWithdrawing}
                className="flex-1 py-2 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {isWithdrawing ? 'Обработка...' : 'Вывести'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
