import type { EventTypeDto, ProviderDto } from '../../types';

export const DEFAULT_EVENT_TYPE: EventTypeDto = {
  id: '55555555-5555-5555-5555-555555555551',
  providerId: '44444444-4444-4444-4444-444444444444',
  name: 'MatBoss Discovery Call',
  slug: 'discovery-30',
  durationMinutes: 30,
  maxAttendees: null,
  priceCents: 0,
  requiresApproval: false,
  isActive: true,
  color: '#62d0ff',
  kind: 'ONE_ON_ONE',
};

export const DEFAULT_PROVIDER: ProviderDto = {
  id: '44444444-4444-4444-4444-444444444444',
  name: 'MatBoss Pacific Operations',
  bio: '',
  specialties: '',
  bookingUrl: 'matboss-discovery',
  timeZone: 'America/Los_Angeles',
  isActive: true,
  bufferBeforeMinutes: 10,
  bufferAfterMinutes: 10,
  minimumNoticeHours: 12,
  maximumAdvanceDays: 60,
};
