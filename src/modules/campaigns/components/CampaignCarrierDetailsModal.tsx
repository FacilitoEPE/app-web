import { Truck, UserRound, X } from "lucide-react";
import AppModal from "@/shared/components/AppModal";
import FileDropzone from "@/shared/components/FileDropzone";
import { InfoField, SummaryBar } from "@/shared/components/InfoField";
import ModalSection from "@/shared/components/ModalSection";
import StatusBadge from "@/shared/components/StatusBadge";
import { Button } from "@/shared/components/ui/button";
import { formatDisplayDate, formatMoney } from "@/shared/utils/format";
import { plural } from "@/shared/utils/plural";
import {
    CARRIER_TIPOS,
    carrierIdentification,
    carrierLocation,
    type CarrierProfile,
} from "@/modules/carriers/carrierProfile.utils";
import {
    getAgreementBalance,
    getAgreementStatus,
    type CampaignCarrierLink,
} from "@/modules/campaigns/campaignCarrier.utils";
import { getMonedaSymbol } from "@/modules/campaigns/campaignCertificate.utils";
import type { CarrierRequirementQuotation } from "@/modules/carriers/carrierQuotations.store";

const NOT_REGISTERED = "No registrado";

interface CampaignCarrierDetailsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    carrier: CarrierProfile | null;
    link: CampaignCarrierLink | null;
    campaignName: string;
    assignedUnitAndDriver?: string;
    quotation?: CarrierRequirementQuotation | null;
}

/**
 * Ficha detallada y jerárquica de un transportista vinculado a la campaña:
 * 1. Resumen superior métrico (tipo, acuerdo, montos, flota)
 * 2. Datos generales de la empresa/independiente (identificación, contacto, MTC, ubicación)
 * 3. Operación en esta campaña (fecha de vinculación, unidad/chofer asignado y cotización adjunta)
 * 4. Acuerdo de pago y comprobante de adelanto (si aplica)
 * 5. Flota y choferes disponibles registrados en su ficha
 */
