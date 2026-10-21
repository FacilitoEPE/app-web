import { useSyncExternalStore } from "react";
import type { CampaignContractDeliveryLocal, CampaignContractDeliveryValues, DeliveryCoordination } from "@/modules/campaigns/campaignContractDelivery.utils";
import { createDemoDeliveries } from "@/modules/campaigns/campaignClientContracts.demo";

/**
 * TODO(api): reemplazar este almacén en memoria por el servicio de entregas por contrato.
 *
 * En desarrollo arranca con datos de demostración (`campaignClientContracts.demo.ts`); en producción y en las
 * pruebas arranca vacío.
 */
const demo = import.meta.env.DEV && import.meta.env.MODE !== "test" ? createDemoDeliveries() : null;
let records: Record<string, CampaignContractDeliveryLocal[]> = demo?.records ?? {};
let nextId = demo?.nextId ?? 1;
const listeners = new Set<() => void>();
const EMPTY: CampaignContractDeliveryLocal[] = [];

const keyOf = (campaniaId: number, relationId: number, contractId: number) => `${campaniaId}:${relationId}:${contractId}`;
const emit = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => { listeners.add(listener); return () => listeners.delete(listener); };

export function useCampaignContractDeliveries(campaniaId: number, relationId: number, contractId: number) {
    const key = keyOf(campaniaId, relationId, contractId);
    return useSyncExternalStore(subscribe, () => records[key] ?? EMPTY);
}

/** Todas las entregas del almacén (`campaña:vínculo:contrato` → entregas); la lista de la campaña la arma `listCampaignDeliveries`. */
export function useCampaignDeliveryRecords() {
    return useSyncExternalStore(subscribe, () => records);
}

/** Guarda la coordinación de una entrega; si ya tenía una, la reemplaza. */
export function saveCampaignDeliveryCoordination(campaniaId: number, relationId: number, contractId: number, deliveryId: number, coordination: DeliveryCoordination) {
    const key = keyOf(campaniaId, relationId, contractId);
    records = { ...records, [key]: (records[key] ?? EMPTY).map((item) => item.id === deliveryId ? { ...item, coordinacion: coordination } : item) };
    emit();
}

export function addCampaignContractDelivery(campaniaId: number, relationId: number, contractId: number, values: CampaignContractDeliveryValues) {
    const key = keyOf(campaniaId, relationId, contractId);
    const delivery: CampaignContractDeliveryLocal = {
        id: nextId++,
        fecha: values.fecha,
        kilosProgramados: Number(values.kilosProgramados),
        destino: values.destino.trim(),
        observaciones: values.observaciones.trim(),
        coordinacion: null,
    };
    records = { ...records, [key]: [delivery, ...(records[key] ?? EMPTY)] };
    emit();
}

export function updateCampaignContractDelivery(campaniaId: number, relationId: number, contractId: number, deliveryId: number, values: CampaignContractDeliveryValues) {
    const key = keyOf(campaniaId, relationId, contractId);
    records = { ...records, [key]: (records[key] ?? EMPTY).map((item) => item.id === deliveryId ? {
        ...item,
        fecha: values.fecha,
        kilosProgramados: Number(values.kilosProgramados),
        destino: values.destino.trim(),
        observaciones: values.observaciones.trim(),
    } : item) };
    emit();
}

export function deleteCampaignContractDelivery(campaniaId: number, relationId: number, contractId: number, deliveryId: number) {
    const key = keyOf(campaniaId, relationId, contractId);
    records = { ...records, [key]: (records[key] ?? EMPTY).filter((item) => item.id !== deliveryId) };
    emit();
}

