import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, CheckCircle2, FileCheck2, Package, Pencil, Scale, Truck, Users } from "lucide-react";
import type { QualityDeliveryLoadItem, QualitySunatRemissionGuide } from "@/modules/quality/qualityOperations.models";
import { saveQualityRemissionGuide } from "@/modules/quality/qualityOperations.store";
import { qualityGuideNormOptions } from "@/modules/quality/api/quality-commands.api";
import { qualityGuideStandardText } from "@/modules/quality/qualityGuideNorms.utils";
import QualityRemissionGuideModal from "@/modules/quality/components/QualityRemissionGuideModal";
import EntityOverviewCard from "@/shared/components/EntityOverviewCard";
import { InfoField } from "@/shared/components/InfoField";
import MetricCards from "@/shared/components/MetricCards";
import { Card } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import PageHeader from "@/shared/layout/PageHeader";
import { formatDisplayDate, formatKg } from "@/shared/utils/format";

interface Props { load: QualityDeliveryLoadItem; guide: QualitySunatRemissionGuide; backHref: string }

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
    return <Card className="gap-4 p-5 sm:p-6"><h2 className="text-lg font-bold text-ink">{title}</h2>{children}</Card>;
}

const dateOrDash = (value: string) => value ? formatDisplayDate(value) : "—";

