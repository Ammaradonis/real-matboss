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
    <section>
      <h3 className="mb-2 text-sm uppercase tracking-wide text-slate-400">Step 2 · Choose slot</h3>
      <div className="space-y-4">
        {(Object.keys(grouped) as GroupKey[]).map((group) => (
          <div key={group}>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-mat-gold">{group}</p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {grouped[group].length === 0 && <p className="text-sm text-slate-500">No slots.</p>}
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
                        ? 'border-mat-cyan bg-mat-cyan/20 text-mat-ink'
                        : 'border-white/10 bg-mat-panel text-slate-200 hover:border-mat-gold/40'
                    }`}
                  >
                    {label}
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
