import { useEffect } from 'react';
import { io } from 'socket.io-client';

const WS_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');

export function useRealtime(providerId: string, onAvailabilityChange: () => void): void {
  useEffect(() => {
    if (!providerId) {
      return;
    }

    const socket = io(WS_URL, {
      transports: ['websocket'],
    });

    socket.emit('joinProviderRoom', { providerId });
    socket.on('availability.changed', onAvailabilityChange);

    return () => {
      socket.emit('leaveProviderRoom', { providerId });
      socket.off('availability.changed', onAvailabilityChange);
      socket.close();
    };
  }, [providerId, onAvailabilityChange]);
}
