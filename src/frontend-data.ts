import { clearOperationsContext, loadOperationsContext } from '@/modules/operations/api/operations-context.api';
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
};
let state: Status = { phase: 'idle', refreshing: false, error: '' };
let inFlight: Promise<void> | undefined, requested = 0, completed = 0, generation = 0;
const listeners = new Set<() => void>();
export const getFrontendDataStatus = () => state;
export const subscribeFrontendData = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
function publish(next: Status) { state = next; listeners.forEach(listener => listener()); }
export function resetFrontendData() {
    generation++;
    inFlight = undefined;
    requested = 0;
    completed = 0;
    clearOperationsContext();
    hydrateDriverData({ drivers: [], loads: [] });
    publish({ phase: 'idle', refreshing: false, error: '' });
}
/** App orchestration: HTTP DTOs are projected in their owning domains before publishing view state. */
export function refreshFrontendData(): Promise<void> {
    requested++;
    if (inFlight)
        return inFlight;
    publish({ ...state, phase: state.phase === 'ready' ? 'ready' : 'loading', refreshing: true, error: '' });
    const activeGeneration = generation;
    const job = (async () => {
        try {
            do {
                const revision = requested, g = await loadOperationsContext();
                if (activeGeneration !== generation) return;
                const providers = projectProviderData(g), campaigns = projectCampaignData(g), carriers = projectCarrierData(g), quality = projectQualityData(g), billing = projectBillingData(g), settlements = projectSettlementData(g), logistics = projectLogisticsData(g), drivers = projectDriverData(g);
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
                hydrateBillingData(billing);
                hydrateSettlementData(settlements);
                hydrateLogisticsData(logistics);
                hydrateDriverData(drivers);
                completed = revision;
            } while (completed < requested);
            if (activeGeneration === generation) publish({ phase: 'ready', refreshing: false, error: '' });
        }
        catch (error) {
            if (activeGeneration === generation) publish({ phase: state.phase === 'ready' ? 'ready' : 'error', refreshing: false, error: actionErrorMessage(error) });
            throw error;
        }
        finally {
            if (activeGeneration === generation) inFlight = undefined;
        }
    })();
    inFlight = job;
    return job;
}
registerDataRefresh(async () => {
    const { getSession } = await import('@/shared/offline/session');
    if (getSession()?.user.rol.nombre === 'Chofer') {
        const { refreshDriverData } = await import('@/modules/driver-portal/api/driver-context.api');
        await refreshDriverData();
    } else await refreshFrontendData();
});
