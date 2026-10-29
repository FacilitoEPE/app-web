import { describe, expect, it } from "vitest";
import {
    filterQualityCampaigns,
    getQualityActionsForScope,
    type QualityCampaign,
} from "@/modules/quality/quality.utils";
import {
    _resetQualityStore,
    addQualityCampaign,
    getQualityCampaigns,
    removeQualityCampaign,
} from "@/modules/quality/quality.store";

const mockCampaigns: QualityCampaign[] = [
    {
        id: 1,
        campaniaId: 10,
        nombre: "Mango 2026",
        fruta: "Mango",
        fechaInicio: "2026-09-11",
        fechaFin: "2027-01-19",
        estado: "En Proceso",
        scope: ["exportador", "industria"],
    },
    {
        id: 2,
        campaniaId: 11,
        nombre: "Mango 2025 · Cerrada",
        fruta: "Mango",
        fechaInicio: "2025-09-16",
        fechaFin: "2025-12-25",
        estado: "Finalizado",
        scope: ["industria"],
    },
    {
        id: 3,
        campaniaId: 12,
        nombre: "Arándano 2026",
        fruta: "Arándano",
        fechaInicio: "2026-10-06",
        fechaFin: "2026-12-20",
        estado: "En Proceso",
        scope: ["exportador", "industria"],
    },
];

describe("quality.utils", () => {
    it("returns 3 actions for exportador and 2 actions for industria", () => {
        const exportActions = getQualityActionsForScope("exportador");
        expect(exportActions.map((a) => a.label)).toEqual([
            "Análisis y revisión",
            "Carga",
            "Guías de remisión",
        ]);

        const industriaActions = getQualityActionsForScope("industria");
        expect(industriaActions.map((a) => a.label)).toEqual([
            "Carga",
            "Guías de remisión",
        ]);
    });

    it("filters campaigns correctly by scope", () => {
        const exportResults = filterQualityCampaigns(mockCampaigns, "exportador", "", "", "");
        expect(exportResults.map((c) => c.nombre)).toEqual(["Mango 2026", "Arándano 2026"]);

        const industriaResults = filterQualityCampaigns(mockCampaigns, "industria", "", "", "");
        expect(industriaResults.map((c) => c.nombre)).toEqual([
            "Mango 2026",
            "Mango 2025 · Cerrada",
            "Arándano 2026",
        ]);
    });

    it("filters campaigns by name, status and search query", () => {
        const byName = filterQualityCampaigns(mockCampaigns, "industria", "Mango 2025 · Cerrada", "", "");
        expect(byName).toHaveLength(1);
        expect(byName[0].nombre).toBe("Mango 2025 · Cerrada");

        const byStatus = filterQualityCampaigns(mockCampaigns, "industria", "", "finalizado", "");
        expect(byStatus).toHaveLength(1);
        expect(byStatus[0].estado).toBe("Finalizado");

        const bySearch = filterQualityCampaigns(mockCampaigns, "exportador", "", "", "arándano");
        expect(bySearch).toHaveLength(1);
        expect(bySearch[0].fruta).toBe("Arándano");
    });
});

describe("quality.store", () => {
    it("allows adding and removing campaigns in memory", async () => {
        _resetQualityStore([]);
        expect(getQualityCampaigns()).toHaveLength(0);

        await addQualityCampaign({
            campaniaId: 50,
            nombre: "Palta 2026",
            fruta: "Palta",
            fechaInicio: "2026-03-01",
            fechaFin: "2026-07-31",
            estado: "En Proceso",
            scope: "exportador",
        });

        const current = getQualityCampaigns();
        expect(current).toHaveLength(1);
        expect(current[0].nombre).toBe("Palta 2026");
        expect(current[0].scope).toEqual(["exportador"]);

        // Agregar la misma campaña al scope industria amplía sus scopes
        await addQualityCampaign({
            campaniaId: 50,
            nombre: "Palta 2026",
            fruta: "Palta",
            fechaInicio: "2026-03-01",
            fechaFin: "2026-07-31",
            estado: "En Proceso",
            scope: "industria",
        });

        expect(getQualityCampaigns()).toHaveLength(1);
        expect(getQualityCampaigns()[0].scope).toEqual(["exportador", "industria"]);

        // Remove
        await removeQualityCampaign(current[0].id);
        expect(getQualityCampaigns()).toHaveLength(0);
    });
});
