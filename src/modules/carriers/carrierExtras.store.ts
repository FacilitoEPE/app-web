import { useSyncExternalStore } from "react";
import type { CarrierExtras } from "@/modules/carriers/carrierProfile.utils";
import { createDemoCarrierExtras } from "@/modules/carriers/carrierExtras.demo";

/**
 * Datos del transportista que todavía no tienen campo en el backend: tipo (público o privado), MTC, CGN,
 * documento de identidad y ubicación.
 *
 * TODO(api): se guardan en memoria por id de transportista (se pierden al recargar la página) y viven acá, y no
 * en un componente, para que sobrevivan al navegar entre la lista y el detalle. Cuando el backend los modele,
 * `setCarrierExtras` y `removeCarrierExtras` desaparecen y `CarrierDto` / `CarrierInput` de `carrier.api.ts`
 * pasan a llevarlos. Los modelos y validaciones están en `carrierProfile.utils.ts`.
 *
 * En desarrollo arranca con datos de demostración (`carrierExtras.demo.ts`); en producción y en las pruebas
 * arranca vacío.
 */
let data: Record<number, CarrierExtras> = import.meta.env.DEV && import.meta.env.MODE !== "test" ? createDemoCarrierExtras() : {};
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
