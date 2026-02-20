import { describe, expect, it } from 'vitest';
import { addDays, startOfDay } from 'date-fns';

import type { SlotDto } from '../../types';
import {
  dedupeAndSortSlots,
  filterAvailableSlots,
  formatSlotEnd,
  formatSlotStart,
  getSlotRangeForDate,
  groupSlotsByDayPart,
  reconcileSelectedSlot,
} from './slot-engine';

describe('slot-engine', () => {
  it('builds a same-day UTC range', () => {
    const input = new Date('2026-03-14T19:42:00.000Z');
    const range = getSlotRangeForDate(input);
    const expectedFrom = startOfDay(input).toISOString();
    const expectedTo = addDays(startOfDay(input), 1).toISOString();

    expect(range.fromIso).toBe(expectedFrom);
    expect(range.toIso).toBe(expectedTo);
  });

  it('filters unavailable slots', () => {
    const slots: SlotDto[] = [
      { startUtc: '2026-03-14T10:00:00.000Z', endUtc: '2026-03-14T10:30:00.000Z', isAvailable: true },
      { startUtc: '2026-03-14T10:30:00.000Z', endUtc: '2026-03-14T11:00:00.000Z', isAvailable: false },
      { startUtc: '2026-03-14T11:00:00.000Z', endUtc: '2026-03-14T11:30:00.000Z' },
    ];

    expect(filterAvailableSlots(slots)).toHaveLength(2);
  });

  it('deduplicates and sorts slots by start timestamp', () => {
    const slots: SlotDto[] = [
      { startUtc: '2026-03-14T11:00:00.000Z', endUtc: '2026-03-14T11:30:00.000Z' },
      { startUtc: '2026-03-14T10:00:00.000Z', endUtc: '2026-03-14T10:30:00.000Z' },
      { startUtc: '2026-03-14T11:00:00.000Z', endUtc: '2026-03-14T11:30:00.000Z', reason: 'duplicate' },
    ];

    const result = dedupeAndSortSlots(slots);
    expect(result).toHaveLength(2);
    expect(result[0].startUtc).toBe('2026-03-14T10:00:00.000Z');
  });

  it('keeps selected slot only if still present in refreshed slots', () => {
    const selected: SlotDto = {
      startUtc: '2026-03-14T11:00:00.000Z',
      endUtc: '2026-03-14T11:30:00.000Z',
    };
    const refreshed: SlotDto[] = [
      { startUtc: '2026-03-14T10:00:00.000Z', endUtc: '2026-03-14T10:30:00.000Z' },
      selected,
    ];

    expect(reconcileSelectedSlot(selected, refreshed)).toEqual(selected);
    expect(reconcileSelectedSlot(selected, refreshed.slice(0, 1))).toBeNull();
  });

  it('groups slots by local day part and formats labels', () => {
    const slots: SlotDto[] = [
      { startUtc: '2026-03-14T16:00:00.000Z', endUtc: '2026-03-14T16:30:00.000Z' }, // 9:00 AM PT
      { startUtc: '2026-03-14T21:00:00.000Z', endUtc: '2026-03-14T21:30:00.000Z' }, // 2:00 PM PT
      { startUtc: '2026-03-15T03:00:00.000Z', endUtc: '2026-03-15T03:30:00.000Z' }, // 8:00 PM PT
    ];

    const grouped = groupSlotsByDayPart(slots, 'America/Los_Angeles');
    expect(grouped.Morning).toHaveLength(1);
    expect(grouped.Afternoon).toHaveLength(1);
    expect(grouped.Evening).toHaveLength(1);
    expect(formatSlotStart(slots[0], 'America/Los_Angeles')).toBe('9:00 AM');
    expect(formatSlotEnd(slots[2], 'America/Los_Angeles')).toBe('8:30 PM');
  });
});
