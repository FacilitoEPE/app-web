import type { CarrierRequirementQuotation } from "@/modules/carriers/carrierQuotations.store";

export interface CarrierQuotationGroup {
    request: CarrierRequirementQuotation;
    recipients: CarrierRequirementQuotation[];
    receivedCount: number;
}

export function groupCarrierQuotations(quotations: CarrierRequirementQuotation[]): CarrierQuotationGroup[] {
    const groups = new Map<number, CarrierQuotationGroup>();

    for (const quotation of quotations) {
        let group = groups.get(quotation.requestId);
        if (!group) {
            group = { request: quotation, recipients: [], receivedCount: 0 };
            groups.set(quotation.requestId, group);
        }
        group.recipients.push(quotation);
        if (quotation.estado === "Recibida") group.receivedCount++;
    }

    return [...groups.values()];
}
