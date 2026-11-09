import { operationsContext } from '@/modules/operations/api/operations-context.api';
import { loadContext, coordinationContext, providerName } from '@/modules/operations/api/operation-links';
import { commitRemote, refreshRemoteData, requireId } from '@/shared/api/data-contract';
import { jsonData } from '@/shared/api/document-state';
import { linkLocalDocument, persistFile, uploadLocalDocument } from '@/shared/api/uploadDocument';
import { campanaV1 } from '@/modules/campaigns/api/v1.api';
import { analisisCalidadV1, medicionMtdV1, cosechaV1, cargaV1, proveedorCargaV1, origenCargaV1, gastoCargaV1, guiaRemisionV1, proveedorGuiaV1, guiaXNormaV1 } from '@/modules/quality/api/v1.api';
import { emitirGuiaV1 } from '@/modules/quality/api/v1-actions.api';
import { isQualityGuidePrepared } from '@/modules/quality/api/quality-guide-status';
import { qualityGuideStandardText } from '@/modules/quality/qualityGuideNorms.utils';
import { canRegisterQualityLoad, projectQualityData } from '@/modules/quality/api/quality-screen-data';
import type { QualityAnalysisRecord } from '@/modules/quality/qualityAnalysis.utils';
import type { QualityDeliveryLoadItem, QualityHarvestOrganization, QualityHarvestAdvance, QualityHarvestClosure, QualityProviderLoadDetail, QualitySunatRemissionGuide } from '@/modules/quality/qualityOperations.models';
import type { AddQualityCampaignInput } from '@/modules/quality/quality.store';
export const hasChanges = (row: object, body: object) => Object.entries(body).some(([key, value]) => value !== undefined && JSON.stringify((row as Record<string, unknown>)[key]) !== JSON.stringify(value));
function context(id: string) {
    const g = operationsContext();
    if (!id.startsWith('entrega-'))
        return loadContext(id, g);
    const deliveryId = requireId(id.slice('entrega-'.length)), co = g.coordinations.find(c => c.entregaProgramadaId === deliveryId);
    if (!co)
        throw new Error('Coordina primero la entrega desde la campaña.');
    return coordinationContext(co.coordinacionEntregaId, g);
}
async function ensureHarvest(id: string) {
    const c = context(id);
    return c.harvest ?? cosechaV1(c.delivery.entregaProgramadaId).create({ codigoLote: `LOT-${c.campaign.campaniaId}-${c.delivery.entregaProgramadaId}`, fechaPrevista: c.delivery.fecha, kilosEstimados: c.delivery.kilosProgramados });
}
function fieldOrigin(campaignId: number, producer: string, farm: string) {
    const g = operationsContext(), p = g.participations.find(p => p.campaniaId === campaignId && providerName(p.proveedorId, g) === producer), f = g.farms.find(f => f.proveedorId === p?.proveedorId && f.nombreFinca === farm);
    if (!p || !f)
        throw new Error('Selecciona un proveedor y una finca reales de esta campaña.');
    return { cxpId: p.cxpId, fincaId: f.fincaId };
}
export const qualityCommands = {
    addCampaign: async (input: AddQualityCampaignInput) => { await commitRemote(async () => { const row = operationsContext().campaigns.find(c => c.campaniaId === input.campaniaId); if (!row)
        throw new Error('Campaña no encontrada.'); const key = input.scope === 'industria' ? 'Industria' : 'Exportación'; await campanaV1.update(row.campaniaId, { calidad: { ...row.calidad, [key]: { incorporada: true, estado: 'PENDIENTE', rechazos: [] } } }); }); return projectQualityData(operationsContext()).campaigns.find(c => c.campaniaId === input.campaniaId)!; },
    removeCampaign: (id: number) => commitRemote(async () => { const row = operationsContext().campaigns.find(c => c.campaniaId === id); if (!row)
        throw new Error('Campaña no encontrada.'); await campanaV1.update(id, { calidad: { ...row.calidad, 'Exportación': { incorporada: false }, Industria: { incorporada: false } } }); }),
    analysis: (entry: Omit<QualityAnalysisRecord, 'id'> & {
        id?: number;
    }) => commitRemote(async () => {
        const uploaded = entry.documento instanceof File ? await uploadLocalDocument(entry.documento, 'calidad/analisis') : undefined;
        const origin = fieldOrigin(entry.campaniaId, entry.productorNombre, entry.fincaNombre), body = { fincaId: origin.fincaId, tipo: entry.tipo, fechaMuestreo: entry.fechaMuestreo, resultadoTexto: entry.resultado, unidad: entry.unidad || null, observaciones: entry.observaciones || null, estado: entry.estadoResultado === 'conforme' ? 'APTO' : entry.estadoResultado === 'no_conforme' ? 'NO_APTO' : 'PENDIENTE' };
        const saved = entry.id ? await analisisCalidadV1(origin.cxpId).update(entry.id, body) : await analisisCalidadV1(origin.cxpId).create(body);
        if (uploaded) await linkLocalDocument('analisis_calidad', saved.analisisCalidadId, uploaded.id);
        const previous = operationsContext().measurements.filter(m => m.cxpId === origin.cxpId && m.fincaId === origin.fincaId).at(-1);
        const evidence = entry.mtdEvidencia instanceof File ? await uploadLocalDocument(entry.mtdEvidencia, 'calidad/mediciones-mtd') : undefined;
        const measurement = !previous || previous.valor !== entry.mtd || previous.trampaReferencia !== entry.mtdTrampa || evidence
            ? await medicionMtdV1(origin.cxpId).create({ fincaId: origin.fincaId, medidoAt: new Date().toISOString(), valor: entry.mtd, limiteAplicado: previous?.limiteAplicado ?? 0.5, trampaReferencia: entry.mtdTrampa || null }) : previous;
        if (evidence) await linkLocalDocument('medicion_mtd', measurement.medicionMtdId, evidence.id);
        return { ...entry, id: saved.analisisCalidadId };
    }),
    deleteAnalysis: (id: number) => commitRemote(() => { const row = operationsContext().analyses.find(a => a.analisisCalidadId === id); if (!row)
        throw new Error('Análisis no encontrado.'); return analisisCalidadV1(row.cxpId).remove(id); }),
    review: (id: string, payload: Pick<QualityDeliveryLoadItem, 'estadoRevision' | 'mtdRegistros' | 'analisisLaboratorio'>) => commitRemote(async () => {
        const g = operationsContext(), c = context(id);
        const lab = payload.analisisLaboratorio.map(a => { const existing = g.analyses.find(r => r.analisisCalidadId === Number(a.id)); const origin = existing ?? a.origin; if (!origin || !g.deliveryOrigins.some(o => o.coordinacionEntregaId === c.coordination.coordinacionEntregaId && o.cxpId === origin.cxpId && o.fincaId === origin.fincaId))
            throw new Error('Selecciona el proveedor y la finca de cada análisis.'); return { existing, origin, archivo: a.archivo, body: { fincaId: origin.fincaId, tipo: a.tipoAnalisis, fechaMuestreo: a.fechaMuestreo, estado: a.resultado === 'Apto' ? 'APTO' : a.resultado === 'No apto' ? 'NO_APTO' : 'PENDIENTE', resultadoTexto: a.resultado, observaciones: a.observaciones } }; });
        const mtd = payload.mtdRegistros.map(m => ({ origin: fieldOrigin(c.campaign.campaniaId, m.productor, m.finca), m }));
        for (const a of lab) {
            const uploaded = a.archivo instanceof File ? await uploadLocalDocument(a.archivo, 'calidad/analisis') : undefined;
            const saved = !a.existing ? await analisisCalidadV1(a.origin.cxpId).create(a.body) : hasChanges(a.existing, a.body) ? await analisisCalidadV1(a.origin.cxpId).update(a.existing.analisisCalidadId, a.body) : a.existing;
            if (uploaded) await linkLocalDocument('analisis_calidad', saved.analisisCalidadId, uploaded.id);
        }
        for (const { origin, m } of mtd) {
            const previous = g.measurements.find(r => r.medicionMtdId === Number(m.id));
            const uploaded = m.evidenciaConteo instanceof File ? await uploadLocalDocument(m.evidenciaConteo, 'calidad/mediciones-mtd') : undefined;
            const saved = !previous || previous.valor !== m.mtdCalculado || previous.capturas !== m.capturas || previous.trampas !== m.trampas || previous.diasExposicion !== m.diasExposicion
                ? await medicionMtdV1(origin.cxpId).create({ fincaId: origin.fincaId, valor: m.mtdCalculado, limiteAplicado: previous?.limiteAplicado ?? m.limiteAplicado ?? 0.5, medidoAt: new Date().toISOString(), capturas: m.capturas ?? undefined, trampas: m.trampas ?? undefined, diasExposicion: m.diasExposicion ?? undefined }) : previous;
            if (uploaded) await linkLocalDocument('medicion_mtd', saved.medicionMtdId, uploaded.id);
        }
        const estado = payload.estadoRevision === 'Aprobada para cosecha' ? 'APROBADA' : payload.estadoRevision === 'Observada' ? 'OBSERVADA' : 'PENDIENTE';
        if (c.load)
            await cargaV1(c.coordination.coordinacionEntregaId).update(c.load.cargaId, { estadoCalidad: estado });
        else {
            const harvest = await ensureHarvest(id);
            await cosechaV1(c.delivery.entregaProgramadaId).update(harvest.cosechaId, { estado });
        }
    }),
    harvest: (id: string, payload: {
        organizacionCosecha: QualityHarvestOrganization;
        avancesCosecha: QualityHarvestAdvance[];
        cierreCosecha: QualityHarvestClosure;
    }) => commitRemote(async () => {
        const g = operationsContext(), c = context(id), org = payload.organizacionCosecha, closure = payload.cierreCosecha;
        const advances = await Promise.all(payload.avancesCosecha.map(async (a, index) => { const origin = fieldOrigin(c.campaign.campaniaId, a.productor, a.finca), party = g.participations.find(p => p.cxpId === origin.cxpId)!; return jsonData({ id: Number(a.id) || index + 1, providerId: party.proveedorId, fincaId: origin.fincaId, date: a.fechaReal, kilos: a.kilosCosechados, crates: a.jabas, responsible: a.responsable, observations: '', evidence: await persistFile(a.evidencia, 'calidad/avances-cosecha') }); }));
        const documents = { informeFinalCosecha: await persistFile(closure.informeFinalCosecha, 'calidad/informes-finales'), solicitudPagoPersonal: await persistFile(closure.solicitudPagoPersonal, 'calidad/solicitudes-pago-personal'), solicitudPagoMovilidad: await persistFile(closure.solicitudPagoMovilidad, 'calidad/solicitudes-pago-movilidad'), reciboPagoPersonal: await persistFile(closure.reciboPagoPersonal, 'calidad/recibos-pago-personal'), reciboPagoMovilidad: await persistFile(closure.reciboPagoMovilidad, 'calidad/recibos-pago-movilidad'), registroCompraFruta: await persistFile(closure.registroCompraFruta, 'calidad/registros-compra') };
        const row = await ensureHarvest(id);
        return cosechaV1(c.delivery.entregaProgramadaId).update(row.cosechaId, { organizacion: { ...row.organizacion, harvestDate: org.fechaProgramadaInicio, serviceId: c.coordination.coordinacionEntregaId, crewLead: org.jefeCuadrilla, transportConfirmed: org.confirmada, crewConfirmed: org.confirmada, arrivalConfirmed: org.confirmada, personalAsignado: org.personalAsignado, jabas: org.jabas, tijeras: org.tijeras, bines: org.bines, mallas: org.mallas, supplies: org.otrosMateriales, mobility: org.movilidadTraslado, observaciones: org.observaciones }, avances: advances, kilosCosechados: payload.avancesCosecha.reduce((n, a) => n + a.kilosCosechados, 0), cierre: { ...row.cierre, endDate: closure.fechaTermino, completed: closure.cosechaCompletada, ...jsonData(documents) } });
    }),
    saveLoad: (id: string, payload: {
        fechaCargaReal: string;
        anotador: string;
        viaticosMovilidad: number;
        viaticosInsumos: number;
        gastoCuadrilla: number;
        gastoAnotadores: number;
        observacionesCarga: string;
        proveedoresCarga: QualityProviderLoadDetail[];
        cumpleRequisitosIndustria?: boolean;
        motivoRechazoIndustria?: string;
    }) => commitRemote(async () => {
        if (!id.startsWith('entrega-')) return writeLoad(id, payload);
        const g = operationsContext(), c = context(id);
        const alreadyRegistered = new Error('Esta entrega ya tiene una carga. Abre el registro desde Cargas registradas.');
        if (c.load) throw alreadyRegistered;
        if (!canRegisterQualityLoad(c, g))
            throw new Error('Esta entrega ya no está disponible para registrar su carga.');
        const loads = cargaV1(c.coordination.coordinacionEntregaId);
        if ((await loads.list({ pageSize: 1 })).total > 0) {
            await refreshRemoteData(true);
            throw alreadyRegistered;
        }
        if (c.contract.canal === 'INDUSTRIA') {
            if (payload.cumpleRequisitosIndustria === undefined)
                throw new Error('Indica si la fruta cumple los requisitos de Industria.');
            if (!payload.cumpleRequisitosIndustria) {
                const reason = payload.motivoRechazoIndustria?.trim();
                if (!reason) throw new Error('Indica el motivo de rechazo industrial.');
                const harvest = await ensureHarvest(id);
                await cosechaV1(c.delivery.entregaProgramadaId).update(harvest.cosechaId, {
                    industria: { ...harvest.industria, inspectionResult: 'No cumple', rejectionReason: reason },
                });
                return;
            }
        }
        return writeLoad(id, payload);
    }),
    createLoad: (value: QualityDeliveryLoadItem) => {
        const g = operationsContext(), matches = g.coordinations.filter(co => { const c = coordinationContext(co.coordinacionEntregaId, g); return c.campaign.campaniaId === value.campaniaId && c.contract.numero === value.contratoRef && c.delivery.fecha === value.fechaProgramada; });
        if (matches.length !== 1)
            throw new Error('Programa y coordina la entrega en la campaña antes de registrar su carga.');
        return qualityCommands.saveLoad(`entrega-${matches[0].entregaProgramadaId}`, value);
    },
    guide: (loadId: string, value: QualitySunatRemissionGuide) => commitRemote(async () => {
        const g = operationsContext(), c = loadContext(loadId, g), selected = g.loadProviders.filter(p => p.cargaId === c.load.cargaId && value.proveedoresIncluidos.includes(String(g.participations.find(r => r.cxpId === p.cxpId)?.proveedorId)));
        if (!selected.length)
            throw new Error('Selecciona los proveedores de la guía.');
        const allocated = selected.map(p => {
            const providerId = String(g.participations.find(r => r.cxpId === p.cxpId)?.proveedorId ?? '');
            const kilos = value.kilosPorProveedor?.[providerId] ?? p.kilosCargados;
            const otherGuides = g.guideProviders.filter(row => row.proveedorCargaId === p.proveedorCargaId && row.guiaRemisionId !== Number(value.id)).reduce((sum, row) => sum + row.kilosAsignados, 0);
            if (!Number.isFinite(kilos) || kilos <= 0 || kilos + otherGuides > p.kilosCargados + 0.001)
                throw new Error(`Los kilos asignados a ${providerName(Number(providerId), g)} deben ser mayores que cero y no superar los kilos disponibles de su carga.`);
            return { row: p, kilos };
        });
        if (value.estado === 'Generada') {
            if (c.contract.canal !== 'INDUSTRIA' && g.deliveryOrigins
                .filter(origin => origin.coordinacionEntregaId === c.coordination.coordinacionEntregaId)
                .some(origin => (g.measurements.filter(measurement => measurement.cxpId === origin.cxpId && measurement.fincaId === origin.fincaId).at(-1)?.valor ?? 0) > 0.5))
                throw new Error('El MTD Ceratitis supera 0.5 en una finca de la entrega. Resuelve la revisión antes de generar guías.');
            const otherAssigned = g.guideProviders.filter(row => row.cargaId === c.load.cargaId && row.guiaRemisionId !== Number(value.id))
                .reduce((sum, row) => sum + row.kilosAsignados, 0);
            const loadTotal = g.loadProviders.filter(row => row.cargaId === c.load.cargaId).reduce((sum, row) => sum + row.kilosCargados, 0);
            if (Math.abs(otherAssigned + allocated.reduce((sum, item) => sum + item.kilos, 0) - loadTotal) > 0.01)
                throw new Error('Distribuye todos los kilos de la carga entre sus guías antes de generarlas.');
            if (g.guides.some(row => row.cargaId === c.load.cargaId && row.guiaRemisionId !== Number(value.id) && !row.emitidaAt
                && !isQualityGuidePrepared(row, g.guideProviders.some(provider => provider.guiaRemisionId === row.guiaRemisionId))))
                throw new Error('Completa los datos de todas las guías antes de generarlas.');
        }
        const farms = g.loadOrigins.filter(o => selected.some(p => p.proveedorCargaId === o.proveedorCargaId));
        if (!farms.length)
            throw new Error('Completa las fincas de origen de la carga antes de preparar la guía.');
        const body = { numero: value.numeroGuia, fechaInicioTraslado: value.fechaInicioTraslado, fechaEntregaTransportista: value.fechaEntregaTransportista || null, pesoBrutoKg: value.pesoBrutoTotalKg, unidadPeso: 'KGM', numeroBultos: value.numeroBultos, fincaPartidaId: farms[0].fincaId, ubigeoPartidaSnapshot: value.ubigeoPartida, direccionPartidaSnapshot: value.direccionPartida, establecimientoPartidaSnapshot: value.codEstablecimientoPartida, ubigeoLlegadaSnapshot: value.ubigeoLlegada, direccionLlegadaSnapshot: value.direccionLlegada, establecimientoLlegadaSnapshot: value.codEstablecimientoLlegada, transportistaDocumentoSnapshot: value.transportistaRuc, mtcSnapshot: value.transportistaMtc || null, placaSnapshot: value.vehiculoPlaca, conductorDocumentoSnapshot: value.conductorNumeroDoc, conductorNombreSnapshot: `${value.conductorNombres} ${value.conductorApellidos}`.trim(), conductorLicenciaSnapshot: value.conductorLicencia, observaciones: value.observacionesSunat, contenido: { issueDate: value.fechaInicioTraslado, shipmentDate: value.fechaInicioTraslado, handoverDate: value.fechaEntregaTransportista, reason: 'Venta', originAddress: value.direccionPartida, originUbigeo: value.ubigeoPartida, destinationAddress: value.direccionLlegada, destinationUbigeo: value.ubigeoLlegada, driverDocument: value.conductorNumeroDoc, driverLicense: value.conductorLicencia, driverDocumentType: value.conductorTipoDoc, driverFirstNames: value.conductorNombres, driverLastNames: value.conductorApellidos, carrierName: value.transportistaDenominacion, originRole: value.rolOrigen, fruitType: value.tipoFruta, grossWeight: value.pesoBrutoTotalKg, packageCount: value.numeroBultos, standardCodes: value.normasSeleccionadas, standardText: qualityGuideStandardText(value.normasSeleccionadas), observations: value.observacionesSunat } };
        const previous = g.guides.find(r => r.guiaRemisionId === Number(value.id) && r.cargaId === c.load.cargaId);
        if (previous?.emitidaAt) throw new Error('Una guía emitida no se puede editar.');
        const api = guiaRemisionV1(c.load.cargaId), saved = previous ? await api.update(previous.guiaRemisionId, body) : await api.create(body);
        const assignments = g.guideProviders.filter(p => p.guiaRemisionId === saved.guiaRemisionId);
        for (const p of assignments)
            if (!selected.some(s => s.proveedorCargaId === p.proveedorCargaId))
                await proveedorGuiaV1(saved.guiaRemisionId).remove(p.proveedorGuiaId);
        for (const { row: p, kilos } of allocated) {
            const old = assignments.find(a => a.proveedorCargaId === p.proveedorCargaId), detail = { cargaId: c.load.cargaId, proveedorCargaId: p.proveedorCargaId, kilosAsignados: kilos, fincasIds: farms.filter(o => o.proveedorCargaId === p.proveedorCargaId).map(o => o.fincaId) };
            if (old) {
                if (hasChanges(old, detail))
                    await proveedorGuiaV1(saved.guiaRemisionId).update(old.proveedorGuiaId, detail);
            }
            else
                await proveedorGuiaV1(saved.guiaRemisionId).create(detail);
        }
        const normIds = value.normasSeleccionadas.map(code => { const row = g.standards.find(s => s.codigo === code); if (!row)
            throw new Error('Norma no disponible en el catálogo.'); return row.normaId; });
        for (const old of g.guideStandards.filter(n => n.guiaRemisionId === saved.guiaRemisionId && !normIds.includes(n.normaId)))
            await guiaXNormaV1(saved.guiaRemisionId).remove(old.guiaXNormaId);
        for (const normaId of normIds)
            if (!g.guideStandards.some(n => n.guiaRemisionId === saved.guiaRemisionId && n.normaId === normaId))
                await guiaXNormaV1(saved.guiaRemisionId).create({ normaId });
        if (value.estado === 'Generada')
            await emitirGuiaV1(saved.guiaRemisionId);
    }),
    removeGuide: (loadId: string, guideId: string) => commitRemote(async () => {
        const g = operationsContext(), c = loadContext(loadId, g);
        const guide = g.guides.find(row => row.guiaRemisionId === Number(guideId) && row.cargaId === c.load.cargaId);
        if (!guide) throw new Error('La guía no pertenece a esta carga.');
        if (guide.emitidaAt) throw new Error('Una guía emitida no se puede eliminar.');
        for (const assignment of g.guideProviders.filter(row => row.guiaRemisionId === guide.guiaRemisionId))
            await proveedorGuiaV1(guide.guiaRemisionId).remove(assignment.proveedorGuiaId);
        for (const standard of g.guideStandards.filter(row => row.guiaRemisionId === guide.guiaRemisionId))
            await guiaXNormaV1(guide.guiaRemisionId).remove(standard.guiaXNormaId);
        await guiaRemisionV1(c.load.cargaId).remove(guide.guiaRemisionId);
    }),
};
/** Also used by Logistics and Driver screens; persisted changes are reconciled by their command. */
export async function writeLoad(id: string, payload: {
    fechaCargaReal: string;
    anotador: string;
    viaticosMovilidad: number;
    viaticosInsumos: number;
    gastoCuadrilla: number;
    gastoAnotadores: number;
    observacionesCarga: string;
    proveedoresCarga: QualityProviderLoadDetail[];
    cumpleRequisitosIndustria?: boolean;
    motivoRechazoIndustria?: string;
}) {
    const g = operationsContext(), c = context(id), body = { codigo: c.load?.codigo ?? `CAR-${c.campaign.campaniaId}-${c.delivery.entregaProgramadaId}`, fechaCarga: payload.fechaCargaReal, anotadorNombre: payload.anotador, viaticosMovilidad: payload.viaticosMovilidad, viaticosInsumos: payload.viaticosInsumos, observaciones: payload.observacionesCarga };
    if (id.startsWith('entrega-') && c.load)
        throw new Error('Esta entrega ya tiene una carga. Abre el registro existente.');
    const selections = payload.proveedoresCarga.map(p => {
        const party = g.participations.find(r => r.campaniaId === c.campaign.campaniaId && r.proveedorId === Number(p.proveedorId)), variety = g.varieties.find(v => v.frutaId === c.campaign.frutaId && (v.name === p.variedad || v.name === `${c.fruit} ${p.variedad}`));
        if (!party || !variety)
            throw new Error('Completa el proveedor y la variedad usando los datos de la entrega.');
        return { p, party, variety };
    });
    const load = c.load ? (hasChanges(c.load, body) ? await cargaV1(c.coordination.coordinacionEntregaId).update(c.load.cargaId, body) : c.load) : await cargaV1(c.coordination.coordinacionEntregaId).create(body);
    for (const { p, party, variety } of selections) {
        const previous = g.loadProviders.find(r => r.cargaId === load.cargaId && r.cxpId === party.cxpId && r.frutaDerivadaId === variety.frutaDerivadaId), detail = { cxpId: party.cxpId, frutaDerivadaId: variety.frutaDerivadaId, kilosCargados: p.kilosCargados, precioCompraKgAplicado: previous?.precioCompraKgAplicado ?? party.precioCompraKg, jabasCargadas: p.jabasCargadas, jabasVacias: p.jabasVacias, binesCargados: p.binesCargados, binesVacios: p.binesVacios, mallasCargadas: p.mallasCargadas, mallasVacias: p.mallasVacias };
        const saved = previous ? (hasChanges(previous, detail) ? await proveedorCargaV1(load.cargaId).update(previous.proveedorCargaId, detail) : previous) : await proveedorCargaV1(load.cargaId).create(detail);
        const coordinatedOrigins = g.deliveryOrigins.filter(o => o.coordinacionEntregaId === c.coordination.coordinacionEntregaId && o.cxpId === party.cxpId);
        const matchingVarietyOrigins = coordinatedOrigins.filter(o => {
            const farm = g.farms.find(f => f.fincaId === o.fincaId);
            return farm?.frutaDerivadaId === variety.frutaDerivadaId;
        });
        const targetOrigins = matchingVarietyOrigins.length > 0 ? matchingVarietyOrigins : coordinatedOrigins;
        for (const o of targetOrigins)
            if (!g.loadOrigins.some(n => n.proveedorCargaId === saved.proveedorCargaId && n.fincaId === o.fincaId))
                await origenCargaV1(saved.proveedorCargaId).create({ cxpId: party.cxpId, fincaId: o.fincaId, kilosOrigen: null });
    }
    for (const [concepto, monto] of [['Cuadrilla', payload.gastoCuadrilla], ['Anotadores', payload.gastoAnotadores]] as const) {
        const previous = g.loadExpenses.find(e => e.cargaId === load.cargaId && e.concepto === concepto);
        if (previous) {
            if (previous.monto !== monto)
                await gastoCargaV1(load.cargaId).update(previous.gastoCargaId, { monto });
        }
        else if (monto > 0)
            await gastoCargaV1(load.cargaId).create({ concepto, monto });
    }
    if (c.contract.canal === 'INDUSTRIA' && payload.cumpleRequisitosIndustria !== undefined) {
        const harvest = await ensureHarvest(id);
        await cosechaV1(c.delivery.entregaProgramadaId).update(harvest.cosechaId, { industria: { ...harvest.industria, inspectionResult: payload.cumpleRequisitosIndustria ? 'Cumple' : 'No cumple', rejectionReason: payload.motivoRechazoIndustria ?? '' } });
    }
    return load;
}
export function analysisOriginOptions(loadId: string) {
    const g = operationsContext(), c = context(loadId);
    return g.deliveryOrigins.filter(o => o.coordinacionEntregaId === c.coordination.coordinacionEntregaId).map(o => ({ value: `${o.cxpId}:${o.fincaId}`, label: `${providerName(g.participations.find(p => p.cxpId === o.cxpId)!.proveedorId, g)} · ${g.farms.find(f => f.fincaId === o.fincaId)?.nombreFinca ?? ''}`, origin: { cxpId: o.cxpId, fincaId: o.fincaId } }));
}

