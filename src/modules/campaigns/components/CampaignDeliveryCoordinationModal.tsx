import { usesV1 } from '@/shared/api/data-contract';
import { useMemo, useState } from "react";
import { PackageCheck, Save, X } from "lucide-react";
import AppModal from "@/shared/components/AppModal";
import FormField from "@/shared/components/FormField";
import { InfoField } from "@/shared/components/InfoField";
import InputField from "@/shared/components/InputField";
import ModalSection from "@/shared/components/ModalSection";
import { Button } from "@/shared/components/ui/button";
import { Combobox } from "@/shared/components/ui/combobox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Textarea } from "@/shared/components/ui/textarea";
import { useModalForm, useResetOnToggle } from "@/shared/hooks/useModalForm";
import { formatDisplayDate, formatKg } from "@/shared/utils/format";
import type { Carrier } from "@/modules/carriers/carriers.data";
import CampaignDeliveryProviderPicker, { type DeliveryProviderOption } from "@/modules/campaigns/components/CampaignDeliveryProviderPicker";
import {
    EMPTY_COORDINATION,
    coordinationToValues,
    hasCoordinationErrors,
    validateCoordination,
    type CampaignDeliveryEntry,
    type DeliveryCoordinationErrors,
    type DeliveryCoordinationValues,
} from "@/modules/campaigns/campaignDeliveryCoordination.utils";

interface CampaignDeliveryCoordinationModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    campaignName: string;
    entries: CampaignDeliveryEntry[];
    entry: CampaignDeliveryEntry | null;
    /** Nombre del cliente por vínculo, para identificar cada entrega */
    clientNames: Record<number, string>;
    /** Archivo del contrato de cada entrega, por clave de entrega */
    contractNames: Record<string, string>;
    /** Transportistas vinculados a la campaña, con su flota */
    carriers: Carrier[];
    providers: DeliveryProviderOption[];
    onSave: (entry: CampaignDeliveryEntry, values: DeliveryCoordinationValues) => void;
}

/**
 * Edita el transporte, proveedores, fincas, fechas del viaje y condiciones de carga de una entrega programada.
 */
