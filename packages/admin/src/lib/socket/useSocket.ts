import { useEffect, useState, useCallback, useRef } from 'react';
import { connectSocket, disconnectSocket, getSocket } from './socket';

/**
 * React hook for Socket.IO connection
 *
 * @param event - Event name to listen to (e.g., 'metrics', 'alert', 'health')
 * @param handler - Callback function to handle received data
 * @param options - Configuration options
 * @returns Object with connection status and control functions
 *
 * @example
 * const { isConnected } = useSocket('metrics', (data) => {
 *   console.log('Received metrics:', data);
 *   setMetrics(data);
 * });
 */
export function useSocket(
  event: string,
  handler: (data: any) => void,
  options?: {
    autoConnect?: boolean;
    reconnectOnMount?: boolean;
  },
) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const handlerRef = useRef(handler);

  // Update handler ref when it changes
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    const autoConnect = options?.autoConnect !== false;

    if (!autoConnect) {
      return;
    }

    const socket = connectSocket();

    // Connection status handlers
    const handleConnect = () => {
      setIsConnected(true);
      setConnectionError(null);
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    const handleConnectError = (error: Error) => {
      setConnectionError(error.message);
      setIsConnected(false);
    };

    // Event handler wrapper
    const eventHandler = (data: any) => {
      handlerRef.current(data);
    };

    // Register event listeners
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on(event, eventHandler);

    // Set initial connection status
    setIsConnected(socket.connected);

    // Cleanup on unmount
    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.off(event, eventHandler);

      // Optionally disconnect on unmount
      // Uncomment if you want to disconnect when component unmounts
      // disconnectSocket();
    };
  }, [event, options?.autoConnect]);

  const reconnect = useCallback(() => {
    const socket = getSocket();
    if (!socket.connected) {
      socket.connect();
    }
  }, []);

  const disconnect = useCallback(() => {
    disconnectSocket();
    setIsConnected(false);
  }, []);

  return {
    isConnected,
    connectionError,
    reconnect,
    disconnect,
  };
}

/**
 * Hook to listen to multiple socket events
 */
export function useSocketEvents(
  events: Array<{
    event: string;
    handler: (data: any) => void;
  }>,
  options?: {
    autoConnect?: boolean;
  },
) {
  const [isConnected, setIsConnected] = useState(false);
  const handlersRef = useRef(events);

  useEffect(() => {
    handlersRef.current = events;
  }, [events]);

  useEffect(() => {
    const autoConnect = options?.autoConnect !== false;

    if (!autoConnect) {
      return;
    }

    const socket = connectSocket();

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    // Register all event handlers
    const eventHandlers = handlersRef.current.map(({ event, handler }) => {
      const wrappedHandler = (data: any) => handler(data);
      socket.on(event, wrappedHandler);
      return { event, wrappedHandler };
    });

    setIsConnected(socket.connected);

    // Cleanup
    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      eventHandlers.forEach(({ event, wrappedHandler }) => {
        socket.off(event, wrappedHandler);
      });
    };
  }, [options?.autoConnect]);

  return { isConnected };
}
