import type { OperationsContext } from '@/modules/operations/api/operations-context.api';
import { loadContext } from '@/modules/operations/api/operation-links';
import { projectLogisticsData, stageLabels } from '@/modules/logistics/api/logistics-screen-data';
import { jsonObject, jsonText } from '@/modules/quality/api/quality-screen-data';
import type { DriverLoad, DriverProfile } from '@/modules/driver-portal/driverPortal.models';
function farmLoadKg(g: OperationsContext, loadId: number, coordinationId: number, participationId: number, farmId: number): number | null {
    const rows = g.loadProviders.filter(r => r.cargaId === loadId && r.cxpId === participationId);
    const sources = g.loadOrigins.filter(r => r.fincaId === farmId && rows.some(p => p.proveedorCargaId === r.proveedorCargaId));
    if (sources.length && sources.every(r => r.kilosOrigen !== null)) return sources.reduce((n, r) => n + (r.kilosOrigen ?? 0), 0);
    const farmCount = new Set(g.deliveryOrigins.filter(r => r.coordinacionEntregaId === coordinationId && r.cxpId === participationId).map(r => r.fincaId)).size;
    return farmCount === 1 ? rows.reduce((n, r) => n + r.kilosCargados, 0) : null;
}

export function projectDriverData(g: OperationsContext) {
    const drivers: DriverProfile[] = g.drivers.map(d => ({ id: String(d.idChoferTransporteExterno), nombre: d.nombre, documento: g.people.find(p => p.personaId === d.personaId)?.numeroDocumento ?? '', licencia: d.numeroLicencia ?? '', telefono: d.telefono, transportista: g.carriers.find(c => c.idEmpresaTransporteExterno === d.idEmpresaTransporteExterno)?.nombreCompleto ?? '', placaAsignada: g.vehicles.find(v => v.idEmpresaTransporteExterno === d.idEmpresaTransporteExterno)?.placa ?? '' }));
    const logistics = projectLogisticsData(g);
    const loads: DriverLoad[] = g.loads.map(load => {
        const c = loadContext(load.cargaId, g), l = logistics.find(l => l.id === String(load.cargaId))!, receipt = g.receipts.find(r => r.cargaId === load.cargaId), check = receipt?.checklist ?? {}, arrival = jsonObject(check.llegada), exit = jsonObject(check.guiaSalida);
        return { id: String(load.cargaId), codigo: load.codigo, campaniaId: c.campaign.campaniaId, campaniaNombre: c.campaign.nombre, fruta: c.fruit, canal: l.canal, driverId: String(c.coordination.idChoferTransporteExterno), transportista: l.transportista, placa: l.placa, cliente: l.cliente, contratoRef: l.contratoRef, origen: l.origen, destino: l.destino, destinoLatitud: null, destinoLongitud: null, fechaProgramada: l.fechaProgramada, fechaCarga: l.fechaCarga, anotador: l.anotador, kilosProgramados: l.kilosProgramados, viaticosMovilidad: l.viaticosMovilidad, viaticosInsumos: l.viaticosInsumos, gastoCuadrilla: l.gastoCuadrilla, gastoAnotadores: l.gastoAnotadores, observacionesCarga: l.observacionesCarga, etapa: l.etapaDespacho, proveedores: l.proveedores,
            fincas: g.deliveryOrigins.filter(o => o.coordinacionEntregaId === c.coordination.coordinacionEntregaId).map(o => { const f = g.farms.find(f => f.fincaId === o.fincaId)!, p = g.participations.find(p => p.cxpId === o.cxpId)!; return { id: String(f.fincaId), nombre: f.nombreFinca, productor: l.proveedores.find(row => Number(row.proveedorId) === p.proveedorId)?.proveedorNombre ?? '', codigoSenasa: f.codigoLugarProduccion ?? '', distrito: f.distrito, provincia: f.provincia, latitud: f.latitud, longitud: f.longitud, variedad: g.varieties.find(v => v.frutaDerivadaId === f.frutaDerivadaId)?.name ?? '', kilosEstimados: farmLoadKg(g, load.cargaId, c.coordination.coordinacionEntregaId, o.cxpId, f.fincaId) }; }),
            historial: g.histories.filter(h => h.coordinacionEntregaId === c.coordination.coordinacionEntregaId).map(h => ({ etapa: stageLabels[h.estado], fechaHora: h.fechaHora, nota: h.observacion ?? '' })), checklistLlegada: { kilosEnPlanta: jsonText(arrival.kilosEnPlanta) || (receipt?.pesoPlantaKg === null ? '' : String(receipt?.pesoPlantaKg ?? '')), huboDescarte: arrival.huboDescarte === true || receipt?.huboDescarte === true, kilosDescarte: jsonText(arrival.kilosDescarte), motivoDescarte: jsonText(arrival.motivoDescarte), observacionesEntrega: jsonText(arrival.observacionesEntrega), registrado: arrival.registrado === true }, guiaSalida: { requiereGuia: exit.requiereGuia === true, numeroGuia: jsonText(exit.numeroGuia), motivoSalida: jsonText(exit.motivoSalida), bultosVaciosRetorno: jsonText(exit.bultosVaciosRetorno), kilosDescarteRetorno: jsonText(exit.kilosDescarteRetorno), archivo: null, observaciones: jsonText(exit.observaciones) } };
    });
    return { drivers, loads };
}
