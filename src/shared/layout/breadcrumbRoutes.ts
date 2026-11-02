export interface BreadcrumbLevel {
    label: string;
    href?: string;
}

const ROOT_ROUTES: Record<string, string> = {
    campaigns: "Campañas",
    proveedores: "Proveedores",
    "planificacion-comercial": "Gestión comercial",
    transportistas: "Transporte",
    calidad: "Cosecha y Control de Calidad",
    "logistica-despacho": "Logística y Despacho",
    "facturacion-cobros": "Facturación y Cobros",
    "liquidacion-compra": "Liquidación de Compra",
    chofer: "Portal Móvil del Chofer",
};

/** Muestra la ruta de la vista actual (módulo › sección › vista). No es la escalera de "Regresar": esa es `getParentHref`. */
export function getBreadcrumbLevels(pathname: string): BreadcrumbLevel[] {
    const segments = pathname.split("/").filter(Boolean);
    const rootSegment = segments[0];
    const rootLabel = ROOT_ROUTES[rootSegment];

    if (!rootLabel) return [];

    const levels: BreadcrumbLevel[] = [
        { label: rootLabel, href: segments.length > 1 ? `/${rootSegment}` : undefined },
    ];

    if (rootSegment === "campaigns" && segments.length > 2) {
        const campaignSection = segments[2] === "providers"
            ? "Proveedores"
            : segments[2] === "clients"
                ? "Clientes"
            : segments[2] === "carriers"
                ? "Transportistas"
                : segments[2] === "deliveries"
                    ? "Entregas"
                    : segments[2] === "weekly-delivery-program"
                        ? "Programa semanal de entregas"
                        : segments[2] === "certifications"
                            ? "Certificaciones"
                            : "Detalle";

        levels.push({ 
            label: campaignSection,
            href: segments.length > 3 ? `/${rootSegment}/${segments[1]}/${segments[2]}` : undefined
        });

        if (segments.length > 3 && segments[2] === "clients" && segments[4] === "contracts") {
            levels.push({ label: "Contratos", href: segments.length > 5 ? `/${rootSegment}/${segments[1]}/clients/${segments[3]}/contracts` : undefined });
            if (segments[6] === "deliveries") levels.push({ label: "Entregas" });
        } else if (segments.length > 3) {
            levels.push({
                label: segments[4] === "interviews" ? "Entrevistas" : segments[4] === "exams" ? "Exámenes" : segments[4] === "contracts" ? "Contratos" : "Detalle",
                href: segments[4] === "contracts" && segments.length > 5 ? `/${rootSegment}/${segments[1]}/${segments[2]}/${segments[3]}/contracts` : undefined,
            });
            if (segments[6] === "deliveries") levels.push({ label: "Entregas" });
        }
    } else if (rootSegment === "proveedores" && segments[2] === "fincas") {
        levels.push({ label: "Fincas" });
    } else if (rootSegment === "proveedores" && segments[2] === "certificados") {
        levels.push({ label: "Certificados" });
    } else if (rootSegment === "transportistas" && (segments[2] === "vehiculos" || segments[2] === "choferes")) {
        levels.push({ label: segments[2] === "vehiculos" ? "Vehículos" : "Choferes" });
    } else if (rootSegment === "calidad" && (segments[1] === "exportador" || segments[1] === "industria") && segments.length >= 3) {
        const section = segments[3];
        const label = section === "analisis" ? "Análisis y revisión" : section === "carga" ? "Carga" : section === "guias" ? "Guías de remisión" : "Resumen de campaña";
        levels.push({ label });
    } else if (segments.length > 1) {
        levels.push({ label: "Detalle" });
    }

    return levels;
}

/**
 * Escalera de respaldo de "Regresar" para rutas abiertas directamente. El historial real tiene prioridad;
 * las rutas hijas que también se abren desde un listado usan ese listado como respaldo.
 */
const BACK_LADDER: string[][] = [
    ["campaigns", ":x"],
    ["campaigns", ":x", "providers"],
    ["campaigns", ":x", "providers", ":x"],
    ["campaigns", ":x", "providers", ":x", "interviews"],
    ["campaigns", ":x", "providers", ":x", "exams"],
    ["campaigns", ":x", "clients"],
    ["campaigns", ":x", "clients", ":x"],
    ["campaigns", ":x", "clients", ":x", "contracts"],
    ["campaigns", ":x", "clients", ":x", "contracts", ":x", "deliveries"],
    ["campaigns", ":x", "certifications"],
    ["campaigns", ":x", "carriers"],
    ["campaigns", ":x", "deliveries"],
    ["campaigns", ":x", "weekly-delivery-program"],
    ["proveedores", ":x"],
    ["proveedores", ":x", "fincas"],
    ["proveedores", ":x", "certificados"],
    ["planificacion-comercial", ":x"],
    ["transportistas", ":x"],
    ["transportistas", ":x", "vehiculos"],
    ["transportistas", ":x", "choferes"],
];

const matches = (pattern: string[], segments: string[]) =>
    pattern.length === segments.length && pattern.every((part, index) => part === ":x" || part === segments[index]);

/** These management pages are opened from the transport directory, independently of the detail page. */
export function getDirectBackHref(pathname: string): string | undefined {
    const segments = pathname.split("/").filter(Boolean);
    if (segments[0] === "calidad" && (segments[1] === "exportador" || segments[1] === "industria") && segments.length >= 3) return "/calidad";
    if (matches(["transportistas", ":x", "vehiculos"], segments)
        || matches(["transportistas", ":x", "choferes"], segments)) return "/transportistas";
    return undefined;
}

/** A dónde lleva "Regresar": la vista inmediata anterior de la escalera; desde la raíz de un módulo, al selector de módulos. */
export function getParentHref(pathname: string): string {
    const directBack = getDirectBackHref(pathname);
    if (directBack) return directBack;
    const segments = pathname.split("/").filter(Boolean);
    if (!ROOT_ROUTES[segments[0]]) return "/modules";
    if (segments[0] === "campaigns" && segments.length === 3 && ["providers", "clients", "certifications", "carriers", "deliveries", "weekly-delivery-program"].includes(segments[2]))
        return "/campaigns";
    if (segments[0] === "campaigns" && matches(["campaigns", ":x", "providers", ":x", ":x"], segments) && ["exams", "interviews"].includes(segments[4]))
        return `/campaigns/${segments[1]}/providers`;
    if (matches(["campaigns", ":x", "clients", ":x", "contracts"], segments))
        return `/campaigns/${segments[1]}/clients`;
    if (segments[0] === "proveedores" && matches(["proveedores", ":x", ":x"], segments) && ["fincas", "certificados"].includes(segments[2]))
        return "/proveedores";
    for (let length = segments.length - 1; length >= 2; length--) {
        const prefix = segments.slice(0, length);
        if (BACK_LADDER.some((pattern) => matches(pattern, prefix))) return `/${prefix.join("/")}`;
    }
    return segments.length > 1 ? `/${segments[0]}` : "/modules";
}
