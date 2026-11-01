import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getDirectBackHref, getParentHref } from "@/shared/layout/breadcrumbRoutes";

/**
 * ¿Hay una vista anterior dentro de la app? React Router guarda en `history.state.idx` la posición de la entrada
 * actual en el historial que él mismo armó: 0 es la primera vista que se abrió (una URL pegada, un marcador, un
 * refresco sobre la primera entrada); mayor que 0 significa que se llegó navegando desde otra vista de la app.
 */
export function hasPreviousView(historyState: unknown): boolean {
    if (typeof historyState !== "object" || historyState === null || !("idx" in historyState)) return false;
    return Number(historyState.idx) > 0;
}

export function getGoBackTarget(pathname: string, historyState: unknown): string | -1 {
    return getDirectBackHref(pathname) ?? (hasPreviousView(historyState) ? -1 : getParentHref(pathname));
}

/**
 * Acción de "Regresar": vuelve a la vista de la que se vino, la que sea (la lista de campañas, el detalle, una
 * notificación…). Solo cuando no hay historial —se entró directo a esa URL— sube un nivel por la escalera de
 * vistas (`getParentHref`), para que el botón nunca quede sin destino ni saque de la app. Las gestiones de vehículos
 * y choferes vuelven directamente al listado de transporte. Esa subida reemplaza la
 * entrada del historial en vez de agregar una, así encadenar "Regresar" sigue subiendo hasta el selector de módulos.
 */
export function useGoBack() {
    const navigate = useNavigate();
    const { pathname } = useLocation();

    return useCallback(() => {
        const target = getGoBackTarget(pathname, window.history.state);
        if (target === -1) navigate(-1);
        // Reemplaza la entrada actual (no suma otra): si sumara, el siguiente "Regresar" volvería a la vista que se acaba de dejar
        else navigate(target, { replace: true });
    }, [navigate, pathname]);
}
