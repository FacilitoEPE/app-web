import type { SettlementProviderEntry } from '@/modules/purchase-settlement/purchaseSettlement.models';

/** V1 annual totals already include the persisted document being edited. */
export function annualBeforeSettlement(entry: SettlementProviderEntry, personId: string, year: number): number {
    const person = entry.personasVinculadas.find(p => p.id === personId);
    const annual = person?.acumuladosPorAnio ? person.acumuladosPorAnio[String(year)] ?? 0 : person?.acumuladoAnualPen ?? 0;
    const included = entry.estado !== 'Por liquidar' && entry.personaLiquidadaId === personId
        && entry.fechaLiquidacion.startsWith(`${year}-`);
    return Math.max(0, annual - (included ? entry.total : 0));
}
