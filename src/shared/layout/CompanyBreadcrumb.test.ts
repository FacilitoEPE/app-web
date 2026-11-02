import { describe, expect, it } from "vitest";
import { getBreadcrumbLevels, getParentHref } from "@/shared/layout/breadcrumbRoutes";

describe("getBreadcrumbLevels", () => {
    it("builds the root campaign hierarchy", () => {
        expect(getBreadcrumbLevels("/campaigns")).toEqual([{ label: "Campañas" }]);
    });

    it("keeps the campaign root navigable from nested views", () => {
        expect(getBreadcrumbLevels("/campaigns/12/providers")).toEqual([
            { label: "Campañas", href: "/campaigns" },
            { label: "Proveedores" },
        ]);
    });

    it("names the interview management view without adding a fictitious level", () => {
        expect(getBreadcrumbLevels("/campaigns/12/providers/5/interviews")).toEqual([
            { label: "Campañas", href: "/campaigns" },
            { label: "Proveedores", href: "/campaigns/12/providers" },
            { label: "Entrevistas" },
        ]);
    });

    it("names the exams management view of a campaign provider", () => {
        expect(getBreadcrumbLevels("/campaigns/12/providers/5/exams")).toEqual([
            { label: "Campañas", href: "/campaigns" },
            { label: "Proveedores", href: "/campaigns/12/providers" },
            { label: "Exámenes" },
        ]);
    });

    it("builds detail hierarchy for other modules", () => {
        expect(getBreadcrumbLevels("/transportistas/8")).toEqual([
            { label: "Transporte", href: "/transportistas" },
            { label: "Detalle" },
        ]);
    });

    it("names the fincas management view of a provider", () => {
        expect(getBreadcrumbLevels("/proveedores/3/fincas")).toEqual([
            { label: "Proveedores", href: "/proveedores" },
            { label: "Fincas" },
        ]);
    });

    it("names the certifications management view of a campaign", () => {
        expect(getBreadcrumbLevels("/campaigns/3/certifications")).toEqual([
            { label: "Campañas", href: "/campaigns" },
            { label: "Certificaciones" },
        ]);
    });

    it.each([
        ["/campaigns/3/carriers", "Transportistas"],
        ["/campaigns/3/deliveries", "Entregas"],
        ["/campaigns/3/weekly-delivery-program", "Programa semanal de entregas"],
    ])("names the campaign view %s", (route, label) => {
        expect(getBreadcrumbLevels(route)).toEqual([
            { label: "Campañas", href: "/campaigns" },
            { label },
        ]);
    });

    it("names the clients management view of a campaign", () => {
        expect(getBreadcrumbLevels("/campaigns/3/clients")).toEqual([
            { label: "Campañas", href: "/campaigns" },
            { label: "Clientes" },
        ]);
    });

    it("names the contracts view nested under a campaign client", () => {
        expect(getBreadcrumbLevels("/campaigns/3/clients/8/contracts")).toEqual([
            { label: "Campañas", href: "/campaigns" },
            { label: "Clientes", href: "/campaigns/3/clients" },
            { label: "Contratos" },
        ]);
    });

    it("names deliveries below the selected contract", () => {
        expect(getBreadcrumbLevels("/campaigns/3/clients/8/contracts/2/deliveries")).toEqual([
            { label: "Campañas", href: "/campaigns" },
            { label: "Clientes", href: "/campaigns/3/clients" },
            { label: "Contratos", href: "/campaigns/3/clients/8/contracts" },
            { label: "Entregas" },
        ]);
    });

    it("names the detail view of a provider", () => {
        expect(getBreadcrumbLevels("/proveedores/3")).toEqual([
            { label: "Proveedores", href: "/proveedores" },
            { label: "Detalle" },
        ]);
    });

    it("names the certificates management view of a provider", () => {
        expect(getBreadcrumbLevels("/proveedores/3/certificados")).toEqual([
            { label: "Proveedores", href: "/proveedores" },
            { label: "Certificados" },
        ]);
    });

    it("hides itself on non-operational routes", () => {
        expect(getBreadcrumbLevels("/modules")).toEqual([]);
    });

    it.each([
        ["/calidad", "Cosecha y Control de Calidad"],
        ["/logistica-despacho", "Logística y Despacho"],
        ["/facturacion-cobros", "Facturación y Cobros"],
        ["/liquidacion-compra", "Liquidación de Compra"],
    ])("names the module route %s", (route, label) => {
        expect(getBreadcrumbLevels(route)).toEqual([{ label }]);
    });
});

describe("getParentHref", () => {
    it.each([
        ["/campaigns", "/modules"],
        ["/campaigns/12", "/campaigns"],
        ["/campaigns/12/providers", "/campaigns"],
        ["/campaigns/12/carriers", "/campaigns"],
        ["/campaigns/12/weekly-delivery-program", "/campaigns"],
        ["/campaigns/12/providers/5/exams", "/campaigns/12/providers"],
        ["/campaigns/3/clients/8/contracts", "/campaigns/3/clients"],
        ["/campaigns/3/clients/8/contracts/2/deliveries", "/campaigns/3/clients/8/contracts"],
        ["/proveedores/3/fincas", "/proveedores"],
        ["/transportistas/8", "/transportistas"],
        ["/modules", "/modules"],
    ])("from %s goes back to %s", (route, parent) => {
        expect(getParentHref(route)).toBe(parent);
    });
});
