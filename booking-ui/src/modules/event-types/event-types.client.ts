import { getEventTypes } from '../../api';
import type { EventTypeDto } from '../../types';

export async function loadActiveEventTypes(
  providerId: string,
  fallbackEventType: EventTypeDto,
): Promise<EventTypeDto[]> {
  const eventTypeRows = await getEventTypes(providerId);
  const activeEventTypes = eventTypeRows.filter((item) => item.isActive);
  return activeEventTypes.length ? activeEventTypes : [fallbackEventType];
}
