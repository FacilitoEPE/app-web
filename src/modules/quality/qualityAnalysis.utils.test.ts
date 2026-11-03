import { describe, expect, it } from "vitest";
import { CERATITIS_MTD_LIMIT, mtdCeratitisStatus } from "@/modules/quality/qualityAnalysis.utils";

describe("control MTD Ceratitis", () => {
    it("permite el límite y restringe solo valores superiores", () => {
        expect(CERATITIS_MTD_LIMIT).toBe(0.5);
        expect(mtdCeratitisStatus(0.3)).toBe("cumple");
        expect(mtdCeratitisStatus(0.5)).toBe("cumple");
        expect(mtdCeratitisStatus(0.5001)).toBe("bloqueado");
    });

    it("mantiene pendiente una lectura vacía o inválida", () => {
        expect(mtdCeratitisStatus("")).toBe("pendiente");
        expect(mtdCeratitisStatus("-1")).toBe("pendiente");
        expect(mtdCeratitisStatus("abc")).toBe("pendiente");
    });
});
