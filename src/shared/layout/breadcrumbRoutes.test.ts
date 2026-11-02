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

describe("campaign client detail route", () => {
    it("returns from client detail to the campaign client list", () => {
        expect(getParentHref("/campaigns/3/clients/8")).toBe("/campaigns/3/clients");
        expect(getBreadcrumbLevels("/campaigns/3/clients/8")).toEqual([
            { label: "Campañas", href: "/campaigns" },
            { label: "Clientes", href: "/campaigns/3/clients" },
            { label: "Detalle" },
        ]);
    });
    it("keeps contracts as a direct destination from the client list", () => {
        expect(getParentHref("/campaigns/3/clients/8/contracts")).toBe("/campaigns/3/clients");
        expect(getBreadcrumbLevels("/campaigns/3/clients/8/contracts")).toEqual([
            { label: "Campañas", href: "/campaigns" },
            { label: "Clientes", href: "/campaigns/3/clients" },
            { label: "Contratos" },
        ]);
    });
});

describe("directly accessible management pages", () => {
    it.each([
        ["/campaigns/3/providers", "/campaigns"],
        ["/campaigns/3/clients", "/campaigns"],
        ["/campaigns/3/certifications", "/campaigns"],
        ["/campaigns/3/carriers", "/campaigns"],
        ["/campaigns/3/deliveries", "/campaigns"],
        ["/campaigns/3/weekly-delivery-program", "/campaigns"],
        ["/campaigns/3/providers/8/exams", "/campaigns/3/providers"],
        ["/campaigns/3/providers/8/interviews", "/campaigns/3/providers"],
        ["/proveedores/8/fincas", "/proveedores"],
        ["/proveedores/8/certificados", "/proveedores"],
    ])("falls back from %s to its listing %s", (route, parent) => {
        expect(getParentHref(route)).toBe(parent);
    });

    it.each([
        ["/campaigns/3/providers/8/exams", ["Campañas", "Proveedores", "Exámenes"]],
        ["/campaigns/3/providers/8/interviews", ["Campañas", "Proveedores", "Entrevistas"]],
        ["/proveedores/8/fincas", ["Proveedores", "Fincas"]],
        ["/proveedores/8/certificados", ["Proveedores", "Certificados"]],
        ["/transportistas/8/vehiculos", ["Transporte", "Vehículos"]],
        ["/transportistas/8/choferes", ["Transporte", "Choferes"]],
    ])("shows only actual navigation levels for %s", (route, labels) => {
        expect(getBreadcrumbLevels(route).map((level) => level.label)).toEqual(labels);
    });
});

describe("quality management routes", () => {
    it.each([
        ["/calidad/exportador/2/analisis", "Análisis y revisión"],
        ["/calidad/exportador/2/carga", "Carga"],
        ["/calidad/exportador/2/guias", "Guías de remisión"],
        ["/calidad/industria/2/carga", "Carga"],
        ["/calidad/industria/2/guias", "Guías de remisión"],
        ["/calidad/exportador/2", "Resumen de campaña"],
        ["/calidad/industria/2", "Resumen de campaña"],
    ])("opens %s directly from the quality listing", (route, label) => {
        expect(getParentHref(route)).toBe("/calidad");
        expect(getBreadcrumbLevels(route)).toEqual([
            { label: "Cosecha y Control de Calidad", href: "/calidad" },
            { label },
        ]);
    });
});
