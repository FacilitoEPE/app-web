import { usesV1 } from '@/shared/api/data-contract';
import { quotationCommands } from '@/modules/carriers/api/quotation-commands.api';
import { useSyncExternalStore } from "react";
import type { CarrierExtras } from "@/modules/carriers/carrierProfile.utils";

/** V1: remote commands and server projections. Legacy: local compatibility state, initially empty. */
let data: Record<number, CarrierExtras> = {};
const listeners = new Set<() => void>();

function update(next: Record<number, CarrierExtras>) {
    data = next;
    listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

/** Guarda (o reemplaza) los datos nuevos de un transportista. */
export function setCarrierExtras(carrierId: number, extras: CarrierExtras) {
    if (usesV1()) return quotationCommands.extras(carrierId, extras);
    update({ ...data, [carrierId]: extras });
}

/** Olvida los datos nuevos de un transportista eliminado. */
export function removeCarrierExtras(carrierId: number) {
    if (!(carrierId in data)) return;
    const next = { ...data };
    delete next[carrierId];
    update(next);
}

export function useCarrierExtras(): Record<number, CarrierExtras> {
    return useSyncExternalStore(subscribe, () => data);
}

export function hydrateCarrierExtras(value: Record<number, CarrierExtras>) { data = value; listeners.forEach(listener => listener()); }
