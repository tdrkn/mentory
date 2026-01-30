import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      {/* Header */}
      <header className="p-6 flex justify-between items-center max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-indigo-600">🎓 Mentory</h1>
        <div className="space-x-4">
          <Link 
            href="/login" 
            className="text-gray-600 hover:text-gray-900 font-medium"
          >
            Войти
          </Link>
          <Link 
            href="/register" 
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 font-medium"
          >
            Начать
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-4xl mx-auto text-center py-20 px-4">
        <h2 className="text-5xl font-bold text-gray-900 mb-6">
          Найди своего ментора
        </h2>
        <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
          Mentory — платформа, которая соединяет опытных экспертов с теми, 
          кто хочет расти. Бронируй консультации и развивайся вместе с профессионалами.
        </p>
        <div className="space-x-4">
          <Link 
            href="/mentors" 
            className="inline-block bg-indigo-600 text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-indigo-700 transition"
          >
            Найти ментора
          </Link>
          <Link 
            href="/register?role=mentor" 
            className="inline-block border-2 border-indigo-600 text-indigo-600 px-8 py-3 rounded-lg text-lg font-medium hover:bg-indigo-50 transition"
          >
            Стать ментором
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto py-16 px-4">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center p-6">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold mb-2">Найди эксперта</h3>
            <p className="text-gray-600">Поиск по темам, навыкам и рейтингу</p>
          </div>
          <div className="text-center p-6">
            <div className="text-4xl mb-4">📅</div>
            <h3 className="text-xl font-semibold mb-2">Бронируй время</h3>
            <p className="text-gray-600">Удобный календарь и быстрое бронирование</p>
          </div>
          <div className="text-center p-6">
            <div className="text-4xl mb-4">💬</div>
            <h3 className="text-xl font-semibold mb-2">Общайся и расти</h3>
            <p className="text-gray-600">Чат, видеозвонки и заметки к сессиям</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center py-8 text-gray-500 text-sm">
        © 2026 Mentory. Все права защищены.
      </footer>
    </main>
  );
}
