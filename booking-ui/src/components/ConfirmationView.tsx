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
  const vienna = toZonedTime(parseISO(slot.startUtc), 'Europe/Vienna');

  return (
    <section className="space-y-4 rounded-2xl border border-white/10 bg-mat-surface p-5">
      <h3 className="text-sm uppercase tracking-[0.2em] text-slate-300">Step 4 · Confirm Details</h3>
      <div className="grid gap-3 md:grid-cols-2">
        <article className="rounded-xl border border-white/10 bg-mat-panel/60 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-mat-gold">School</p>
          <p className="mt-2 text-base font-semibold text-mat-ink">{details.schoolName}</p>
          <p className="mt-1 text-sm text-slate-300">
            {details.city}, {details.state} · {details.county}
          </p>
          <p className="mt-1 text-sm text-slate-400">
            {details.activeStudents} active students · {details.instructorCount} instructors
          </p>
          <p className="mt-1 text-sm text-slate-400">Current system: {details.currentSystem || 'Not specified'}</p>
        </article>

        <article className="rounded-xl border border-white/10 bg-mat-panel/60 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-mat-gold">Call Time</p>
          <p className="mt-2 text-sm text-slate-300">{format(local, 'EEEE, MMM d · h:mm a')} ({timezone})</p>
          <p className="mt-1 text-sm text-slate-400">Vienna ops: {format(vienna, 'EEE, MMM d · HH:mm')}</p>
          <p className="mt-3 text-xs text-slate-400">
            Contact: {details.contactName} · {details.email} · {details.phone || 'No phone provided'}
          </p>
          <p className="mt-1 text-xs text-slate-400">Preferred method: {details.preferredContactMethod}</p>
        </article>
      </div>

      <article className="rounded-xl border border-emerald-400/30 bg-emerald-600/10 p-4 text-sm text-emerald-100">
        <p className="font-semibold">Modern scheduling edge</p>
        <p className="mt-1 text-emerald-200">
          MatBoss focuses on immediate follow-up and timezone-safe routing. Legacy tools often add
          handoff delays that reduce lead conversion.
        </p>
      </article>

      {details.schedulingChallenges ? (
        <article className="rounded-xl border border-white/10 bg-mat-panel/60 p-4 text-sm text-slate-200">
          <p className="mb-1 text-xs uppercase tracking-[0.2em] text-slate-400">Challenges</p>
          <p>{details.schedulingChallenges}</p>
        </article>
      ) : null}

      <div className="flex gap-2">
        <button type="button" className="btn-secondary" onClick={onBack}>
          Back
        </button>
        <button type="button" className="btn-primary" onClick={onConfirm} disabled={loading}>
          {loading ? 'Submitting...' : 'Confirm Booking'}
        </button>
      </div>
    </section>
  );
}
