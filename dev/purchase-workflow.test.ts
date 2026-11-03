import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { createV1MockMiddleware } from './v1-mock.ts';
import { apiClient } from '@/shared/api/client';
import { refreshFrontendData } from '@/frontend-data';
import { operationsContext } from '@/modules/operations/api/operations-context.api';
import { projectSettlementData } from '@/modules/purchase-settlement/api/settlement-screen-data';
import { saveCarrierSettlement } from '@/modules/purchase-settlement/purchaseSettlement.store';
import { carrierTotal } from '@/modules/purchase-settlement/settlementOverview.utils';

let server: Server;
let previousBase: string | undefined;

beforeEach(async () => {
    vi.stubEnv('VITE_API_CONTRACT', 'v1');
    const middleware = createV1MockMiddleware(path.resolve(import.meta.dirname, '..'), undefined, true);
    server = createServer((request, response) => middleware(request, response, () => {
        response.statusCode = 418;
        response.end('Unversioned request rejected');
    }));
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    previousBase = apiClient.defaults.baseURL;
    apiClient.defaults.baseURL = `http://127.0.0.1:${(server.address() as AddressInfo).port}/mock-api/`;
    await refreshFrontendData();
});

afterEach(async () => {
    apiClient.defaults.baseURL = previousBase;
    vi.unstubAllEnvs();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
});

describe('liquidación de transporte con datos relacionados de desarrollo', () => {
    it('rechaza acuerdos en USD antes de escribir flete o gastos', async () => {
        const context = operationsContext();
        const load = context.loads.find(item => item.cargaId === 3)!;
        const coordination = context.coordinations.find(item => item.coordinacionEntregaId === load.coordinacionEntregaId)!;
        const agreement = context.agreements.find(item => item.acuerdoTransporteId === coordination.acuerdoTransporteId)!;
        agreement.moneda = 'USD';
        await expect(saveCarrierSettlement('3', {
            numeroLiquidacion: 'LT-USD-TEST', fechaLiquidacion: '2026-11-02', fleteCarga: 500,
            gastosReales: [], archivoLiquidacion: null, observaciones: '',
        })).rejects.toThrow(/solo se permite liquidar transporte con acuerdos en PEN/);
        expect(context.transportSettlements.some(item => item.cargaId === 3)).toBe(false);
        expect(context.transportExpenses.some(item => item.cargaId === 3)).toBe(false);
    });
    it('reemplaza viáticos de carga por gastos reales sin duplicarlos', async () => {
        const loadId = '3';
        expect(projectSettlementData(operationsContext()).find(load => load.id === loadId)?.transporte.estado).toBe('Por liquidar');
        const base = { numeroLiquidacion: 'LT-TEST-2026-001', fechaLiquidacion: '2026-11-02', fleteCarga: 500, archivoLiquidacion: null, observaciones: '' };
        await expect(saveCarrierSettlement(loadId, { ...base, fleteCarga: 1001, gastosReales: [] })).rejects.toThrow(/saldo pendiente del acuerdo/);
        await saveCarrierSettlement(loadId, { ...base, gastosReales: [] });
        const withViaticos = projectSettlementData(operationsContext()).find(load => load.id === loadId)!.transporte;
        expect(withViaticos.gastosReales).toEqual([]);
        expect(carrierTotal(withViaticos)).toBe(580);
        expect(operationsContext().transportExpenses.filter(expense => expense.cargaId === 3 && expense.incluidoEnLiquidacion).map(expense => expense.origen)).toEqual(['VIATICO']);

        await saveCarrierSettlement(loadId, { ...base, gastosReales: [{ id: 'new-peaje', concepto: 'Peaje', monto: 20 }] });
        const withReal = projectSettlementData(operationsContext()).find(load => load.id === loadId)!.transporte;
        expect(carrierTotal(withReal)).toBe(520);
        expect(withReal.gastosReales.map(expense => expense.concepto)).toEqual(['Peaje']);
        expect(operationsContext().transportExpenses.filter(expense => expense.cargaId === 3 && expense.incluidoEnLiquidacion).map(expense => expense.origen)).toEqual(['REAL']);
    });
});
