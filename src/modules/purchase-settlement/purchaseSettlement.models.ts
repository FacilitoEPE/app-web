import type { FileSource } from "@/shared/utils/fileSource";
export let UIT_VALOR_2026 = 0;
export let UIT_LIMITE_UNIDADES = 0;
export let UIT_LIMITE_SOLES = 0;
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
    acumuladosPorAnio?: Record<string, number>;
}
export interface SettlementProviderEntry {
    moneda?: string;
    kilosReconocidos?: number;
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
    moneda?: string;
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
export function setUitParameters(value: number, limit: number) { UIT_VALOR_2026 = value; UIT_LIMITE_UNIDADES = limit; UIT_LIMITE_SOLES = value * limit; }
