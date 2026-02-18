import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import App from './App';

const useAuthMock = vi.fn();
const useRealtimeMock = vi.fn();

const apiMocks = {
  getProviders: vi.fn(),
  getAnalytics: vi.fn(),
  getDiscoveryLeads: vi.fn(),
  getEmailTemplates: vi.fn(),
  getEmailQueue: vi.fn(),
  getBlackoutDates: vi.fn(),
  getSettings: vi.fn(),
  updateLeadStatus: vi.fn(),
  setLeadFollowUp: vi.fn(),
  exportDiscoveryCsv: vi.fn(),
  createEmailTemplate: vi.fn(),
  previewEmailTemplate: vi.fn(),
  testSendEmail: vi.fn(),
  updateEmailTemplate: vi.fn(),
  enqueueEmail: vi.fn(),
  addBlackoutDate: vi.fn(),
  upsertSetting: vi.fn(),
};

vi.mock('./context/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('./hooks/useAdminRealtime', () => ({
  useAdminRealtime: (...args: unknown[]) => useRealtimeMock(...args),
}));

vi.mock('./api', () => ({
  getProviders: (...args: unknown[]) => apiMocks.getProviders(...args),
  getAnalytics: (...args: unknown[]) => apiMocks.getAnalytics(...args),
  getDiscoveryLeads: (...args: unknown[]) => apiMocks.getDiscoveryLeads(...args),
  getEmailTemplates: (...args: unknown[]) => apiMocks.getEmailTemplates(...args),
  getEmailQueue: (...args: unknown[]) => apiMocks.getEmailQueue(...args),
  getBlackoutDates: (...args: unknown[]) => apiMocks.getBlackoutDates(...args),
  getSettings: (...args: unknown[]) => apiMocks.getSettings(...args),
  updateLeadStatus: (...args: unknown[]) => apiMocks.updateLeadStatus(...args),
  setLeadFollowUp: (...args: unknown[]) => apiMocks.setLeadFollowUp(...args),
  exportDiscoveryCsv: (...args: unknown[]) => apiMocks.exportDiscoveryCsv(...args),
  createEmailTemplate: (...args: unknown[]) => apiMocks.createEmailTemplate(...args),
  previewEmailTemplate: (...args: unknown[]) => apiMocks.previewEmailTemplate(...args),
  testSendEmail: (...args: unknown[]) => apiMocks.testSendEmail(...args),
  updateEmailTemplate: (...args: unknown[]) => apiMocks.updateEmailTemplate(...args),
  enqueueEmail: (...args: unknown[]) => apiMocks.enqueueEmail(...args),
  addBlackoutDate: (...args: unknown[]) => apiMocks.addBlackoutDate(...args),
  upsertSetting: (...args: unknown[]) => apiMocks.upsertSetting(...args),
}));

