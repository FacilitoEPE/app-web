import type { OperationsContext } from '@/modules/operations/api/operations-context.api';
import { hasLoadedWeight, loadContext } from '@/modules/operations/api/operation-links';
import type { BillingClient, BillingInvoice } from '@/modules/billing/billing.models';
export function projectBillingData(g: OperationsContext): BillingClient[] {
    const fileFor = (tipo: string, id: number) => { const file = g.localDocuments?.find(item => item.tipo === tipo && item.entidadId === id); return file ? { url: file.url, name: file.name, type: file.type, size: file.size } : null; };
    const receiptFile = (value: unknown) => { const file = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; return typeof file.url === 'string' && typeof file.name === 'string' ? { url: file.url, name: file.name, ...(typeof file.type === 'string' ? { type: file.type } : {}), ...(typeof file.size === 'number' ? { size: file.size } : {}) } : null; };
    const groups = new Map<string, OperationsContext['requirements']>();
    for (const requirement of g.requirements) {
        const key = `${requirement.campaniaId}:${requirement.clienteNegocioId}`;
        const group = groups.get(key) ?? [];
        group.push(requirement);
        groups.set(key, group);
    }
    const invoicedLoadIds = new Set(g.invoices.map(invoice => invoice.cargaId));
    const registeredLoads = g.loads.filter(load => hasLoadedWeight(load.cargaId, g) || invoicedLoadIds.has(load.cargaId))
        .map(load => loadContext(load.cargaId, g));
    return [...groups.values()].map(group => {
        const [req] = group.sort((a, b) => a.clienteNegocioCampanaId - b.clienteNegocioCampanaId);
        const ids = new Set(group.map(item => item.clienteNegocioCampanaId));
        const campaign = g.campaigns.find(c => c.campaniaId === req.campaniaId)!;
        const client = g.clients.find(c => c.clienteNegocioId === req.clienteNegocioId)!;
        const contracts = g.contracts.filter(c => ids.has(c.clienteNegocioCampanaId));
        const relevant = registeredLoads.filter(context => ids.has(context.requirement.clienteNegocioCampanaId));
        return { id: String(req.clienteNegocioCampanaId), requirementIds: [...ids].map(String), campaniaId: req.campaniaId, campaniaNombre: campaign.nombre, fruta: g.fruits.find(f => f.frutaId === campaign.frutaId)?.name ?? '', estadoCampania: campaign.estado, nombreEmpresa: client.nombreEmpresa, ruc: client.ruc, canal: client.tipoCliente === 'industria' ? 'Industria' : 'Exportación', pais: req.destinoSolicitado ?? client.ubicacion, contacto: client.nombreContacto, telefono: client.telefono, correo: client.correoCorporativo ?? '', moneda: (contracts[0]?.moneda ?? 'PEN') as BillingClient['moneda'], kilosContratados: contracts.reduce((n, c) => n + c.kilosAcordados, 0), contratosCount: contracts.length, precioPorKg: contracts[0]?.precioKg ?? 0, importesContratados: [...new Set(contracts.map(contract => contract.moneda))].map(moneda => ({ moneda, importe: contracts.filter(contract => contract.moneda === moneda).reduce((sum, contract) => sum + contract.kilosAcordados * (contract.precioKg ?? 0), 0) })),
            cargas: relevant.map(context => {
                const { load } = context;
                const receipt = g.receipts.find(r => r.cargaId === load.cargaId);
                const facturas: BillingInvoice[] = g.invoices.filter(i => i.cargaId === load.cargaId).map(i => {
                    const cobros = g.collections.filter(p => p.facturaVentaId === i.facturaVentaId).map(p => ({ id: String(p.cobroVentaId), fecha: p.fecha, importe: p.monto, medio: p.medio as 'Transferencia', referencia: p.referencia, evidencia: fileFor('cobro_venta', p.cobroVentaId), observaciones: '' })), paid = cobros.reduce((n, p) => n + p.importe, 0);
                    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
                    const estado: BillingInvoice['estado'] = i.estado === 'PREPARADA' ? 'Preparación pendiente' : paid >= i.importeVenta ? 'Cobrado' : i.fechaVencimiento && i.fechaVencimiento < today ? 'Vencido' : paid > 0 ? 'Cobrado parcial' : 'Emitida';
                    return { id: String(i.facturaVentaId), referenciaPreparacion: i.referenciaPreparacion, numeroFacturaElectronica: i.numeroFactura ?? '', estado, fechaPreparacion: i.fechaPreparacion, fechaEmision: i.fechaEmision ?? '', fechaVencimiento: i.fechaVencimiento ?? '', kilosFacturados: i.kilosFacturados, precioUnitario: i.precioKgAplicado, descuento: i.descuento, cargos: i.cargos, total: i.importeVenta, moneda: i.moneda as BillingInvoice['moneda'], archivoPreparacion: fileFor('factura_preparacion', i.facturaVentaId), archivoFacturaEmitida: fileFor('factura_emitida', i.facturaVentaId), observaciones: i.observaciones ?? '', cobros };
                });
                const report = receiptFile(receipt?.documentos.reporteRecepcionPlanta) ?? receiptFile(receipt?.logistica.reporteRecepcionArchivo)
                    ?? (receipt ? fileFor('recepcion_planta', receipt.recepcionPlantaId) : null);
                return { id: String(load.cargaId), requirementId: String(context.requirement.clienteNegocioCampanaId), codigo: load.codigo, fechaRecepcion: receipt?.fechaRecepcion?.slice(0, 10) ?? '', kilosCargados: g.loadProviders.filter(p => p.cargaId === load.cargaId).reduce((n, p) => n + p.kilosCargados, 0), kilosRecibidos: receipt?.pesoPlantaKg ?? 0, precioVentaKg: context.contract.precioKg ?? 0, moneda: context.contract.moneda as BillingClient['moneda'], reporteRecepcion: report, respaldoLogisticoCompleto: Boolean(receipt?.pesoPlantaKg && receipt.resultado && report), facturas };
            }) };
    });
}
