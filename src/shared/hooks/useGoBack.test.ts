import { describe, expect, it } from "vitest";
import { getGoBackTarget, hasPreviousView } from "@/shared/hooks/useGoBack";

describe("transport management back navigation", () => {
    it.each(["vehiculos", "choferes"])("returns from %s to the directory with or without history", section => {
        for (const state of [null, { idx: 0 }, { idx: 3 }]) {
            expect(getGoBackTarget(`/transportistas/7/${section}`, state)).toBe("/transportistas");
        }
    });
    it("preserves history navigation and parent fallback elsewhere", () => {
        expect(getGoBackTarget("/campaigns/7", { idx: 2 })).toBe(-1);
        expect(getGoBackTarget("/campaigns/7", { idx: 0 })).toBe("/campaigns");
        expect(getGoBackTarget("/transportistas/7", null)).toBe("/transportistas");
    });
});

describe("hasPreviousView", () => {
    it("es verdadero cuando se llegó navegando desde otra vista de la app", () => {
        expect(hasPreviousView({ idx: 1, key: "a", usr: null })).toBe(true);
        expect(hasPreviousView({ idx: 7 })).toBe(true);
    });

    it("es falso en la primera vista abierta (URL pegada o marcador)", () => {
        expect(hasPreviousView({ idx: 0, key: "default" })).toBe(false);
    });

    it("es falso si el historial no trae la marca de React Router", () => {
        expect(hasPreviousView(null)).toBe(false);
        expect(hasPreviousView(undefined)).toBe(false);
        expect(hasPreviousView("texto")).toBe(false);
        expect(hasPreviousView({})).toBe(false);
    });
});

describe("campaign client navigation", () => {
    it("returns to the actual previous page when contracts were opened through navigation", () => {
        expect(getGoBackTarget("/campaigns/3/clients/8/contracts", { idx: 2 })).toBe(-1);
    });
    it("uses the client list as fallback for a directly opened contracts URL", () => {
        expect(getGoBackTarget("/campaigns/3/clients/8/contracts", { idx: 0 })).toBe("/campaigns/3/clients");
        expect(getGoBackTarget("/campaigns/3/clients/8/contracts/2/deliveries", { idx: 0 })).toBe("/campaigns/3/clients/8/contracts");
    });
});

describe("directly accessible subviews", () => {
    it.each([
        ["/campaigns/3/certifications", "/campaigns"],
        ["/campaigns/3/providers/8/exams", "/campaigns/3/providers"],
        ["/proveedores/8/certificados", "/proveedores"],
    ])("uses the prior page with history and %s fallback without it", (route, fallback) => {
        expect(getGoBackTarget(route, { idx: 2 })).toBe(-1);
        expect(getGoBackTarget(route, { idx: 0 })).toBe(fallback);
    });
});
