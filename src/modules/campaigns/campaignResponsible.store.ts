import { useSyncExternalStore } from "react";

// TODO(api): el nombre libre solo existe en la sesión actual hasta que el contrato de campaña lo admita.
const names = new Map<number, string>();
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
}

export function useTemporaryCampaignResponsible(campaignId: number | null) {
    return useSyncExternalStore(subscribe, () => campaignId === null ? undefined : names.get(campaignId));
}

export function setTemporaryCampaignResponsible(campaignId: number, value: string) {
    const name = value.trim();
    if (!name) return;
    names.set(campaignId, name);
    listeners.forEach(listener => listener());
}

export function clearTemporaryCampaignResponsibles() {
    names.clear();
    listeners.forEach(listener => listener());
}
