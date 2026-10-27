import { demoPdf } from "@/shared/utils/demoData";
import type { FileSource } from "@/shared/utils/fileSource";

export const UIT_VALOR_2026 = 5350;
export const UIT_LIMITE_UNIDADES = 75;
export const UIT_LIMITE_SOLES = UIT_VALOR_2026 * UIT_LIMITE_UNIDADES; // S/ 401,250

export type SettlementStatus = "Por liquidar" | "Por pagar" | "Pagado";

export interface SettlementPaymentItem {
    id: string;
    fecha: string;
    importe: number;
    modo: "Caja" | "Adelanto";
    medio: "Transferencia" | "Depósito" | "Efectivo" | "Aplicación de adelanto";
    referencia: string;
    evidencia: FileSource | null;
    observaciones: string;
}

export interface SettlementLinkedPerson {
    id: string;
    nombres: string;
    apellidos: string;
    tipoDocumento: "DNI" | "CE" | "RUC";
    numeroDocumento: string;
    vinculo: string;
    acumuladoAnualPen: number;
}

export interface SettlementProviderEntry {
    id: string;
    proveedorId: string;
    proveedorNombre: string;
    documento: string;
    fincaNombre: string;
    variedad: string;
    kilosCargados: number;
    precioKg: number;
    total: number;
    estado: SettlementStatus;
    numeroLiquidacion: string;
    fechaLiquidacion: string;
    personaLiquidadaId: string;
    personaLiquidadaNombre: string;
    personaLiquidadaDocumento: string;
    personaLiquidadaVinculo: string;
    confirmacionExcesoUit: boolean;
    archivoLiquidacion: FileSource | null;
    observaciones: string;
    personasVinculadas: SettlementLinkedPerson[];
    pagos: SettlementPaymentItem[];
}

export interface CarrierRealExpense {
    id: string;
    concepto: string;
    monto: number;
}

export interface CarrierAdvanceItem {
    id: string;
    referencia: string;
    fecha: string;
    montoOriginal: number;
    saldoDisponible: number;
}

export interface SettlementCarrierEntry {
    id: string;
    transportista: string;
    ruc: string;
    placa: string;
    chofer: string;
    licencia: string;
    estado: SettlementStatus;
    numeroLiquidacion: string;
    fechaLiquidacion: string;
    fleteCarga: number;
    viaticosMovilidad: number;
    viaticosInsumos: number;
    gastosReales: CarrierRealExpense[];
    totalContratadoCampania: number;
    adelantosDisponibles: CarrierAdvanceItem[];
    archivoLiquidacion: FileSource | null;
    observaciones: string;
    pagos: SettlementPaymentItem[];
}

export interface SettlementLoad {
    id: string;
    codigo: string;
    campaniaId: number;
    campaniaNombre: string;
    fruta: string;
    estadoCampania: string;
    cliente: string;
    fechaCarga: string;
    kilosCargados: number;
    proveedores: SettlementProviderEntry[];
    transporte: SettlementCarrierEntry;
}

