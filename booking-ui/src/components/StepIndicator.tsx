import type { BookingStep } from '../types';

const labels = ['Date', 'Time', 'School', 'Review', 'Booked'];

export function StepIndicator({ step }: { step: BookingStep }) {
  const pct = ((step - 1) / 4) * 100;

  return (
    <nav aria-label="Booking progress" className="mb-6">
      <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-mat-cyan to-mat-gold transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <ol className="grid grid-cols-5 gap-2">
        {labels.map((label, index) => {
          const current = step === index + 1;
          const complete = step > index + 1;
          return (
            <li key={label} className="text-center text-xs md:text-sm">
              <div
                className={`rounded-full border px-2 py-1 ${
                  current
                    ? 'border-mat-cyan bg-mat-cyan/20 text-mat-ink'
                    : complete
                      ? 'border-mat-moss bg-mat-moss/20 text-mat-ink'
                      : 'border-white/15 bg-mat-panel text-slate-400'
                }`}
              >
                {index + 1}. {label}
              </div>
              <p className="mt-1 text-[10px] text-slate-500">Step toward faster response</p>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
