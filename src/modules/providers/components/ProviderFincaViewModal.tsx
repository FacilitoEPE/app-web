import { LandPlot, Sprout, X } from "lucide-react";
import AppModal from "@/shared/components/AppModal";
import { InfoField } from "@/shared/components/InfoField";
import ModalSection from "@/shared/components/ModalSection";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/lib/utils";
import type { Finca } from "@/modules/providers/providerFinca.utils";

const number = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 7 });
const NOT_REGISTERED = "No registrado";

interface ProviderFincaViewModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Nombre del proveedor dueño de la finca, se muestra bajo el título */
    providerName: string;
    finca: Finca | null;
}

/** Detalle de solo lectura de una finca: todos los datos que la tabla resume, en los mismos bloques del registro. */
export default function ProviderFincaViewModal({ open, onOpenChange, providerName, finca }: ProviderFincaViewModalProps) {
    if (!finca) return null;

    const cultivos = finca.cultivos ?? [];
    const totalVariedades = cultivos.reduce((sum, cultivo) => sum + cultivo.variedades.length, 0);

    return (
        <AppModal
            open={open}
            onOpenChange={onOpenChange}
            icon={<LandPlot size={22} strokeWidth={2} />}
            title="Detalle de la finca"
            description={`${finca.nombre} · ${providerName}`}
            size="xl"
            footer={
                <Button variant="outline" size="xl" onClick={() => onOpenChange(false)}>
                    <X size={20} strokeWidth={2.5} /> Cerrar
                </Button>
            }
        >
            <div className="flex flex-col gap-6">
                <ModalSection title="Identificación de la finca">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
                        <InfoField label="Nombre de la finca" value={finca.nombre} className="sm:col-span-6" />
                        <InfoField label="Código de lugar de producción SENASA" value={finca.codigoSenasa || NOT_REGISTERED} className="sm:col-span-3" />
                        <InfoField label="Código catastral" value={finca.codigoCatastral || NOT_REGISTERED} className="sm:col-span-3" />
                    </div>
                </ModalSection>

                <ModalSection title="Ubicación">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
                        <InfoField label="Departamento" value={finca.departamento} className="sm:col-span-2" />
                        <InfoField label="Provincia" value={finca.provincia} className="sm:col-span-2" />
                        <InfoField label="Distrito" value={finca.distrito} className="sm:col-span-2" />
                        <InfoField label="Latitud" value={finca.latitud === null ? NOT_REGISTERED : number.format(finca.latitud)} className="sm:col-span-3" />
                        <InfoField label="Longitud" value={finca.longitud === null ? NOT_REGISTERED : number.format(finca.longitud)} className="sm:col-span-3" />
                    </div>
                </ModalSection>

                <ModalSection title="Producción">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
                        <InfoField label="Hectáreas totales" value={number.format(finca.haTotal)} suffix="ha" className="sm:col-span-2" />
                        <InfoField label="Hectáreas de cultivo" value={number.format(finca.haCultivo)} suffix="ha" className="sm:col-span-2" />
                        <InfoField
                            label="Edad del cultivo"
                            value={finca.edadCultivo === null || finca.edadCultivo === undefined ? NOT_REGISTERED : number.format(finca.edadCultivo)}
                            suffix={finca.edadCultivo === null || finca.edadCultivo === undefined ? undefined : "años"}
                            className="sm:col-span-2"
                        />
                        <InfoField
                            className="sm:col-span-6"
                            variant="plain"
                            label={<>Cultivos{cultivos.length > 0 && <span className="ml-1.5 normal-case tracking-normal text-ink-muted/80">· {cultivos.length} {cultivos.length === 1 ? "fruta" : "frutas"}, {totalVariedades} {totalVariedades === 1 ? "variedad" : "variedades"}</span>}</>}
                            value={cultivos.length > 0 ? (
                                <div className={cn("grid gap-3", cultivos.length > 1 && "sm:grid-cols-2")}>
                                    {cultivos.map((cultivo) => (
                                        <section key={cultivo.fruta} aria-label={`Cultivo ${cultivo.fruta}`} className="flex flex-col gap-2.5 rounded-xl border border-border/60 bg-card p-3.5">
                                            <header className="flex items-center justify-between gap-2">
                                                <h4 className="flex items-center gap-2 text-[13.5px] font-bold text-ink">
                                                    <span className="flex size-7 items-center justify-center rounded-full bg-brand-surface text-brand">
                                                        <Sprout size={15} strokeWidth={2.4} aria-hidden="true" />
                                                    </span>
                                                    {cultivo.fruta}
                                                </h4>
                                                <span className="text-[11.5px] font-medium text-ink-muted">
                                                    {cultivo.variedades.length} {cultivo.variedades.length === 1 ? "variedad" : "variedades"}
                                                </span>
                                            </header>
                                            <div className="flex flex-wrap gap-1.5">
                                                {cultivo.variedades.map((variedad) => (
                                                    <span key={variedad} className="rounded-full bg-brand-surface px-2.5 py-1 text-[12px] font-semibold text-brand">{variedad}</span>
                                                ))}
                                            </div>
                                        </section>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-ink-muted">Sin cultivos registrados.</p>
                            )}
                        />
                    </div>
                </ModalSection>
            </div>
        </AppModal>
    );
}
