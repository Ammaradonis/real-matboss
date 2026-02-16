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
});