describe('Admin App', () => {
  const createObjectURLMock = vi.fn(() => 'blob:csv');
  const revokeObjectURLMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: createObjectURLMock,
      revokeObjectURL: revokeObjectURLMock,
    });

    apiMocks.getProviders.mockResolvedValue([
      {
        id: 'provider-1',
        name: 'MatBoss Ops Team',
        timeZone: 'America/New_York',
        bookingUrl: 'matboss-ops',
        isActive: true,
      },
    ]);
    apiMocks.getAnalytics.mockResolvedValue({
      totalBookings: 12,
      confirmed: 10,
      pending: 2,
      conversionRate: 83.33,
      todayCalls: 4,
      leadFunnel: [{ status: 'new', count: '2' }],
      topStates: [{ state: 'Arizona', count: '4' }],
      monthComparison: { thisMonth: 5, lastMonth: 4, deltaPercent: 25 },
      weeklyTrend: [{ weekStart: '2026-03-01', count: '3' }],
      budgetBreakdown: [{ label: '$500-$1,500', count: '2' }],
      timelineBreakdown: [{ label: '30-60 days', count: '1' }],
      systemBreakdown: [{ label: 'Mindbody', count: '1' }],
      emailStats: { sent: 3, failed: 1, pending: 0 },
    });
    apiMocks.getDiscoveryLeads.mockResolvedValue([
      {
        id: 'lead-1',
        bookingId: 'booking-1',
        booking: {
          id: 'booking-1',
          providerId: 'provider-1',
          eventTypeId: 'event-1',
          customerName: 'Alex Rivera',
          customerEmail: 'alex@example.com',
          customerPhone: null,
          startTs: '2026-03-10T14:00:00.000Z',
          endTs: '2026-03-10T14:30:00.000Z',
          status: 'CONFIRMED',
          version: 1,
          createdAt: '2026-03-01T10:00:00.000Z',
        },
        schoolName: 'Phoenix MMA Academy',
        city: 'Phoenix',
        state: 'Arizona',
        county: 'Maricopa County',
        activeStudents: 150,
        instructorCount: 8,
        currentSystem: null,
        schedulingChallenges: null,
        budgetRange: null,
        implementationTimeline: null,
        leadStatus: 'new',
        followUpAt: null,
        adminNotes: null,
        qualificationScore: 88,
        createdAt: '2026-03-01T10:00:00.000Z',
        updatedAt: '2026-03-01T10:00:00.000Z',
      },
    ]);
    apiMocks.getEmailTemplates.mockResolvedValue([]);
    apiMocks.getEmailQueue.mockResolvedValue([]);
    apiMocks.getBlackoutDates.mockResolvedValue([]);
    apiMocks.getSettings.mockResolvedValue([]);
    apiMocks.updateLeadStatus.mockResolvedValue({ updated: true });
    apiMocks.setLeadFollowUp.mockResolvedValue({ updated: true });
    apiMocks.exportDiscoveryCsv.mockResolvedValue(new Blob(['a,b'], { type: 'text/csv' }));
    apiMocks.createEmailTemplate.mockResolvedValue({});
    apiMocks.previewEmailTemplate.mockResolvedValue({ html: '<p>preview</p>' });
    apiMocks.testSendEmail.mockResolvedValue({ sent: true });
    apiMocks.updateEmailTemplate.mockResolvedValue({});
    apiMocks.enqueueEmail.mockResolvedValue({});
    apiMocks.addBlackoutDate.mockResolvedValue({});
    apiMocks.upsertSetting.mockResolvedValue({});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function mockAuthenticated(): void {
    useAuthMock.mockReturnValue({
      token: 'token-123',
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
    });
  }

  it('submits login form when unauthenticated', async () => {
    const user = userEvent.setup();
    const login = vi.fn().mockResolvedValue(undefined);

    useAuthMock.mockReturnValue({
      token: null,
      isAuthenticated: false,
      login,
      logout: vi.fn(),
    });

    render(<App />);

    await user.type(screen.getByPlaceholderText('admin@matboss.online'), 'admin@matboss.online');
    await user.type(screen.getByPlaceholderText('********'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith('admin@matboss.online', 'password123');
    });
  });

  it('loads dashboard data and updates lead status from kanban', async () => {
    const user = userEvent.setup();

    mockAuthenticated();

    render(<App />);

    await waitFor(() => {
      expect(apiMocks.getAnalytics).toHaveBeenCalledWith('token-123');
    });

    expect(screen.getByText('MatBoss Admin Dashboard')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Leads' }));

    const qualifyButton = await screen.findByRole('button', { name: 'Mark Qualified' });
    await user.click(qualifyButton);

    await waitFor(() => {
      expect(apiMocks.updateLeadStatus).toHaveBeenCalledWith('token-123', {
        discoveryId: 'lead-1',
        leadStatus: 'qualified',
      });
    });
  });

  it('covers bookings modal, csv export, emails/settings actions, and keyboard navigation', async () => {
    const user = userEvent.setup();
    mockAuthenticated();

    render(<App />);

    expect(
      await screen.findByRole('heading', { name: 'MatBoss Admin Dashboard' }),
    ).toBeInTheDocument();

    const bookingsTab = screen.getByRole('button', { name: 'Bookings' });
    bookingsTab.focus();
    await user.keyboard('{Enter}');

    await user.click(await screen.findByRole('button', { name: 'View' }));
    expect(screen.getByRole('heading', { name: 'Booking + Lead Detail' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Close' }));

    await user.click(screen.getByRole('button', { name: 'Export CSV' }));
    expect(apiMocks.exportDiscoveryCsv).toHaveBeenCalledWith('token-123');
    expect(createObjectURLMock).toHaveBeenCalled();
    expect(revokeObjectURLMock).toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Emails' }));

    await user.click(screen.getByRole('button', { name: 'Save template' }));
    await waitFor(() => {
      expect(apiMocks.createEmailTemplate).toHaveBeenCalledWith(
        'token-123',
        expect.objectContaining({ key: 'discovery-follow-up' }),
      );
    });

    await user.click(screen.getByRole('button', { name: 'Queue' }));

    const toInput = screen.getByRole('textbox', { name: 'To' });
    await user.clear(toInput);
    await user.type(toInput, 'owner@academy.com');
    await user.click(screen.getByRole('button', { name: 'Queue email' }));
    await waitFor(() => {
      expect(apiMocks.enqueueEmail).toHaveBeenCalledWith(
        'token-123',
        expect.objectContaining({ to: 'owner@academy.com' }),
      );
    });

    await user.click(screen.getByRole('button', { name: 'Blackout Dates' }));
    await user.click(screen.getByRole('button', { name: 'Add blackout date' }));
    await waitFor(() => {
      expect(apiMocks.addBlackoutDate).toHaveBeenCalledWith(
        'token-123',
        expect.objectContaining({ providerId: 'provider-1' }),
      );
    });

    await user.click(screen.getByRole('button', { name: 'Settings' }));
    await user.click(screen.getByRole('button', { name: 'Save settings' }));

    await waitFor(() => {
      expect(apiMocks.upsertSetting).toHaveBeenCalledWith(
        'token-123',
        'call_config',
        expect.any(Object),
      );
    });
    expect(apiMocks.upsertSetting).toHaveBeenCalledWith(
      'token-123',
      'security_password_policy',
      expect.any(Object),
    );
  }, 15000);
});
