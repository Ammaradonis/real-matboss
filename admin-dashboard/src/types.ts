export type LeadStatus =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'proposal'
  | 'closed_won'
  | 'closed_lost';

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'NO_SHOW';

export interface Provider {
  id: string;
  name: string;
  timeZone: string;
  bookingUrl: string;
  isActive: boolean;
}

export interface BookingSummary {
  id: string;
  providerId: string;
  eventTypeId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  startTs: string;
  endTs: string;
  status: BookingStatus;
  version: number;
  createdAt: string;
}

export interface DiscoveryLead {
  id: string;
  bookingId: string;
  booking?: BookingSummary;
  schoolName: string;
  city: string;
  state: string;
  county: string;
  activeStudents: number;
  instructorCount: number;
  currentSystem: string | null;
  schedulingChallenges: string | null;
  budgetRange: string | null;
  implementationTimeline: string | null;
  leadStatus: LeadStatus;
  followUpAt: string | null;
  adminNotes: string | null;
  qualificationScore: number;
  createdAt: string;
  updatedAt: string;
}

export interface AnalyticsResponse {
  totalBookings: number;
  confirmed: number;
  pending: number;
  conversionRate: number;
  todayCalls: number;
  leadFunnel: Array<{ status: string; count: string }>;
  topStates: Array<{ state: string; count: string }>;
}

export interface AdminSetting {
  id: string;
  key: string;
  value: Record<string, unknown>;
  updatedAt: string;
}

export interface EmailTemplate {
  id: string;
  key: string;
  name: string;
  category: string;
  subject: string;
  htmlBody: string;
  textBody: string | null;
  variables: string[];
  version: number;
  isActive: boolean;
  createdAt: string;
}

export type EmailQueueStatus = 'PENDING' | 'SENT' | 'FAILED';

export interface EmailQueueItem {
  id: string;
  bookingId: string | null;
  templateId: string | null;
  to: string;
  subject: string;
  htmlBody: string;
  textBody: string | null;
  status: EmailQueueStatus;
  attempts: number;
  maxAttempts: number;
  scheduledAt: string;
  sentAt: string | null;
  lastError: string | null;
  createdAt: string;
}

export interface BlackoutDate {
  id: string;
  providerId: string;
  date: string;
  reason: string | null;
  createdAt: string;
}
