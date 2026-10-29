import { usesV1 } from '@/shared/api/data-contract';
import { campaignCommands } from '@/modules/campaigns/api/campaign-commands.api';
import { useSyncExternalStore } from "react";
import type { CampaignContractDeliveryLocal, CampaignContractDeliveryValues, DeliveryCoordination } from "@/modules/campaigns/campaignContractDelivery.utils";

/** V1: remote commands and server projections. Legacy: local compatibility state, initially empty. */
let records: Record<string, CampaignContractDeliveryLocal[]> = {};
let nextId = 1;
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
    if (usesV1()) return campaignCommands.coordinate(campaniaId, deliveryId, coordination);
    const key = keyOf(campaniaId, relationId, contractId);
    records = { ...records, [key]: (records[key] ?? EMPTY).map((item) => item.id === deliveryId ? { ...item, coordinacion: coordination } : item) };
    emit();
}

export function addCampaignContractDelivery(campaniaId: number, relationId: number, contractId: number, values: CampaignContractDeliveryValues) {
    if (usesV1()) return campaignCommands.delivery(campaniaId, contractId, values);
    const key = keyOf(campaniaId, relationId, contractId);
    const delivery: CampaignContractDeliveryLocal = {
        id: nextId++,
        fecha: values.fecha,
        kilosProgramados: Number(values.kilosProgramados),
        destino: values.destino.trim(),
        observaciones: values.observaciones.trim(),
        variedad: values.variedad || "Kent",
        coordinacion: null,
    };
    records = { ...records, [key]: [delivery, ...(records[key] ?? EMPTY)] };
    emit();
}

export function updateCampaignContractDelivery(campaniaId: number, relationId: number, contractId: number, deliveryId: number, values: CampaignContractDeliveryValues) {
    if (usesV1()) return campaignCommands.delivery(campaniaId, contractId, values, deliveryId);
    const key = keyOf(campaniaId, relationId, contractId);
    records = { ...records, [key]: (records[key] ?? EMPTY).map((item) => item.id === deliveryId ? {
        ...item,
        fecha: values.fecha,
        kilosProgramados: Number(values.kilosProgramados),
        destino: values.destino.trim(),
        observaciones: values.observaciones.trim(),
        variedad: values.variedad || item.variedad || "Kent",
    } : item) };
    emit();
}

export function deleteCampaignContractDelivery(campaniaId: number, relationId: number, contractId: number, deliveryId: number) {
    if (usesV1()) return campaignCommands.deleteDelivery(contractId, deliveryId);
    const key = keyOf(campaniaId, relationId, contractId);
    records = { ...records, [key]: (records[key] ?? EMPTY).filter((item) => item.id !== deliveryId) };
    emit();
}

export function hydrateCampaignDeliveries(value: Record<string, CampaignContractDeliveryLocal[]>) { records = value; emit(); }
