import { apiClient } from '@/shared/api/client';
import { setOperationsContext, type OperationsContext } from '@/modules/operations/api/operations-context.api';
import { projectDriverData } from '@/modules/driver-portal/api/driver-screen-data';
import { hydrateDriverData } from '@/modules/driver-portal/driverPortal.store';
import { getAuthToken } from '@/shared/offline/session';

export async function refreshDriverData(signal?: AbortSignal): Promise<void> {
    const token = getAuthToken();
    const { data } = await apiClient.get<OperationsContext>('/v1/chofer/contexto', { signal, timeout: 15000 });
    signal?.throwIfAborted();
    if (getAuthToken() !== token) throw new Error('La sesión cambió durante la carga.');
    setOperationsContext(data);
    hydrateDriverData(projectDriverData(data));
}
