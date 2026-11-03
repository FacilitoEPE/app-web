import { describe, expect, it } from 'vitest';
import { carrierBalance, carrierReadiness, carrierTotal, providerBalance, providerReadiness, settlementCampaigns } from '@/modules/purchase-settlement/settlementOverview.utils';
import type { SettlementLoad } from '@/modules/purchase-settlement/purchaseSettlement.models';

const load = {
    id: '1', codigo: 'CAR-1', campaniaId: 7, campaniaNombre: 'Mango 2026', fruta: 'Mango', estadoCampania: 'en proceso',
    cliente: 'Cliente', fechaCarga: '2026-10-29', kilosCargados: 100,
    proveedores: [{ id: '1', proveedorId: '1', estado: 'Por pagar', kilosReconocidos: 80, precioKg: 2,
        moneda: 'PEN', total: 160, personasVinculadas: [{ id: '1' }], pagos: [{ importe: 30 }] }],
    transporte: { estado: 'Por pagar', fleteCarga: 50, viaticosMovilidad: 6, viaticosInsumos: 5, gastosReales: [{ monto: 10 }], pagos: [{ importe: 15 }], totalContratadoCampania: 500 },
} as SettlementLoad;

describe('resumen de liquidación de compra', () => {
    it('agrupa cargas de campaña sin perder el conteo de proveedores y transporte', () => {
        const overview = settlementCampaigns([load]);
        expect(overview).toMatchObject([{ id: 7, proveedores: 1, proveedoresLiquidados: 1, transportesLiquidados: 1 }]);
        expect(overview[0].cargas).toHaveLength(1);
    });
    it('calcula saldos con pagos y gastos aplicados', () => {
        expect(providerBalance(load.proveedores[0])).toBe(130);
        expect(carrierTotal(load.transporte)).toBe(60);
        expect(carrierBalance(load.transporte)).toBe(45);
        expect(carrierTotal({ ...load.transporte, gastosReales: [] })).toBe(61);
        expect(carrierTotal({ ...load.transporte, gastosReales: [], totalLiquidado: 50 })).toBe(50);
    });
    it('señala el dato de origen faltante en cada liquidación', () => {
        expect(providerReadiness(load.proveedores[0])).toEqual([]);
        expect(providerReadiness({ ...load.proveedores[0], kilosReconocidos: 0 })).toContain('Kilos reconocidos en recepción');
        expect(carrierReadiness({ ...load.transporte, fleteCarga: 0 })).toContain('Flete asignado a la carga');
    });
});
