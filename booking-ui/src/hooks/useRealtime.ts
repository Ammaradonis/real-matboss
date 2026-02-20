import { useEffect } from 'react';
import { io } from 'socket.io-client';

type RuntimeConfig = {
  VITE_API_URL?: string;
};

function firstNonEmpty(...values: Array<string | undefined>): string | undefined {
  for (const value of values) {
    if (value && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
}

function getRuntimeConfig(): RuntimeConfig {
  if (typeof window === 'undefined') {
    return {};
  }

  return (window as Window & { __RUNTIME_CONFIG__?: RuntimeConfig }).__RUNTIME_CONFIG__ ?? {};
}

const runtimeConfig = getRuntimeConfig();
const WS_URL = firstNonEmpty(
  runtimeConfig.VITE_API_URL,
  import.meta.env.VITE_API_URL,
  'http://localhost:3000',
)!.replace(/\/$/, '');

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
