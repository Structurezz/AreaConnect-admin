import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const socketRef      = useRef(null);
  const pendingSubsRef = useRef([]);   // [{ event, handler }] queued before socket exists
  const [connected, setConnected] = useState(false);

  // Stable primitives — avoid re-running the effect every fetchMe refresh,
  // which was killing the WebSocket upgrade mid-handshake.
  const userId = user?._id || null;
  const estateId =
    (typeof user?.estateId === 'object' ? user?.estateId?._id : user?.estateId) || null;
  const role = user?.role || null;

  useEffect(() => {
    if (!userId) return;

    const socketUrl =
      import.meta.env.VITE_SOCKET_URL ||
      (import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '') ||
      'http://localhost:5001';
    const socket = io(socketUrl, {
      withCredentials: true,
      transports: ['polling', 'websocket'],
      upgrade: true,
    });

    // Attach any subscriptions that were queued before the socket was created.
    // Fixes a race where children's useEffects (which call subscribe) run
    // before the provider's own useEffect finishes constructing the socket.
    pendingSubsRef.current.forEach(({ event, handler }) => socket.on(event, handler));

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join', { userId, estateId, role });
    });

    socket.on('disconnect', () => setConnected(false));

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [userId, estateId, role]);

  const subscribe = useCallback((event, handler) => {
    const s = socketRef.current;
    if (s) {
      s.on(event, handler);
    } else {
      // Queue — will be attached when the socket is created above.
      pendingSubsRef.current.push({ event, handler });
    }
    return () => {
      socketRef.current?.off(event, handler);
      pendingSubsRef.current = pendingSubsRef.current.filter(x => x.handler !== handler);
    };
  }, []);

  const emit = useCallback((event, data) => socketRef.current?.emit(event, data), []);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected, subscribe, emit }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
