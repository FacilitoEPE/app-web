import { describe, expect, it } from "vitest";
import {
    EMPTY_AGREEMENT,
    getAgreementBalance,
    getAgreementStatus,
    isAgreementClosed,
    toAgreement,
    toAgreementValues,
    validateAgreement,
    type AgreementFormValues,
} from "@/modules/campaigns/campaignCarrier.utils";

const single: AgreementFormValues = { ...EMPTY_AGREEMENT, total: "12000", fechaPago: "2026-11-30" };
const advance: AgreementFormValues = { ...EMPTY_AGREEMENT, tipo: "adelanto", total: "12000", adelanto: "4000", fechaAdelanto: "2026-10-20", fechaPago: "2026-11-30" };

describe("validateAgreement", () => {
    it("acepta un pago único y un pago con adelanto completos", () => {
        expect(validateAgreement(single)).toEqual({});
        expect(validateAgreement(advance)).toEqual({});
    });

    it("exige total y fecha de pago en el pago único", () => {
        expect(validateAgreement(EMPTY_AGREEMENT)).toEqual({
            total: expect.any(String),
            fechaPago: expect.any(String),
        });
    });

    it("exige monto y fechas del adelanto, y que el adelanto sea menor que el total", () => {
        expect(validateAgreement({ ...advance, adelanto: "", fechaAdelanto: "", fechaPago: "" })).toMatchObject({
            adelanto: expect.any(String),
            fechaAdelanto: expect.any(String),
            fechaPago: expect.any(String),
        });
        expect(validateAgreement({ ...advance, adelanto: "12000" }).adelanto).toMatch(/menor/);
        expect(validateAgreement({ ...advance, fechaPago: "2026-10-01" }).fechaPago).toMatch(/posterior/);
    });

    it("no valida los campos del adelanto cuando el pago es único", () => {
        expect(validateAgreement({ ...single, adelanto: "999999", fechaAdelanto: "" })).toEqual({});
    });
});

describe("estado del acuerdo", () => {
    it("recorre sin registrar → con adelanto → pagado, y el pago único queda cerrado", () => {
        expect(getAgreementStatus(null)).toBe("Sin registrar");
        const withAdvance = toAgreement(advance, null);
        expect(getAgreementStatus(withAdvance)).toBe("Con adelanto");
        expect(isAgreementClosed(withAdvance)).toBe(false);
        const settled = { ...withAdvance, saldoPagado: true };
        expect(getAgreementStatus(settled)).toBe("Pagado");
        expect(isAgreementClosed(settled)).toBe(true);
        expect(getAgreementStatus(toAgreement(single, null))).toBe("Pago único");
        expect(isAgreementClosed(toAgreement(single, null))).toBe(true);
        expect(isAgreementClosed(null)).toBe(false);
    });

    it("calcula el saldo sin dejarlo negativo ni arrastrar decimales", () => {
        expect(getAgreementBalance(12000, 4000)).toBe(8000);
        expect(getAgreementBalance(100.1, 0.2)).toBe(99.9);
        expect(getAgreementBalance(100, 150)).toBe(0);
        expect(getAgreementBalance(100, null)).toBe(100);
    });
});

describe("conversión formulario ↔ acuerdo", () => {
    it("pasar a pago único descarta lo del adelanto", () => {
        const agreement = toAgreement({ ...advance, tipo: "unico" }, null);
        expect(agreement).toMatchObject({ tipo: "unico", adelanto: null, fechaAdelanto: "", saldoPagado: false });
    });

    it("ida y vuelta conserva los valores", () => {
        expect(toAgreementValues(toAgreement(advance, null))).toEqual(advance);
        expect(toAgreementValues(null)).toEqual(EMPTY_AGREEMENT);
    });
});