export default function CampaignCarrierDetailsModal({
    open,
    onOpenChange,
    carrier,
    link,
    campaignName,
    assignedUnitAndDriver,
    quotation,
}: CampaignCarrierDetailsModalProps) {
    if (!carrier || !link) return null;

    const isPrivate = carrier.tipo === "privado";
    const { acuerdo } = link;
    const symbol = acuerdo ? getMonedaSymbol(acuerdo.moneda) : "S/";
    const balance = acuerdo ? getAgreementBalance(acuerdo.total, acuerdo.adelanto) : 0;
    const cotizacionFile = link.cotizacion ?? quotation?.documentoCotizacion ?? null;

    const summaryItems: Array<{ label: string; value: React.ReactNode; tone?: "brand" | "highlight" }> = [
        { label: "Tipo", value: CARRIER_TIPOS[carrier.tipo].short },
        { label: "Acuerdo", value: <StatusBadge status={getAgreementStatus(acuerdo)} /> },
    ];

    if (acuerdo) {
        summaryItems.push({
            label: "Total acordado",
            value: `${symbol} ${formatMoney(acuerdo.total)}`,
            tone: "brand" as const,
        });
        if (acuerdo.tipo === "adelanto" && acuerdo.adelanto !== null) {
            summaryItems.push({
                label: "Adelanto acordado",
                value: `${symbol} ${formatMoney(acuerdo.adelanto)}`,
            });
            summaryItems.push({
                label: "Saldo pactado al final",
                value: `${symbol} ${formatMoney(balance)}`,
                tone: acuerdo.saldoPagado ? ("brand" as const) : ("highlight" as const),
            });
        }
    } else {
        summaryItems.push({
            label: "Flota",
            value: `${carrier.vehiculos.length} veh. · ${carrier.choferes.length} chof.`,
        });
    }

    return (
        <AppModal
            open={open}
            onOpenChange={onOpenChange}
            icon={<Truck size={22} strokeWidth={2.25} />}
            title="Datos del transportista"
            description={`${carrier.nombre} · ${campaignName}`}
            size="xl"
            footer={
                <Button variant="outline" size="xl" onClick={() => onOpenChange(false)}>
                    <X size={20} strokeWidth={2.5} /> Cerrar
                </Button>
            }
        >
            <div className="flex flex-col gap-6">
                {/* Resumen métrico superior */}
                <SummaryBar items={summaryItems} />

                {/* 1. Datos del transportista */}
                <ModalSection title="Información del transportista">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <InfoField label="Tipo" value={CARRIER_TIPOS[carrier.tipo].label} />
                        <InfoField
                            label={isPrivate ? "Documento de identidad" : "RUC"}
                            value={(isPrivate ? carrier.documento : carrier.ruc) || carrierIdentification(carrier) || NOT_REGISTERED}
                        />
                        <InfoField label="MTC" value={carrier.mtc || NOT_REGISTERED} />
                        {isPrivate && <InfoField label="CGN" value={carrier.cgn || NOT_REGISTERED} />}
                        <InfoField label="Teléfono" value={carrier.numero || NOT_REGISTERED} />
                        <InfoField label="Correo" value={carrier.correo || NOT_REGISTERED} />
                        <InfoField
                            label="Ubicación"
                            value={carrierLocation(carrier) || NOT_REGISTERED}
                            className={isPrivate ? undefined : "lg:col-span-3"}
                        />
                    </div>
                </ModalSection>

                {/* 2. Participación en esta campaña */}
                <ModalSection title="En esta campaña">
                    <div className="flex flex-col gap-4">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <InfoField label="Fecha de vinculación" value={formatDisplayDate(link.fechaVinculacion)} />
                            <InfoField
                                label="Unidad y chofer asignados"
                                value={assignedUnitAndDriver || "Por asignar · Chofer pendiente"}
                            />
                        </div>

                        {cotizacionFile ? (
                            <FileDropzone
                                label="Cotización adjunta a la vinculación"
                                variant="horizontal"
                                hasColon={false}
                                file={cotizacionFile}
                                readOnly
                                onChange={() => undefined}
                            />
                        ) : (
                            <div className="flex h-11 items-center rounded-lg border border-border/60 bg-surface-page/50 px-3.5 text-[12.5px] text-ink-muted">
                                Sin documento de cotización adjunto
                            </div>
                        )}
                    </div>
                </ModalSection>

                {/* 3. Condiciones de pago */}
                <ModalSection
                    title="Acuerdo de pago"
                    aside={acuerdo ? getAgreementStatus(acuerdo) : "Sin registrar"}
                >
                    {acuerdo ? (
                        <div className="flex flex-col gap-4">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                <InfoField
                                    label="Tipo de pago"
                                    value={acuerdo.tipo === "adelanto" ? "Con adelanto" : "Pago único"}
                                />
                                <InfoField label="Moneda" value={acuerdo.moneda} />
                                <InfoField label="Total acordado" value={`${symbol} ${formatMoney(acuerdo.total)}`} />

                                {acuerdo.tipo === "adelanto" && acuerdo.adelanto !== null && (
                                    <>
                                        <InfoField label="Monto del adelanto acordado" value={`${symbol} ${formatMoney(acuerdo.adelanto)}`} />
                                        <InfoField label="Último desembolso" value={formatDisplayDate(acuerdo.fechaAdelanto)} />
                                        <InfoField
                                            label="Saldo pactado al final"
                                            value={`${symbol} ${formatMoney(balance)}`}
                                        />
                                    </>
                                )}

                                <InfoField
                                    label="Fecha de pago (final)"
                                    value={formatDisplayDate(acuerdo.fechaPago)}
                                    className={acuerdo.tipo === "unico" ? "sm:col-span-2 lg:col-span-3" : undefined}
                                />
                            </div>

                            {acuerdo.boleta && (
                                <FileDropzone
                                    label="Documento del acuerdo"
                                    variant="horizontal"
                                    hasColon={false}
                                    file={acuerdo.boleta}
                                    readOnly
                                    onChange={() => undefined}
                                />
                            )}
                        </div>
                    ) : (
                        <div className="flex h-12 items-center justify-center rounded-xl border border-dashed border-border bg-surface-page/40 px-4 text-[13px] text-ink-muted">
                            Aún no se ha registrado un acuerdo de pago para este transportista en la campaña.
                        </div>
                    )}
                </ModalSection>

                {/* 4. Flota y conductores registrados */}
                <ModalSection
                    title="Flota y conductores disponibles"
                    aside={`${plural(carrier.vehiculos.length, "vehículo", "vehículos")} · ${plural(carrier.choferes.length, "chofer", "choferes")}`}
                >
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {/* Vehículos */}
                        <div className="flex flex-col gap-2 rounded-xl border border-border/70 bg-surface-page/40 p-3.5">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
                                <Truck size={14} className="text-brand" />
                                Vehículos ({carrier.vehiculos.length})
                            </span>
                            {carrier.vehiculos.length > 0 ? (
                                <div className="flex flex-col gap-2 pt-1">
                                    {carrier.vehiculos.map((v) => (
                                        <div
                                            key={v.id}
                                            className="flex items-center justify-between rounded-lg border border-border/60 bg-card px-3 py-2 text-[12.5px]"
                                        >
                                            <span className="font-bold text-ink">{v.placa}</span>
                                            <span className="text-ink-muted font-medium tabular-nums">
                                                {v.volumen} m³ · {formatMoney(v.pesoBruto)} kg brut.
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-[12.5px] text-ink-muted py-2">Sin vehículos registrados.</p>
                            )}
                        </div>

                        {/* Choferes */}
                        <div className="flex flex-col gap-2 rounded-xl border border-border/70 bg-surface-page/40 p-3.5">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
                                <UserRound size={14} className="text-brand" />
                                Choferes ({carrier.choferes.length})
                            </span>
                            {carrier.choferes.length > 0 ? (
                                <div className="flex flex-col gap-2 pt-1">
                                    {carrier.choferes.map((d) => (
                                        <div
                                            key={d.id}
                                            className="flex items-center justify-between rounded-lg border border-border/60 bg-card px-3 py-2 text-[12.5px]"
                                        >
                                            <span className="font-bold text-ink">{d.nombre}</span>
                                            <span className="text-ink-muted font-medium tabular-nums">
                                                {d.telefono || d.correo || "Sin contacto"}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-[12.5px] text-ink-muted py-2">Sin choferes registrados.</p>
                            )}
                        </div>
                    </div>
                </ModalSection>
            </div>
        </AppModal>
    );
}
