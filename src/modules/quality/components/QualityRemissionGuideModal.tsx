import { createGuideDraft } from '@/modules/quality/remissionGuide.utils';
import { useState } from "react";
import {
    CheckCircle2,
    FileCheck2,
    MapPin,
    Save,
    ShieldCheck,
    Sprout,
    Truck,
    UserRound,
    X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import AppModal from "@/shared/components/AppModal";
import FormField from "@/shared/components/FormField";
import { SummaryBar } from "@/shared/components/InfoField";
import InputField from "@/shared/components/InputField";
import ModalSection from "@/shared/components/ModalSection";
import { Button } from "@/shared/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Textarea } from "@/shared/components/ui/textarea";
import { useResetOnToggle } from "@/shared/hooks/useModalForm";
import { formatKg } from "@/shared/utils/format";
import {
    ORGANIC_NORMS_CATALOG,
    SUNAT_UBIGEO_CATALOG,
    type QualityDeliveryLoadItem,
    type QualitySunatRemissionGuide,
} from "@/modules/quality/qualityOperations.models";

interface QualityRemissionGuideModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    load: QualityDeliveryLoadItem | null;
    editingGuide: QualitySunatRemissionGuide | null;
    onSave: (loadId: string, guide: QualitySunatRemissionGuide) => void;
}

