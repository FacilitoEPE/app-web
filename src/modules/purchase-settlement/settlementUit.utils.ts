import type { SettlementProviderEntry } from '@/modules/purchase-settlement/purchaseSettlement.models';

/** Tipo de cambio fijo acordado para calcular el equivalente de UIT. */
export const USD_A_SOLES_UIT = 3.7;
export function importeParaUit(monto: number, moneda: string): number {
    if (moneda === 'PEN') return monto;
    if (moneda === 'USD') return monto * USD_A_SOLES_UIT;
    throw new Error('No se puede calcular UIT para esta moneda.');
}

/** V1 annual totals already include the persisted document being edited. */
export function annualBeforeSettlement(entry: SettlementProviderEntry, personId: string, year: number): number {
    const person = entry.personasVinculadas.find(p => p.id === personId);
    const annual = person?.acumuladosPorAnio ? person.acumuladosPorAnio[String(year)] ?? 0 : person?.acumuladoAnualPen ?? 0;
    const included = entry.estado !== 'Por liquidar' && entry.personaLiquidadaId === personId
        && entry.fechaLiquidacion.startsWith(`${year}-`);
    return Math.max(0, annual - (included ? importeParaUit(entry.total, entry.moneda ?? 'PEN') : 0));
}
