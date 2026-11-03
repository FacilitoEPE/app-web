import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Layers } from "lucide-react";
import LogisticsCampaignContextBanner from "@/modules/logistics/components/LogisticsCampaignContextBanner";
import LogisticsCrateReturnModal from "@/modules/logistics/components/LogisticsCrateReturnModal";
import { useLogisticsLoads } from "@/modules/logistics/logistics.store";
import { formatLogisticsDateTime, logisticsCrateBalance } from "@/modules/logistics/logistics.utils";
import { InfoField } from "@/shared/components/InfoField";
import { PageError } from "@/shared/components/PageState";
import { Card } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import PageHeader from "@/shared/layout/PageHeader";
import { formatDisplayDate } from "@/shared/utils/format";

export default function LogisticsCratesPage() {
    const navigate = useNavigate();
    const { campaignId, loadId } = useParams<{ campaignId: string; loadId: string }>();
    const backHref = `/logistica-despacho/${campaignId}`;
    const load = useLogisticsLoads().find(item => item.id === loadId && item.campaniaId === Number(campaignId));
    const [open, setOpen] = useState(false);
    if (!load) return <PageError title="Carga no encontrada" message="No se encontró esta carga en la campaña." back={{ to: backHref, label: "Volver a cargas" }} />;
    const crates = load.devolucionJabas;
    const locked = load.documentosCierre.cierreAdministrativoConfirmado;
    const balance = logisticsCrateBalance(load);
    return <div className="px-4 py-5 sm:px-8 lg:px-14">
        <LogisticsCampaignContextBanner load={load} caption="Jabas y salida" />
        <PageHeader icon={<Layers size={24} />} title="Jabas y salida del vehículo"
            description={`${load.codigo} · ${load.transportista} (${load.placa}). Conciliar las jabas y documentar la salida son hechos separados.`}
            action={<Button size="xl" disabled={locked} onClick={() => setOpen(true)}><Layers size={18} />{crates?.fechaDevolucion ? "Editar devolución" : "Registrar devolución"}</Button>} />
        {locked && <p className="mb-4 text-sm text-ink-muted">El cierre administrativo bloquea cambios en la devolución de jabas.</p>}
        <Card className="gap-5 p-5 sm:p-6"><h2 className="text-lg font-bold text-ink">Balance de jabas y salida</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <InfoField label="Jabas que llegaron" value={crates?.jabasIniciales ?? "—"} />
                <InfoField label="Jabas devueltas" value={crates?.jabasDevueltas ?? "—"} />
                <InfoField label="Saldo pendiente" value={balance ?? "No calculado"} />
                <InfoField label="Fecha de devolución" value={formatDisplayDate(crates?.fechaDevolucion)} />
                <InfoField label="Coordinación con planta" value={crates?.coordinacion || "—"} multiline />
                <InfoField label="Salida del vehículo" value={formatLogisticsDateTime(crates?.salidaVehiculo)} />
                <InfoField label="Copia al transportista" value={crates?.copiaTransportista ? "Entregada" : "Pendiente"} />
                <InfoField label="Constancia o evidencia" value={crates?.evidencia?.name || "Sin documento"} />
            </div>
            {balance !== null && balance > 0 && crates?.salidaVehiculo && <p className="rounded-xl border border-status-highlight-border bg-status-highlight-surface px-4 py-3 text-sm text-ink-body">El vehículo salió con {balance} jabas pendientes de devolución.</p>}
        </Card>
        <p className="mt-4 text-sm text-ink-muted">La salida del vehículo, la devolución completa de jabas y el cierre documental se registran por separado.</p>
        <div className="mt-6"><Button variant="outline" onClick={() => navigate(backHref)}>Volver a cargas</Button></div>
        {open && <LogisticsCrateReturnModal load={load} onClose={() => setOpen(false)} />}
    </div>;
}
