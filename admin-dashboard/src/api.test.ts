import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  adminLogin,
  exportDiscoveryCsv,
  getDiscoveryLeads,
  getProviders,
  updateLeadStatus,
} from './api';

const fetchMock = vi.fn();

describe('admin-dashboard api client', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends auth and tenant headers for protected requests', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => [] });

    await getProviders('token-123');

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/v1/providers');
    expect(options.headers).toMatchObject({
      Authorization: 'Bearer token-123',
      'x-tenant-id': '11111111-1111-1111-1111-111111111111',
    });
  });

  it('builds discovery query params and handles empty-token login errors', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => [] });

    await getDiscoveryLeads('token-123', ' phoenix ', 'qualified');

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/v1/admin/discovery?q=phoenix&leadStatus=qualified');

    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ accessToken: '' }) });

    await expect(adminLogin('admin@matboss.online', 'password123')).rejects.toThrow(
      'Invalid admin credentials',
    );
  });

  it('returns blob for csv export and throws API message on failures', async () => {
    const blob = new Blob(['id,name'], { type: 'text/csv' });
    fetchMock.mockResolvedValueOnce({ ok: true, blob: async () => blob });

    const result = await exportDiscoveryCsv('token-123');
    expect(result).toBe(blob);

    fetchMock.mockResolvedValueOnce({ ok: false, status: 500, text: async () => 'db_down' });

    await expect(
      updateLeadStatus('token-123', { discoveryId: 'd1', leadStatus: 'qualified' }),
    ).rejects.toThrow('db_down');
  });
});
