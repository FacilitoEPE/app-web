import type { FileSource } from "@/shared/utils/fileSource";
export type BillingCurrency = "USD" | "PEN" | "EUR";
export type BillingInvoiceStatus = "Preparación pendiente" | "Emitida" | "Cobrado parcial" | "Cobrado" | "Vencido";
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
    requirementId: string;
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
    requirementIds: string[];
    campaniaId: number;
    campaniaNombre: string;
    fruta: string;
    estadoCampania: string;
    nombreEmpresa: string;
    ruc: string;
    canal: "Exportación" | "Industria";
    pais: string;
    contacto: string;
    telefono: string;
    correo: string;
    moneda: BillingCurrency;
    kilosContratados: number;
    contratosCount: number;
    precioPorKg: number;
    importesContratados: { moneda: string; importe: number }[];
    cargas: BillingLoad[];
}
