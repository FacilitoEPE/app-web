import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { createV1MockMiddleware } from './v1-mock.ts';
import { apiClient } from '@/shared/api/client';
import { refreshFrontendData, resetFrontendData } from '@/frontend-data';
import { operationsContext } from '@/modules/operations/api/operations-context.api';
import { projectSettlementData } from '@/modules/purchase-settlement/api/settlement-screen-data';
import { registerCarrierPayment, saveCarrierSettlement } from '@/modules/purchase-settlement/purchaseSettlement.store';
import { carrierTotal } from '@/modules/purchase-settlement/settlementOverview.utils';
import { campaignCommands } from '@/modules/campaigns/api/campaign-commands.api';
import { projectCampaignData } from '@/modules/campaigns/api/campaign-screen-data';

let server: Server;
let previousBase: string | undefined;

beforeEach(async () => {
    vi.stubEnv('VITE_API_CONTRACT', 'v1');
    const middleware = createV1MockMiddleware(path.resolve(import.meta.dirname, '..'), () => new Date('2026-11-08T15:00:00Z'), true);
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
    it('desembolsa desde el acuerdo y permite aplicar el crédito sin duplicar pagos en caja', async () => {
        await refreshFrontendData('/campaigns/1/carriers');
        const values = { fecha: '2026-11-05', monto: '60', referencia: 'ADEL-NUEVO' };
        await expect(campaignCommands.carrierAdvance(1, 2, values)).rejects.toThrow(/no habilita adelantos/);
        await expect(campaignCommands.carrierAdvance(1, 1, { ...values, monto: '100.01' })).rejects.toThrow(/supera el adelanto/);
        const advance = await campaignCommands.carrierAdvance(1, 1, values);
        await expect(campaignCommands.carrierAdvance(1, 1, { ...values, monto: '10' })).rejects.toMatchObject({ code: 'DUPLICATE' });
        await refreshFrontendData('/campaigns/1/carriers');
        expect(projectCampaignData(operationsContext()).carriers[1].find(row => row.id === 1)?.acuerdo)
            .toMatchObject({ adelanto: 300, adelantoDesembolsado: 260, fechaAdelanto: values.fecha });

        resetFrontendData();
        await refreshFrontendData('/liquidacion-compra/1/cargas/1/transportista');
        const transport = () => projectSettlementData(operationsContext()).find(row => row.id === '1')!.transporte;
        const advanceId = String(advance.adelantoTransporteId);
        expect(transport().pagos.reduce((sum, payment) => sum + payment.importe, 0)).toBe(150);
        expect(transport().adelantosDisponibles).toEqual([
            expect.objectContaining({ id: advanceId, referencia: values.referencia, saldoDisponible: 60 }),
        ]);
        const payment = { fecha: '2026-11-06', importe: 40, referencia: values.referencia, evidencia: null, observaciones: '' };
        await registerCarrierPayment('1', { ...payment, modo: 'Adelanto', medio: 'Aplicación de adelanto' }, advanceId);
        expect(transport().adelantosDisponibles).toEqual([]);
        expect(operationsContext().transportPayments.filter(row => row.liquidacionTransporteId === 1)).toHaveLength(1);
        const anotherLoad = projectSettlementData(operationsContext()).find(row => row.id === '3')!;
        expect(anotherLoad.transporte.adelantosDisponibles.find(row => row.id === advanceId)?.saldoDisponible).toBe(20);

        await registerCarrierPayment('1', { ...payment, modo: 'Caja', medio: 'Efectivo', importe: 25, referencia: 'CAJA-NUEVA' });
        await refreshFrontendData('/liquidacion-compra/1/cargas/1/transportista');
        const paid = transport().pagos.reduce((sum, row) => sum + row.importe, 0);
        expect(carrierTotal(transport()) - paid).toBe(295);
    }, 15000);

    it('conserva el tope acordado cuando se registran desembolsos simultáneos', async () => {
        const values = { fecha: '2026-11-05', monto: '60' };
        const attempts = await Promise.allSettled([
            campaignCommands.carrierAdvance(1, 1, { ...values, referencia: 'ADEL-SIM-1' }),
            campaignCommands.carrierAdvance(1, 1, { ...values, referencia: 'ADEL-SIM-2' }),
        ]);
        expect(attempts.filter(result => result.status === 'fulfilled')).toHaveLength(1);
        expect(attempts.find(result => result.status === 'rejected')).toMatchObject({ reason: { code: 'ADVANCE_EXCEEDED' } });
        const total = operationsContext().advances.filter(row => row.acuerdoTransporteId === 1).reduce((sum, row) => sum + row.monto, 0);
        expect(total).toBe(260);
    });

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
