import type { EventTypeDto } from '../types';

export function EventTypeCard({ eventType }: { eventType: EventTypeDto }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-mat-surface p-4 shadow-aura">
      <h2 className="text-lg font-semibold text-mat-ink">{eventType.name}</h2>
      <p className="mt-1 text-sm text-slate-300">{eventType.kind.replaceAll('_', ' ')}</p>
      <p className="mt-2 text-sm text-mat-gold">{eventType.durationMinutes} minutes · Discovery call</p>
      <p className="mt-2 text-xs text-slate-400">Founded in Vienna, tuned for U.S. martial arts schools.</p>
    </article>
  );
}
