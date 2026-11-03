import { qualityGuideNormOptions } from '@/modules/quality/api/quality-commands.api';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { createGuideDraft } from '@/modules/quality/remissionGuide.utils';
import { qualityGuideStandardText } from '@/modules/quality/qualityGuideNorms.utils';
import { useState } from "react";
import {
    FileCheck2,
    MapPin,
    Save,
    Sprout,
    Truck,
    X,
} from "lucide-react";
import AppModal from "@/shared/components/AppModal";
import FormField from "@/shared/components/FormField";
import InputField from "@/shared/components/InputField";
import ModalSection from "@/shared/components/ModalSection";
import { Button } from "@/shared/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Textarea } from "@/shared/components/ui/textarea";
import { useFormSubmit } from "@/shared/hooks/useFormSubmit";
import { useResetOnToggle } from "@/shared/hooks/useModalForm";
import { formatKg } from "@/shared/utils/format";
import {
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
    const norms = open ? qualityGuideNormOptions() : [];
    const [included, setIncluded] = useState<string[]>([]);
    const [kilosPorProveedor, setKilosPorProveedor] = useState<Record<string, number>>({});
    const [numeroGuia, setNumeroGuia] = useState("");
    const [fechaInicioTraslado, setFechaInicioTraslado] = useState("");
    const [fechaEntregaTransportista, setFechaEntregaTransportista] = useState("");
    const [pesoBrutoTotalKg, setPesoBrutoTotalKg] = useState("");
    const [numeroBultos, setNumeroBultos] = useState("");

    const [transportistaRuc, setTransportistaRuc] = useState("");
    const [transportistaDenominacion, setTransportistaDenominacion] = useState("");
    const [transportistaMtc, setTransportistaMtc] = useState("");
    const [vehiculoPlaca, setVehiculoPlaca] = useState("");

    const [conductorTipoDoc, setConductorTipoDoc] = useState<"DNI" | "CE" | "Pasaporte">("DNI");
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
    const [attemptedSave, setAttemptedSave] = useState(false);

    const [normasSeleccionadas, setNormasSeleccionadas] = useState<string[]>([]);
    const [observacionesSunat, setObservacionesSunat] = useState("");

    useResetOnToggle(open, () => {
        if (!load) return;
        const guide = editingGuide ?? createGuideDraft(load);
        const selected = editingGuide ? guide.proveedoresIncluidos : [];
        const allocations = editingGuide ? Object.fromEntries(selected.map(id => [id, guide.kilosPorProveedor?.[id] ?? load.proveedoresCarga.find(provider => provider.proveedorId === id)?.kilosCargados ?? 0])) : {};
        setIncluded(selected);
        setKilosPorProveedor(allocations);
        setNumeroGuia(guide.numeroGuia);
        setFechaInicioTraslado(guide.fechaInicioTraslado);
        setFechaEntregaTransportista(guide.fechaEntregaTransportista);
        setPesoBrutoTotalKg(editingGuide ? String(guide.pesoBrutoTotalKg) : "");
        const fullPackages = selected.every(id => allocations[id] === load.proveedoresCarga.find(provider => provider.proveedorId === id)?.kilosCargados);
        setNumeroBultos(editingGuide ? String(guide.numeroBultos) : fullPackages && selected.length > 0
            ? String(load.proveedoresCarga.filter(provider => selected.includes(provider.proveedorId)).reduce((sum, provider) =>
                sum + provider.jabasCargadas + provider.binesCargados + provider.mallasCargadas, 0))
            : "");
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
        setAttemptedSave(false);
        setNormasSeleccionadas(guide.normasSeleccionadas);
        setObservacionesSunat(guide.observacionesSunat);
    });

    const { errors, saving, submit } = useFormSubmit<QualitySunatRemissionGuide>({
        open, backendFields: {},
        validate: guide => {
            const errors: Record<string, string> = {};
            if (!guide.proveedoresIncluidos.length) errors._form = "Selecciona al menos un proveedor.";
            if (guide.proveedoresIncluidos.some(id => !Number.isFinite(guide.kilosPorProveedor?.[id]) || (guide.kilosPorProveedor?.[id] ?? 0) <= 0 || (guide.kilosPorProveedor?.[id] ?? 0) > remainingKg(id))) errors._form = "Asigna a cada proveedor kilos mayores que cero sin superar lo disponible entre guías.";
            if (!guide.numeroGuia.trim() || !guide.fechaInicioTraslado || !guide.direccionPartida.trim() || !guide.direccionLlegada.trim()) errors._form = "Completa el número, la fecha de inicio y las direcciones de traslado.";
            const netWeight = guide.proveedoresIncluidos.reduce((sum, id) => sum + (guide.kilosPorProveedor?.[id] ?? 0), 0);
            if (!Number.isFinite(guide.pesoBrutoTotalKg) || guide.pesoBrutoTotalKg < netWeight || netWeight <= 0) errors._form = "El peso bruto no puede ser menor que los kilos asignados de fruta.";
            if (!numeroBultos.trim() || !Number.isInteger(guide.numeroBultos) || guide.numeroBultos < 0) errors._form = "Ingresa el número de bultos de esta guía como entero no negativo.";
            if (!/^\d{6}$/.test(guide.ubigeoPartida) || !/^\d{6}$/.test(guide.ubigeoLlegada)) errors._form = "Selecciona los ubigeos de partida y llegada.";
            if (!/^\d{11}$/.test(guide.transportistaRuc)) errors._form = "El RUC del transportista debe tener 11 dígitos.";
            if (!guide.transportistaDenominacion.trim() || !guide.vehiculoPlaca.trim() || !guide.conductorNumeroDoc.trim() || !guide.conductorNombres.trim() || !guide.conductorApellidos.trim() || !guide.conductorLicencia.trim()) errors._form = "Completa los datos del transportista y del conductor.";
            return errors;
        },
        onSubmit: async guide => { if (!load) return; await onSave(load.id, guide); onOpenChange(false); },
    });
    if (!load) return null;
    const selectedProviders = load.proveedoresCarga.filter(provider => included.includes(provider.proveedorId));
    const rolOrigen = selectedProviders[0]?.rol ?? "Productor";
    const tipoFruta = load.scope === "exportador" || selectedProviders.some(provider => provider.tipoFruta === "Orgánica") ? "Orgánica" : "Convencional";
    const hasOrganic = tipoFruta === "Orgánica";

    function remainingKg(providerId: string) {
        const provider = load!.proveedoresCarga.find(row => row.proveedorId === providerId);
        if (!provider) return 0;
        const used = load!.guiasRemision.filter(item => item.id !== editingGuide?.id).reduce((sum, item) =>
            sum + (item.kilosPorProveedor?.[providerId] ?? (item.proveedoresIncluidos.includes(providerId) ? provider.kilosCargados : 0)), 0);
        return Math.max(0, provider.kilosCargados - used);
    }

    const toggleNorma = (id: string) => setNormasSeleccionadas(current =>
        current.includes(id) ? current.filter(item => item !== id) : [...current, id]);

    const saveDraft = async () => {
        setAttemptedSave(true);
        if (!/^\d{4}$/.test(codEstablecimientoPartida) || !/^\d{4}$/.test(codEstablecimientoLlegada)) return;
        const guide: QualitySunatRemissionGuide = {
            id: editingGuide?.id ?? `guia-${Date.now()}`,
            numeroGuia,
            estado: "Lista para generar",
            proveedoresIncluidos: included,
            kilosPorProveedor,
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
            normasSeleccionadas: hasOrganic ? normasSeleccionadas : [],
            observacionesSunat: load.scope === "industria" ? observacionesSunat : "",
        };
        await submit(guide);
    };

    return (
        <AppModal
            busy={saving}
            open={open}
            onOpenChange={onOpenChange}
            icon={<FileCheck2 size={22} strokeWidth={2.2} />}
            title={editingGuide ? "Editar guía de remisión" : "Agregar guía de remisión"}
            description={`Carga ${load.codigoCarga} · ${load.cliente}`}
            size="2xl"
            footer={
                <>
                    <Button variant="outline" size="xl" onClick={() => onOpenChange(false)}>
                        <X size={18} /> Cancelar
                    </Button>
                    <Button size="xl" disabled={saving} onClick={saveDraft}>
                        <Save size={18} /> Guardar guía
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-6">
                <FormField error={errors._form} />
                {/* 1. Proveedores de esta guía */}
                <ModalSection
                    title="Proveedores de esta guía"
                    aside="Distribuye los kilos disponibles"
                >
                    <div className="flex flex-col gap-2">
                        {load.proveedoresCarga.map((p) => (
                            <div
                                key={p.proveedorId}
                                className="grid items-center gap-3 rounded-xl border border-brand-border bg-brand-surface/40 px-3 py-2 sm:grid-cols-[minmax(0,1fr)_11rem]"
                            >
                                <label className="flex items-center gap-2 text-sm font-semibold text-ink">
                                <Checkbox disabled={remainingKg(p.proveedorId) <= 0 && !included.includes(p.proveedorId)} checked={included.includes(p.proveedorId)} onCheckedChange={checked => {
                                    const next = checked ? [...new Set([...included, p.proveedorId])] : included.filter(id => id !== p.proveedorId);
                                    setIncluded(next);
                                    const allocations = { ...kilosPorProveedor, [p.proveedorId]: 0 };
                                    setKilosPorProveedor(allocations);
                                    const kilos = next.reduce((sum, id) => sum + (allocations[id] || 0), 0);
                                    setPesoBrutoTotalKg(kilos > 0 ? String(kilos) : "");
                                    setNumeroBultos(next.length > 0 && next.every(id => allocations[id] === load.proveedoresCarga.find(row => row.proveedorId === id)?.kilosCargados)
                                        ? String(load.proveedoresCarga.filter(row => next.includes(row.proveedorId)).reduce((sum, row) =>
                                            sum + row.jabasCargadas + row.binesCargados + row.mallasCargadas, 0))
                                        : "");
                                }} />
                                <Sprout size={13} />
                                <span>{p.proveedorNombre} <span className="font-normal text-ink-muted">· {p.fincaNombre} · {p.rol} · {p.tipoFruta} · {formatKg(remainingKg(p.proveedorId))} kg disponibles</span></span>
                                </label>
                                <InputField id={`rg-provider-kg-${p.proveedorId}`} label="Kilos para esta guía" className="[&_[data-slot=field-label]]:sr-only" type="number" min={0} step="0.01" placeholder={`Máx. ${formatKg(remainingKg(p.proveedorId))} kg`} disabled={!included.includes(p.proveedorId)} value={included.includes(p.proveedorId) ? (kilosPorProveedor[p.proveedorId] ? String(kilosPorProveedor[p.proveedorId]) : "") : ""} onChange={value => {
                                    const allocations = { ...kilosPorProveedor, [p.proveedorId]: Number(value) || 0 };
                                    setKilosPorProveedor(allocations);
                                    const kilos = included.reduce((sum, id) => sum + (allocations[id] || 0), 0);
                                    setPesoBrutoTotalKg(kilos > 0 ? String(kilos) : "");
                                    const full = included.length > 0 && included.every(id => allocations[id] === load.proveedoresCarga.find(row => row.proveedorId === id)?.kilosCargados);
                                    setNumeroBultos(current => full ? current || String(load.proveedoresCarga.filter(row => included.includes(row.proveedorId)).reduce((sum, row) =>
                                        sum + row.jabasCargadas + row.binesCargados + row.mallasCargadas, 0)) : "");
                                }} />
                            </div>
                        ))}
                    </div>
                </ModalSection>

                {/* 2. Datos del traslado */}
                <ModalSection
                    title="Datos del traslado"
                    aside="Peso en kilogramos (KGM)"
                >
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <InputField
                            id="rg-num-guia"
                            label="Número de guía"
                            hint="Ingresa la serie y el correlativo que corresponde a esta guía."
                            required
                            value={numeroGuia}
                            onChange={setNumeroGuia}
                        />
                        <InputField
                            id="rg-fecha-inicio"
                            label="Fecha de inicio de traslado"
                            type="date"
                            required
                            hint="Se propone la fecha programada de la entrega; puedes cambiarla."
                            value={fechaInicioTraslado}
                            onChange={setFechaInicioTraslado}
                        />
                        <InputField
                            id="rg-fecha-entrega"
                            label="Fecha entrega al transportista"
                            type="date"
                            optional
                            hint="Registra la fecha real cuando se entregue la carga."
                            value={fechaEntregaTransportista}
                            onChange={setFechaEntregaTransportista}
                        />
                        <InputField
                            id="rg-peso-bruto"
                            label="Peso bruto total (KGM)"
                            type="number"
                            min={0}
                            step="0.01"
                            unit="kg"
                            required
                            value={pesoBrutoTotalKg}
                            onChange={setPesoBrutoTotalKg}
                        />
                        <InputField
                            id="rg-num-bultos"
                            label="Número de bultos"
                            type="number"
                            min={0}
                            step="1"
                            required
                            value={numeroBultos}
                            onChange={setNumeroBultos}
                        />
                    </div>
                </ModalSection>

                {/* 3. Datos del transportista */}
                <ModalSection
                    title="Datos del transportista"
                    aside="Identidad y vehículo principal"
                >
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <InputField
                            id="rg-trans-ruc"
                            label="RUC Transportista"
                            required
                            inputMode="numeric"
                            maxLength={11}
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
                            label="Número de registro MTC (condicional)"
                            hint="Se toma del transportista; complétalo si corresponde y aún no está registrado."
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
                    title="Datos del conductor"
                    aside="Identificación y licencia"
                >
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <FormField label="Tipo doc." required>
                            <Select
                                value={conductorTipoDoc}
                                onValueChange={(v) => setConductorTipoDoc((v ?? "DNI") as "DNI" | "CE" | "Pasaporte")}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="DNI">DNI</SelectItem>
                                    <SelectItem value="CE">Carné Extranjería</SelectItem>
                                    <SelectItem value="Pasaporte">Pasaporte</SelectItem>
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
                    title="Ruta del traslado"
                    aside="Partida y llegada"
                >
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <div className="flex flex-col gap-3 rounded-2xl border border-border p-4">
                            <p className="inline-flex items-center gap-1.5 text-[13.5px] font-bold text-ink">
                                <MapPin size={15} className="text-brand" /> Punto de partida
                            </p>
                            <FormField label="UBIGEO de 6 dígitos (Partida)" required>
                                <Select value={ubigeoPartida} onValueChange={(v) => setUbigeoPartida(v ?? "")}>
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
                                required
                                inputMode="numeric"
                                maxLength={4}
                                hint="Ingresa el código real del establecimiento de partida."
                                error={attemptedSave && !/^\d{4}$/.test(codEstablecimientoPartida) ? "Ingresa exactamente 4 dígitos." : undefined}
                                value={codEstablecimientoPartida}
                                onChange={(value) => setCodEstablecimientoPartida(value.replace(/\D/g, "").slice(0, 4))}
                            />
                        </div>

                        <div className="flex flex-col gap-3 rounded-2xl border border-border p-4">
                            <p className="inline-flex items-center gap-1.5 text-[13.5px] font-bold text-ink">
                                <Truck size={15} className="text-brand" /> Punto de llegada
                            </p>
                            <FormField label="UBIGEO de 6 dígitos (Llegada)" required>
                                <Select value={ubigeoLlegada} onValueChange={(v) => setUbigeoLlegada(v ?? "")}>
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
                                required
                                inputMode="numeric"
                                maxLength={4}
                                hint="Ingresa el código real del establecimiento de llegada."
                                error={attemptedSave && !/^\d{4}$/.test(codEstablecimientoLlegada) ? "Ingresa exactamente 4 dígitos." : undefined}
                                value={codEstablecimientoLlegada}
                                onChange={(value) => setCodEstablecimientoLlegada(value.replace(/\D/g, "").slice(0, 4))}
                            />
                        </div>
                    </div>
                </ModalSection>

                <ModalSection title={hasOrganic ? "Normas y observaciones" : "Observaciones"}>
                    {hasOrganic && <>
                        <p className="text-sm text-ink-muted">Las normas se aplican a la fruta orgánica incluida en esta guía.</p>
                        {norms.length > 0 ? <FormField label="Norma orgánica">
                            <Select value="" disabled={norms.every(norm => normasSeleccionadas.includes(norm.id))}
                                onValueChange={code => { if (code && !normasSeleccionadas.includes(code)) setNormasSeleccionadas(current => [...current, code]); }}>
                                <SelectTrigger><SelectValue placeholder="Seleccionar norma…" /></SelectTrigger>
                                <SelectContent>
                                    {norms.filter(norm => !normasSeleccionadas.includes(norm.id)).map(norm =>
                                        <SelectItem key={norm.id} value={norm.id}>{norm.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </FormField> : <p className="text-sm text-ink-muted">No hay normas disponibles en el catálogo.</p>}
                        {normasSeleccionadas.length > 0 && <div className="flex flex-wrap gap-2">
                            {normasSeleccionadas.map(code => <Button key={code} type="button" variant="outline" size="sm" onClick={() => toggleNorma(code)}
                                aria-label={`Quitar norma ${code}`}>{norms.find(norm => norm.id === code)?.label ?? code}<X size={14} /></Button>)}
                        </div>}
                        <FormField label="Texto de la norma">
                            <Textarea readOnly rows={4} value={qualityGuideStandardText(normasSeleccionadas)} placeholder="Selecciona una norma para completar su texto." />
                        </FormField>
                    </>}
                    {load.scope === "industria" && <FormField label="Observaciones">
                        <Textarea value={observacionesSunat} onChange={event => setObservacionesSunat(event.target.value)} rows={3} />
                    </FormField>}
                </ModalSection>

            </div>
        </AppModal>
    );
}
