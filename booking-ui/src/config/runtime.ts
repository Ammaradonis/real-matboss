export type RuntimeConfig = {
  VITE_API_URL?: string;
  VITE_TENANT_ID?: string;
};

export function firstNonEmpty(...values: Array<string | undefined>): string | undefined {
  for (const value of values) {
    if (value && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
}

export function getRuntimeConfig(): RuntimeConfig {
  if (typeof window === 'undefined') {
    return {};
  }

  return (window as Window & { __RUNTIME_CONFIG__?: RuntimeConfig }).__RUNTIME_CONFIG__ ?? {};
}

export function getApiBaseUrl(): string {
  const runtimeConfig = getRuntimeConfig();
  return firstNonEmpty(
    runtimeConfig.VITE_API_URL,
    import.meta.env.VITE_API_URL,
    'http://localhost:3000',
  )!.replace(/\/$/, '');
}

export function getTenantId(defaultTenantId: string): string {
  const runtimeConfig = getRuntimeConfig();
  return firstNonEmpty(runtimeConfig.VITE_TENANT_ID, import.meta.env.VITE_TENANT_ID) ?? defaultTenantId;
}

