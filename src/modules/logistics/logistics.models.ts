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
export interface LogisticsReceptionData {
    // Bloque A: Descarga
    inicioDescarga: string;
    terminoDescarga: string;
    responsableRecepcion: string;
    observacionesDescarga: string;
    // Bloque B: Evaluación de carga
    pesoRecibidoPlanta: number;
    resultadoRecepcion: "Aceptada" | "Aceptada con observaciones" | "Rechazada";
    calidadRecepcion: string;
    reporteRecepcionArchivo: FileSource | null;
    observacionesEvaluacion: string;
    // Bloque C: Descarte
    huboDescarte: boolean;
    kilosDescarte: number;
    destinoDescarte: string;
    motivoDescarte: string;
    actaDescarteArchivo: FileSource | null;
}
export interface LogisticsCrateMovement {
    id: string;
    proveedorNombre: string;
    tipoEnvase: "Jabas" | "Bines" | "Mallas";
    fecha: string;
    cantidadCargada: number;
    cantidadDevuelta: number;
    pendientes: number;
    guiaSalidaNumero: string;
    guiaSalidaArchivo: FileSource | null;
    observaciones: string;
}
export interface LogisticsDocumentsClosure {
    guiaRemisionFruta: FileSource | null;
    guiaTransportista: FileSource | null;
    reporteRecepcionPlanta: FileSource | null;
    ticketBalanza: FileSource | null;
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
    recepcion: LogisticsReceptionData;
    jabasMovimientos: LogisticsCrateMovement[];
    documentosCierre: LogisticsDocumentsClosure;
}
