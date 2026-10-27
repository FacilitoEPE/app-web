import { useEffect, useState } from "react";
import { ClipboardCheck, Save, Sprout, X } from "lucide-react";
import AppModal from "@/shared/components/AppModal";
import FileDropzone from "@/shared/components/FileDropzone";
import FormField from "@/shared/components/FormField";
import { SummaryBar } from "@/shared/components/InfoField";
import InputField from "@/shared/components/InputField";
import ModalSection from "@/shared/components/ModalSection";
import SegmentedControl from "@/shared/components/SegmentedControl";
import { Button } from "@/shared/components/ui/button";
import { Switch } from "@/shared/components/ui/switch";
import { Textarea } from "@/shared/components/ui/textarea";
import type { FileSource } from "@/shared/utils/fileSource";
import { formatKg } from "@/shared/utils/format";
import type {
    LogisticsLoad,
    LogisticsProviderBreakdown,
    LogisticsReceptionData,
} from "@/modules/logistics/logistics.demo";

interface LogisticsReceptionQualityModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    load: LogisticsLoad | null;
    onSave: (
        loadId: string,
        recepcion: LogisticsReceptionData,
        proveedores: LogisticsProviderBreakdown[],
    ) => void;
}

export default function LogisticsReceptionQualityModal({
    open,
    onOpenChange,
    load,
    onSave,
}: LogisticsReceptionQualityModalProps) {
    // Bloque A: Descarga
    const [inicioDescarga, setInicioDescarga] = useState("");
    const [terminoDescarga, setTerminoDescarga] = useState("");
    const [responsableRecepcion, setResponsableRecepcion] = useState("");
    const [observacionesDescarga, setObservacionesDescarga] = useState("");

    // Bloque B: Evaluación de carga
    const [pesoRecibidoPlanta, setPesoRecibidoPlanta] = useState("");
    const [resultadoRecepcion, setResultadoRecepcion] =
        useState<LogisticsReceptionData["resultadoRecepcion"]>("Aceptada");
    const [calidadRecepcion, setCalidadRecepcion] = useState("");
    const [reporteRecepcionArchivo, setReporteRecepcionArchivo] = useState<FileSource | null>(null);
    const [observacionesEvaluacion, setObservacionesEvaluacion] = useState("");

    // Bloque C: Descarte
    const [huboDescarte, setHuboDescarte] = useState(false);
    const [kilosDescarte, setKilosDescarte] = useState("");
    const [destinoDescarte, setDestinoDescarte] = useState("");
    const [motivoDescarte, setMotivoDescarte] = useState("");
    const [actaDescarteArchivo, setActaDescarteArchivo] = useState<FileSource | null>(null);

    // Desglose por proveedor
    const [proveedores, setProveedores] = useState<LogisticsProviderBreakdown[]>([]);

    useEffect(() => {
        if (!load || !open) return;
        const r = load.recepcion;
        setInicioDescarga(r.inicioDescarga);
        setTerminoDescarga(r.terminoDescarga);
        setResponsableRecepcion(r.responsableRecepcion);
        setObservacionesDescarga(r.observacionesDescarga);
        setPesoRecibidoPlanta(String(r.pesoRecibidoPlanta || ""));
        setResultadoRecepcion(r.resultadoRecepcion);
        setCalidadRecepcion(r.calidadRecepcion);
        setReporteRecepcionArchivo(r.reporteRecepcionArchivo);
        setObservacionesEvaluacion(r.observacionesEvaluacion);
        setHuboDescarte(r.huboDescarte);
        setKilosDescarte(String(r.kilosDescarte || ""));
        setDestinoDescarte(r.destinoDescarte);
        setMotivoDescarte(r.motivoDescarte);
        setActaDescarteArchivo(r.actaDescarteArchivo);
        setProveedores(load.proveedores.map((p) => ({ ...p })));
    }, [load, open]);

    if (!load) return null;

    const totalCargados = proveedores.reduce((s, p) => s + p.kilosCargados, 0);
    const totalDesglosadoPlanta = proveedores.reduce(
        (s, p) => s + (Number(p.kilosRecibidosPlanta) || 0),
        0,
    );

    const handleSubmit = () => {
        onSave(
            load.id,
            {
                inicioDescarga,
                terminoDescarga,
                responsableRecepcion: responsableRecepcion.trim(),
                observacionesDescarga: observacionesDescarga.trim(),
                pesoRecibidoPlanta: Number(pesoRecibidoPlanta) || totalDesglosadoPlanta,
                resultadoRecepcion,
                calidadRecepcion: calidadRecepcion.trim(),
                reporteRecepcionArchivo,
                observacionesEvaluacion: observacionesEvaluacion.trim(),
                huboDescarte,
                kilosDescarte: huboDescarte ? Number(kilosDescarte) || 0 : 0,
                destinoDescarte: huboDescarte ? destinoDescarte.trim() : "",
                motivoDescarte: huboDescarte ? motivoDescarte.trim() : "",
                actaDescarteArchivo: huboDescarte ? actaDescarteArchivo : null,
            },
            proveedores,
        );
        onOpenChange(false);
    };

    return (
        <AppModal
            open={open}
            onOpenChange={onOpenChange}
            icon={<ClipboardCheck size={22} strokeWidth={2.2} />}
            title="Recepción y calidad en planta"
            description={`${load.codigo} · ${load.cliente} · Destino: ${load.destino}`}
            size="2xl"
            footer={
                <>
                    <Button variant="outline" size="xl" onClick={() => onOpenChange(false)}>
                        <X size={18} strokeWidth={2.5} /> Cancelar
                    </Button>
                    <Button size="xl" onClick={handleSubmit}>
                        <Save size={18} strokeWidth={2.5} /> Guardar recepción y calidad
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-6">
                <SummaryBar
                    items={[
                        { label: "Kilos cargados en campo", value: `${formatKg(totalCargados)} kg` },
                        {
                            label: "Peso recibido en planta",
                            value: `${formatKg(Number(pesoRecibidoPlanta) || totalDesglosadoPlanta)} kg`,
                            tone: "brand",
                        },
                        {
                            label: "Fruta de descarte",
                            value: huboDescarte ? `${formatKg(Number(kilosDescarte) || 0)} kg` : "0 kg",
                            tone: huboDescarte ? "highlight" : undefined,
                        },
                    ]}
                />

                {/* BLOQUE A: DESCARGA */}
                <ModalSection title="Bloque A · Horario y responsable de descarga">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <InputField
                            id="rec-inicio"
                            type="datetime-local"
                            label="Inicio de descarga"
                            required
                            value={inicioDescarga}
                            onChange={setInicioDescarga}
                        />
                        <InputField
                            id="rec-termino"
                            type="datetime-local"
                            label="Término de descarga"
                            required
                            value={terminoDescarga}
                            onChange={setTerminoDescarga}
                        />
                        <InputField
                            id="rec-responsable"
                            label="Responsable de recepción"
                            required
                            placeholder="Nombre del jefe de recepción"
                            value={responsableRecepcion}
                            onChange={setResponsableRecepcion}
                        />
                        <FormField
                            id="rec-obs-descarga"
                            label="Observaciones de descarga"
                            optional
                            className="sm:col-span-3"
                        >
                            <Textarea
                                id="rec-obs-descarga"
                                rows={2}
                                placeholder="Rampa asignada, condiciones del contenedor o furgón..."
                                value={observacionesDescarga}
                                onChange={(e) => setObservacionesDescarga(e.target.value)}
                            />
                        </FormField>
                    </div>
                </ModalSection>

                {/* BLOQUE B: EVALUACIÓN DE CARGA */}
                <ModalSection title="Bloque B · Evaluación de carga y calidad en planta">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
                        <InputField
                            id="rec-peso-planta"
                            label="Peso recibido en planta"
                            required
                            step="1"
                            min={0}
                            unit="kg"
                            value={pesoRecibidoPlanta}
                            onChange={setPesoRecibidoPlanta}
                            className="sm:col-span-2"
                        />
                        <FormField label="Resultado de recepción" required className="sm:col-span-4">
                            <SegmentedControl
                                options={[
                                    { label: "Aceptada", value: "Aceptada" },
                                    { label: "Con observaciones", value: "Aceptada con observaciones" },
                                    { label: "Rechazada", value: "Rechazada" },
                                ]}
                                value={resultadoRecepcion}
                                onChange={(next) =>
                                    setResultadoRecepcion(next as LogisticsReceptionData["resultadoRecepcion"])
                                }
                            />
                        </FormField>
                        <InputField
                            id="rec-calidad"
                            label="Calidad en recepción (Brix, firmeza, materia seca, calibre)"
                            placeholder="Ej. Brix 8.4° · Firmeza óptima · Calibre 14-18"
                            value={calidadRecepcion}
                            onChange={setCalidadRecepcion}
                            className="sm:col-span-6"
                        />
                        <div className="sm:col-span-6">
                            <FileDropzone
                                label="Reporte de recepción en planta"
                                file={reporteRecepcionArchivo}
                                onChange={(f) => setReporteRecepcionArchivo(f)}
                                variant="horizontal"
                                replaceable
                            />
                        </div>
                        <FormField
                            id="rec-obs-eval"
                            label="Observaciones de evaluación"
                            optional
                            className="sm:col-span-6"
                        >
                            <Textarea
                                id="rec-obs-eval"
                                rows={2}
                                value={observacionesEvaluacion}
                                onChange={(e) => setObservacionesEvaluacion(e.target.value)}
                            />
                        </FormField>
                    </div>
                </ModalSection>

                {/* BLOQUE C: DESCARTE */}
                <ModalSection title="Bloque C · Control de fruta de descarte">
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between rounded-xl border border-border bg-surface-page/50 px-4 py-3">
                            <div>
                                <p className="text-[13.5px] font-bold text-ink">
                                    ¿Se registró fruta de descarte en la recepción?
                                </p>
                                <p className="text-[12px] font-medium text-ink-muted">
                                    Actívalo si hubo merma o rechazo parcial para adjuntar el acta correspondiente.
                                </p>
                            </div>
                            <Switch checked={huboDescarte} onCheckedChange={setHuboDescarte} />
                        </div>

                        {huboDescarte && (
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
                                <InputField
                                    id="rec-kg-descarte"
                                    label="Kilos de descarte"
                                    required
                                    step="1"
                                    min={0}
                                    unit="kg"
                                    value={kilosDescarte}
                                    onChange={setKilosDescarte}
                                    className="sm:col-span-2"
                                />
                                <InputField
                                    id="rec-destino-descarte"
                                    label="Destino o manejo del descarte"
                                    required
                                    placeholder="Ej. Devolución a productor / Cámara de reproceso"
                                    value={destinoDescarte}
                                    onChange={setDestinoDescarte}
                                    className="sm:col-span-4"
                                />
                                <InputField
                                    id="rec-motivo-descarte"
                                    label="Motivo del descarte"
                                    required
                                    placeholder="Ej. Mancha de látex, daño mecánico, bajo calibre..."
                                    value={motivoDescarte}
                                    onChange={setMotivoDescarte}
                                    className="sm:col-span-6"
                                />
                                <div className="sm:col-span-6">
                                    <FileDropzone
                                        label="Acta o evidencia de descarte"
                                        file={actaDescarteArchivo}
                                        onChange={(f) => setActaDescarteArchivo(f)}
                                        variant="horizontal"
                                        replaceable
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </ModalSection>

                {/* DESGLOSE DE KILOS RECIBIDOS POR PROVEEDOR */}
                <ModalSection
                    title="Desglose de kilos recibidos en planta por proveedor"
                    aside={`Suma desglosada: ${formatKg(totalDesglosadoPlanta)} kg`}
                >
                    <div className="flex flex-col gap-3">
                        {proveedores.map((prov, idx) => (
                            <div
                                key={prov.proveedorId}
                                className="grid grid-cols-1 items-center gap-3 rounded-xl border border-border bg-surface-page/40 p-3.5 sm:grid-cols-12"
                            >
                                <div className="flex items-center gap-2.5 sm:col-span-5">
                                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-surface text-brand">
                                        <Sprout size={15} strokeWidth={2.3} />
                                    </span>
                                    <div className="min-w-0">
                                        <p className="truncate text-[13.5px] font-bold text-ink">
                                            {prov.proveedorNombre}
                                        </p>
                                        <p className="text-[11.5px] font-medium text-ink-muted">
                                            {prov.fincaNombre} · Variedad {prov.variedad}
                                        </p>
                                    </div>
                                </div>
                                <div className="sm:col-span-3">
                                    <span className="block text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                                        Cargado en campo
                                    </span>
                                    <span className="text-[13.5px] font-bold text-ink">
                                        {formatKg(prov.kilosCargados)} kg
                                    </span>
                                </div>
                                <div className="sm:col-span-4">
                                    <InputField
                                        id={`rec-prov-planta-${idx}`}
                                        label="Kilos recibidos en planta"
                                        variant="compact"
                                        step="1"
                                        min={0}
                                        unit="kg"
                                        value={String(prov.kilosRecibidosPlanta)}
                                        onChange={(val) =>
                                            setProveedores((current) =>
                                                current.map((item, i) =>
                                                    i === idx
                                                        ? { ...item, kilosRecibidosPlanta: Number(val) || 0 }
                                                        : item,
                                                ),
                                            )
                                        }
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </ModalSection>
            </div>
        </AppModal>
    );
}
