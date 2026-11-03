/** Share the same imports between React.lazy and intent-based module loading. */
export const modulePages = {
    '/campaigns': () => import('@/modules/campaigns/pages/CampaignsPage'),
    '/proveedores': () => import('@/modules/providers/pages/ProvidersPage'),
    '/planificacion-comercial': () => import('@/modules/commercial-planning/pages/CommercialPlanningPage'),
    '/transportistas': () => import('@/modules/carriers/pages/CarriersPage'),
    '/calidad': () => import('@/modules/quality/pages/QualityPage'),
    '/logistica-despacho': () => import('@/modules/logistics/pages/LogisticsPage'),
    '/facturacion-cobros': () => import('@/modules/billing/pages/BillingCampaignsPage'),
    '/liquidacion-compra': () => import('@/modules/purchase-settlement/pages/PurchaseSettlementPage'),
};

export function preloadModule(path: string) {
    if (Object.hasOwn(modulePages, path)) {
        // Navigation remains responsible for reporting a failed route load.
        void modulePages[path as keyof typeof modulePages]().catch(() => undefined);
    }
}
