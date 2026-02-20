import { addDays, startOfDay } from 'date-fns';
import { format, parseISO } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

import type { SlotDto } from '../../types';

export type SlotGroupKey = 'Morning' | 'Afternoon' | 'Evening';

export type SlotRange = {
  fromIso: string;
  toIso: string;
};

export function getSlotRangeForDate(date: Date): SlotRange {
  const from = startOfDay(date);
  const to = addDays(from, 1);

  return {
    fromIso: from.toISOString(),
    toIso: to.toISOString(),
  };
}

export function filterAvailableSlots(slots: SlotDto[]): SlotDto[] {
  return slots.filter((slot) => slot.isAvailable ?? true);
}

export function dedupeAndSortSlots(slots: SlotDto[]): SlotDto[] {
  return Array.from(new Map(slots.map((slot) => [slot.startUtc, slot])).values()).sort((left, right) =>
    left.startUtc.localeCompare(right.startUtc),
  );
}

export function reconcileSelectedSlot(current: SlotDto | null, nextSlots: SlotDto[]): SlotDto | null {
  if (!current) {
    return null;
  }

  return nextSlots.find((slot) => slot.startUtc === current.startUtc) ?? null;
}

export function groupSlotsByDayPart(
  slots: SlotDto[],
  timezone: string,
): Record<SlotGroupKey, SlotDto[]> {
  const groups: Record<SlotGroupKey, SlotDto[]> = {
    Morning: [],
    Afternoon: [],
    Evening: [],
  };

  for (const slot of slots) {
    const hour = toZonedTime(parseISO(slot.startUtc), timezone).getHours();
    if (hour < 12) {
      groups.Morning.push(slot);
      continue;
    }

    if (hour < 17) {
      groups.Afternoon.push(slot);
      continue;
    }

    groups.Evening.push(slot);
  }

  return groups;
}

export function formatSlotStart(slot: SlotDto, timezone: string): string {
  return format(toZonedTime(parseISO(slot.startUtc), timezone), 'h:mm a');
}

export function formatSlotEnd(slot: SlotDto, timezone: string): string {
  return format(toZonedTime(parseISO(slot.endUtc), timezone), 'h:mm a');
}

