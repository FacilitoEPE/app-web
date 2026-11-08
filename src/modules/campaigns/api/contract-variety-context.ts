import { operationsContext } from '@/modules/operations/api/operations-context.api';
import type { ContractVarietyOption, VarietyQuantity } from '@/modules/campaigns/campaignVarietyQuantities.utils';

export function campaignVarietyNames(campaignId: number): ReadonlyMap<number, string> {
    const data = operationsContext();
    const fruitId = data.campaigns.find(item => item.campaniaId === campaignId)?.frutaId;
    return new Map(data.varieties.filter(item => item.frutaId === fruitId).map(item => [item.frutaDerivadaId, item.name]));
}

/** Opciones del requerimiento ya cargado, filtradas por fruta de campaña. */
export function contractVarietyContext(campaignId: number, requirementId: number) {
    const data = operationsContext();
    const campaign = data.campaigns.find(item => item.campaniaId === campaignId);
    const requested = new Set(data.requirementVarieties.filter(item => item.clienteNegocioCampanaId === requirementId).map(item => item.frutaDerivadaId));
    const options: ContractVarietyOption[] = data.varieties.filter(item => item.frutaId === campaign?.frutaId && requested.has(item.frutaDerivadaId))
        .map(item => ({ value: String(item.frutaDerivadaId), label: item.name }));
    return { fruitName: data.fruits.find(item => item.frutaId === campaign?.frutaId)?.name ?? '', options };
}

export function deliveryVarietyQuantities(deliveryId: number): VarietyQuantity[] {
    const data = operationsContext();
    const rows = data.deliveryVarieties.filter(item => item.entregaProgramadaId === deliveryId)
        .map(item => ({ frutaDerivadaId: item.frutaDerivadaId, kilos: item.kilosProgramados }));
    const total = data.deliveries.find(item => item.entregaProgramadaId === deliveryId)?.kilosProgramados;
    // Un desglose histórico incoherente no describe el total de su cabecera.
    return total !== undefined && Math.round(rows.reduce((sum, row) => sum + row.kilos, 0) * 1000) === Math.round(total * 1000) ? rows : [];
}
