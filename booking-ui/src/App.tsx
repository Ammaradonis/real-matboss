import { addDays, format, startOfDay } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { useEffect, useMemo, useState } from 'react';

import { CalendarGrid } from './components/CalendarGrid';
import { ConfirmationView } from './components/ConfirmationView';
import { EventTypeCard } from './components/EventTypeCard';
import { SchoolDetailsForm } from './components/SchoolDetailsForm';
import { SlotPicker } from './components/SlotPicker';
import { StepIndicator } from './components/StepIndicator';
import { SuccessView } from './components/SuccessView';
import { useBookingFlow } from './features/booking-flow/use-booking-flow';
import { useDiscoveryRuntime } from './features/discovery-runtime/use-discovery-runtime';

const DEFAULT_TIMEZONE = 'America/Los_Angeles';
const TIMEZONE_OPTIONS = [
  'America/Los_Angeles',
  'America/Denver',
  'America/Chicago',
  'America/New_York',
  'America/Phoenix',
  'America/Anchorage',
  'Pacific/Honolulu',
  'America/Toronto',
  'America/Vancouver',
  'Europe/London',
  'Europe/Vienna',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Singapore',
  'Australia/Sydney',
  'UTC',
];

function isValidTimezone(zone: string | undefined): zone is string {
  if (!zone) {
    return false;
  }

  try {
    Intl.DateTimeFormat(undefined, { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

function getBrowserTimezone(): string {
  const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return isValidTimezone(browserTimezone) ? browserTimezone : DEFAULT_TIMEZONE;
}

function buildTimezoneOptions(currentTimezone: string): string[] {
  return Array.from(new Set([currentTimezone, ...TIMEZONE_OPTIONS])).filter(isValidTimezone);
}

function App() {
  const [timezone, setTimezone] = useState<string>(() => getBrowserTimezone());
  const timezoneOptions = useMemo(() => buildTimezoneOptions(timezone), [timezone]);
  const defaultSelectedDate = useMemo(() => addDays(startOfDay(new Date()), 1), []);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 4000);
    let active = true;

    const detectTimezoneFromIp = async () => {
      try {
        const response = await fetch('https://ipapi.co/json/', { signal: controller.signal });
        if (!response.ok) {
          return;
        }
        const payload = (await response.json()) as { timezone?: string };
        if (active && isValidTimezone(payload.timezone)) {
          setTimezone(payload.timezone);
        }
      } catch {
        // Keep browser timezone fallback when IP geolocation is unavailable.
      } finally {
        window.clearTimeout(timeout);
      }
    };

    void detectTimezoneFromIp();

    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, []);

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

  return (
    <main className="grain-overlay mx-auto min-h-screen max-w-5xl px-4 py-8 text-mat-ink">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-[0.3em] text-mat-gold">Vienna to Every U.S. School</p>
        <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">MatBoss Booking Command Center</h1>
        <p className="mt-2 text-sm text-slate-300">
          Rapid discovery booking for martial arts schools. Viewer timezone: <strong>{timezone}</strong>
        </p>
        <p className="text-xs text-slate-500">
          {format(new Date(), 'PPpp')} local · Vienna clock {formatInTimeZone(new Date(), 'Europe/Vienna', 'PPpp')}
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
          <CalendarGrid
            selected={selectedDate}
            onSelect={selectDate}
            timezone={timezone}
            onTimezoneChange={setTimezone}
            timezoneOptions={timezoneOptions}
            defaultSelectedDate={defaultSelectedDate}
          />
          <button
            type="button"
            className="btn-primary"
            onClick={() => setStep(2)}
            disabled={bootstrapLoading || !selectedDate}
          >
            Continue
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          {selectedDate ? (
            <>
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
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-slate-300">Select a date before choosing a time slot.</p>
              <button type="button" className="btn-secondary" onClick={() => setStep(1)}>
                Back to calendar
              </button>
            </div>
          )}
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
