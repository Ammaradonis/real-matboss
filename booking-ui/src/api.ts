import type { SchoolDetails, SlotDto } from './types';

const API_BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');

interface GetSlotsParams {
  providerId: string;
  fromIso: string;
  toIso: string;
  viewerTz: string;
  tenantId?: string;
}

interface CreateBookingInput {
  providerId: string;
  eventTypeId: string;
  slot: SlotDto;
  details: SchoolDetails;
  tenantId?: string;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}/api/v1${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function getSlots(params: GetSlotsParams): Promise<SlotDto[]> {
  const query = new URLSearchParams({
    from: params.fromIso,
    to: params.toIso,
    viewerTz: params.viewerTz,
  });

  const payload = await request<{ slots: SlotDto[] }>(
    `/providers/${params.providerId}/availability/slots?${query.toString()}`,
    {
      headers: {
        'x-tenant-id': params.tenantId ?? '11111111-1111-1111-1111-111111111111',
      },
    },
  );

  return payload.slots;
}

export async function createDiscoveryBooking(input: CreateBookingInput): Promise<{
  booking: { id: string };
  discoveryId: string;
}> {
  return request('/bookings/discovery', {
    method: 'POST',
    headers: {
      'x-tenant-id': input.tenantId ?? '11111111-1111-1111-1111-111111111111',
    },
    body: JSON.stringify({
      providerId: input.providerId,
      eventTypeId: input.eventTypeId,
      startTs: input.slot.startUtc,
      endTs: input.slot.endUtc,
      customerName: input.details.contactName,
      customerEmail: input.details.email,
      customerPhone: input.details.phone,
      schoolName: input.details.schoolName,
      city: input.details.city,
      state: input.details.state,
      county: input.details.county,
      activeStudents: input.details.activeStudents,
      instructorCount: input.details.instructorCount,
      currentSystem: input.details.currentSystem,
      schedulingChallenges: input.details.schedulingChallenges,
      budgetRange: input.details.budgetRange,
      implementationTimeline: input.details.implementationTimeline,
    }),
  });
}
