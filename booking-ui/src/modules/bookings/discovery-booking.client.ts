import { createDiscoveryBooking } from '../../api';
import type { DiscoveryBookingResponse, SchoolDetails, SlotDto } from '../../types';

interface SubmitDiscoveryBookingInput {
  providerId: string;
  eventTypeId: string;
  slot: SlotDto;
  details: SchoolDetails;
}

export function submitDiscoveryBooking(
  input: SubmitDiscoveryBookingInput,
): Promise<DiscoveryBookingResponse> {
  return createDiscoveryBooking({
    providerId: input.providerId,
    eventTypeId: input.eventTypeId,
    slot: input.slot,
    details: input.details,
  });
}
