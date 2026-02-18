import type { SchoolDetails, SlotDto } from '../types';

export function SuccessView({
  details,
  slot,
  bookingId,
}: {
  details: SchoolDetails;
  slot: SlotDto;
  bookingId?: string;
}) {
  return (
    <section className="rounded-2xl border border-mat-moss/40 bg-mat-moss/10 p-6 text-center">
      <div className="victory-burst mx-auto mb-4" aria-hidden="true">
        <span className="spark spark-a" />
        <span className="spark spark-b" />
        <span className="spark spark-c" />
      </div>
      <h3 className="text-xl font-semibold text-mat-ink">Discovery Call Confirmed</h3>
      <p className="mt-2 text-slate-200">
        {details.contactName}, your booking is locked for {slot.startUtc} UTC.
      </p>
      <p className="mt-2 text-xs text-slate-300">
        County routing complete for {details.county}, {details.state}. Vienna operations notified.
      </p>
      {bookingId ? <p className="mt-2 text-xs text-slate-400">Booking ID: {bookingId}</p> : null}
    </section>
  );
}
