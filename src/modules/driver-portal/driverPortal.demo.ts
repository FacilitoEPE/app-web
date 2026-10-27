import type { DispatchStage } from "@/shared/components/DispatchStepProgress";
import { demoPdf } from "@/shared/utils/demoData";
import type { FileSource } from "@/shared/utils/fileSource";

export interface DriverProfile {
    id: string;
    nombre: string;
    documento: string;
    licencia: string;
    telefono: string;
    transportista: string;
    placaAsignada: string;
}

export interface DriverFarmStop {
    id: string;
    nombre: string;
    productor: string;
    codigoSenasa: string;
    distrito: string;
    provincia: string;
    latitud: number;
    longitud: number;
    variedad: string;
    kilosEstimados: number;
}

export interface DriverProviderLoadDetail {
    proveedorId: string;
    proveedorNombre: string;
    tipo: "Productor" | "Acopiador";
    fincaNombre: string;
    variedad: string;
    kilosCargados: number;
    jabasCargadas: number;
    jabasVacias: number;
    binesCargados: number;
    binesVacios: number;
    mallasCargadas: number;
    mallasVacias: number;
}

export interface DriverStageHistoryItem {
    etapa: DispatchStage;
    fechaHora: string;
    nota: string;
}

export interface DriverArrivalChecklist {
    kilosEnPlanta: string;
    huboDescarte: boolean;
    kilosDescarte: string;
    motivoDescarte: string;
    observacionesEntrega: string;
    registrado: boolean;
}

export interface DriverVehicleExitGuide {
    requiereGuia: boolean;
    numeroGuia: string;
    motivoSalida: string;
    bultosVaciosRetorno: string;
    kilosDescarteRetorno: string;
    archivo: FileSource | null;
    observaciones: string;
}

export interface DriverLoad {
    id: string;
    codigo: string;
    campaniaId: number;
    campaniaNombre: string;
    fruta: string;
    canal: "Exportación" | "Industria";
    driverId: string;
    transportista: string;
    placa: string;
    cliente: string;
    contratoRef: string;
    origen: string;
    destino: string;
    destinoLatitud: number;
    destinoLongitud: number;
    fechaProgramada: string;
    fechaCarga: string;
    anotador: string;
    kilosProgramados: number;
    viaticosMovilidad: number;
    viaticosInsumos: number;
    gastoCuadrilla: number;
    gastoAnotadores: number;
    observacionesCarga: string;
    etapa: DispatchStage;
    fincas: DriverFarmStop[];
    proveedores: DriverProviderLoadDetail[];
    historial: DriverStageHistoryItem[];
    checklistLlegada: DriverArrivalChecklist;
    guiaSalida: DriverVehicleExitGuide;
}

export const DEMO_DRIVERS: DriverProfile[] = [
    {
        id: "chofer-1",
        nombre: "Carlos Alberto Mendoza Ríos",
        documento: "43892104",
        licencia: "Q43892104",
        telefono: "987 654 321",
        transportista: "Transportes Frigoríficos del Norte S.A.C.",
        placaAsignada: "B8T-914",
    },
    {
        id: "chofer-2",
        nombre: "Miguel Ángel Quispe Huamán",
        documento: "41209876",
        licencia: "Q41209876",
        telefono: "964 112 890",
        transportista: "Logística Agroandina Perú E.I.R.L.",
        placaAsignada: "C4M-782",
    },
    {
        id: "chofer-3",
        nombre: "Jorge Luis Pacherres Vílchez",
        documento: "45671230",
        licencia: "A3C-456712",
        telefono: "951 340 218",
        transportista: "Rutas del Sol Refrigerados S.A.",
        placaAsignada: "F9K-805",
    },
];

