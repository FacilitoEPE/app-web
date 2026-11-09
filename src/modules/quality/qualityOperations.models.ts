import type { FileSource } from "@/shared/utils/fileSource";
import type { QualityScope } from "@/modules/quality/quality.utils";
export type QualityReviewStatus = "Pendiente de revisión" | "Aprobada para cosecha" | "Observada";
export interface QualityMtdProducerRecord {
    id: string;
    productor: string;
    finca: string;
    codigoSenasa: string;
    capturas: number | null;
    trampas: number | null;
    diasExposicion: number | null;
    mtdCalculado: number;
    limiteAplicado?: number;
    evidenciaConteo: FileSource | null;
}
export interface QualityLabAnalysisRecord {
    origin?: {
        cxpId: number;
        fincaId: number;
    };
    id: string;
    tipoAnalisis: "Residuos de Plaguicidas" | "Microbiológico" | "Metales Pesados" | "Maduración" | "Materia seca";
    fechaMuestreo: string;
    identificacionMuestra: string;
    etapa: string;
    resultado: "Apto" | "No apto" | "Pendiente";
    observaciones: string;
    archivo: FileSource | null;
}
export interface QualityHarvestOrganization {
    jefeCuadrilla: string;
    personalAsignado: number;
    fechaProgramadaInicio: string;
    jabas: number;
    tijeras: number;
    bines: number;
    mallas: number;
    otrosMateriales: string;
    movilidadTraslado: string;
    observaciones: string;
    confirmada: boolean;
}
export interface QualityHarvestAdvance {
    id: string;
    productor: string;
    finca: string;
    fechaReal: string;
    kilosCosechados: number;
    jabas: number;
    responsable: string;
    evidencia: FileSource | null;
}
export interface QualityHarvestClosure {
    fechaTermino: string;
    cosechaCompletada: boolean;
    informeFinalCosecha: FileSource | null;
    solicitudPagoPersonal: FileSource | null;
    solicitudPagoMovilidad: FileSource | null;
    reciboPagoPersonal: FileSource | null;
    reciboPagoMovilidad: FileSource | null;
    registroCompraFruta: FileSource | null;
}
export interface QualityProviderLoadDetail {
    registroId?: number;
    proveedorId: string;
    proveedorNombre: string;
    fincaNombre: string;
    rol: "Productor" | "Acopiador";
    tipoFruta: "Orgánica" | "Convencional";
    variedad: string;
    kilosCargados: number;
    jabasCargadas: number;
    jabasVacias: number;
    binesCargados: number;
    binesVacios: number;
    mallasCargadas: number;
    mallasVacias: number;
}
export interface QualitySunatRemissionGuide {
    id: string;
    numeroGuia: string;
    estado: "Pendiente de datos" | "Lista para generar" | "Generada";
    proveedoresIncluidos: string[];
    /** Kilos de cada proveedor incluidos en esta guía; permite dividir una carga entre varias guías. */
    kilosPorProveedor?: Record<string, number>;
    rolOrigen: "Productor" | "Acopiador";
    tipoFruta: "Orgánica" | "Convencional";
    fechaInicioTraslado: string;
    fechaEntregaTransportista: string;
    pesoBrutoTotalKg: number;
    unidadMedida: "KGM";
    numeroBultos: number;
    transportistaRuc: string;
    transportistaDenominacion: string;
    transportistaMtc: string;
    vehiculoPlaca: string;
    conductorTipoDoc: "DNI" | "CE" | "Pasaporte";
    conductorNumeroDoc: string;
    conductorNombres: string;
    conductorApellidos: string;
    conductorLicencia: string;
    ubigeoPartida: string;
    direccionPartida: string;
    codEstablecimientoPartida: string;
    ubigeoLlegada: string;
    direccionLlegada: string;
    codEstablecimientoLlegada: string;
    normasSeleccionadas: string[];
    observacionesSunat: string;
}
export interface QualityDeliveryLoadItem {
    cargaId?: number;
    cargaIncompleta?: boolean;
    puedeRegistrarCarga?: boolean;
    guideDefaults?: Partial<QualitySunatRemissionGuide>;
    id: string;
    codigoCarga: string;
    campaniaId: number;
    campaniaNombre: string;
    fruta: string;
    scope: QualityScope;
    cliente: string;
    contratoRef: string;
    destino: string;
    fechaProgramada: string;
    fechaCargaReal: string;
    transportista: string;
    placa: string;
    chofer: string;
    licencia: string;
    anotador: string;
    kilosProgramados: number;
    cumpleRequisitosIndustria: boolean;
    motivoRechazoIndustria: string;
    viaticosMovilidad: number;
    viaticosInsumos: number;
    gastoCuadrilla: number;
    gastoAnotadores: number;
    observacionesCarga: string;
    estadoRevision: QualityReviewStatus;
    mtdRegistros: QualityMtdProducerRecord[];
    analisisLaboratorio: QualityLabAnalysisRecord[];
    organizacionCosecha: QualityHarvestOrganization;
    avancesCosecha: QualityHarvestAdvance[];
    cierreCosecha: QualityHarvestClosure;
    proveedoresCarga: QualityProviderLoadDetail[];
    guiasRemision: QualitySunatRemissionGuide[];
}
export interface UbigeoEntry {
    codigo: string;
    distrito: string;
    provincia: string;
    departamento: string;
}
export const SUNAT_UBIGEO_CATALOG: UbigeoEntry[] = [
    { codigo: "200114", distrito: "Tambogrande", provincia: "Piura", departamento: "Piura" },
    { codigo: "200110", distrito: "Las Lomas", provincia: "Piura", departamento: "Piura" },
    { codigo: "200501", distrito: "Paita", provincia: "Paita", departamento: "Piura" },
    { codigo: "200601", distrito: "Sullana", provincia: "Sullana", departamento: "Piura" },
    { codigo: "200605", distrito: "Marcavelica", provincia: "Sullana", departamento: "Piura" },
    { codigo: "200401", distrito: "Chulucanas", provincia: "Morropón", departamento: "Piura" },
    { codigo: "140308", distrito: "Olmos", provincia: "Lambayeque", departamento: "Lambayeque" },
    { codigo: "140101", distrito: "Chiclayo", provincia: "Chiclayo", departamento: "Lambayeque" },
    { codigo: "140112", distrito: "Pimentel", provincia: "Chiclayo", departamento: "Lambayeque" },
];
export const ORGANIC_NORMS_CATALOG: {
    id: string;
    label: string;
    certText: string;
}[] = [];
