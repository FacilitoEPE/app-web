import { usesV1 } from '@/shared/api/data-contract';
import { campaignCommands } from '@/modules/campaigns/api/campaign-commands.api';
import { useSyncExternalStore } from "react";
import { format } from "date-fns";
import {
    toAgreement,
    type AgreementFormValues,
    type CampaignCarrierLink,
} from "@/modules/campaigns/campaignCarrier.utils";

/** V1: remote commands and server projections. Legacy: local compatibility state, initially empty. */
let byCampaign: Record<number, CampaignCarrierLink[]> = {};
let nextId = 1;
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
export function linkCampaignCarrier(campaniaId: number, carrierId: number, cotizacion: File | null) {
    if (usesV1()) return campaignCommands.linkCarrier(campaniaId, carrierId, cotizacion);
    const current = byCampaign[campaniaId] ?? EMPTY;
    if (current.some((link) => link.carrierId === carrierId)) return;
    const link: CampaignCarrierLink = { id: nextId++, carrierId, fechaVinculacion: format(new Date(), "yyyy-MM-dd"), cotizacion, acuerdo: null };
    update({ ...byCampaign, [campaniaId]: [...current, link] });
}

export function unlinkCampaignCarrier(campaniaId: number, linkId: number) {
    if (usesV1()) return campaignCommands.unlinkCarrier(campaniaId, linkId);
    update({ ...byCampaign, [campaniaId]: (byCampaign[campaniaId] ?? EMPTY).filter((link) => link.id !== linkId) });
}

/** Registra o edita el acuerdo. Sin boleta nueva conserva la que ya tenía. */
export function saveCampaignCarrierAgreement(campaniaId: number, linkId: number, values: AgreementFormValues, boleta: File | null) {
    if (usesV1()) return campaignCommands.agreement(campaniaId, linkId, values, boleta);
    patch(campaniaId, linkId, (link) => ({ ...link, acuerdo: toAgreement(values, boleta ?? link.acuerdo?.boleta ?? null, false) }));
}

/** Marca el saldo de un acuerdo con adelanto como pagado: el acuerdo queda cerrado, solo de consulta. */
export function settleCampaignCarrierAgreement(campaniaId: number, linkId: number, boleta: File | null = null) {
    if (usesV1()) return campaignCommands.settleAgreement();
    patch(campaniaId, linkId, (link) => (link.acuerdo?.tipo === "adelanto" ? { ...link, acuerdo: { ...link.acuerdo, saldoPagado: true, boleta: boleta ?? link.acuerdo.boleta } } : link));
}

export function hydrateCampaignCarriers(value: Record<number, CampaignCarrierLink[]>) { update(value); }
