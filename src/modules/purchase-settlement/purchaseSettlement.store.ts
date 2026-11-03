import { useSyncExternalStore } from 'react';
import { settlementCommands } from '@/modules/purchase-settlement/api/settlement-commands.api';
import type {
    CarrierRealExpense,
    SettlementLinkedPerson,
    SettlementLoad,
    SettlementPaymentItem,
} from '@/modules/purchase-settlement/purchaseSettlement.models';

interface SettlementState {
    loads: SettlementLoad[];
}

let state: SettlementState = { loads: [] };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(listener => listener());

export function usePurchaseSettlementState(): SettlementState {
    return useSyncExternalStore(
        listener => { listeners.add(listener); return () => listeners.delete(listener); },
        () => state,
    );
}

export const addProviderLinkedPerson = (
    loadId: string,
    providerEntryId: string,
    person: Omit<SettlementLinkedPerson, 'id' | 'acumuladoAnualPen'>,
) => settlementCommands.addPerson(loadId, providerEntryId, person);

export const saveProviderSettlement = (
    loadId: string,
    providerEntryId: string,
    payload: {
        numeroLiquidacion: string;
        fechaLiquidacion: string;
        precioKg: number;
        personaLiquidadaId: string;
        personaLiquidadaNombre: string;
        personaLiquidadaDocumento: string;
        personaLiquidadaVinculo: string;
        confirmacionExcesoUit: boolean;
        archivoLiquidacion: SettlementLoad['proveedores'][number]['archivoLiquidacion'];
        observaciones: string;
    },
) => settlementCommands.provider(loadId, providerEntryId, payload);

export const saveCarrierSettlement = (
    loadId: string,
    payload: {
        numeroLiquidacion: string;
        fechaLiquidacion: string;
        fleteCarga: number;
        gastosReales: CarrierRealExpense[];
        archivoLiquidacion: SettlementLoad['transporte']['archivoLiquidacion'];
        observaciones: string;
    },
) => settlementCommands.carrier(loadId, payload);

export const registerProviderPayment = (
    loadId: string,
    providerEntryId: string,
    payment: Omit<SettlementPaymentItem, 'id'>,
) => settlementCommands.providerPayment(loadId, providerEntryId, payment);

export const registerCarrierPayment = (
    loadId: string,
    payment: Omit<SettlementPaymentItem, 'id'>,
    advanceId?: string,
) => settlementCommands.carrierPayment(loadId, payment, advanceId);

export function hydrateSettlementData(value: SettlementLoad[]) {
    state = { ...state, loads: value };
    emit();
}
