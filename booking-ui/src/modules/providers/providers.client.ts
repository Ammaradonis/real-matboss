import { getProviders } from '../../api';
import type { ProviderDto } from '../../types';

export async function loadActiveProvider(fallbackProvider: ProviderDto): Promise<ProviderDto> {
  const providerRows = await getProviders();
  return providerRows.find((row) => row.isActive) ?? providerRows[0] ?? fallbackProvider;
}
