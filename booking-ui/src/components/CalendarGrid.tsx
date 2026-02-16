import { addDays, eachDayOfInterval, endOfMonth, format, isSameDay, isToday, startOfMonth } from 'date-fns';

export function CalendarGrid({
  selected,
  onSelect,
}: {
  selected: Date;
  onSelect: (date: Date) => void;
}) {
  const start = new Date();
  const end = addDays(start, 60);
  const range = eachDayOfInterval({ start: startOfMonth(start), end: endOfMonth(end) });

  return (
    <div>
      <h3 className="mb-2 text-sm uppercase tracking-wide text-slate-400">Step 1 · Choose date</h3>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-7" role="grid" aria-label="Booking date grid">
        {range.map((day: Date) => {
          const disabled = day < start || day > end;
          const active = isSameDay(day, selected);
          return (
            <button
              key={day.toISOString()}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(day)}
              className={`rounded-xl border p-2 text-left text-sm transition ${
                active
                  ? 'border-mat-cyan bg-mat-cyan/20 text-mat-ink'
                  : 'border-white/10 bg-mat-panel text-slate-200 hover:border-mat-gold/60'
              } disabled:cursor-not-allowed disabled:opacity-35`}
            >
              <span className="block text-xs text-slate-400">{format(day, 'EEE')}</span>
              <span>{format(day, 'MMM d')}</span>
              {isToday(day) && <span className="ml-1 text-xs text-mat-gold">Today</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
