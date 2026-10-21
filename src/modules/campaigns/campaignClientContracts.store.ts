import { useSyncExternalStore } from "react";
import { format } from "date-fns";
import type { CampaignClientContractLocal, CampaignClientContractValues } from "@/modules/campaigns/campaignClientContract.utils";
import { createDemoContracts } from "@/modules/campaigns/campaignClientContracts.demo";

/**
 * TODO(api): reemplazar este almacén en memoria por el servicio de contratos cliente-campaña.
 *
 * En desarrollo arranca con datos de demostración (`campaignClientContracts.demo.ts`); en producción y en las
 * pruebas arranca vacío, sin simular respuestas del backend.
 */
const demo = import.meta.env.DEV && import.meta.env.MODE !== "test" ? createDemoContracts() : null;
let records: Record<string, CampaignClientContractLocal[]> = demo?.records ?? {};
let nextId = demo?.nextId ?? 1;
const listeners = new Set<() => void>();
const EMPTY: CampaignClientContractLocal[] = [];

const keyOf = (campaniaId: number, clienteNegocioCampanaId: number) => `${campaniaId}:${clienteNegocioCampanaId}`;
const emit = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => { listeners.add(listener); return () => listeners.delete(listener); };

export function useCampaignClientContracts(campaniaId: number, clienteNegocioCampanaId: number) {
    const key = keyOf(campaniaId, clienteNegocioCampanaId);
    return useSyncExternalStore(subscribe, () => records[key] ?? EMPTY);
}

/** Todos los contratos del almacén (`campaña:vínculo` → contratos), para las vistas que cruzan clientes de una campaña. */
export function useCampaignContractRecords() {
    return useSyncExternalStore(subscribe, () => records);
}

export function addCampaignClientContract(campaniaId: number, clienteNegocioCampanaId: number, values: CampaignClientContractValues, archivo: File) {
    const key = keyOf(campaniaId, clienteNegocioCampanaId);
    const contract: CampaignClientContractLocal = {
        id: nextId++,
        fechaRegistro: format(new Date(), "yyyy-MM-dd"),
        precioKg: Number(values.precioKg),
        moneda: values.moneda,
        cantidadPropuestaKg: Number(values.cantidadPropuestaKg),
        condicionesPago: values.condicionesPago.trim(),
        condicionesEntrega: values.condicionesEntrega.trim(),
        observaciones: values.observaciones.trim(),
        archivo,
    };
    records = { ...records, [key]: [contract, ...(records[key] ?? EMPTY)] };
    emit();
}

export function updateCampaignClientContract(campaniaId: number, clienteNegocioCampanaId: number, contractId: number, values: CampaignClientContractValues, archivo: File | null) {
    const key = keyOf(campaniaId, clienteNegocioCampanaId);
    records = { ...records, [key]: (records[key] ?? EMPTY).map((item) => item.id === contractId ? {
        ...item,
        precioKg: Number(values.precioKg),
        moneda: values.moneda,
        cantidadPropuestaKg: Number(values.cantidadPropuestaKg),
        condicionesPago: values.condicionesPago.trim(),
        condicionesEntrega: values.condicionesEntrega.trim(),
        observaciones: values.observaciones.trim(),
        archivo: archivo ?? item.archivo,
    } : item) };
    emit();
}

export function deleteCampaignClientContract(campaniaId: number, clienteNegocioCampanaId: number, contractId: number) {
    const key = keyOf(campaniaId, clienteNegocioCampanaId);
    records = { ...records, [key]: (records[key] ?? EMPTY).filter((item) => item.id !== contractId) };
    emit();
}

