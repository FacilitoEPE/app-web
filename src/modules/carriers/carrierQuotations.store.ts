import { usesV1 } from '@/shared/api/data-contract';
import { quotationCommands } from '@/modules/carriers/api/quotation-commands.api';
import { useSyncExternalStore } from "react";
import type { FileSource } from "@/shared/utils/fileSource";

export type CarrierQuotationStatus = "En espera" | "Recibida";

export interface CarrierRequirementQuotation {
    id: string;
    requestId: number;
    codigo: string;
    carrierId: number;
    transportistaNombre: string;
    transportistaRuc: string;
    campaniaId: number;
    campaniaNombre: string;
    fruta: string;
    descripcion: string;
    cantidadEstimada: string;
    fechaRecojo: string;
    fechaLimiteCotizacion: string;
    lugarRecojo: string;
    destino: string;
    observaciones: string;
    estado: CarrierQuotationStatus;
    montoCotizadoPen: number | null;
    moneda?: "PEN" | "USD";
    documentoRequerimiento: FileSource | null;
    documentoCotizacion: FileSource | null;
    vehiculoAsignadoPlaca: string;
    choferAsignadoNombre: string;
    choferAsignadoLicencia: string;
}

let quotations: CarrierRequirementQuotation[] = [];
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
        moneda?: "PEN" | "USD";
        documentoCotizacion: FileSource | null;
        observaciones: string;
    },
) {
    if (usesV1()) return quotationCommands.respond(id, payload);
    quotations = quotations.map((item) =>
        item.id === id
            ? {
                  ...item,
                  estado: payload.estado,
                  montoCotizadoPen: payload.montoCotizadoPen,
                  moneda: payload.moneda ?? item.moneda ?? "PEN",
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
    if (usesV1()) return quotationCommands.assign();
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

export function hydrateCarrierQuotations(value: CarrierRequirementQuotation[]) { quotations = value; emit(); }
