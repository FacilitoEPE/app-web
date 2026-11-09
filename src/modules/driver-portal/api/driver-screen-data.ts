import type { OperationsContext } from '@/modules/operations/api/operations-context.api';
import { hasLoadedWeight, loadContext, providerName } from '@/modules/operations/api/operation-links';
import { projectQualityData } from '@/modules/quality/api/quality-screen-data';
import { projectLogisticsData, stageLabels } from '@/modules/logistics/api/logistics-screen-data';
import { jsonObject, jsonText } from '@/modules/quality/api/quality-screen-data';
import type { DriverLoad, DriverProfile } from '@/modules/driver-portal/driverPortal.models';
function storedFile(value: unknown) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const file = value as Record<string, unknown>;
    return typeof file.url === 'string' && typeof file.name === 'string' ? { url: file.url, name: file.name, ...(typeof file.type === 'string' ? { type: file.type } : {}), ...(typeof file.size === 'number' ? { size: file.size } : {}) } : null;
}
function farmLoadKg(g: OperationsContext, loadId: number, coordinationId: number, participationId: number, farmId: number): number | null {
    const rows = g.loadProviders.filter(r => r.cargaId === loadId && r.cxpId === participationId);
    const sources = g.loadOrigins.filter(r => r.fincaId === farmId && rows.some(p => p.proveedorCargaId === r.proveedorCargaId));
    if (sources.length && sources.every(r => r.kilosOrigen !== null)) return sources.reduce((n, r) => n + (r.kilosOrigen ?? 0), 0);
    const farmCount = new Set(g.deliveryOrigins.filter(r => r.coordinacionEntregaId === coordinationId && r.cxpId === participationId).map(r => r.fincaId)).size;
    return farmCount === 1 ? rows.reduce((n, r) => n + r.kilosCargados, 0) : null;
}

