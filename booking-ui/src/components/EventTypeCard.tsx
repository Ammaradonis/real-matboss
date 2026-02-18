import type { EventTypeDto } from '../types';

export function EventTypeCard({ eventType }: { eventType: EventTypeDto }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-mat-surface p-4 shadow-aura">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-mat-ink">{eventType.name}</h2>
          <p className="mt-1 text-sm text-slate-300">{eventType.kind.replaceAll('_', ' ')}</p>
        </div>
        <span className="rounded-full border border-mat-gold/40 bg-mat-gold/10 px-3 py-1 text-xs text-mat-gold">
          {eventType.durationMinutes} min
        </span>
      </div>
      <p className="mt-3 text-sm text-slate-200">
        High-speed discovery session for U.S. martial arts schools with Vienna-backed operations.
      </p>
      <p className="mt-2 text-xs text-slate-400">
        Structured to identify booking bottlenecks and ship a practical transition plan.
      </p>
    </article>
  );
}
