import { format } from 'date-fns';
import type { OperationsContext } from '@/modules/operations/api/operations-context.api';
import type { CampaignClientContractLocal } from '@/modules/campaigns/campaignClientContract.utils';
import type { CampaignContractDeliveryLocal } from '@/modules/campaigns/campaignContractDelivery.utils';
import type { CertificadoCampanaLocal } from '@/modules/campaigns/campaignCertificate.utils';
import type { CampaignCarrierLink } from '@/modules/campaigns/campaignCarrier.utils';
import type { CampaignInterviewRecord } from '@/modules/campaigns/campaignInterview.utils';
import type { LocalExam } from '@/modules/campaigns/campaignExam';
import { providerName } from '@/modules/operations/api/operation-links';
export function projectCampaignData(g: OperationsContext) {
    const contracts: Record<string, CampaignClientContractLocal[]> = {}, deliveries: Record<string, CampaignContractDeliveryLocal[]> = {}, certificates: Record<number, CertificadoCampanaLocal[]> = {}, carriers: Record<number, CampaignCarrierLink[]> = {}, interviews = new Map<number, CampaignInterviewRecord[]>(), exams: Record<number, LocalExam[]> = {};
    for (const row of g.contracts) {
        const req = g.requirements.find(r => r.clienteNegocioCampanaId === row.clienteNegocioCampanaId);
        if (!req)
            continue;
        const key = `${req.campaniaId}:${req.clienteNegocioCampanaId}`;
        (contracts[key] ??= []).push({ id: row.contratoVentaId, fechaRegistro: row.fecha, precioKg: row.precioKg ?? 0, moneda: row.moneda, cantidadPropuestaKg: row.kilosAcordados, condicionesPago: row.condicionesPago ?? '', condicionesEntrega: row.condicionesEntrega ?? '', observaciones: row.observaciones ?? '', archivo: null });
        deliveries[`${key}:${row.contratoVentaId}`] = g.deliveries.filter(d => d.contratoVentaId === row.contratoVentaId).map(d => {
            const c = g.coordinations.find(c => c.entregaProgramadaId === d.entregaProgramadaId);
            const providerIds = [...new Set(g.deliveryOrigins.filter(o => o.coordinacionEntregaId === c?.coordinacionEntregaId).map(o => g.participations.find(p => p.cxpId === o.cxpId)?.proveedorId).filter((id): id is number => id !== undefined))];
            return { id: d.entregaProgramadaId, fecha: d.fecha, kilosProgramados: d.kilosProgramados, destino: d.destino, observaciones: d.observaciones ?? '', variedad: g.deliveryVarieties.filter(v => v.entregaProgramadaId === d.entregaProgramadaId).map(v => g.varieties.find(x => x.frutaDerivadaId === v.frutaDerivadaId)?.name ?? '').join(', '),
                coordinacion: c ? { carrierId: c.idEmpresaTransporteExterno, vehicleId: c.idVehiculoExterno, driverId: c.idChoferTransporteExterno, fechaInicio: format(new Date(c.inicioProgramado), "yyyy-MM-dd'T'HH:mm"), fechaFin: format(new Date(c.finProgramado), "yyyy-MM-dd'T'HH:mm"), condicionesCarga: c.condicionesCarga ?? '', observaciones: c.observaciones ?? '', proveedores: providerIds.map(proveedorId => ({ proveedorId, fincas: g.deliveryOrigins.filter(o => o.coordinacionEntregaId === c.coordinacionEntregaId && g.participations.find(p => p.cxpId === o.cxpId)?.proveedorId === proveedorId).map(o => g.farms.find(f => f.fincaId === o.fincaId)?.nombreFinca ?? '') })) } : null };
        });
    }
    for (const row of g.certificates) {
        ;
        (certificates[row.campaniaId] ??= []).push({ id: row.certificadoId, tipo: row.tipoCertificacion ?? '', nombre: row.nombre, organismoEmisor: row.organismo ?? '', validoDesde: row.vigenciaDesde ?? '', validoHasta: row.fechaVencimiento ?? '', estadoTramite: row.fechaVencimiento ? 'certificado' : 'pendiente', moneda: row.moneda ?? 'PEN', costo: row.costo, kilosIniciales: row.kilosIniciales ?? g.coverage.filter(c => c.certificadoId === row.certificadoId).reduce((n, c) => n + c.kilosAutorizados, 0), productores: g.coverage.filter(c => c.certificadoId === row.certificadoId).map(c => ({ id: String(c.cxpId), nombre: providerName(c.proveedorId, g), kilos: c.kilosAutorizados })), observaciones: row.observaciones ?? '', documento: null, cotizacion: null, ampliaciones: g.expansions.filter(e => e.certificadoId === row.certificadoId).map(e => ({ id: e.ampliacionCertificadoCampanaId, kilos: e.kilosAdicionales, fecha: e.fecha, referencia: e.referencia })), pagos: g.certificatePayments.filter(p => p.certificadoId === row.certificadoId).map(p => ({ id: p.pagoCertificadoCampanaId, monto: p.monto, fecha: p.fecha, referencia: p.referencia, evidencia: null })) });
    }
    for (const row of g.agreements) {
        const transportDocs = g.transportSettlements.filter(s => g.loads.some(l => l.cargaId === s.cargaId && g.coordinations.some(c => c.coordinacionEntregaId === l.coordinacionEntregaId && c.acuerdoTransporteId === row.acuerdoTransporteId)));
        const totalPaid = transportDocs.reduce((n, s) => n + g.transportPayments.filter(p => p.liquidacionTransporteId === s.liquidacionTransporteId).reduce((n, p) => n + p.monto, 0) + g.applications.filter(p => p.liquidacionTransporteId === s.liquidacionTransporteId).reduce((n, p) => n + p.monto, 0), 0);
        (carriers[row.campaniaId] ??= []).push({ id: row.acuerdoTransporteId, carrierId: row.idEmpresaTransporteExterno, fechaVinculacion: row.createdAt.slice(0, 10), cotizacion: null, acuerdo: row.estado === 'CONFIRMADO' && row.montoAcordado ? { tipo: row.tipoPago === 'CON_ADELANTO' ? 'adelanto' : 'unico', moneda: row.moneda, total: row.montoAcordado, adelanto: row.tipoPago === 'CON_ADELANTO' ? row.adelantoAcordado : null, fechaAdelanto: g.advances.find(a => a.acuerdoTransporteId === row.acuerdoTransporteId)?.fecha ?? '', fechaPago: row.fechaPagoFinal ?? '', boleta: null, saldoPagado: totalPaid >= row.montoAcordado } : null });
    }
    for (const row of g.interviews) {
        const p = g.participations.find(p => p.cxpId === row.camXProvId), f = g.farms.find(f => f.fincaId === row.fincaId);
        if (!p || !f)
            continue;
        const record: CampaignInterviewRecord = { id: String(row.entrevistaId), campaignId: p.campaniaId, createdAt: row.createdAt, codigoFyv: row.codigo, values: { fincaNombre: f.nombreFinca, densidadPlantacion: row.densidad === null ? '' : String(row.densidad), distanciamiento: row.distanciamientoDescripcion ?? String(row.distanciamiento ?? ''), frecuenciaRiego: row.frecuenciaRiegoDescripcion ?? String(row.frecuencia ?? ''), haTotalFinca: String(f.haTotalFinca), haCultivo: String(f.haCultivo), nombreAplicacion: row.nombreAplicacion ?? '', aplicacionesAlAno: String(row.aplicacionesAlAno ?? ''), departamento: f.departamento, provincia: f.provincia, distrito: f.distrito, latitud: String(f.latitud), longitud: String(f.longitud) } };
        interviews.set(p.cxpId, [...(interviews.get(p.cxpId) ?? []), record]);
    }
    for (const row of g.exams)
        (exams[row.proveedorId] ??= []).push({ id: String(row.examenProveedorId), proveedorId: row.proveedorId, tipoExamen: row.tipoExamen, fecha: row.fecha, identificacionMuestra: row.codigoMuestra ?? '', estado: row.estadoExamen === 'Con resultado' ? 'resultado' : row.estadoExamen === 'Enviado' ? 'enviado' : 'pendiente', fechaEnvioMuestra: row.fechaEnvio ?? '', resultado: row.resultado ?? '', observacion: row.observacion ?? '', archivo: row.documentoUrl ? { url: row.documentoUrl, name: 'Documento de laboratorio' } : null });
    return { contracts, deliveries, certificates, carriers, interviews, exams };
}
