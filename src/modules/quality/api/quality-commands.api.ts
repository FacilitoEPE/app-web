import { operationsContext } from '@/modules/operations/api/operations-context.api';
import { loadContext, coordinationContext, providerName } from '@/modules/operations/api/operation-links';
import { commitRemote, requireId } from '@/shared/api/data-contract';
import { assertNoNewFiles } from '@/shared/api/document-state';
import { campanaV1 } from '@/modules/campaigns/api/future.api';
import { analisisCalidadV1, medicionMtdV1, cosechaV1, cargaV1, proveedorCargaV1, origenCargaV1, gastoCargaV1, guiaRemisionV1, proveedorGuiaV1, guiaXNormaV1 } from '@/modules/quality/api/future.api';
import { emitirGuiaV1 } from '@/modules/quality/api/future-actions.api';
import { projectQualityData } from '@/modules/quality/api/quality-screen-data';
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
        assertNoNewFiles(entry.documento);
        const origin = fieldOrigin(entry.campaniaId, entry.productorNombre, entry.fincaNombre), body = { ...origin, tipo: entry.tipo, fechaMuestreo: entry.fechaMuestreo, resultadoTexto: entry.resultado, unidad: entry.unidad || null, observaciones: entry.observaciones || null, estado: entry.estadoResultado === 'conforme' ? 'APTO' : entry.estadoResultado === 'no_conforme' ? 'NO_APTO' : 'PENDIENTE' };
        const saved = entry.id ? await analisisCalidadV1(origin.cxpId).update(entry.id, body) : await analisisCalidadV1(origin.cxpId).create(body);
        const previous = operationsContext().measurements.filter(m => m.cxpId === origin.cxpId && m.fincaId === origin.fincaId).at(-1);
        if (!previous || previous.valor !== entry.mtd || previous.trampaReferencia !== entry.mtdTrampa)
            await medicionMtdV1(origin.cxpId).create({ fincaId: origin.fincaId, medidoAt: new Date().toISOString(), valor: entry.mtd, limiteAplicado: previous?.limiteAplicado ?? 0, trampaReferencia: entry.mtdTrampa || null });
        return { ...entry, id: saved.analisisCalidadId };
    }),
    deleteAnalysis: (id: number) => commitRemote(() => { const row = operationsContext().analyses.find(a => a.analisisCalidadId === id); if (!row)
        throw new Error('Análisis no encontrado.'); return analisisCalidadV1(row.cxpId).remove(id); }),
    review: (id: string, payload: Pick<QualityDeliveryLoadItem, 'estadoRevision' | 'mtdRegistros' | 'analisisLaboratorio'>) => commitRemote(async () => {
        assertNoNewFiles(payload);
        const g = operationsContext(), c = context(id);
        const lab = payload.analisisLaboratorio.map(a => { const existing = g.analyses.find(r => r.analisisCalidadId === Number(a.id)); const origin = existing ?? a.origin; if (!origin || !g.deliveryOrigins.some(o => o.coordinacionEntregaId === c.coordination.coordinacionEntregaId && o.cxpId === origin.cxpId && o.fincaId === origin.fincaId))
            throw new Error('Selecciona el proveedor y la finca de cada análisis.'); return { existing, origin, body: { fincaId: origin.fincaId, tipo: a.tipoAnalisis, fechaMuestreo: a.fechaMuestreo, estado: a.resultado === 'Apto' ? 'APTO' : a.resultado === 'No apto' ? 'NO_APTO' : 'PENDIENTE', resultadoTexto: a.resultado, observaciones: a.observaciones } }; });
        const mtd = payload.mtdRegistros.map(m => ({ origin: fieldOrigin(c.campaign.campaniaId, m.productor, m.finca), m }));
        for (const a of lab)
            if (!a.existing)
                await analisisCalidadV1(a.origin.cxpId).create(a.body);
            else if (hasChanges(a.existing, a.body))
                await analisisCalidadV1(a.origin.cxpId).update(a.existing.analisisCalidadId, a.body);
        for (const { origin, m } of mtd) {
            const previous = g.measurements.find(r => r.medicionMtdId === Number(m.id));
            if (!previous || previous.valor !== m.mtdCalculado)
                await medicionMtdV1(origin.cxpId).create({ fincaId: origin.fincaId, valor: m.mtdCalculado, limiteAplicado: previous?.limiteAplicado ?? m.limiteAplicado ?? 0.5, medidoAt: new Date().toISOString() });
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
        assertNoNewFiles(payload);
        const g = operationsContext(), c = context(id), org = payload.organizacionCosecha, closure = payload.cierreCosecha;
        const advances = payload.avancesCosecha.map((a, index) => { const origin = fieldOrigin(c.campaign.campaniaId, a.productor, a.finca), party = g.participations.find(p => p.cxpId === origin.cxpId)!; return { id: Number(a.id) || index + 1, providerId: party.proveedorId, fincaId: origin.fincaId, date: a.fechaReal, kilos: a.kilosCosechados, crates: a.jabas, responsible: a.responsable, observations: '', evidence: null }; });
        const row = await ensureHarvest(id);
        return cosechaV1(c.delivery.entregaProgramadaId).update(row.cosechaId, { organizacion: { ...row.organizacion, harvestDate: org.fechaProgramadaInicio, serviceId: c.coordination.coordinacionEntregaId, crewLead: org.jefeCuadrilla, transportConfirmed: org.confirmada, crewConfirmed: org.confirmada, arrivalConfirmed: org.confirmada, personalAsignado: org.personalAsignado, jabas: org.jabas, tijeras: org.tijeras, bines: org.bines, mallas: org.mallas, supplies: org.otrosMateriales, mobility: org.movilidadTraslado, observaciones: org.observaciones }, avances: advances, kilosCosechados: advances.reduce((n, a) => n + a.kilos, 0), cierre: { ...row.cierre, endDate: closure.fechaTermino, completed: closure.cosechaCompletada } });
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
    }) => commitRemote(() => writeLoad(id, payload)),
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
        const farms = g.loadOrigins.filter(o => selected.some(p => p.proveedorCargaId === o.proveedorCargaId));
        if (!farms.length)
            throw new Error('Completa las fincas de origen de la carga antes de preparar la guía.');
        const body = { numero: value.numeroGuia, fechaInicioTraslado: value.fechaInicioTraslado, fechaEntregaTransportista: value.fechaEntregaTransportista || null, pesoBrutoKg: value.pesoBrutoTotalKg, unidadPeso: 'KGM', numeroBultos: value.numeroBultos, fincaPartidaId: farms[0].fincaId, ubigeoPartidaSnapshot: value.ubigeoPartida, direccionPartidaSnapshot: value.direccionPartida, establecimientoPartidaSnapshot: value.codEstablecimientoPartida, ubigeoLlegadaSnapshot: value.ubigeoLlegada, direccionLlegadaSnapshot: value.direccionLlegada, establecimientoLlegadaSnapshot: value.codEstablecimientoLlegada, transportistaDocumentoSnapshot: value.transportistaRuc, mtcSnapshot: value.transportistaMtc || null, placaSnapshot: value.vehiculoPlaca, conductorDocumentoSnapshot: value.conductorNumeroDoc, conductorNombreSnapshot: `${value.conductorNombres} ${value.conductorApellidos}`.trim(), conductorLicenciaSnapshot: value.conductorLicencia, observaciones: value.observacionesSunat, contenido: { issueDate: value.fechaInicioTraslado, shipmentDate: value.fechaInicioTraslado, handoverDate: value.fechaEntregaTransportista, reason: 'Venta', originAddress: value.direccionPartida, originUbigeo: value.ubigeoPartida, destinationAddress: value.direccionLlegada, destinationUbigeo: value.ubigeoLlegada, driverDocument: value.conductorNumeroDoc, driverLicense: value.conductorLicencia, grossWeight: value.pesoBrutoTotalKg, packageCount: value.numeroBultos, productCode: value.codigoProducto, description: value.descripcionProducto, standardCodes: value.normasSeleccionadas, standardText: value.normasSeleccionadas.join(', '), observations: value.observacionesSunat } };
        const previous = g.guides.find(r => r.guiaRemisionId === Number(value.id) && r.cargaId === c.load.cargaId), api = guiaRemisionV1(c.load.cargaId), saved = previous ? await api.update(previous.guiaRemisionId, body) : await api.create(body);
        const assignments = g.guideProviders.filter(p => p.guiaRemisionId === saved.guiaRemisionId);
        for (const p of assignments)
            if (!selected.some(s => s.proveedorCargaId === p.proveedorCargaId))
                await proveedorGuiaV1(saved.guiaRemisionId).remove(p.proveedorGuiaId);
        for (const p of selected) {
            const old = assignments.find(a => a.proveedorCargaId === p.proveedorCargaId), detail = { cargaId: c.load.cargaId, proveedorCargaId: p.proveedorCargaId, kilosAsignados: p.kilosCargados, fincasIds: farms.filter(o => o.proveedorCargaId === p.proveedorCargaId).map(o => o.fincaId) };
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
    const selections = payload.proveedoresCarga.map(p => {
        const party = g.participations.find(r => r.campaniaId === c.campaign.campaniaId && r.proveedorId === Number(p.proveedorId)), variety = g.varieties.find(v => v.name === p.variedad || v.name === `${c.fruit} ${p.variedad}`);
        if (!party || !variety)
            throw new Error('Completa el proveedor y la variedad usando los datos de la entrega.');
        return { p, party, variety };
    });
    const load = c.load ? (hasChanges(c.load, body) ? await cargaV1(c.coordination.coordinacionEntregaId).update(c.load.cargaId, body) : c.load) : await cargaV1(c.coordination.coordinacionEntregaId).create(body);
    for (const { p, party, variety } of selections) {
        const previous = g.loadProviders.find(r => r.cargaId === load.cargaId && r.cxpId === party.cxpId && r.frutaDerivadaId === variety.frutaDerivadaId), detail = { cxpId: party.cxpId, frutaDerivadaId: variety.frutaDerivadaId, kilosCargados: p.kilosCargados, precioCompraKgAplicado: previous?.precioCompraKgAplicado ?? party.precioCompraKg, jabasCargadas: p.jabasCargadas, jabasVacias: p.jabasVacias, binesCargados: p.binesCargados, binesVacios: p.binesVacios, mallasCargadas: p.mallasCargadas, mallasVacias: p.mallasVacias };
        const saved = previous ? (hasChanges(previous, detail) ? await proveedorCargaV1(load.cargaId).update(previous.proveedorCargaId, detail) : previous) : await proveedorCargaV1(load.cargaId).create(detail);
        for (const o of g.deliveryOrigins.filter(o => o.coordinacionEntregaId === c.coordination.coordinacionEntregaId && o.cxpId === party.cxpId))
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
    if (payload.cumpleRequisitosIndustria !== undefined) {
        const harvest = await ensureHarvest(id);
        await cosechaV1(c.delivery.entregaProgramadaId).update(harvest.cosechaId, { industria: { ...harvest.industria, inspectionResult: payload.cumpleRequisitosIndustria ? 'Cumple' : 'No cumple', rejectionReason: payload.motivoRechazoIndustria ?? '' } });
    }
    return load;
}
export function analysisOriginOptions(loadId: string) {
    const g = operationsContext(), c = context(loadId);
    return g.deliveryOrigins.filter(o => o.coordinacionEntregaId === c.coordination.coordinacionEntregaId).map(o => ({ value: `${o.cxpId}:${o.fincaId}`, label: `${providerName(g.participations.find(p => p.cxpId === o.cxpId)!.proveedorId, g)} · ${g.farms.find(f => f.fincaId === o.fincaId)?.nombreFinca ?? ''}`, origin: { cxpId: o.cxpId, fincaId: o.fincaId } }));
}
