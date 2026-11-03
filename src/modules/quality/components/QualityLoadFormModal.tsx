import { useState } from "react";
import { PackageCheck, Save, Sprout, X } from "lucide-react";
import AppModal from "@/shared/components/AppModal";
import FormField from "@/shared/components/FormField";
import { InfoField } from "@/shared/components/InfoField";
import InputField from "@/shared/components/InputField";
import ModalSection from "@/shared/components/ModalSection";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Switch } from "@/shared/components/ui/switch";
import { Textarea } from "@/shared/components/ui/textarea";
import { useFormSubmit } from "@/shared/hooks/useFormSubmit";
import { useResetOnToggle } from "@/shared/hooks/useModalForm";
import { formatDisplayDate, formatKg, formatMoney } from "@/shared/utils/format";
import { operationsContext } from "@/modules/operations/api/operations-context.api";
import type {
    QualityDeliveryLoadItem,
    QualityProviderLoadDetail,
} from "@/modules/quality/qualityOperations.models";

interface QualityLoadFormModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    load: QualityDeliveryLoadItem | null;
    onSave: (
        loadId: string,
        payload: {
            fechaCargaReal: string;
            anotador: string;
            cumpleRequisitosIndustria: boolean;
            motivoRechazoIndustria: string;
            viaticosMovilidad: number;
            viaticosInsumos: number;
            gastoCuadrilla: number;
            gastoAnotadores: number;
            observacionesCarga: string;
            proveedoresCarga: QualityProviderLoadDetail[];
        },
    ) => void;
}

const BULTO_TYPES = [
    { name: "Jabas", loaded: "jabasCargadas", empty: "jabasVacias" },
    { name: "Bines", loaded: "binesCargados", empty: "binesVacios" },
    { name: "Mallas", loaded: "mallasCargadas", empty: "mallasVacias" },
] as const;
type BultoType = (typeof BULTO_TYPES)[number]["name"];

function selectedBultos(rows: QualityProviderLoadDetail[]): BultoType[][] {
    return rows.map(row => BULTO_TYPES.filter(type => row[type.loaded] > 0 || row[type.empty] > 0).map(type => type.name));
}

function varietyOptionsForLoad(frutaName: string, currentRows: QualityProviderLoadDetail[]): string[] {
    const g = operationsContext();
    const fruit = g.fruits.find((f) => f.name.toLowerCase() === frutaName.toLowerCase());
    const fromCatalog = fruit
        ? g.varieties
              .filter((v) => v.frutaId === fruit.frutaId)
              .map((v) => v.name.replace(new RegExp(`^${fruit.name}\\s+`, "i"), "").trim() || v.name)
        : [];
    const all = new Set<string>([
        ...fromCatalog,
        ...currentRows.map((r) => r.variedad).filter(Boolean),
    ]);
    return [...all];
}

