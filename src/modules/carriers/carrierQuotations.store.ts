import { useSyncExternalStore } from "react";
import { demoPdf } from "@/shared/utils/demoData";
import type { FileSource } from "@/shared/utils/fileSource";

export type CarrierQuotationStatus = "En espera" | "Recibida";

export interface CarrierRequirementQuotation {
    id: string;
    codigo: string;
    carrierId: number;
    transportistaNombre: string;
    transportistaRuc: string;
    campaniaId: number;
    campaniaNombre: string;
    fruta: string;
    descripcion: string;
    cantidadEstimadaKg: number;
    fechaRecojo: string;
    fechaLimiteCotizacion: string;
    lugarRecojo: string;
    destino: string;
    observaciones: string;
    estado: CarrierQuotationStatus;
    montoCotizadoPen: number | null;
    documentoRequerimiento: FileSource | null;
    documentoCotizacion: FileSource | null;
    vehiculoAsignadoPlaca: string;
    choferAsignadoNombre: string;
    choferAsignadoLicencia: string;
}

const INITIAL_QUOTATIONS: CarrierRequirementQuotation[] = [
    {
        id: "req-1",
        codigo: "REQ-TR-2026-001",
        carrierId: 1,
        transportistaNombre: "Transportes Frigoríficos del Norte S.A.C.",
        transportistaRuc: "20529841023",
        campaniaId: 1,
        campaniaNombre: "Campaña Mango Kent 2026",
        fruta: "Mango",
        descripcion: "Servicio de transporte refrigerado Reefer 10.5 °C para 3 viajes semanales desde Tambogrande hacia Planta Paita.",
        cantidadEstimadaKg: 60000,
        fechaRecojo: "2026-10-25",
        fechaLimiteCotizacion: "2026-10-20",
        lugarRecojo: "Tambogrande · Valle San Lorenzo, Piura",
        destino: "Planta Empacadora Paita · Zona Industrial II",
        observaciones: "Indispensable contar con termógrafo calibrado y rampa hidráulica.",
        estado: "Recibida",
        montoCotizadoPen: 3800,
        documentoRequerimiento: demoPdf("requerimiento_transporte_001.pdf", "Requerimiento Transporte 001"),
        documentoCotizacion: demoPdf("cotizacion_frigorificos_norte_001.pdf", "Cotizacion Frigorificos del Norte 001"),
        vehiculoAsignadoPlaca: "B8T-914",
        choferAsignadoNombre: "Carlos Alberto Mendoza Ríos",
        choferAsignadoLicencia: "Q43892104",
    },
    {
        id: "req-2",
        codigo: "REQ-TR-2026-002",
        carrierId: 2,
        transportistaNombre: "Logística Agroandina Perú E.I.R.L.",
        transportistaRuc: "20601928374",
        campaniaId: 1,
        campaniaNombre: "Campaña Mango Kent 2026",
        fruta: "Mango",
        descripcion: "Flete de fruta industrial en bines plásticos desde centro de acopio Marcavelica hacia Planta Sullana.",
        cantidadEstimadaKg: 45000,
        fechaRecojo: "2026-10-28",
        fechaLimiteCotizacion: "2026-10-24",
        lugarRecojo: "Marcavelica · Sullana, Piura",
        destino: "Planta Procesadora Sullana · Km 1028",
        observaciones: "Capacidad mínima 36 bines cosecheros por viaje.",
        estado: "En espera",
        montoCotizadoPen: null,
        documentoRequerimiento: demoPdf("requerimiento_transporte_002.pdf", "Requerimiento Transporte 002"),
        documentoCotizacion: null,
        vehiculoAsignadoPlaca: "",
        choferAsignadoNombre: "",
        choferAsignadoLicencia: "",
    },
    {
        id: "req-3",
        codigo: "REQ-TR-2026-003",
        carrierId: 3,
        transportistaNombre: "Rutas del Sol Refrigerados S.A.",
        transportistaRuc: "20548192011",
        campaniaId: 2,
        campaniaNombre: "Campaña Palta Hass 2026",
        fruta: "Palta",
        descripcion: "Traslado de Palta Hass de exportación desde irrigación Olmos hasta Packing Chiclayo.",
        cantidadEstimadaKg: 44000,
        fechaRecojo: "2026-10-24",
        fechaLimiteCotizacion: "2026-10-19",
        lugarRecojo: "Olmos · Lambayeque",
        destino: "Packing Agroexportador Chiclayo · Carretera Pimentel Km 6",
        observaciones: "Unidad con precinto de seguridad SENASA.",
        estado: "Recibida",
        montoCotizadoPen: 4200,
        documentoRequerimiento: demoPdf("requerimiento_transporte_003.pdf", "Requerimiento Transporte 003"),
        documentoCotizacion: demoPdf("cotizacion_rutas_del_sol_003.pdf", "Cotizacion Rutas del Sol 003"),
        vehiculoAsignadoPlaca: "C4M-782",
        choferAsignadoNombre: "Miguel Ángel Quispe Huamán",
        choferAsignadoLicencia: "Q41209876",
    },
];

let quotations: CarrierRequirementQuotation[] = INITIAL_QUOTATIONS;
const listeners = new Set<() => void>();

function emit() {
    listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export function useCarrierQuotations() {
    return useSyncExternalStore(subscribe, () => quotations);
}

export function registerQuotationResponse(
    id: string,
    payload: {
        estado: CarrierQuotationStatus;
        montoCotizadoPen: number | null;
        documentoCotizacion: FileSource | null;
        observaciones: string;
    },
) {
    quotations = quotations.map((item) =>
        item.id === id
            ? {
                  ...item,
                  estado: payload.estado,
                  montoCotizadoPen: payload.montoCotizadoPen,
                  documentoCotizacion: payload.documentoCotizacion,
                  observaciones: payload.observaciones,
              }
            : item,
    );
    emit();
}

export function assignQuotationUnit(
    id: string,
    payload: {
        vehiculoAsignadoPlaca: string;
        choferAsignadoNombre: string;
        choferAsignadoLicencia: string;
    },
) {
    quotations = quotations.map((item) =>
        item.id === id
            ? {
                  ...item,
                  vehiculoAsignadoPlaca: payload.vehiculoAsignadoPlaca,
                  choferAsignadoNombre: payload.choferAsignadoNombre,
                  choferAsignadoLicencia: payload.choferAsignadoLicencia,
              }
            : item,
    );
    emit();
}
