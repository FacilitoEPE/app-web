import { useSyncExternalStore } from "react";
import {
    DEMO_SETTLEMENT_LOADS,
    type CarrierRealExpense,
    type SettlementLinkedPerson,
    type SettlementLoad,
    type SettlementPaymentItem,
} from "@/modules/purchase-settlement/purchaseSettlement.demo";

interface SettlementState {
    loads: SettlementLoad[];
    tipoCambioUit: number;
}

let state: SettlementState = {
    loads: DEMO_SETTLEMENT_LOADS,
    tipoCambioUit: 3.76,
};

const listeners = new Set<() => void>();

function emit() {
    for (const listener of listeners) {
        listener();
    }
}

export function usePurchaseSettlementState(): SettlementState {
    return useSyncExternalStore(
        (listener) => {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        () => state,
    );
}

export function setUitExchangeRate(nextRate: number) {
    state = { ...state, tipoCambioUit: nextRate };
    emit();
}

export function addProviderLinkedPerson(
    loadId: string,
    providerEntryId: string,
    person: Omit<SettlementLinkedPerson, "id" | "acumuladoAnualPen">,
): SettlementLinkedPerson {
    const newPerson: SettlementLinkedPerson = {
        ...person,
        id: `pers-${Date.now()}`,
        acumuladoAnualPen: 0,
    };
    state = {
        ...state,
        loads: state.loads.map((load) => {
            if (load.id !== loadId) return load;
            return {
                ...load,
                proveedores: load.proveedores.map((prov) =>
                    prov.id === providerEntryId
                        ? { ...prov, personasVinculadas: [...prov.personasVinculadas, newPerson] }
                        : prov,
                ),
            };
        }),
    };
    emit();
    return newPerson;
}

export function saveProviderSettlement(
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
        archivoLiquidacion: SettlementLoad["proveedores"][number]["archivoLiquidacion"];
        observaciones: string;
    },
) {
    state = {
        ...state,
        loads: state.loads.map((load) => {
            if (load.id !== loadId) return load;
            return {
                ...load,
                proveedores: load.proveedores.map((prov) => {
                    if (prov.id !== providerEntryId) return prov;
                    const total = prov.kilosCargados * payload.precioKg;
                    const pagado = prov.pagos.reduce((s, p) => s + p.importe, 0);
                    return {
                        ...prov,
                        ...payload,
                        total,
                        estado: pagado >= total ? "Pagado" : "Por pagar",
                    };
                }),
            };
        }),
    };
    emit();
}

export function saveCarrierSettlement(
    loadId: string,
    payload: {
        numeroLiquidacion: string;
        fechaLiquidacion: string;
        fleteCarga: number;
        gastosReales: CarrierRealExpense[];
        archivoLiquidacion: SettlementLoad["transporte"]["archivoLiquidacion"];
        observaciones: string;
    },
) {
    state = {
        ...state,
        loads: state.loads.map((load) => {
            if (load.id !== loadId) return load;
            const totalGastos = payload.gastosReales.reduce((s, g) => s + g.monto, 0);
            const totalDoc = payload.fleteCarga + totalGastos;
            const pagado = load.transporte.pagos.reduce((s, p) => s + p.importe, 0);
            return {
                ...load,
                transporte: {
                    ...load.transporte,
                    ...payload,
                    estado: pagado >= totalDoc ? "Pagado" : "Por pagar",
                },
            };
        }),
    };
    emit();
}

export function registerProviderPayment(
    loadId: string,
    providerEntryId: string,
    payment: Omit<SettlementPaymentItem, "id">,
) {
    state = {
        ...state,
        loads: state.loads.map((load) => {
            if (load.id !== loadId) return load;
            return {
                ...load,
                proveedores: load.proveedores.map((prov) => {
                    if (prov.id !== providerEntryId) return prov;
                    const nextPay: SettlementPaymentItem = { ...payment, id: `spay-${Date.now()}` };
                    const nextPagos = [...prov.pagos, nextPay];
                    const totalPagado = nextPagos.reduce((s, p) => s + p.importe, 0);
                    return {
                        ...prov,
                        pagos: nextPagos,
                        estado: totalPagado >= prov.total ? "Pagado" : "Por pagar",
                    };
                }),
            };
        }),
    };
    emit();
}

export function registerCarrierPayment(
    loadId: string,
    payment: Omit<SettlementPaymentItem, "id">,
    advanceId?: string,
) {
    state = {
        ...state,
        loads: state.loads.map((load) => {
            if (load.id !== loadId) return load;
            const t = load.transporte;
            const nextPay: SettlementPaymentItem = { ...payment, id: `spay-${Date.now()}` };
            const nextPagos = [...t.pagos, nextPay];
            const totalGastos = t.gastosReales.reduce((s, g) => s + g.monto, 0);
            const totalDoc = t.fleteCarga + totalGastos;
            const totalPagado = nextPagos.reduce((s, p) => s + p.importe, 0);

            const nextAdelantos =
                payment.modo === "Adelanto" && advanceId
                    ? t.adelantosDisponibles.map((adv) =>
                          adv.id === advanceId
                              ? {
                                    ...adv,
                                    saldoDisponible: Math.max(0, adv.saldoDisponible - payment.importe),
                                }
                              : adv,
                      )
                    : t.adelantosDisponibles;

            return {
                ...load,
                transporte: {
                    ...t,
                    pagos: nextPagos,
                    adelantosDisponibles: nextAdelantos,
                    estado: totalPagado >= totalDoc ? "Pagado" : "Por pagar",
                },
            };
        }),
    };
    emit();
}