export default function QualityLoadFormModal({
    open,
    onOpenChange,
    load,
    onSave,
}: QualityLoadFormModalProps) {
    const [fechaCargaReal, setFechaCargaReal] = useState("");
    const [anotador, setAnotador] = useState("");
    const [cumpleRequisitos, setCumpleRequisitos] = useState(true);
    const [motivoRechazo, setMotivoRechazo] = useState("");
    const [viaticosMovilidad, setViaticosMovilidad] = useState("");
    const [viaticosInsumos, setViaticosInsumos] = useState("");
    const [gastoCuadrilla, setGastoCuadrilla] = useState("");
    const [gastoAnotadores, setGastoAnotadores] = useState("");
    const [observacionesCarga, setObservacionesCarga] = useState("");
    const [proveedores, setProveedores] = useState<QualityProviderLoadDetail[]>([]);
    const [bultosActivos, setBultosActivos] = useState<BultoType[][]>([]);

    useResetOnToggle(open, () => {
        if (!load) return;
        setFechaCargaReal(load.fechaCargaReal || new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()));
        setAnotador(load.anotador);
        setCumpleRequisitos(load.id.startsWith("entrega-") || load.cumpleRequisitosIndustria);
        setMotivoRechazo(load.motivoRechazoIndustria);
        setViaticosMovilidad(String(load.viaticosMovilidad));
        setViaticosInsumos(String(load.viaticosInsumos));
        setGastoCuadrilla(String(load.gastoCuadrilla));
        setGastoAnotadores(String(load.gastoAnotadores));
        setObservacionesCarga(load.observacionesCarga);
        setProveedores(load.proveedoresCarga.map((p) => ({ ...p })));
        setBultosActivos(selectedBultos(load.proveedoresCarga));
    });

    const { errors, saving, submit } = useFormSubmit({
        open, backendFields: {},
        validate: () => {
            const errors: Record<string, string> = {};
            if (!fechaCargaReal) errors.fechaCargaReal = "Indica la fecha de carga.";
            if (!anotador.trim()) errors.anotador = "Indica el anotador responsable.";
            if (!proveedores.length) errors._form = "Esta entrega no tiene proveedores coordinados. Completa primero sus proveedores y fincas en la campaña.";
            const total = proveedores.reduce((sum, p) => sum + p.kilosCargados, 0);
            if (total <= 0 || total > (load?.kilosProgramados ?? 0)) errors._form = "Los kilos deben ser mayores que cero y no superar los kilos programados de la entrega.";
            if (proveedores.some(p => p.kilosCargados <= 0)) errors._form = "Registra kilos mayores que cero para cada proveedor de la entrega.";
            if (proveedores.some(p => [p.kilosCargados, p.jabasCargadas, p.jabasVacias, p.binesCargados, p.binesVacios, p.mallasCargadas, p.mallasVacias].some(n => !Number.isFinite(n) || n < 0))) errors._form = "Revisa los kilos y envases: no se admiten valores negativos.";
            if (proveedores.some(p => !p.variedad)) errors._form = "Selecciona la variedad de cada proveedor.";
            if (proveedores.some((p, index) => p.kilosCargados > 0 && !bultosActivos[index]?.length)) errors._form = "Marca al menos un tipo de bulto para cada proveedor con kilos cargados.";
            if (proveedores.some((p, index) => bultosActivos[index]?.some(name => {
                const type = BULTO_TYPES.find(item => item.name === name)!;
                return p[type.loaded] + p[type.empty] === 0;
            }))) errors._form = "Registra al menos un bulto cargado o vacío por cada tipo marcado para conservar la selección al guardar.";
            if (proveedores.some(p => BULTO_TYPES.some(type => !Number.isInteger(p[type.loaded]) || !Number.isInteger(p[type.empty])))) errors._form = "Los bultos deben ser cantidades enteras.";
            if ([viaticosMovilidad, viaticosInsumos, gastoCuadrilla, gastoAnotadores].some(n => !Number.isFinite(Number(n)) || Number(n) < 0)) errors._form = "Los gastos deben ser cantidades mayores o iguales a cero.";
            if (load?.scope === "industria" && !cumpleRequisitos && !motivoRechazo.trim()) errors._form = "Indica el motivo de rechazo industrial.";
            return errors;
        },
        onSubmit: async () => {
            if (!load) return;
            await onSave(load.id, { fechaCargaReal, anotador: anotador.trim(), cumpleRequisitosIndustria: cumpleRequisitos,
                motivoRechazoIndustria: motivoRechazo.trim(), viaticosMovilidad: Number(viaticosMovilidad), viaticosInsumos: Number(viaticosInsumos),
                gastoCuadrilla: Number(gastoCuadrilla), gastoAnotadores: Number(gastoAnotadores), observacionesCarga: observacionesCarga.trim(), proveedoresCarga: proveedores });
            onOpenChange(false);
        },
    });

    if (!load) return null;

    const availableVarieties = varietyOptionsForLoad(load.fruta, proveedores);

    const updateProvider = (index: number, patch: Partial<QualityProviderLoadDetail>) => {
        setProveedores((current) =>
            current.map((item, idx) => (idx === index ? { ...item, ...patch } : item)),
        );
    };

    const toggleBulto = (index: number, type: (typeof BULTO_TYPES)[number], checked: boolean) => {
        setBultosActivos(current => current.map((selected, i) => i === index
            ? checked ? [...selected, type.name] : selected.filter(name => name !== type.name)
            : selected));
        if (!checked) updateProvider(index, { [type.loaded]: 0, [type.empty]: 0 });
    };

    const totalKilos = proveedores.reduce((s, p) => s + (Number(p.kilosCargados) || 0), 0);
    const bultosTotales = BULTO_TYPES.map(type => ({
        ...type,
        selected: bultosActivos.some(selected => selected.includes(type.name)),
        loadedTotal: proveedores.reduce((sum, p, index) => sum + (bultosActivos[index]?.includes(type.name) ? p[type.loaded] : 0), 0),
        emptyTotal: proveedores.reduce((sum, p, index) => sum + (bultosActivos[index]?.includes(type.name) ? p[type.empty] : 0), 0),
    })).filter(type => type.selected);
    const totalViaticos = (Number(viaticosMovilidad) || 0) + (Number(viaticosInsumos) || 0);
    const totalGastos = (Number(gastoCuadrilla) || 0) + (Number(gastoAnotadores) || 0);

    return (
        <AppModal
            busy={saving}
            open={open}
            onOpenChange={onOpenChange}
            icon={<PackageCheck size={22} strokeWidth={2.2} />}
            title={`${load.id.startsWith("entrega-") ? "Registrar" : "Editar"} carga`}
            description={`${load.cliente} · ${load.transportista} (${load.placa})`}
            size="xl"
            footer={
                <>
                    <Button variant="outline" size="xl" onClick={() => onOpenChange(false)}>
                        <X size={18} /> Cancelar
                    </Button>
                    <Button
                        size="xl"
                        disabled={saving}
                        onClick={() => submit(undefined)}
                    >
                        <Save size={18} /> Guardar datos de carga
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-6">
                <FormField error={errors._form} />

                <InfoField
                    label="Entrega de la campaña"
                    value={`${load.cliente} · ${load.contratoRef} · ${formatDisplayDate(load.fechaProgramada)} · ${formatKg(load.kilosProgramados)} kg`}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                    <InfoField label="Transportista y camión" value={`${load.transportista} · ${load.placa}`} />
                    <InfoField label="Chofer coordinado" value={load.chofer} />
                </div>

                {load.scope === "industria" && (
                    <ModalSection
                        title="Evaluación previa de aptitud (Industria)"
                        aside="Parámetros industriales"
                    >
                        <div className="flex items-center justify-between rounded-xl border border-brand-border bg-brand-surface/40 px-4 py-3">
                            <div>
                                <p className="text-[13.5px] font-bold text-ink">
                                    ¿La fruta cumple los requisitos industriales?
                                </p>
                                <p className="text-[12px] text-ink-muted">
                                    Desactiva si el lote presenta fermentación o daño severo para registrar rechazo.
                                </p>
                            </div>
                            <Switch checked={cumpleRequisitos} onCheckedChange={setCumpleRequisitos} />
                        </div>
                        {!cumpleRequisitos && (
                            <InputField
                                id="lf-motivo-rechazo"
                                label="Motivo del rechazo de lote industrial"
                                required
                                value={motivoRechazo}
                                onChange={setMotivoRechazo}
                                placeholder="Describe la causa del rechazo..."
                            />
                        )}
                    </ModalSection>
                )}

                <ModalSection
                    title="1. Datos de la carga real"
                    aside="Fecha efectiva y responsable"
                >
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <InputField
                            id="lf-fecha-carga"
                            error={errors.fechaCargaReal}
                            label="Fecha de carga"
                            type="date"
                            required
                            value={fechaCargaReal}
                            onChange={setFechaCargaReal}
                        />
                        <InputField
                            id="lf-anotador"
                            error={errors.anotador}
                            label="Anotador / jefe de cuadrilla"
                            required
                            value={anotador}
                            onChange={setAnotador}
                        />
                    </div>
                </ModalSection>

                <ModalSection title="2. Detalle por proveedor">
                    <p className="text-sm text-ink-muted">Cada proveedor de la entrega lleva su propia variedad, kilos y bultos.</p>
                    {proveedores.length === 0 && <p className="rounded-xl border border-border p-4 text-sm text-ink-muted">Esta entrega aún no tiene proveedores y fincas coordinados.</p>}
                    <div className="flex flex-col gap-4">
                        {proveedores.map((prov, idx) => (
                            <div key={`${prov.proveedorId}-${idx}`} className="overflow-hidden rounded-xl border border-border bg-card">
                                <div className="flex items-center gap-2 border-b border-border bg-brand-surface/40 px-4 py-3">
                                    <Sprout size={17} className="text-brand" />
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-bold text-ink">{prov.proveedorNombre}</p>
                                        <p className="truncate text-xs text-ink-muted">{prov.fincaNombre}</p>
                                    </div>
                                </div>
                                <div className="grid gap-3 p-4 sm:grid-cols-2">
                                    <FormField label={`Variedad de ${load.fruta}`} required>
                                        <Select value={prov.variedad || ""} onValueChange={value => updateProvider(idx, { variedad: value ?? "" })}>
                                            <SelectTrigger className="h-11"><SelectValue placeholder="Seleccionar variedad" /></SelectTrigger>
                                            <SelectContent>{availableVarieties.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </FormField>
                                    <InputField id={`lf-kg-${prov.proveedorId}-${idx}`} label="Kilos cargados" required type="number" min={0} step="0.01" placeholder="0" value={prov.kilosCargados ? String(prov.kilosCargados) : ""} onChange={value => updateProvider(idx, { kilosCargados: Number(value) || 0 })} />
                                </div>
                                <div className="border-t border-border px-4 pb-4 pt-3">
                                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink">Bultos</p>
                                    <div className="grid grid-cols-[minmax(90px,1fr)_repeat(2,minmax(0,1.5fr))] gap-2 text-[11px] font-bold uppercase tracking-wide text-ink-muted">
                                        <span>Tipo</span><span>Cargados</span><span>Vacíos</span>
                                    </div>
                                    <div className="mt-2 flex flex-col gap-2">
                                        {BULTO_TYPES.map(type => {
                                            const checked = bultosActivos[idx]?.includes(type.name) ?? false;
                                            const id = `lf-${prov.proveedorId}-${idx}-${type.name.toLowerCase()}`;
                                            return <div key={type.name} className="grid grid-cols-[minmax(90px,1fr)_repeat(2,minmax(0,1.5fr))] items-center gap-2">
                                                <label htmlFor={id} className="flex cursor-pointer items-center gap-2 text-sm text-ink-body"><Checkbox id={id} checked={checked} onCheckedChange={value => toggleBulto(idx, type, value === true)} />{type.name}</label>
                                                <InputField id={`${id}-cargados`} label={`${type.name} ${type.name === "Bines" ? "cargados" : "cargadas"}`} className="[&_[data-slot=field-label]]:sr-only" type="number" min={0} step="1" placeholder="0" disabled={!checked} value={prov[type.loaded] ? String(prov[type.loaded]) : ""} onChange={value => updateProvider(idx, { [type.loaded]: Number(value) || 0 })} />
                                                <InputField id={`${id}-vacios`} label={`${type.name} ${type.name === "Bines" ? "vacíos" : "vacías"}`} className="[&_[data-slot=field-label]]:sr-only" type="number" min={0} step="1" placeholder="0" disabled={!checked} value={prov[type.empty] ? String(prov[type.empty]) : ""} onChange={value => updateProvider(idx, { [type.empty]: Number(value) || 0 })} />
                                            </div>;
                                        })}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    {(totalKilos > 0 || bultosTotales.length > 0) && <p role="status" className="rounded-xl border border-brand-border bg-brand-surface px-4 py-3 text-sm text-ink-body">
                        <strong className="text-ink">Total del camión:</strong> {formatKg(totalKilos)} kg
                        {bultosTotales.map(type => <span key={type.name}> · {type.name}: {formatKg(type.loadedTotal)} {type.name === "Bines" ? "cargados" : "cargadas"} · {formatKg(type.emptyTotal)} {type.name === "Bines" ? "vacíos" : "vacías"}</span>)}
                    </p>}
                </ModalSection>

                <ModalSection title="Viáticos">
                    <div className="grid gap-3 sm:grid-cols-2">
                        <InputField id="lf-viatico-mov" label="Gasto de movilidad (S/)" type="number" min={0} step="0.01" placeholder="0.00" value={viaticosMovilidad} onChange={setViaticosMovilidad} />
                        <InputField id="lf-viatico-ins" label="Insumos del personal (S/)" type="number" min={0} step="0.01" placeholder="0.00" value={viaticosInsumos} onChange={setViaticosInsumos} />
                    </div>
                    <p className="text-sm font-semibold text-ink">Total viáticos: S/ {formatMoney(totalViaticos)}</p>
                </ModalSection>

                <ModalSection title="3. Gastos de carga">
                    <div className="overflow-hidden rounded-xl border border-border">
                        <div className="grid grid-cols-2 gap-3 border-b border-border bg-brand-surface/40 px-4 py-2 text-xs font-bold uppercase text-ink-muted"><span>Concepto del gasto</span><span>Monto (S/)</span></div>
                        <div className="grid grid-cols-2 items-center gap-3 border-b border-border px-4 py-2.5"><span className="text-sm font-medium text-ink">Cuadrilla</span><InputField id="lf-gasto-cuad" label="Monto de cuadrilla" className="[&_[data-slot=field-label]]:sr-only" type="number" min={0} step="0.01" leading="S/" placeholder="720.00" value={gastoCuadrilla} onChange={setGastoCuadrilla} /></div>
                        <div className="grid grid-cols-2 items-center gap-3 px-4 py-2.5"><span className="text-sm font-medium text-ink">Anotadores</span><InputField id="lf-gasto-anot" label="Monto de anotadores" className="[&_[data-slot=field-label]]:sr-only" type="number" min={0} step="0.01" leading="S/" placeholder="50.00" value={gastoAnotadores} onChange={setGastoAnotadores} /></div>
                        <div className="grid grid-cols-2 gap-3 bg-brand-surface/40 px-4 py-2.5 text-sm font-bold text-ink"><span>Total gastos</span><span>S/ {formatMoney(totalGastos)}</span></div>
                    </div>
                </ModalSection>
                <FormField label="Observaciones de carga"><Textarea value={observacionesCarga} onChange={event => setObservacionesCarga(event.target.value)} placeholder="Condiciones de estiba, precintos o notas de campo…" /></FormField>
            </div>
        </AppModal>
    );
}
