import { facturaVentaV1, cobroVentaV1 } from '@/modules/billing/api/v1.api';
import { emitirFacturaV1 } from '@/modules/billing/api/v1-actions.api';
import { hasLoadedWeight, loadContext } from '@/modules/operations/api/operation-links';
import { operationsContext } from '@/modules/operations/api/operations-context.api';
import { projectBillingData } from '@/modules/billing/api/billing-screen-data';
import { billingClientMatchesRoute } from '@/modules/billing/billing.utils';
import { commitRemote, requireId } from '@/shared/api/data-contract';
import { linkLocalDocument, uploadLocalDocument } from '@/shared/api/uploadDocument';
import type { BillingInvoice, BillingCollectionItem } from '@/modules/billing/billing.models';

function billingLoadContext(clientId: string, loadId: string) {
    const g = operationsContext(), context = loadContext(loadId, g);
    const link = g.requirements.find(row => String(row.clienteNegocioCampanaId) === clientId);
    if (link?.clienteNegocioId !== context.requirement.clienteNegocioId || link?.campaniaId !== context.campaign.campaniaId)
        throw new Error('La carga no pertenece a este cliente en la campaña.');
    return context;
}

export const billingCommands = {
    prepare: (clientId: string, loadId: string, invoice: Omit<BillingInvoice, 'id' | 'cobros'> & {
        id?: string;
    }) => commitRemote(async () => {
        const c = billingLoadContext(clientId, loadId);
        if (!hasLoadedWeight(c.load.cargaId, operationsContext()))
            throw new Error('Completa primero la carga en Calidad.');
        const load = projectBillingData(operationsContext()).find(client => billingClientMatchesRoute(client, clientId))?.cargas.find(item => item.id === loadId);
        if (!load?.respaldoLogisticoCompleto) throw new Error('Completa el peso, resultado y reporte de recepción antes de preparar la factura.');
        const otherKg = load.facturas.filter(item => item.id !== invoice.id).reduce((sum, item) => sum + item.kilosFacturados, 0);
        if (invoice.kilosFacturados <= 0 || otherKg + invoice.kilosFacturados > load.kilosRecibidos)
            throw new Error('Los kilos de la factura superan los disponibles de la carga.');
        if (c.contract.precioKg !== invoice.precioUnitario)
            throw new Error('El precio de venta se obtiene del contrato. Actualízalo en Contratos antes de preparar la factura.');
        if (c.contract.moneda !== invoice.moneda)
            throw new Error('La moneda de la factura debe coincidir con la del contrato de esta carga.');
        const uploaded = invoice.archivoPreparacion instanceof File ? await uploadLocalDocument(invoice.archivoPreparacion) : undefined;
        const body = { referenciaPreparacion: invoice.referenciaPreparacion, fechaPreparacion: invoice.fechaPreparacion, fechaVencimiento: invoice.fechaVencimiento || null, kilosFacturados: invoice.kilosFacturados, moneda: invoice.moneda, descuento: invoice.descuento, cargos: invoice.cargos, observaciones: invoice.observaciones };
        const saved = await (invoice.id ? facturaVentaV1(c.load.cargaId).update(requireId(invoice.id), body) : facturaVentaV1(c.load.cargaId).create(body));
        if (uploaded) await linkLocalDocument('factura_preparacion', saved.facturaVentaId, uploaded.id);
        return saved;
    }),
    issue: (clientId: string, loadId: string, id: string, payload: {
        numeroFacturaElectronica: string;
        fechaEmision: string;
        fechaVencimiento: string;
        archivoFacturaEmitida: unknown;
        observaciones: string;
    }) => commitRemote(async () => {
        const g = operationsContext();
        const { load } = billingLoadContext(clientId, loadId);
        if (!g.invoices.some(item => item.facturaVentaId === Number(id) && item.cargaId === load.cargaId))
            throw new Error('La factura no pertenece a esta carga.');
        if (!hasLoadedWeight(load.cargaId, g))
            throw new Error('Completa primero la carga en Calidad.');
        if (g.invoices.some(item => item.facturaVentaId !== Number(id) && item.numeroFactura?.toLocaleLowerCase('es') === payload.numeroFacturaElectronica.trim().toLocaleLowerCase('es')))
            throw new Error('Ya existe una factura emitida con ese número.');
        if (!payload.archivoFacturaEmitida) throw new Error('Adjunta el comprobante emitido.');
        const uploaded = payload.archivoFacturaEmitida instanceof File ? await uploadLocalDocument(payload.archivoFacturaEmitida) : undefined;
        const saved = await emitirFacturaV1(requireId(id), { numeroFactura: payload.numeroFacturaElectronica, fechaEmision: payload.fechaEmision, fechaVencimiento: payload.fechaVencimiento || null });
        if (uploaded) await linkLocalDocument('factura_emitida', requireId(id), uploaded.id);
        return saved;
    }),
    collect: (clientId: string, loadId: string, id: string, value: Omit<BillingCollectionItem, 'id'>) => commitRemote(async () => {
        const g = operationsContext();
        const { load } = billingLoadContext(clientId, loadId);
        const invoice = g.invoices.find(item => item.facturaVentaId === Number(id) && item.cargaId === load.cargaId);
        if (!invoice?.numeroFactura) throw new Error('Registra primero la factura emitida.');
        if (value.fecha < (invoice.fechaEmision ?? invoice.fechaPreparacion)) throw new Error('El cobro no puede ser anterior a la emisión.');
        const uploaded = value.evidencia instanceof File ? await uploadLocalDocument(value.evidencia) : undefined;
        const saved = await cobroVentaV1(requireId(id)).create({ fecha: value.fecha, monto: value.importe, medio: value.medio, referencia: value.referencia });
        if (uploaded) await linkLocalDocument('cobro_venta', saved.cobroVentaId, uploaded.id);
        return saved;
    }),
};
