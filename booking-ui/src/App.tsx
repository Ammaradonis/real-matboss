import { addDays, format, startOfDay } from 'date-fns';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { createDiscoveryBooking, getSlots } from './api';
import { CalendarGrid } from './components/CalendarGrid';
import { ConfirmationView } from './components/ConfirmationView';
import { EventTypeCard } from './components/EventTypeCard';
import { SchoolDetailsForm } from './components/SchoolDetailsForm';
import { SlotPicker } from './components/SlotPicker';
import { StepIndicator } from './components/StepIndicator';
import { SuccessView } from './components/SuccessView';
import { useRealtime } from './hooks/useRealtime';
import type { BookingStep, SchoolDetails, SlotDto } from './types';

const defaultEventType = {
  id: '55555555-5555-5555-5555-555555555551',
  name: 'MatBoss Discovery Call',
  durationMinutes: 30,
  kind: 'ONE_ON_ONE' as const,
};

const providerId = '44444444-4444-4444-4444-444444444444';

function App() {
  const timezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York',
    [],
  );

  const [step, setStep] = useState<BookingStep>(1);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [slots, setSlots] = useState<SlotDto[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<SlotDto | null>(null);
  const [details, setDetails] = useState<SchoolDetails>({
    schoolName: '',
    city: '',
    state: '',
    county: '',
    contactName: '',
    email: '',
    phone: '',
    activeStudents: 0,
    instructorCount: 1,
    currentSystem: '',
    schedulingChallenges: '',
    budgetRange: '',
    implementationTimeline: '',
  });
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadSlots = useCallback(async () => {
    setLoadingSlots(true);
    try {
      const from = startOfDay(selectedDate);
      const to = addDays(from, 1);
      const data = await getSlots({
        providerId,
        fromIso: from.toISOString(),
        toIso: to.toISOString(),
        viewerTz: timezone,
      });
      setSlots(data.filter((slot) => slot.isAvailable));
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load slots');
    } finally {
      setLoadingSlots(false);
    }
  }, [selectedDate, timezone]);

  useEffect(() => {
    void loadSlots();
  }, [loadSlots]);

  useRealtime(providerId, loadSlots);

  const onConfirm = useCallback(async () => {
    if (!selectedSlot) {
      return;
    }

    setSubmitting(true);
    try {
      await createDiscoveryBooking({
        providerId,
        eventTypeId: defaultEventType.id,
        slot: selectedSlot,
        details,
      });
      setStep(5);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Booking failed');
    } finally {
      setSubmitting(false);
    }
  }, [details, selectedSlot]);

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-8 text-mat-ink">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold">MatBoss Booking</h1>
        <p className="mt-2 text-sm text-slate-300">
          Vienna-origin scheduling engine for U.S. martial arts schools · Viewer timezone: {timezone}
        </p>
        <p className="text-xs text-slate-500">{format(new Date(), 'PPpp')} local · maintaining sub-3-minute response windows</p>
      </header>

      <EventTypeCard eventType={defaultEventType} />
      <StepIndicator step={step} />

      {error && <p className="mb-4 rounded-xl border border-mat-rose/40 bg-mat-rose/10 px-3 py-2 text-sm text-mat-rose">{error}</p>}

      {step === 1 && (
        <div className="space-y-4">
          <CalendarGrid selected={selectedDate} onSelect={(date) => setSelectedDate(date)} />
          <button type="button" className="btn-primary" onClick={() => setStep(2)}>
            Continue
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          {loadingSlots ? <p className="text-sm text-slate-400">Loading available slots…</p> : null}
          <SlotPicker slots={slots} selected={selectedSlot} timezone={timezone} onSelect={setSelectedSlot} />
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
            setDetails(next);
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

      {step === 5 && selectedSlot && <SuccessView details={details} slot={selectedSlot} />}
    </main>
  );
}

export default App;