export default function CampaignDeliveryCoordinationModal({
    open,
    onOpenChange,
    campaignName,
    entries,
    entry,
    clientNames,
    contractNames,
    carriers,
    providers,
    onSave,
}: CampaignDeliveryCoordinationModalProps) {
    const [values, setValues, set] = useModalForm<DeliveryCoordinationValues>(open, entry ? coordinationToValues(entry) : EMPTY_COORDINATION);
    const [errors, setErrors] = useState<DeliveryCoordinationErrors>({});
    const [selectedKey, setSelectedKey] = useState("");
    const [selectionError, setSelectionError] = useState<string | null>(null);

    useResetOnToggle(open, () => { setErrors({}); setSelectedKey(""); setSelectionError(null); });

    const pendingEntries = useMemo(() => entries.filter((item) => !item.delivery.coordinacion), [entries]);
    const entryOptions = useMemo(() => pendingEntries.map((item) => ({
        value: item.key,
        label: `${clientNames[item.relationId] ?? "Cliente"} · ${contractNames[item.key] ?? "Contrato"} · ${formatDisplayDate(item.delivery.fecha)} · ${formatKg(item.delivery.kilosProgramados)} kg`,
    })), [pendingEntries, clientNames, contractNames]);
    const carrierOptions = useMemo(() => carriers.map((carrier) => ({ value: String(carrier.id), label: carrier.nombre })), [carriers]);
    const carrier = carriers.find((item) => String(item.id) === values.carrierId);
    const vehicleOptions = (carrier?.vehiculos ?? []).map((vehicle) => ({ value: String(vehicle.id), label: vehicle.placa }));
    const driverOptions = (carrier?.choferes ?? []).map((driver) => ({ value: String(driver.id), label: driver.nombre }));

    const entryLabel = entry
        ? `${clientNames[entry.relationId] ?? "Cliente"} · ${contractNames[entry.key] ?? "Contrato"} · ${formatDisplayDate(entry.delivery.fecha)} · ${formatKg(entry.delivery.kilosProgramados)} kg`
        : "";
    const selectedEntry = entry ?? pendingEntries.find((item) => item.key === selectedKey) ?? null;

    const clear = (...fields: (keyof DeliveryCoordinationErrors)[]) =>
        setErrors((current) => ({ ...current, ...Object.fromEntries(fields.map((field) => [field, undefined])) }));

    const update = <K extends keyof DeliveryCoordinationValues>(field: K, value: DeliveryCoordinationValues[K]) => {
        set(field)(value);
        clear(field as keyof DeliveryCoordinationErrors);
    };

    const chooseCarrier = (carrierId: string) => {
        // El camión y el chofer son de un transportista: al cambiarlo hay que volver a elegirlos
        setValues((current) => ({ ...current, carrierId, vehicleId: "", driverId: "" }));
        clear("carrierId", "vehicleId", "driverId");
    };

    const chooseEntry = (key: string) => {
        setSelectedKey(key);
        setSelectionError(null);
        setValues(EMPTY_COORDINATION);
        setErrors({});
    };

    const handleSave = async () => {
        const next = validateCoordination(values);
        if (!selectedEntry) setSelectionError("Selecciona la entrega.");
        if (hasCoordinationErrors(next) || !selectedEntry) {
            setErrors(next);
            return;
        }
        await onSave(selectedEntry, values);
    };

    const renderSelect = (id: string, label: string, placeholder: string, options: { value: string; label: string }[], field: "vehicleId" | "driverId", disabledHint: string) => (
        <FormField id={id} label={label} required error={errors[field]}>
            <Select items={options} value={values[field] || null} onValueChange={(next) => update(field, (next as string | null) ?? "")} disabled={!carrier}>
                <SelectTrigger id={id} className="w-full" aria-invalid={errors[field] ? true : undefined}>
                    <SelectValue placeholder={carrier ? placeholder : disabledHint} />
                </SelectTrigger>
                <SelectContent>
                    {options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                </SelectContent>
            </Select>
        </FormField>
    );

    return (
        <AppModal
            open={open}
            onOpenChange={onOpenChange}
            icon={<PackageCheck size={22} strokeWidth={2} />}
            title={entry ? "Editar datos de entrega" : "Completar datos de entrega"}
            description={`${campaignName} · Transporte, proveedores y fincas de la entrega programada.`}
            size="lg"
            footer={
                <>
                    <Button variant="outline" size="xl" onClick={() => onOpenChange(false)}>
                        <X size={20} strokeWidth={2.5} /> Cancelar
                    </Button>
                    <Button size="xl" onClick={handleSave}>
                        <Save size={20} strokeWidth={2.5} /> {entry ? "Guardar cambios" : "Guardar datos"}
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-6">
                <ModalSection title="Entrega">
                    {entry ? <InfoField label="Entrega programada" value={entryLabel} /> : (
                        <FormField label="Entrega programada" required error={selectionError ?? undefined} hint="Elige una entrega programada para agregar sus datos.">
                            <Combobox
                                options={entryOptions}
                                value={selectedKey}
                                onChange={chooseEntry}
                                placeholder="Buscar por cliente, contrato o fecha..."
                                emptyMessage="No hay entregas disponibles"
                            />
                        </FormField>
                    )}
                </ModalSection>

                <ModalSection title="Transporte">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <FormField label="Transportista" required error={errors.carrierId} className="sm:col-span-2">
                            <Combobox
                                options={carrierOptions}
                                value={values.carrierId}
                                onChange={chooseCarrier}
                                placeholder="Buscar transportista vinculado..."
                                emptyMessage="No hay transportistas vinculados a la campaña"
                            />
                        </FormField>
                        {renderSelect("delivery-vehicle", "Camión", "Seleccionar camión", vehicleOptions, "vehicleId", "Elige primero el transportista")}
                        {renderSelect("delivery-driver", "Chofer", "Seleccionar chofer", driverOptions, "driverId", "Elige primero el transportista")}
                        <InputField id="delivery-start" type={usesV1()?"datetime-local":"date"} label="Fecha de inicio" required value={values.fechaInicio} error={errors.fechaInicio} onChange={(value) => update("fechaInicio", value)} />
                        <InputField id="delivery-end" type={usesV1()?"datetime-local":"date"} label="Fecha de fin" required value={values.fechaFin} error={errors.fechaFin} onChange={(value) => update("fechaFin", value)} />
                    </div>
                </ModalSection>

                <ModalSection title="Proveedores y fincas">
                    <CampaignDeliveryProviderPicker
                        providers={providers}
                        value={values.proveedores}
                        onChange={(next) => update("proveedores", next)}
                        error={errors.proveedores}
                        missingFincas={errors.sinFinca}
                    />
                </ModalSection>

                <ModalSection title="Carga">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <FormField id="delivery-conditions" label="Condiciones de la carga" optional>
                            <Textarea id="delivery-conditions" className="min-h-24 resize-none" placeholder="Ej. Fruta en cajas de 4 kg, palets identificados por finca..." value={values.condicionesCarga} onChange={(event) => update("condicionesCarga", event.target.value)} />
                        </FormField>
                        <FormField id="delivery-notes" label="Observaciones" optional>
                            <Textarea id="delivery-notes" className="min-h-24 resize-none" placeholder="Ej. Confirmar el horario de recojo con el chofer..." value={values.observaciones} onChange={(event) => update("observaciones", event.target.value)} />
                        </FormField>
                    </div>
                </ModalSection>
            </div>
        </AppModal>
    );
}
