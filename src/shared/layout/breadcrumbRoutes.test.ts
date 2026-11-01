import { describe, expect, it } from "vitest";
import { getBreadcrumbLevels, getParentHref } from "@/shared/layout/breadcrumbRoutes";
describe("independent transport management routes", () => {
    it.each(["vehiculos", "choferes"])("links %s directly back to the transport directory", section => {
        const path = `/transportistas/7/${section}`;
        expect(getParentHref(path)).toBe("/transportistas");
        expect(getBreadcrumbLevels(path)).toEqual([
            { label: "Transporte", href: "/transportistas" },
            { label: section === "vehiculos" ? "Veh\u00edculos" : "Choferes" },
        ]);
    });
    it("returns from the carrier to the unchanged transport directory", () => {
        expect(getParentHref("/transportistas/7")).toBe("/transportistas");
    });
});
