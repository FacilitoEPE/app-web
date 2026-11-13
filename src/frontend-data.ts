import { clearOperationsContext, getOperationsPlan, loadOperationsContext, operationsContext, type OperationsContext } from '@/modules/operations/api/operations-context.api';
import { remoteMutationRevision } from '@/shared/api/remote-mutations';
import { projectProviderData } from '@/modules/providers/api/provider-screen-data';
import { projectCampaignData } from '@/modules/campaigns/api/campaign-screen-data';
import { projectCarrierData } from '@/modules/carriers/api/quotation-commands.api';
import { projectQualityData } from '@/modules/quality/api/quality-screen-data';
import { projectBillingData } from '@/modules/billing/api/billing-screen-data';
import { projectSettlementData } from '@/modules/purchase-settlement/api/settlement-screen-data';
import { projectLogisticsData } from '@/modules/logistics/api/logistics-screen-data';
import { projectDriverData } from '@/modules/driver-portal/api/driver-screen-data';
import { hydrateProviderData } from '@/modules/providers/providerLocalData.store';
import { hydrateCampaignContracts } from '@/modules/campaigns/campaignClientContracts.store';
import { hydrateCampaignDeliveries } from '@/modules/campaigns/campaignContractDeliveries.store';
import { hydrateCampaignCertificates } from '@/modules/campaigns/campaignCertificates.store';
import { hydrateCampaignCarriers } from '@/modules/campaigns/campaignCarriers.store';
import { hydrateCampaignInterviews } from '@/modules/campaigns/campaignInterview.utils';
import { hydrateCampaignExams } from '@/modules/campaigns/campaignExams.store';
import { hydrateCarrierExtras } from '@/modules/carriers/carrierExtras.store';
import { hydrateCarrierQuotations } from '@/modules/carriers/carrierQuotations.store';
import { hydrateQualityCampaigns } from '@/modules/quality/quality.store';
import { hydrateQualityAnalyses } from '@/modules/quality/qualityAnalysis.store';
import { hydrateQualityOperations } from '@/modules/quality/qualityOperations.store';
import { hydrateBillingData } from '@/modules/billing/billing.store';
import { hydrateSettlementData } from '@/modules/purchase-settlement/purchaseSettlement.store';
import { hydrateLogisticsData } from '@/modules/logistics/logistics.store';
import { hydrateDriverData } from '@/modules/driver-portal/driverPortal.store';
import { CATALOGO_FRUTAS } from '@/modules/providers/providerCatalogo';
import { PRODUCER_FARM_OPTIONS } from '@/modules/quality/qualityAnalysis.utils';
import { ORGANIC_NORMS_CATALOG } from '@/modules/quality/qualityOperations.models';
import { clearUitParameters, setUitParameters } from '@/modules/purchase-settlement/purchaseSettlement.models';
import { registerDataRefresh } from '@/shared/api/data-contract';
import { actionErrorMessage } from '@/shared/api/action-errors';
type Status = {
    phase: 'idle' | 'loading' | 'ready' | 'error';
    refreshing: boolean;
    error: string;
    pathname: string;
};
let state: Status = { phase: 'idle', refreshing: false, error: '', pathname: '' };
let inFlight: Promise<void> | undefined, inFlightPath = '', generation = 0;
let activeLoad: AbortController | undefined;
const listeners = new Set<() => void>();
export const getFrontendDataStatus = () => state;
export const subscribeFrontendData = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
function publish(next: Status) { state = next; listeners.forEach(listener => listener()); }
export function cancelFrontendDataLoad() { resetFrontendData(); }
export function resetFrontendData() {
    generation++;
    activeLoad?.abort();
    activeLoad = undefined;
    inFlight = undefined;
    clearOperationsContext();
    hydrateDriverData({ drivers: [], loads: [] });
    publish({ phase: 'idle', refreshing: false, error: '', pathname: '' });
}
/** App orchestration: HTTP DTOs are projected in their owning domains before publishing view state. */
export function refreshFrontendData(pathname = getOperationsPlan().pathname): Promise<void> {
    if (inFlight && inFlightPath === pathname)
        return inFlight;
    const activeGeneration = ++generation;
    activeLoad?.abort();
    const controller = new AbortController();
    activeLoad = controller;
    inFlightPath = pathname;
    publish({ ...state, pathname, phase: state.phase === 'ready' && state.pathname === pathname ? 'ready' : 'loading', refreshing: true, error: '' });
    const job = (async () => {
        try {
            let revision: number;
            do {
                revision = remoteMutationRevision();
                const g = await loadOperationsContext(pathname, () => activeGeneration === generation, controller.signal);
                if (activeGeneration !== generation) return;
                publishViewData(g);
            } while (revision !== remoteMutationRevision());
            if (activeGeneration === generation) publish({ phase: 'ready', pathname, refreshing: false, error: '' });
        }
        catch (error) {
            if (activeGeneration !== generation) return;
            publish({ phase: state.phase === 'ready' ? 'ready' : 'error', pathname, refreshing: false, error: actionErrorMessage(error) });
            throw error;
        }
        finally {
            if (activeGeneration === generation) {
                inFlight = undefined;
                activeLoad = undefined;
            }
        }
    })();
    inFlight = job;
    return job;
}
function publishViewData(g: OperationsContext) {
    const plan = getOperationsPlan();
    const providers = projectProviderData(g), campaigns = projectCampaignData(g), carriers = projectCarrierData(g);
    const quality = plan.projection === 'billing' ? { campaigns: [], analyses: [], loads: [] } : projectQualityData(g);
    CATALOGO_FRUTAS.splice(0, CATALOGO_FRUTAS.length, ...g.fruits.map(f => ({ id: String(f.frutaId), nombre: f.name, variedades: g.varieties.filter(v => v.frutaId === f.frutaId).map(v => v.name) })));
    PRODUCER_FARM_OPTIONS.splice(0, PRODUCER_FARM_OPTIONS.length, ...g.participations.flatMap(p => g.farms.filter(f => f.proveedorId === p.proveedorId).map(f => ({ value: `${p.cxpId}:${f.fincaId}`, productor: `${g.providers.find(v => v.proveedorId === p.proveedorId)?.nombres ?? ''} ${g.providers.find(v => v.proveedorId === p.proveedorId)?.apellido ?? ''}`.trim(), finca: f.nombreFinca, campaniaId: p.campaniaId }))));
    ORGANIC_NORMS_CATALOG.splice(0, ORGANIC_NORMS_CATALOG.length, ...g.standards.map(n => ({ id: n.codigo, label: n.nombre, certText: n.nombre })));
    const parameter = g.uit.find(p => p.anio === new Date().getFullYear());
    clearUitParameters();
    for (const item of g.uit) setUitParameters(item.valor, item.limiteUit, item.anio);
    if (!parameter) setUitParameters(0, 0);
    hydrateProviderData(providers);
    hydrateCampaignContracts(campaigns.contracts);
    hydrateCampaignDeliveries(campaigns.deliveries);
    hydrateCampaignCertificates(campaigns.certificates);
    hydrateCampaignCarriers(campaigns.carriers);
    hydrateCampaignInterviews(campaigns.interviews);
    hydrateCampaignExams(campaigns.exams);
    hydrateCarrierExtras(carriers.extras);
    hydrateCarrierQuotations(carriers.quotations);
    hydrateQualityCampaigns(quality.campaigns);
    hydrateQualityAnalyses(quality.analyses);
    hydrateQualityOperations(quality.loads);
    if (plan.pathname === '*' || plan.projection === 'billing') hydrateBillingData(projectBillingData(g));
    if (plan.pathname === '*' || plan.projection === 'settlement') hydrateSettlementData(projectSettlementData(g));
    if (plan.pathname === '*' || plan.projection === 'logistics') hydrateLogisticsData(projectLogisticsData(g));
    if (plan.pathname === '*') hydrateDriverData(projectDriverData(g));
}
registerDataRefresh(async (reconcile = false) => {
    const { getSession } = await import('@/shared/offline/session');
    if (getSession()?.user.rol.nombre === 'Chofer') {
        const { refreshDriverData } = await import('@/modules/driver-portal/api/driver-context.api');
        await refreshDriverData();
    } else if (state.phase === 'idle') return;
    else if (reconcile) await refreshFrontendData(state.pathname);
    else {
        publishViewData(operationsContext());
        publish({ ...state, error: '' });
    }
});
