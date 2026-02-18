import { format, parseISO } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

import type { SlotDto } from '../types';

type GroupKey = 'Morning' | 'Afternoon' | 'Evening';

function groupSlots(slots: SlotDto[], timezone: string): Record<GroupKey, SlotDto[]> {
  const initialGroups: Record<GroupKey, SlotDto[]> = {
    Morning: [],
    Afternoon: [],
    Evening: [],
  };

  return slots.reduce(
    (acc, slot) => {
      const hour = toZonedTime(parseISO(slot.startUtc), timezone).getHours();
      if (hour < 12) {
        acc.Morning.push(slot);
      } else if (hour < 17) {
        acc.Afternoon.push(slot);
      } else {
        acc.Evening.push(slot);
      }
      return acc;
    },
    initialGroups,
  );
}

export function SlotPicker({
  slots,
  selected,
  timezone,
  onSelect,
}: {
  slots: SlotDto[];
  selected: SlotDto | null;
  timezone: string;
  onSelect: (slot: SlotDto) => void;
}) {
  const grouped = groupSlots(slots, timezone);

  return (
    <section className="rounded-2xl border border-white/10 bg-mat-surface/80 p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm uppercase tracking-[0.2em] text-slate-300">Step 2 · Choose Time</h3>
        <p className="text-xs text-slate-400">Timezone view: {timezone}</p>
      </div>
      <p className="mb-4 rounded-xl border border-mat-gold/35 bg-mat-gold/10 px-3 py-2 text-xs text-mat-gold">
        Select the fastest open window. Availability refreshes in real time if another booking lands.
      </p>
      <div className="space-y-4" role="list" aria-label="Available slot groups">
        {(Object.keys(grouped) as GroupKey[]).map((group) => (
          <div key={group} role="listitem">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-mat-gold">{group}</p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {grouped[group].length === 0 ? <p className="text-sm text-slate-500">No slots in this range.</p> : null}
              {grouped[group].map((slot) => {
                const active = selected?.startUtc === slot.startUtc;
                const label = format(toZonedTime(parseISO(slot.startUtc), timezone), 'h:mm a');
                return (
                  <button
                    key={slot.startUtc}
                    type="button"
                    aria-label={`Select ${label} slot`}
                    onClick={() => onSelect(slot)}
                    className={`rounded-xl border px-3 py-2 text-left text-sm ${
                      active
                        ? 'border-mat-cyan bg-mat-cyan/20 text-mat-ink shadow-aura'
                        : 'border-white/10 bg-mat-panel text-slate-200 hover:border-mat-gold/40'
                    }`}
                  >
                    <span className="font-semibold">{label}</span>
                    <span className="mt-1 block text-[11px] text-slate-400">
                      {format(toZonedTime(parseISO(slot.endUtc), timezone), 'h:mm a')} end
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
