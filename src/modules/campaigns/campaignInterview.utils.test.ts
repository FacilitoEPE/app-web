import { afterEach, describe, expect, it } from "vitest";
import { EMPTY_INTERVIEW, EMPTY_INTERVIEW_AGRONOMICS, validateInterviewAgronomics } from "@/modules/campaigns/campaignInterview";
import { fruitCodePrefix, getAvailableInterviewFincas, getCampaignInterviews, getNextCampaignFincaCode, resetCampaignInterviews, saveCampaignInterview, toInterviewValues } from "@/modules/campaigns/campaignInterview.utils";
import type { Finca } from "@/modules/providers/providerFinca.utils";

afterEach(resetCampaignInterviews);

const interview = (fincaNombre: string) => ({ ...EMPTY_INTERVIEW, fincaNombre });
const finca: Finca = {
    nombre: "Finca El Bosque ", departamento: "Piura", provincia: "Sullana", distrito: "Marcavelica",
    latitud: null, longitud: -80.2, haTotal: 12, haCultivo: 8,
};

describe("campaign interviews in local memory", () => {
    it("normalizes the first three letters of the fruit", async () => {
        expect(await fruitCodePrefix("Mango")).toBe("MAN");
        expect(await fruitCodePrefix("Arándano")).toBe("ARA");
    });

    it("allocates consecutive FYV codes across producers in one campaign", async () => {
        expect(getNextCampaignFincaCode(1, "Mango")).toBe("FYV-MAN-01");
        await saveCampaignInterview(1, 8, "Mango", interview("Los Olivos"));
        expect(getNextCampaignFincaCode(1, "Mango")).toBe("FYV-MAN-02");
        await saveCampaignInterview(1, 9, "Mango", interview("El Milagro"));
        expect(getCampaignInterviews(8)[0].codigoFyv).toBe("FYV-MAN-01");
        expect(getCampaignInterviews(9)[0].codigoFyv).toBe("FYV-MAN-02");
        expect(getNextCampaignFincaCode(2, "Mango")).toBe("FYV-MAN-01");
        expect(getNextCampaignFincaCode(1, "Uva")).toBe("FYV-UVA-01");
    });

    it("keeps a finca code when editing and does not duplicate it", async () => {
        const first = (await saveCampaignInterview(1, 8, "Mango", interview("Los Olivos")))[0];
        const edited = (await saveCampaignInterview(1, 8, "Mango", { ...interview("Los Olivos"), frecuenciaRiego: "3" }, first.id))[0];
        expect(edited.codigoFyv).toBe("FYV-MAN-01");
        expect(edited.createdAt).toBe(first.createdAt);
        expect(getNextCampaignFincaCode(1, "Mango")).toBe("FYV-MAN-02");
    });

    it("prevents a second interview for the same finca in one producer-campaign relation", async () => {
        await saveCampaignInterview(1, 8, "Mango", interview("Los Olivos"));
        expect(() => saveCampaignInterview(1, 8, "Mango", interview(" los olivos "))).toThrow("ya tiene una entrevista");
    });

    it("filters interviewed fincas with the same normalization used when saving", () => {
        expect(getAvailableInterviewFincas([finca], [" finca el bosque "])).toEqual([]);
        expect(getAvailableInterviewFincas([finca], ["Otra finca"])).toEqual([{ finca, index: 0 }]);
    });

    it("keeps finca data together with agronomic values and optional coordinates", async () => {
        const values = await toInterviewValues(finca, { densidadPlantacion: "1000", distanciamiento: "3", frecuenciaRiego: "2", nombreAplicacion: "Urea", aplicacionesAlAno: "4" });
        expect(values).toMatchObject({ fincaNombre: finca.nombre, haTotalFinca: "12", haCultivo: "8", latitud: "", longitud: "-80.2", frecuenciaRiego: "2" });
    });

    it("rejects incomplete saves and stale edit targets without modifying records", () => {
        expect(() => saveCampaignInterview(1, 8, "Mango", interview(""))).toThrow("Selecciona o registra");
        expect(() => saveCampaignInterview(1, 8, "Mango", interview("Los Olivos"), "missing")).toThrow("No se encontró");
        expect(getCampaignInterviews(8)).toEqual([]);
    });

    it("validates the five agronomic fields independently of finca identification", () => {
        expect(Object.keys(validateInterviewAgronomics(EMPTY_INTERVIEW_AGRONOMICS))).toHaveLength(5);
        expect(validateInterviewAgronomics({ densidadPlantacion: "1000", distanciamiento: "3", frecuenciaRiego: "0", nombreAplicacion: "Urea", aplicacionesAlAno: "0" })).toEqual({});
    });
});
