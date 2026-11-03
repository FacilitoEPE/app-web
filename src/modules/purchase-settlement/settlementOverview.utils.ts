import type { SettlementCarrierEntry, SettlementLoad, SettlementProviderEntry } from '@/modules/purchase-settlement/purchaseSettlement.models';

export interface SettlementCampaignOverview {
    id: number;
    nombre: string;
    fruta: string;
    estado: string;
    cargas: SettlementLoad[];
    proveedores: number;
    proveedoresLiquidados: number;
    transportesLiquidados: number;
}

export function settlementCampaigns(loads: SettlementLoad[]): SettlementCampaignOverview[] {
    const groups = new Map<number, SettlementCampaignOverview>();
    for (const load of loads) {
        const campaign = groups.get(load.campaniaId) ?? {
            id: load.campaniaId, nombre: load.campaniaNombre, fruta: load.fruta, estado: load.estadoCampania,
            cargas: [], proveedores: 0, proveedoresLiquidados: 0, transportesLiquidados: 0,
        };
        campaign.cargas.push(load);
        campaign.proveedores += load.proveedores.length;
        campaign.proveedoresLiquidados += load.proveedores.filter(provider => provider.estado !== 'Por liquidar').length;
        campaign.transportesLiquidados += Number(load.transporte.estado !== 'Por liquidar');
        groups.set(load.campaniaId, campaign);
    }
    return [...groups.values()];
}

export const providerPaid = (provider: SettlementProviderEntry) => provider.pagos.reduce((sum, payment) => sum + payment.importe, 0);
export const providerBalance = (provider: SettlementProviderEntry) => Math.max(0, provider.total - providerPaid(provider));
export const carrierExpenses = (carrier: SettlementCarrierEntry) => carrier.gastosReales.reduce((sum, expense) => sum + expense.monto, 0);
export const carrierTotal = (carrier: SettlementCarrierEntry) => carrier.totalLiquidado ?? carrier.fleteCarga + (carrier.gastosReales.length ? carrierExpenses(carrier) : carrier.viaticosMovilidad + carrier.viaticosInsumos);
export const carrierPaid = (carrier: SettlementCarrierEntry) => carrier.pagos.reduce((sum, payment) => sum + payment.importe, 0);
export const carrierBalance = (carrier: SettlementCarrierEntry) => Math.max(0, carrierTotal(carrier) - carrierPaid(carrier));

/** Readiness describes existing V1 data. It never invents a source or a value. */
export function providerReadiness(provider: SettlementProviderEntry): string[] {
    const pending: string[] = [];
    if (!provider.kilosReconocidos || provider.kilosReconocidos <= 0) pending.push('Kilos reconocidos en recepción');
    if (!provider.precioKg || provider.precioKg <= 0) pending.push('Precio de compra acordado');
    if (provider.moneda !== 'PEN' && provider.moneda !== 'USD') pending.push('Moneda de compra admitida');
    if (!provider.personasVinculadas.length) pending.push('Persona titular o vinculada');
    return pending;
}

export function carrierReadiness(carrier: SettlementCarrierEntry): string[] {
    const pending: string[] = [];
    if (!carrier.fleteCarga || carrier.fleteCarga <= 0) pending.push('Flete asignado a la carga');
    if (!carrier.totalContratadoCampania || carrier.totalContratadoCampania <= 0) pending.push('Acuerdo de transporte');
    return pending;
}
