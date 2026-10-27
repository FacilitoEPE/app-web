import { demoPdf } from "@/shared/utils/demoData";
import type { FileSource } from "@/shared/utils/fileSource";

export type BillingCurrency = "USD" | "PEN";

export type BillingInvoiceStatus =
    | "Preparación pendiente"
    | "Emitida"
    | "Cobrado parcial"
    | "Cobrado"
    | "Vencido";

export interface BillingCollectionItem {
    id: string;
    fecha: string;
    importe: number;
    medio: "Transferencia" | "Depósito" | "Efectivo" | "Otro";
    referencia: string;
    evidencia: FileSource | null;
    observaciones: string;
}

export interface BillingInvoice {
    id: string;
    referenciaPreparacion: string;
    numeroFacturaElectronica: string;
    estado: BillingInvoiceStatus;
    fechaPreparacion: string;
    fechaEmision: string;
    fechaVencimiento: string;
    kilosFacturados: number;
    precioUnitario: number;
    descuento: number;
    cargos: number;
    total: number;
    moneda: BillingCurrency;
    archivoPreparacion: FileSource | null;
    archivoFacturaEmitida: FileSource | null;
    observaciones: string;
    cobros: BillingCollectionItem[];
}

export interface BillingLoad {
    id: string;
    codigo: string;
    fechaRecepcion: string;
    kilosCargados: number;
    kilosRecibidos: number;
    precioVentaKg: number;
    moneda: BillingCurrency;
    reporteRecepcion: FileSource | null;
    respaldoLogisticoCompleto: boolean;
    facturas: BillingInvoice[];
}

export interface BillingClient {
    id: string;
    campaniaId: number;
    campaniaNombre: string;
    fruta: string;
    estadoCampania: string;
    nombreEmpresa: string;
    ruc: string;
    canal: "Exportación" | "Industria";
    pais: string;
    contacto: string;
    correo: string;
    moneda: BillingCurrency;
    kilosContratados: number;
    precioPorKg: number;
    cargas: BillingLoad[];
}

