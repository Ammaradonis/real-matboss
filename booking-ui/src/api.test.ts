import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createDiscoveryBooking,
  getBooking,
  getEventTypes,
  getProviderByUrl,
  getProviders,
  getSlots,
} from './api';
import type { SchoolDetails } from './types';

const fetchMock = vi.fn();

describe('booking-ui api client', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches providers, provider-by-url and event types', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: 'provider-1', name: 'MatBoss Ops' }],
    });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ tenantSlug: 'matboss', provider: { id: 'provider-1' } }),
    });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: 'event-1', name: 'Discovery', isActive: true }],
    });

    await getProviders();
    await getProviderByUrl('matboss', 'ops');
    await getEventTypes('provider-1');

    expect(fetchMock.mock.calls[0][0]).toContain('/api/v1/providers');
    expect(fetchMock.mock.calls[1][0]).toContain('/api/v1/providers/by-url/matboss/ops');
    expect(fetchMock.mock.calls[2][0]).toContain('/api/v1/event-types/provider/provider-1');
  });

  it('sends slot request with tenant header and query params', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        slots: [{ startUtc: '2026-03-01T14:00:00.000Z', endUtc: '2026-03-01T14:30:00.000Z' }],
      }),
    });

    await getSlots({
      providerId: 'provider-1',
      fromIso: '2026-03-01T00:00:00.000Z',
      toIso: '2026-03-02T00:00:00.000Z',
      viewerTz: 'America/New_York',
      eventTypeId: 'event-1',
      tenantId: 'tenant-1',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/v1/providers/provider-1/availability?');
    expect(url).toContain('viewerTz=America%2FNew_York');
    expect(url).toContain('eventTypeId=event-1');
    expect(options.headers).toMatchObject({
      'Content-Type': 'application/json',
      'x-tenant-id': 'tenant-1',
    });
  });

  it('maps discovery booking payload and throws response text on error', async () => {
    const details: SchoolDetails = {
      schoolName: 'MatBoss Academy',
      city: 'Phoenix',
      state: 'Arizona',
      county: 'Maricopa County',
      contactName: 'Alex',
      email: 'alex@example.com',
      phone: '602-555-0101',
      preferredContactMethod: 'email',
      activeStudents: 120,
      instructorCount: 6,
      currentSystem: 'Spreadsheet',
      schedulingChallenges: 'No-show tracking',
      budgetRange: '$200-500',
      implementationTimeline: 'This month',
    };

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ booking: { id: 'booking-1' }, discoveryId: 'discovery-1' }),
    });

    await createDiscoveryBooking({
      providerId: 'provider-1',
      eventTypeId: 'event-1',
      slot: {
        startUtc: '2026-03-01T14:00:00.000Z',
        endUtc: '2026-03-01T14:30:00.000Z',
        isAvailable: true,
      },
      details,
      tenantId: 'tenant-abc',
    });

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(options.method).toBe('POST');
    expect(options.headers).toMatchObject({
      'Content-Type': 'application/json',
      'x-tenant-id': 'tenant-abc',
    });

    const body = JSON.parse(String(options.body));
    expect(body).toMatchObject({
      providerId: 'provider-1',
      customerName: 'Alex',
      county: 'Maricopa County',
      budgetRange: '$200-500',
    });

    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({ message: 'slot_taken' }),
    });

    await expect(
      createDiscoveryBooking({
        providerId: 'provider-1',
        eventTypeId: 'event-1',
        slot: {
          startUtc: '2026-03-01T14:00:00.000Z',
          endUtc: '2026-03-01T14:30:00.000Z',
          isAvailable: true,
        },
        details,
      }),
    ).rejects.toThrow('slot_taken');
  });

  it('fetches booking by id', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'booking-1' }),
    });

    await getBooking('booking-1');

    expect(fetchMock.mock.calls[0][0]).toContain('/api/v1/bookings/booking-1');
  });
});
