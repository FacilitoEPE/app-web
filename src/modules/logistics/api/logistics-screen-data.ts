import { format } from "date-fns";
import type { OperationsContext } from '@/modules/operations/api/operations-context.api';
import { hasLoadedWeight, loadContext } from '@/modules/operations/api/operation-links';
import { projectQualityData, jsonText, jsonNumber, jsonObject } from '@/modules/quality/api/quality-screen-data';
import type { LogisticsLoad } from '@/modules/logistics/logistics.models';
import type { DispatchStage } from '@/shared/components/DispatchStepProgress';
export const stageLabels: Record<string, DispatchStage> = { EN_CARGA: 'En carga', SALIDA: 'Salida', EN_CAMINO: 'En camino', LLEGADA: 'Llegada', CIERRE: 'Cierre' };
export function projectLogisticsData(g: OperationsContext, quality = projectQualityData(g).loads): LogisticsLoad[] {
    const fileFrom = (value: unknown) => { if (!value || typeof value !== 'object' || Array.isArray(value)) return null; const file = value as Record<string, unknown>; return typeof file.url === 'string' && typeof file.name === 'string' ? { url: file.url, name: file.name, ...(typeof file.type === 'string' ? { type: file.type } : {}), ...(typeof file.size === 'number' ? { size: file.size } : {}) } : null; };
    const qualityById = new Map(quality.map(row => [row.id, row]));
    return g.loads.filter(load => hasLoadedWeight(load.cargaId, g)).map(load => {
        const c = loadContext(load.cargaId, g), q = qualityById.get(String(load.cargaId))!, r = g.receipts.find(r => r.cargaId === load.cargaId), log = r?.logistica ?? {}, docs = r?.documentos ?? {}, check = r?.checklist ?? {}, history = g.histories.filter(h => h.coordinacionEntregaId === c.coordination.coordinacionEntregaId), purchases = (r?.compras ?? []).map(jsonObject);
        const localReport = r ? g.localDocuments?.find(file => file.tipo === 'recepcion_planta' && file.entidadId === r.recepcionPlantaId) : undefined;
        const receptionReport = fileFrom(log.reporteRecepcionArchivo) ?? fileFrom(docs.reporteRecepcionPlanta)
            ?? (localReport ? { url: localReport.url, name: localReport.name, type: localReport.type, size: localReport.size } : null);
        const driverArrival = jsonObject(check.llegada), driverExit = jsonObject(check.guiaSalida);
        const logisticsHistory = [...history].sort((a, b) => a.fechaHora.localeCompare(b.fechaHora)).map(item => ({ id: item.historialChoferId, etapa: stageLabels[item.estado], fechaHora: item.fechaHora, observacion: item.observacion ?? '' }));
        const latestReport = logisticsHistory.at(-1);
        const assignedGuides = q.guiasRemision;
        const providerMap = new Map<string, LogisticsLoad['proveedores'][number]>();
        for (const p of q.proveedoresCarga) {
            const previous = providerMap.get(p.proveedorId);
            if (previous) {
                previous.kilosCargados += p.kilosCargados;
                previous.jabasCargadas += p.jabasCargadas; previous.jabasVacias += p.jabasVacias;
                previous.binesCargados += p.binesCargados; previous.binesVacios += p.binesVacios;
                previous.mallasCargadas += p.mallasCargadas; previous.mallasVacias += p.mallasVacias;
                if (p.variedad && !previous.variedad.split(', ').includes(p.variedad))
                    previous.variedad += `${previous.variedad ? ', ' : ''}${p.variedad}`;
                continue;
            }
            providerMap.set(p.proveedorId, { proveedorId: p.proveedorId, proveedorNombre: p.proveedorNombre,
                tipo: p.rol, fincaNombre: p.fincaNombre, variedad: p.variedad, kilosCargados: p.kilosCargados,
                kilosRecibidosPlanta: jsonNumber(purchases.find(row => row.providerId === Number(p.proveedorId))?.recognizedQuantity),
                jabasCargadas: p.jabasCargadas, jabasVacias: p.jabasVacias,
                binesCargados: p.binesCargados, binesVacios: p.binesVacios,
                mallasCargadas: p.mallasCargadas, mallasVacias: p.mallasVacias });
        }
        const providerBreakdown = [...providerMap.values()];
        const purchaseRows = purchases.map(row => {
            const providerId = String(row.providerId ?? '');
            const provider = providerBreakdown.find(item => item.proveedorId === providerId);
            return { proveedorId: providerId, referencia: jsonText(row.reference), fruta: c.fruit, cantidadKg: jsonNumber(row.quantity) || provider?.kilosCargados || 0,
                guia: assignedGuides.find(guide => guide.proveedoresIncluidos.includes(providerId))?.numeroGuia ?? '',
                soporte: fileFrom(row.document)?.name ?? jsonText(row.document), soporteArchivo: fileFrom(row.document),
                estadoRevision: jsonText(row.reviewStatus) || 'Pendiente de revisión', observacion: jsonText(row.observation) };
        });
        return { id: String(load.cargaId), codigo: load.codigo, campaniaId: c.campaign.campaniaId, campaniaNombre: c.campaign.nombre, fruta: c.fruit, estadoCampania: c.campaign.estado, kilosRequeridosCampania: c.campaign.requerimientoComercial, canal: c.contract.canal === 'INDUSTRIA' ? 'Industria' : 'Exportación', cliente: c.client?.nombreEmpresa ?? '', contratoRef: c.contract.numero, origen: c.coordination.origenDescripcion, destino: c.delivery.destino, transportista: c.carrier?.nombreCompleto ?? '', placa: c.vehicle?.placa ?? '', chofer: c.driver?.nombre ?? '', licencia: c.driver?.numeroLicencia ?? '', fechaProgramada: c.delivery.fecha, fechaCarga: load.fechaCarga, anotador: load.anotadorNombre, kilosProgramados: c.delivery.kilosProgramados, viaticosMovilidad: load.viaticosMovilidad, viaticosInsumos: load.viaticosInsumos, gastoCuadrilla: q.gastoCuadrilla, gastoAnotadores: q.gastoAnotadores, observacionesCarga: load.observaciones ?? '', etapaDespacho: r?.cierreFisicoAt || r?.cierreAdministrativoAt || latestReport?.etapa === 'Cierre' ? 'Cierre' : log.actualArrival ? 'Llegada' : latestReport?.etapa ?? 'En carga', ultimoReporte: latestReport?.observacion ?? '',
            proveedores: providerBreakdown,
            recepcion: { inicioDescarga: r?.descargaInicioAt ? format(new Date(r.descargaInicioAt), "yyyy-MM-dd'T'HH:mm") : '', terminoDescarga: r?.descargaFinAt ? format(new Date(r.descargaFinAt), "yyyy-MM-dd'T'HH:mm") : '', responsableRecepcion: jsonText(log.responsableRecepcion), observacionesDescarga: jsonText(log.observacionesDescarga), evidenciaDescarga: fileFrom(log.evidenciaDescarga), pesoRecibidoPlanta: r?.pesoPlantaKg ?? 0, resultadoRecepcion: r?.resultado ?? '', reporteRecepcionArchivo: receptionReport, observacionesEvaluacion: r?.observaciones ?? '', huboDescarte: r?.huboDescarte ?? false, kilosDescarte: r?.descarteKg ?? 0, unidadDescarte: 'kg', motivoDescarte: jsonText(log.motivoDescarte), actaDescarteArchivo: fileFrom(log.actaDescarteArchivo) },
            documentosCierre: { guiaRemisionFruta: fileFrom(docs.guiaRemisionFruta), detalleCompras: fileFrom(docs.detalleCompras), constanciaDevolucionJabas: fileFrom(docs.constanciaDevolucionJabas) ?? fileFrom(check.crateReturnEvidence), reporteRecepcionPlanta: receptionReport, guiaSalidaFirmada: fileFrom(docs.guiaSalidaFirmada), actaDescarte: fileFrom(docs.actaDescarte) ?? fileFrom(log.actaDescarteArchivo), cierreFisicoConfirmado: Boolean(r?.cierreFisicoAt), fechaCierreFisico: r?.cierreFisicoAt ?? '', cierreAdministrativoConfirmado: Boolean(r?.cierreAdministrativoAt), fechaCierreAdministrativo: r?.cierreAdministrativoAt ?? '', observacionesCierre: jsonText(docs.observacionesCierre) },
            compras: purchaseRows,
            comprasBloqueadas: g.providerSettlements.some(settlement => settlement.cargaId === load.cargaId),
            estadoContabilidad: jsonText(log.accountingStatus),
            llegada: { llegadaEstimada: jsonText(log.estimatedArrival), ventanaInicio: jsonText(log.windowStart), ventanaFin: jsonText(log.windowEnd), llegadaReal: jsonText(log.actualArrival), observaciones: jsonText(log.arrivalObservations), evidencia: fileFrom(log.coordinationEvidence), motivoEspera: jsonText(log.waitingReason), atencionReprogramada: jsonText(log.rescheduledAttention) },
            devolucionJabas: { jabasIniciales: r?.jabasIniciales ?? null, jabasDevueltas: r?.jabasDevueltas ?? null, fechaDevolucion: r?.jabasDevolucionAt?.slice(0, 10) ?? '', coordinacion: jsonText(check.crateCoordination), salidaVehiculo: jsonText(check.vehicleExit), copiaTransportista: Boolean(check.carrierCopy), evidencia: fileFrom(check.crateReturnEvidence) },
            historialChofer: logisticsHistory,
            checklistChofer: { llegadaRegistrada: driverArrival.registrado === true, kilosEnPlanta: jsonText(driverArrival.kilosEnPlanta),
                huboDescarte: driverArrival.huboDescarte === true, kilosDescarte: jsonText(driverArrival.kilosDescarte),
                motivoDescarte: jsonText(driverArrival.motivoDescarte), observacionesEntrega: jsonText(driverArrival.observacionesEntrega),
                guiaSalidaNumero: jsonText(driverExit.numeroGuia), guiaSalidaArchivo: fileFrom(driverExit.archivo) },
            guiaFrutaEmitida: assignedGuides.find(guide => guide.estado === 'Generada')?.numeroGuia,
        };
    });
}
