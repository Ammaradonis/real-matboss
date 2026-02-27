import { getSlots } from '../../api';
import {
  dedupeAndSortSlots,
  filterAvailableSlots,
  getSlotRangeForDate,
} from '../../core/temporal/slot-engine';
import type { SlotDto } from '../../types';

interface LoadAvailableSlotsInput {
  providerId: string;
  selectedDate: Date;
  viewerTz: string;
  eventTypeId: string;
}

export async function loadAvailableSlots(input: LoadAvailableSlotsInput): Promise<SlotDto[]> {
  const { fromIso, toIso } = getSlotRangeForDate(input.selectedDate);
  const rawSlots = await getSlots({
    providerId: input.providerId,
    fromIso,
    toIso,
    viewerTz: input.viewerTz,
    eventTypeId: input.eventTypeId,
  });

  return dedupeAndSortSlots(filterAvailableSlots(rawSlots));
}
