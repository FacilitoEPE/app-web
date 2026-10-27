import { demoPdf } from "@/shared/utils/demoData";
import type { FileSource } from "@/shared/utils/fileSource";
import type { QualityScope } from "@/modules/quality/quality.utils";

export type QualityReviewStatus = "Pendiente de revisión" | "Aprobada para cosecha" | "Observada";

export interface QualityMtdProducerRecord {
    id: string;
    productor: string;
    finca: string;
    codigoSenasa: string;
    capturas: number;
    trampas: number;
    diasExposicion: number;
    mtdCalculado: number;
    evidenciaConteo: FileSource | null;
}

export interface QualityLabAnalysisRecord {
    id: string;
    tipoAnalisis:
        | "Residuos de Plaguicidas"
        | "Microbiológico"
        | "Metales Pesados"
        | "Maduración"
        | "Materia seca";
    fechaMuestreo: string;
    identificacionMuestra: string;
    etapa: string;
    resultado: "Apto" | "No apto";
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
    conductorTipoDoc: "DNI" | "CE";
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
    codigoProducto: string;
    descripcionProducto: string;
    normasSeleccionadas: string[];
    observacionesSunat: string;
}

export interface QualityDeliveryLoadItem {
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

export const ORGANIC_NORMS_CATALOG = [
    {
        id: "NOP",
        label: "USDA-NOP",
        certText: "CERTIFICADO ORGÁNICO USDA-NOP · CONTROL UNION CU-849102",
    },
    {
        id: "RTPO",
        label: "RTPO SENASA Perú",
        certText: "REGLAMENTO TÉCNICO PARA LOS PRODUCTOS ORGÁNICOS RTPO · CAAE-PE-2026",
    },
    {
        id: "EU",
        label: "Orgánico Unión Europea (CE 848/2018)",
        certText: "CERTIFICACIÓN ORGÁNICA UE PE-BIO-149 · CERTIGROW",
    },
    {
        id: "ROC",
        label: "Regenerative Organic Certified (ROC)",
        certText: "REGENERATIVE ORGANIC CERTIFIED · ROC-2026-PIURA",
    },
    {
        id: "GLOBALGAP",
        label: "GLOBALG.A.P. + GRASP",
        certText: "GGN 4063061598412 · MÓDULO SOCIAL GRASP EVALUADO",
    },
] as const;

export const DEMO_QUALITY_DELIVERY_LOADS: QualityDeliveryLoadItem[] = [
    {
        id: "qload-1",
        codigoCarga: "CAR-2026-001",
        campaniaId: 1,
        campaniaNombre: "Mango 2026",
        fruta: "Mango",
        scope: "exportador",
        cliente: "Nature's Pride B.V.",
        contratoRef: "CNT-EXP-2026-01",
        destino: "Planta Empacadora Paita · Zona Industrial II",
        fechaProgramada: "2026-10-25",
        fechaCargaReal: "2026-10-25",
        transportista: "Transportes Frigoríficos del Norte S.A.C.",
        placa: "B8T-914",
        chofer: "Carlos Alberto Mendoza Ríos",
        licencia: "Q43892104",
        anotador: "Ing. Roberto Valladolid",
        kilosProgramados: 20000,
        cumpleRequisitosIndustria: true,
        motivoRechazoIndustria: "",
        viaticosMovilidad: 380,
        viaticosInsumos: 140,
        gastoCuadrilla: 950,
        gastoAnotadores: 220,
        observacionesCarga: "Cosecha al amanecer con corte de pedúnculo largo y deslechado en caballete.",
        estadoRevision: "Aprobada para cosecha",
        mtdRegistros: [
            {
                id: "mtd-1",
                productor: "Segundo Teodoro Juárez Zeta",
                finca: "Fundo San Isidro",
                codigoSenasa: "002-01458-01",
                capturas: 1,
                trampas: 4,
                diasExposicion: 7,
                mtdCalculado: 0.0357,
                evidenciaConteo: demoPdf("mtd_san_isidro_sem43.pdf", "Reporte MTD SENASA Fundo San Isidro"),
            },
            {
                id: "mtd-2",
                productor: "María Elena Chiroque Bereche",
                finca: "Parcela Santa Elena",
                codigoSenasa: "002-01892-03",
                capturas: 2,
                trampas: 3,
                diasExposicion: 7,
                mtdCalculado: 0.0952,
                evidenciaConteo: demoPdf("mtd_santa_elena_sem43.pdf", "Reporte MTD SENASA Parcela Santa Elena"),
            },
        ],
        analisisLaboratorio: [
            {
                id: "lab-1",
                tipoAnalisis: "Residuos de Plaguicidas",
                fechaMuestreo: "2026-10-20",
                identificacionMuestra: "MUE-LMR-2026-084",
                etapa: "Pre-cosecha (5 días antes)",
                resultado: "Apto",
                observaciones: "0 detecciones por encima del LMR Unión Europea / Codex.",
                archivo: demoPdf("informe_lmr_eurofins_084.pdf", "Informe Laboratorio LMR 084"),
            },
            {
                id: "lab-2",
                tipoAnalisis: "Maduración",
                fechaMuestreo: "2026-10-24",
                identificacionMuestra: "MUE-BRIX-2026-112",
                etapa: "Liberación de campo",
                resultado: "Apto",
                observaciones: "Brix promedio 8.4° y color de pulpa 2.5 en tabla de cosecha.",
                archivo: demoPdf("evaluacion_madurez_112.pdf", "Evaluacion de Madurez y Brix 112"),
            },
        ],
        organizacionCosecha: {
            jefeCuadrilla: "Ing. Roberto Valladolid",
            personalAsignado: 18,
            fechaProgramadaInicio: "2026-10-25",
            jabas: 1020,
            tijeras: 22,
            bines: 0,
            mallas: 0,
            otrosMateriales: "Caballetes de deslechado, cal hidratada y jabón potásico",
            movilidadTraslado: "Minibús placa P2M-410 para cuadrilla de corte",
            observaciones: "Ingreso a parcela a las 05:30 h.",
            confirmada: true,
        },
        avancesCosecha: [
            {
                id: "adv-c1",
                productor: "Segundo Teodoro Juárez Zeta",
                finca: "Fundo San Isidro",
                fechaReal: "2026-10-25",
                kilosCosechados: 12400,
                jabas: 620,
                responsable: "Ing. Roberto Valladolid",
                evidencia: demoPdf("planilla_corte_san_isidro.pdf", "Planilla Corte Fundo San Isidro"),
            },
            {
                id: "adv-c2",
                productor: "María Elena Chiroque Bereche",
                finca: "Parcela Santa Elena",
                fechaReal: "2026-10-25",
                kilosCosechados: 7400,
                jabas: 370,
                responsable: "Ing. Roberto Valladolid",
                evidencia: demoPdf("planilla_corte_santa_elena.pdf", "Planilla Corte Parcela Santa Elena"),
            },
        ],
        cierreCosecha: {
            fechaTermino: "2026-10-25",
            cosechaCompletada: true,
            informeFinalCosecha: demoPdf("informe_final_cosecha_001.pdf", "Informe Final Cosecha CAR-2026-001"),
            solicitudPagoPersonal: demoPdf("solicitud_pago_cuadrilla_001.pdf", "Solicitud Pago Cuadrilla 001"),
            solicitudPagoMovilidad: demoPdf("solicitud_pago_movilidad_001.pdf", "Solicitud Pago Movilidad 001"),
            reciboPagoPersonal: demoPdf("recibo_pago_cuadrilla_001.pdf", "Recibo Pago Cuadrilla 001"),
            reciboPagoMovilidad: demoPdf("recibo_pago_movilidad_001.pdf", "Recibo Pago Movilidad 001"),
            registroCompraFruta: demoPdf("acta_compra_fruta_campo_001.pdf", "Registro Compra Fruta Campo 001"),
        },
        proveedoresCarga: [
            {
                proveedorId: "prov-1",
                proveedorNombre: "Segundo Teodoro Juárez Zeta",
                fincaNombre: "Fundo San Isidro",
                rol: "Productor",
                tipoFruta: "Orgánica",
                variedad: "Kent",
                kilosCargados: 12400,
                jabasCargadas: 620,
                jabasVacias: 18,
                binesCargados: 0,
                binesVacios: 0,
                mallasCargadas: 0,
                mallasVacias: 0,
            },
            {
                proveedorId: "prov-2",
                proveedorNombre: "María Elena Chiroque Bereche",
                fincaNombre: "Parcela Santa Elena",
                rol: "Productor",
                tipoFruta: "Orgánica",
                variedad: "Kent",
                kilosCargados: 7400,
                jabasCargadas: 370,
                jabasVacias: 12,
                binesCargados: 0,
                binesVacios: 0,
                mallasCargadas: 0,
                mallasVacias: 0,
            },
        ],
        guiasRemision: [
            {
                id: "guia-1",
                numeroGuia: "EG07-000018",
                estado: "Generada",
                proveedoresIncluidos: ["Segundo Teodoro Juárez Zeta", "María Elena Chiroque Bereche"],
                rolOrigen: "Productor",
                tipoFruta: "Orgánica",
                fechaInicioTraslado: "2026-10-25",
                fechaEntregaTransportista: "2026-10-25",
                pesoBrutoTotalKg: 19800,
                unidadMedida: "KGM",
                numeroBultos: 990,
                transportistaRuc: "20529841023",
                transportistaDenominacion: "Transportes Frigoríficos del Norte S.A.C.",
                transportistaMtc: "1548291CNG",
                vehiculoPlaca: "B8T-914",
                conductorTipoDoc: "DNI",
                conductorNumeroDoc: "43892104",
                conductorNombres: "Carlos Alberto",
                conductorApellidos: "Mendoza Ríos",
                conductorLicencia: "Q43892104",
                ubigeoPartida: "200114",
                direccionPartida: "Sector San Lorenzo Km 14 · Tambogrande, Piura",
                codEstablecimientoPartida: "0001",
                ubigeoLlegada: "200501",
                direccionLlegada: "Zona Industrial II Mz. D Lote 4 · Paita, Piura",
                codEstablecimientoLlegada: "0002",
                codigoProducto: "MNG-KENT-ORG",
                descripcionProducto: "MANGO FRESCO VARIEDAD KENT ORGÁNICO EN JABAS COSECHERAS",
                normasSeleccionadas: ["NOP", "EU", "GLOBALGAP"],
                observacionesSunat: "PRECINTO TÉRMICO #PT-8841 · LOTE TRAZABLE SENASA 002-01458-01 / 002-01892-03",
            },
        ],
    },
    {
        id: "qload-2",
        codigoCarga: "CAR-2026-002",
        campaniaId: 1,
        campaniaNombre: "Mango 2026",
        fruta: "Mango",
        scope: "industria",
        cliente: "Agroindustrias del Chira S.A.",
        contratoRef: "CNT-IND-2026-04",
        destino: "Planta Procesadora Sullana · Km 1028 Panamericana Norte",
        fechaProgramada: "2026-10-26",
        fechaCargaReal: "2026-10-26",
        transportista: "Transportes Frigoríficos del Norte S.A.C.",
        placa: "B8T-914",
        chofer: "Carlos Alberto Mendoza Ríos",
        licencia: "Q43892104",
        anotador: "Luis Enrique Palacios",
        kilosProgramados: 15000,
        cumpleRequisitosIndustria: true,
        motivoRechazoIndustria: "",
        viaticosMovilidad: 240,
        viaticosInsumos: 95,
        gastoCuadrilla: 680,
        gastoAnotadores: 150,
        observacionesCarga: "Fruta madura firme apta para línea de pulpa aséptica.",
        estadoRevision: "Aprobada para cosecha",
        mtdRegistros: [],
        analisisLaboratorio: [],
        organizacionCosecha: {
            jefeCuadrilla: "Luis Enrique Palacios",
            personalAsignado: 10,
            fechaProgramadaInicio: "2026-10-26",
            jabas: 0,
            tijeras: 10,
            bines: 40,
            mallas: 0,
            otrosMateriales: "",
            movilidadTraslado: "Camioneta rural",
            observaciones: "",
            confirmada: true,
        },
        avancesCosecha: [],
        cierreCosecha: {
            fechaTermino: "2026-10-26",
            cosechaCompletada: true,
            informeFinalCosecha: null,
            solicitudPagoPersonal: null,
            solicitudPagoMovilidad: null,
            reciboPagoPersonal: null,
            reciboPagoMovilidad: null,
            registroCompraFruta: null,
        },
        proveedoresCarga: [
            {
                proveedorId: "prov-3",
                proveedorNombre: "Acopios del Valle S.R.L.",
                fincaNombre: "Fundo El Algarrobo",
                rol: "Acopiador",
                tipoFruta: "Convencional",
                variedad: "Edward",
                kilosCargados: 14800,
                jabasCargadas: 0,
                jabasVacias: 0,
                binesCargados: 37,
                binesVacios: 3,
                mallasCargadas: 0,
                mallasVacias: 0,
            },
        ],
        guiasRemision: [
            {
                id: "guia-2",
                numeroGuia: "EG07-000019",
                estado: "Lista para generar",
                proveedoresIncluidos: ["Acopios del Valle S.R.L."],
                rolOrigen: "Acopiador",
                tipoFruta: "Convencional",
                fechaInicioTraslado: "2026-10-26",
                fechaEntregaTransportista: "2026-10-26",
                pesoBrutoTotalKg: 14800,
                unidadMedida: "KGM",
                numeroBultos: 37,
                transportistaRuc: "20529841023",
                transportistaDenominacion: "Transportes Frigoríficos del Norte S.A.C.",
                transportistaMtc: "1548291CNG",
                vehiculoPlaca: "B8T-914",
                conductorTipoDoc: "DNI",
                conductorNumeroDoc: "43892104",
                conductorNombres: "Carlos Alberto",
                conductorApellidos: "Mendoza Ríos",
                conductorLicencia: "Q43892104",
                ubigeoPartida: "200605",
                direccionPartida: "Centro de Acopio Marcavelica Km 4 · Sullana, Piura",
                codEstablecimientoPartida: "0001",
                ubigeoLlegada: "200601",
                direccionLlegada: "Panamericana Norte Km 1028 · Zona Industrial Sullana",
                codEstablecimientoLlegada: "0001",
                codigoProducto: "MNG-EDW-IND",
                descripcionProducto: "MANGO VARIEDAD EDWARD CONVENCIONAL PARA USO INDUSTRIAL EN BINES",
                normasSeleccionadas: [],
                observacionesSunat: "TRASLADO DE CENTRO DE ACOPIO A PLANTA PROCESADORA",
            },
        ],
    },
    {
        id: "qload-3",
        codigoCarga: "CAR-2026-005",
        campaniaId: 1,
        campaniaNombre: "Mango 2026",
        fruta: "Mango",
        scope: "exportador",
        cliente: "Camposol Trading S.A.",
        contratoRef: "CNT-EXP-2026-03",
        destino: "Planta Empacadora Sullana · Zona Industrial",
        fechaProgramada: "2026-10-28",
        fechaCargaReal: "2026-10-28",
        transportista: "Logística Agroandina Perú E.I.R.L.",
        placa: "C4M-782",
        chofer: "Miguel Ángel Quispe Huamán",
        licencia: "Q41209876",
        anotador: "Ing. Carmen Rosa Delgado",
        kilosProgramados: 18500,
        cumpleRequisitosIndustria: true,
        motivoRechazoIndustria: "",
        viaticosMovilidad: 310,
        viaticosInsumos: 110,
        gastoCuadrilla: 840,
        gastoAnotadores: 200,
        observacionesCarga: "Pendiente de validación final de lectura de trampas MTD.",
        estadoRevision: "Pendiente de revisión",
        mtdRegistros: [
            {
                id: "mtd-3",
                productor: "Asociación de Productores del Alto Piura",
                finca: "Fundo La Encantada",
                codigoSenasa: "002-03112-01",
                capturas: 3,
                trampas: 2,
                diasExposicion: 7,
                mtdCalculado: 0.2143,
                evidenciaConteo: null,
            },
        ],
        analisisLaboratorio: [],
        organizacionCosecha: {
            jefeCuadrilla: "Ing. Carmen Rosa Delgado",
            personalAsignado: 15,
            fechaProgramadaInicio: "2026-10-28",
            jabas: 925,
            tijeras: 18,
            bines: 0,
            mallas: 0,
            otrosMateriales: "Jabas cosecheras desinfectadas",
            movilidadTraslado: "Custer personal",
            observaciones: "",
            confirmada: false,
        },
        avancesCosecha: [],
        cierreCosecha: {
            fechaTermino: "",
            cosechaCompletada: false,
            informeFinalCosecha: null,
            solicitudPagoPersonal: null,
            solicitudPagoMovilidad: null,
            reciboPagoPersonal: null,
            reciboPagoMovilidad: null,
            registroCompraFruta: null,
        },
        proveedoresCarga: [
            {
                proveedorId: "prov-5",
                proveedorNombre: "Asociación de Productores del Alto Piura",
                fincaNombre: "Fundo La Encantada",
                rol: "Productor",
                tipoFruta: "Orgánica",
                variedad: "Kent",
                kilosCargados: 17900,
                jabasCargadas: 895,
                jabasVacias: 15,
                binesCargados: 0,
                binesVacios: 0,
                mallasCargadas: 0,
                mallasVacias: 0,
            },
        ],
        guiasRemision: [],
    },
];
