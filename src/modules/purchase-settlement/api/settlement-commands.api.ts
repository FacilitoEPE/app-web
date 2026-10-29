import { liquidacionProveedorV1, liquidacionTransporteV1, gastoTransporteV1, pagoProveedorV1, pagoTransporteV1, aplicacionAdelantoV1 } from '@/modules/purchase-settlement/api/future.api';
import { personaV1, proveedorXPersonaV1 } from '@/modules/providers/api/future.api';
import { coordinacionEntregaV1 } from '@/modules/campaigns/api/future.api';
import { operationsContext } from '@/modules/operations/api/operations-context.api';
import { loadContext } from '@/modules/operations/api/operation-links';
import { commitRemote, requireId } from '@/shared/api/data-contract';
import { assertNoNewFiles } from '@/shared/api/document-state';
import { hasChanges } from '@/modules/quality/api/quality-commands.api';
import type { SettlementLinkedPerson, SettlementLoad, SettlementPaymentItem, CarrierRealExpense } from '@/modules/purchase-settlement/purchaseSettlement.models';
export const settlementCommands = {
    addPerson: (loadId: string, providerId: string, person: Omit<SettlementLinkedPerson, 'id' | 'acumuladoAnualPen'>) => commitRemote(async () => {
        loadContext(loadId);
        const saved = await personaV1.create({ nombres: person.nombres, apellidos: person.apellidos, tipoDocumento: person.tipoDocumento, numeroDocumento: person.numeroDocumento });
        await proveedorXPersonaV1(requireId(providerId)).create({ personaId: saved.personaId, vinculo: person.vinculo });
        return { ...person, id: String(saved.personaId), acumuladoAnualPen: 0 };
    }),
    provider: (loadId: string, providerId: string, payload: {
        numeroLiquidacion: string;
        fechaLiquidacion: string;
        precioKg: number;
        personaLiquidadaId: string;
        confirmacionExcesoUit: boolean;
        archivoLiquidacion: unknown;
        observaciones: string;
    }) => commitRemote(async () => {
        assertNoNewFiles(payload.archivoLiquidacion);
        const c = loadContext(loadId), g = operationsContext(), id = requireId(providerId), source = g.loadProviders.find(p => p.cargaId === c.load.cargaId && g.participations.some(r => r.cxpId === p.cxpId && r.proveedorId === id));
        const price = source?.precioCompraKgAplicado ?? g.participations.find(p => p.cxpId === source?.cxpId)?.precioCompraKg;
        if (price !== payload.precioKg)
            throw new Error('El precio aplicado se obtiene de la participación del proveedor. Corrígelo allí antes de liquidar.');
        const body = { proveedorId: id, personaLiquidacionId: requireId(payload.personaLiquidadaId), numero: payload.numeroLiquidacion, fecha: payload.fechaLiquidacion, moneda: 'PEN', observaciones: payload.observaciones, avisoUitConfirmado: payload.confirmacionExcesoUit };
        const old = g.providerSettlements.find(s => s.cargaId === c.load.cargaId && s.proveedorId === id);
        return old ? (hasChanges(old, body) ? liquidacionProveedorV1(c.load.cargaId).update(old.liquidacionProveedorId, body) : old) : liquidacionProveedorV1(c.load.cargaId).create(body);
    }),
    carrier: (loadId: string, payload: {
        numeroLiquidacion: string;
        fechaLiquidacion: string;
        fleteCarga: number;
        gastosReales: CarrierRealExpense[];
        archivoLiquidacion: SettlementLoad['transporte']['archivoLiquidacion'];
        observaciones: string;
    }) => commitRemote(async () => {
        assertNoNewFiles(payload.archivoLiquidacion);
        const g = operationsContext(), c = loadContext(loadId), old = g.transportSettlements.find(s => s.cargaId === c.load.cargaId);
        if (c.coordination.fleteAsignado !== payload.fleteCarga)
            await coordinacionEntregaV1(c.delivery.entregaProgramadaId).update(c.coordination.coordinacionEntregaId, { fleteAsignado: payload.fleteCarga });
        for (const expense of payload.gastosReales) {
            const row = g.transportExpenses.find(e => e.cargaId === c.load.cargaId && (e.gastoTransporteId === Number(expense.id) || e.concepto === expense.concepto)), body = { concepto: expense.concepto, monto: expense.monto, origen: 'REAL' as const, incluidoEnLiquidacion: true };
            if (row) {
                if (hasChanges(row, body))
                    await gastoTransporteV1(c.load.cargaId).update(row.gastoTransporteId, body);
            }
            else
                await gastoTransporteV1(c.load.cargaId).create(body);
        }
        const body = { numero: payload.numeroLiquidacion, fecha: payload.fechaLiquidacion, moneda: 'PEN', observaciones: payload.observaciones };
        return old ? (hasChanges(old, body) ? liquidacionTransporteV1(c.load.cargaId).update(old.liquidacionTransporteId, body) : old) : liquidacionTransporteV1(c.load.cargaId).create(body);
    }),
    providerPayment: (loadId: string, providerId: string, payment: Omit<SettlementPaymentItem, 'id'>) => commitRemote(async () => {
        assertNoNewFiles(payment.evidencia);
        const row = operationsContext().providerSettlements.find(s => s.cargaId === requireId(loadId) && s.proveedorId === requireId(providerId));
        if (!row)
            throw new Error('Registra la liquidación del proveedor antes de pagar.');
        return pagoProveedorV1(row.liquidacionProveedorId).create({ fecha: payment.fecha, monto: payment.importe, medio: payment.medio, referencia: payment.referencia });
    }),
    carrierPayment: (loadId: string, payment: Omit<SettlementPaymentItem, 'id'>, advanceId?: string) => commitRemote(async () => {
        assertNoNewFiles(payment.evidencia);
        const row = operationsContext().transportSettlements.find(s => s.cargaId === requireId(loadId));
        if (!row)
            throw new Error('Registra la liquidación de transporte antes de pagar.');
        return payment.modo === 'Adelanto' ? aplicacionAdelantoV1(row.liquidacionTransporteId).create({ adelantoTransporteId: requireId(advanceId ?? ''), fecha: payment.fecha, monto: payment.importe }) : pagoTransporteV1(row.liquidacionTransporteId).create({ fecha: payment.fecha, monto: payment.importe, medio: payment.medio, referencia: payment.referencia });
    }),
};
