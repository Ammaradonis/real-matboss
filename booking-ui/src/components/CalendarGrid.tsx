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

function getTimezoneLabel(tz: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en', {
      timeZone: tz,
      timeZoneName: 'long',
    }).formatToParts(new Date());
    const name = parts.find((p) => p.type === 'timeZoneName')?.value;
    if (!name) return tz.replace(/_/g, ' ');
    const time = new Intl.DateTimeFormat('en', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date());
    return `${name} (${time})`;
  } catch {
    return tz.replace(/_/g, ' ');
  }
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
        <div className="flex items-center justify-center gap-6">
          <button
            type="button"
            onClick={() => setVisibleMonth((month) => addMonths(month, -1))}
            aria-label={`Go to ${format(addMonths(visibleMonth, -1), 'MMMM yyyy')}`}
            className="p-1 text-slate-400 transition hover:text-mat-ink"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h4 className="min-w-[10rem] text-center text-lg font-medium text-mat-ink">
            {format(visibleMonth, 'MMMM yyyy')}
          </h4>
          <button
            type="button"
            onClick={() => setVisibleMonth((month) => addMonths(month, 1))}
            aria-label={`Go to ${format(addMonths(visibleMonth, 1), 'MMMM yyyy')}`}
            className="p-1 text-slate-400 transition hover:text-mat-ink"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Weekday labels */}
        <div className="mt-8 grid grid-cols-7 text-center" aria-hidden="true">
          {WEEKDAYS.map((weekday) => (
            <span key={weekday} className="py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              {weekday}
            </span>
          ))}
        </div>

        {/* Date grid */}
        <div className="mt-2 grid grid-cols-7 gap-y-1.5 text-center" role="grid" aria-label="Booking date grid">
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
                      : 'bg-white/[0.05] text-slate-200 hover:bg-white/[0.12] hover:text-mat-ink'
                } disabled:cursor-not-allowed`}
              >
                <span className="text-sm font-medium leading-none">{format(day, 'd')}</span>
                {marksDefault && (
                  <span
                    className="mt-0.5 h-1.5 w-1.5 rounded-full bg-mat-gold/70"
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Timezone selector */}
        <div className="mt-10">
          <p className="text-xs text-slate-400">Time zone</p>
          <div className="mt-2 flex items-center gap-2">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-4 w-4 shrink-0 text-slate-300"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" />
            </svg>
            <select
              id="timezone"
              value={timezone}
              onChange={(event) => onTimezoneChange(event.target.value)}
              className="flex-1 cursor-pointer appearance-none bg-transparent py-1 text-sm text-slate-200 outline-none"
            >
              {timezoneOptions.map((option) => (
                <option key={option} value={option} className="bg-mat-panel text-mat-ink">
                  {getTimezoneLabel(option)}
                </option>
              ))}
            </select>
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4 shrink-0 text-slate-400"
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </div>
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
