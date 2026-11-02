/** En la aplicación se utiliza siempre la API actual; las pruebas históricas conservan su modo local. */
export const usesV1 = () => import.meta.env.MODE !== 'test'
    || import.meta.env.VITE_API_CONTRACT === 'v1'
    || import.meta.env.VITE_API_BASE_URL?.startsWith('/mock-api') === true;
let refresh: (() => Promise<void>) | undefined;
export function registerDataRefresh(callback: () => Promise<void>) { refresh = callback; }
export async function refreshRemoteData() {
    if (refresh)
        await refresh();
}
export async function commitRemote<T>(operation: () => Promise<T>): Promise<T> {
    let result: T;
    try {
        result = await operation();
    }
    catch (error) {
        // A multi-resource command may have completed some requests. Reconcile before showing the error.
        try {
            await refreshRemoteData();
        }
        catch { /* The original write error remains actionable. */ }
        throw error;
    }
    await refreshRemoteData();
    return result;
}
export function requireId(value: string | number, label = 'registro'): number {
    const id = Number(value);
    if (!Number.isSafeInteger(id) || id <= 0)
        throw new Error(`No se pudo identificar ${label}. Recarga los datos e inténtalo nuevamente.`);
    return id;
}
