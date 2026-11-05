import { useEffect, useSyncExternalStore, type ReactNode } from 'react';
import { cancelFrontendDataLoad, getFrontendDataStatus, subscribeFrontendData, refreshFrontendData } from '@/frontend-data';
import { usesV1 } from '@/shared/api/data-contract';
import { getActionError, subscribeActionError, clearActionError } from '@/shared/api/action-errors';
import { PageLoading, PageError } from '@/shared/components/PageState';
import FormField from '@/shared/components/FormField';
import { Button } from '@/shared/components/ui/button';
import { useLocation } from 'react-router-dom';
export default function FrontendDataBoundary({ children }: {
    children: ReactNode;
}) {
    const state = useSyncExternalStore(subscribeFrontendData, getFrontendDataStatus), actionError = useSyncExternalStore(subscribeActionError, getActionError);
    const { pathname } = useLocation();
    const needsOperations = pathname !== '/modules';
    useEffect(() => {
        if (!usesV1()) return;
        if (needsOperations) void refreshFrontendData(pathname).catch(() => undefined);
        else cancelFrontendDataLoad();
    }, [needsOperations, pathname]);
    if (!usesV1() || !needsOperations)
        return children;
    if (state.pathname !== pathname || state.phase === 'idle' || state.phase === 'loading')
        return <PageLoading label="Cargando datos de la operación…"/>;
    if (state.phase === 'error')
        return <PageError title="No se pudieron cargar los datos" message={state.error} onRetry={() => void refreshFrontendData(pathname).catch(() => undefined)} back={{ to: '/login', label: 'Volver al acceso' }}/>;
    return <>{state.refreshing && <p role="status" className="px-6 py-2 text-sm text-ink-muted">Actualizando datos…</p>}{(state.error || actionError) && <div className="mx-6 mt-4 rounded-xl border border-destructive/30 p-4" role="alert"><FormField error={state.error || actionError}/><Button variant="outline" onClick={async () => { clearActionError(); await refreshFrontendData(); }}>Actualizar datos</Button></div>}{children}</>;
}
