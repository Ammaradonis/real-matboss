import { useEffect } from 'react';
import { io } from 'socket.io-client';

import { getApiBaseUrl } from '../config/runtime';

const WS_URL = getApiBaseUrl();

export function useRealtime(providerId: string, onAvailabilityChange: () => void): void {
  useEffect(() => {
    if (!providerId) {
      return;
    }

    const socket = io(`${WS_URL}/ws`, {
      transports: ['websocket'],
    });

    socket.emit('subscribe.provider', { providerId });
    socket.on('availability.changed', onAvailabilityChange);

    return () => {
      socket.off('availability.changed', onAvailabilityChange);
      socket.close();
    };
  }, [providerId, onAvailabilityChange]);
}
