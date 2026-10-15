import type { AppNotification } from "@/shared/notifications/notifications.store";

/**
 * Notificaciones de demostración SOLO para desarrollo: cubren los tres tonos, leídas y sin leer, y enlaces a
 * vistas de la base de desarrollo. Se cargan únicamente con `import.meta.env.DEV` (ver `notifications.store.ts`).
 *
 * TODO(api): borrar este archivo cuando las notificaciones vengan del backend.
 */
const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

export function createDemoNotifications(): AppNotification[] {
    return [
        { id: 1, tone: "warning", read: false, createdAt: minutesAgo(25), title: "Certificación por vencer", message: "Orgánico USDA de la Campaña Mango 2026 vence en 18 días.", href: "/campaigns/1/certifications" },
        { id: 2, tone: "success", read: false, createdAt: minutesAgo(140), title: "Resultado de laboratorio", message: "El examen de Metales Pesados de José Luis Ramos Quispe salió negativo.", href: "/campaigns/1/providers/1/exams" },
        { id: 3, tone: "info", read: false, createdAt: minutesAgo(60 * 5), title: "Entrega programada", message: "Exportadora Andina SAC tiene una entrega de 8,000 kg en 5 días.", href: "/campaigns/1/clients/1/contracts/1/deliveries" },
        { id: 4, tone: "warning", read: true, createdAt: minutesAgo(60 * 26), title: "Pagos pendientes", message: "Hay 2 pagos a transportistas pendientes en la Campaña Uva 2027.", href: "/campaigns/2/carrier-payments" },
        { id: 5, tone: "info", read: true, createdAt: minutesAgo(60 * 72), title: "Nuevo proveedor", message: "María Elena Flores Vega se registró como proveedora.", href: "/proveedores/2" },
    ];
}
