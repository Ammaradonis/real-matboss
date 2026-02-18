import { format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import {
  addBlackoutDate,
  createEmailTemplate,
  enqueueEmail,
  exportDiscoveryCsv,
  getAnalytics,
  getBlackoutDates,
  getDiscoveryLeads,
  getEmailQueue,
  getEmailTemplates,
  getProviders,
  getSettings,
  previewEmailTemplate,
  setLeadFollowUp,
  testSendEmail,
  updateEmailTemplate,
  updateLeadStatus,
  upsertSetting,
} from './api';
import { useAuth } from './context/AuthContext';
import { useAdminRealtime } from './hooks/useAdminRealtime';
import type {
  AdminSetting,
  AnalyticsResponse,
  BlackoutDate,
  DiscoveryLead,
  EmailQueueItem,
  EmailTemplate,
  LeadStatus,
  Provider,
} from './types';

const VIENNA_TZ = 'Europe/Vienna';

const LEAD_COLUMNS: Array<{ label: string; key: LeadStatus }> = [
  { label: 'New Recruits', key: 'new' },
  { label: 'Contacted Allies', key: 'contacted' },
  { label: 'Qualified Warriors', key: 'qualified' },
  { label: 'Proposal Battles', key: 'proposal' },
  { label: 'Closed Won Victories', key: 'closed_won' },
  { label: 'Closed Lost', key: 'closed_lost' },
];

type TabKey = 'dashboard' | 'bookings' | 'leads' | 'emails' | 'settings';
type EmailTabKey = 'templates' | 'queue' | 'blackout';
type QueueFilter = 'all' | 'PENDING' | 'SENT' | 'FAILED';

interface SettingsState {
  providerId: string;
  defaultDurationMinutes: number;
  minimumNoticeHours: number;
  maximumAdvanceDays: number;
  bufferMinutes: number;
  adminTimezone: string;
  enforce2fa: boolean;
  rotationDays: number;
}

function numericRows(rows: Array<{ label: string; count: string }>): Array<{ label: string; count: number }> {
  return rows.map((row) => ({ label: row.label, count: Number.parseInt(row.count, 10) || 0 }));
}

function toNumber(value: string): number {
  return Number.parseInt(value, 10) || 0;
}

function DashboardBarChart({
  title,
  data,
  color,
}: {
  title: string;
  data: Array<{ label: string; count: number }>;
  color: string;
}) {
  return (
    <article className="panel">
      <h3 className="text-lg font-semibold">{title}</h3>
      <div className="mt-3 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
            <XAxis dataKey="label" tick={{ fill: '#cdd7e3', fontSize: 11 }} />
            <YAxis tick={{ fill: '#cdd7e3', fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                background: '#142033',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '0.75rem',
              }}
            />
            <Bar dataKey="count" fill={color} radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}

function App() {
  const { token, isAuthenticated, login, logout } = useAuth();

  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [emailTab, setEmailTab] = useState<EmailTabKey>('templates');
  const [queueFilter, setQueueFilter] = useState<QueueFilter>('all');

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [providers, setProviders] = useState<Provider[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [leads, setLeads] = useState<DiscoveryLead[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [queue, setQueue] = useState<EmailQueueItem[]>([]);
  const [blackoutDates, setBlackoutDates] = useState<BlackoutDate[]>([]);
  const [settings, setSettings] = useState<AdminSetting[]>([]);

  const [leadSearch, setLeadSearch] = useState('');
  const [leadFilter, setLeadFilter] = useState<LeadStatus | 'all'>('all');
  const [bookingSearch, setBookingSearch] = useState('');
  const [bookingStatus, setBookingStatus] = useState<'all' | 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'NO_SHOW'>('all');

  const [selectedLead, setSelectedLead] = useState<DiscoveryLead | null>(null);
  const [modalLeadStatus, setModalLeadStatus] = useState<LeadStatus>('new');
  const [modalNote, setModalNote] = useState('');

  const [templateForm, setTemplateForm] = useState({
    key: 'discovery-follow-up',
    name: 'Discovery Follow Up',
    category: 'discovery',
    subject: 'Your MatBoss Discovery Call Follow-Up',
    htmlBody: '<p>Hi {{booking.customerName}}, thanks for speaking with MatBoss.</p>',
    textBody: 'Hi {{booking.customerName}}, thanks for speaking with MatBoss.',
    variables: 'booking.customerName,booking.startTs',
  });
  const [templatePreview, setTemplatePreview] = useState('');
  const [templateTestEmail, setTemplateTestEmail] = useState('');

  const [queueForm, setQueueForm] = useState({
    to: '',
    subject: 'MatBoss Update',
    htmlBody: '<p>Thanks for connecting with MatBoss.</p>',
    scheduledAt: '',
  });

  const [blackoutForm, setBlackoutForm] = useState({
    providerId: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    reason: 'Internal training day',
  });

  const [settingsForm, setSettingsForm] = useState<SettingsState>({
    providerId: '',
    defaultDurationMinutes: 30,
    minimumNoticeHours: 2,
    maximumAdvanceDays: 60,
    bufferMinutes: 10,
    adminTimezone: 'America/New_York',
    enforce2fa: false,
    rotationDays: 90,
  });

  const providerIds = useMemo(() => providers.map((item) => item.id), [providers]);

  const loadProviders = useCallback(async () => {
    if (!token) {
      return;
    }

    const data = await getProviders(token);
    setProviders(data);
    setBlackoutForm((prev) => ({ ...prev, providerId: prev.providerId || data[0]?.id || '' }));
    setSettingsForm((prev) => ({ ...prev, providerId: prev.providerId || data[0]?.id || '' }));
  }, [token]);

  const loadAnalytics = useCallback(async () => {
    if (!token) {
      return;
    }
    const data = await getAnalytics(token);
    setAnalytics(data);
  }, [token]);

  const loadLeads = useCallback(async () => {
    if (!token) {
      return;
    }
    const data = await getDiscoveryLeads(token, leadSearch, leadFilter);
    setLeads(data);
  }, [leadFilter, leadSearch, token]);

  const loadEmails = useCallback(async () => {
    if (!token) {
      return;
    }
    const [templateRows, queueRows, blackoutRows] = await Promise.all([
      getEmailTemplates(token),
      getEmailQueue(token),
      getBlackoutDates(token),
    ]);
    setTemplates(templateRows);
    setQueue(queueRows);
    setBlackoutDates(blackoutRows);
  }, [token]);

  const loadSettings = useCallback(async () => {
    if (!token) {
      return;
    }
    const rows = await getSettings(token);
    setSettings(rows);

    const callConfig = rows.find((item) => item.key === 'call_config')?.value;
    const security = rows.find((item) => item.key === 'security_password_policy')?.value;

    setSettingsForm((prev) => ({
      providerId: String(callConfig?.providerId ?? prev.providerId),
      defaultDurationMinutes: Number(callConfig?.defaultDurationMinutes ?? prev.defaultDurationMinutes),
      minimumNoticeHours: Number(callConfig?.minimumNoticeHours ?? prev.minimumNoticeHours),
      maximumAdvanceDays: Number(callConfig?.maximumAdvanceDays ?? prev.maximumAdvanceDays),
      bufferMinutes: Number(callConfig?.bufferMinutes ?? prev.bufferMinutes),
      adminTimezone: String(callConfig?.adminTimezone ?? prev.adminTimezone),
      enforce2fa: Boolean(security?.enforce2fa ?? prev.enforce2fa),
      rotationDays: Number(security?.rotationDays ?? prev.rotationDays),
    }));
  }, [token]);

  const loadAll = useCallback(async () => {
    if (!token) {
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      await Promise.all([loadProviders(), loadAnalytics(), loadLeads(), loadEmails(), loadSettings()]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  }, [loadAnalytics, loadEmails, loadLeads, loadProviders, loadSettings, token]);

  const handleRealtimeEvent = useCallback(() => {
    void loadAnalytics();
    void loadLeads();
  }, [loadAnalytics, loadLeads]);

  useAdminRealtime(providerIds, handleRealtimeEvent);

  useEffect(() => {
    if (token) {
      void loadAll();
    }
  }, [token, loadAll]);

  useEffect(() => {
    if (selectedLead) {
      setModalLeadStatus(selectedLead.leadStatus);
      setModalNote(selectedLead.adminNotes ?? '');
    }
  }, [selectedLead]);

  const bookingsRows = useMemo(
    () =>
      leads
        .filter((lead) => lead.booking)
        .filter((lead) => {
          const booking = lead.booking!;
          if (bookingStatus !== 'all' && booking.status !== bookingStatus) {
            return false;
          }
          const q = bookingSearch.trim().toLowerCase();
          if (!q) {
            return true;
          }
          return (
            lead.schoolName.toLowerCase().includes(q) ||
            booking.customerName.toLowerCase().includes(q) ||
            booking.customerEmail.toLowerCase().includes(q) ||
            `${lead.city} ${lead.state}`.toLowerCase().includes(q)
          );
        })
        .map((lead) => ({ lead, booking: lead.booking! })),
    [bookingSearch, bookingStatus, leads],
  );

  const groupedLeads = useMemo(() => {
    return LEAD_COLUMNS.reduce<Record<LeadStatus, DiscoveryLead[]>>(
      (acc, item) => {
        acc[item.key] = leads.filter((lead) => lead.leadStatus === item.key);
        return acc;
      },
      {
        new: [],
        contacted: [],
        qualified: [],
        proposal: [],
        closed_won: [],
        closed_lost: [],
      },
    );
  }, [leads]);

  const statsCards = useMemo(() => {
    if (!analytics) {
      return [];
    }
    const avgStudents =
      leads.length > 0 ? Math.round(leads.reduce((sum, lead) => sum + lead.activeStudents, 0) / leads.length) : 0;

    return [
      { label: 'Total Bookings', value: analytics.totalBookings },
      { label: 'Confirmed', value: analytics.confirmed },
      { label: 'Pending', value: analytics.pending },
      { label: 'Avg Students', value: avgStudents },
      { label: 'Conversion Rate', value: `${analytics.conversionRate}%` },
      { label: 'This Month', value: analytics.monthComparison.thisMonth },
      { label: 'Emails Sent', value: analytics.emailStats.sent ?? 0 },
      { label: 'Total Leads', value: leads.length },
    ];
  }, [analytics, leads]);

  const leadFunnelData = useMemo(
    () => (analytics ? analytics.leadFunnel.map((row) => ({ label: row.status, count: toNumber(row.count) })) : []),
    [analytics],
  );

  const weeklyTrendData = useMemo(
    () =>
      analytics
        ? analytics.weeklyTrend.map((row) => ({
            label: row.weekStart.slice(5),
            count: toNumber(row.count),
          }))
        : [],
    [analytics],
  );

  const budgetData = useMemo(
    () => (analytics ? numericRows(analytics.budgetBreakdown).slice(0, 8) : []),
    [analytics],
  );

  const timelineData = useMemo(
    () => (analytics ? numericRows(analytics.timelineBreakdown).slice(0, 8) : []),
    [analytics],
  );

  const systemData = useMemo(
    () => (analytics ? numericRows(analytics.systemBreakdown).slice(0, 8) : []),
    [analytics],
  );

  const filteredQueue = useMemo(
    () => (queueFilter === 'all' ? queue : queue.filter((item) => item.status === queueFilter)),
    [queue, queueFilter],
  );

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') ?? '');
    const password = String(form.get('password') ?? '');

    setError('');
    setIsLoading(true);
    try {
      await login(email, password);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const moveLeadStatus = async (discoveryId: string, leadStatus: LeadStatus, note?: string) => {
    if (!token) {
      return;
    }
    try {
      await updateLeadStatus(token, { discoveryId, leadStatus, note });
      await Promise.all([loadLeads(), loadAnalytics()]);
    } catch (leadError) {
      setError(leadError instanceof Error ? leadError.message : 'Lead update failed');
    }
  };

  const setTomorrowFollowUp = async (discoveryId: string) => {
    if (!token) {
      return;
    }
    const followUpAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    try {
      await setLeadFollowUp(token, { discoveryId, followUpAt, note: 'Follow-up scheduled from dashboard.' });
      await loadLeads();
    } catch (followError) {
      setError(followError instanceof Error ? followError.message : 'Unable to schedule follow-up');
    }
  };

  const handleCsvExport = async () => {
    if (!token) {
      return;
    }
    try {
      const blob = await exportDiscoveryCsv(token);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'discovery-leads.csv';
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (csvError) {
      setError(csvError instanceof Error ? csvError.message : 'CSV export failed');
    }
  };

  const handleTemplateCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      return;
    }
    try {
      await createEmailTemplate(token, {
        key: templateForm.key,
        name: templateForm.name,
        category: templateForm.category,
        subject: templateForm.subject,
        htmlBody: templateForm.htmlBody,
        textBody: templateForm.textBody,
        variables: templateForm.variables
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean),
      });
      await loadEmails();
    } catch (templateError) {
      setError(templateError instanceof Error ? templateError.message : 'Template creation failed');
    }
  };

  const handleTemplatePreview = async () => {
    if (!token) {
      return;
    }
    try {
      const payload = await previewEmailTemplate(token, {
        htmlBody: templateForm.htmlBody,
        variables: {
          booking: {
            customerName: 'Sample Owner',
            startTs: new Date().toISOString(),
          },
        },
      });
      setTemplatePreview(payload.html);
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : 'Template preview failed');
    }
  };

  const handleTemplateTestSend = async () => {
    if (!token || !templateTestEmail) {
      return;
    }
    try {
      await testSendEmail(token, {
        to: templateTestEmail,
        subject: templateForm.subject,
        htmlBody: templateForm.htmlBody,
      });
      setError('');
    } catch (testError) {
      setError(testError instanceof Error ? testError.message : 'Test send failed');
    }
  };

  const handleTemplateToggle = async (template: EmailTemplate) => {
    if (!token) {
      return;
    }
    try {
      await updateEmailTemplate(token, template.id, { isActive: !template.isActive });
      await loadEmails();
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : 'Template update failed');
    }
  };

  const handleQueueCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      return;
    }
    try {
      await enqueueEmail(token, {
        to: queueForm.to,
        subject: queueForm.subject,
        htmlBody: queueForm.htmlBody,
        scheduledAt: queueForm.scheduledAt ? new Date(queueForm.scheduledAt).toISOString() : undefined,
      });
      await loadEmails();
    } catch (queueError) {
      setError(queueError instanceof Error ? queueError.message : 'Queueing email failed');
    }
  };

  const handleBlackoutCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      return;
    }
    try {
      await addBlackoutDate(token, blackoutForm);
      await loadEmails();
    } catch (blackoutError) {
      setError(blackoutError instanceof Error ? blackoutError.message : 'Blackout date save failed');
    }
  };

  const handleSettingsSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      return;
    }

    try {
      await Promise.all([
        upsertSetting(token, 'call_config', {
          providerId: settingsForm.providerId,
          defaultDurationMinutes: settingsForm.defaultDurationMinutes,
          minimumNoticeHours: settingsForm.minimumNoticeHours,
          maximumAdvanceDays: settingsForm.maximumAdvanceDays,
          bufferMinutes: settingsForm.bufferMinutes,
          adminTimezone: settingsForm.adminTimezone,
        }),
        upsertSetting(token, 'security_password_policy', {
          enforce2fa: settingsForm.enforce2fa,
          rotationDays: settingsForm.rotationDays,
        }),
      ]);
      await loadSettings();
    } catch (settingsError) {
      setError(settingsError instanceof Error ? settingsError.message : 'Settings save failed');
    }
  };

  const handlePasswordChange = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('Password change endpoint is not available in the current backend build.');
  };

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-admin-bg text-admin-ink">
        <div className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-4 py-16">
          <form onSubmit={handleLogin} className="w-full rounded-2xl border border-white/10 bg-admin-surface p-8 shadow-panel">
            <p className="text-sm uppercase tracking-[0.3em] text-admin-sky">MatBoss Admin</p>
            <h1 className="mt-3 text-3xl font-semibold">Operations dashboard</h1>
            <p className="mt-2 text-sm text-slate-300">Login with your admin account. Auth token is saved as admin_token.</p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="field">
                <span>Email</span>
                <input name="email" type="email" required placeholder="admin@matboss.online" />
              </label>
              <label className="field">
                <span>Password</span>
                <input name="password" type="password" required minLength={8} placeholder="********" />
              </label>
            </div>

            {error ? <p className="mt-4 rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-200">{error}</p> : null}

            <button className="btn-primary mt-6" type="submit" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
      </main>
    );
  }

  const tabButton = (tab: TabKey, label: string) => (
    <button
      key={tab}
      className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
        activeTab === tab ? 'bg-admin-panel text-admin-ink' : 'text-slate-300 hover:bg-white/10'
      }`}
      type="button"
      onClick={() => setActiveTab(tab)}
    >
      {label}
    </button>
  );

  return (
    <main className="min-h-screen bg-admin-bg text-admin-ink">
      <div className="mx-auto w-full max-w-7xl px-4 pb-12 pt-8 lg:px-6">
        <header className="mb-6 rounded-2xl border border-white/10 bg-gradient-to-r from-admin-surface via-admin-panel to-admin-surface p-6 shadow-panel">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.32em] text-admin-mint">Vienna-aligned operations</p>
              <h1 className="mt-2 text-2xl font-semibold">MatBoss Admin Dashboard</h1>
              <p className="mt-1 text-sm text-slate-300">
                Live view uses {VIENNA_TZ} for reporting and timezone-safe booking operations.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button type="button" className="btn-secondary" onClick={() => void loadAll()}>
                Refresh
              </button>
              <button type="button" className="btn-secondary" onClick={logout}>
                Logout
              </button>
            </div>
          </div>

          <nav className="mt-5 flex flex-wrap gap-2">
            {tabButton('dashboard', 'Dashboard')}
            {tabButton('bookings', 'Bookings')}
            {tabButton('leads', 'Leads')}
            {tabButton('emails', 'Emails')}
            {tabButton('settings', 'Settings')}
          </nav>
        </header>

        {error ? <p className="mb-5 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</p> : null}
        {isLoading ? <p className="mb-5 text-sm text-slate-300">Loading dashboard data...</p> : null}

        {activeTab === 'dashboard' && analytics ? (
          <section className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {statsCards.map((item) => (
                <article key={item.label} className="panel">
                  <p className="panel-label">{item.label}</p>
                  <p className="panel-value">{item.value}</p>
                </article>
              ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <DashboardBarChart title="Lead Funnel" data={leadFunnelData} color="#72b4ff" />
              <article className="panel">
                <h3 className="text-lg font-semibold">Top States</h3>
                <ul className="mt-3 space-y-2 text-sm text-slate-200">
                  {analytics.topStates.map((item) => (
                    <li key={`${item.state}-${item.count}`} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                      <span>{item.state || 'Unknown'}</span>
                      <strong>{item.count}</strong>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-slate-400">
                  Geographic concentration helps prioritize outreach and routing coverage.
                </p>
              </article>
            </div>

            <DashboardBarChart title="12-Week Booking Trend" data={weeklyTrendData} color="#f2b560" />

            <div className="grid gap-4 lg:grid-cols-3">
              <DashboardBarChart title="Budget Breakdown" data={budgetData} color="#76d3b7" />
              <DashboardBarChart title="Timeline Breakdown" data={timelineData} color="#ff8f79" />
              <DashboardBarChart title="Current Systems" data={systemData} color="#72b4ff" />
            </div>
          </section>
        ) : null}

        {activeTab === 'bookings' ? (
          <section className="space-y-4">
            <div className="panel">
              <div className="grid gap-3 md:grid-cols-3">
                <label className="field">
                  <span>Search</span>
                  <input
                    value={bookingSearch}
                    onChange={(event) => setBookingSearch(event.target.value)}
                    placeholder="Customer, school, location"
                  />
                </label>
                <label className="field">
                  <span>Status Filter</span>
                  <select
                    value={bookingStatus}
                    onChange={(event) =>
                      setBookingStatus(event.target.value as 'all' | 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'NO_SHOW')
                    }
                  >
                    <option value="all">All statuses</option>
                    <option value="PENDING">Pending</option>
                    <option value="CONFIRMED">Confirmed</option>
                    <option value="CANCELLED">Cancelled</option>
                    <option value="NO_SHOW">No Show</option>
                  </select>
                </label>
                <div className="flex items-end">
                  <button type="button" className="btn-primary w-full" onClick={handleCsvExport}>
                    Export CSV
                  </button>
                </div>
              </div>
            </div>

            <section className="panel">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-xs uppercase tracking-wide text-slate-300">
                    <tr>
                      <th className="px-2 py-3">School</th>
                      <th className="px-2 py-3">Date (Vienna)</th>
                      <th className="px-2 py-3">Location</th>
                      <th className="px-2 py-3">Students</th>
                      <th className="px-2 py-3">Score</th>
                      <th className="px-2 py-3">Lead Status</th>
                      <th className="px-2 py-3">Booking</th>
                      <th className="px-2 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookingsRows.map(({ lead, booking }) => (
                      <tr key={lead.id} className="border-t border-white/10 text-slate-100">
                        <td className="px-2 py-3">
                          <p className="font-medium">{lead.schoolName}</p>
                          <p className="text-xs text-slate-400">{booking.customerName}</p>
                        </td>
                        <td className="px-2 py-3">{formatInTimeZone(new Date(booking.startTs), VIENNA_TZ, 'MMM d, yyyy HH:mm')}</td>
                        <td className="px-2 py-3">{lead.city}, {lead.state}</td>
                        <td className="px-2 py-3">{lead.activeStudents}</td>
                        <td className="px-2 py-3">{lead.qualificationScore}</td>
                        <td className="px-2 py-3">{lead.leadStatus}</td>
                        <td className="px-2 py-3">{booking.status}</td>
                        <td className="px-2 py-3">
                          <button type="button" className="btn-ghost" onClick={() => setSelectedLead(lead)}>
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </section>
        ) : null}

        {activeTab === 'leads' ? (
          <section className="space-y-4">
            <div className="panel">
              <div className="grid gap-3 md:grid-cols-3">
                <label className="field">
                  <span>Search</span>
                  <input
                    value={leadSearch}
                    onChange={(event) => setLeadSearch(event.target.value)}
                    placeholder="School, email, customer"
                  />
                </label>
                <label className="field">
                  <span>Status Filter</span>
                  <select value={leadFilter} onChange={(event) => setLeadFilter(event.target.value as LeadStatus | 'all')}>
                    <option value="all">All statuses</option>
                    {LEAD_COLUMNS.map((item) => (
                      <option key={item.key} value={item.key}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex items-end">
                  <button type="button" className="btn-secondary w-full" onClick={() => void loadLeads()}>
                    Apply filters
                  </button>
                </div>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              {LEAD_COLUMNS.map((column) => (
                <article key={column.key} className="panel">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-semibold">{column.label}</h3>
                    <span className="rounded-full bg-white/10 px-2 py-1 text-xs">{groupedLeads[column.key].length}</span>
                  </div>
                  <div className="space-y-3">
                    {groupedLeads[column.key].map((lead) => (
                      <div key={lead.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                        <p className="font-medium">{lead.schoolName}</p>
                        <p className="text-xs text-slate-300">{lead.city}, {lead.state}</p>
                        <p className="mt-1 text-xs text-slate-400">Score: {lead.qualificationScore}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {column.key !== 'qualified' ? (
                            <button
                              type="button"
                              className="btn-ghost"
                              onClick={() => {
                                void moveLeadStatus(lead.id, 'qualified');
                              }}
                            >
                              Mark Qualified
                            </button>
                          ) : null}
                          {column.key !== 'closed_won' ? (
                            <button
                              type="button"
                              className="btn-ghost"
                              onClick={() => {
                                void moveLeadStatus(lead.id, 'closed_won');
                              }}
                            >
                              Close Won
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className="btn-ghost"
                            onClick={() => {
                              void setTomorrowFollowUp(lead.id);
                            }}
                          >
                            +24h Follow-up
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {activeTab === 'emails' ? (
          <section className="space-y-4">
            <div className="panel flex flex-wrap gap-2">
              {(['templates', 'queue', 'blackout'] as EmailTabKey[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  className={`rounded-xl px-3 py-2 text-sm ${
                    emailTab === tab ? 'bg-admin-panel text-admin-ink' : 'bg-white/5 text-slate-300'
                  }`}
                  onClick={() => setEmailTab(tab)}
                >
                  {tab === 'templates' ? 'Templates' : tab === 'queue' ? 'Queue' : 'Blackout Dates'}
                </button>
              ))}
            </div>

            {emailTab === 'templates' ? (
              <div className="grid gap-4 lg:grid-cols-2">
                <form className="panel space-y-3" onSubmit={handleTemplateCreate}>
                  <h2 className="text-lg font-semibold">Template Editor</h2>
                  <label className="field">
                    <span>Key</span>
                    <input value={templateForm.key} onChange={(event) => setTemplateForm((prev) => ({ ...prev, key: event.target.value }))} required />
                  </label>
                  <label className="field">
                    <span>Name</span>
                    <input value={templateForm.name} onChange={(event) => setTemplateForm((prev) => ({ ...prev, name: event.target.value }))} required />
                  </label>
                  <label className="field">
                    <span>Subject</span>
                    <input value={templateForm.subject} onChange={(event) => setTemplateForm((prev) => ({ ...prev, subject: event.target.value }))} required />
                  </label>
                  <label className="field">
                    <span>HTML Body</span>
                    <textarea rows={6} value={templateForm.htmlBody} onChange={(event) => setTemplateForm((prev) => ({ ...prev, htmlBody: event.target.value }))} required />
                  </label>
                  <label className="field">
                    <span>Text Body</span>
                    <textarea rows={3} value={templateForm.textBody} onChange={(event) => setTemplateForm((prev) => ({ ...prev, textBody: event.target.value }))} />
                  </label>
                  <label className="field">
                    <span>Variables (comma separated)</span>
                    <input value={templateForm.variables} onChange={(event) => setTemplateForm((prev) => ({ ...prev, variables: event.target.value }))} />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button className="btn-primary" type="submit">Save template</button>
                    <button className="btn-secondary" type="button" onClick={() => void handleTemplatePreview()}>
                      Preview
                    </button>
                  </div>
                </form>

                <div className="space-y-4">
                  <article className="panel">
                    <h3 className="text-lg font-semibold">Template Library</h3>
                    <div className="mt-3 space-y-2 text-sm text-slate-200">
                      {templates.map((template) => (
                        <div key={template.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-medium">{template.name} v{template.version}</p>
                            <button type="button" className="btn-ghost" onClick={() => void handleTemplateToggle(template)}>
                              {template.isActive ? 'Disable' : 'Enable'}
                            </button>
                          </div>
                          <p className="text-xs text-slate-400">{template.subject}</p>
                        </div>
                      ))}
                    </div>
                  </article>

                  <article className="panel">
                    <h3 className="text-lg font-semibold">Preview + Test</h3>
                    {templatePreview ? (
                      <iframe title="template-preview" className="mt-3 h-48 w-full rounded-xl border border-white/10 bg-white" srcDoc={templatePreview} />
                    ) : (
                      <p className="mt-3 text-sm text-slate-400">Generate a preview to inspect rendered HTML.</p>
                    )}
                    <label className="field mt-3">
                      <span>Test Recipient</span>
                      <input type="email" value={templateTestEmail} onChange={(event) => setTemplateTestEmail(event.target.value)} placeholder="owner@academy.com" />
                    </label>
                    <button type="button" className="btn-secondary mt-3" onClick={() => void handleTemplateTestSend()}>
                      Send Test Email
                    </button>
                  </article>
                </div>
              </div>
            ) : null}

            {emailTab === 'queue' ? (
              <div className="grid gap-4 lg:grid-cols-2">
                <form className="panel space-y-3" onSubmit={handleQueueCreate}>
                  <h2 className="text-lg font-semibold">Queue Email</h2>
                  <label className="field">
                    <span>To</span>
                    <input type="email" value={queueForm.to} onChange={(event) => setQueueForm((prev) => ({ ...prev, to: event.target.value }))} required />
                  </label>
                  <label className="field">
                    <span>Subject</span>
                    <input value={queueForm.subject} onChange={(event) => setQueueForm((prev) => ({ ...prev, subject: event.target.value }))} required />
                  </label>
                  <label className="field">
                    <span>HTML Body</span>
                    <textarea rows={4} value={queueForm.htmlBody} onChange={(event) => setQueueForm((prev) => ({ ...prev, htmlBody: event.target.value }))} required />
                  </label>
                  <label className="field">
                    <span>Scheduled At (local)</span>
                    <input type="datetime-local" value={queueForm.scheduledAt} onChange={(event) => setQueueForm((prev) => ({ ...prev, scheduledAt: event.target.value }))} />
                  </label>
                  <button className="btn-primary" type="submit">Queue email</button>
                </form>

                <article className="panel">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-lg font-semibold">Queue Status</h3>
                    <select
                      className="rounded-lg border border-white/15 bg-admin-panel px-2 py-1 text-sm"
                      value={queueFilter}
                      onChange={(event) => setQueueFilter(event.target.value as QueueFilter)}
                    >
                      <option value="all">All</option>
                      <option value="PENDING">Pending</option>
                      <option value="SENT">Sent</option>
                      <option value="FAILED">Failed</option>
                    </select>
                  </div>
                  <div className="mt-3 max-h-96 space-y-2 overflow-auto text-sm">
                    {filteredQueue.map((item) => (
                      <div key={item.id} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                        <p className="font-medium">{item.to}</p>
                        <p className="text-xs text-slate-300">{item.status} - {item.subject}</p>
                        <p className="text-xs text-slate-400">Attempts: {item.attempts}/{item.maxAttempts}</p>
                      </div>
                    ))}
                  </div>
                </article>
              </div>
            ) : null}

            {emailTab === 'blackout' ? (
              <div className="grid gap-4 lg:grid-cols-2">
                <form className="panel space-y-3" onSubmit={handleBlackoutCreate}>
                  <h2 className="text-lg font-semibold">No-Battle Days</h2>
                  <label className="field">
                    <span>Provider</span>
                    <select value={blackoutForm.providerId} onChange={(event) => setBlackoutForm((prev) => ({ ...prev, providerId: event.target.value }))} required>
                      {providers.map((provider) => (
                        <option key={provider.id} value={provider.id}>{provider.name}</option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>Date</span>
                    <input type="date" value={blackoutForm.date} onChange={(event) => setBlackoutForm((prev) => ({ ...prev, date: event.target.value }))} required />
                  </label>
                  <label className="field">
                    <span>Reason</span>
                    <input value={blackoutForm.reason} onChange={(event) => setBlackoutForm((prev) => ({ ...prev, reason: event.target.value }))} />
                  </label>
                  <button className="btn-primary" type="submit">Add blackout date</button>
                </form>

                <article className="panel">
                  <h3 className="text-lg font-semibold">Active Blackout Dates</h3>
                  <ul className="mt-3 space-y-2 text-sm text-slate-200">
                    {blackoutDates.map((item) => (
                      <li key={item.id} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                        {item.date} - {item.reason || 'No reason'}
                      </li>
                    ))}
                  </ul>
                </article>
              </div>
            ) : null}
          </section>
        ) : null}

        {activeTab === 'settings' ? (
          <section className="grid gap-4 lg:grid-cols-2">
            <form className="panel space-y-3" onSubmit={handleSettingsSave}>
              <h2 className="text-xl font-semibold">Discovery Call Configuration</h2>
              <label className="field">
                <span>Default Provider</span>
                <select
                  value={settingsForm.providerId}
                  onChange={(event) => setSettingsForm((prev) => ({ ...prev, providerId: event.target.value }))}
                  required
                >
                  {providers.map((provider) => (
                    <option key={provider.id} value={provider.id}>{provider.name}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Call Duration (minutes)</span>
                <input
                  type="number"
                  min={15}
                  max={120}
                  value={settingsForm.defaultDurationMinutes}
                  onChange={(event) => setSettingsForm((prev) => ({ ...prev, defaultDurationMinutes: Number(event.target.value) }))}
                />
              </label>
              <label className="field">
                <span>Minimum Notice (hours)</span>
                <input
                  type="number"
                  min={1}
                  max={168}
                  value={settingsForm.minimumNoticeHours}
                  onChange={(event) => setSettingsForm((prev) => ({ ...prev, minimumNoticeHours: Number(event.target.value) }))}
                />
              </label>
              <label className="field">
                <span>Max Advance Booking (days)</span>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={settingsForm.maximumAdvanceDays}
                  onChange={(event) => setSettingsForm((prev) => ({ ...prev, maximumAdvanceDays: Number(event.target.value) }))}
                />
              </label>
              <label className="field">
                <span>Buffer Between Calls (minutes)</span>
                <input
                  type="number"
                  min={0}
                  max={120}
                  value={settingsForm.bufferMinutes}
                  onChange={(event) => setSettingsForm((prev) => ({ ...prev, bufferMinutes: Number(event.target.value) }))}
                />
              </label>
              <label className="field">
                <span>Admin Timezone</span>
                <select
                  value={settingsForm.adminTimezone}
                  onChange={(event) => setSettingsForm((prev) => ({ ...prev, adminTimezone: event.target.value }))}
                >
                  <option value="America/New_York">ET</option>
                  <option value="America/Chicago">CT</option>
                  <option value="America/Denver">MT</option>
                  <option value="America/Los_Angeles">PT</option>
                </select>
              </label>

              <h2 className="pt-2 text-xl font-semibold">Password & Session</h2>
              <label className="inline-flex items-center gap-2 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={settingsForm.enforce2fa}
                  onChange={(event) => setSettingsForm((prev) => ({ ...prev, enforce2fa: event.target.checked }))}
                />
                Enforce two-factor authentication for admin logins
              </label>
              <label className="field">
                <span>Password Rotation Days</span>
                <input
                  type="number"
                  min={30}
                  max={365}
                  value={settingsForm.rotationDays}
                  onChange={(event) => setSettingsForm((prev) => ({ ...prev, rotationDays: Number(event.target.value) }))}
                />
              </label>

              <button className="btn-primary" type="submit">Save settings</button>
            </form>

            <div className="space-y-4">
              <form className="panel space-y-3" onSubmit={handlePasswordChange}>
                <h3 className="text-xl font-semibold">Change Admin Password</h3>
                <label className="field">
                  <span>Current Password</span>
                  <input type="password" required />
                </label>
                <label className="field">
                  <span>New Password</span>
                  <input type="password" required minLength={8} />
                </label>
                <label className="field">
                  <span>Confirm Password</span>
                  <input type="password" required minLength={8} />
                </label>
                <button className="btn-secondary" type="submit">Submit Password Change</button>
                <button className="btn-secondary" type="button" onClick={logout}>Logout</button>
              </form>

              <article className="panel">
                <h3 className="text-xl font-semibold">Stored Settings Snapshot</h3>
                <p className="mt-2 text-sm text-slate-300">Persisted through /admin/settings.</p>
                <div className="mt-4 space-y-2 text-sm">
                  {settings.map((item) => (
                    <div key={item.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
                      <p className="font-medium">{item.key}</p>
                      <pre className="mt-1 overflow-x-auto text-xs text-slate-300">{JSON.stringify(item.value, null, 2)}</pre>
                    </div>
                  ))}
                </div>
              </article>
            </div>
          </section>
        ) : null}
      </div>

      {selectedLead ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/65 p-4">
          <article className="w-full max-w-2xl rounded-2xl border border-white/10 bg-admin-surface p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold">Booking + Lead Detail</h3>
                <p className="text-sm text-slate-300">{selectedLead.schoolName} - {selectedLead.city}, {selectedLead.state}</p>
              </div>
              <button type="button" className="btn-ghost" onClick={() => setSelectedLead(null)}>
                Close
              </button>
            </div>

            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-lg bg-white/5 p-3">
                <dt className="text-slate-400">Lead Status</dt>
                <dd className="font-medium">{selectedLead.leadStatus}</dd>
              </div>
              <div className="rounded-lg bg-white/5 p-3">
                <dt className="text-slate-400">Qualification Score</dt>
                <dd className="font-medium">{selectedLead.qualificationScore}</dd>
              </div>
              <div className="rounded-lg bg-white/5 p-3">
                <dt className="text-slate-400">Follow-Up</dt>
                <dd className="font-medium">
                  {selectedLead.followUpAt
                    ? formatInTimeZone(new Date(selectedLead.followUpAt), VIENNA_TZ, 'MMM d, yyyy HH:mm')
                    : 'Not scheduled'}
                </dd>
              </div>
              <div className="rounded-lg bg-white/5 p-3">
                <dt className="text-slate-400">Booked Start (Vienna)</dt>
                <dd className="font-medium">
                  {selectedLead.booking
                    ? formatInTimeZone(new Date(selectedLead.booking.startTs), VIENNA_TZ, 'MMM d, yyyy HH:mm')
                    : 'No booking'}
                </dd>
              </div>
            </dl>

            <label className="field mt-4">
              <span>Lead Status</span>
              <select value={modalLeadStatus} onChange={(event) => setModalLeadStatus(event.target.value as LeadStatus)}>
                {LEAD_COLUMNS.map((item) => (
                  <option key={item.key} value={item.key}>{item.label}</option>
                ))}
              </select>
            </label>
            <label className="field mt-3">
              <span>Admin Notes</span>
              <textarea rows={4} value={modalNote} onChange={(event) => setModalNote(event.target.value)} />
            </label>

            <p className="mt-4 text-sm text-slate-200">
              Challenges: {selectedLead.schedulingChallenges || 'Not specified'}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  void moveLeadStatus(selectedLead.id, modalLeadStatus, modalNote);
                  setSelectedLead(null);
                }}
              >
                Save Lead Update
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  void setTomorrowFollowUp(selectedLead.id);
                }}
              >
                Set +24h Follow-up
              </button>
            </div>
          </article>
        </div>
      ) : null}
    </main>
  );
}

export default App;
