let message = '';
const listeners = new Set<() => void>();
export const subscribeActionError = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export const getActionError = () => message;
export function actionErrorMessage(error: unknown): string {
    if (error instanceof Error)
        return error.message;
    if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string')
        return error.message;
    return 'No se pudo guardar la operación. Revisa los datos e inténtalo nuevamente.';
}
export function reportActionError(error: unknown) { message = actionErrorMessage(error); listeners.forEach(listener => listener()); }
export function clearActionError() { message = ''; listeners.forEach(listener => listener()); }
export function isPromise(value: unknown): value is PromiseLike<unknown> { return Boolean(value && typeof value === 'object' && 'then' in value && typeof value.then === 'function'); }
