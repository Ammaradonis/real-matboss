import type { SchoolDetails, SlotDto } from '../types';

export function SuccessView({ details, slot }: { details: SchoolDetails; slot: SlotDto }) {
  return (
    <section className="rounded-2xl border border-mat-moss/40 bg-mat-moss/10 p-6 text-center">
      <h3 className="text-xl font-semibold text-mat-ink">Booked successfully</h3>
      <p className="mt-2 text-slate-200">Thanks {details.contactName}. We will see you at {slot.startUtc} UTC.</p>
      <p className="mt-2 text-xs text-slate-400">Vienna core synced with U.S. county routing.</p>
    </section>
  );
}
