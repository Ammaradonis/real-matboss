import { useEffect } from 'react';
import { io } from 'socket.io-client';

const WS_BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');

export function useAdminRealtime(providerIds: string[], onEvent: () => void): void {
  useEffect(() => {
    if (!providerIds.length) {
      return;
    }

    const socket = io(`${WS_BASE}/ws`, {
      transports: ['websocket'],
    });

    for (const providerId of providerIds) {
      socket.emit('subscribe.provider', { providerId });
    }

    socket.on('booking.created', onEvent);
    socket.on('booking.confirmed', onEvent);
    socket.on('booking.cancelled', onEvent);
    socket.on('availability.changed', onEvent);

    return () => {
      socket.off('booking.created', onEvent);
      socket.off('booking.confirmed', onEvent);
      socket.off('booking.cancelled', onEvent);
      socket.off('availability.changed', onEvent);
      socket.close();
    };
  }, [providerIds, onEvent]);
}
