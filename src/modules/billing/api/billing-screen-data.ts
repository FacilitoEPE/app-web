import type { OperationsContext } from '@/modules/operations/api/operations-context.api';
import { loadContext } from '@/modules/operations/api/operation-links';
import type { BillingClient, BillingInvoice } from '@/modules/billing/billing.models';
export function projectBillingData(g: OperationsContext): BillingClient[] {
    return g.requirements.map(req => {
        const campaign = g.campaigns.find(c => c.campaniaId === req.campaniaId)!, client = g.clients.find(c => c.clienteNegocioId === req.clienteNegocioId)!, contracts = g.contracts.filter(c => c.clienteNegocioCampanaId === req.clienteNegocioCampanaId);
        const relevant = g.loads.filter(load => loadContext(load.cargaId, g).requirement.clienteNegocioCampanaId === req.clienteNegocioCampanaId);
        return { id: String(req.clienteNegocioCampanaId), campaniaId: req.campaniaId, campaniaNombre: campaign.nombre, fruta: g.fruits.find(f => f.frutaId === campaign.frutaId)?.name ?? '', estadoCampania: campaign.estado, nombreEmpresa: client.nombreEmpresa, ruc: client.ruc, canal: client.tipoCliente === 'industria' ? 'Industria' : 'Exportación', pais: req.destinoSolicitado ?? client.ubicacion, contacto: client.nombreContacto, correo: client.correoCorporativo ?? '', moneda: (contracts[0]?.moneda ?? 'PEN') as BillingClient['moneda'], kilosContratados: contracts.reduce((n, c) => n + c.kilosAcordados, 0), precioPorKg: contracts[0]?.precioKg ?? 0,
            cargas: relevant.map(load => {
                const context = loadContext(load.cargaId, g), receipt = g.receipts.find(r => r.cargaId === load.cargaId);
                const facturas: BillingInvoice[] = g.invoices.filter(i => i.cargaId === load.cargaId).map(i => {
                    const cobros = g.collections.filter(p => p.facturaVentaId === i.facturaVentaId).map(p => ({ id: String(p.cobroVentaId), fecha: p.fecha, importe: p.monto, medio: p.medio as 'Transferencia', referencia: p.referencia, evidencia: null, observaciones: '' })), paid = cobros.reduce((n, p) => n + p.importe, 0);
                    return { id: String(i.facturaVentaId), referenciaPreparacion: i.referenciaPreparacion, numeroFacturaElectronica: i.numeroFactura ?? '', estado: i.estado === 'PREPARADA' ? 'Preparación pendiente' : paid >= i.importeVenta ? 'Cobrado' : paid > 0 ? 'Cobrado parcial' : 'Emitida', fechaPreparacion: i.fechaPreparacion, fechaEmision: i.fechaEmision ?? '', fechaVencimiento: i.fechaVencimiento ?? '', kilosFacturados: i.kilosFacturados, precioUnitario: i.precioKgAplicado, descuento: i.descuento, cargos: i.cargos, total: i.importeVenta, moneda: i.moneda as BillingInvoice['moneda'], archivoPreparacion: null, archivoFacturaEmitida: null, observaciones: i.observaciones ?? '', cobros };
                });
                return { id: String(load.cargaId), codigo: load.codigo, fechaRecepcion: receipt?.fechaRecepcion?.slice(0, 10) ?? '', kilosCargados: g.loadProviders.filter(p => p.cargaId === load.cargaId).reduce((n, p) => n + p.kilosCargados, 0), kilosRecibidos: receipt?.pesoPlantaKg ?? 0, precioVentaKg: context.contract.precioKg ?? 0, moneda: context.contract.moneda as BillingClient['moneda'], reporteRecepcion: null, respaldoLogisticoCompleto: Boolean(receipt?.recepcionConfirmadaAt), facturas };
            }) };
    });
}
