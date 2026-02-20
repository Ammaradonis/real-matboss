import { addDays, differenceInCalendarDays, format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { createDiscoveryBooking, getEventTypes, getProviders, getSlots } from './api';
import { CalendarGrid } from './components/CalendarGrid';
import { ConfirmationView } from './components/ConfirmationView';
import { EventTypeCard } from './components/EventTypeCard';
import { SchoolDetailsForm } from './components/SchoolDetailsForm';
import { SlotPicker } from './components/SlotPicker';
import { StepIndicator } from './components/StepIndicator';
import { SuccessView } from './components/SuccessView';
import { dedupeAndSortSlots, filterAvailableSlots, getSlotRangeForDate } from './core/temporal/slot-engine';
import { useBookingFlow } from './features/booking-flow/use-booking-flow';
import { useRealtime } from './hooks/useRealtime';
import type { EventTypeDto, ProviderDto, SlotDto } from './types';

const DEFAULT_EVENT_TYPE: EventTypeDto = {
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

const DEFAULT_PROVIDER: ProviderDto = {
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

function App() {
  const timezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Los_Angeles',
    [],
  );

  const {
    step,
    selectedDate,
    selectedSlot,
    details,
    bookingResult,
    setStep,
    selectDate,
    selectSlot,
    reconcileSelectedSlot,
    saveDetails,
    completeBooking,
  } = useBookingFlow();

  const [provider, setProvider] = useState<ProviderDto>(DEFAULT_PROVIDER);
  const [eventTypes, setEventTypes] = useState<EventTypeDto[]>([DEFAULT_EVENT_TYPE]);
  const [selectedEventType, setSelectedEventType] = useState<EventTypeDto>(DEFAULT_EVENT_TYPE);
  const [slots, setSlots] = useState<SlotDto[]>([]);
  const [bootstrapLoading, setBootstrapLoading] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const windowEnd = useMemo(() => addDays(new Date(), 60), []);
  const daysUntilWindowClose = useMemo(
    () => Math.max(0, differenceInCalendarDays(windowEnd, new Date())),
    [windowEnd],
  );

  const loadBootstrap = useCallback(async () => {
    setBootstrapLoading(true);
    try {
      const providerRows = await getProviders();
      const chosenProvider = providerRows.find((row) => row.isActive) ?? providerRows[0] ?? DEFAULT_PROVIDER;
      setProvider(chosenProvider);

      const eventTypeRows = await getEventTypes(chosenProvider.id);
      const activeEventTypes = eventTypeRows.filter((item) => item.isActive);
      const nextTypes = activeEventTypes.length ? activeEventTypes : [DEFAULT_EVENT_TYPE];
      setEventTypes(nextTypes);
      setSelectedEventType(nextTypes[0]);
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
    }
  }, []);

  const loadSlots = useCallback(async () => {
    if (!provider.id) {
      return;
    }

    setLoadingSlots(true);
    try {
      const { fromIso, toIso } = getSlotRangeForDate(selectedDate);
      const data = await getSlots({
        providerId: provider.id,
        fromIso,
        toIso,
        viewerTz: timezone,
        eventTypeId: selectedEventType.id,
      });
      const normalizedSlots = dedupeAndSortSlots(filterAvailableSlots(data));
      setSlots(normalizedSlots);
      reconcileSelectedSlot(normalizedSlots);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load slots');
    } finally {
      setLoadingSlots(false);
    }
  }, [provider.id, reconcileSelectedSlot, selectedDate, selectedEventType.id, timezone]);

  useEffect(() => {
    void loadBootstrap();
  }, [loadBootstrap]);

  useEffect(() => {
    if (provider.id) {
      void loadSlots();
    }
  }, [provider.id, loadSlots]);

  useRealtime(provider.id, loadSlots);

  const onConfirm = useCallback(async () => {
    if (!selectedSlot) {
      return;
    }

    setSubmitting(true);
    try {
      const response = await createDiscoveryBooking({
        providerId: provider.id,
        eventTypeId: selectedEventType.id,
        slot: selectedSlot,
        details,
      });
      completeBooking(response);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Booking failed');
    } finally {
      setSubmitting(false);
    }
  }, [completeBooking, details, provider.id, selectedEventType.id, selectedSlot]);

  return (
    <main className="grain-overlay mx-auto min-h-screen max-w-5xl px-4 py-8 text-mat-ink">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-[0.3em] text-mat-gold">Vienna to Every U.S. School</p>
        <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">MatBoss Booking Command Center</h1>
        <p className="mt-2 text-sm text-slate-300">
          Rapid discovery booking for martial arts schools. Viewer timezone: <strong>{timezone}</strong>
        </p>
        <p className="text-xs text-slate-500">
          {format(new Date(), 'PPpp')} local · Vienna clock{' '}
          {formatInTimeZone(new Date(), 'Europe/Vienna', 'PPpp')} · {daysUntilWindowClose} days left in current
          60-day booking window.
        </p>
        <div className="county-orbit mt-4" aria-hidden="true">
          <span>County Coverage Sync</span>
        </div>
      </header>

      <EventTypeCard eventType={selectedEventType} />
      <div className="mt-3 flex flex-wrap gap-2">
        {eventTypes.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setSelectedEventType(item);
              selectSlot(null);
            }}
            className={`rounded-full border px-3 py-1 text-xs transition ${
              selectedEventType.id === item.id
                ? 'border-mat-cyan bg-mat-cyan/20 text-mat-ink'
                : 'border-white/15 text-slate-300 hover:border-mat-gold/60'
            }`}
          >
            {item.name} ({item.durationMinutes}m)
          </button>
        ))}
      </div>

      <StepIndicator step={step} />

      {error && <p className="mb-4 rounded-xl border border-mat-rose/40 bg-mat-rose/10 px-3 py-2 text-sm text-mat-rose">{error}</p>}
      {bootstrapLoading ? <p className="mb-4 text-sm text-slate-400">Loading provider + event type metadata...</p> : null}

      {step === 1 && (
        <div className="space-y-4">
          <CalendarGrid selected={selectedDate} onSelect={selectDate} />
          <button type="button" className="btn-primary" onClick={() => setStep(2)} disabled={bootstrapLoading}>
            Continue
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          {loadingSlots ? <p className="text-sm text-slate-400">Loading available slots…</p> : null}
          <SlotPicker slots={slots} selected={selectedSlot} timezone={timezone} onSelect={selectSlot} />
          <div className="flex gap-2">
            <button type="button" className="btn-secondary" onClick={() => setStep(1)}>
              Back
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={!selectedSlot}
              onClick={() => setStep(3)}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <SchoolDetailsForm
          value={details}
          onBack={() => setStep(2)}
          onSubmit={(next) => {
            saveDetails(next);
            setStep(4);
          }}
        />
      )}

      {step === 4 && selectedSlot && (
        <ConfirmationView
          details={details}
          slot={selectedSlot}
          timezone={timezone}
          onBack={() => setStep(3)}
          onConfirm={() => void onConfirm()}
          loading={submitting}
        />
      )}

      {step === 5 && selectedSlot ? (
        <SuccessView details={details} slot={selectedSlot} bookingId={bookingResult?.booking.id} />
      ) : null}
    </main>
  );
}

export default App;
