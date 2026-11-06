import { describe, expect, it } from 'vitest';
import {
    availableContractKilos,
    deliveryVarietyBalances,
    remainingDeliveryKilos,
    sumVarietyKilos,
    validateVarietyQuantities,
    varietyQuantitiesToRows,
} from '@/modules/campaigns/campaignVarietyQuantities.utils';

const options = [{ value: '1', label: 'Kent' }, { value: '2', label: 'Edward' }];
const rows = [{ frutaDerivadaId: '1', kilos: '0.1' }, { frutaDerivadaId: '2', kilos: '0.2' }];

describe('variedades y kilos de contratos y entregas', () => {
    it('suma con precisión de kilos y conserva el desglose al editar', () => {
        expect(sumVarietyKilos(rows)).toBe(0.3);
        expect(varietyQuantitiesToRows([{ frutaDerivadaId: 1, kilos: 0.1 }, { frutaDerivadaId: 2, kilos: 0.2 }])).toEqual(rows);
        expect(varietyQuantitiesToRows([])).toEqual([{ frutaDerivadaId: '', kilos: '' }]);
    });

    it('exige al menos una fila con variedad válida y kilos positivos de hasta tres decimales', () => {
        expect(validateVarietyQuantities([], options)).toHaveProperty('variedades');
        expect(validateVarietyQuantities([{ frutaDerivadaId: '', kilos: '' }], options)).toHaveProperty('variedades.0.frutaDerivadaId');
        for (const kilos of ['0', '-1', 'NaN', 'Infinity', '1.0001']) {
            expect(validateVarietyQuantities([{ frutaDerivadaId: '1', kilos }], options)).toHaveProperty('variedades.0.kilos');
        }
        expect(validateVarietyQuantities([{ frutaDerivadaId: '99', kilos: '1' }], options)).toHaveProperty('variedades.0.frutaDerivadaId');
        expect(validateVarietyQuantities(rows, options)).toEqual({});
    });

    it('rechaza variedades repetidas', () => {
        expect(validateVarietyQuantities([rows[0], { ...rows[0], kilos: '2' }], options)).toHaveProperty('variedades.1.frutaDerivadaId');
    });

    it('conserva el saldo total real mientras la API no guarda el desglose contractual', () => {
        const deliveries = [{ id: 1, kilosProgramados: 0.1 }, { id: 2, kilosProgramados: 0.2 }];
        expect(availableContractKilos(0.3, deliveries)).toBe(0);
        expect(availableContractKilos(0.3, deliveries, 1)).toBe(0.1);
    });

    it('actualiza el contador al escribir, corregir y quitar cantidades de la entrega', () => {
        expect(remainingDeliveryKilos(10000, [{ frutaDerivadaId: '1', kilos: '1000' }])).toBe(9000);
        expect(remainingDeliveryKilos(10000, [{ frutaDerivadaId: '1', kilos: '2000' }, { frutaDerivadaId: '2', kilos: '500' }])).toBe(7500);
        expect(remainingDeliveryKilos(10000, [{ frutaDerivadaId: '1', kilos: '2000' }])).toBe(8000);
        expect(remainingDeliveryKilos(10000, [])).toBe(10000);
    });

    it('calcula el saldo sin error decimal y conserva el exceso para avisarlo en pantalla', () => {
        expect(remainingDeliveryKilos(0.3, rows)).toBe(0);
        expect(remainingDeliveryKilos(1000, [{ frutaDerivadaId: '1', kilos: '1000.001' }])).toBe(-0.001);
        const available = availableContractKilos(10000, [{ id: 1, kilosProgramados: 1000 }, { id: 2, kilosProgramados: 2000 }], 1);
        expect(remainingDeliveryKilos(available, [{ frutaDerivadaId: '1', kilos: '1000' }])).toBe(7000);
    });

    it('descuenta cada fila solo de su variedad acordada, sin compartir saldos', () => {
        const agreed = [{ frutaDerivadaId: 1, kilos: 10000 }, { frutaDerivadaId: 2, kilos: 5000 }];
        const draft = [{ frutaDerivadaId: '1', kilos: '1000' }, { frutaDerivadaId: '2', kilos: '200' }];
        expect(deliveryVarietyBalances(agreed, [], draft)).toEqual([
            { frutaDerivadaId: 1, kilos: 10000, available: 10000, scheduled: 1000, remaining: 9000 },
            { frutaDerivadaId: 2, kilos: 5000, available: 5000, scheduled: 200, remaining: 4800 },
        ]);
        expect(deliveryVarietyBalances(agreed, [], [draft[0]])[1].remaining).toBe(5000);
        expect(deliveryVarietyBalances(agreed, [], [{ ...draft[0], frutaDerivadaId: '2' }])[0].remaining).toBe(10000);
    });

    it('excluye la entrega editada por variedad y no usa el cupo de otra para cubrir un exceso', () => {
        const agreed = [{ frutaDerivadaId: 1, kilos: 10000 }, { frutaDerivadaId: 2, kilos: 5000 }];
        const deliveries = [{ id: 7, varieties: [{ frutaDerivadaId: 1, kilos: 1000 }] }, { id: 8, varieties: [{ frutaDerivadaId: 1, kilos: 2000 }, { frutaDerivadaId: 2, kilos: 500 }] }];
        const result = deliveryVarietyBalances(agreed, deliveries, [{ frutaDerivadaId: '1', kilos: '8000.001' }], 7);
        expect(result[0]).toMatchObject({ available: 8000, remaining: -0.001 });
        expect(result[1]).toMatchObject({ available: 4500, remaining: 4500 });
    });
});
