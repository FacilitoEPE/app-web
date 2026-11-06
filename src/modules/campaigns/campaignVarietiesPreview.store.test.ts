import { afterEach, describe, expect, it, vi } from 'vitest';
import { deliveryPreviewKey, getVarietyPreviews, matchingVarietyPreview, resetVarietyPreviews, saveContractVarietyPreview, saveDeliveryVarietyPreview } from '@/modules/campaigns/campaignVarietiesPreview.store';

const session = vi.hoisted(() => ({ token: 'visual-test' }));
vi.mock('@/shared/offline/session', () => ({ getAuthToken: () => session.token }));
afterEach(() => { resetVarietyPreviews(); session.token = 'visual-test'; });

describe('simulación de variedades sin persistencia backend', () => {
    it('descarta un desglose cuando el total del servidor ya cambió', () => {
        const preview = { total: 15000, varieties: [{ frutaDerivadaId: 1, kilos: 10000 }, { frutaDerivadaId: 2, kilos: 5000 }] };
        expect(matchingVarietyPreview(preview, 15000)).toEqual(preview.varieties);
        expect(matchingVarietyPreview(preview, 16000)).toEqual([]);
        expect(matchingVarietyPreview(undefined, 15000)).toEqual([]);
    });

    it('identifica las entregas dentro de su propio contrato', () => {
        expect(deliveryPreviewKey(1, 7)).not.toBe(deliveryPreviewKey(2, 7));
        const varieties = [{ frutaDerivadaId: 1, kilos: 1000 }];
        saveContractVarietyPreview(1, 1000, varieties);
        saveDeliveryVarietyPreview(1, 7, 100, [{ frutaDerivadaId: 1, kilos: 100 }]);
        varieties[0].kilos = 500;
        expect(getVarietyPreviews().contracts[1].varieties[0].kilos).toBe(1000);
        expect(getVarietyPreviews().deliveries['1:7'].varieties[0].kilos).toBe(100);
        expect(getVarietyPreviews().deliveries['2:7']).toBeUndefined();
    });

    it('no expone una simulación a otra sesión y permite reiniciarla', () => {
        saveContractVarietyPreview(1, 1000, [{ frutaDerivadaId: 1, kilos: 1000 }]);
        session.token = 'otra-sesion';
        expect(getVarietyPreviews()).toEqual({ contracts: {}, deliveries: {} });
        saveContractVarietyPreview(2, 500, [{ frutaDerivadaId: 2, kilos: 500 }]);
        expect(getVarietyPreviews().contracts[1]).toBeUndefined();
        expect(getVarietyPreviews().contracts[2].total).toBe(500);
        resetVarietyPreviews();
        expect(getVarietyPreviews()).toEqual({ contracts: {}, deliveries: {} });
    });
});
