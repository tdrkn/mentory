'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function VideoRoomPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { isLoading, isAuthenticated, isMentor, logout } = useAuth();
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [showChat, setShowChat] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<{sender: string; text: string; time: string}[]>([
    { sender: 'Система', text: 'Звонок начался', time: '10:00' },
  ]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  // Fake call duration timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSendMessage = () => {
    if (!chatMessage.trim()) return;
    setChatMessages(prev => [...prev, {
      sender: 'Вы',
      text: chatMessage,
      time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
    }]);
    setChatMessage('');
  };

  const handleEndCall = () => {
    router.push(`/sessions/${id}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      {/* Top Bar */}
      <div className="bg-gray-800 px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <span className="text-white font-medium">Career Consultation</span>
          <span className="text-gray-400">с {isMentor ? 'Анна Менти' : 'Иван Ментор'}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-red-500 flex items-center gap-2">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            {formatDuration(callDuration)}
          </span>
          <button
            onClick={() => setShowChat(!showChat)}
            className="p-2 text-gray-400 hover:text-white"
          >
            💬
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Video Area */}
        <div className={`flex-1 relative ${showChat ? 'mr-80' : ''}`}>
          {/* Main Video (Remote) */}
          <div className="absolute inset-4 bg-gray-800 rounded-2xl flex items-center justify-center">
            <div className="text-center">
              <div className="w-32 h-32 bg-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-6xl text-white font-bold">
                  {isMentor ? 'А' : 'И'}
                </span>
              </div>
              <p className="text-white text-xl">{isMentor ? 'Анна Менти' : 'Иван Ментор'}</p>
              {isVideoOff && <p className="text-gray-400 mt-2">Камера выключена</p>}
            </div>
          </div>

          {/* Self Video (Picture-in-Picture) */}
          <div className="absolute bottom-8 right-8 w-48 h-36 bg-gray-700 rounded-xl overflow-hidden">
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-4xl text-white font-bold">Вы</span>
            </div>
            {isVideoOff && (
              <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                <span className="text-gray-400">Камера выключена</span>
              </div>
            )}
          </div>

          {/* Screen Share Indicator */}
          {isScreenSharing && (
            <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded-full">
              Вы демонстрируете экран
            </div>
          )}
        </div>

        {/* Chat Sidebar */}
        {showChat && (
          <div className="w-80 bg-gray-800 flex flex-col border-l border-gray-700">
            <div className="p-4 border-b border-gray-700">
              <h3 className="text-white font-medium">Чат</h3>
            </div>
            <div className="flex-1 p-4 space-y-3 overflow-y-auto">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`${msg.sender === 'Вы' ? 'text-right' : ''}`}>
                  <div className={`inline-block p-3 rounded-lg max-w-[80%] ${
                    msg.sender === 'Вы' 
                      ? 'bg-indigo-600 text-white' 
                      : msg.sender === 'Система'
                        ? 'bg-gray-700 text-gray-400'
                        : 'bg-gray-700 text-white'
                  }`}>
                    <p className="text-sm">{msg.text}</p>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{msg.time}</p>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-gray-700">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Сообщение..."
                  className="flex-1 bg-gray-700 text-white px-3 py-2 rounded-lg"
                />
                <button
                  onClick={handleSendMessage}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-gray-800 px-4 py-4 flex justify-center gap-4">
        <button
          onClick={() => setIsMuted(!isMuted)}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
            isMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700 hover:bg-gray-600'
          }`}
        >
          <span className="text-2xl">{isMuted ? '🔇' : '🎤'}</span>
        </button>

        <button
          onClick={() => setIsVideoOff(!isVideoOff)}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
            isVideoOff ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700 hover:bg-gray-600'
          }`}
        >
          <span className="text-2xl">{isVideoOff ? '📷' : '📹'}</span>
        </button>

        <button
          onClick={() => setIsScreenSharing(!isScreenSharing)}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
            isScreenSharing ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-700 hover:bg-gray-600'
          }`}
        >
          <span className="text-2xl">🖥️</span>
        </button>

        <button
          onClick={handleEndCall}
          className="w-14 h-14 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center"
        >
          <span className="text-2xl">📞</span>
        </button>
      </div>
    </div>
  );
}
