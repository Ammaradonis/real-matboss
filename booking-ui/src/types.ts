export type BookingStep = 1 | 2 | 3 | 4 | 5;

export interface SlotDto {
  startUtc: string;
  endUtc: string;
  startViewer?: string;
  endViewer?: string;
  isAvailable?: boolean;
  reason?: string;
}

export interface EventTypeDto {
  id: string;
  providerId: string;
  name: string;
  slug: string;
  durationMinutes: number;
  maxAttendees: number | null;
  priceCents: number;
  requiresApproval: boolean;
  isActive: boolean;
  color: string;
  kind: 'ONE_ON_ONE' | 'GROUP' | 'CLASS';
}

export interface ProviderDto {
  id: string;
  name: string;
  bio: string;
  specialties: string;
  bookingUrl: string;
  timeZone: string;
  isActive: boolean;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  minimumNoticeHours: number;
  maximumAdvanceDays: number;
}

export interface BookingDto {
  id: string;
  providerId: string;
  eventTypeId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  startTs: string;
  endTs: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'NO_SHOW';
  version: number;
  createdAt: string;
}

export interface DiscoveryBookingResponse {
  booking: BookingDto;
  discoveryId: string;
}

export type PreferredContactMethod = 'email' | 'phone' | 'text';

export interface SchoolDetails {
  schoolName: string;
  city: string;
  state: string;
  county: string;
  contactName: string;
  email: string;
  phone: string;
  preferredContactMethod: PreferredContactMethod;
  activeStudents: number;
  instructorCount: number;
  currentSystem: string;
  schedulingChallenges: string;
  budgetRange: string;
  implementationTimeline: string;
}
