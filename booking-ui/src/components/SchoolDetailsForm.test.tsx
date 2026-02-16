import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { SchoolDetailsForm } from './SchoolDetailsForm';

vi.mock('../utils/counties', () => ({
  US_STATES: ['California', 'Arizona'],
  countiesForState: (state: string) => {
    if (state === 'California') {
      return ['Los Angeles County'];
    }
    if (state === 'Arizona') {
      return ['Maricopa County'];
    }
    return [];
  },
  isCountyKnown: (state: string, county: string) =>
    (state === 'California' && county === 'Los Angeles County') ||
    (state === 'Arizona' && county === 'Maricopa County'),
}));

const baseValue = {
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

describe('SchoolDetailsForm', () => {
  it('shows required error when core fields are missing', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<SchoolDetailsForm value={baseValue} onBack={vi.fn()} onSubmit={onSubmit} />);

    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(screen.getByText('Please complete required fields.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits valid state/county details', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<SchoolDetailsForm value={baseValue} onBack={vi.fn()} onSubmit={onSubmit} />);

    await user.type(screen.getByPlaceholderText('School/Gym Name *'), 'MatBoss HQ');
    await user.type(screen.getByPlaceholderText('City *'), 'Los Angeles');
    const selects = screen.getAllByRole('combobox');
    await user.selectOptions(selects[0], 'California');
    await user.selectOptions(selects[1], 'Los Angeles County');
    await user.type(screen.getByPlaceholderText('Contact Name *'), 'Jamie Lee');
    await user.type(screen.getByPlaceholderText('Email *'), 'jamie@example.com');

    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      schoolName: 'MatBoss HQ',
      city: 'Los Angeles',
      state: 'California',
      county: 'Los Angeles County',
      contactName: 'Jamie Lee',
      email: 'jamie@example.com',
    });
  });
});
