import { useSyncExternalStore } from "react";
import { format } from "date-fns";
import {
    toAgreement,
    type AgreementFormValues,
    type CampaignCarrierLink,
} from "@/modules/campaigns/campaignCarrier.utils";
import { createDemoCampaignCarriers } from "@/modules/campaigns/campaignCarriers.demo";

/**
 * Transportistas vinculados a cada campaña, en memoria: el vínculo con su cotización y su acuerdo de pago. Los datos
 * del transportista no se guardan acá, se leen de Gestión de Transporte por `carrierId`.
 *
 * TODO(api): se pierden al recargar la página. Cuando exista el servicio de transportistas por campaña, este es el
 * único archivo a reemplazar: las funciones de abajo pasan a llamar a la API y `useCampaignCarriers` a leer lo que
 * ella devuelva.
 *
 * En desarrollo arranca con datos de demostración (`campaignCarriers.demo.ts`); en producción y en las pruebas
 * arranca vacío, sin simular respuestas del backend.
 */
const demo = import.meta.env.DEV && import.meta.env.MODE !== "test" ? createDemoCampaignCarriers() : null;
let byCampaign: Record<number, CampaignCarrierLink[]> = demo?.records ?? {};
let nextId = demo?.nextId ?? 1;
const listeners = new Set<() => void>();
const EMPTY: CampaignCarrierLink[] = [];

function update(next: Record<number, CampaignCarrierLink[]>) {
    byCampaign = next;
    listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

export function useCampaignCarriers(campaniaId: number): CampaignCarrierLink[] {
    return useSyncExternalStore(subscribe, () => byCampaign[campaniaId] ?? EMPTY);
}

export function getCampaignCarriers(campaniaId: number): CampaignCarrierLink[] {
    return byCampaign[campaniaId] ?? EMPTY;
}

const patch = (campaniaId: number, linkId: number, change: (link: CampaignCarrierLink) => CampaignCarrierLink) =>
    update({ ...byCampaign, [campaniaId]: (byCampaign[campaniaId] ?? EMPTY).map((link) => (link.id === linkId ? change(link) : link)) });

/** Vincula un transportista a la campaña con su cotización; el más reciente queda al final, como se fue vinculando. */
export function linkCampaignCarrier(campaniaId: number, carrierId: number, cotizacion: File) {
    const current = byCampaign[campaniaId] ?? EMPTY;
    if (current.some((link) => link.carrierId === carrierId)) return;
    const link: CampaignCarrierLink = { id: nextId++, carrierId, fechaVinculacion: format(new Date(), "yyyy-MM-dd"), cotizacion, acuerdo: null };
    update({ ...byCampaign, [campaniaId]: [...current, link] });
}

export function unlinkCampaignCarrier(campaniaId: number, linkId: number) {
    update({ ...byCampaign, [campaniaId]: (byCampaign[campaniaId] ?? EMPTY).filter((link) => link.id !== linkId) });
}

/** Registra o edita el acuerdo. Sin boleta nueva conserva la que ya tenía. */
export function saveCampaignCarrierAgreement(campaniaId: number, linkId: number, values: AgreementFormValues, boleta: File | null) {
    patch(campaniaId, linkId, (link) => ({ ...link, acuerdo: toAgreement(values, boleta ?? link.acuerdo?.boleta ?? null, false) }));
}

/** Marca el saldo de un acuerdo con adelanto como pagado: el acuerdo queda cerrado, solo de consulta. */
export function settleCampaignCarrierAgreement(campaniaId: number, linkId: number) {
    patch(campaniaId, linkId, (link) => (link.acuerdo?.tipo === "adelanto" ? { ...link, acuerdo: { ...link.acuerdo, saldoPagado: true } } : link));
}
