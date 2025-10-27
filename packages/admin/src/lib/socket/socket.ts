import { io, Socket } from 'socket.io-client';

const SOCKET_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') ||
  'http://localhost:3000';

let socket: Socket | null = null;

/**
 * Get or create Socket.IO instance
 */
export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(`${SOCKET_URL}/metrics`, {
      autoConnect: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      transports: ['websocket', 'polling'], // Fallback to polling if websocket fails
    });

    // Setup global event handlers
    socket.on('connect', () => {
      console.log('[Socket.IO] Connected to metrics stream');
    });

    socket.on('disconnect', (reason) => {
      console.log(`[Socket.IO] Disconnected: ${reason}`);
    });

    socket.on('connect_error', (error) => {
      console.error('[Socket.IO] Connection error:', error.message);
    });

    socket.on('connected', (data) => {
      console.log('[Socket.IO] Welcome message:', data);
    });
  }

  return socket;
};

/**
 * Connect to Socket.IO server
 */
export const connectSocket = (): Socket => {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
  return s;
};

/**
 * Disconnect from Socket.IO server
 */
export const disconnectSocket = (): void => {
  if (socket?.connected) {
    socket.disconnect();
    console.log('[Socket.IO] Manually disconnected');
  }
};

/**
 * Check if socket is connected
 */
export const isSocketConnected = (): boolean => {
  return socket?.connected || false;
};
