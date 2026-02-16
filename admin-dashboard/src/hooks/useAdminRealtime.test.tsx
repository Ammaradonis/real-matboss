import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useAdminRealtime } from './useAdminRealtime';

const ioMock = vi.fn();
const emitMock = vi.fn();
const onMock = vi.fn();
const offMock = vi.fn();
const closeMock = vi.fn();

vi.mock('socket.io-client', () => ({
  io: (...args: unknown[]) => ioMock(...args),
}));

describe('useAdminRealtime', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('subscribes to provider rooms and binds booking/availability listeners', () => {
    ioMock.mockReturnValue({
      emit: emitMock,
      on: onMock,
      off: offMock,
      close: closeMock,
    });

    const onEvent = vi.fn();
    const { unmount } = renderHook(() => useAdminRealtime(['p-1', 'p-2'], onEvent));

    expect(ioMock).toHaveBeenCalled();
    expect(emitMock).toHaveBeenCalledWith('subscribe.provider', { providerId: 'p-1' });
    expect(emitMock).toHaveBeenCalledWith('subscribe.provider', { providerId: 'p-2' });
    expect(onMock).toHaveBeenCalledWith('booking.created', onEvent);
    expect(onMock).toHaveBeenCalledWith('booking.confirmed', onEvent);
    expect(onMock).toHaveBeenCalledWith('booking.cancelled', onEvent);
    expect(onMock).toHaveBeenCalledWith('availability.changed', onEvent);

    unmount();

    expect(offMock).toHaveBeenCalledWith('booking.created', onEvent);
    expect(offMock).toHaveBeenCalledWith('booking.confirmed', onEvent);
    expect(offMock).toHaveBeenCalledWith('booking.cancelled', onEvent);
    expect(offMock).toHaveBeenCalledWith('availability.changed', onEvent);
    expect(closeMock).toHaveBeenCalled();
  });

  it('does nothing when provider list is empty', () => {
    renderHook(() => useAdminRealtime([], vi.fn()));
    expect(ioMock).not.toHaveBeenCalled();
  });
});
