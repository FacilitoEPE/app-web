import { useResetOnToggle } from "@/shared/hooks/useModalForm";
import { useFormSubmit } from '@/shared/hooks/useFormSubmit';
import SegmentedControl from '@/shared/components/SegmentedControl';
import { driverVarietyOptions } from '@/modules/driver-portal/api/driver-screen-data';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { useState } from "react";
import { PackageCheck, Save, Sprout, X } from "lucide-react";
import AppModal from "@/shared/components/AppModal";
import FormField from "@/shared/components/FormField";
import { SummaryBar } from "@/shared/components/InfoField";
import InputField from "@/shared/components/InputField";
import ModalSection from "@/shared/components/ModalSection";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { formatKg } from "@/shared/utils/format";
import type { DriverLoad, DriverProviderLoadDetail } from "@/modules/driver-portal/driverPortal.models";
const BULTO_TYPES = [
    { label: 'Jabas', loaded: 'jabasCargadas', empty: 'jabasVacias' },
    { label: 'Bines', loaded: 'binesCargados', empty: 'binesVacios' },
    { label: 'Mallas', loaded: 'mallasCargadas', empty: 'mallasVacias' },
] as const;

interface DriverLoadDataModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    load: DriverLoad | null;
    onSave: (
        loadId: string,
        payload: {
            cumpleRequisitosIndustria?: boolean;
            fechaCarga: string;
            anotador: string;
            viaticosMovilidad: number;
            viaticosInsumos: number;
            gastoCuadrilla: number;
            gastoAnotadores: number;
            observacionesCarga: string;
            proveedores: DriverProviderLoadDetail[];
        },
    ) => void | Promise<void>;
}

