import type { BillingClient, BillingInvoice, BillingLoad } from "@/modules/billing/billing.models";
import { formatMoney } from '@/shared/utils/format';

export const contractedAmounts = (client: BillingClient) => client.importesContratados.map(row => `${row.moneda === 'USD' ? 'US$' : row.moneda === 'EUR' ? '€' : 'S/'} ${formatMoney(row.importe)}`).join(' · ') || 'Sin contratos';

export const billedAmount = (invoice: BillingInvoice) => invoice.numeroFacturaElectronica ? invoice.total : 0;
export const collectedAmount = (invoice: BillingInvoice) => invoice.cobros.reduce((sum, collection) => sum + collection.importe, 0);
export const invoiceBalance = (invoice: BillingInvoice) => Math.max(0, invoice.total - collectedAmount(invoice));
export const invoiceIsIssued = (invoice: BillingInvoice) => Boolean(invoice.numeroFacturaElectronica);
export const billingCampaignClosed = (client: BillingClient) => client.estadoCampania === "terminado";

export function billingCampaigns(clients: BillingClient[]) {
    const campaigns = new Map<number, { id: number; name: string; fruit: string; status: string; clients: BillingClient[] }>();
    for (const client of clients) {
        if (!client.cargas.length) continue;
        const current = campaigns.get(client.campaniaId) ?? { id: client.campaniaId, name: client.campaniaNombre,
            fruit: client.fruta, status: client.estadoCampania, clients: [] };
        current.clients.push(client);
        campaigns.set(current.id, current);
    }
    return [...campaigns.values()];
}

export function billingLoadReady(load: BillingLoad) {
    return load.kilosRecibidos > 0 && load.precioVentaKg > 0 && load.respaldoLogisticoCompleto;
}

export function billingAvailableKg(load: BillingLoad) {
    return Math.max(0, load.kilosRecibidos - load.facturas.reduce((sum, invoice) => sum + invoice.kilosFacturados, 0));
}
