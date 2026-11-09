import { ShieldCheck, X } from "lucide-react";
import type { ReactNode } from "react";
import AppModal from "@/shared/components/AppModal";
import FileDropzone from "@/shared/components/FileDropzone";
import { InfoField } from "@/shared/components/InfoField";
import ModalSection from "@/shared/components/ModalSection";
import RemovableChip from "@/shared/components/RemovableChip";
import StatusBadge from "@/shared/components/StatusBadge";
import { Button } from "@/shared/components/ui/button";
import {
    displayCertDate,
    getEstadoPago,
    getKilosAmpliados,
    getKilosTotales,
    getMonedaSymbol,
    getSaldoPendiente,
    getTotalPagado,
    getTramiteLabel,
    getVigenciaAutomatica,
    type CertificadoCampanaLocal,
} from "@/modules/campaigns/campaignCertificate.utils";
import { formatKg, formatMoney } from "@/shared/utils/format";

interface CampaignCertificationViewModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    certificate: CertificadoCampanaLocal | null;
}

/** Detalle de solo lectura de una certificación: todo lo que la tabla resume, más sus movimientos. */
export default function CampaignCertificationViewModal({ open, onOpenChange, certificate }: CampaignCertificationViewModalProps) {
    if (!certificate) return null;

    const symbol = getMonedaSymbol(certificate.moneda);
    const hasPeriod = certificate.validoDesde && certificate.validoHasta;

    return (
        <AppModal
            open={open}
            onOpenChange={onOpenChange}
            icon={<ShieldCheck size={22} strokeWidth={2} />}
            title="Detalle de la Certificación"
            description={certificate.nombre}
            size="xl"
            footer={
                <Button variant="outline" size="xl" onClick={() => onOpenChange(false)}>
                    <X size={20} strokeWidth={2.5} /> Cerrar
                </Button>
            }
        >
            <div className="flex flex-col gap-6">
                <ModalSection title="Datos de la certificación">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <InfoField label="Tipo de certificación" value={certificate.tipo} />
                        <InfoField label="Nombre del certificado" value={certificate.nombre} />
                        <InfoField label="Organismo emisor" value={certificate.organismoEmisor} />
                        <InfoField
                            label="Periodo de vigencia"
                            value={hasPeriod ? `${displayCertDate(certificate.validoDesde)} – ${displayCertDate(certificate.validoHasta)}` : "Sin periodo definido"}
                        />
                        <InfoField label="Estado de vigencia" variant="plain" value={<StatusBadge status={getVigenciaAutomatica(certificate.validoDesde, certificate.validoHasta)} />} />
                        <InfoField label="Estado del trámite" variant="plain" value={<StatusBadge status={getTramiteLabel(certificate.estadoTramite)} />} />
                        <InfoField label="Costo" value={`${symbol} ${formatMoney(certificate.costo)}`} />
                        <InfoField label="Pagado" value={`${symbol} ${formatMoney(getTotalPagado(certificate))}`} />
                        <InfoField label="Estado del pago" variant="plain" value={<StatusBadge status={getEstadoPago(certificate)} />} />
                        <InfoField label="Kilos iniciales" value={formatKg(certificate.kilosIniciales)} suffix="kg" />
                        <InfoField label="Ampliaciones" value={formatKg(getKilosAmpliados(certificate))} suffix="kg" />
                        <InfoField label="Total actual" value={formatKg(getKilosTotales(certificate))} suffix="kg" />
                        {certificate.observaciones && <InfoField label="Observaciones" multiline value={certificate.observaciones} className="sm:col-span-3" />}
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <FileDropzone label="Documento del certificado" hasColon={false} variant="horizontal" file={certificate.documento} readOnly onChange={() => undefined} />
                        <FileDropzone label="Documento de cotización" hasColon={false} variant="horizontal" file={certificate.cotizacion} readOnly onChange={() => undefined} />
                    </div>
                </ModalSection>

                {(certificate.ampliaciones.length > 0 || certificate.pagos.length > 0) && (
                    <ModalSection title="Movimientos">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <MovementList
                                title="Historial de ampliaciones"
                                empty="Sin ampliaciones"
                                items={certificate.ampliaciones.map((item) => ({
                                    id: item.id,
                                    main: `+ ${formatKg(item.kilos)} kg`,
                                    meta: [displayCertDate(item.fecha), item.referencia].filter(Boolean).join(" · "),
                                }))}
                            />
                            <MovementList
                                title="Historial de pagos"
                                empty={`Saldo pendiente: ${symbol} ${formatMoney(getSaldoPendiente(certificate))}`}
                                items={certificate.pagos.map((item) => ({
                                    id: item.id,
                                    main: `${symbol} ${formatMoney(item.monto)}`,
                                    meta: [displayCertDate(item.fecha), item.referencia].filter(Boolean).join(" · "),
                                    attachment: item.evidencia && <FileDropzone label="Evidencia del pago" variant="horizontal" hasColon={false} file={item.evidencia} readOnly onChange={() => undefined} />,
                                }))}
                            />
                        </div>
                    </ModalSection>
                )}

                <ModalSection title="Productores cubiertos" aside={certificate.productores.length > 0 ? certificate.productores.length : undefined}>
                    {certificate.productores.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {certificate.productores.map((producer) => (
                                <RemovableChip key={producer.id} dot label={producer.nombre} className="max-w-52" />
                            ))}
                        </div>
                    ) : (
                        <p className="text-[13px] text-ink-muted">Sin productores asignados.</p>
                    )}
                </ModalSection>
            </div>
        </AppModal>
    );
}

function MovementList({ title, items, empty }: { title: string; items: { id: number; main: string; meta: string; attachment?: ReactNode }[]; empty: string }) {
    return (
        <InfoField
            label={title}
            variant="plain"
            value={items.length === 0 ? (
                <p className="text-ink-muted">{empty}</p>
            ) : (
                <ul className="flex max-h-32 flex-col gap-1.5 overflow-y-auto">
                    {items.map((item) => (
                        <li key={item.id} className="rounded-lg border border-border/60 bg-card px-3 py-2">
                            <div className="flex items-baseline justify-between gap-3">
                                <span className="font-bold tabular-nums">{item.main}</span>
                                <span className="truncate text-[11.5px] text-ink-muted">{item.meta}</span>
                            </div>
                            {item.attachment && <div className="mt-2">{item.attachment}</div>}
                        </li>
                    ))}
                </ul>
            )}
        />
    );
}
