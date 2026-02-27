import { useCallback, useEffect, useState } from 'react';

import { useRealtime } from '../../hooks/useRealtime';
import { loadAvailableSlots } from '../../modules/availability/availability.client';
import { submitDiscoveryBooking } from '../../modules/bookings/discovery-booking.client';
import { loadActiveEventTypes } from '../../modules/event-types/event-types.client';
import { loadActiveProvider } from '../../modules/providers/providers.client';
import type {
  DiscoveryBookingResponse,
  EventTypeDto,
  ProviderDto,
  SchoolDetails,
  SlotDto,
} from '../../types';
import { DEFAULT_EVENT_TYPE, DEFAULT_PROVIDER } from './defaults';

interface UseDiscoveryRuntimeInput {
  timezone: string;
  selectedDate: Date;
  selectedSlot: SlotDto | null;
  details: SchoolDetails;
  onSlotsReconciled: (slots: SlotDto[]) => void;
  onSelectedSlotClear: () => void;
  onBookingComplete: (result: DiscoveryBookingResponse) => void;
}

interface DiscoveryRuntimeResult {
  provider: ProviderDto;
  eventTypes: EventTypeDto[];
  selectedEventType: EventTypeDto;
  slots: SlotDto[];
  bootstrapLoading: boolean;
  loadingSlots: boolean;
  submitting: boolean;
  error: string;
  selectEventType: (eventType: EventTypeDto) => void;
  submitBooking: () => Promise<void>;
}

export function useDiscoveryRuntime(input: UseDiscoveryRuntimeInput): DiscoveryRuntimeResult {
  const {
    timezone,
    selectedDate,
    selectedSlot,
    details,
    onSlotsReconciled,
    onSelectedSlotClear,
    onBookingComplete,
  } = input;

  const [provider, setProvider] = useState<ProviderDto>(DEFAULT_PROVIDER);
  const [eventTypes, setEventTypes] = useState<EventTypeDto[]>([DEFAULT_EVENT_TYPE]);
  const [selectedEventType, setSelectedEventType] = useState<EventTypeDto>(DEFAULT_EVENT_TYPE);
  const [slots, setSlots] = useState<SlotDto[]>([]);
  const [bootstrapReady, setBootstrapReady] = useState(false);
  const [bootstrapLoading, setBootstrapLoading] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadBootstrap = useCallback(async () => {
    setBootstrapLoading(true);
    try {
      const chosenProvider = await loadActiveProvider(DEFAULT_PROVIDER);
      const activeEventTypes = await loadActiveEventTypes(chosenProvider.id, DEFAULT_EVENT_TYPE);

      setProvider(chosenProvider);
      setEventTypes(activeEventTypes);
      setSelectedEventType(activeEventTypes[0] ?? DEFAULT_EVENT_TYPE);
      setError('');
    } catch (bootstrapError) {
      setProvider(DEFAULT_PROVIDER);
      setEventTypes([DEFAULT_EVENT_TYPE]);
      setSelectedEventType(DEFAULT_EVENT_TYPE);
      setError(
        bootstrapError instanceof Error
          ? bootstrapError.message
          : 'Unable to load provider metadata; using fallback discovery profile.',
      );
    } finally {
      setBootstrapLoading(false);
      setBootstrapReady(true);
    }
  }, []);

  const loadSlots = useCallback(async () => {
    if (!bootstrapReady || !provider.id) {
      return;
    }

    setLoadingSlots(true);
    try {
      const nextSlots = await loadAvailableSlots({
        providerId: provider.id,
        selectedDate,
        viewerTz: timezone,
        eventTypeId: selectedEventType.id,
      });
      setSlots(nextSlots);
      onSlotsReconciled(nextSlots);
      setError('');
    } catch (slotError) {
      setError(slotError instanceof Error ? slotError.message : 'Unable to load slots');
    } finally {
      setLoadingSlots(false);
    }
  }, [
    bootstrapReady,
    onSlotsReconciled,
    provider.id,
    selectedDate,
    selectedEventType.id,
    timezone,
  ]);

  useEffect(() => {
    void loadBootstrap();
  }, [loadBootstrap]);

  useEffect(() => {
    if (bootstrapReady) {
      void loadSlots();
    }
  }, [bootstrapReady, loadSlots]);

  useRealtime(provider.id, loadSlots);

  const selectEventType = useCallback(
    (eventType: EventTypeDto) => {
      setSelectedEventType(eventType);
      onSelectedSlotClear();
    },
    [onSelectedSlotClear],
  );

  const submitBooking = useCallback(async () => {
    if (!selectedSlot) {
      return;
    }

    setSubmitting(true);
    try {
      const response = await submitDiscoveryBooking({
        providerId: provider.id,
        eventTypeId: selectedEventType.id,
        slot: selectedSlot,
        details,
      });
      onBookingComplete(response);
      setError('');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Booking failed');
    } finally {
      setSubmitting(false);
    }
  }, [
    details,
    onBookingComplete,
    provider.id,
    selectedSlot,
    selectedEventType.id,
  ]);

  return {
    provider,
    eventTypes,
    selectedEventType,
    slots,
    bootstrapLoading,
    loadingSlots,
    submitting,
    error,
    selectEventType,
    submitBooking,
  };
}
