import { io, type Socket } from 'socket.io-client';
import { browser } from '$app/environment';
import { PUBLIC_API_URL } from '$env/static/public';

const API_URL = PUBLIC_API_URL || 'http://localhost:4000';

let socket: Socket | null = null;

export function getSocket() {
  if (!browser) return null;
  if (!socket) {
    socket = io(`${API_URL}/chat`, {
      autoConnect: false,
      withCredentials: true,
    });
  }
  return socket;
}

export function connectSocket(token: string | null) {
  const s = getSocket();
  if (!s) return null;
  s.auth = token ? { token } : {};
  if (!s.connected) {
    s.connect();
  }
  return s;
}

export function disconnectSocket() {
  if (socket && socket.connected) {
    socket.disconnect();
  }
}
