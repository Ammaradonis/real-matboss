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
  preferredContactMethod: 'email',
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
  const validEmail = /\S+@\S+\.\S+/.test(form.email);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();

    if (!form.schoolName || !form.city || !form.state || !form.county || !form.contactName || !form.email) {
      setError('Please complete required fields.');
      return;
    }

    if (!validEmail) {
      setError('Enter a valid email address.');
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
        <h3 className="text-sm uppercase tracking-[0.2em] text-slate-300">Step 3 · School Details</h3>
        <p className="text-xs text-slate-400">Tell us your current workflow so the discovery call stays focused and actionable.</p>
      </div>

      <section className="rounded-xl border border-white/10 bg-mat-panel/50 p-4">
        <h4 className="mb-3 text-xs uppercase tracking-[0.2em] text-mat-gold">Section 1 · School Information</h4>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="field">
            <span>School or Gym Name *</span>
            <input
              className="input"
              value={form.schoolName}
              onChange={(e) => setForm({ ...form, schoolName: e.target.value })}
            />
          </label>
          <label className="field">
            <span>City *</span>
            <input className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </label>
          <label className="field">
            <span>State *</span>
            <select
              className="input"
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value, county: '' })}
            >
              <option value="">Choose State</option>
              {US_STATES.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>County *</span>
            <select
              className="input"
              value={form.county}
              onChange={(e) => setForm({ ...form, county: e.target.value })}
            >
              <option value="">Choose County</option>
              {countyOptions.map((county) => (
                <option key={county} value={county}>
                  {county}
                </option>
              ))}
            </select>
          </label>
          <label className="field md:col-span-2">
            <span>Active Students ({form.activeStudents || 0})</span>
            <input
              className="w-full accent-mat-cyan"
              type="range"
              min={0}
              max={1000}
              step={10}
              value={form.activeStudents || 0}
              onChange={(e) => setForm({ ...form, activeStudents: Number(e.target.value) })}
            />
          </label>
          <label className="field">
            <span>Instructor Count</span>
            <input
              className="input"
              type="number"
              min={1}
              max={200}
              value={form.instructorCount || ''}
              onChange={(e) => setForm({ ...form, instructorCount: Number(e.target.value) })}
            />
          </label>
          <label className="field">
            <span>Current Booking System</span>
            <select
              className="input"
              value={form.currentSystem}
              onChange={(e) => setForm({ ...form, currentSystem: e.target.value })}
            >
              <option value="">Choose Current System</option>
              <option value="Mindbody">Mindbody</option>
              <option value="Zen Planner">Zen Planner</option>
              <option value="Kicksite">Kicksite</option>
              <option value="Spark Membership">Spark Membership</option>
              <option value="Google Calendar">Google Calendar</option>
              <option value="Manual process">Manual process</option>
              <option value="Other">Other</option>
            </select>
          </label>
        </div>
      </section>

      <section className="rounded-xl border border-white/10 bg-mat-panel/50 p-4">
        <h4 className="mb-3 text-xs uppercase tracking-[0.2em] text-mat-gold">Section 2 · Contact Information</h4>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="field">
            <span>Contact Name *</span>
            <input
              className="input"
              value={form.contactName}
              onChange={(e) => setForm({ ...form, contactName: e.target.value })}
            />
          </label>
          <label className="field">
            <span>Email *</span>
            <input
              className="input"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </label>
          <label className="field">
            <span>Phone</span>
            <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </label>
          <label className="field">
            <span>Preferred Contact Method</span>
            <select
              className="input"
              value={form.preferredContactMethod}
              onChange={(e) =>
                setForm({
                  ...form,
                  preferredContactMethod: e.target.value as SchoolDetails['preferredContactMethod'],
                })
              }
            >
              <option value="email">Email</option>
              <option value="phone">Phone</option>
              <option value="text">Text</option>
            </select>
          </label>
        </div>
      </section>

      <section className="rounded-xl border border-white/10 bg-mat-panel/50 p-4">
        <h4 className="mb-3 text-xs uppercase tracking-[0.2em] text-mat-gold">Section 3 · Discovery Call Goals</h4>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="field">
            <span>Monthly Budget Range</span>
            <select
              className="input"
              value={form.budgetRange}
              onChange={(e) => setForm({ ...form, budgetRange: e.target.value })}
            >
              <option value="">Choose Budget Range</option>
              <option value="Under $500">Under $500</option>
              <option value="$500 - $1,500">$500 - $1,500</option>
              <option value="$1,500 - $3,000">$1,500 - $3,000</option>
              <option value="$3,000+">$3,000+</option>
            </select>
          </label>
          <label className="field">
            <span>Implementation Timeline</span>
            <select
              className="input"
              value={form.implementationTimeline}
              onChange={(e) => setForm({ ...form, implementationTimeline: e.target.value })}
            >
              <option value="">Choose Timeline</option>
              <option value="ASAP (0-30 days)">ASAP (0-30 days)</option>
              <option value="30-60 days">30-60 days</option>
              <option value="60-90 days">60-90 days</option>
              <option value="Exploring only">Exploring only</option>
            </select>
          </label>
          <label className="field md:col-span-2">
            <span>Scheduling Challenges</span>
            <textarea
              className="input min-h-28"
              value={form.schedulingChallenges}
              onChange={(e) => setForm({ ...form, schedulingChallenges: e.target.value })}
            />
          </label>
        </div>
      </section>

      {error && <p className="rounded-lg border border-mat-rose/50 bg-mat-rose/10 px-3 py-2 text-sm text-mat-rose">{error}</p>}
      <div className="flex gap-2">
        <button type="button" className="btn-secondary" onClick={onBack}>
          Back
        </button>
        <button type="submit" className="btn-primary">
          Continue
        </button>
      </div>
    </form>
  );
}