export function projectDriverData(g: OperationsContext) {
    const drivers: DriverProfile[] = g.drivers.map(d => ({ personaId: d.personaId, id: String(d.idChoferTransporteExterno), nombre: d.nombre, documento: g.people.find(p => p.personaId === d.personaId)?.numeroDocumento ?? '', licencia: d.numeroLicencia ?? '', telefono: d.telefono, transportista: g.carriers.find(c => c.idEmpresaTransporteExterno === d.idEmpresaTransporteExterno)?.nombreCompleto ?? '', placaAsignada: g.vehicles.find(v => v.idEmpresaTransporteExterno === d.idEmpresaTransporteExterno)?.placa ?? '' }));
    const logistics = projectLogisticsData(g);
    const loads: DriverLoad[] = g.loads.filter(load => hasLoadedWeight(load.cargaId, g)).map(load => {
        const c = loadContext(load.cargaId, g), l = logistics.find(l => l.id === String(load.cargaId))!, receipt = g.receipts.find(r => r.cargaId === load.cargaId), check = receipt?.checklist ?? {}, arrival = jsonObject(check.llegada), exit = jsonObject(check.guiaSalida);
        const history = g.histories.filter(h => h.coordinacionEntregaId === c.coordination.coordinacionEntregaId)
            .sort((a, b) => a.fechaHora.localeCompare(b.fechaHora));
        return { id: String(load.cargaId), codigo: load.codigo, campaniaId: c.campaign.campaniaId, campaniaNombre: c.campaign.nombre, fruta: c.fruit, canal: l.canal, driverId: String(c.coordination.idChoferTransporteExterno), transportista: l.transportista, placa: l.placa, cliente: l.cliente, contratoRef: l.contratoRef, origen: l.origen, destino: l.destino, destinoLatitud: null, destinoLongitud: null, fechaProgramada: l.fechaProgramada, fechaCarga: l.fechaCarga, anotador: l.anotador, kilosProgramados: l.kilosProgramados, viaticosMovilidad: l.viaticosMovilidad, viaticosInsumos: l.viaticosInsumos, gastoCuadrilla: l.gastoCuadrilla, gastoAnotadores: l.gastoAnotadores, observacionesCarga: l.observacionesCarga, etapa: stageLabels[history.at(-1)?.estado ?? 'EN_CARGA'], cierreFisicoConfirmado: Boolean(receipt?.cierreFisicoAt), proveedores: l.proveedores,
            fincas: g.deliveryOrigins.filter(o => o.coordinacionEntregaId === c.coordination.coordinacionEntregaId).map(o => { const f = g.farms.find(f => f.fincaId === o.fincaId)!, p = g.participations.find(p => p.cxpId === o.cxpId)!; return { id: String(f.fincaId), nombre: f.nombreFinca, productor: l.proveedores.find(row => Number(row.proveedorId) === p.proveedorId)?.proveedorNombre ?? '', codigoSenasa: f.codigoLugarProduccion ?? '', distrito: f.distrito, provincia: f.provincia, latitud: f.latitud, longitud: f.longitud, variedad: g.varieties.filter(v => f.frutaDerivadaId === v.frutaDerivadaId && v.frutaId === c.campaign.frutaId).map(v => v.name).join(', '), kilosEstimados: farmLoadKg(g, load.cargaId, c.coordination.coordinacionEntregaId, o.cxpId, f.fincaId) }; }),
            historial: history.map(h => ({ etapa: stageLabels[h.estado], fechaHora: h.fechaHora, nota: h.observacion ?? '' })), checklistLlegada: { evidenciaDescarte: storedFile(arrival.evidenciaDescarte), kilosEnPlanta: jsonText(arrival.kilosEnPlanta) || (receipt?.pesoPlantaKg === null ? '' : String(receipt?.pesoPlantaKg ?? '')), huboDescarte: arrival.huboDescarte === true || receipt?.huboDescarte === true, kilosDescarte: jsonText(arrival.kilosDescarte), motivoDescarte: jsonText(arrival.motivoDescarte), observacionesEntrega: jsonText(arrival.observacionesEntrega), registrado: arrival.registrado === true }, guiaSalida: { requiereGuia: exit.requiereGuia === true, numeroGuia: jsonText(exit.numeroGuia), motivoSalida: jsonText(exit.motivoSalida), bultosVaciosRetorno: jsonText(exit.bultosVaciosRetorno), kilosDescarteRetorno: jsonText(exit.kilosDescarteRetorno), archivo: storedFile(exit.archivo), observaciones: jsonText(exit.observaciones) } };
    });
    const pending: DriverLoad[] = projectQualityData(g).loads.filter(row => !row.cargaId).map(row => {
        const coordination = g.coordinations.find(item => item.entregaProgramadaId === Number(row.id.slice('entrega-'.length)))!;
        return {
            id: row.id, pendienteRegistro: true, cargaIncompleta: row.cargaIncompleta, codigo: `Entrega · ${row.contratoRef}`, campaniaId: row.campaniaId,
            campaniaNombre: row.campaniaNombre, fruta: row.fruta, canal: row.scope === 'industria' ? 'Industria' : 'Exportación',
            driverId: String(coordination.idChoferTransporteExterno), transportista: row.transportista, placa: row.placa,
            cliente: row.cliente, contratoRef: row.contratoRef, origen: coordination.origenDescripcion ?? '', destino: row.destino,
            destinoLatitud: null, destinoLongitud: null, fechaProgramada: row.fechaProgramada, fechaCarga: '', anotador: '',
            kilosProgramados: row.kilosProgramados, viaticosMovilidad: 0, viaticosInsumos: 0, gastoCuadrilla: 0, gastoAnotadores: 0,
            observacionesCarga: '', etapa: 'En carga', cierreFisicoConfirmado: false,
            proveedores: row.proveedoresCarga.map(provider => ({ ...provider, tipo: provider.rol })),
            fincas: g.deliveryOrigins.filter(origin => origin.coordinacionEntregaId === coordination.coordinacionEntregaId).map(origin => {
                const farm = g.farms.find(item => item.fincaId === origin.fincaId)!;
                const participation = g.participations.find(item => item.cxpId === origin.cxpId)!;
                return { id: String(farm.fincaId), nombre: farm.nombreFinca, productor: providerName(participation.proveedorId, g), codigoSenasa: farm.codigoLugarProduccion ?? '', distrito: farm.distrito, provincia: farm.provincia, latitud: farm.latitud, longitud: farm.longitud, variedad: g.varieties.find(item => item.frutaDerivadaId === farm.frutaDerivadaId)?.name ?? '', kilosEstimados: null };
            }),
            historial: [], checklistLlegada: { kilosEnPlanta: '', huboDescarte: false, kilosDescarte: '', motivoDescarte: '', observacionesEntrega: '', registrado: false },
            guiaSalida: { requiereGuia: false, numeroGuia: '', motivoSalida: '', bultosVaciosRetorno: '', kilosDescarteRetorno: '', archivo: null, observaciones: '' },
        };
    });
    const allLoads = [...pending, ...loads].map(row => {
        const campaign = g.campaigns.find(item => item.campaniaId === row.campaniaId);
        const issuedGuide = g.guides.some(guide => String(guide.cargaId) === row.id && guide.emitidaAt);
        const coordination = g.coordinations.find(item => row.pendienteRegistro ? item.entregaProgramadaId === Number(row.id.slice('entrega-'.length)) : g.loads.some(load => String(load.cargaId) === row.id && load.coordinacionEntregaId === item.coordinacionEntregaId));
        const harvest = g.harvests.find(item => item.entregaProgramadaId === coordination?.entregaProgramadaId);
        const rejected = harvest?.industria.inspectionResult === 'No cumple';
        const varieties = new Map<string, Set<string>>();
        for (const origin of g.deliveryOrigins.filter(item => item.coordinacionEntregaId === coordination?.coordinacionEntregaId)) {
            const party = g.participations.find(item => item.cxpId === origin.cxpId);
            const farm = g.farms.find(item => item.fincaId === origin.fincaId);
            const variety = g.varieties.find(item => item.frutaDerivadaId === farm?.frutaDerivadaId && item.frutaId === campaign?.frutaId);
            if (!party || !variety) continue;
            const id = String(party.proveedorId);
            const names = varieties.get(id) ?? new Set<string>();
            names.add(variety.name);
            varieties.set(id, names);
        }
        const variedadesCoordinadas = Object.fromEntries(row.proveedores.map(provider => {
            const names = new Set(varieties.get(provider.proveedorId));
            if (!row.pendienteRegistro && provider.variedad) names.add(provider.variedad);
            return [provider.proveedorId, [...names]];
        }));
        return { ...row, variedadesCoordinadas, estadoCampania: campaign?.estado, rechazada: rejected, cumpleRequisitosIndustria: harvest?.industria.inspectionResult === 'Cumple', permiteEditarCarga: campaign?.estado === 'en proceso' && row.etapa === 'En carga' && !issuedGuide && !rejected && !row.cargaIncompleta };
    });
    return { drivers, loads: allLoads };
}
