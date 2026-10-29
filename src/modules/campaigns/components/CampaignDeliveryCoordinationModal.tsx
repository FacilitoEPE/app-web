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
    getCoordinationStatus,
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
    /** Todas las entregas de la campaña: de ahí se elige cuál completar */
    entries: CampaignDeliveryEntry[];
    /** Entrega que se edita; con ella la elección queda fija. Sin ella se elige de la lista. */
    editing: CampaignDeliveryEntry | null;
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
 * Completa los datos de una entrega programada: transportista, camión y chofer, proveedores con sus fincas, fechas del
 * viaje y condiciones de la carga. La entrega ya viene programada (fecha, kilos y destino), por eso solo se elige y no se
 * vuelve a pedir. Elegir una que ya tiene datos carga lo registrado para actualizarlo.
 */
export default function CampaignDeliveryCoordinationModal({
    open,
    onOpenChange,
    campaignName,
    entries,
    editing,
    clientNames,
    contractNames,
    carriers,
    providers,
    onSave,
}: CampaignDeliveryCoordinationModalProps) {
    const [values, setValues, set] = useModalForm<DeliveryCoordinationValues>(open, editing ? coordinationToValues(editing) : EMPTY_COORDINATION);
    const [errors, setErrors] = useState<DeliveryCoordinationErrors>({});

    useResetOnToggle(open, () => setErrors({}));

    // Las pendientes primero: son las que hay que completar
    const entryOptions = useMemo(
        () =>
            [...entries]
                .sort((a, b) => Number(Boolean(a.delivery.coordinacion)) - Number(Boolean(b.delivery.coordinacion)))
                .map((entry) => ({
                    value: entry.key,
                    label: `${clientNames[entry.relationId] ?? "Cliente"} · ${contractNames[entry.key] ?? "Contrato"} · ${formatDisplayDate(entry.delivery.fecha)} · ${formatKg(entry.delivery.kilosProgramados)} kg · ${getCoordinationStatus(entry.delivery)}`,
                })),
        [entries, clientNames, contractNames],
    );
    const carrierOptions = useMemo(() => carriers.map((carrier) => ({ value: String(carrier.id), label: carrier.nombre })), [carriers]);
    const carrier = carriers.find((item) => String(item.id) === values.carrierId);
    const vehicleOptions = (carrier?.vehiculos ?? []).map((vehicle) => ({ value: String(vehicle.id), label: vehicle.placa }));
    const driverOptions = (carrier?.choferes ?? []).map((driver) => ({ value: String(driver.id), label: driver.nombre }));

    const editingLabel = editing ? entryOptions.find((option) => option.value === editing.key)?.label ?? "" : "";

    const clear = (...fields: (keyof DeliveryCoordinationErrors)[]) =>
        setErrors((current) => ({ ...current, ...Object.fromEntries(fields.map((field) => [field, undefined])) }));

    const update = <K extends keyof DeliveryCoordinationValues>(field: K, value: DeliveryCoordinationValues[K]) => {
        set(field)(value);
        clear(field as keyof DeliveryCoordinationErrors);
    };

    const chooseEntry = (key: string) => {
        const entry = entries.find((item) => item.key === key);
        setValues(entry ? coordinationToValues(entry) : { ...EMPTY_COORDINATION, entrega: key });
        setErrors({});
    };

    const chooseCarrier = (carrierId: string) => {
        // El camión y el chofer son de un transportista: al cambiarlo hay que volver a elegirlos
        setValues((current) => ({ ...current, carrierId, vehicleId: "", driverId: "" }));
        clear("carrierId", "vehicleId", "driverId");
    };

    const handleSave = async () => {
        const next = validateCoordination(values);
        const entry = entries.find((item) => item.key === values.entrega);
        if (hasCoordinationErrors(next) || !entry) {
            setErrors(next);
            return;
        }
        await onSave(entry, values);
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
            title={editing ? "Editar datos de entrega" : "Completar datos de entrega"}
            description={`${campaignName} · Transporte, proveedores y fincas de la entrega programada.`}
            size="lg"
            footer={
                <>
                    <Button variant="outline" size="xl" onClick={() => onOpenChange(false)}>
                        <X size={20} strokeWidth={2.5} /> Cancelar
                    </Button>
                    <Button size="xl" onClick={handleSave}>
                        <Save size={20} strokeWidth={2.5} /> {editing ? "Guardar cambios" : "Guardar datos"}
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-6">
                <ModalSection title="Entrega">
                    {editing ? (
                        // Editar no cambia de entrega: se muestra como dato, no como selector
                        <InfoField label="Entrega programada" value={editingLabel} />
                    ) : (
                        <FormField label="Entrega programada" required error={errors.entrega} hint="Elige una entrega pendiente o una ya completa para actualizarla.">
                            <Combobox
                                options={entryOptions}
                                value={values.entrega}
                                onChange={chooseEntry}
                                placeholder="Buscar por cliente, contrato o fecha..."
                                emptyMessage="No hay entregas programadas"
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
