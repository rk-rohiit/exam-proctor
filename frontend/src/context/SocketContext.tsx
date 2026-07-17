import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { API_BASE } from '../utils/api';

interface SocketContextType {
  socket: Socket | null;
  joinAdminRoom: (examId: string) => void;
  joinStudentRoom: (attemptId: string, studentId: string) => void;
}

const SocketContext = createContext<SocketContextType>({ socket: null, joinAdminRoom: () => {}, joinStudentRoom: () => {} });

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!user) return;
    const socket = io(API_BASE.replace('/api', ''), {
      transports: ['websocket'],
    });
    socketRef.current = socket;
    return () => { socket.disconnect(); };
  }, [user]);

  const joinAdminRoom = (examId: string) => {
    socketRef.current?.emit('admin:join', examId);
  };

  const joinStudentRoom = (attemptId: string, studentId: string) => {
    socketRef.current?.emit('student:join', { attemptId, studentId });
  };

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, joinAdminRoom, joinStudentRoom }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
