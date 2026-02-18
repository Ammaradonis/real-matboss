import type {
  BookingDto,
  DiscoveryBookingResponse,
  EventTypeDto,
  ProviderDto,
  SchoolDetails,
  SlotDto,
} from './types';

const API_BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const API_ROOT = `${API_BASE}/api/v1`;
const DEFAULT_TENANT_ID =
  import.meta.env.VITE_TENANT_ID ?? '11111111-1111-1111-1111-111111111111';

interface RequestOptions {
  method?: string;
  body?: unknown;
  tenantId?: string;
}

interface GetSlotsParams {
  providerId: string;
  fromIso: string;
  toIso: string;
  viewerTz: string;
  eventTypeId?: string;
  tenantId?: string;
}

interface CreateBookingInput {
  providerId: string;
  eventTypeId: string;
  slot: SlotDto;
  details: SchoolDetails;
  tenantId?: string;
}

type ApiErrorPayload = {
  message?: string | string[];
  error?: string;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${API_ROOT}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-id': options.tenantId ?? DEFAULT_TENANT_ID,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    let message = '';
    try {
      const maybeJson = (await response.json()) as ApiErrorPayload;
      if (Array.isArray(maybeJson.message)) {
        message = maybeJson.message.join(', ');
      } else if (typeof maybeJson.message === 'string') {
        message = maybeJson.message;
      } else if (maybeJson.error) {
        message = maybeJson.error;
      }
    } catch {
      message = await response.text();
    }

    throw new Error(message || `Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

export function getProviders(tenantId?: string): Promise<ProviderDto[]> {
  return request('/providers', { tenantId });
}

export function getProviderByUrl(
  tenantSlug: string,
  bookingUrl: string,
): Promise<{ tenantSlug: string; provider: ProviderDto | null }> {
  return request(`/providers/by-url/${tenantSlug}/${bookingUrl}`);
}

export function getEventTypes(providerId: string, tenantId?: string): Promise<EventTypeDto[]> {
  return request(`/event-types/provider/${providerId}`, { tenantId });
}

export async function getSlots(params: GetSlotsParams): Promise<SlotDto[]> {
  const query = new URLSearchParams({
    from: params.fromIso,
    to: params.toIso,
    viewerTz: params.viewerTz,
  });

  if (params.eventTypeId) {
    query.set('eventTypeId', params.eventTypeId);
  }

  const payload = await request<{ slots: SlotDto[] }>(
    `/providers/${params.providerId}/availability?${query.toString()}`,
    {
      tenantId: params.tenantId,
    },
  );

  return payload.slots.map((slot) => ({ ...slot, isAvailable: true }));
}

export function createDiscoveryBooking(input: CreateBookingInput): Promise<DiscoveryBookingResponse> {
  return request('/bookings/discovery', {
    method: 'POST',
    tenantId: input.tenantId,
    body: {
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
    },
  });
}

export function getBooking(id: string, tenantId?: string): Promise<BookingDto> {
  return request(`/bookings/${id}`, { tenantId });
}
