import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useRealtime } from './useRealtime';

const ioMock = vi.fn();
const emitMock = vi.fn();
const onMock = vi.fn();
const offMock = vi.fn();
const closeMock = vi.fn();

vi.mock('socket.io-client', () => ({
  io: (...args: unknown[]) => ioMock(...args),
}));

describe('useRealtime', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('subscribes and cleans up socket listeners for provider room', () => {
    ioMock.mockReturnValue({
      emit: emitMock,
      on: onMock,
      off: offMock,
      close: closeMock,
    });

    const onAvailabilityChange = vi.fn();
    const { unmount } = renderHook(() => useRealtime('provider-1', onAvailabilityChange));

    expect(ioMock).toHaveBeenCalled();
    expect(emitMock).toHaveBeenCalledWith('joinProviderRoom', { providerId: 'provider-1' });
    expect(onMock).toHaveBeenCalledWith('availability.changed', onAvailabilityChange);

    unmount();

    expect(emitMock).toHaveBeenCalledWith('leaveProviderRoom', { providerId: 'provider-1' });
    expect(offMock).toHaveBeenCalledWith('availability.changed', onAvailabilityChange);
    expect(closeMock).toHaveBeenCalled();
  });

  it('does not connect when providerId is empty', () => {
    renderHook(() => useRealtime('', vi.fn()));
    expect(ioMock).not.toHaveBeenCalled();
  });
});
