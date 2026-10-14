import { useSyncExternalStore } from "react";
import { createDemoNotifications } from "@/shared/notifications/notifications.demo";

export type NotificationTone = "info" | "warning" | "success";

export interface AppNotification {
    id: number;
    title: string;
    message: string;
    /** Fecha y hora ISO en que ocurrió */
    createdAt: string;
    read: boolean;
    tone: NotificationTone;
    /** Vista a la que lleva la notificación al tocarla */
    href?: string;
}

/**
 * Notificaciones del usuario (vencimientos, exámenes con resultado, pagos pendientes…).
 *
 * TODO(api): el backend todavía no tiene servicio de notificaciones. Mientras tanto viven en memoria (se pierden
 * al recargar): cuando exista, `useNotifications` pasa a leer la API y `markAsRead` / `markAllAsRead` a llamarla.
 * En desarrollo arranca con datos de demostración (`notifications.demo.ts`); en producción y en las pruebas,
 * vacío.
 */
let items: AppNotification[] = import.meta.env.DEV && import.meta.env.MODE !== "test" ? createDemoNotifications() : [];
const listeners = new Set<() => void>();

function update(next: AppNotification[]) {
    items = next;
    listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

export function useNotifications(): AppNotification[] {
    return useSyncExternalStore(subscribe, () => items);
}

export function markAsRead(id: number) {
    if (!items.some((item) => item.id === id && !item.read)) return;
    update(items.map((item) => (item.id === id ? { ...item, read: true } : item)));
}

export function markAllAsRead() {
    if (items.every((item) => item.read)) return;
    update(items.map((item) => ({ ...item, read: true })));
}
