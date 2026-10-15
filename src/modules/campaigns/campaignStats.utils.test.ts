import { describe, expect, it } from "vitest";
import { getCampaignMonthlySeries, getCampaignTrend, getTrend, sparklinePath } from "@/modules/campaigns/campaignStats.utils";
import type { Campana } from "@/modules/campaigns/api/campaign.mapper";

const campaign = (overrides: Partial<Campana>): Campana => ({
    campaniaId: 1,
    nombre: "Campaña",
    frutaId: 1,
    fechaInicio: new Date(2026, 9, 5),
    fechaFin: new Date(2026, 11, 5),
    estado: "planificacion",
    requerimientoComercial: 0,
    createdAt: "",
    updatedAt: "",
    ...overrides,
});

describe("getTrend", () => {
    it("reports growth, decline and no change", () => {
        expect(getTrend(3, 2)).toEqual({ value: "+50%", direction: "up" });
        expect(getTrend(1, 4)).toEqual({ value: "-75%", direction: "down" });
        expect(getTrend(2, 2)).toEqual({ value: "0%", direction: "neutral" });
    });

    it("treats anything new after an empty month as +100%", () => {
        expect(getTrend(5, 0)).toEqual({ value: "+100%", direction: "up" });
        expect(getTrend(0, 0)).toEqual({ value: "0%", direction: "neutral" });
    });
});

describe("getCampaignTrend", () => {
    const now = new Date(2026, 9, 20);

    it("compares campaigns starting this month against the previous one", () => {
        const campaigns = [
            campaign({ campaniaId: 1, fechaInicio: new Date(2026, 9, 1) }),
            campaign({ campaniaId: 2, fechaInicio: new Date(2026, 9, 15) }),
            campaign({ campaniaId: 3, fechaInicio: new Date(2026, 8, 10) }),
            campaign({ campaniaId: 4, fechaInicio: new Date(2026, 7, 10) }),
        ];
        expect(getCampaignTrend(campaigns, now)).toEqual({ value: "+100%", direction: "up" });
    });

    it("crosses the year boundary", () => {
        const january = new Date(2027, 0, 10);
        const campaigns = [campaign({ fechaInicio: new Date(2026, 11, 20) }), campaign({ campaniaId: 2, fechaInicio: new Date(2027, 0, 3) })];
        expect(getCampaignTrend(campaigns, january)).toEqual({ value: "0%", direction: "neutral" });
    });

    it("only counts the campaigns that match the filter and reference date", () => {
        const campaigns = [
            campaign({ estado: "terminado", fechaFin: new Date(2026, 9, 2) }),
            campaign({ campaniaId: 2, estado: "terminado", fechaFin: new Date(2026, 8, 2) }),
            campaign({ campaniaId: 3, estado: "terminado", fechaFin: new Date(2026, 8, 20) }),
            campaign({ campaniaId: 4, estado: "en proceso", fechaFin: new Date(2026, 9, 2) }),
        ];
        const trend = getCampaignTrend(campaigns, now, (item) => item.estado === "terminado", (item) => item.fechaFin);
        expect(trend).toEqual({ value: "-50%", direction: "down" });
    });
});

describe("getCampaignMonthlySeries", () => {
    it("counts the last six months, oldest first, including the current one", () => {
        const now = new Date(2026, 9, 20);
        const campaigns = [
            campaign({ campaniaId: 1, fechaInicio: new Date(2026, 9, 1) }),
            campaign({ campaniaId: 2, fechaInicio: new Date(2026, 9, 15) }),
            campaign({ campaniaId: 3, fechaInicio: new Date(2026, 7, 10) }),
            campaign({ campaniaId: 4, fechaInicio: new Date(2026, 4, 10) }),
            campaign({ campaniaId: 5, fechaInicio: new Date(2026, 3, 10) }),
        ];
        expect(getCampaignMonthlySeries(campaigns, now)).toEqual([1, 0, 0, 1, 0, 2]);
    });
});

describe("sparklinePath", () => {
    it("keeps an all-zero series as a flat line at the bottom", () => {
        expect(sparklinePath([0, 0, 0])).toBe("M 0 54 C 30 54, 30 54, 60 54 C 90 54, 90 54, 120 54");
    });

    it("puts the highest value at the top margin", () => {
        const path = sparklinePath([0, 2]);
        expect(path.startsWith("M 0 54")).toBe(true);
        expect(path.endsWith("120 10")).toBe(true);
    });
});
