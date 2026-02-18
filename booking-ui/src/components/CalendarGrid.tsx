import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  format,
  isBefore,
  isSameDay,
  isToday,
  startOfDay,
  startOfMonth,
} from 'date-fns';

interface CalendarGridProps {
  selected: Date;
  onSelect: (date: Date) => void;
  windowDays?: number;
}

export function CalendarGrid({ selected, onSelect, windowDays = 60 }: CalendarGridProps) {
  const start = startOfDay(new Date());
  const end = addDays(start, windowDays);
  const range = eachDayOfInterval({ start: startOfMonth(start), end: endOfMonth(end) });

  return (
    <section className="rounded-2xl border border-white/10 bg-mat-surface/80 p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-sm uppercase tracking-[0.2em] text-slate-300">Step 1 · Select Date</h3>
          <p className="mt-1 text-xs text-slate-400">
            Availability opens in a rolling {windowDays}-day window.
          </p>
        </div>
        <div className="flex gap-2 text-xs">
          <span className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-emerald-200">
            Open window
          </span>
          <span className="rounded-full border border-rose-400/40 bg-rose-500/10 px-3 py-1 text-rose-200">
            Locked date
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7" role="grid" aria-label="Booking date grid">
        {range.map((day) => {
          const disabled = isBefore(day, start) || day > end;
          const active = isSameDay(day, selected);
          return (
            <button
              key={day.toISOString()}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(day)}
              aria-label={`Choose ${format(day, 'EEEE, MMMM d')}`}
              className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                active
                  ? 'border-mat-cyan bg-mat-cyan/20 text-mat-ink shadow-aura'
                  : disabled
                    ? 'border-rose-400/30 bg-rose-600/10 text-slate-400'
                    : 'border-white/10 bg-mat-panel text-slate-200 hover:border-mat-gold/60'
              } disabled:cursor-not-allowed`}
            >
              <span className="block text-[11px] uppercase tracking-wide text-slate-400">{format(day, 'EEE')}</span>
              <span className="block text-base font-semibold">{format(day, 'd')}</span>
              <span className="block text-[11px] text-slate-400">{format(day, 'MMM')}</span>
              {isToday(day) ? (
                <span className="mt-1 inline-block rounded-full bg-mat-gold/15 px-2 py-0.5 text-[10px] text-mat-gold">
                  Today
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