export const DEMO_BILLING_CLIENTS: BillingClient[] = [
    {
        id: "cli-bill-1",
        campaniaId: 1,
        campaniaNombre: "Campaña Mango Kent 2026",
        fruta: "Mango",
        estadoCampania: "En ejecución",
        nombreEmpresa: "Nature's Pride B.V.",
        ruc: "NL813492018B01",
        canal: "Exportación",
        pais: "Países Bajos",
        contacto: "Hendrik Van Der Berg",
        correo: "imports@naturespride.nl",
        moneda: "USD",
        kilosContratados: 60000,
        precioPorKg: 1.85,
        cargas: [
            {
                id: "bload-1",
                codigo: "CAR-2026-001",
                fechaRecepcion: "2026-10-25",
                kilosCargados: 19800,
                kilosRecibidos: 19520,
                precioVentaKg: 1.85,
                moneda: "USD",
                reporteRecepcion: demoPdf("reporte_recepcion_CAR-2026-001.pdf", "Reporte Recepcion CAR-2026-001"),
                respaldoLogisticoCompleto: true,
                facturas: [
                    {
                        id: "inv-101",
                        referenciaPreparacion: "PREP-2026-001",
                        numeroFacturaElectronica: "F001-000482",
                        estado: "Cobrado parcial",
                        fechaPreparacion: "2026-10-25",
                        fechaEmision: "2026-10-25",
                        fechaVencimiento: "2026-11-15",
                        kilosFacturados: 19520,
                        precioUnitario: 1.85,
                        descuento: 112,
                        cargos: 0,
                        total: 36000,
                        moneda: "USD",
                        archivoPreparacion: demoPdf("liquidacion_previa_CAR-2026-001.pdf", "Liquidacion Previa CAR-2026-001"),
                        archivoFacturaEmitida: demoPdf("F001-000482_natures_pride.pdf", "Factura Electronica F001-000482"),
                        observaciones: "Facturación por lote exportable recibido en Planta Paita.",
                        cobros: [
                            {
                                id: "col-1",
                                fecha: "2026-10-25",
                                importe: 20000,
                                medio: "Transferencia",
                                referencia: "SWIFT-INGBNL2A-98412",
                                evidencia: demoPdf("swift_adelanto_20000usd.pdf", "Voucher SWIFT Adelanto 20000 USD"),
                                observaciones: "Primer abono 55% contra embarque.",
                            },
                        ],
                    },
                ],
            },
            {
                id: "bload-2",
                codigo: "CAR-2026-005",
                fechaRecepcion: "2026-10-26",
                kilosCargados: 20400,
                kilosRecibidos: 20100,
                precioVentaKg: 1.85,
                moneda: "USD",
                reporteRecepcion: demoPdf("reporte_recepcion_CAR-2026-005.pdf", "Reporte Recepcion CAR-2026-005"),
                respaldoLogisticoCompleto: true,
                facturas: [
                    {
                        id: "inv-102",
                        referenciaPreparacion: "PREP-2026-002",
                        numeroFacturaElectronica: "",
                        estado: "Preparación pendiente",
                        fechaPreparacion: "2026-10-26",
                        fechaEmision: "",
                        fechaVencimiento: "2026-11-20",
                        kilosFacturados: 20100,
                        precioUnitario: 1.85,
                        descuento: 0,
                        cargos: 115,
                        total: 37300,
                        moneda: "USD",
                        archivoPreparacion: demoPdf("borrador_preparacion_002.pdf", "Borrador Preparacion Factura 002"),
                        archivoFacturaEmitida: null,
                        observaciones: "Lista para emisión electrónica SUNAT.",
                        cobros: [],
                    },
                ],
            },
        ],
    },
    {
        id: "cli-bill-2",
        campaniaId: 1,
        campaniaNombre: "Campaña Mango Kent 2026",
        fruta: "Mango",
        estadoCampania: "En ejecución",
        nombreEmpresa: "Agroindustrias del Chira S.A.",
        ruc: "20526198412",
        canal: "Industria",
        pais: "Perú",
        contacto: "Ing. Fernando Palacios",
        correo: "compras@agrochira.com.pe",
        moneda: "PEN",
        kilosContratados: 45000,
        precioPorKg: 2.4,
        cargas: [
            {
                id: "bload-3",
                codigo: "CAR-2026-002",
                fechaRecepcion: "2026-10-26",
                kilosCargados: 14800,
                kilosRecibidos: 14750,
                precioVentaKg: 2.4,
                moneda: "PEN",
                reporteRecepcion: demoPdf("ticket_recepcion_chira_002.pdf", "Ticket Recepcion Chira 002"),
                respaldoLogisticoCompleto: false,
                facturas: [],
            },
        ],
    },
    {
        id: "cli-bill-3",
        campaniaId: 2,
        campaniaNombre: "Campaña Palta Hass 2026",
        fruta: "Palta",
        estadoCampania: "En ejecución",
        nombreEmpresa: "Westfalia Fruit International",
        ruc: "GB641908214",
        canal: "Exportación",
        pais: "Reino Unido",
        contacto: "Oliver Stonehouse",
        correo: "procurement@westfaliafruit.com",
        moneda: "USD",
        kilosContratados: 80000,
        precioPorKg: 2.35,
        cargas: [
            {
                id: "bload-4",
                codigo: "CAR-2026-003",
                fechaRecepcion: "2026-10-24",
                kilosCargados: 21850,
                kilosRecibidos: 21680,
                precioVentaKg: 2.35,
                moneda: "USD",
                reporteRecepcion: demoPdf("reporte_planta_CAR-2026-003.pdf", "Reporte Planta CAR-2026-003"),
                respaldoLogisticoCompleto: true,
                facturas: [
                    {
                        id: "inv-103",
                        referenciaPreparacion: "PREP-2026-003",
                        numeroFacturaElectronica: "F001-000475",
                        estado: "Cobrado",
                        fechaPreparacion: "2026-10-24",
                        fechaEmision: "2026-10-24",
                        fechaVencimiento: "2026-11-10",
                        kilosFacturados: 21680,
                        precioUnitario: 2.35,
                        descuento: 0,
                        cargos: 0,
                        total: 50948,
                        moneda: "USD",
                        archivoPreparacion: demoPdf("prep_palta_hass_003.pdf", "Preparacion Palta Hass 003"),
                        archivoFacturaEmitida: demoPdf("F001-000475_westfalia.pdf", "Factura Electronica F001-000475"),
                        observaciones: "Cancelada en su totalidad mediante transferencia internacional.",
                        cobros: [
                            {
                                id: "col-2",
                                fecha: "2026-10-25",
                                importe: 50948,
                                medio: "Transferencia",
                                referencia: "SWIFT-BARCGB22-77419",
                                evidencia: demoPdf("voucher_westfalia_50948usd.pdf", "Voucher Westfalia 50948 USD"),
                                observaciones: "Pago al 100% verificado por tesorería.",
                            },
                        ],
                    },
                ],
            },
        ],
    },
];
