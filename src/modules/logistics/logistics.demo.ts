import type { DispatchStage } from "@/shared/components/DispatchStepProgress";
import { demoPdf } from "@/shared/utils/demoData";
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

export const DEMO_LOGISTICS_LOADS: LogisticsLoad[] = [
    {
        id: "log-101",
        codigo: "CAR-2026-001",
        campaniaId: 1,
        campaniaNombre: "Campaña Mango Kent 2026",
        fruta: "Mango",
        estadoCampania: "En ejecución",
        kilosRequeridosCampania: 120000,
        canal: "Exportación",
        cliente: "Nature's Pride B.V.",
        contratoRef: "CNT-EXP-2026-01",
        origen: "Tambogrande · Valle San Lorenzo, Piura",
        destino: "Planta Empacadora Paita · Zona Industrial II",
        transportista: "Transportes Frigoríficos del Norte S.A.C.",
        placa: "B8T-914",
        chofer: "Carlos Alberto Mendoza Ríos",
        licencia: "Q43892104",
        fechaProgramada: "2026-10-25",
        fechaCarga: "2026-10-25",
        anotador: "Ing. Roberto Valladolid",
        kilosProgramados: 20000,
        viaticosMovilidad: 380,
        viaticosInsumos: 140,
        gastoCuadrilla: 950,
        gastoAnotadores: 220,
        observacionesCarga: "Estiba en 20 pallets ventilados con control de temperatura 10.5 °C.",
        etapaDespacho: "Llegada",
        ultimoReporte: "25/10/2026 15:40 · Ingreso a balanza y descarga en rampa #3",
        proveedores: [
            {
                proveedorId: "prov-1",
                proveedorNombre: "Segundo Teodoro Juárez Zeta",
                tipo: "Productor",
                fincaNombre: "Fundo San Isidro",
                variedad: "Kent",
                kilosCargados: 12400,
                kilosRecibidosPlanta: 12220,
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
                tipo: "Productor",
                fincaNombre: "Parcela Santa Elena",
                variedad: "Kent",
                kilosCargados: 7400,
                kilosRecibidosPlanta: 7300,
                jabasCargadas: 370,
                jabasVacias: 12,
                binesCargados: 0,
                binesVacios: 0,
                mallasCargadas: 0,
                mallasVacias: 0,
            },
        ],
        recepcion: {
            inicioDescarga: "2026-10-25T15:45",
            terminoDescarga: "2026-10-25T17:10",
            responsableRecepcion: "Ing. Patricia Seminario (Jefa de Recepción)",
            observacionesDescarga: "Descarga fluida con montacargas eléctrico en rampa #3.",
            pesoRecibidoPlanta: 19520,
            resultadoRecepcion: "Aceptada con observaciones",
            calidadRecepcion: "Brix 8.4° · Firmeza óptima · 1.4% descarte por látex leve",
            reporteRecepcionArchivo: demoPdf("reporte_recepcion_CAR-2026-001.pdf", "Reporte Recepcion CAR-2026-001"),
            observacionesEvaluacion: "Se descontaron 280 kg de fruta fuera de calibre para exportación.",
            huboDescarte: true,
            kilosDescarte: 280,
            destinoDescarte: "Derivado a cámara de reproceso / industria local",
            motivoDescarte: "Mancha de látex superficial y calibre menor a 350g.",
            actaDescarteArchivo: demoPdf("acta_descarte_CAR-2026-001.pdf", "Acta Descarte CAR-2026-001"),
        },
        jabasMovimientos: [
            {
                id: "mov-1",
                proveedorNombre: "Segundo Teodoro Juárez Zeta",
                tipoEnvase: "Jabas",
                fecha: "2026-10-25",
                cantidadCargada: 638,
                cantidadDevuelta: 620,
                pendientes: 18,
                guiaSalidaNumero: "EG01-000412",
                guiaSalidaArchivo: demoPdf("guia_salida_jabas_000412.pdf", "Guia Salida Jabas EG01-000412"),
                observaciones: "Quedan 18 jabas en cámara de hidrotermia por retornar en próximo viaje.",
            },
            {
                id: "mov-2",
                proveedorNombre: "María Elena Chiroque Bereche",
                tipoEnvase: "Jabas",
                fecha: "2026-10-25",
                cantidadCargada: 382,
                cantidadDevuelta: 382,
                pendientes: 0,
                guiaSalidaNumero: "EG01-000412",
                guiaSalidaArchivo: demoPdf("guia_salida_jabas_000412.pdf", "Guia Salida Jabas EG01-000412"),
                observaciones: "Devolución completa de envases.",
            },
        ],
        documentosCierre: {
            guiaRemisionFruta: demoPdf("GRR_EG07_000018_mango_kent.pdf", "Guia Remision Fruta EG07-000018"),
            guiaTransportista: demoPdf("GRT_V001_000894_norte.pdf", "Guia Transportista V001-000894"),
            reporteRecepcionPlanta: demoPdf("reporte_recepcion_CAR-2026-001.pdf", "Reporte Recepcion CAR-2026-001"),
            ticketBalanza: demoPdf("ticket_balanza_paita_4891.pdf", "Ticket Balanza Paita 4891"),
            guiaSalidaFirmada: demoPdf("guia_salida_jabas_000412.pdf", "Guia Salida Jabas EG01-000412"),
            actaDescarte: demoPdf("acta_descarte_CAR-2026-001.pdf", "Acta Descarte CAR-2026-001"),
            cierreFisicoConfirmado: true,
            fechaCierreFisico: "25/10/2026 17:45",
            cierreAdministrativoConfirmado: false,
            fechaCierreAdministrativo: "",
            observacionesCierre: "Falta conciliación de 18 jabas pendientes antes del cierre administrativo final.",
        },
    },
    {
        id: "log-102",
        codigo: "CAR-2026-002",
        campaniaId: 1,
        campaniaNombre: "Campaña Mango Kent 2026",
        fruta: "Mango",
        estadoCampania: "En ejecución",
        kilosRequeridosCampania: 120000,
        canal: "Industria",
        cliente: "Agroindustrias del Chira S.A.",
        contratoRef: "CNT-IND-2026-04",
        origen: "Marcavelica · Sullana, Piura",
        destino: "Planta Procesadora Sullana · Km 1028 Panamericana Norte",
        transportista: "Transportes Frigoríficos del Norte S.A.C.",
        placa: "B8T-914",
        chofer: "Carlos Alberto Mendoza Ríos",
        licencia: "Q43892104",
        fechaProgramada: "2026-10-26",
        fechaCarga: "2026-10-26",
        anotador: "Luis Enrique Palacios",
        kilosProgramados: 15000,
        viaticosMovilidad: 240,
        viaticosInsumos: 95,
        gastoCuadrilla: 680,
        gastoAnotadores: 150,
        observacionesCarga: "Transporte en bines plásticos de 400 kg.",
        etapaDespacho: "En camino",
        ultimoReporte: "26/10/2026 11:20 · Unidad en tránsito por puente Sullana",
        proveedores: [
            {
                proveedorId: "prov-3",
                proveedorNombre: "Acopios del Valle S.R.L.",
                tipo: "Acopiador",
                fincaNombre: "Fundo El Algarrobo",
                variedad: "Edward",
                kilosCargados: 14800,
                kilosRecibidosPlanta: 14750,
                jabasCargadas: 0,
                jabasVacias: 0,
                binesCargados: 37,
                binesVacios: 3,
                mallasCargadas: 0,
                mallasVacias: 0,
            },
        ],
        recepcion: {
            inicioDescarga: "",
            terminoDescarga: "",
            responsableRecepcion: "",
            observacionesDescarga: "",
            pesoRecibidoPlanta: 0,
            resultadoRecepcion: "Aceptada",
            calidadRecepcion: "",
            reporteRecepcionArchivo: null,
            observacionesEvaluacion: "",
            huboDescarte: false,
            kilosDescarte: 0,
            destinoDescarte: "",
            motivoDescarte: "",
            actaDescarteArchivo: null,
        },
        jabasMovimientos: [],
        documentosCierre: {
            guiaRemisionFruta: demoPdf("GRR_EG07_000019_mango_ind.pdf", "Guia Remision Fruta EG07-000019"),
            guiaTransportista: demoPdf("GRT_V001_000899_norte.pdf", "Guia Transportista V001-000899"),
            reporteRecepcionPlanta: null,
            ticketBalanza: null,
            guiaSalidaFirmada: null,
            actaDescarte: null,
            cierreFisicoConfirmado: false,
            fechaCierreFisico: "",
            cierreAdministrativoConfirmado: false,
            fechaCierreAdministrativo: "",
            observacionesCierre: "",
        },
    },
    {
        id: "log-103",
        codigo: "CAR-2026-003",
        campaniaId: 2,
        campaniaNombre: "Campaña Palta Hass 2026",
        fruta: "Palta",
        estadoCampania: "En ejecución",
        kilosRequeridosCampania: 95000,
        canal: "Exportación",
        cliente: "Westfalia Fruit International",
        contratoRef: "CNT-PAL-2026-02",
        origen: "Olmos · Lambayeque",
        destino: "Packing Agroexportador Chiclayo · Carretera Pimentel Km 6",
        transportista: "Logística Agroandina Perú E.I.R.L.",
        placa: "C4M-782",
        chofer: "Miguel Ángel Quispe Huamán",
        licencia: "Q41209876",
        fechaProgramada: "2026-10-24",
        fechaCarga: "2026-10-24",
        anotador: "Ing. Carmen Rosa Delgado",
        kilosProgramados: 22000,
        viaticosMovilidad: 420,
        viaticosInsumos: 160,
        gastoCuadrilla: 1100,
        gastoAnotadores: 260,
        observacionesCarga: "Materia seca verificada al 23.4%.",
        etapaDespacho: "Cierre",
        ultimoReporte: "24/10/2026 18:30 · Cierre físico y administrativo completado",
        proveedores: [
            {
                proveedorId: "prov-4",
                proveedorNombre: "Agrícola San Pedro de Olmos S.A.C.",
                tipo: "Productor",
                fincaNombre: "Fundo Tierra Verde",
                variedad: "Hass",
                kilosCargados: 21850,
                kilosRecibidosPlanta: 21680,
                jabasCargadas: 1092,
                jabasVacias: 20,
                binesCargados: 0,
                binesVacios: 0,
                mallasCargadas: 0,
                mallasVacias: 0,
            },
        ],
        recepcion: {
            inicioDescarga: "2026-10-24T14:20",
            terminoDescarga: "2026-10-24T16:05",
            responsableRecepcion: "Ing. Marco Antonio Vélez",
            observacionesDescarga: "Recepción conforme en línea de calibrado #2.",
            pesoRecibidoPlanta: 21680,
            resultadoRecepcion: "Aceptada",
            calidadRecepcion: "Materia seca 23.4% · Calibre 16-22 · Sin presencia de plagas",
            reporteRecepcionArchivo: demoPdf("reporte_planta_CAR-2026-003.pdf", "Reporte Planta CAR-2026-003"),
            observacionesEvaluacion: "Lote aprobado al 99.2% para empaque aéreo/marítimo.",
            huboDescarte: true,
            kilosDescarte: 170,
            destinoDescarte: "Devolución a productor con guía de salida",
            motivoDescarte: "Roce de rama y pedúnculo corto.",
            actaDescarteArchivo: demoPdf("acta_descarte_CAR-2026-003.pdf", "Acta Descarte CAR-2026-003"),
        },
        jabasMovimientos: [
            {
                id: "mov-3",
                proveedorNombre: "Agrícola San Pedro de Olmos S.A.C.",
                tipoEnvase: "Jabas",
                fecha: "2026-10-24",
                cantidadCargada: 1112,
                cantidadDevuelta: 1112,
                pendientes: 0,
                guiaSalidaNumero: "EG01-000398",
                guiaSalidaArchivo: demoPdf("guia_salida_olmos_chiclayo.pdf", "Guia Salida Olmos Chiclayo"),
                observaciones: "Devolución total de jabas cosecheras.",
            },
        ],
        documentosCierre: {
            guiaRemisionFruta: demoPdf("GRR_EG07_000014_palta_hass.pdf", "Guia Remision Fruta EG07-000014"),
            guiaTransportista: demoPdf("GRT_V002_000512_agroandina.pdf", "Guia Transportista V002-000512"),
            reporteRecepcionPlanta: demoPdf("reporte_planta_CAR-2026-003.pdf", "Reporte Planta CAR-2026-003"),
            ticketBalanza: demoPdf("ticket_balanza_chiclayo_4092.pdf", "Ticket Balanza Chiclayo 4092"),
            guiaSalidaFirmada: demoPdf("guia_salida_olmos_chiclayo.pdf", "Guia Salida Olmos Chiclayo"),
            actaDescarte: demoPdf("acta_descarte_CAR-2026-003.pdf", "Acta Descarte CAR-2026-003"),
            cierreFisicoConfirmado: true,
            fechaCierreFisico: "24/10/2026 17:15",
            cierreAdministrativoConfirmado: true,
            fechaCierreAdministrativo: "24/10/2026 18:30",
            observacionesCierre: "Expediente completo habilitado para Facturación y Liquidación de Compra.",
        },
    },
];
