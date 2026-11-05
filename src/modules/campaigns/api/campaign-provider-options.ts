import { getProveedores } from '@/modules/providers/api/proveedor.api';
import { readAllV1 } from '@/modules/operations/api/operations-context.api';
import { refreshRemoteData, usesV1 } from '@/shared/api/data-contract';
import type { FincaV1 } from '@/modules/providers/api/v1.dto';

export interface CampaignProviderOptionsResult<TProvider> {
  providers: TProvider[];
  failed: boolean;
}

export async function fetchCampaignProviderOptions<TProvider>(
  load: () => Promise<TProvider[]>,
): Promise<CampaignProviderOptionsResult<TProvider>> {
  try {
    return { providers: await load(), failed: false };
  } catch {
    return { providers: [], failed: true };
  }
}

export async function loadCampaignProviderOptions() {
    const providers = await getProveedores();
    if (usesV1()) {
        // The directory is loaded only while choosing a provider; its farms supply the existing preview.
        for (const provider of providers) await readAllV1<FincaV1>(`/proveedores/${provider.proveedorId}/fincas`);
        await refreshRemoteData();
    }
    return providers;
}
