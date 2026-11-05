import { remoteMutationRevision } from '@/shared/api/remote-mutations';
import { reportActionError } from '@/shared/api/action-errors';

/** En la aplicación se utiliza siempre la API actual; las pruebas históricas conservan su modo local. */
export const usesV1 = () => import.meta.env.MODE !== 'test'
    || import.meta.env.VITE_API_CONTRACT === 'v1'
    || import.meta.env.VITE_API_BASE_URL?.startsWith('/mock-api') === true;
let refresh: ((reconcile?: boolean) => Promise<void>) | undefined;
export function registerDataRefresh(callback: (reconcile?: boolean) => Promise<void>) { refresh = callback; }
export async function refreshRemoteData(reconcile = false) {
    if (refresh)
        await refresh(reconcile);
}
export async function commitRemote<T>(operation: () => Promise<T>): Promise<T> {
    const before = remoteMutationRevision();
    let result: T;
    try {
        result = await operation();
    }
    catch (error) {
        const status = error && typeof error === 'object' && 'statusCode' in error ? Number(error.statusCode) : undefined;
        // A confirmed rejection cannot have changed a single resource; partial/uncertain writes need reconciliation.
        const uncertain = error && typeof error === 'object' && ('request' in error || 'isAxiosError' in error);
        try { if (remoteMutationRevision() !== before || uncertain || (status !== undefined && status >= 500)) await refreshRemoteData(true); }
        catch { /* The original write error remains actionable. */ }
        throw error;
    }
    try { await refreshRemoteData(); }
    catch { reportActionError(new Error('La operación se guardó, pero no se pudo actualizar la vista. Actualiza los datos sin volver a guardar.')); }
    return result;
}
export function requireId(value: string | number, label = 'registro'): number {
    const id = Number(value);
    if (!Number.isSafeInteger(id) || id <= 0)
        throw new Error(`No se pudo identificar ${label}. Recarga los datos e inténtalo nuevamente.`);
    return id;
}
