import { useSyncExternalStore } from 'react';
import { logisticsCommands } from '@/modules/logistics/api/logistics-commands.api';
import type { LogisticsLoad } from '@/modules/logistics/logistics.models';

let loads: LogisticsLoad[] = [];
const listeners = new Set<() => void>();

export function useLogisticsLoads(): LogisticsLoad[] {
    return useSyncExternalStore(
        listener => {
            listeners.add(listener);
            return () => { listeners.delete(listener); };
        },
        () => loads,
    );
}

export const saveLogisticsPurchaseObservation = logisticsCommands.purchaseObservation;
export const shareLogisticsPurchases = logisticsCommands.sharePurchases;
export const saveLogisticsArrival = logisticsCommands.arrival;
export const saveLogisticsUnloading = logisticsCommands.unloading;
export const saveLogisticsEvaluation = logisticsCommands.evaluation;
export const saveLogisticsDiscard = logisticsCommands.discard;
export const saveLogisticsCrateReturn = logisticsCommands.crateReturn;
export const saveLogisticsDocuments = logisticsCommands.documents;
export const closeLogisticsPhysical = logisticsCommands.physicalClose;
export const closeLogisticsAdministrative = logisticsCommands.administrativeClose;

export function hydrateLogisticsData(value: LogisticsLoad[]) {
    loads = value;
    for (const listener of listeners) listener();
}
