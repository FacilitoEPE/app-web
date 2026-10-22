import { describe, expect, it } from "vitest";
import { navigationItems } from "@/shared/layout/navigationItems";

describe("navigationItems", () => {
    it("defines the eight modules shown by both navigation surfaces", () => {
        expect(navigationItems).toHaveLength(8);
        expect(new Set(navigationItems.map((item) => item.id)).size).toBe(8);
        expect(new Set(navigationItems.map((item) => item.url)).size).toBe(8);
    });

    it("keeps future modules addressable while they are being built", () => {
        expect(navigationItems.filter((item) => item.status === "building").map((item) => item.url)).toEqual([
            "/logistica-despacho",
            "/facturacion-cobros",
            "/liquidacion-compra",
        ]);
    });
});
