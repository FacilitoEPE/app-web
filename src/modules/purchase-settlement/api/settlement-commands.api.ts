import { liquidacionProveedorV1, liquidacionTransporteV1, gastoTransporteV1, pagoProveedorV1, pagoTransporteV1, aplicacionAdelantoV1 } from '@/modules/purchase-settlement/api/v1.api';
import { personaV1, proveedorXPersonaV1 } from '@/modules/providers/api/v1.api';
import { coordinacionEntregaV1 } from '@/modules/campaigns/api/v1.api';
import { operationsContext } from '@/modules/operations/api/operations-context.api';
import { loadContext } from '@/modules/operations/api/operation-links';
import { commitRemote, requireId } from '@/shared/api/data-contract';
import { linkLocalDocument, uploadLocalDocument } from '@/shared/api/uploadDocument';
import { hasChanges } from '@/modules/quality/api/quality-commands.api';
import type { SettlementLinkedPerson, SettlementLoad, SettlementPaymentItem, CarrierRealExpense } from '@/modules/purchase-settlement/purchaseSettlement.models';
function editableLoad(loadId: string) {
    const context = loadContext(loadId);
    if (context.campaign.estado === 'terminado') throw new Error('La campaña está terminada y sus liquidaciones son de consulta.');
    return context;
}
export const settlementCommands = {
    addPerson: (loadId: string, providerId: string, person: Omit<SettlementLinkedPerson, 'id' | 'acumuladoAnualPen'>) => commitRemote(async () => {
        editableLoad(loadId);
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
        editableLoad(loadId);
        const uploaded = payload.archivoLiquidacion instanceof File ? await uploadLocalDocument(payload.archivoLiquidacion) : undefined;
        const c = loadContext(loadId), g = operationsContext(), id = requireId(providerId), source = g.loadProviders.find(p => p.cargaId === c.load.cargaId && g.participations.some(r => r.cxpId === p.cxpId && r.proveedorId === id));
        const price = source?.precioCompraKgAplicado ?? g.participations.find(p => p.cxpId === source?.cxpId)?.precioCompraKg;
        if (price !== payload.precioKg)
            throw new Error('El precio aplicado se obtiene de la participación del proveedor. Corrígelo allí antes de liquidar.');
        const participation = g.participations.find(p => p.cxpId === source?.cxpId);
        if (!participation) throw new Error('No se encontró la participación del proveedor.');
        const body = { proveedorId: id, personaLiquidacionId: requireId(payload.personaLiquidadaId), numero: payload.numeroLiquidacion, fecha: payload.fechaLiquidacion, moneda: participation.moneda, observaciones: payload.observaciones, avisoUitConfirmado: payload.confirmacionExcesoUit };
        const old = g.providerSettlements.find(s => s.cargaId === c.load.cargaId && s.proveedorId === id);
        const saved = await (old ? (hasChanges(old, body) ? liquidacionProveedorV1(c.load.cargaId).update(old.liquidacionProveedorId, body) : old) : liquidacionProveedorV1(c.load.cargaId).create(body));
        if (uploaded) await linkLocalDocument('liquidacion_proveedor', saved.liquidacionProveedorId, uploaded.id);
        return saved;
    }),
    carrier: (loadId: string, payload: {
        numeroLiquidacion: string;
        fechaLiquidacion: string;
        fleteCarga: number;
        gastosReales: CarrierRealExpense[];
        archivoLiquidacion: SettlementLoad['transporte']['archivoLiquidacion'];
        observaciones: string;
    }) => commitRemote(async () => {
        const g = operationsContext(), c = editableLoad(loadId), old = g.transportSettlements.find(s => s.cargaId === c.load.cargaId);
        const agreement = g.agreements.find(a => a.acuerdoTransporteId === c.coordination.acuerdoTransporteId);
        if (!agreement) throw new Error('No se encontró el acuerdo de transporte.');
        if (agreement.moneda !== 'PEN')
            throw new Error('Por ahora solo se permite liquidar transporte con acuerdos en PEN.');
        const otherFreight = g.transportSettlements.filter(document => document.cargaId !== c.load.cargaId &&
            g.coordinations.some(coordination => coordination.acuerdoTransporteId === agreement.acuerdoTransporteId &&
                g.loads.some(load => load.cargaId === document.cargaId && load.coordinacionEntregaId === coordination.coordinacionEntregaId)))
            .reduce((sum, document) => sum + document.flete, 0);
        if (payload.fleteCarga > Math.max(0, (agreement.montoAcordado ?? 0) - otherFreight))
            throw new Error('El flete supera el saldo pendiente del acuerdo de transporte.');
        if (old && c.coordination.fleteAsignado !== payload.fleteCarga)
            throw new Error('El flete ya fue liquidado. Corrígelo en la coordinación antes de emitir la liquidación.');
        const uploaded = payload.archivoLiquidacion instanceof File ? await uploadLocalDocument(payload.archivoLiquidacion) : undefined;
        if (c.coordination.fleteAsignado !== payload.fleteCarga)
            await coordinacionEntregaV1(c.delivery.entregaProgramadaId).update(c.coordination.coordinacionEntregaId, { fleteAsignado: payload.fleteCarga });
        const selectedIds = new Set(payload.gastosReales.map(expense => Number(expense.id)));
        for (const expense of g.transportExpenses.filter(e => e.cargaId === c.load.cargaId && e.origen === 'REAL' && e.incluidoEnLiquidacion && !selectedIds.has(e.gastoTransporteId)))
            await gastoTransporteV1(c.load.cargaId).remove(expense.gastoTransporteId);
        const referenceExpenses = [
            { concepto: 'Movilidad', monto: Number(c.load.viaticosMovilidad ?? 0) },
            { concepto: 'Insumos del personal', monto: Number(c.load.viaticosInsumos ?? 0) },
        ];
        const useReferenceExpenses = payload.gastosReales.length === 0;
        for (const expense of g.transportExpenses.filter(e => e.cargaId === c.load.cargaId && e.origen === 'VIATICO' && e.incluidoEnLiquidacion)) {
            if (!useReferenceExpenses || !referenceExpenses.some(reference => reference.concepto === expense.concepto && reference.monto > 0))
                await gastoTransporteV1(c.load.cargaId).remove(expense.gastoTransporteId);
        }
        if (useReferenceExpenses) {
            for (const expense of referenceExpenses.filter(item => item.monto > 0)) {
                const oldExpense = g.transportExpenses.find(row => row.cargaId === c.load.cargaId && row.origen === 'VIATICO' && row.incluidoEnLiquidacion && row.concepto === expense.concepto);
                const body = { ...expense, origen: 'VIATICO' as const, incluidoEnLiquidacion: true };
                if (oldExpense) {
                    if (hasChanges(oldExpense, body)) await gastoTransporteV1(c.load.cargaId).update(oldExpense.gastoTransporteId, body);
                } else await gastoTransporteV1(c.load.cargaId).create(body);
            }
        }
        for (const expense of payload.gastosReales) {
            const row = g.transportExpenses.find(e => e.cargaId === c.load.cargaId && e.gastoTransporteId === Number(expense.id)), body = { concepto: expense.concepto, monto: expense.monto, origen: 'REAL' as const, incluidoEnLiquidacion: true };
            if (row) {
                if (hasChanges(row, body))
                    await gastoTransporteV1(c.load.cargaId).update(row.gastoTransporteId, body);
            }
            else
                await gastoTransporteV1(c.load.cargaId).create(body);
        }
        const body = { numero: payload.numeroLiquidacion, fecha: payload.fechaLiquidacion, moneda: agreement.moneda, observaciones: payload.observaciones };
        const saved = await (old ? (hasChanges(old, body) ? liquidacionTransporteV1(c.load.cargaId).update(old.liquidacionTransporteId, body) : old) : liquidacionTransporteV1(c.load.cargaId).create(body));
        if (uploaded) await linkLocalDocument('liquidacion_transporte', saved.liquidacionTransporteId, uploaded.id);
        return saved;
    }),
    providerPayment: (loadId: string, providerId: string, payment: Omit<SettlementPaymentItem, 'id'>) => commitRemote(async () => {
        editableLoad(loadId);
        const uploaded = payment.evidencia instanceof File ? await uploadLocalDocument(payment.evidencia) : undefined;
        const row = operationsContext().providerSettlements.find(s => s.cargaId === requireId(loadId) && s.proveedorId === requireId(providerId));
        if (!row)
            throw new Error('Registra la liquidación del proveedor antes de pagar.');
        const saved = await pagoProveedorV1(row.liquidacionProveedorId).create({ fecha: payment.fecha, monto: payment.importe, medio: payment.medio, referencia: payment.referencia });
        if (uploaded) await linkLocalDocument('pago_proveedor', saved.pagoProveedorId, uploaded.id);
        return saved;
    }),
    carrierPayment: (loadId: string, payment: Omit<SettlementPaymentItem, 'id'>, advanceId?: string) => commitRemote(async () => {
        editableLoad(loadId);
        const uploaded = payment.evidencia instanceof File ? await uploadLocalDocument(payment.evidencia) : undefined;
        const row = operationsContext().transportSettlements.find(s => s.cargaId === requireId(loadId));
        if (!row)
            throw new Error('Registra la liquidación de transporte antes de pagar.');
        if (payment.modo === 'Adelanto') {
            const saved = await aplicacionAdelantoV1(row.liquidacionTransporteId).create({ adelantoTransporteId: requireId(advanceId ?? ''), fecha: payment.fecha, monto: payment.importe });
            if (uploaded) await linkLocalDocument('aplicacion_adelanto', saved.aplicacionAdelantoId, uploaded.id);
            return saved;
        }
        const saved = await pagoTransporteV1(row.liquidacionTransporteId).create({ fecha: payment.fecha, monto: payment.importe, medio: payment.medio, referencia: payment.referencia });
        if (uploaded) await linkLocalDocument('pago_transporte', saved.pagoTransporteId, uploaded.id);
        return saved;
    }),
};
