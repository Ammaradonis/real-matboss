export type BookingStep = 1 | 2 | 3 | 4 | 5;

export interface SlotDto {
  startUtc: string;
  endUtc: string;
  isAvailable: boolean;
  reason?: string;
}

export interface EventTypeDto {
  id: string;
  name: string;
  durationMinutes: number;
  kind: 'ONE_ON_ONE' | 'GROUP' | 'CLASS';
}

export interface SchoolDetails {
  schoolName: string;
  city: string;
  state: string;
  county: string;
  contactName: string;
  email: string;
  phone: string;
  activeStudents: number;
  instructorCount: number;
  currentSystem: string;
  schedulingChallenges: string;
  budgetRange: string;
  implementationTimeline: string;
}
