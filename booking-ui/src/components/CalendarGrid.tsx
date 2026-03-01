import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isBefore,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
} from 'date-fns';
import { useEffect, useMemo, useState } from 'react';

interface CalendarGridProps {
  selected: Date | null;
  onSelect: (date: Date) => void;
  timezone: string;
  onTimezoneChange: (timezone: string) => void;
  timezoneOptions: string[];
  defaultSelectedDate: Date;
  onContinue?: () => void;
  continueDisabled?: boolean;
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function formatTimezoneLabel(timezone: string): string {
  return timezone.replace(/_/g, ' ');
}

export function CalendarGrid({
  selected,
  onSelect,
  timezone,
  onTimezoneChange,
  timezoneOptions,
  defaultSelectedDate,
  onContinue,
  continueDisabled,
}: CalendarGridProps) {
  const today = startOfDay(new Date());
  const [visibleMonth, setVisibleMonth] = useState<Date>(() => startOfMonth(selected ?? defaultSelectedDate));

  useEffect(() => {
    if (selected && !isSameMonth(selected, visibleMonth)) {
      setVisibleMonth(startOfMonth(selected));
    }
  }, [selected, visibleMonth]);

  const cells = useMemo(() => {
    const monthStart = startOfMonth(visibleMonth);
    const monthEnd = endOfMonth(visibleMonth);
    const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const leading = (monthStart.getDay() + 6) % 7;
    const trailing = (7 - ((leading + monthDays.length) % 7)) % 7;
    const leadingCells = Array.from({ length: leading }, () => null);
    const trailingCells = Array.from({ length: trailing }, () => null);

    return [...leadingCells, ...monthDays, ...trailingCells];
  }, [visibleMonth]);

  return (
    <section>
      <div className="mx-auto w-full max-w-[23rem]">
        {/* Month navigation header */}
        <div className="grid grid-cols-[auto,1fr,auto] items-center gap-4">
          <button
            type="button"
            onClick={() => setVisibleMonth((month) => addMonths(month, -1))}
            aria-label={`Go to ${format(addMonths(visibleMonth, -1), 'MMMM yyyy')}`}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-slate-300 transition hover:border-mat-gold/60 hover:text-mat-ink"
          >
            <span aria-hidden="true">&larr;</span>
          </button>
          <h4 className="text-center text-lg font-medium text-mat-ink">{format(visibleMonth, 'MMMM yyyy')}</h4>
          <button
            type="button"
            onClick={() => setVisibleMonth((month) => addMonths(month, 1))}
            aria-label={`Go to ${format(addMonths(visibleMonth, 1), 'MMMM yyyy')}`}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-slate-300 transition hover:border-mat-gold/60 hover:text-mat-ink"
          >
            <span aria-hidden="true">&rarr;</span>
          </button>
        </div>

        {/* Weekday labels */}
        <div className="mt-8 grid grid-cols-7 text-center" aria-hidden="true">
          {WEEKDAYS.map((weekday) => (
            <span key={weekday} className="py-2 text-[11px] uppercase tracking-[0.18em] text-slate-400">
              {weekday}
            </span>
          ))}
        </div>

        {/* Date grid */}
        <div className="mt-2 grid grid-cols-7 gap-y-1 text-center" role="grid" aria-label="Booking date grid">
          {cells.map((day, index) => {
            if (!day) {
              return <span key={`empty-${index}`} className="mx-auto block h-11 w-11" aria-hidden="true" />;
            }

            const disabled = isBefore(day, today);
            const active = selected ? isSameDay(day, selected) : false;
            const marksDefault = isSameDay(day, defaultSelectedDate);

            return (
              <button
                key={day.toISOString()}
                type="button"
                disabled={disabled}
                aria-pressed={active}
                onClick={() => onSelect(day)}
                aria-label={`Choose ${format(day, 'EEEE, MMMM d')}`}
                className={`mx-auto flex h-11 w-11 flex-col items-center justify-center rounded-full text-sm transition ${
                  active
                    ? 'bg-mat-cyan/20 text-mat-ink'
                    : disabled
                      ? 'text-slate-600'
                      : 'text-slate-200 hover:bg-white/[0.06] hover:text-mat-ink'
                } disabled:cursor-not-allowed`}
              >
                <span className="text-sm font-medium leading-none">{format(day, 'd')}</span>
                <span
                  className={`mt-1 h-1.5 w-1.5 rounded-full ${
                    marksDefault ? 'bg-mat-gold/70' : 'bg-transparent'
                  }`}
                  aria-hidden="true"
                />
              </button>
            );
          })}
        </div>

        {/* Timezone selector */}
        <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
          <label htmlFor="timezone" className="inline-flex items-center gap-2 text-sm text-slate-300">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" />
            </svg>
            Time zone
          </label>
          <select
            id="timezone"
            value={timezone}
            onChange={(event) => onTimezoneChange(event.target.value)}
            className="input min-w-[240px] flex-1 sm:flex-none"
          >
            {timezoneOptions.map((option) => (
              <option key={option} value={option}>
                {formatTimezoneLabel(option)}
              </option>
            ))}
          </select>
        </div>

        {/* Continue action */}
        {onContinue && (
          <button
            type="button"
            className="btn-primary mt-6 w-full"
            onClick={onContinue}
            disabled={continueDisabled}
          >
            Continue
          </button>
        )}
      </div>
    </section>
  );
}
