import { useSyncExternalStore } from 'react';
import { getAuthToken } from '@/shared/offline/session';
import type { VarietyQuantity } from '@/modules/campaigns/campaignVarietyQuantities.utils';

interface VarietyPreview {
    total: number;
    varieties: VarietyQuantity[];
}
interface PreviewState {
    contracts: Record<number, VarietyPreview>;
    deliveries: Record<string, VarietyPreview>;
}

// TODO(api): simulación visual autorizada; no se envía al backend ni se persiste en el navegador.
const EMPTY: PreviewState = { contracts: {}, deliveries: {} };
let state = EMPTY;
let ownerToken: string | undefined;
const listeners = new Set<() => void>();
export const getVarietyPreviews = () => ownerToken === getAuthToken() ? state : EMPTY;
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export const useVarietyPreviews = () => useSyncExternalStore(subscribe, getVarietyPreviews);

function publish(next: PreviewState) {
    state = next;
    ownerToken = getAuthToken();
    listeners.forEach(listener => listener());
}

export function saveContractVarietyPreview(id: number, total: number, varieties: VarietyQuantity[]) {
    const current = getVarietyPreviews();
    publish({ ...current, contracts: { ...current.contracts, [id]: { total, varieties: varieties.map(row => ({ ...row })) } } });
}

export const deliveryPreviewKey = (contractId: number, deliveryId: number) => `${contractId}:${deliveryId}`;
export function saveDeliveryVarietyPreview(contractId: number, deliveryId: number, total: number, varieties: VarietyQuantity[]) {
    const current = getVarietyPreviews();
    publish({ ...current, deliveries: { ...current.deliveries, [deliveryPreviewKey(contractId, deliveryId)]: { total, varieties: varieties.map(row => ({ ...row })) } } });
}

/** Un cambio del total remoto invalida la simulación anterior en lugar de atribuir kilos arbitrarios. */
export function matchingVarietyPreview(preview: VarietyPreview | undefined, total: number): VarietyQuantity[] {
    return preview && Math.round(preview.total * 1000) === Math.round(total * 1000) ? preview.varieties : [];
}

export function resetVarietyPreviews() { publish(EMPTY); }
