import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import App from './App';
import type { SlotDto } from './types';

const getProvidersMock = vi.fn();
const getEventTypesMock = vi.fn();
const getSlotsMock = vi.fn();
const createDiscoveryBookingMock = vi.fn();

vi.mock('./api', () => ({
  getProviders: (...args: unknown[]) => getProvidersMock(...args),
  getEventTypes: (...args: unknown[]) => getEventTypesMock(...args),
  getSlots: (...args: unknown[]) => getSlotsMock(...args),
  createDiscoveryBooking: (...args: unknown[]) => createDiscoveryBookingMock(...args),
}));

vi.mock('./hooks/useRealtime', () => ({
  useRealtime: vi.fn(),
}));

vi.mock('./components/SchoolDetailsForm', () => ({
  SchoolDetailsForm: ({
    value,
    onSubmit,
  }: {
    value: Record<string, unknown>;
    onSubmit: (next: Record<string, unknown>) => void;
  }) => (
    <div>
      <button
        type="button"
        onClick={() =>
          onSubmit({
            ...value,
            schoolName: 'Phoenix MMA Academy',
            city: 'Phoenix',
            state: 'Arizona',
            county: 'Maricopa County',
            contactName: 'Alex Rivera',
            email: 'alex@phoenixmma.com',
            phone: '602-555-0101',
            preferredContactMethod: 'email',
            activeStudents: 120,
            instructorCount: 8,
          })
        }
      >
        Mock Form Continue
      </button>
    </div>
  ),
}));

describe('Booking App flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getProvidersMock.mockResolvedValue([
      {
        id: 'provider-1',
        name: 'MatBoss Ops',
        bookingUrl: 'matboss-ops',
        timeZone: 'America/New_York',
        isActive: true,
      },
    ]);
    getEventTypesMock.mockResolvedValue([
      {
        id: 'event-1',
        providerId: 'provider-1',
        name: 'Discovery',
        slug: 'discovery-30',
        durationMinutes: 30,
        maxAttendees: null,
        priceCents: 0,
        requiresApproval: false,
        isActive: true,
        color: '#fff',
        kind: 'ONE_ON_ONE',
      },
    ]);
    const slot: SlotDto = {
      startUtc: '2026-03-10T14:00:00.000Z',
      endUtc: '2026-03-10T14:30:00.000Z',
      isAvailable: true,
    };
    getSlotsMock.mockResolvedValue([slot]);
    createDiscoveryBookingMock.mockResolvedValue({
      booking: { id: 'booking-1' },
      discoveryId: 'discovery-1',
    });
  });

  it('completes booking from date to success', async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(getSlotsMock).toHaveBeenCalled();
    });

    await user.click(screen.getByRole('button', { name: 'Continue' }));

    const slotButton = await screen.findByRole('button', {
      name: /Select .* slot/i,
    });
    await user.click(slotButton);

    const continueButtons = screen.getAllByRole('button', { name: 'Continue' });
    await user.click(continueButtons[0]);

    await user.click(screen.getByRole('button', { name: 'Mock Form Continue' }));

    await user.click(screen.getByRole('button', { name: 'Confirm Booking' }));

    await waitFor(() => {
      expect(createDiscoveryBookingMock).toHaveBeenCalled();
    });

    expect(await screen.findByText('Discovery Call Confirmed')).toBeInTheDocument();
  }, 15000);

  it('supports keyboard flow and shows submission errors', async () => {
    const user = userEvent.setup();
    createDiscoveryBookingMock.mockRejectedValueOnce(new Error('slot_taken'));

    render(<App />);

    expect(
      await screen.findByRole('heading', { name: 'MatBoss Booking Command Center' }),
    ).toBeInTheDocument();

    const continueButton = screen.getByRole('button', { name: 'Continue' });
    continueButton.focus();
    await user.keyboard('{Enter}');

    const slotButton = await screen.findByRole('button', {
      name: /Select .* slot/i,
    });
    slotButton.focus();
    await user.keyboard('{Enter}');

    const slotContinue = screen.getAllByRole('button', { name: 'Continue' })[0];
    slotContinue.focus();
    await user.keyboard('{Enter}');

    await user.click(screen.getByRole('button', { name: 'Mock Form Continue' }));
    await user.click(screen.getByRole('button', { name: 'Confirm Booking' }));

    expect(await screen.findByText('slot_taken')).toBeInTheDocument();
    expect(createDiscoveryBookingMock).toHaveBeenCalledTimes(1);
  }, 15000);
});