export const DEMO_DRIVER_LOADS: DriverLoad[] = [
    {
        id: "load-101",
        codigo: "CAR-2026-001",
        campaniaId: 1,
        campaniaNombre: "Campaña Mango Kent 2026",
        fruta: "Mango",
        canal: "Exportación",
        driverId: "chofer-1",
        transportista: "Transportes Frigoríficos del Norte S.A.C.",
        placa: "B8T-914",
        cliente: "Nature's Pride B.V.",
        contratoRef: "CNT-EXP-2026-01",
        origen: "Tambogrande · Valle San Lorenzo, Piura",
        destino: "Planta Empacadora Paita · Zona Industrial II, Paita",
        destinoLatitud: -5.0892,
        destinoLongitud: -81.1144,
        fechaProgramada: "2026-10-25",
        fechaCarga: "2026-10-25",
        anotador: "Ing. Roberto Valladolid",
        kilosProgramados: 20000,
        viaticosMovilidad: 380,
        viaticosInsumos: 140,
        gastoCuadrilla: 950,
        gastoAnotadores: 220,
        observacionesCarga: "Fruta cosechada en las primeras horas de la mañana con temperatura de pulpa controlada.",
        etapa: "En camino",
        fincas: [
            {
                id: "finca-1",
                nombre: "Fundo San Isidro",
                productor: "Segundo Teodoro Juárez Zeta",
                codigoSenasa: "002-01458-01",
                distrito: "Tambogrande",
                provincia: "Piura",
                latitud: -4.9318,
                longitud: -80.3442,
                variedad: "Kent",
                kilosEstimados: 12400,
            },
            {
                id: "finca-2",
                nombre: "Parcela Santa Elena",
                productor: "María Elena Chiroque Bereche",
                codigoSenasa: "002-01892-03",
                distrito: "Las Lomas",
                provincia: "Piura",
                latitud: -4.6548,
                longitud: -80.2467,
                variedad: "Kent",
                kilosEstimados: 7400,
            },
        ],
        proveedores: [
            {
                proveedorId: "prov-1",
                proveedorNombre: "Segundo Teodoro Juárez Zeta",
                tipo: "Productor",
                fincaNombre: "Fundo San Isidro",
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
                tipo: "Productor",
                fincaNombre: "Parcela Santa Elena",
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
        historial: [
            {
                etapa: "En carga",
                fechaHora: "25/10/2026 06:40",
                nota: "Inicio de estiba en Fundo San Isidro y Parcela Santa Elena (990 jabas cargadas).",
            },
            {
                etapa: "Salida",
                fechaHora: "25/10/2026 11:15",
                nota: "Salida de acopio en Tambogrande con precinto térmico #PT-8841.",
            },
            {
                etapa: "En camino",
                fechaHora: "25/10/2026 12:30",
                nota: "En tránsito por carretera Sullana - Paita, temperatura de furgón 10.5 °C.",
            },
        ],
        checklistLlegada: {
            kilosEnPlanta: "19520",
            huboDescarte: true,
            kilosDescarte: "280",
            motivoDescarte: "Mancha de látex leve y calibre menor al estándar de exportación.",
            observacionesEntrega: "Recepción en rampa #3 sin demoras.",
            registrado: false,
        },
        guiaSalida: {
            requiereGuia: true,
            numeroGuia: "EG01-000412",
            motivoSalida: "Devolución de 30 jabas vacías y 280 kg de fruta de descarte.",
            bultosVaciosRetorno: "30",
            kilosDescarteRetorno: "280",
            archivo: demoPdf("guia_salida_B8T914_paita.pdf", "Guia de Salida B8T-914 Paita"),
            observaciones: "Firmada por almacén de envases y control patrimonial en garita.",
        },
    },
    {
        id: "load-102",
        codigo: "CAR-2026-002",
        campaniaId: 1,
        campaniaNombre: "Campaña Mango Kent 2026",
        fruta: "Mango",
        canal: "Industria",
        driverId: "chofer-1",
        transportista: "Transportes Frigoríficos del Norte S.A.C.",
        placa: "B8T-914",
        cliente: "Agroindustrias del Chira S.A.",
        contratoRef: "CNT-IND-2026-04",
        origen: "Marcavelica · Sullana, Piura",
        destino: "Planta Procesadora Sullana · Km 1028 Panamericana Norte",
        destinoLatitud: -4.8901,
        destinoLongitud: -80.6889,
        fechaProgramada: "2026-10-26",
        fechaCarga: "2026-10-26",
        anotador: "Luis Enrique Palacios",
        kilosProgramados: 15000,
        viaticosMovilidad: 240,
        viaticosInsumos: 95,
        gastoCuadrilla: 680,
        gastoAnotadores: 150,
        observacionesCarga: "Fruta para pulpa industrial en bines plásticos.",
        etapa: "En carga",
        fincas: [
            {
                id: "finca-3",
                nombre: "Fundo El Algarrobo",
                productor: "Acopios del Valle S.R.L.",
                codigoSenasa: "002-02110-02",
                distrito: "Marcavelica",
                provincia: "Sullana",
                latitud: -4.8721,
                longitud: -80.7052,
                variedad: "Edward",
                kilosEstimados: 14800,
            },
        ],
        proveedores: [
            {
                proveedorId: "prov-3",
                proveedorNombre: "Acopios del Valle S.R.L.",
                tipo: "Acopiador",
                fincaNombre: "Fundo El Algarrobo",
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
        historial: [
            {
                etapa: "En carga",
                fechaHora: "26/10/2026 07:10",
                nota: "Unidad posicionada en centro de acopio Marcavelica.",
            },
        ],
        checklistLlegada: {
            kilosEnPlanta: "",
            huboDescarte: false,
            kilosDescarte: "0",
            motivoDescarte: "",
            observacionesEntrega: "",
            registrado: false,
        },
        guiaSalida: {
            requiereGuia: true,
            numeroGuia: "",
            motivoSalida: "Retorno de 3 bines vacíos al centro de acopio.",
            bultosVaciosRetorno: "3",
            kilosDescarteRetorno: "0",
            archivo: null,
            observaciones: "",
        },
    },
    {
        id: "load-103",
        codigo: "CAR-2026-003",
        campaniaId: 2,
        campaniaNombre: "Campaña Palta Hass 2026",
        fruta: "Palta",
        canal: "Exportación",
        driverId: "chofer-1",
        transportista: "Transportes Frigoríficos del Norte S.A.C.",
        placa: "B8T-914",
        cliente: "Westfalia Fruit International",
        contratoRef: "CNT-PAL-2026-02",
        origen: "Olmos · Lambayeque",
        destino: "Packing Agroexportador Chiclayo · Carretera Pimentel Km 6",
        destinoLatitud: -6.7845,
        destinoLongitud: -79.8821,
        fechaProgramada: "2026-10-24",
        fechaCarga: "2026-10-24",
        anotador: "Ing. Carmen Rosa Delgado",
        kilosProgramados: 22000,
        viaticosMovilidad: 420,
        viaticosInsumos: 160,
        gastoCuadrilla: 1100,
        gastoAnotadores: 260,
        observacionesCarga: "Materia seca verificada al 23.4%.",
        etapa: "Llegada",
        fincas: [
            {
                id: "finca-4",
                nombre: "Fundo Tierra Verde",
                productor: "Agrícola San Pedro de Olmos S.A.C.",
                codigoSenasa: "004-00841-01",
                distrito: "Olmos",
                provincia: "Lambayeque",
                latitud: -5.9845,
                longitud: -79.7451,
                variedad: "Hass",
                kilosEstimados: 21850,
            },
        ],
        proveedores: [
            {
                proveedorId: "prov-4",
                proveedorNombre: "Agrícola San Pedro de Olmos S.A.C.",
                tipo: "Productor",
                fincaNombre: "Fundo Tierra Verde",
                variedad: "Hass",
                kilosCargados: 21850,
                jabasCargadas: 1092,
                jabasVacias: 20,
                binesCargados: 0,
                binesVacios: 0,
                mallasCargadas: 0,
                mallasVacias: 0,
            },
        ],
        historial: [
            {
                etapa: "En carga",
                fechaHora: "24/10/2026 06:00",
                nota: "Carga de 1,092 jabas de Palta Hass en Fundo Tierra Verde.",
            },
            {
                etapa: "Salida",
                fechaHora: "24/10/2026 10:20",
                nota: "Salida desde Olmos con guía electrónica.",
            },
            {
                etapa: "En camino",
                fechaHora: "24/10/2026 11:45",
                nota: "Tránsito normal por Panamericana Norte rumbo a Chiclayo.",
            },
            {
                etapa: "Llegada",
                fechaHora: "24/10/2026 14:10",
                nota: "Ingreso a balanza en Packing Agroexportador Chiclayo.",
            },
        ],
        checklistLlegada: {
            kilosEnPlanta: "21680",
            huboDescarte: true,
            kilosDescarte: "170",
            motivoDescarte: "Daño mecánico superficial y pedúnculo corto.",
            observacionesEntrega: "Pesaje conforme en ticket de balanza #TB-4092.",
            registrado: true,
        },
        guiaSalida: {
            requiereGuia: true,
            numeroGuia: "EG01-000398",
            motivoSalida: "Retorno de 20 jabas vacías y 170 kg de descarte.",
            bultosVaciosRetorno: "20",
            kilosDescarteRetorno: "170",
            archivo: demoPdf("guia_salida_olmos_chiclayo.pdf", "Guia de Salida Olmos Chiclayo"),
            observaciones: "Autorizado por jefe de recepción.",
        },
    },
    {
        id: "load-104",
        codigo: "CAR-2026-004",
        campaniaId: 1,
        campaniaNombre: "Campaña Mango Kent 2026",
        fruta: "Mango",
        canal: "Exportación",
        driverId: "chofer-2",
        transportista: "Logística Agroandina Perú E.I.R.L.",
        placa: "C4M-782",
        cliente: " Camposol Trading S.A.",
        contratoRef: "CNT-EXP-2026-03",
        origen: "Chulucanas · Morropón, Piura",
        destino: "Planta Empacadora Sullana · Zona Industrial",
        destinoLatitud: -4.8901,
        destinoLongitud: -80.6889,
        fechaProgramada: "2026-10-25",
        fechaCarga: "2026-10-25",
        anotador: "Ing. Roberto Valladolid",
        kilosProgramados: 18000,
        viaticosMovilidad: 310,
        viaticosInsumos: 110,
        gastoCuadrilla: 840,
        gastoAnotadores: 200,
        observacionesCarga: "Carga de mango orgánico certificado.",
        etapa: "Salida",
        fincas: [
            {
                id: "finca-5",
                nombre: "Fundo La Encantada",
                productor: "Asociación de Productores del Alto Piura",
                codigoSenasa: "002-03112-01",
                distrito: "Chulucanas",
                provincia: "Morropón",
                latitud: -5.0954,
                longitud: -80.1625,
                variedad: "Kent",
                kilosEstimados: 17900,
            },
        ],
        proveedores: [
            {
                proveedorId: "prov-5",
                proveedorNombre: "Asociación de Productores del Alto Piura",
                tipo: "Productor",
                fincaNombre: "Fundo La Encantada",
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
        historial: [
            {
                etapa: "En carga",
                fechaHora: "25/10/2026 06:30",
                nota: "Carga completada en Fundo La Encantada.",
            },
            {
                etapa: "Salida",
                fechaHora: "25/10/2026 10:45",
                nota: "Unidad despachada desde Chulucanas.",
            },
        ],
        checklistLlegada: {
            kilosEnPlanta: "",
            huboDescarte: false,
            kilosDescarte: "0",
            motivoDescarte: "",
            observacionesEntrega: "",
            registrado: false,
        },
        guiaSalida: {
            requiereGuia: false,
            numeroGuia: "",
            motivoSalida: "",
            bultosVaciosRetorno: "0",
            kilosDescarteRetorno: "0",
            archivo: null,
            observaciones: "",
        },
    },
];
