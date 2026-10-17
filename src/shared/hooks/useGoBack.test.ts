import { describe, expect, it } from "vitest";
import { hasPreviousView } from "@/shared/hooks/useGoBack";

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
