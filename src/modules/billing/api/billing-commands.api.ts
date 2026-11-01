import { facturaVentaV1, cobroVentaV1 } from '@/modules/billing/api/future.api';
import { emitirFacturaV1 } from '@/modules/billing/api/future-actions.api';
import { loadContext } from '@/modules/operations/api/operation-links';
import { commitRemote, requireId } from '@/shared/api/data-contract';
import { linkLocalDocument, uploadLocalDocument } from '@/shared/api/uploadDocument';
import type { BillingInvoice, BillingCollectionItem } from '@/modules/billing/billing.models';
export const billingCommands = {
    prepare: (clientId: string, loadId: string, invoice: Omit<BillingInvoice, 'id' | 'cobros'> & {
        id?: string;
    }) => commitRemote(async () => {
        const uploaded = invoice.archivoPreparacion instanceof File ? await uploadLocalDocument(invoice.archivoPreparacion) : undefined;
        const c = loadContext(loadId);
        if (String(c.requirement.clienteNegocioCampanaId) !== clientId)
            throw new Error('La carga no pertenece al requerimiento de este cliente.');
        if (c.contract.precioKg !== invoice.precioUnitario)
            throw new Error('El precio de venta se obtiene del contrato. Actualízalo en Contratos antes de preparar la factura.');
        const body = { referenciaPreparacion: invoice.referenciaPreparacion, fechaPreparacion: invoice.fechaPreparacion, fechaVencimiento: invoice.fechaVencimiento || null, kilosFacturados: invoice.kilosFacturados, moneda: invoice.moneda, descuento: invoice.descuento, cargos: invoice.cargos, observaciones: invoice.observaciones };
        const saved = await (invoice.id ? facturaVentaV1(c.load.cargaId).update(requireId(invoice.id), body) : facturaVentaV1(c.load.cargaId).create(body));
        if (uploaded) await linkLocalDocument('factura_preparacion', saved.facturaVentaId, uploaded.id);
        return saved;
    }),
    issue: (_clientId: string, _loadId: string, id: string, payload: {
        numeroFacturaElectronica: string;
        fechaEmision: string;
        fechaVencimiento: string;
        archivoFacturaEmitida: unknown;
        observaciones: string;
    }) => commitRemote(async () => { const uploaded = payload.archivoFacturaEmitida instanceof File ? await uploadLocalDocument(payload.archivoFacturaEmitida) : undefined; const saved = await emitirFacturaV1(requireId(id), { numeroFactura: payload.numeroFacturaElectronica, fechaEmision: payload.fechaEmision, fechaVencimiento: payload.fechaVencimiento || null }); if (uploaded) await linkLocalDocument('factura_emitida', requireId(id), uploaded.id); return saved; }),
    collect: (_clientId: string, _loadId: string, id: string, value: Omit<BillingCollectionItem, 'id'>) => commitRemote(async () => { const uploaded = value.evidencia instanceof File ? await uploadLocalDocument(value.evidencia) : undefined; const saved = await cobroVentaV1(requireId(id)).create({ fecha: value.fecha, monto: value.importe, medio: value.medio, referencia: value.referencia }); if (uploaded) await linkLocalDocument('cobro_venta', saved.cobroVentaId, uploaded.id); return saved; }),
};