export function campaignAnalysisOrigins(campaignId: number) {
    const g = operationsContext();
    const campaign = g.campaigns.find(c => c.campaniaId === campaignId);
    return g.participations.filter(p => p.campaniaId === campaignId && p.tipoProveedor === 'productor').flatMap(p =>
        g.farms.filter(f => f.proveedorId === p.proveedorId && g.varieties.some(v => v.frutaDerivadaId === f.frutaDerivadaId && v.frutaId === campaign?.frutaId)).map(f => {
            const measurement = g.measurements.filter(m => m.cxpId === p.cxpId && m.fincaId === f.fincaId).at(-1);
            const file = g.localDocuments?.find(d => d.tipo === 'medicion_mtd' && d.entidadId === measurement?.medicionMtdId);
            return { value: `${p.cxpId}:${f.fincaId}`, label: `${providerName(p.proveedorId, g)} · ${f.nombreFinca}`,
                productor: providerName(p.proveedorId, g), finca: f.nombreFinca, mtd: measurement?.valor,
                trampa: measurement?.trampaReferencia ?? '', evidencia: file ? { name: file.name, url: file.url, type: file.type, size: file.size } : null };
        }),
    );
}

export function qualityGuideNormOptions() {
    return operationsContext().standards.map(n => ({ id: n.codigo, label: n.nombre }));
}
