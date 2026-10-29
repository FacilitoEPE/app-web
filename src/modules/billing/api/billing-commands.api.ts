import { facturaVentaV1, cobroVentaV1 } from '@/modules/billing/api/future.api';
import { emitirFacturaV1 } from '@/modules/billing/api/future-actions.api';
import { loadContext } from '@/modules/operations/api/operation-links';
import { commitRemote, requireId } from '@/shared/api/data-contract';
import { assertNoNewFiles } from '@/shared/api/document-state';
import type { BillingInvoice, BillingCollectionItem } from '@/modules/billing/billing.models';
export const billingCommands = {
    prepare: (clientId: string, loadId: string, invoice: Omit<BillingInvoice, 'id' | 'cobros'> & {
        id?: string;
    }) => commitRemote(async () => {
        assertNoNewFiles(invoice);
        const c = loadContext(loadId);
        if (String(c.requirement.clienteNegocioCampanaId) !== clientId)
            throw new Error('La carga no pertenece al requerimiento de este cliente.');
        if (c.contract.precioKg !== invoice.precioUnitario)
            throw new Error('El precio de venta se obtiene del contrato. Actualízalo en Contratos antes de preparar la factura.');
        const body = { referenciaPreparacion: invoice.referenciaPreparacion, fechaPreparacion: invoice.fechaPreparacion, kilosFacturados: invoice.kilosFacturados, moneda: invoice.moneda, descuento: invoice.descuento, cargos: invoice.cargos, observaciones: invoice.observaciones };
        return invoice.id ? facturaVentaV1(c.load.cargaId).update(requireId(invoice.id), body) : facturaVentaV1(c.load.cargaId).create(body);
    }),
    issue: (_clientId: string, _loadId: string, id: string, payload: {
        numeroFacturaElectronica: string;
        fechaEmision: string;
        fechaVencimiento: string;
        archivoFacturaEmitida: unknown;
        observaciones: string;
    }) => commitRemote(async () => { assertNoNewFiles(payload.archivoFacturaEmitida); return emitirFacturaV1(requireId(id), { numeroFactura: payload.numeroFacturaElectronica, fechaEmision: payload.fechaEmision, fechaVencimiento: payload.fechaVencimiento || null }); }),
    collect: (_clientId: string, _loadId: string, id: string, value: Omit<BillingCollectionItem, 'id'>) => commitRemote(async () => { assertNoNewFiles(value.evidencia); return cobroVentaV1(requireId(id)).create({ fecha: value.fecha, monto: value.importe, medio: value.medio, referencia: value.referencia }); }),
};
