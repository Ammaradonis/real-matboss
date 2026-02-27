import { addDays, differenceInCalendarDays, format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { useMemo } from 'react';

import { CalendarGrid } from './components/CalendarGrid';
import { ConfirmationView } from './components/ConfirmationView';
import { EventTypeCard } from './components/EventTypeCard';
import { SchoolDetailsForm } from './components/SchoolDetailsForm';
import { SlotPicker } from './components/SlotPicker';
import { StepIndicator } from './components/StepIndicator';
import { SuccessView } from './components/SuccessView';
import { useBookingFlow } from './features/booking-flow/use-booking-flow';
import { useDiscoveryRuntime } from './features/discovery-runtime/use-discovery-runtime';

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

  const {
    eventTypes,
    selectedEventType,
    slots,
    bootstrapLoading,
    loadingSlots,
    submitting,
    error,
    selectEventType,
    submitBooking,
  } = useDiscoveryRuntime({
    timezone,
    selectedDate,
    selectedSlot,
    details,
    onSlotsReconciled: reconcileSelectedSlot,
    onSelectedSlotClear: () => selectSlot(null),
    onBookingComplete: completeBooking,
  });

  const windowEnd = useMemo(() => addDays(new Date(), 60), []);
  const daysUntilWindowClose = useMemo(
    () => Math.max(0, differenceInCalendarDays(windowEnd, new Date())),
    [windowEnd],
  );

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
            onClick={() => selectEventType(item)}
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
          onConfirm={() => void submitBooking()}
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
