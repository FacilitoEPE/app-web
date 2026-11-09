import { solicitudTransporteV1, invitacionTransporteV1, cotizacionTransporteV1, empresaTransporteExternoV1 } from '@/modules/carriers/api/v1.api';
import { ensureViewDocuments, operationsContext, readAllV1, type OperationsContext } from '@/modules/operations/api/operations-context.api';
import { commitRemote, refreshRemoteData, requireId } from '@/shared/api/data-contract';
import { linkLocalDocument, uploadLocalDocument } from '@/shared/api/uploadDocument';
import { formatFecha } from '@/modules/campaigns/api/fecha.util';
import type { CarrierExtras } from '@/modules/carriers/carrierProfile.utils';
import type { CarrierRequirementQuotation, CarrierQuotationStatus } from '@/modules/carriers/carrierQuotations.store';
export function projectCarrierData(g: OperationsContext) {
    const extras: Record<number, CarrierExtras> = {};
    for (const c of g.carriers)
        extras[c.idEmpresaTransporteExterno] = { tipo: c.tipoTransportista === 'INDEPENDIENTE' ? 'privado' : 'publico', documento: c.numeroDocumento ?? '', mtc: c.registroMtc ?? '', cgn: '', departamento: c.departamento ?? '', provincia: c.provincia ?? '', ciudad: c.ciudad ?? '' };
    const quotations: CarrierRequirementQuotation[] = g.invitations.map(inv => {
        const request = g.requests.find(r => r.solicitudTransporteId === inv.solicitudTransporteId)!, campaign = g.campaigns.find(c => c.campaniaId === request.campaniaId)!, carrier = g.carriers.find(c => c.idEmpresaTransporteExterno === inv.idEmpresaTransporteExterno)!, quote = g.quotations.filter(q => q.invitacionTransporteId === inv.invitacionTransporteId).at(-1);
        const file = g.localDocuments?.find(item => item.tipo === 'cotizacion_transporte' && item.entidadId === quote?.cotizacionTransporteId);
        const requirementFile = g.localDocuments?.find(item => item.tipo === 'solicitud_transporte' && item.entidadId === request.solicitudTransporteId);
        return { id: String(inv.invitacionTransporteId), requestId: request.solicitudTransporteId, codigo: request.referencia, carrierId: carrier.idEmpresaTransporteExterno, transportistaNombre: carrier.nombreCompleto, transportistaRuc: carrier.ruc ?? carrier.numeroDocumento ?? '', campaniaId: campaign.campaniaId, campaniaNombre: campaign.nombre, fruta: g.fruits.find(f => f.frutaId === campaign.frutaId)?.name ?? '', descripcion: request.mensaje ?? request.condiciones ?? '', cantidadEstimada: request.cantidadEstimada?.trim() ?? '', fechaRecojo: request.ventanaServicio ?? '', fechaLimiteCotizacion: request.limiteRespuesta?.slice(0, 10) ?? '', lugarRecojo: request.origen, destino: request.destino, observaciones: quote?.condiciones ?? '', estado: quote ? 'Recibida' : 'En espera', montoCotizadoPen: quote?.monto ?? null, moneda: quote?.moneda === 'USD' ? 'USD' : 'PEN', documentoRequerimiento: requirementFile ? { url: requirementFile.url, name: requirementFile.name, type: requirementFile.type, size: requirementFile.size } : null, documentoCotizacion: file ? { url: file.url, name: file.name, type: file.type, size: file.size } : null, vehiculoAsignadoPlaca: '', choferAsignadoNombre: '', choferAsignadoLicencia: '' };
    });
    return { extras, quotations };
}
export const requestCampaignOptions = () => operationsContext().campaigns.filter(c => c.estado !== 'terminado').map(c => ({ value: String(c.campaniaId), label: c.nombre }));
export async function loadCarrierQuotations() {
    const context = operationsContext();
    for (const invitation of context.invitations) await readAllV1(`/invitaciones-transporte/${invitation.invitacionTransporteId}/cotizaciones`);
    if (operationsContext() !== context) return;
    await ensureViewDocuments();
    if (operationsContext() === context) await refreshRemoteData();
}
export const quotationCommands = {
    send: (input: {
        campaniaId: number;
        referencia: string;
        origen: string;
        destino: string;
        mensaje: string;
        carrierIds: number[];
        documento: File;
    }) => commitRemote(async () => {
        const selectedCarriers = input.carrierIds.map(id => operationsContext().carriers.find(c => c.idEmpresaTransporteExterno === id));
        if (selectedCarriers.some(c => !c?.correo?.trim()))
            throw new Error('Todos los transportistas seleccionados deben tener un correo electrónico registrado para enviar el requerimiento.');
        const uploaded = await uploadLocalDocument(input.documento);
        const request = await solicitudTransporteV1(input.campaniaId).create({ referencia: input.referencia, origen: input.origen, destino: input.destino, mensaje: input.mensaje });
        await linkLocalDocument('solicitud_transporte', request.solicitudTransporteId, uploaded.id);
        for (const id of input.carrierIds)
            await invitacionTransporteV1(request.solicitudTransporteId).create({ idEmpresaTransporteExterno: id, correoSnapshot: operationsContext().carriers.find(c => c.idEmpresaTransporteExterno === id)?.correo ?? null });
    }),
    respond: (id: string, value: {
        estado: CarrierQuotationStatus;
        montoCotizadoPen: number | null;
        moneda?: 'PEN' | 'USD';
        documentoCotizacion: unknown;
        observaciones: string;
    }) => commitRemote(async () => {
        const inv = operationsContext().invitations.find(i => i.invitacionTransporteId === requireId(id));
        if (!inv)
            throw new Error('Invitación no encontrada.');
        if (value.estado !== 'Recibida')
            throw new Error('Registra una cotización recibida con su monto. El estado de espera corresponde a invitaciones sin respuesta.');
        if (value.montoCotizadoPen === null || value.montoCotizadoPen <= 0)
            throw new Error('Ingresa el monto de la cotización.');
        const moneda: 'PEN' | 'USD' = value.moneda === 'USD' ? 'USD' : 'PEN';
        const old = operationsContext().quotations.filter(q => q.invitacionTransporteId === inv.invitacionTransporteId).at(-1), body = { fecha: formatFecha(new Date()), monto: value.montoCotizadoPen, moneda, condiciones: value.observaciones };
        const uploaded = value.documentoCotizacion instanceof File ? await uploadLocalDocument(value.documentoCotizacion) : undefined;
        const saved = old ? await cotizacionTransporteV1(inv.invitacionTransporteId).update(old.cotizacionTransporteId, body) : await cotizacionTransporteV1(inv.invitacionTransporteId).create(body);
        if (uploaded) await linkLocalDocument('cotizacion_transporte', saved.cotizacionTransporteId, uploaded.id);
        return saved;
    }),
    assign: async () => { throw new Error('La unidad y el chofer se asignan al coordinar una entrega de la campaña, no a la cotización.'); },
    extras: (id: number, value: CarrierExtras) => commitRemote(() => empresaTransporteExternoV1.update(id, { tipoTransportista: value.tipo === 'privado' ? 'INDEPENDIENTE' : 'EMPRESA', numeroDocumento: value.documento || null, tipoDocumento: value.tipo === 'privado' ? 'DNI' : null, registroMtc: value.mtc || null, departamento: value.departamento || null, provincia: value.provincia || null, ciudad: value.ciudad || null })),
};
