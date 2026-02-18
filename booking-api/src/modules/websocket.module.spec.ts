import { BookingGateway } from './websocket.module';

describe('BookingGateway', () => {
  it('emits provider-room scoped booking events', () => {
    const emit = jest.fn();
    const to = jest.fn().mockReturnValue({ emit });

    const gateway = new BookingGateway();
    (gateway as unknown as { server: { to: (room: string) => { emit: (...args: unknown[]) => void } } }).server = {
      to,
    };

    gateway.emitBookingCreated('provider-1', { id: 'booking-1' });

    expect(to).toHaveBeenCalledWith('provider:provider-1');
    expect(emit).toHaveBeenCalledWith('booking.created', { id: 'booking-1' });
  });

  it('subscribes socket client to provider room', () => {
    const join = jest.fn();
    const gateway = new BookingGateway();
    const result = gateway.subscribeProvider({ providerId: 'provider-9' }, { join } as never);

    expect(join).toHaveBeenCalledWith('provider:provider-9');
    expect(result).toEqual({ ok: true });
  });

  it('emits all lifecycle event channels', () => {
    const emit = jest.fn();
    const to = jest.fn().mockReturnValue({ emit });
    const gateway = new BookingGateway();
    (gateway as unknown as { server: { to: (room: string) => { emit: (...args: unknown[]) => void } } }).server = {
      to,
    };

    gateway.emitBookingConfirmed('provider-1', { id: 'b1' });
    gateway.emitBookingCancelled('provider-1', { id: 'b1' });
    gateway.emitAvailabilityChanged('provider-1', { changed: true });

    expect(emit).toHaveBeenCalledWith('booking.confirmed', { id: 'b1' });
    expect(emit).toHaveBeenCalledWith('booking.cancelled', { id: 'b1' });
    expect(emit).toHaveBeenCalledWith('availability.changed', { changed: true });
  });
});
