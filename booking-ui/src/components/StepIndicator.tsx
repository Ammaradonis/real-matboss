import type { BookingStep } from '../types';

const labels = ['Date', 'Time', 'School', 'Confirm', 'Success'];

export function StepIndicator({ step }: { step: BookingStep }) {
  return (
    <nav aria-label="Booking progress" className="mb-6">
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
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
