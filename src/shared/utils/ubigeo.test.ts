import { describe, expect, it } from "vitest";
import { getUbigeoOptions } from "@/shared/utils/ubigeo";

describe("getUbigeoOptions", () => {
    it("ofrece los departamentos y espera una selección antes de ofrecer provincias o distritos", () => {
        const options = getUbigeoOptions("", "");
        expect(options.departamento).toHaveLength(25);
        expect(options.provincia).toEqual([]);
        expect(options.distrito).toEqual([]);
    });

    it("filtra los distritos por provincia dentro del departamento seleccionado", () => {
        const options = getUbigeoOptions("PIURA", "SULLANA");
        expect(options.provincia).toContainEqual({ label: "SULLANA", value: "SULLANA" });
        expect(options.distrito).toContainEqual({ label: "MARCAVELICA", value: "MARCAVELICA" });
        expect(options.distrito).not.toContainEqual({ label: "TAMBO GRANDE", value: "TAMBO GRANDE" });
        expect(getUbigeoOptions("LIMA", "SULLANA").distrito).toEqual([]);
    });

    it("carga las ubicaciones anteriores con su valor guardado", () => {
        const options = getUbigeoOptions("Áncash", "Santa", "Distrito anterior");
        expect(options.departamento).toContainEqual({ label: "ANCASH", value: "Áncash" });
        expect(options.provincia).toContainEqual({ label: "SANTA", value: "Santa" });
        expect(options.distrito).toContainEqual({ label: "Distrito anterior", value: "Distrito anterior" });
    });
});
