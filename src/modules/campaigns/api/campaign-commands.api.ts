import { operationsContext } from '@/modules/operations/api/operations-context.api';
import { commitRemote, requireId } from '@/shared/api/data-contract';
import { linkLocalDocument, uploadDocument, uploadLocalDocument } from '@/shared/api/uploadDocument';
import { formatFecha } from '@/modules/campaigns/api/fecha.util';
import { contratoVentaV1, entregaProgramadaV1 } from '@/modules/commercial-planning/api/v1.api';
import { clienteNegocioCampanaV1, clienteNegocioCampanaXFrutaDerivadaV1, coordinacionEntregaV1, origenEntregaV1, entrevistaExtencionV1, certificadoCampanaV1, certificadoCampanaXProveedorV1, ampliacionCertificadoCampanaV1, pagoCertificadoCampanaV1 } from '@/modules/campaigns/api/v1.api';
import { examenProveedorV1 } from '@/modules/providers/api/v1.api';
import { acuerdoTransporteV1 } from '@/modules/carriers/api/v1.api';
import type { CampaignClientContractValues } from '@/modules/campaigns/campaignClientContract.utils';
import type { CampaignContractDeliveryValues, DeliveryCoordination } from '@/modules/campaigns/campaignContractDelivery.utils';
import type { InterviewValues } from '@/modules/campaigns/campaignInterview';
import type { ExamValues } from '@/modules/campaigns/campaignExam';
import type { CertificadoCampanaFormValues, ProductorCubierto, AmpliacionFormValues, PagoFormValues } from '@/modules/campaigns/campaignCertificate.utils';
import type { AgreementFormValues } from '@/modules/campaigns/campaignCarrier.utils';
import type { CreateContratoVentaV1 } from '@/modules/commercial-planning/api/v1.dto';
import type { CreateExamenProveedorV1 } from '@/modules/providers/api/v1.dto';
import type { CreateCertificadoCampanaV1 } from '@/modules/campaigns/api/v1.dto';
import type { CertificadoArchivos } from '@/modules/campaigns/campaignCertificates.store';
function currency(value: string): 'PEN' | 'USD' {
    if (value !== 'PEN' && value !== 'USD')
        throw new Error('Selecciona soles o dólares.');
    return value;
}
export const campaignCommands = {
    contract: (parent: number, values: CampaignClientContractValues, file: File | null, id?: number) => commitRemote(async () => {
        const g = operationsContext(), req = g.requirements.find(r => r.clienteNegocioCampanaId === parent), client = g.clients.find(c => c.clienteNegocioId === req?.clienteNegocioId);
        if (!req || !client)
            throw new Error('No se encontró el requerimiento del cliente.');
        const body: CreateContratoVentaV1 = { fecha: formatFecha(new Date()), canal: client.tipoCliente === 'industria' ? 'INDUSTRIA' : 'EXPORTACION', precioKg: values.precioKg.trim() ? Number(values.precioKg) : null, moneda: currency(values.moneda), variedades: values.variedades ?? [], condicionesPago: values.condicionesPago, condicionesEntrega: values.condicionesEntrega, observaciones: values.observaciones };
        const uploaded = file ? await uploadLocalDocument(file) : undefined;
        const saved = await (id ? contratoVentaV1(parent).update(id, body) : contratoVentaV1(parent).create(body));
        if (uploaded) await linkLocalDocument('contrato_venta', saved.contratoVentaId, uploaded.id);
        return saved;
    }),
    deleteContract: (parent: number, id: number) => commitRemote(() => contratoVentaV1(parent).remove(id)),
    delivery: (campaignId: number, contractId: number, values: CampaignContractDeliveryValues, id?: number) => commitRemote(async () => {
        const g = operationsContext(), fruit = g.campaigns.find(c => c.campaniaId === campaignId)?.frutaId;
        if (!fruit)
            throw new Error('No se encontró la fruta de la campaña.');
        const body = { fecha: values.fecha, variedades: values.variedades ?? [], destino: values.destino.trim(), observaciones: values.observaciones.trim() };
        const saved = id ? await entregaProgramadaV1(contractId).update(id, body) : await entregaProgramadaV1(contractId).create(body);
        return saved;
    }),
    deleteDelivery: (parent: number, id: number) => commitRemote(() => entregaProgramadaV1(parent).remove(id)),
    coordinate: (campaignId: number, deliveryId: number, value: DeliveryCoordination) => commitRemote(async () => {
        const g = operationsContext(), agreement = g.agreements.find(a => a.campaniaId === campaignId && a.idEmpresaTransporteExterno === value.carrierId);
        if (!agreement)
            throw new Error('Vincula el transportista a la campaña antes de coordinar.');
        const origins = value.proveedores.flatMap(provider => provider.fincas.map(name => {
            const p = g.participations.find(p => p.campaniaId === campaignId && p.proveedorId === provider.proveedorId), farm = g.farms.find(f => f.proveedorId === provider.proveedorId && f.nombreFinca === name);
            if (!p || !farm)
                throw new Error('Una finca seleccionada no pertenece a los proveedores de esta campaña.');
            return { cxpId: p.cxpId, fincaId: farm.fincaId };
        }));
        const body = { acuerdoTransporteId: agreement.acuerdoTransporteId, idEmpresaTransporteExterno: value.carrierId, idVehiculoExterno: value.vehicleId, idChoferTransporteExterno: value.driverId, inicioProgramado: new Date(value.fechaInicio).toISOString(), finProgramado: new Date(value.fechaFin).toISOString(), origenDescripcion: origins.map(o => g.farms.find(f => f.fincaId === o.fincaId)?.nombreFinca).join(', '), condicionesCarga: value.condicionesCarga, observaciones: value.observaciones };
        const current = g.coordinations.find(c => c.entregaProgramadaId === deliveryId), r = coordinacionEntregaV1(deliveryId), saved = current ? await r.update(current.coordinacionEntregaId, body) : await r.create(body);
        const previous = g.deliveryOrigins.filter(o => o.coordinacionEntregaId === saved.coordinacionEntregaId);
        for (const o of previous)
            if (!origins.some(n => n.cxpId === o.cxpId && n.fincaId === o.fincaId))
                await origenEntregaV1(saved.coordinacionEntregaId).remove(o.origenEntregaId);
        for (const o of origins)
            if (!previous.some(n => n.cxpId === o.cxpId && n.fincaId === o.fincaId))
                await origenEntregaV1(saved.coordinacionEntregaId).create(o);
    }),
    interview: (cxpId: number, values: InterviewValues, id?: string) => commitRemote(async () => {
        const g = operationsContext(), party = g.participations.find(p => p.cxpId === cxpId), farm = g.farms.find(f => f.proveedorId === party?.proveedorId && f.nombreFinca === values.fincaNombre);
        if (!farm)
            throw new Error('Registra primero la finca con su ubicación y variedad.');
        const campaign = g.campaigns.find(c => c.campaniaId === party?.campaniaId);
        const farmIds = farm.frutaDerivadaId ? [farm.frutaDerivadaId] : [];
        const eligible = g.varieties.filter(v => farmIds.includes(v.frutaDerivadaId) && v.frutaId === campaign?.frutaId);
        const existingVariety = id ? g.interviews.find(i => i.entrevistaId === Number(id))?.frutaDerivadaId : undefined;
        const body = { fincaId: farm.fincaId, frutaDerivadaId: existingVariety ?? (eligible[0]?.frutaDerivadaId ?? null), densidad: values.densidadPlantacion ? Number(values.densidadPlantacion) : null, distanciamientoDescripcion: values.distanciamiento, frecuenciaRiegoDescripcion: values.frecuenciaRiego, nombreAplicacion: values.nombreAplicacion || null, aplicacionesAlAno: values.aplicacionesAlAno ? Number(values.aplicacionesAlAno) : null };
        return id ? entrevistaExtencionV1(cxpId).update(requireId(id), body) : entrevistaExtencionV1(cxpId).create(body);
    }),
    exam: (providerId: number, value: ExamValues, id?: string) => commitRemote(async () => {
        const documentoUrl = value.archivo instanceof File ? await uploadDocument(value.archivo) : value.archivo?.url;
        const body: CreateExamenProveedorV1 = { fecha: value.fecha, tipoExamen: value.tipoExamen, codigoMuestra: value.identificacionMuestra, estadoExamen: value.estado === 'resultado' ? 'Con resultado' : value.estado === 'enviado' ? 'Enviado' : 'Pendiente', fechaEnvio: value.estado === 'pendiente' ? null : value.fechaEnvioMuestra, resultado: value.estado === 'resultado' && value.resultado ? value.resultado : null, observacion: value.observacion, ...(documentoUrl ? { documentoUrl } : {}) };
        return id ? examenProveedorV1(providerId).update(requireId(id), body) : examenProveedorV1(providerId).create(body);
    }),
    deleteExam: (providerId: number, id: string) => commitRemote(() => examenProveedorV1(providerId).remove(requireId(id))),
    certificate: (campaignId: number, value: CertificadoCampanaFormValues, producers: ProductorCubierto[], files: CertificadoArchivos, id?: number) => commitRemote(async () => {
        const g = operationsContext(), parties = producers.map(p => { const row = g.participations.find(r => r.cxpId === Number(p.id) && r.campaniaId === campaignId); if (!row)
            throw new Error('Productor no disponible en la campaña.'); return row; });
        const documentUrl = files.documento ? await uploadDocument(files.documento) : undefined;
        const receiptUrl = files.cotizacion ? await uploadDocument(files.cotizacion) : undefined;
        const body: CreateCertificadoCampanaV1 = { nombre: value.nombre, tipoCertificacion: value.tipo as CreateCertificadoCampanaV1['tipoCertificacion'], organismo: value.organismoEmisor, vigenciaDesde: value.validoDesde || null, fechaVencimiento: value.validoHasta || null, costo: Number(value.costo), kilosIniciales: Number(value.kilosIniciales), moneda: currency(value.moneda), observaciones: value.observaciones, ...(documentUrl ? { documentUrl } : {}), ...(receiptUrl ? { reciboUrl: receiptUrl } : {}) };
        const api = certificadoCampanaV1(campaignId), saved = id ? await api.update(id, body) : await api.create(body), coverage = g.coverage.filter(c => c.certificadoId === saved.certificadoId);
        for (const p of coverage)
            if (!parties.some(r => r.cxpId === p.cxpId))
                await certificadoCampanaXProveedorV1(saved.certificadoId).remove(p.certificadoCampanaXProveedorId);
        for (const p of parties)
            if (!coverage.some(c => c.cxpId === p.cxpId))
                await certificadoCampanaXProveedorV1(saved.certificadoId).create({ campaniaId: campaignId, cxpId: p.cxpId, proveedorId: p.proveedorId, kilosAutorizados: p.cantidadProveedor });
    }),
    expand: (_campaignId: number, id: number, value: AmpliacionFormValues) => commitRemote(() => ampliacionCertificadoCampanaV1(id).create({ fecha: value.fecha, kilosAdicionales: Number(value.kilos), referencia: value.referencia })),
    certificatePayment: (_campaignId: number, id: number, value: PagoFormValues, file: unknown) => commitRemote(async () => { const uploaded = file instanceof File ? await uploadLocalDocument(file) : undefined; const saved = await pagoCertificadoCampanaV1(id).create({ fecha: value.fecha, monto: Number(value.monto), referencia: value.referencia }); if (uploaded) await linkLocalDocument('pago_certificado', saved.pagoCertificadoCampanaId, uploaded.id); }),
    linkCarrier: (campaignId: number, carrierId: number, file: unknown) => commitRemote(async () => { const uploaded = file instanceof File ? await uploadLocalDocument(file) : undefined; const saved = await acuerdoTransporteV1(campaignId).create({ idEmpresaTransporteExterno: carrierId, estado: 'BORRADOR' }); if (uploaded) await linkLocalDocument('cotizacion_campana', saved.acuerdoTransporteId, uploaded.id); return saved; }),
    unlinkCarrier: (campaignId: number, id: number) => commitRemote(() => acuerdoTransporteV1(campaignId).remove(id)),
    agreement: (campaignId: number, id: number, value: AgreementFormValues, file: unknown) => commitRemote(async () => { if (value.moneda !== 'PEN' && value.moneda !== 'USD')
        throw new Error('Selecciona soles o dólares.'); const uploaded = file instanceof File ? await uploadLocalDocument(file) : undefined; const saved = await acuerdoTransporteV1(campaignId).update(id, { estado: 'CONFIRMADO', tipoPago: value.tipo === 'adelanto' ? 'CON_ADELANTO' : 'AL_FINAL', montoAcordado: Number(value.total), adelantoAcordado: value.tipo === 'adelanto' ? Number(value.adelanto) : 0, fechaAcuerdo: formatFecha(new Date()), fechaPagoFinal: value.fechaPago, moneda: value.moneda }); if (uploaded) await linkLocalDocument('boleta_acuerdo', saved.acuerdoTransporteId, uploaded.id); return saved; }),
    settleAgreement: async () => { throw new Error('Registra los pagos reales de las cargas desde Liquidación de compra. El acuerdo no genera un pago por sí mismo.'); },
    linkClient: (campaignId: number, value: {
        clienteNegocioId: string;
        cantidadKg: string;
        fechaRegistro: string;
        variedades: string[];
        destinoSolicitado: string;
        entregaDesde: string;
        entregaHasta: string;
        observaciones: string;
    }, fichaTecnica?: File | null) => commitRemote(async () => {
        const fichaTecnicaUrl = fichaTecnica ? await uploadDocument(fichaTecnica) : undefined;
        const body = { clienteNegocioId: requireId(value.clienteNegocioId), cantidadKg: Number(value.cantidadKg), kilosAcordados: Number(value.cantidadKg), fechaRegistro: value.fechaRegistro, destinoSolicitado: value.destinoSolicitado, entregaDesde: value.entregaDesde || null, entregaHasta: value.entregaHasta || null, observaciones: value.observaciones, ...(fichaTecnicaUrl ? { fichaTecnicaUrl } : {}) };
        const req = await clienteNegocioCampanaV1(campaignId).create(body);
        for (const id of value.variedades)
            await clienteNegocioCampanaXFrutaDerivadaV1(req.clienteNegocioCampanaId).create({ frutaDerivadaId: requireId(id) });
    }),
};
