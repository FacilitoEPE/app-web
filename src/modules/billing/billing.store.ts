import { usesV1 } from '@/shared/api/data-contract';
import { billingCommands } from '@/modules/billing/api/billing-commands.api';
import { useSyncExternalStore } from "react";
import {
    type BillingClient,
    type BillingCollectionItem,
    type BillingInvoice,
} from "@/modules/billing/billing.models";

let clients: BillingClient[] = [];
const listeners = new Set<() => void>();

function emit() {
    for (const listener of listeners) {
        listener();
    }
}

export function useBillingClients(): BillingClient[] {
    return useSyncExternalStore(
        (listener) => {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        () => clients,
    );
}

export function saveBillingInvoicePreparation(
    clientId: string,
    loadId: string,
    invoice: Omit<BillingInvoice, "id" | "cobros"> & { id?: string },
) {
    if (usesV1()) return billingCommands.prepare(clientId, loadId, invoice);
    clients = clients.map((cli) => {
        if (cli.id !== clientId) return cli;
        return {
            ...cli,
            cargas: cli.cargas.map((load) => {
                if (load.id !== loadId) return load;
                if (invoice.id) {
                    return {
                        ...load,
                        facturas: load.facturas.map((inv) =>
                            inv.id === invoice.id ? { ...inv, ...invoice, id: inv.id } : inv,
                        ),
                    };
                }
                const nextInv: BillingInvoice = {
                    ...invoice,
                    id: `inv-${Date.now()}`,
                    cobros: [],
                };
                return {
                    ...load,
                    facturas: [...load.facturas, nextInv],
                };
            }),
        };
    });
    emit();
}

export function issueBillingElectronicInvoice(
    clientId: string,
    loadId: string,
    invoiceId: string,
    payload: {
        numeroFacturaElectronica: string;
        fechaEmision: string;
        fechaVencimiento: string;
        archivoFacturaEmitida: BillingInvoice["archivoFacturaEmitida"];
        observaciones: string;
    },
) {
    if (usesV1()) return billingCommands.issue(clientId, loadId, invoiceId, payload);
    clients = clients.map((cli) => {
        if (cli.id !== clientId) return cli;
        return {
            ...cli,
            cargas: cli.cargas.map((load) => {
                if (load.id !== loadId) return load;
                return {
                    ...load,
                    facturas: load.facturas.map((inv) => {
                        if (inv.id !== invoiceId) return inv;
                        const totalCobrado = inv.cobros.reduce((s, c) => s + c.importe, 0);
                        return {
                            ...inv,
                            ...payload,
                            estado:
                                totalCobrado >= inv.total
                                    ? "Cobrado"
                                    : totalCobrado > 0
                                        ? "Cobrado parcial"
                                        : "Emitida",
                        };
                    }),
                };
            }),
        };
    });
    emit();
}

export function registerBillingCollection(
    clientId: string,
    loadId: string,
    invoiceId: string,
    collection: Omit<BillingCollectionItem, "id">,
) {
    if (usesV1()) return billingCommands.collect(clientId, loadId, invoiceId, collection);
    clients = clients.map((cli) => {
        if (cli.id !== clientId) return cli;
        return {
            ...cli,
            cargas: cli.cargas.map((load) => {
                if (load.id !== loadId) return load;
                return {
                    ...load,
                    facturas: load.facturas.map((inv) => {
                        if (inv.id !== invoiceId) return inv;
                        const nextCol: BillingCollectionItem = {
                            ...collection,
                            id: `col-${Date.now()}`,
                        };
                        const nextCobros = [...inv.cobros, nextCol];
                        const totalCobrado = nextCobros.reduce((s, c) => s + c.importe, 0);
                        return {
                            ...inv,
                            cobros: nextCobros,
                            estado: totalCobrado >= inv.total ? "Cobrado" : "Cobrado parcial",
                        };
                    }),
                };
            }),
        };
    });
    emit();
}

export function hydrateBillingData(value: BillingClient[]) { clients = value; emit(); }
