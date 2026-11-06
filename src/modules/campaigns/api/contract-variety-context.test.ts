import { describe, expect, it, vi } from 'vitest';
import { contractVarietyContext, deliveryVarietyQuantities } from '@/modules/campaigns/api/contract-variety-context';

vi.mock('@/modules/operations/api/operations-context.api', () => ({
    operationsContext: () => ({
        campaigns: [{ campaniaId: 1, frutaId: 1 }],
        fruits: [{ frutaId: 1, name: 'Mango' }],
        varieties: [{ frutaDerivadaId: 1, frutaId: 1, name: 'Kent' }, { frutaDerivadaId: 2, frutaId: 1, name: 'Edward' }, { frutaDerivadaId: 3, frutaId: 2, name: 'Hass' }],
        requirementVarieties: [{ clienteNegocioCampanaId: 5, frutaDerivadaId: 1 }, { clienteNegocioCampanaId: 5, frutaDerivadaId: 3 }, { clienteNegocioCampanaId: 6, frutaDerivadaId: 2 }],
        deliveries: [{ entregaProgramadaId: 7, kilosProgramados: 150 }, { entregaProgramadaId: 8, kilosProgramados: 200 }],
        deliveryVarieties: [{ entregaProgramadaId: 7, frutaDerivadaId: 1, kilosProgramados: 100 }, { entregaProgramadaId: 7, frutaDerivadaId: 2, kilosProgramados: 50 }, { entregaProgramadaId: 8, frutaDerivadaId: 1, kilosProgramados: 100 }],
    }),
}));

describe('contexto real de las filas de variedades', () => {
    it('ofrece solo variedades solicitadas de la fruta de la campaña', () => {
        expect(contractVarietyContext(1, 5)).toEqual({ fruitName: 'Mango', options: [{ value: '1', label: 'Kent' }] });
    });

    it('recupera las cantidades registradas de una entrega concreta', () => {
        expect(deliveryVarietyQuantities(7)).toEqual([{ frutaDerivadaId: 1, kilos: 100 }, { frutaDerivadaId: 2, kilos: 50 }]);
    });

    it('no inventa un reparto si el detalle histórico no coincide con el total o no existe', () => {
        expect(deliveryVarietyQuantities(8)).toEqual([]);
        expect(deliveryVarietyQuantities(99)).toEqual([]);
    });
});
