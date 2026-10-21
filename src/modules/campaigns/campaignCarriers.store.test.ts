import { describe, expect, it } from "vitest";
import {
    getCampaignCarriers,
    linkCampaignCarrier,
    saveCampaignCarrierAgreement,
    settleCampaignCarrierAgreement,
    unlinkCampaignCarrier,
} from "@/modules/campaigns/campaignCarriers.store";
import { EMPTY_AGREEMENT } from "@/modules/campaigns/campaignCarrier.utils";

const file = (name: string) => new File(["x"], name, { type: "application/pdf" });
const advance = { ...EMPTY_AGREEMENT, tipo: "adelanto" as const, total: "1000", adelanto: "300", fechaAdelanto: "2026-10-01", fechaPago: "2026-11-01" };

describe("campaignCarriers.store", () => {
    it("vincula una sola vez por transportista y campaña, sin acuerdo", () => {
        linkCampaignCarrier(901, 7, file("cot.pdf"));
        linkCampaignCarrier(901, 7, file("otra.pdf"));
        linkCampaignCarrier(902, 7, file("cot.pdf"));
        expect(getCampaignCarriers(901)).toHaveLength(1);
        expect(getCampaignCarriers(901)[0]).toMatchObject({ carrierId: 7, acuerdo: null });
        expect(getCampaignCarriers(902)).toHaveLength(1);
    });

    it("registra el acuerdo, conserva la boleta al editar y lo cierra al pagar el saldo", () => {
        linkCampaignCarrier(903, 8, file("cot.pdf"));
        const [link] = getCampaignCarriers(903);
        saveCampaignCarrierAgreement(903, link.id, advance, file("boleta.pdf"));
        expect(getCampaignCarriers(903)[0].acuerdo).toMatchObject({ tipo: "adelanto", total: 1000, adelanto: 300, saldoPagado: false });

        saveCampaignCarrierAgreement(903, link.id, { ...advance, total: "1200" }, null);
        expect(getCampaignCarriers(903)[0].acuerdo?.total).toBe(1200);
        expect(getCampaignCarriers(903)[0].acuerdo?.boleta?.name).toBe("boleta.pdf");

        settleCampaignCarrierAgreement(903, link.id);
        expect(getCampaignCarriers(903)[0].acuerdo?.saldoPagado).toBe(true);
    });

    it("no marca como pagado un pago único y desvincula sin tocar otras campañas", () => {
        linkCampaignCarrier(904, 9, file("cot.pdf"));
        const [link] = getCampaignCarriers(904);
        saveCampaignCarrierAgreement(904, link.id, { ...EMPTY_AGREEMENT, total: "500", fechaPago: "2026-12-01" }, null);
        settleCampaignCarrierAgreement(904, link.id);
        expect(getCampaignCarriers(904)[0].acuerdo?.saldoPagado).toBe(false);

        unlinkCampaignCarrier(904, link.id);
        expect(getCampaignCarriers(904)).toHaveLength(0);
        expect(getCampaignCarriers(901)).toHaveLength(1);
    });
});
