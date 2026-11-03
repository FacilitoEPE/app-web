import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ClipboardCheck, PackageX, Scale, Truck } from "lucide-react";
import LogisticsCampaignContextBanner from "@/modules/logistics/components/LogisticsCampaignContextBanner";
import LogisticsArrivalModal from "@/modules/logistics/components/LogisticsArrivalModal";
import { LogisticsDiscardModal, LogisticsEvaluationForm, LogisticsUnloadingModal } from "@/modules/logistics/components/LogisticsReceptionForms";
import { useLogisticsLoads } from "@/modules/logistics/logistics.store";
import { formatLogisticsDateTime, logisticsLoadKg } from "@/modules/logistics/logistics.utils";
import { InfoField } from "@/shared/components/InfoField";
import { PageError } from "@/shared/components/PageState";
import { Card } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import PageHeader from "@/shared/layout/PageHeader";
import { formatKg } from "@/shared/utils/format";

export default function LogisticsReceptionPage() {
    const navigate = useNavigate();
    const { campaignId, loadId } = useParams<{ campaignId: string; loadId: string }>();
    const backHref = `/logistica-despacho/${campaignId}`;
    const load = useLogisticsLoads().find(item => item.id === loadId && item.campaniaId === Number(campaignId));
    const [unloadingOpen, setUnloadingOpen] = useState(false);
    const [discardOpen, setDiscardOpen] = useState(false);
    const [arrivalOpen, setArrivalOpen] = useState(false);
    if (!load) return <PageError title="Carga no encontrada" message="No se encontró esta carga en la campaña." back={{ to: backHref, label: "Volver a cargas" }} />;
    const reception = load.recepcion;
    const locked = load.documentosCierre.cierreAdministrativoConfirmado;
    const difference = reception.pesoRecibidoPlanta > 0 ? logisticsLoadKg(load) - reception.pesoRecibidoPlanta : null;
    const discardPercent = reception.huboDescarte && logisticsLoadKg(load) > 0
        ? 100 * reception.kilosDescarte / logisticsLoadKg(load) : null;
    return <div className="px-4 py-5 sm:px-8 lg:px-14">
        <LogisticsCampaignContextBanner load={load} caption="Recepción y calidad" />
        <PageHeader icon={<ClipboardCheck size={24} />} title="Recepción y calidad"
            description={`${load.codigo} · ${load.cliente} · ${load.placa} · ${load.chofer}. Registra la descarga, evaluación y descarte de esta carga.`} />
        {locked && <p className="mb-4 text-sm text-ink-muted">El cierre administrativo bloquea cambios en la recepción de esta carga.</p>}
        <Card className="mb-4 gap-4 p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold text-ink">Coordinación y llegada</h2><p className="text-sm text-ink-muted">Ventana de atención y llegada a planta.</p></div>
            <Button variant="outline" disabled={locked} onClick={() => setArrivalOpen(true)}>{load.llegada?.llegadaReal ? "Editar llegada" : "Registrar llegada"}</Button></div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <InfoField label="Llegada estimada" value={formatLogisticsDateTime(load.llegada?.llegadaEstimada)} />
                <InfoField label="Inicio de atención" value={formatLogisticsDateTime(load.llegada?.ventanaInicio)} />
                <InfoField label="Fin de atención" value={formatLogisticsDateTime(load.llegada?.ventanaFin)} />
                <InfoField label="Llegada real" value={formatLogisticsDateTime(load.llegada?.llegadaReal)} />
                <InfoField label="Observaciones" value={load.llegada?.observaciones || "—"} multiline />
                <InfoField label="Evidencia de coordinación" value={load.llegada?.evidencia?.name || "Sin documento"} />
                <InfoField label="Nueva atención prevista" value={formatLogisticsDateTime(load.llegada?.atencionReprogramada)} />
            </div>
            {load.llegada?.motivoEspera && <p className="rounded-xl border border-status-highlight-border bg-status-highlight-surface px-4 py-3 text-sm text-ink-body">En espera: {load.llegada.motivoEspera}. Nueva atención: {formatLogisticsDateTime(load.llegada.atencionReprogramada)}.</p>}
        </Card>
        <div className="grid gap-4 xl:grid-cols-3">
            <Card className="gap-4 p-5 sm:p-6"><div className="flex items-center gap-2"><Truck size={20} className="text-brand" /><h2 className="text-lg font-bold text-ink">A. Descarga</h2></div>
                <div className="grid gap-3"><InfoField label="Inicio" value={formatLogisticsDateTime(reception.inicioDescarga)} />
                    <InfoField label="Término" value={formatLogisticsDateTime(reception.terminoDescarga)} />
                    <InfoField label="Responsable" value={reception.responsableRecepcion || "—"} />
                    <InfoField label="Observaciones" value={reception.observacionesDescarga || "—"} multiline /></div>
                <Button variant="outline" disabled={locked} onClick={() => setUnloadingOpen(true)}>{reception.inicioDescarga ? "Editar descarga" : "Registrar descarga"}</Button>
            </Card>
            <Card className="gap-4 p-5 sm:p-6 xl:col-span-2"><div className="flex items-center gap-2"><Scale size={20} className="text-brand" /><h2 className="text-lg font-bold text-ink">B. Evaluación de carga</h2></div>
                <LogisticsEvaluationForm key={`${load.id}:${reception.pesoRecibidoPlanta}:${reception.resultadoRecepcion}`} load={load} locked={locked} />
            </Card>
            <Card className="gap-4 p-5 sm:p-6 xl:col-span-3"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><PackageX size={20} className="text-brand" /><h2 className="text-lg font-bold text-ink">C. Descarte</h2></div>
                    <Button variant="outline" disabled={locked || !reception.pesoRecibidoPlanta || !reception.resultadoRecepcion} onClick={() => setDiscardOpen(true)}>{reception.huboDescarte ? "Editar descarte" : "Registrar descarte"}</Button></div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><InfoField label="Cantidad descartada" value={reception.huboDescarte ? `${formatKg(reception.kilosDescarte)} kg` : "Sin descarte registrado"} />
                    <InfoField label="Porcentaje sobre peso de origen" value={discardPercent === null ? "—" : `${discardPercent.toFixed(2)} %`} />
                    <InfoField label="Motivo" value={reception.motivoDescarte || "—"} multiline />
                    <InfoField label="Evidencia" value={reception.actaDescarteArchivo?.name || "Sin documento"} /></div>
            </Card>
        </div>
        {difference !== null && <p className="mt-4 rounded-xl border border-border bg-muted px-4 py-3 text-sm text-ink-body">Peso de origen {formatKg(logisticsLoadKg(load))} kg − peso en planta {formatKg(reception.pesoRecibidoPlanta)} kg = <strong>{formatKg(difference)} kg</strong>. La diferencia no implica descarte.</p>}
        <div className="mt-6"><Button variant="outline" onClick={() => navigate(backHref)}>Volver a cargas</Button></div>
        {unloadingOpen && <LogisticsUnloadingModal load={load} onClose={() => setUnloadingOpen(false)} />}
        {discardOpen && <LogisticsDiscardModal load={load} onClose={() => setDiscardOpen(false)} />}
        {arrivalOpen && <LogisticsArrivalModal load={load} onClose={() => setArrivalOpen(false)} />}
    </div>;
}
