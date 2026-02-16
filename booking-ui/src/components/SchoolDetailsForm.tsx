import { useMemo, useState } from 'react';

import type { SchoolDetails } from '../types';
import { countiesForState, isCountyKnown, US_STATES } from '../utils/counties';

const initial: SchoolDetails = {
  schoolName: '',
  city: '',
  state: '',
  county: '',
  contactName: '',
  email: '',
  phone: '',
  activeStudents: 0,
  instructorCount: 1,
  currentSystem: '',
  schedulingChallenges: '',
  budgetRange: '',
  implementationTimeline: '',
};

export function SchoolDetailsForm({
  value,
  onBack,
  onSubmit,
}: {
  value: SchoolDetails;
  onBack: () => void;
  onSubmit: (next: SchoolDetails) => void;
}) {
  const [form, setForm] = useState<SchoolDetails>(value.schoolName ? value : initial);
  const [error, setError] = useState<string>('');

  const countyOptions = useMemo(() => countiesForState(form.state), [form.state]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();

    if (!form.schoolName || !form.city || !form.state || !form.county || !form.contactName || !form.email) {
      setError('Please complete required fields.');
      return;
    }

    if (!isCountyKnown(form.state, form.county)) {
      setError('County selection does not match selected state.');
      return;
    }

    setError('');
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-white/10 bg-mat-surface p-5">
      <div>
        <h3 className="text-sm uppercase tracking-wide text-slate-400">Step 3 · School details</h3>
        <p className="text-xs text-slate-500">Vienna-time paradox: responses stay under 3 minutes while you sleep.</p>
      </div>
      <section className="grid gap-3 md:grid-cols-2">
        <input className="input" placeholder="School/Gym Name *" value={form.schoolName} onChange={(e) => setForm({ ...form, schoolName: e.target.value })} />
        <input className="input" placeholder="City *" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        <select className="input" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value, county: '' })}>
          <option value="">State *</option>
          {US_STATES.map((state) => (
            <option key={state} value={state}>{state}</option>
          ))}
        </select>
        <select className="input" value={form.county} onChange={(e) => setForm({ ...form, county: e.target.value })}>
          <option value="">County *</option>
          {countyOptions.map((county) => (
            <option key={county} value={county}>{county}</option>
          ))}
        </select>
      </section>
      <section className="grid gap-3 md:grid-cols-2">
        <input className="input" placeholder="Contact Name *" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
        <input className="input" type="email" placeholder="Email *" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input className="input" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
      </section>
      <section className="grid gap-3 md:grid-cols-2">
        <input className="input" type="number" min={1} placeholder="Active Students" value={form.activeStudents || ''} onChange={(e) => setForm({ ...form, activeStudents: Number(e.target.value) })} />
        <input className="input" type="number" min={1} max={200} placeholder="Instructor Count" value={form.instructorCount || ''} onChange={(e) => setForm({ ...form, instructorCount: Number(e.target.value) })} />
        <input className="input" placeholder="Current System" value={form.currentSystem} onChange={(e) => setForm({ ...form, currentSystem: e.target.value })} />
        <input className="input" placeholder="Budget Range" value={form.budgetRange} onChange={(e) => setForm({ ...form, budgetRange: e.target.value })} />
        <input className="input" placeholder="Implementation Timeline" value={form.implementationTimeline} onChange={(e) => setForm({ ...form, implementationTimeline: e.target.value })} />
        <textarea className="input md:col-span-2" placeholder="Scheduling Challenges" value={form.schedulingChallenges} onChange={(e) => setForm({ ...form, schedulingChallenges: e.target.value })} />
      </section>
      {error && <p className="rounded-lg border border-mat-rose/50 bg-mat-rose/10 px-3 py-2 text-sm text-mat-rose">{error}</p>}
      <div className="flex gap-2">
        <button type="button" className="btn-secondary" onClick={onBack}>Back</button>
        <button type="submit" className="btn-primary">Continue</button>
      </div>
    </form>
  );
}
