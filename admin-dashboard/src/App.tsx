import { format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';

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
  setLeadFollowUp,
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
  { label: 'New', key: 'new' },
  { label: 'Contacted', key: 'contacted' },
  { label: 'Qualified', key: 'qualified' },
  { label: 'Proposal', key: 'proposal' },
  { label: 'Closed Won', key: 'closed_won' },
  { label: 'Closed Lost', key: 'closed_lost' },
];

type TabKey = 'dashboard' | 'bookings' | 'leads' | 'emails' | 'settings';

interface SettingsState {
  providerId: string;
  defaultDurationMinutes: number;
  followUpWindowHours: number;
  enforce2fa: boolean;
  rotationDays: number;
}

function App() {
  const { token, isAuthenticated, login, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [error, setError] = useState<string>('');
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
  const [selectedLead, setSelectedLead] = useState<DiscoveryLead | null>(null);

  const [templateForm, setTemplateForm] = useState({
    key: 'discovery-follow-up',
    name: 'Discovery Follow Up',
    category: 'discovery',
    subject: 'Your MatBoss Discovery Call Follow-Up',
    htmlBody: '<p>Hi {{booking.customerName}}, thanks for speaking with MatBoss.</p>',
    variables: 'booking.customerName,booking.startTs',
  });

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
    followUpWindowHours: 24,
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
    setBlackoutForm((prev) => ({
      ...prev,
      providerId: prev.providerId || data[0]?.id || '',
    }));
    setSettingsForm((prev) => ({
      ...prev,
      providerId: prev.providerId || data[0]?.id || '',
    }));
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
      followUpWindowHours: Number(callConfig?.followUpWindowHours ?? prev.followUpWindowHours),
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

  const bookingsRows = useMemo(
    () => leads.filter((lead) => lead.booking).map((lead) => ({ lead, booking: lead.booking! })),
    [leads],
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

  useEffect(() => {
    if (token) {
      void loadAll();
    }
  }, [token]);

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

  const handleRefresh = async () => {
    await loadAll();
  };

  const moveLeadStatus = async (discoveryId: string, leadStatus: LeadStatus) => {
    if (!token) {
      return;
    }

    try {
      await updateLeadStatus(token, { discoveryId, leadStatus });
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
          followUpWindowHours: settingsForm.followUpWindowHours,
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
                <input name="password" type="password" required minLength={8} placeholder="••••••••" />
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
                Live view uses {VIENNA_TZ} for call center reporting and timezone-safe booking ops.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button type="button" className="btn-secondary" onClick={handleRefresh}>
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
          <section className="grid gap-4 lg:grid-cols-4">
            <article className="panel">
              <p className="panel-label">Total Bookings</p>
              <p className="panel-value">{analytics.totalBookings}</p>
            </article>
            <article className="panel">
              <p className="panel-label">Confirmed</p>
              <p className="panel-value">{analytics.confirmed}</p>
            </article>
            <article className="panel">
              <p className="panel-label">Today (Vienna)</p>
              <p className="panel-value">{analytics.todayCalls}</p>
            </article>
            <article className="panel">
              <p className="panel-label">Conversion</p>
              <p className="panel-value">{analytics.conversionRate}%</p>
            </article>

            <article className="panel lg:col-span-2">
              <h2 className="text-lg font-semibold">Lead Funnel</h2>
              <ul className="mt-3 space-y-2 text-sm text-slate-200">
                {analytics.leadFunnel.map((item) => (
                  <li key={item.status} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                    <span>{item.status}</span>
                    <strong>{item.count}</strong>
                  </li>
                ))}
              </ul>
            </article>

            <article className="panel lg:col-span-2">
              <h2 className="text-lg font-semibold">Top States</h2>
              <ul className="mt-3 space-y-2 text-sm text-slate-200">
                {analytics.topStates.map((item) => (
                  <li key={`${item.state}-${item.count}`} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                    <span>{item.state || 'Unknown'}</span>
                    <strong>{item.count}</strong>
                  </li>
                ))}
              </ul>
            </article>
          </section>
        ) : null}

        {activeTab === 'bookings' ? (
          <section className="panel">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">Bookings</h2>
              <button type="button" className="btn-primary" onClick={handleCsvExport}>
                Export CSV
              </button>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-slate-300">
                  <tr>
                    <th className="px-2 py-3">Customer</th>
                    <th className="px-2 py-3">School</th>
                    <th className="px-2 py-3">Start (Vienna)</th>
                    <th className="px-2 py-3">Status</th>
                    <th className="px-2 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bookingsRows.map(({ lead, booking }) => (
                    <tr key={lead.id} className="border-t border-white/10 text-slate-100">
                      <td className="px-2 py-3">
                        <p>{booking.customerName}</p>
                        <p className="text-xs text-slate-400">{booking.customerEmail}</p>
                      </td>
                      <td className="px-2 py-3">{lead.schoolName}</td>
                      <td className="px-2 py-3">{formatInTimeZone(new Date(booking.startTs), VIENNA_TZ, 'MMM d, yyyy HH:mm')}</td>
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
                    onBlur={() => {
                      void loadLeads();
                    }}
                    placeholder="School, email, customer"
                  />
                </label>
                <label className="field">
                  <span>Status Filter</span>
                  <select
                    value={leadFilter}
                    onChange={(event) => {
                      setLeadFilter(event.target.value as LeadStatus | 'all');
                    }}
                    onBlur={() => {
                      void loadLeads();
                    }}
                  >
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
          <section className="grid gap-4 lg:grid-cols-2">
            <form className="panel space-y-3" onSubmit={handleTemplateCreate}>
              <h2 className="text-lg font-semibold">Email Templates</h2>
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
                <textarea value={templateForm.htmlBody} onChange={(event) => setTemplateForm((prev) => ({ ...prev, htmlBody: event.target.value }))} rows={4} required />
              </label>
              <label className="field">
                <span>Variables (comma separated)</span>
                <input value={templateForm.variables} onChange={(event) => setTemplateForm((prev) => ({ ...prev, variables: event.target.value }))} />
              </label>
              <button className="btn-primary" type="submit">Save template</button>

              <div className="space-y-2 pt-2 text-sm text-slate-200">
                {templates.map((template) => (
                  <div key={template.id} className="rounded-lg border border-white/10 bg-white/5 p-2">
                    <p className="font-medium">{template.name} v{template.version}</p>
                    <p className="text-xs text-slate-400">{template.subject}</p>
                  </div>
                ))}
              </div>
            </form>

            <div className="space-y-4">
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
                  <textarea rows={3} value={queueForm.htmlBody} onChange={(event) => setQueueForm((prev) => ({ ...prev, htmlBody: event.target.value }))} required />
                </label>
                <label className="field">
                  <span>Scheduled At (local)</span>
                  <input type="datetime-local" value={queueForm.scheduledAt} onChange={(event) => setQueueForm((prev) => ({ ...prev, scheduledAt: event.target.value }))} />
                </label>
                <button className="btn-primary" type="submit">Queue email</button>
              </form>

              <form className="panel space-y-3" onSubmit={handleBlackoutCreate}>
                <h2 className="text-lg font-semibold">Blackout Dates</h2>
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

                <ul className="space-y-2 text-sm text-slate-200">
                  {blackoutDates.map((item) => (
                    <li key={item.id} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                      {item.date} - {item.reason || 'No reason'}
                    </li>
                  ))}
                </ul>
              </form>

              <article className="panel">
                <h3 className="text-lg font-semibold">Queue Status</h3>
                <div className="mt-3 space-y-2 text-sm">
                  {queue.slice(0, 8).map((item) => (
                    <div key={item.id} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                      <p className="font-medium">{item.to}</p>
                      <p className="text-xs text-slate-300">{item.status} - {item.subject}</p>
                    </div>
                  ))}
                </div>
              </article>
            </div>
          </section>
        ) : null}

        {activeTab === 'settings' ? (
          <section className="grid gap-4 lg:grid-cols-2">
            <form className="panel space-y-3" onSubmit={handleSettingsSave}>
              <h2 className="text-xl font-semibold">Call Configuration</h2>
              <label className="field">
                <span>Default Provider</span>
                <select
                  value={settingsForm.providerId}
                  onChange={(event) =>
                    setSettingsForm((prev) => ({
                      ...prev,
                      providerId: event.target.value,
                    }))
                  }
                  required
                >
                  {providers.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Default Discovery Duration (minutes)</span>
                <input
                  type="number"
                  min={15}
                  max={120}
                  value={settingsForm.defaultDurationMinutes}
                  onChange={(event) =>
                    setSettingsForm((prev) => ({
                      ...prev,
                      defaultDurationMinutes: Number(event.target.value),
                    }))
                  }
                />
              </label>
              <label className="field">
                <span>Follow-Up Window (hours)</span>
                <input
                  type="number"
                  min={1}
                  max={72}
                  value={settingsForm.followUpWindowHours}
                  onChange={(event) =>
                    setSettingsForm((prev) => ({
                      ...prev,
                      followUpWindowHours: Number(event.target.value),
                    }))
                  }
                />
              </label>

              <h2 className="pt-2 text-xl font-semibold">Security Policy</h2>
              <label className="inline-flex items-center gap-2 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={settingsForm.enforce2fa}
                  onChange={(event) =>
                    setSettingsForm((prev) => ({
                      ...prev,
                      enforce2fa: event.target.checked,
                    }))
                  }
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
                  onChange={(event) =>
                    setSettingsForm((prev) => ({
                      ...prev,
                      rotationDays: Number(event.target.value),
                    }))
                  }
                />
              </label>

              <button className="btn-primary" type="submit">Save settings</button>
            </form>

            <article className="panel">
              <h3 className="text-xl font-semibold">Stored Settings Snapshot</h3>
              <p className="mt-2 text-sm text-slate-300">These values are persisted through /admin/settings and used by operations tooling.</p>
              <div className="mt-4 space-y-2 text-sm">
                {settings.map((item) => (
                  <div key={item.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <p className="font-medium">{item.key}</p>
                    <pre className="mt-1 overflow-x-auto text-xs text-slate-300">{JSON.stringify(item.value, null, 2)}</pre>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs text-slate-400">
                Admin passwords are not changed via this API; this section stores policy metadata for your backend workflows.
              </p>
            </article>
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

            <p className="mt-4 text-sm text-slate-200">
              Challenges: {selectedLead.schedulingChallenges || 'Not specified'}
            </p>
          </article>
        </div>
      ) : null}
    </main>
  );
}

export default App;