export default function DriverLoadDataModal({ open, onOpenChange, load, onSave }: DriverLoadDataModalProps) {
    const [fechaCarga, setFechaCarga] = useState("");
    const [anotador, setAnotador] = useState("");
    const [viaticosMovilidad, setViaticosMovilidad] = useState("");
    const [viaticosInsumos, setViaticosInsumos] = useState("");
    const [gastoCuadrilla, setGastoCuadrilla] = useState("");
    const [gastoAnotadores, setGastoAnotadores] = useState("");
    const [observacionesCarga, setObservacionesCarga] = useState("");
    const [proveedores, setProveedores] = useState<DriverProviderLoadDetail[]>([]);
    const [selectedBultos, setSelectedBultos] = useState<string[][]>([]);
    const [industryResult, setIndustryResult] = useState('');

    useResetOnToggle(open, () => {
        if (!load || !open) return;
        setIndustryResult(load.canal === 'Industria' ? load.pendienteRegistro ? '' : load.cumpleRequisitosIndustria ? 'si' : 'no' : 'si');
        setFechaCarga(load.fechaCarga || new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()));
        setAnotador(load.anotador);
        setViaticosMovilidad(String(load.viaticosMovilidad));
        setViaticosInsumos(String(load.viaticosInsumos));
        setGastoCuadrilla(String(load.gastoCuadrilla));
        setGastoAnotadores(String(load.gastoAnotadores));
        setObservacionesCarga(load.observacionesCarga);
        setProveedores(load.proveedores.map((p) => ({ ...p })));
        setSelectedBultos(load.proveedores.map(provider => BULTO_TYPES.filter(type => provider[type.loaded] > 0 || provider[type.empty] > 0).map(type => type.label)));
    });

    const updateProvider = (index: number, patch: Partial<DriverProviderLoadDetail>) => {
        setProveedores((current) =>
            current.map((item, idx) => (idx === index ? { ...item, ...patch } : item)),
        );
    };

    const totalKilos = proveedores.reduce((sum, p) => sum + (Number(p.kilosCargados) || 0), 0);
    const totalBultosCargados = proveedores.reduce(
        (sum, p) => sum + (Number(p.jabasCargadas) || 0) + (Number(p.binesCargados) || 0) + (Number(p.mallasCargadas) || 0),
        0,
    );
    const totalBultosVacios = proveedores.reduce(
        (sum, p) => sum + (Number(p.jabasVacias) || 0) + (Number(p.binesVacios) || 0) + (Number(p.mallasVacias) || 0),
        0,
    );

    const { errors, saving, submit } = useFormSubmit({
        open,
        validate: () => {
            const found: Record<string, string> = {};
            if (load?.canal === 'Industria' && !industryResult) return { _form: 'Indica si la fruta cumple los requisitos de Industria.' };
            if (load?.canal === 'Industria' && industryResult === 'no') return found;
            if (!fechaCarga) found.fechaCarga = 'Indica la fecha de carga.';
            if (!anotador.trim()) found.anotador = 'Indica el responsable de la carga.';
            if (!proveedores.length || proveedores.some(provider => !provider.variedad.trim() || !Number.isFinite(provider.kilosCargados) || provider.kilosCargados <= 0))
                found._form = 'Completa la variedad y los kilos cargados de cada proveedor de la entrega.';
            if (load && totalKilos > load.kilosProgramados) found._form = 'Los kilos cargados no pueden superar los programados en la entrega.';
            if (selectedBultos.some(types => types.length === 0)) found._form = 'Marca al menos un tipo de bulto por proveedor.';
            if (proveedores.some(provider => [provider.jabasCargadas, provider.jabasVacias, provider.binesCargados, provider.binesVacios, provider.mallasCargadas, provider.mallasVacias].some(amount => !Number.isInteger(amount) || amount < 0)))
                found._form = 'Los bultos deben ser cantidades enteras mayores o iguales a cero.';
            if (proveedores.some((provider, index) => BULTO_TYPES.some(type => selectedBultos[index]?.includes(type.label) && provider[type.loaded] + provider[type.empty] <= 0)))
                found._form = 'Indica al menos una unidad cargada o vacía para cada tipo de bulto marcado.';
            if ([viaticosMovilidad, viaticosInsumos, gastoCuadrilla, gastoAnotadores].some(value => !Number.isFinite(Number(value)) || Number(value) < 0))
                found._form = 'Los gastos y viáticos deben ser importes válidos mayores o iguales a cero.';
            return found;
        },
        backendFields: { fechaCarga: 'fechaCarga', anotador: 'anotador' },
        onSubmit: async () => {
        if (!load) return;
        await onSave(load.id, {
            cumpleRequisitosIndustria: load.canal === 'Industria' ? industryResult === 'si' : undefined,
            fechaCarga,
            anotador: anotador.trim(),
            viaticosMovilidad: Number(viaticosMovilidad) || 0,
            viaticosInsumos: Number(viaticosInsumos) || 0,
            gastoCuadrilla: Number(gastoCuadrilla) || 0,
            gastoAnotadores: Number(gastoAnotadores) || 0,
            observacionesCarga: observacionesCarga.trim(),
            proveedores,
        });
        onOpenChange(false);
        },
    });

    if (!load) return null;

    return (
        <AppModal
            busy={saving}
            open={open}
            onOpenChange={onOpenChange}
            icon={<PackageCheck size={22} strokeWidth={2.2} />}
            title={load.pendienteRegistro ? 'Registrar carga' : 'Editar datos de carga'}
            description={`${load.codigo} · ${load.campaniaNombre} · Cliente: ${load.cliente}`}
            size="2xl"
            footer={
                <>
                    <Button variant="outline" size="xl" onClick={() => onOpenChange(false)}>
                        <X size={18} strokeWidth={2.5} /> Cancelar
                    </Button>
                    <Button size="xl" disabled={saving} onClick={() => void submit(undefined)}>
                        <Save size={18} strokeWidth={2.5} /> {industryResult === 'no' ? 'Guardar rechazo' : 'Guardar datos de carga'}
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-6">
                <FormField error={errors._form} />
                {load.canal === 'Industria' && <FormField label="¿La fruta cumple los requisitos?" required>
                    <SegmentedControl options={[{ value: 'si', label: 'Sí cumple' }, { value: 'no', label: 'No cumple' }]} value={industryResult} onChange={setIndustryResult} />
                </FormField>}
                {industryResult === 'no' ? <p role="status" className="text-sm text-destructive">Se registrará el rechazo de la entrega. No se creará una carga ni se habilitará el despacho.</p> : industryResult === 'si' ? <>
                <SummaryBar
                    items={[
                        { label: "Kilos programados", value: `${formatKg(load.kilosProgramados)} kg` },
                        { label: "Total cargado en camión", value: `${formatKg(totalKilos)} kg`, tone: "brand" },
                        { label: "Bultos cargados / vacíos", value: `${totalBultosCargados} / ${totalBultosVacios}` },
                    ]}
                />

                <ModalSection title="1. Datos de la carga real">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <InputField
                            id="load-fecha-carga"
                            error={errors.fechaCarga}
                            type="date"
                            label="Fecha de carga"
                            required
                            value={fechaCarga}
                            onChange={setFechaCarga}
                        />
                        <InputField
                            id="load-anotador"
                            error={errors.anotador}
                            label="Anotador / jefe de cuadrilla"
                            required
                            placeholder="Nombre del responsable en campo"
                            value={anotador}
                            onChange={setAnotador}
                        />
                    </div>
                </ModalSection>

                <ModalSection
                    title="2. Detalle por proveedor y bultos en el camión"
                    aside={`${proveedores.length} proveedor(es)`}
                >
                    <div className="flex flex-col gap-4">
                        {proveedores.map((prov, index) => (
                            <div
                                key={`${prov.proveedorId}-${index}`}
                                className="flex flex-col gap-4 rounded-2xl border border-border bg-surface-page/40 p-4"
                            >
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                                    <div className="flex items-center gap-2.5">
                                        <span className="flex size-8 items-center justify-center rounded-full bg-brand-surface text-brand">
                                            <Sprout size={16} strokeWidth={2.3} />
                                        </span>
                                        <div>
                                            <p className="text-[14px] font-bold text-ink">{prov.proveedorNombre}</p>
                                            <p className="text-[11.5px] font-medium text-ink-muted">
                                                {prov.tipo} · {prov.fincaNombre}
                                            </p>
                                        </div>
                                    </div>
                                    <span className="rounded-full bg-brand-surface px-3 py-1 text-[11.5px] font-bold text-brand">
                                        {formatKg(prov.kilosCargados)} kg
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <FormField label="Variedad" required className="col-span-2">
                                        <Select items={driverVarietyOptions(load.fruta)} value={prov.variedad} onValueChange={value => value && updateProvider(index, { variedad: value as string })}>
                                            <SelectTrigger aria-label={`Variedad de ${prov.proveedorNombre}`}><SelectValue placeholder="Selecciona una variedad" /></SelectTrigger>
                                            <SelectContent>{driverVarietyOptions(load.fruta).map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </FormField>
                                    <InputField id={`prov-kg-${index}`} label="Kilos cargados" required step="0.01" min={0} unit="kg" value={String(prov.kilosCargados || '')} onChange={value => updateProvider(index, { kilosCargados: Number(value) })} className="col-span-2" />
                                </div>
                                <div className="space-y-3">
                                    <div className="grid grid-cols-[5rem_1fr_1fr] gap-2 text-xs font-semibold text-ink-muted"><span>Bultos</span><span>Cargados</span><span>Vacíos</span></div>
                                    {BULTO_TYPES.map(type => {
                                        const checked = selectedBultos[index]?.includes(type.label) ?? false;
                                        return <div key={type.label} className="grid grid-cols-[5rem_minmax(0,1fr)_minmax(0,1fr)] items-center gap-2">
                                            <label className="flex min-h-11 items-center gap-2 text-sm"><Checkbox checked={checked} onCheckedChange={value => {
                                                setSelectedBultos(current => current.map((types, row) => row === index ? value ? [...types, type.label] : types.filter(item => item !== type.label) : types));
                                                if (!value) updateProvider(index, { [type.loaded]: 0, [type.empty]: 0 });
                                            }} />{type.label}</label>
                                            <InputField id={`bulto-${index}-${type.loaded}`} label={<span className="sr-only">{type.label} cargados de {prov.proveedorNombre}</span>} min={0} step="1" disabled={!checked} value={String(prov[type.loaded])} onChange={value => updateProvider(index, { [type.loaded]: Number(value) })} />
                                            <InputField id={`bulto-${index}-${type.empty}`} label={<span className="sr-only">{type.label} vacíos de {prov.proveedorNombre}</span>} min={0} step="1" disabled={!checked} value={String(prov[type.empty])} onChange={value => updateProvider(index, { [type.empty]: Number(value) })} />
                                        </div>;
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </ModalSection>

                <ModalSection title="3. Viáticos y gastos operativos de carga">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                        <InputField
                            id="load-viatico-movilidad"
                            label="Movilidad (viáticos)"
                            step="0.01"
                            min={0}
                            unit="S/"
                            value={viaticosMovilidad}
                            onChange={setViaticosMovilidad}
                        />
                        <InputField
                            id="load-viatico-insumos"
                            label="Insumos del personal"
                            step="0.01"
                            min={0}
                            unit="S/"
                            value={viaticosInsumos}
                            onChange={setViaticosInsumos}
                        />
                        <InputField
                            id="load-gasto-cuadrilla"
                            label="Gasto de cuadrilla"
                            step="0.01"
                            min={0}
                            unit="S/"
                            value={gastoCuadrilla}
                            onChange={setGastoCuadrilla}
                        />
                        <InputField
                            id="load-gasto-anotadores"
                            label="Gasto de anotadores"
                            step="0.01"
                            min={0}
                            unit="S/"
                            value={gastoAnotadores}
                            onChange={setGastoAnotadores}
                        />
                    </div>
                    <FormField id="load-observaciones" label="Observaciones de la carga" optional>
                        <Textarea
                            id="load-observaciones"
                            rows={2}
                            placeholder="Condición de estiba, precintos, horarios o incidencias en campo..."
                            value={observacionesCarga}
                            onChange={(e) => setObservacionesCarga(e.target.value)}
                        />
                    </FormField>
                </ModalSection>
                </> : null}
            </div>
        </AppModal>
    );
}
