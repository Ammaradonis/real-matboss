import { format, parseISO } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

import type { SchoolDetails, SlotDto } from '../types';

export function ConfirmationView({
  details,
  slot,
  timezone,
  onBack,
  onConfirm,
  loading,
}: {
  details: SchoolDetails;
  slot: SlotDto;
  timezone: string;
  onBack: () => void;
  onConfirm: () => void;
  loading: boolean;
}) {
  const local = toZonedTime(parseISO(slot.startUtc), timezone);

  return (
    <section className="space-y-4 rounded-2xl border border-white/10 bg-mat-surface p-5">
      <h3 className="text-sm uppercase tracking-wide text-slate-400">Step 4 · Confirm details</h3>
      <p className="text-mat-ink">{details.schoolName} · {details.city}, {details.state}</p>
      <p className="text-slate-300">{format(local, 'EEEE, MMM d · h:mm a')} ({timezone})</p>
      <p className="text-slate-400">Contact: {details.contactName} · {details.email}</p>
      <div className="flex gap-2">
        <button type="button" className="btn-secondary" onClick={onBack}>Back</button>
        <button type="button" className="btn-primary" onClick={onConfirm} disabled={loading}>
          {loading ? 'Submitting...' : 'Book Discovery Call'}
        </button>
      </div>
    </section>
  );
}
