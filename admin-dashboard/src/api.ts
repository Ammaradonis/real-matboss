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

type RuntimeConfig = {
  VITE_API_URL?: string;
  VITE_TENANT_ID?: string;
};

function firstNonEmpty(...values: Array<string | undefined>): string | undefined {
  for (const value of values) {
    if (value && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
}

function getRuntimeConfig(): RuntimeConfig {
  if (typeof window === 'undefined') {
    return {};
  }

  return (window as Window & { __RUNTIME_CONFIG__?: RuntimeConfig }).__RUNTIME_CONFIG__ ?? {};
}

const runtimeConfig = getRuntimeConfig();
const API_BASE = firstNonEmpty(
  runtimeConfig.VITE_API_URL,
  import.meta.env.VITE_API_URL,
  'http://localhost:3000',
)!.replace(/\/$/, '');
const API_ROOT = `${API_BASE}/api/v1`;
const DEFAULT_TENANT_ID =
  firstNonEmpty(runtimeConfig.VITE_TENANT_ID, import.meta.env.VITE_TENANT_ID) ??
  '11111111-1111-1111-1111-111111111111';

interface RequestOptions {
  token?: string;
  method?: string;
  body?: unknown;
  tenantId?: string;
  responseType?: 'json' | 'blob';
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${API_ROOT}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-id': options.tenantId ?? DEFAULT_TENANT_ID,
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with ${response.status}`);
  }

  if (options.responseType === 'blob') {
    return (await response.blob()) as T;
  }

  return (await response.json()) as T;
}

export async function adminLogin(email: string, password: string, tenantId?: string): Promise<string> {
  const payload = await request<{ accessToken: string }>('/admin/auth/login', {
    method: 'POST',
    body: { email, password },
    tenantId,
  });

  if (!payload.accessToken) {
    throw new Error('Invalid admin credentials');
  }

  return payload.accessToken;
}

export function getAnalytics(token: string): Promise<AnalyticsResponse> {
  return request('/admin/analytics', { token });
}

export function getDiscoveryLeads(token: string, q?: string, leadStatus?: LeadStatus | 'all'): Promise<DiscoveryLead[]> {
  const query = new URLSearchParams();
  if (q?.trim()) {
    query.set('q', q.trim());
  }
  if (leadStatus && leadStatus !== 'all') {
    query.set('leadStatus', leadStatus);
  }
  const suffix = query.size ? `?${query.toString()}` : '';
  return request(`/admin/discovery${suffix}`, { token });
}

export function updateLeadStatus(
  token: string,
  input: { discoveryId: string; leadStatus: LeadStatus; note?: string },
): Promise<{ updated: boolean }> {
  return request('/admin/discovery/lead-status', {
    token,
    method: 'PATCH',
    body: input,
  });
}

export function setLeadFollowUp(
  token: string,
  input: { discoveryId: string; followUpAt: string; note?: string },
): Promise<{ updated: boolean }> {
  return request('/admin/discovery/follow-up', {
    token,
    method: 'PATCH',
    body: input,
  });
}

export function exportDiscoveryCsv(token: string): Promise<Blob> {
  return request('/admin/export/csv', {
    token,
    responseType: 'blob',
  });
}

export function getSettings(token: string): Promise<AdminSetting[]> {
  return request('/admin/settings', { token });
}

export function upsertSetting(
  token: string,
  key: string,
  value: Record<string, unknown>,
): Promise<AdminSetting> {
  return request('/admin/settings', {
    token,
    method: 'POST',
    body: { key, value },
  });
}

export function getProviders(token: string): Promise<Provider[]> {
  return request('/providers', { token });
}

export function getEmailTemplates(token: string): Promise<EmailTemplate[]> {
  return request('/admin/email/templates', { token });
}

export function createEmailTemplate(
  token: string,
  input: {
    key: string;
    name: string;
    category: string;
    subject: string;
    htmlBody: string;
    textBody?: string;
    variables: string[];
  },
): Promise<EmailTemplate> {
  return request('/admin/email/templates', {
    token,
    method: 'POST',
    body: input,
  });
}

export function previewEmailTemplate(
  token: string,
  input: { htmlBody: string; variables?: Record<string, unknown> },
): Promise<{ html: string }> {
  return request('/admin/email/preview', {
    token,
    method: 'POST',
    body: input,
  });
}

export function testSendEmail(
  token: string,
  input: { to: string; subject: string; htmlBody: string },
): Promise<{ sent: true }> {
  return request('/admin/email/test-send', {
    token,
    method: 'POST',
    body: input,
  });
}

export function updateEmailTemplate(
  token: string,
  id: string,
  input: { subject?: string; htmlBody?: string; textBody?: string; isActive?: boolean },
): Promise<EmailTemplate | null> {
  return request(`/admin/email/templates/${id}`, {
    token,
    method: 'PATCH',
    body: input,
  });
}

export function getEmailQueue(token: string): Promise<EmailQueueItem[]> {
  return request('/admin/email/queue', { token });
}

export function enqueueEmail(
  token: string,
  input: {
    bookingId?: string;
    templateId?: string;
    to: string;
    subject: string;
    htmlBody: string;
    textBody?: string;
    scheduledAt?: string;
  },
): Promise<EmailQueueItem> {
  return request('/admin/email/queue', {
    token,
    method: 'POST',
    body: input,
  });
}

export function getBlackoutDates(token: string): Promise<BlackoutDate[]> {
  return request('/admin/email/blackout-dates', { token });
}

export function addBlackoutDate(
  token: string,
  input: { providerId: string; date: string; reason?: string },
): Promise<BlackoutDate> {
  return request('/admin/email/blackout-dates', {
    token,
    method: 'POST',
    body: input,
  });
}