export default function QualityRemissionGuideModal({
    open,
    onOpenChange,
    load,
    editingGuide,
    onSave,
}: QualityRemissionGuideModalProps) {
    const [numeroGuia, setNumeroGuia] = useState("");
    const [rolOrigen, setRolOrigen] = useState<"Productor" | "Acopiador">("Productor");
    const [tipoFruta, setTipoFruta] = useState<"Orgánica" | "Convencional">("Orgánica");
    const [fechaInicioTraslado, setFechaInicioTraslado] = useState("");
    const [fechaEntregaTransportista, setFechaEntregaTransportista] = useState("");
    const [pesoBrutoTotalKg, setPesoBrutoTotalKg] = useState("");
    const [numeroBultos, setNumeroBultos] = useState("");

    const [transportistaRuc, setTransportistaRuc] = useState("");
    const [transportistaDenominacion, setTransportistaDenominacion] = useState("");
    const [transportistaMtc, setTransportistaMtc] = useState("");
    const [vehiculoPlaca, setVehiculoPlaca] = useState("");

    const [conductorTipoDoc, setConductorTipoDoc] = useState<"DNI" | "CE">("DNI");
    const [conductorNumeroDoc, setConductorNumeroDoc] = useState("");
    const [conductorNombres, setConductorNombres] = useState("");
    const [conductorApellidos, setConductorApellidos] = useState("");
    const [conductorLicencia, setConductorLicencia] = useState("");

    const [ubigeoPartida, setUbigeoPartida] = useState("");
    const [direccionPartida, setDireccionPartida] = useState("");
    const [codEstablecimientoPartida, setCodEstablecimientoPartida] = useState("");

    const [ubigeoLlegada, setUbigeoLlegada] = useState("");
    const [direccionLlegada, setDireccionLlegada] = useState("");
    const [codEstablecimientoLlegada, setCodEstablecimientoLlegada] = useState("");

    const [codigoProducto, setCodigoProducto] = useState("");
    const [descripcionProducto, setDescripcionProducto] = useState("");
    const [normasSeleccionadas, setNormasSeleccionadas] = useState<string[]>([]);
    const [observacionesSunat, setObservacionesSunat] = useState("");

    useResetOnToggle(open, () => {
        if (!load) return;
        const guide = editingGuide ?? createGuideDraft(load);
        setNumeroGuia(guide.numeroGuia);
        setRolOrigen(guide.rolOrigen);
        setTipoFruta(guide.tipoFruta);
        setFechaInicioTraslado(guide.fechaInicioTraslado);
        setFechaEntregaTransportista(guide.fechaEntregaTransportista);
        setPesoBrutoTotalKg(String(guide.pesoBrutoTotalKg));
        setNumeroBultos(String(guide.numeroBultos));
        setTransportistaRuc(guide.transportistaRuc);
        setTransportistaDenominacion(guide.transportistaDenominacion);
        setTransportistaMtc(guide.transportistaMtc);
        setVehiculoPlaca(guide.vehiculoPlaca);
        setConductorTipoDoc(guide.conductorTipoDoc);
        setConductorNumeroDoc(guide.conductorNumeroDoc);
        setConductorNombres(guide.conductorNombres);
        setConductorApellidos(guide.conductorApellidos);
        setConductorLicencia(guide.conductorLicencia);
        setUbigeoPartida(guide.ubigeoPartida);
        setDireccionPartida(guide.direccionPartida);
        setCodEstablecimientoPartida(guide.codEstablecimientoPartida);
        setUbigeoLlegada(guide.ubigeoLlegada);
        setDireccionLlegada(guide.direccionLlegada);
        setCodEstablecimientoLlegada(guide.codEstablecimientoLlegada);
        setCodigoProducto(guide.codigoProducto);
        setDescripcionProducto(guide.descripcionProducto);
        setNormasSeleccionadas(guide.normasSeleccionadas);
        setObservacionesSunat(guide.observacionesSunat);
    });

    if (!load) return null;

    const toggleNorma = (id: string) => {
        setNormasSeleccionadas((current) =>
            current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
        );
    };

    const autoCertText = ORGANIC_NORMS_CATALOG.filter((n) => normasSeleccionadas.includes(n.id))
        .map((n) => n.certText)
        .join(" | ");

    const saveWithStatus = async (estado: QualitySunatRemissionGuide["estado"]) => {
        const guide: QualitySunatRemissionGuide = {
            id: editingGuide?.id ?? `guia-${Date.now()}`,
            numeroGuia,
            estado,
            proveedoresIncluidos: editingGuide?.proveedoresIncluidos ?? [...new Set(load.proveedoresCarga.map((p) => p.proveedorId))],
            rolOrigen,
            tipoFruta,
            fechaInicioTraslado,
            fechaEntregaTransportista,
            pesoBrutoTotalKg: Number(pesoBrutoTotalKg) || 0,
            unidadMedida: "KGM",
            numeroBultos: Number(numeroBultos) || 0,
            transportistaRuc,
            transportistaDenominacion,
            transportistaMtc,
            vehiculoPlaca,
            conductorTipoDoc,
            conductorNumeroDoc,
            conductorNombres,
            conductorApellidos,
            conductorLicencia,
            ubigeoPartida,
            direccionPartida,
            codEstablecimientoPartida,
            ubigeoLlegada,
            direccionLlegada,
            codEstablecimientoLlegada,
            codigoProducto,
            descripcionProducto,
            normasSeleccionadas,
            observacionesSunat: autoCertText
                ? `${observacionesSunat} · ${autoCertText}`
                : observacionesSunat,
        };
        await onSave(load.id, guide);
        onOpenChange(false);
    };

    return (
        <AppModal
            open={open}
            onOpenChange={onOpenChange}
            icon={<FileCheck2 size={22} strokeWidth={2.2} />}
            title={`Preparar guía de remisión SUNAT · ${numeroGuia}`}
            description={`Carga ${load.codigoCarga} · ${load.cliente}`}
            size="xl"
            footer={
                <>
                    <Button variant="outline" size="xl" onClick={() => onOpenChange(false)}>
                        <X size={18} /> Cancelar
                    </Button>
                    <Button
                        variant="outline"
                        size="xl"
                        onClick={() => saveWithStatus("Lista para generar")}
                    >
                        <Save size={18} /> Guardar borrador SUNAT
                    </Button>
                    <Button size="xl" onClick={() => saveWithStatus("Generada")}>
                        <CheckCircle2 size={18} /> Emitir Guía Electrónica SUNAT
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-6">
                <SummaryBar
                    items={[
                        {
                            label: "Serie y correlativo SUNAT",
                            value: numeroGuia,
                            tone: "brand",
                        },
                        {
                            label: "Peso bruto total (KGM)",
                            value: `${formatKg(Number(pesoBrutoTotalKg) || 0)} kg`,
                        },
                        {
                            label: "Número de bultos",
                            value: `${numeroBultos} envases`,
                        },
                        {
                            label: "Condición de fruta",
                            value: `${tipoFruta} (${rolOrigen})`,
                            tone: "brand",
                        },
                    ]}
                />

                {/* 1. Proveedores de esta guía */}
                <ModalSection
                    title="1. Proveedores de esta guía"
                    aside="Productores o acopiadores incluidos"
                >
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <InputField
                            id="rg-num-guia"
                            label="Número de guía electrónica"
                            required
                            value={numeroGuia}
                            onChange={setNumeroGuia}
                        />
                        <FormField label="Rol de origen" required>
                            <Select
                                value={rolOrigen}
                                onValueChange={(v) => setRolOrigen((v ?? "Productor") as "Productor" | "Acopiador")}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Productor">Productor</SelectItem>
                                    <SelectItem value="Acopiador">Acopiador</SelectItem>
                                </SelectContent>
                            </Select>
                        </FormField>
                        <FormField label="Tipo de fruta" required>
                            <Select
                                value={tipoFruta}
                                onValueChange={(v) => setTipoFruta((v ?? "Orgánica") as "Orgánica" | "Convencional")}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Orgánica">Orgánica</SelectItem>
                                    <SelectItem value="Convencional">Convencional</SelectItem>
                                </SelectContent>
                            </Select>
                        </FormField>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {load.proveedoresCarga.map((p) => (
                            <span
                                key={p.proveedorId}
                                className="inline-flex items-center gap-1.5 rounded-full border border-brand-border bg-brand-surface px-3 py-1 text-[12.5px] font-bold text-brand"
                            >
                                <Sprout size={13} />
                                {p.proveedorNombre} ({formatKg(p.kilosCargados)} kg · {p.fincaNombre})
                            </span>
                        ))}
                    </div>
                </ModalSection>

                {/* 2. Datos del traslado */}
                <ModalSection
                    title="2. Datos del traslado (Unidad de medida KGM)"
                    aside="Fechas oficiales y peso bruto"
                >
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                        <InputField
                            id="rg-fecha-inicio"
                            label="Fecha de inicio de traslado"
                            type="date"
                            required
                            value={fechaInicioTraslado}
                            onChange={setFechaInicioTraslado}
                        />
                        <InputField
                            id="rg-fecha-entrega"
                            label="Fecha entrega al transportista"
                            type="date"
                            required
                            value={fechaEntregaTransportista}
                            onChange={setFechaEntregaTransportista}
                        />
                        <InputField
                            id="rg-peso-bruto"
                            label="Peso bruto total (KGM)"
                            type="number"
                            required
                            value={pesoBrutoTotalKg}
                            onChange={setPesoBrutoTotalKg}
                        />
                        <InputField
                            id="rg-num-bultos"
                            label="Número de bultos"
                            type="number"
                            required
                            value={numeroBultos}
                            onChange={setNumeroBultos}
                        />
                    </div>
                </ModalSection>

                {/* 3. Datos del transportista */}
                <ModalSection
                    title="3. Datos del transportista"
                    aside="RUC, denominación, MTC y placa"
                >
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                        <InputField
                            id="rg-trans-ruc"
                            label="RUC Transportista"
                            required
                            value={transportistaRuc}
                            onChange={setTransportistaRuc}
                        />
                        <InputField
                            id="rg-trans-denom"
                            label="Denominación o razón social"
                            required
                            value={transportistaDenominacion}
                            onChange={setTransportistaDenominacion}
                        />
                        <InputField
                            id="rg-trans-mtc"
                            label="Registro MTC"
                            required
                            value={transportistaMtc}
                            onChange={setTransportistaMtc}
                        />
                        <InputField
                            id="rg-trans-placa"
                            label="Placa vehículo principal"
                            required
                            value={vehiculoPlaca}
                            onChange={(v) => setVehiculoPlaca(v.toUpperCase())}
                        />
                    </div>
                </ModalSection>

                {/* 4. Datos del conductor */}
                <ModalSection
                    title="4. Datos del conductor"
                    aside="Identificación y licencia MTC"
                >
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
                        <FormField label="Tipo doc." required>
                            <Select
                                value={conductorTipoDoc}
                                onValueChange={(v) => setConductorTipoDoc((v ?? "DNI") as "DNI" | "CE")}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="DNI">DNI</SelectItem>
                                    <SelectItem value="CE">Carné Extranjería</SelectItem>
                                </SelectContent>
                            </Select>
                        </FormField>
                        <InputField
                            id="rg-cond-doc"
                            label="Número documento"
                            required
                            value={conductorNumeroDoc}
                            onChange={setConductorNumeroDoc}
                        />
                        <InputField
                            id="rg-cond-nom"
                            label="Nombres"
                            required
                            value={conductorNombres}
                            onChange={setConductorNombres}
                        />
                        <InputField
                            id="rg-cond-ape"
                            label="Apellidos"
                            required
                            value={conductorApellidos}
                            onChange={setConductorApellidos}
                        />
                        <InputField
                            id="rg-cond-lic"
                            label="Licencia de conducir"
                            required
                            value={conductorLicencia}
                            onChange={setConductorLicencia}
                        />
                    </div>
                </ModalSection>

                {/* 5 y 6. Punto de partida y Punto de llegada con UBIGEO de 6 dígitos */}
                <ModalSection
                    title="5 y 6. Punto de partida y Punto de llegada (Catálogo UBIGEO 6 dígitos SUNAT)"
                    aside="UBIGEO 6 dígitos y establecimiento"
                >
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <div className="flex flex-col gap-3 rounded-2xl border border-border p-4">
                            <p className="inline-flex items-center gap-1.5 text-[13.5px] font-bold text-ink">
                                <MapPin size={15} className="text-brand" /> 5. Punto de partida (Origen)
                            </p>
                            <FormField label="UBIGEO de 6 dígitos (Partida)" required>
                                <Select value={ubigeoPartida} onValueChange={(v) => setUbigeoPartida(v ?? "200109")}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {SUNAT_UBIGEO_CATALOG.map((u) => (
                                            <SelectItem key={u.codigo} value={u.codigo}>
                                                {u.codigo} — {u.distrito}, {u.provincia} ({u.departamento})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </FormField>
                            <InputField
                                id="rg-dir-partida"
                                label="Dirección del punto de partida"
                                required
                                value={direccionPartida}
                                onChange={setDireccionPartida}
                            />
                            <InputField
                                id="rg-est-partida"
                                label="Código establecimiento SUNAT (4 dígitos)"
                                value={codEstablecimientoPartida}
                                onChange={setCodEstablecimientoPartida}
                            />
                        </div>

                        <div className="flex flex-col gap-3 rounded-2xl border border-border p-4">
                            <p className="inline-flex items-center gap-1.5 text-[13.5px] font-bold text-ink">
                                <Truck size={15} className="text-brand" /> 6. Punto de llegada (Planta / Destino)
                            </p>
                            <FormField label="UBIGEO de 6 dígitos (Llegada)" required>
                                <Select value={ubigeoLlegada} onValueChange={(v) => setUbigeoLlegada(v ?? "200601")}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {SUNAT_UBIGEO_CATALOG.map((u) => (
                                            <SelectItem key={u.codigo} value={u.codigo}>
                                                {u.codigo} — {u.distrito}, {u.provincia} ({u.departamento})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </FormField>
                            <InputField
                                id="rg-dir-llegada"
                                label="Dirección del punto de llegada"
                                required
                                value={direccionLlegada}
                                onChange={setDireccionLlegada}
                            />
                            <InputField
                                id="rg-est-llegada"
                                label="Código establecimiento SUNAT (4 dígitos)"
                                value={codEstablecimientoLlegada}
                                onChange={setCodEstablecimientoLlegada}
                            />
                        </div>
                    </div>
                </ModalSection>

                {/* 7. Bienes transportados */}
                <ModalSection
                    title="7. Bienes transportados"
                    aside="Código interno y descripción"
                >
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <InputField
                            id="rg-cod-prod"
                            label="Código del producto"
                            required
                            value={codigoProducto}
                            onChange={setCodigoProducto}
                        />
                        <div className="sm:col-span-2">
                            <InputField
                                id="rg-desc-prod"
                                label="Descripción detallada del bien"
                                required
                                value={descripcionProducto}
                                onChange={setDescripcionProducto}
                            />
                        </div>
                    </div>
                </ModalSection>

                {/* 8. Normas y observaciones */}
                <ModalSection
                    title="8. Normas de certificación orgánica y observaciones SUNAT"
                    aside="Glosa automática en la guía"
                >
                    {tipoFruta === "Orgánica" && (
                        <div className="flex flex-wrap gap-2">
                            {ORGANIC_NORMS_CATALOG.map((norm) => {
                                const selected = normasSeleccionadas.includes(norm.id);
                                return (
                                    <button
                                        key={norm.id}
                                        type="button"
                                        onClick={() => toggleNorma(norm.id)}
                                        className={cn(
                                            "inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[12.5px] font-bold transition-all cursor-pointer",
                                            selected
                                                ? "border-brand bg-brand-surface text-brand"
                                                : "border-border bg-card text-ink-muted hover:text-ink",
                                        )}
                                    >
                                        <ShieldCheck size={14} />
                                        {norm.label}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {autoCertText && (
                        <div className="rounded-xl border border-brand-border/60 bg-brand-surface/35 p-3 text-[12px] font-semibold text-brand">
                            Glosa de certificación generada: {autoCertText}
                        </div>
                    )}

                    <FormField label="Observaciones adicionales de la Guía de Remisión">
                        <Textarea
                            value={observacionesSunat}
                            onChange={(e) => setObservacionesSunat(e.target.value)}
                            placeholder="Precintos, código SENASA o notas de trazabilidad..."
                        />
                    </FormField>
                </ModalSection>

                <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-muted/20 px-4 py-2.5 text-[12px] text-ink-muted">
                    <UserRound size={14} className="text-brand" />
                    <span>
                        Formato electrónico alineado con el estándar UBL 2.1 SUNAT para Guía de Remisión Remitente
                        (Serie EG07).
                    </span>
                </div>
            </div>
        </AppModal>
    );
}
