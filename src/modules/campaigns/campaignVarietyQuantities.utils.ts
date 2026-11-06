import type { FormFieldErrors } from '@/shared/validation/api-form-errors';

export interface VarietyQuantity {
    frutaDerivadaId: number;
    kilos: number;
}

export interface VarietyQuantityRow {
    frutaDerivadaId: string;
    kilos: string;
}

export interface ContractVarietyOption {
    value: string;
    label: string;
}

export interface VarietyBalance extends VarietyQuantity {
    available: number;
    scheduled: number;
    remaining: number;
}

const milliKg = (value: number) => Math.round(value * 1000);

export function sumVarietyKilos(rows: VarietyQuantityRow[]): number {
    return rows.reduce((sum, row) => {
        const kilos = Number(row.kilos);
        return sum + (Number.isFinite(kilos) && kilos > 0 ? milliKg(kilos) : 0);
    }, 0) / 1000;
}

/** Proyección del saldo disponible después de registrar las filas que se están editando. */
export function remainingDeliveryKilos(available: number, rows: VarietyQuantityRow[]): number {
    return (milliKg(available) - milliKg(sumVarietyKilos(rows))) / 1000;
}

export function toVarietyQuantities(rows: VarietyQuantityRow[]): VarietyQuantity[] {
    return rows.map(row => ({ frutaDerivadaId: Number(row.frutaDerivadaId), kilos: Number(row.kilos) }));
}

/** Cada variedad consume únicamente su propio cupo; la entrega editada no cuenta como consumo previo. */
export function deliveryVarietyBalances(agreed: VarietyQuantity[], deliveries: Array<{ id: number; varieties: VarietyQuantity[] }>, rows: VarietyQuantityRow[], editingDeliveryId?: number): VarietyBalance[] {
    return agreed.map(variety => {
        const consumed = deliveries.filter(delivery => delivery.id !== editingDeliveryId)
            .flatMap(delivery => delivery.varieties).filter(row => row.frutaDerivadaId === variety.frutaDerivadaId)
            .reduce((sum, row) => sum + milliKg(row.kilos), 0);
        const available = (milliKg(variety.kilos) - consumed) / 1000;
        const scheduled = sumVarietyKilos(rows.filter(row => Number(row.frutaDerivadaId) === variety.frutaDerivadaId));
        return { ...variety, available, scheduled, remaining: (milliKg(available) - milliKg(scheduled)) / 1000 };
    });
}

export function varietyQuantitiesToRows(varieties: VarietyQuantity[] = []): VarietyQuantityRow[] {
    return varieties.length ? varieties.map(row => ({ frutaDerivadaId: String(row.frutaDerivadaId), kilos: String(row.kilos) }))
        : [{ frutaDerivadaId: '', kilos: '' }];
}

export function validateVarietyQuantities(rows: VarietyQuantityRow[], options: ContractVarietyOption[]): FormFieldErrors {
    const errors: FormFieldErrors = {};
    if (!rows.length) errors.variedades = 'Agrega al menos una variedad.';
    const seen = new Set<string>();
    rows.forEach((row, index) => {
        const field = `variedades.${index}`;
        if (!options.some(option => option.value === row.frutaDerivadaId)) errors[`${field}.frutaDerivadaId`] = 'Selecciona una variedad disponible.';
        else if (seen.has(row.frutaDerivadaId)) errors[`${field}.frutaDerivadaId`] = 'Esta variedad ya está seleccionada.';
        seen.add(row.frutaDerivadaId);
        const kilos = Number(row.kilos);
        if (!/^\d+(\.\d{1,3})?$/.test(row.kilos.trim()) || !Number.isFinite(kilos) || kilos <= 0)
            errors[`${field}.kilos`] = 'Ingresa kilos mayores que cero, con hasta 3 decimales.';
    });
    return errors;
}

export function availableContractKilos(agreed: number, deliveries: Array<{ id: number; kilosProgramados: number }>, editingDeliveryId?: number): number {
    const consumed = deliveries.filter(delivery => delivery.id !== editingDeliveryId)
        .reduce((sum, delivery) => sum + milliKg(delivery.kilosProgramados), 0);
    return Math.max(0, milliKg(agreed) - consumed) / 1000;
}