export const DEMO_SETTLEMENT_LOADS: SettlementLoad[] = [
    {
        id: "sload-1",
        codigo: "CAR-2026-001",
        campaniaId: 1,
        campaniaNombre: "Campaña Mango Kent 2026",
        fruta: "Mango",
        estadoCampania: "En ejecución",
        cliente: "Nature's Pride B.V.",
        fechaCarga: "2026-10-25",
        kilosCargados: 19800,
        proveedores: [
            {
                id: "sprov-1",
                proveedorId: "prov-1",
                proveedorNombre: "Segundo Teodoro Juárez Zeta",
                documento: "02849102",
                fincaNombre: "Fundo San Isidro",
                variedad: "Kent",
                kilosCargados: 12400,
                precioKg: 3.2,
                total: 39680,
                estado: "Por pagar",
                numeroLiquidacion: "E001-000184",
                fechaLiquidacion: "2026-10-25",
                personaLiquidadaId: "pers-1",
                personaLiquidadaNombre: "Segundo Teodoro Juárez Zeta",
                personaLiquidadaDocumento: "02849102",
                personaLiquidadaVinculo: "Titular productor",
                confirmacionExcesoUit: false,
                archivoLiquidacion: demoPdf("liq_compra_E001_000184.pdf", "Liquidacion de Compra E001-000184"),
                observaciones: "Liquidación electrónica SUNAT emitida conforme a pesaje de campo.",
                personasVinculadas: [
                    {
                        id: "pers-1",
                        nombres: "Segundo Teodoro",
                        apellidos: "Juárez Zeta",
                        tipoDocumento: "DNI",
                        numeroDocumento: "02849102",
                        vinculo: "Titular productor",
                        acumuladoAnualPen: 348500,
                    },
                    {
                        id: "pers-2",
                        nombres: "Rosa Amelia",
                        apellidos: "Zeta de Juárez",
                        tipoDocumento: "DNI",
                        numeroDocumento: "02851940",
                        vinculo: "Cónyuge / Copropietaria",
                        acumuladoAnualPen: 112000,
                    },
                ],
                pagos: [
                    {
                        id: "spay-1",
                        fecha: "2026-10-25",
                        importe: 20000,
                        modo: "Caja",
                        medio: "Transferencia",
                        referencia: "BCP-OP-884120",
                        evidencia: demoPdf("voucher_bcp_juarez_20000.pdf", "Voucher BCP Juarez 20000 PEN"),
                        observaciones: "Adelanto del 50% de liquidación.",
                    },
                ],
            },
            {
                id: "sprov-2",
                proveedorId: "prov-2",
                proveedorNombre: "María Elena Chiroque Bereche",
                documento: "03641892",
                fincaNombre: "Parcela Santa Elena",
                variedad: "Kent",
                kilosCargados: 7400,
                precioKg: 3.15,
                total: 23310,
                estado: "Por liquidar",
                numeroLiquidacion: "",
                fechaLiquidacion: "2026-10-25",
                personaLiquidadaId: "pers-3",
                personaLiquidadaNombre: "María Elena Chiroque Bereche",
                personaLiquidadaDocumento: "03641892",
                personaLiquidadaVinculo: "Titular productor",
                confirmacionExcesoUit: false,
                archivoLiquidacion: null,
                observaciones: "",
                personasVinculadas: [
                    {
                        id: "pers-3",
                        nombres: "María Elena",
                        apellidos: "Chiroque Bereche",
                        tipoDocumento: "DNI",
                        numeroDocumento: "03641892",
                        vinculo: "Titular productor",
                        acumuladoAnualPen: 185400,
                    },
                ],
                pagos: [],
            },
        ],
        transporte: {
            id: "scarr-1",
            transportista: "Transportes Frigoríficos del Norte S.A.C.",
            ruc: "20529841023",
            placa: "B8T-914",
            chofer: "Carlos Alberto Mendoza Ríos",
            licencia: "Q43892104",
            estado: "Por pagar",
            numeroLiquidacion: "LQT-2026-0041",
            fechaLiquidacion: "2026-10-25",
            fleteCarga: 3800,
            viaticosMovilidad: 380,
            viaticosInsumos: 140,
            gastosReales: [
                { id: "exp-1", concepto: "Peajes ruta Tambogrande - Paita", monto: 185 },
                { id: "exp-2", concepto: "Combustible grupo electrógeno Reefer", monto: 340 },
            ],
            totalContratadoCampania: 32000,
            adelantosDisponibles: [
                {
                    id: "adv-1",
                    referencia: "BOL-ADEL-2026-01 (Inicio de campaña)",
                    fecha: "2026-10-10",
                    montoOriginal: 5000,
                    saldoDisponible: 2400,
                },
            ],
            archivoLiquidacion: demoPdf("liq_transporte_B8T914_001.pdf", "Liquidacion Transporte B8T-914"),
            observaciones: "Incluye gastos reales sustentados con tickets de peaje.",
            pagos: [
                {
                    id: "spay-2",
                    fecha: "2026-10-25",
                    importe: 1500,
                    modo: "Adelanto",
                    medio: "Aplicación de adelanto",
                    referencia: "BOL-ADEL-2026-01",
                    evidencia: demoPdf("boleta_adelanto_transporte_01.pdf", "Boleta Adelanto Transporte 01"),
                    observaciones: "Descuento parcial del adelanto de campaña.",
                },
            ],
        },
    },
    {
        id: "sload-2",
        codigo: "CAR-2026-003",
        campaniaId: 2,
        campaniaNombre: "Campaña Palta Hass 2026",
        fruta: "Palta",
        estadoCampania: "En ejecución",
        cliente: "Westfalia Fruit International",
        fechaCarga: "2026-10-24",
        kilosCargados: 21850,
        proveedores: [
            {
                id: "sprov-3",
                proveedorId: "prov-4",
                proveedorNombre: "Agrícola San Pedro de Olmos S.A.C.",
                documento: "04129874",
                fincaNombre: "Fundo Tierra Verde",
                variedad: "Hass",
                kilosCargados: 21850,
                precioKg: 4.1,
                total: 89585,
                estado: "Pagado",
                numeroLiquidacion: "E001-000179",
                fechaLiquidacion: "2026-10-24",
                personaLiquidadaId: "pers-4",
                personaLiquidadaNombre: "Pedro Pablo Santisteban Mío",
                personaLiquidadaDocumento: "04129874",
                personaLiquidadaVinculo: "Titular productor",
                confirmacionExcesoUit: true,
                archivoLiquidacion: demoPdf("liq_compra_E001_000179.pdf", "Liquidacion de Compra E001-000179"),
                observaciones: "Liquidación cancelada al 100%.",
                personasVinculadas: [
                    {
                        id: "pers-4",
                        nombres: "Pedro Pablo",
                        apellidos: "Santisteban Mío",
                        tipoDocumento: "DNI",
                        numeroDocumento: "04129874",
                        vinculo: "Titular productor",
                        acumuladoAnualPen: 392000,
                    },
                ],
                pagos: [
                    {
                        id: "spay-3",
                        fecha: "2026-10-25",
                        importe: 89585,
                        modo: "Caja",
                        medio: "Transferencia",
                        referencia: "BBVA-OP-551920",
                        evidencia: demoPdf("voucher_bbva_olmos_89585.pdf", "Voucher BBVA Olmos 89585 PEN"),
                        observaciones: "Cancelación total de liquidación E001-000179.",
                    },
                ],
            },
        ],
        transporte: {
            id: "scarr-2",
            transportista: "Logística Agroandina Perú E.I.R.L.",
            ruc: "20601928374",
            placa: "C4M-782",
            chofer: "Miguel Ángel Quispe Huamán",
            licencia: "Q41209876",
            estado: "Pagado",
            numeroLiquidacion: "LQT-2026-0038",
            fechaLiquidacion: "2026-10-24",
            fleteCarga: 4200,
            viaticosMovilidad: 420,
            viaticosInsumos: 160,
            gastosReales: [
                { id: "exp-3", concepto: "Peajes Olmos - Chiclayo", monto: 210 },
            ],
            totalContratadoCampania: 28000,
            adelantosDisponibles: [],
            archivoLiquidacion: demoPdf("liq_transporte_C4M782.pdf", "Liquidacion Transporte C4M-782"),
            observaciones: "Servicio de flete refrigerado pagado en su totalidad.",
            pagos: [
                {
                    id: "spay-4",
                    fecha: "2026-10-25",
                    importe: 4410,
                    modo: "Caja",
                    medio: "Transferencia",
                    referencia: "BCP-OP-910248",
                    evidencia: demoPdf("voucher_agroandina_4410.pdf", "Voucher Agroandina 4410 PEN"),
                    observaciones: "Pago de flete + gastos reales.",
                },
            ],
        },
    },
];
