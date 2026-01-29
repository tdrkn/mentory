export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">🎓 Mentory</h1>
        <p className="text-lg text-gray-600">
          Платформа для поиска менторов и проведения консультаций
        </p>
        <p className="mt-8 text-sm text-gray-400">
          API: {process.env.NEXT_PUBLIC_API_URL || 'not configured'}
        </p>
      </div>
    </main>
  );
}
