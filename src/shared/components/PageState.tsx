import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, RotateCw, TriangleAlert } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Spinner } from "@/shared/components/ui/spinner";

/**
 * Estados de página completa para las vistas que no pueden dibujarse sin su entidad (el detalle de una campaña,
 * los contratos de un cliente…). Las vistas de lista no los usan: ahí la carga y el error van dentro de la tabla
 * (`TableCard`), así el marco de la página no desaparece.
 */
export function PageLoading({ label }: { label: string }) {
    return (
        <div role="status" className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-ink-muted">
            <Spinner className="size-8 text-brand" />
            <p className="text-[14px] font-medium">{label}</p>
        </div>
    );
}

interface PageErrorProps {
    title: string;
    message: string;
    /** Ícono de la entidad que no cargó; por defecto, un aviso */
    icon?: ReactNode;
    /** Vuelve a pedir los datos. Se omite cuando reintentar no tiene sentido (p. ej. un id inválido) */
    onRetry?: () => void;
    /** A dónde volver: normalmente la vista de la que salió esta */
    back?: { to: string; label: string };
}

export function PageError({ title, message, icon, onRetry, back }: PageErrorProps) {
    return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
            <span className="text-brand [&>svg]:size-11" aria-hidden="true">{icon ?? <TriangleAlert />}</span>
            <h1 className="text-2xl font-bold text-ink">{title}</h1>
            <p role="alert" className="max-w-md text-ink-muted">{message}</p>
            {(back || onRetry) && (
                <div className="flex flex-wrap justify-center gap-3">
                    {back && <Button nativeButton={false} variant="outline" render={<Link to={back.to} />}><ArrowLeft /> {back.label}</Button>}
                    {onRetry && <Button onClick={onRetry}><RotateCw size={17} /> Reintentar</Button>}
                </div>
            )}
        </div>
    );
}
