import { describe, expect, it } from "vitest";
import { formatDecimal, formatDisplayDate, formatKg, formatMoney } from "@/shared/utils/format";

describe("format", () => {
    it("da formato a kilos, montos y decimales en es-PE", () => {
        expect(formatKg(24000.5)).toBe("24,000.5");
        expect(formatMoney(1250)).toBe("1,250.00");
        expect(formatDecimal(12.345)).toBe("12.35");
    });

    it("muestra fechas yyyy-MM-dd sin correrse un día por la zona horaria", () => {
        expect(formatDisplayDate("2026-10-01")).toBe("01/10/2026");
        expect(formatDisplayDate("2026-10-01T00:00:00.000Z")).toBe("01/10/2026");
        expect(formatDisplayDate(new Date(2026, 0, 5))).toBe("05/01/2026");
    });

    it("usa el texto de respaldo si la fecha falta o no es válida", () => {
        expect(formatDisplayDate("")).toBe("—");
        expect(formatDisplayDate("no-es-fecha", "No registrado")).toBe("No registrado");
    });
});
