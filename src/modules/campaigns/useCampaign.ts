import { useEffect, useState, useSyncExternalStore } from "react";
import { getOperationsRevision, subscribeOperationsContext } from '@/modules/operations/api/operations-context.api';
import { getCampana } from "@/modules/campaigns/api/campaign.api";
import type { Campana } from "@/modules/campaigns/api/campaign.mapper";

/**
 * Campaña de la ruta, para las vistas que la necesitan solo como contexto (el banner) y ya manejan su propia
 * carga y sus errores. Devuelve `undefined` mientras carga (para reservar el lugar del banner) y `null` si falla:
 * en ese caso el banner simplemente no se dibuja y la vista sigue funcionando.
 */
export function useCampaign(campaniaId: number): Campana | null | undefined {
    const revision = useSyncExternalStore(subscribeOperationsContext, getOperationsRevision);
    const isValid = Number.isInteger(campaniaId) && campaniaId > 0;
    const [state, setState] = useState<{ id: number; campaign: Campana | null } | null>(null);

    useEffect(() => {
        if (!isValid) return;
        let active = true;
        getCampana(campaniaId)
            .then((campaign) => { if (active) setState({ id: campaniaId, campaign }); })
            .catch(() => { if (active) setState({ id: campaniaId, campaign: null }); });
        return () => { active = false; };
    }, [campaniaId, isValid, revision]);

    if (!isValid) return null;
    return state?.id === campaniaId ? state.campaign : undefined;
}
