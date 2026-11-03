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
    it("returns from a guide detail directly to its load's guide list", () => {
        const route = "/calidad/exportador/2/guias/17/guia-4";
        expect(getParentHref(route)).toBe("/calidad/exportador/2/guias/17");
        expect(getBreadcrumbLevels(route)).toEqual([
            { label: "Cosecha y Control de Calidad", href: "/calidad" },
            { label: "Guías de remisión", href: "/calidad/exportador/2/guias" },
            { label: "Guías de la carga", href: "/calidad/exportador/2/guias/17" },
            { label: "Detalle" },
        ]);
    });
    it("returns from guides of a load to the campaign guide list", () => {
        const route = "/calidad/exportador/2/guias/17";
        expect(getParentHref(route)).toBe("/calidad/exportador/2/guias");
        expect(getBreadcrumbLevels(route)).toEqual([
            { label: "Cosecha y Control de Calidad", href: "/calidad" },
            { label: "Guías de remisión", href: "/calidad/exportador/2/guias" },
            { label: "Guías de la carga" },
        ]);
    });
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

describe("logistics management routes", () => {
    it.each([
        ["compras", "Compras"],
        ["recepcion", "Recepción y calidad"],
        ["jabas", "Jabas y salida"],
        ["documentos", "Documentos y cierre"],
    ])("shows %s directly after campaign loads", (section, label) => {
        const route = `/logistica-despacho/1/cargas/2/${section}`;
        expect(getParentHref(route)).toBe("/logistica-despacho/1");
        expect(getBreadcrumbLevels(route)).toEqual([
            { label: "Logística y Despacho", href: "/logistica-despacho" },
            { label: "Cargas de la campaña", href: "/logistica-despacho/1" },
            { label },
        ]);
    });
    it("keeps detail as its own route", () => {
        const route = "/logistica-despacho/1/cargas/2";
        expect(getParentHref(route)).toBe("/logistica-despacho/1");
        expect(getBreadcrumbLevels(route).at(-1)).toEqual({ label: "Detalle de carga" });
    });
});

describe("billing routes", () => {
    it.each([
        ["/facturacion-cobros/1", "/facturacion-cobros", ["Facturación y Cobros", "Clientes"]],
        ["/facturacion-cobros/1/clientes/6", "/facturacion-cobros/1", ["Facturación y Cobros", "Clientes", "Facturación del cliente"]],
        ["/facturacion-cobros/1/clientes/6/facturas/3", "/facturacion-cobros/1/clientes/6", ["Facturación y Cobros", "Clientes", "Facturación del cliente", "Factura"]],
        ["/facturacion-cobros/1/clientes/6/facturas/3/cobros", "/facturacion-cobros/1/clientes/6/facturas/3", ["Facturación y Cobros", "Clientes", "Facturación del cliente", "Factura", "Cobros"]],
    ])("follows the actual billing hierarchy for %s", (route, parent, labels) => {
        expect(getParentHref(route)).toBe(parent);
        expect(getBreadcrumbLevels(route).map(level => level.label)).toEqual(labels);
    });
});

describe("purchase settlement routes", () => {
    it.each([
        ["/liquidacion-compra/1", "/liquidacion-compra", ["Liquidación de Compra", "Cargas"]],
        ["/liquidacion-compra/1/cargas/2/proveedores", "/liquidacion-compra/1", ["Liquidación de Compra", "Cargas", "Proveedores"]],
        ["/liquidacion-compra/1/cargas/2/transportista", "/liquidacion-compra/1", ["Liquidación de Compra", "Cargas", "Transportista"]],
    ])("opens %s directly from its listing", (route, parent, labels) => {
        expect(getParentHref(route)).toBe(parent);
        expect(getBreadcrumbLevels(route).map(level => level.label)).toEqual(labels);
    });
    it('returns from a provider liquidation detail to its management view', () => {
        const route = '/liquidacion-compra/1/cargas/2/proveedores/detalle/8';
        expect(getParentHref(route)).toBe('/liquidacion-compra/1/cargas/2/proveedores');
        expect(getBreadcrumbLevels(route).map(level => level.label)).toEqual(['Liquidación de Compra', 'Cargas', 'Proveedores', 'Detalle']);
    });
});
