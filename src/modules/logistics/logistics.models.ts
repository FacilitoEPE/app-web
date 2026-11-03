import type { DispatchStage } from "@/shared/components/DispatchStepProgress";
import type { FileSource } from "@/shared/utils/fileSource";
export interface LogisticsProviderBreakdown {
    proveedorId: string;
    proveedorNombre: string;
    tipo: "Productor" | "Acopiador";
    fincaNombre: string;
    variedad: string;
    kilosCargados: number;
    kilosRecibidosPlanta: number;
    jabasCargadas: number;
    jabasVacias: number;
    binesCargados: number;
    binesVacios: number;
    mallasCargadas: number;
    mallasVacias: number;
}
export interface LogisticsPurchase {
    proveedorId: string;
    referencia: string;
    fruta: string;
    cantidadKg: number;
    guia: string;
    soporte: string;
    soporteArchivo?: FileSource | null;
    estadoRevision: string;
    observacion: string;
}
export interface LogisticsArrival {
    llegadaEstimada: string;
    ventanaInicio: string;
    ventanaFin: string;
    llegadaReal: string;
    observaciones: string;
    evidencia: FileSource | null;
    motivoEspera: string;
    atencionReprogramada: string;
}
export interface LogisticsCrateReturn {
    jabasIniciales: number | null;
    jabasDevueltas: number | null;
    fechaDevolucion: string;
    coordinacion: string;
    salidaVehiculo: string;
    copiaTransportista: boolean;
    evidencia: FileSource | null;
}
export interface LogisticsDispatchEvent {
    id: number;
    etapa: DispatchStage;
    fechaHora: string;
    observacion: string;
}
export interface LogisticsReceptionData {
    // Bloque A: Descarga
    inicioDescarga: string;
    terminoDescarga: string;
    responsableRecepcion: string;
    observacionesDescarga: string;
    evidenciaDescarga?: FileSource | null;
    // Bloque B: Evaluación de carga
    pesoRecibidoPlanta: number;
    resultadoRecepcion: string;
    reporteRecepcionArchivo: FileSource | null;
    observacionesEvaluacion: string;
    // Bloque C: Descarte
    huboDescarte: boolean;
    kilosDescarte: number;
    unidadDescarte: "kg";
    motivoDescarte: string;
    actaDescarteArchivo: FileSource | null;
}
export interface LogisticsDocumentsClosure {
    guiaRemisionFruta: FileSource | null;
    detalleCompras?: FileSource | null;
    constanciaDevolucionJabas?: FileSource | null;
    reporteRecepcionPlanta: FileSource | null;
    guiaSalidaFirmada: FileSource | null;
    actaDescarte: FileSource | null;
    cierreFisicoConfirmado: boolean;
    fechaCierreFisico: string;
    cierreAdministrativoConfirmado: boolean;
    fechaCierreAdministrativo: string;
    observacionesCierre: string;
}
export interface LogisticsLoad {
    id: string;
    codigo: string;
    campaniaId: number;
    campaniaNombre: string;
    fruta: string;
    estadoCampania: string;
    kilosRequeridosCampania: number;
    canal: "Exportación" | "Industria";
    cliente: string;
    contratoRef: string;
    origen: string;
    destino: string;
    transportista: string;
    placa: string;
    chofer: string;
    licencia: string;
    fechaProgramada: string;
    fechaCarga: string;
    anotador: string;
    kilosProgramados: number;
    viaticosMovilidad: number;
    viaticosInsumos: number;
    gastoCuadrilla: number;
    gastoAnotadores: number;
    observacionesCarga: string;
    etapaDespacho: DispatchStage;
    ultimoReporte: string;
    proveedores: LogisticsProviderBreakdown[];
    compras?: LogisticsPurchase[];
    comprasBloqueadas?: boolean;
    estadoContabilidad?: string;
    llegada?: LogisticsArrival;
    devolucionJabas?: LogisticsCrateReturn;
    historialChofer?: LogisticsDispatchEvent[];
    checklistChofer?: {
        llegadaRegistrada: boolean;
        kilosEnPlanta: string;
        huboDescarte: boolean;
        kilosDescarte: string;
        motivoDescarte: string;
        observacionesEntrega: string;
        guiaSalidaNumero: string;
        guiaSalidaArchivo: FileSource | null;
    };
    guiaFrutaEmitida?: string;
    recepcion: LogisticsReceptionData;
    documentosCierre: LogisticsDocumentsClosure;
}
