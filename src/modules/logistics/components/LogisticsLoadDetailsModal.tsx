import { Eye, Sprout, X } from "lucide-react";
import AppModal from "@/shared/components/AppModal";
import DispatchStepProgress from "@/shared/components/DispatchStepProgress";
import FileDropzone from "@/shared/components/FileDropzone";
import { InfoField, SummaryBar } from "@/shared/components/InfoField";
import ModalSection from "@/shared/components/ModalSection";
import StatusBadge from "@/shared/components/StatusBadge";
import { Button } from "@/shared/components/ui/button";
import { formatDisplayDate, formatKg } from "@/shared/utils/format";
import type { LogisticsLoad } from "@/modules/logistics/logistics.demo";

interface LogisticsLoadDetailsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    load: LogisticsLoad | null;
}

export default function LogisticsLoadDetailsModal({
    open,
    onOpenChange,
    load,
}: LogisticsLoadDetailsModalProps) {
    if (!load) return null;

    const totalCargados = load.proveedores.reduce((s, p) => s + p.kilosCargados, 0);
    const totalRecibidos =
        load.recepcion.pesoRecibidoPlanta ||
        load.proveedores.reduce((s, p) => s + p.kilosRecibidosPlanta, 0);

    return (
        <AppModal
            open={open}
            onOpenChange={onOpenChange}
            icon={<Eye size={22} strokeWidth={2.2} />}
            title="Consulta de entrega y despacho"
            description={`${load.codigo} · ${load.campaniaNombre} · Cliente: ${load.cliente}`}
            size="2xl"
            footer={
                <Button variant="outline" size="xl" onClick={() => onOpenChange(false)}>
                    <X size={18} strokeWidth={2.5} /> Cerrar
                </Button>
            }
        >
            <div className="flex flex-col gap-6">
                <SummaryBar
                    items={[
                        { label: "Kilos programados", value: `${formatKg(load.kilosProgramados)} kg` },
                        { label: "Kilos cargados", value: `${formatKg(totalCargados)} kg`, tone: "brand" },
                        { label: "Kilos en planta", value: `${formatKg(totalRecibidos)} kg`, tone: "highlight" },
                    ]}
                />

                <ModalSection
                    title="Estado actual del despacho del chofer"
                    aside={<StatusBadge status={load.etapaDespacho} />}
                >
                    <DispatchStepProgress stage={load.etapaDespacho} variant="full" />
                    <InfoField label="Último reporte en ruta" value={load.ultimoReporte} />
                </ModalSection>

                <ModalSection title="Datos de la entrega y transporte">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <InfoField label="Cliente / Contrato" value={`${load.cliente} (${load.contratoRef})`} />
                        <InfoField label="Canal" value={load.canal} />
                        <InfoField label="Fecha de carga" value={formatDisplayDate(load.fechaCarga)} />
                        <InfoField label="Origen" value={load.origen} className="sm:col-span-2" />
                        <InfoField label="Destino" value={load.destino} />
                        <InfoField label="Empresa de transporte" value={load.transportista} />
                        <InfoField label="Camión / Placa" value={load.placa} />
                        <InfoField label="Chofer asignado" value={`${load.chofer} · Lic. ${load.licencia}`} />
                    </div>
                </ModalSection>

                <ModalSection
                    title="Detalle de carga por proveedor"
                    aside={`${load.proveedores.length} proveedor(es)`}
                >
                    <div className="flex flex-col gap-3">
                        {load.proveedores.map((prov) => (
                            <div
                                key={prov.proveedorId}
                                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface-page/50 p-3.5"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="flex size-9 items-center justify-center rounded-full bg-brand-surface text-brand">
                                        <Sprout size={17} strokeWidth={2.3} />
                                    </span>
                                    <div>
                                        <p className="text-[13.5px] font-bold text-ink">{prov.proveedorNombre}</p>
                                        <p className="text-[12px] font-medium text-ink-muted">
                                            {prov.tipo} · {prov.fincaNombre} · Variedad {prov.variedad}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-[12px] font-bold">
                                    <span className="rounded-lg border border-border bg-card px-2.5 py-1 text-ink">
                                        Cargado: {formatKg(prov.kilosCargados)} kg
                                    </span>
                                    <span className="rounded-lg border border-brand-border bg-brand-surface px-2.5 py-1 text-brand">
                                        Planta: {formatKg(prov.kilosRecibidosPlanta)} kg
                                    </span>
                                    <span className="rounded-lg border border-border bg-card px-2.5 py-1 text-ink-muted">
                                        Jabas: {prov.jabasCargadas} ({prov.jabasVacias} vacías)
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </ModalSection>

                <ModalSection
                    title="Recepción en planta y evaluación"
                    aside={<StatusBadge status={load.recepcion.resultadoRecepcion} />}
                >
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <InfoField
                            label="Responsable de recepción"
                            value={load.recepcion.responsableRecepcion || "Pendiente de registro"}
                        />
                        <InfoField
                            label="Peso recibido en planta"
                            value={`${formatKg(load.recepcion.pesoRecibidoPlanta)} kg`}
                        />
                        <InfoField
                            label="Fruta de descarte"
                            value={
                                load.recepcion.huboDescarte
                                    ? `${formatKg(load.recepcion.kilosDescarte)} kg (${load.recepcion.motivoDescarte})`
                                    : "Sin descarte"
                            }
                        />
                        <InfoField
                            label="Calidad en recepción"
                            value={load.recepcion.calidadRecepcion || "Sin evaluación registrada"}
                            className="sm:col-span-3"
                        />
                    </div>
                </ModalSection>

                <ModalSection title="Documentación y cierres">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <InfoField
                            label="Cierre físico"
                            variant="plain"
                            value={
                                <StatusBadge
                                    status={
                                        load.documentosCierre.cierreFisicoConfirmado
                                            ? "Cierre físico"
                                            : "Pendiente"
                                    }
                                />
                            }
                        />
                        <InfoField
                            label="Cierre administrativo"
                            variant="plain"
                            value={
                                <StatusBadge
                                    status={
                                        load.documentosCierre.cierreAdministrativoConfirmado
                                            ? "Cierre administrativo"
                                            : "Pendiente"
                                    }
                                />
                            }
                        />
                        <FileDropzone
                            label="Guía de remisión de fruta"
                            file={load.documentosCierre.guiaRemisionFruta}
                            onChange={() => {}}
                            readOnly
                            variant="horizontal"
                        />
                        <FileDropzone
                            label="Reporte de recepción en planta"
                            file={load.documentosCierre.reporteRecepcionPlanta}
                            onChange={() => {}}
                            readOnly
                            variant="horizontal"
                        />
                    </div>
                </ModalSection>
            </div>
        </AppModal>
    );
}
