import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Bell, BellOff, CheckCheck, CircleCheck, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import Hint from "@/shared/components/Hint";
import { Button } from "@/shared/components/ui/button";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@/shared/components/ui/popover";
import { markAllAsRead, markAsRead, useNotifications, type AppNotification, type NotificationTone } from "@/shared/notifications/notifications.store";

const TONE: Record<NotificationTone, { icon: typeof Info; className: string }> = {
    info: { icon: Info, className: "bg-brand-surface text-brand" },
    success: { icon: CircleCheck, className: "bg-brand-surface text-brand" },
    warning: { icon: TriangleAlert, className: "bg-status-highlight-surface text-status-highlight" },
};

const timeAgo = (iso: string) => formatDistanceToNow(new Date(iso), { addSuffix: true, locale: es });

/** Campana del header: el punto solo aparece si hay notificaciones sin leer; al tocar una, lleva a su vista. */
export default function NotificationsMenu() {
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();
    const notifications = useNotifications();
    const unread = notifications.filter((item) => !item.read).length;

    const openNotification = (item: AppNotification) => {
        markAsRead(item.id);
        setOpen(false);
        if (item.href) navigate(item.href);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <Hint label="Notificaciones" side="bottom">
                <PopoverTrigger
                    aria-label={unread > 0 ? `Notificaciones: ${unread} sin leer` : "Notificaciones"}
                    className="relative flex size-10 cursor-pointer items-center justify-center rounded-xl text-ink-muted outline-none transition-colors duration-200 hover:bg-brand-surface hover:text-brand focus-visible:ring-2 focus-visible:ring-brand/40 data-popup-open:bg-brand-surface data-popup-open:text-brand motion-reduce:transition-none"
                >
                    <Bell size={22} strokeWidth={2} />
                    {unread > 0 && <span aria-hidden="true" className="absolute right-2 top-2 size-2 rounded-full border border-card bg-destructive" />}
                </PopoverTrigger>
            </Hint>
            <PopoverContent
                align="end"
                sideOffset={14}
                className="w-[380px] max-w-[calc(100vw-24px)] gap-0 rounded-xl border border-border bg-popover p-0 shadow-xl ring-0 duration-200 motion-reduce:animate-none"
            >
                <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                    <div className="min-w-0">
                        <PopoverTitle className="text-[15px] font-bold text-ink">Notificaciones</PopoverTitle>
                        <p className="text-[12px] text-ink-muted">{unread > 0 ? `${unread} sin leer` : "Estás al día"}</p>
                    </div>
                    {unread > 0 && (
                        <Button variant="ghost" size="sm" onClick={markAllAsRead} className="shrink-0 text-[12px] font-semibold text-brand hover:bg-brand-surface hover:text-brand">
                            <CheckCheck size={15} /> Marcar todas
                        </Button>
                    )}
                </div>

                {notifications.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 px-6 py-10 text-center text-ink-muted">
                        <BellOff size={26} aria-hidden="true" />
                        <p className="text-[13px] font-medium">No tienes notificaciones.</p>
                    </div>
                ) : (
                    <ul className="max-h-[min(420px,calc(100dvh-160px))] overflow-y-auto p-1.5">
                        {notifications.map((item) => {
                            const { icon: Icon, className } = TONE[item.tone];
                            return (
                                <li key={item.id}>
                                    <button
                                        type="button"
                                        onClick={() => openNotification(item)}
                                        className={cn(
                                            "flex w-full cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5 text-left outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-brand/40",
                                            !item.read && "bg-brand-surface/40",
                                        )}
                                    >
                                        <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full", className)}>
                                            <Icon size={16} strokeWidth={2.2} aria-hidden="true" />
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="flex items-center gap-2">
                                                <span className={cn("truncate text-[13px] text-ink", item.read ? "font-semibold" : "font-bold")}>{item.title}</span>
                                                {!item.read && <span className="size-1.5 shrink-0 rounded-full bg-brand" aria-label="Sin leer" />}
                                            </span>
                                            <span className="mt-0.5 block text-[12.5px] leading-snug text-ink-body">{item.message}</span>
                                            <span className="mt-1 block text-[11px] text-ink-muted">{timeAgo(item.createdAt)}</span>
                                        </span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </PopoverContent>
        </Popover>
    );
}