export default function QualityGuideDetailView({ load, guide, backHref }: Props) {
    const navigate = useNavigate();
    const [editing, setEditing] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState("");
    const normLabels = new Map(qualityGuideNormOptions().map(norm => [norm.id, norm.label]));
    const allocated = guide.proveedoresIncluidos.reduce((sum, id) => sum + (guide.kilosPorProveedor?.[id]
        ?? load.proveedoresCarga.find(provider => provider.proveedorId === id)?.kilosCargados ?? 0), 0);
    const totalKg = load.proveedoresCarga.reduce((sum, provider) => sum + provider.kilosCargados, 0);
    const assignedKg = load.guiasRemision.reduce((sum, item) => sum + item.proveedoresIncluidos.reduce((subtotal, id) => subtotal
        + (item.kilosPorProveedor?.[id] ?? load.proveedoresCarga.find(provider => provider.proveedorId === id)?.kilosCargados ?? 0), 0), 0);
    const pending = load.guiasRemision.filter(item => item.estado !== "Generada");
    const canGenerate = pending.length > 0 && Math.abs(totalKg - assignedKg) <= 0.01 && pending.every(item => item.estado === "Lista para generar");
    const generate = async () => {
        if (!canGenerate || generating) return;
        setGenerating(true);
        setError("");
        try {
            for (const item of pending) await saveQualityRemissionGuide(load.id, { ...item, estado: "Generada" });
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : "No se pudieron generar las guías.");
        } finally {
            setGenerating(false);
        }
    };

    return <div className="px-4 py-5 sm:px-8 lg:px-14">
        <PageHeader icon={<FileCheck2 size={24} />} title="Detalle de la guía de remisión"
            description={`${guide.numeroGuia} · ${load.codigoCarga} · ${load.cliente}`}
            action={guide.estado !== "Generada" ? <>
                <Button size="xl" variant="outline" onClick={() => setEditing(true)}><Pencil size={18} />Editar guía</Button>
                {canGenerate && <Button size="xl" disabled={generating} onClick={() => void generate()}><CheckCircle2 size={18} />Generar guías ({pending.length})</Button>}
            </> : undefined} />
        {error && <p role="alert" className="mb-4 text-sm text-destructive">{error}</p>}
        <div className="mb-6 grid gap-4 lg:grid-cols-[1.95fr_1fr]">
            <EntityOverviewCard avatar={<FileCheck2 />} eyebrow="Guía de remisión" title={guide.numeroGuia}
                watermark={FileCheck2} chips={[{ icon: <Package />, label: load.codigoCarga }, { icon: <Truck />, label: load.transportista }]}
                details={[
                    { icon: <FileCheck2 />, label: "Estado", value: guide.estado },
                    { icon: <CalendarDays />, label: "Inicio de traslado", value: dateOrDash(guide.fechaInicioTraslado) },
                    { icon: <Users />, label: "Proveedores", value: guide.proveedoresIncluidos.length },
                    { icon: <Package />, label: "Carga", value: load.codigoCarga },
                ]} />
            <MetricCards label="Resumen de la guía" metrics={[
                { title: "Peso bruto", value: formatKg(guide.pesoBrutoTotalKg), unit: "kg", description: "Peso declarado", icon: Scale },
                { title: "Fruta asignada", value: formatKg(allocated), unit: "kg", description: "Suma de proveedores", icon: Package },
                { title: "Bultos", value: String(guide.numeroBultos), unit: "", description: "Bultos declarados", icon: Package },
                { title: "Proveedores", value: String(guide.proveedoresIncluidos.length), unit: "", description: "Incluidos en la guía", icon: Users },
            ]} />
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
            <DetailSection title="Proveedores de esta guía">
                <div className="grid gap-3">
                    {guide.proveedoresIncluidos.map(id => {
                        const provider = load.proveedoresCarga.find(row => row.proveedorId === id);
                        return provider && <div key={id} className="grid gap-2 rounded-xl border border-border p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                            <div><p className="font-semibold text-ink">{provider.proveedorNombre}</p><p className="text-xs text-ink-muted">{provider.fincaNombre} · {provider.rol} · Fruta {provider.tipoFruta.toLowerCase()}</p></div>
                            <strong className="text-ink">{formatKg(guide.kilosPorProveedor?.[id] ?? provider.kilosCargados)} kg</strong>
                        </div>;
                    })}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                    <InfoField label="Rol de origen" value={guide.rolOrigen} />
                    <InfoField label="Tipo de fruta" value={guide.tipoFruta} />
                </div>
            </DetailSection>
            <DetailSection title="Datos del traslado">
                <div className="grid gap-4 sm:grid-cols-2">
                    <InfoField label="Número de guía electrónica" value={guide.numeroGuia} />
                    <InfoField label="Fecha de inicio de traslado" value={dateOrDash(guide.fechaInicioTraslado)} />
                    <InfoField label="Fecha de entrega al transportista" value={dateOrDash(guide.fechaEntregaTransportista)} />
                    <InfoField label="Unidad de medida" value={guide.unidadMedida} />
                    <InfoField label="Peso bruto total" value={`${formatKg(guide.pesoBrutoTotalKg)} kg`} />
                    <InfoField label="Número de bultos" value={guide.numeroBultos} />
                </div>
            </DetailSection>
            <DetailSection title="Datos del transportista">
                <div className="grid gap-4 sm:grid-cols-2">
                    <InfoField label="RUC del transportista" value={guide.transportistaRuc || "—"} />
                    <InfoField label="Denominación o razón social" value={guide.transportistaDenominacion || "—"} />
                    <InfoField label="Registro MTC (condicional)" value={guide.transportistaMtc || "No registrado"} />
                    <InfoField label="Placa del vehículo principal" value={guide.vehiculoPlaca || "—"} />
                </div>
            </DetailSection>
            <DetailSection title="Datos del conductor">
                <div className="grid gap-4 sm:grid-cols-2">
                    <InfoField label="Tipo de documento" value={guide.conductorTipoDoc} />
                    <InfoField label="Número de documento" value={guide.conductorNumeroDoc || "—"} />
                    <InfoField label="Nombres" value={guide.conductorNombres || "—"} />
                    <InfoField label="Apellidos" value={guide.conductorApellidos || "—"} />
                    <InfoField label="Licencia de conducir" value={guide.conductorLicencia || "—"} />
                </div>
            </DetailSection>
            <DetailSection title="Punto de partida">
                <div className="grid gap-4 sm:grid-cols-2">
                    <InfoField label="UBIGEO de partida" value={guide.ubigeoPartida || "—"} />
                    <InfoField label="Código de establecimiento SUNAT" value={guide.codEstablecimientoPartida || "—"} />
                    <InfoField label="Dirección de partida" value={guide.direccionPartida || "—"} multiline className="sm:col-span-2" />
                </div>
            </DetailSection>
            <DetailSection title="Punto de llegada">
                <div className="grid gap-4 sm:grid-cols-2">
                    <InfoField label="UBIGEO de llegada" value={guide.ubigeoLlegada || "—"} />
                    <InfoField label="Código de establecimiento SUNAT" value={guide.codEstablecimientoLlegada || "—"} />
                    <InfoField label="Dirección de llegada" value={guide.direccionLlegada || "—"} multiline className="sm:col-span-2" />
                </div>
            </DetailSection>
            <DetailSection title="Normas y observaciones">
                {guide.tipoFruta === "Orgánica" && <div className="grid gap-4">
                    <InfoField label="Normas seleccionadas" value={guide.normasSeleccionadas.length ? guide.normasSeleccionadas.map(code => normLabels.get(code) ?? code).join(" · ") : "Ninguna"} multiline />
                    <InfoField label="Texto de la norma" value={qualityGuideStandardText(guide.normasSeleccionadas) || "—"} multiline />
                </div>}
                <InfoField label="Observaciones" value={guide.observacionesSunat || "No registradas"} multiline />
            </DetailSection>
        </div>
        <div className="mt-6"><Button variant="outline" onClick={() => navigate(backHref)}>Volver a guías de la carga</Button></div>
        {editing && <QualityRemissionGuideModal open onOpenChange={setEditing} load={load} editingGuide={guide} onSave={saveQualityRemissionGuide} />}
    </div>;
}
