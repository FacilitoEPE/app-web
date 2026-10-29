import { usesV1 } from '@/shared/api/data-contract';
import { useEffect, useState } from "react";
import { Save, ShieldCheck, X } from "lucide-react";
import AppModal from "@/shared/components/AppModal";
import ChipSelect from "@/shared/components/ChipSelect";
import FileDropzone from "@/shared/components/FileDropzone";
import FormField from "@/shared/components/FormField";
import InputField from "@/shared/components/InputField";
import ModalSection from "@/shared/components/ModalSection";
import StatusBadge from "@/shared/components/StatusBadge";
import { Button } from "@/shared/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Textarea } from "@/shared/components/ui/textarea";
import { useModalForm, useResetOnToggle } from "@/shared/hooks/useModalForm";
import { getCampaniaProveedoresByCampania } from "@/modules/campaigns/api/campania-proveedor.api";
import { formatKg } from "@/shared/utils/format";
import type { CertificadoArchivos } from "@/modules/campaigns/campaignCertificates.store";
import {
    CERTIFICATION_TYPES,
    EMPTY_CERTIFICADO_CAMPANA,
    MONEDA_OPTIONS,
    TRAMITE_OPTIONS,
    getVigenciaAutomatica,
    validateCertificadoCampana,
    type CertificadoCampanaErrors,
    type CertificadoCampanaField,
    type CertificadoCampanaFormValues,
    type CertificadoCampanaLocal,
    type ProductorCubierto,
} from "@/modules/campaigns/campaignCertificate.utils";

interface CampaignCertificationFormModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    campaniaId: number;
    /** Certificación a editar; sin ella, el modal registra una nueva */
    certificate: CertificadoCampanaLocal | null;
    onSave: (values: CertificadoCampanaFormValues, productores: ProductorCubierto[], archivos: CertificadoArchivos) => void;
}

const toFormValues = (certificate: CertificadoCampanaLocal): CertificadoCampanaFormValues => ({
    tipo: certificate.tipo,
    nombre: certificate.nombre,
    organismoEmisor: certificate.organismoEmisor,
    validoDesde: certificate.validoDesde,
    validoHasta: certificate.validoHasta,
    estadoTramite: certificate.estadoTramite,
    moneda: certificate.moneda,
    costo: String(certificate.costo),
    kilosIniciales: certificate.kilosIniciales ? String(certificate.kilosIniciales) : "",
    productores: certificate.productores.map((producer) => producer.id),
    observaciones: certificate.observaciones,
});

/**
 * Registro y edición de una certificación de la campaña. Una sola cosa que registrar, por eso son pocos
 * subtítulos: los campos se agrupan por afinidad en filas de 2 o 3 según su peso.
 *
 * Al registrar no se pregunta el estado del trámite (arranca "Pendiente") ni se muestra el estado de
 * vigencia; al editar sí: el trámite avanza y la vigencia se ve calculada junto al periodo.
 */
export default function CampaignCertificationFormModal({ open, onOpenChange, campaniaId, certificate, onSave }: CampaignCertificationFormModalProps) {
    const isEdit = certificate !== null;
    const initial = certificate ? toFormValues(certificate) : EMPTY_CERTIFICADO_CAMPANA;

    const [values, setValues, set] = useModalForm<CertificadoCampanaFormValues>(open, initial);
    const [errors, setErrors] = useState<CertificadoCampanaErrors>({});
    const [certificateFile, setCertificateFile] = useState<File | null>(null);
    const [quoteFile, setQuoteFile] = useState<File | null>(null);
    const [apiProducers, setApiProducers] = useState<ProductorCubierto[]>([]);
    const [isLoadingProducers, setIsLoadingProducers] = useState(false);

    useResetOnToggle(open, () => {
        setErrors({});
        setCertificateFile(null);
        setQuoteFile(null);
    });

    // Los productores que se pueden cubrir son los proveedores ya vinculados a esta campaña
    useEffect(() => {
        if (!open) return;
        let active = true;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsLoadingProducers(true);
        getCampaniaProveedoresByCampania(campaniaId)
            .then((relations) => {
                if (!active) return;
                const producerRelations = relations.filter((relation) => relation.tipoProveedor === "productor");
                setApiProducers(producerRelations.map((relation) => ({
                    id: String(relation.cxpId),
                    nombre: relation.proveedor ? `${relation.proveedor.nombres} ${relation.proveedor.apellido}` : `Proveedor ${relation.proveedorId}`,
                    kilos: Number(relation.cantidadProveedor) || 0,
                })));
            })
            .catch(() => { if (active) setApiProducers([]); })
            .finally(() => { if (active) setIsLoadingProducers(false); });
        return () => { active = false; };
    }, [open, campaniaId]);

    // Solo los productores reales vinculados a esta campaña
    const producers = apiProducers;

    // Al abrir en modo edición, vincula los productores guardados con los reales de la campaña una sola vez
    useEffect(() => {
        if (!open || !isEdit || !certificate || apiProducers.length === 0) return;
        const validIds = new Set(apiProducers.map((p) => p.id));
        const matchedIds: string[] = [];

        for (const certProd of certificate.productores) {
            if (validIds.has(certProd.id)) {
                if (!matchedIds.includes(certProd.id)) matchedIds.push(certProd.id);
            } else {
                const match = apiProducers.find((p) => p.nombre.toLowerCase().trim() === certProd.nombre.toLowerCase().trim());
                if (match && !matchedIds.includes(match.id)) {
                    matchedIds.push(match.id);
                }
            }
        }

        setValues((current) => ({
            ...current,
            productores: matchedIds,
        }));
    }, [open, isEdit, certificate, apiProducers, setValues]);

    // Kilos calculados directamente como valor derivado (sin bucles de estado)
    const kilosCalculados = values.productores.reduce((sum, id) => {
        const p = apiProducers.find((item) => item.id === id);
        return sum + (p?.kilos ?? 0);
    }, 0);

    const update = <Field extends CertificadoCampanaField>(field: Field) => (next: CertificadoCampanaFormValues[Field]) => {
        set(field)(next);
        setErrors((current) => ({ ...current, [field]: undefined }));
    };

    const handleProducersChange = (selectedIds: string[]) => {
        set("productores")(selectedIds);
        setErrors((current) => ({ ...current, productores: undefined }));
    };

    /** Props comunes de los campos de texto, fecha y número */
    const bind = (field: Exclude<CertificadoCampanaField, "productores">) => ({
        id: `campaign-cert-${field}`,
        value: values[field],
        error: errors[field],
        onChange: update(field),
    });

    const handleSave = async () => {
        const payload: CertificadoCampanaFormValues = {
            ...values,
            kilosIniciales: String(kilosCalculados),
        };
        const nextErrors = validateCertificadoCampana(payload);
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) return;
        const selected = producers.filter((producer) => values.productores.includes(producer.id));
        await onSave(payload, selected, { documento: certificateFile, cotizacion: quoteFile });
    };

    const currencySymbol = MONEDA_OPTIONS.find((option) => option.value === values.moneda)?.symbol;
    const vigencia = getVigenciaAutomatica(values.validoDesde, values.validoHasta);

    const selectField = (field: "tipo" | "estadoTramite" | "moneda", label: string, options: { value: string; label: string }[], className: string) => (
        <FormField id={`campaign-cert-${field}`} label={label} required error={errors[field]} className={className}>
            <Select items={options} value={values[field] || null} onValueChange={(value) => update(field)((value as string | null) ?? "")}>
                <SelectTrigger id={`campaign-cert-${field}`} className="w-full" aria-invalid={errors[field] ? true : undefined}>
                    <SelectValue placeholder="Seleccionar" />
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
            icon={<ShieldCheck size={22} strokeWidth={2} />}
            title={isEdit ? "Editar Certificación" : "Registrar Certificación"}
            description={isEdit ? "Actualiza los datos, el trámite y la cobertura de la certificación." : "Registra la certificación de la campaña, su vigencia y los productores que cubre."}
            size="xl"
            footer={
                <>
                    <Button variant="outline" size="xl" onClick={() => onOpenChange(false)}>
                        <X size={20} strokeWidth={2.5} /> Cancelar
                    </Button>
                    <Button size="xl" onClick={handleSave}>
                        <Save size={20} strokeWidth={2.5} /> {isEdit ? "Guardar cambios" : "Registrar"}
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-6">
                <ModalSection title="Certificación y vigencia">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
                        {selectField("tipo", "Tipo de certificación:", CERTIFICATION_TYPES.map((type) => ({ value: type, label: type })), "sm:col-span-2")}
                        <InputField {...bind("nombre")} label="Nombre del certificado:" required maxLength={255} placeholder="Ej. GlobalGAP Mango 2026" className="sm:col-span-2" />
                        <InputField {...bind("organismoEmisor")} label="Organismo emisor:" required maxLength={255} placeholder="Ej. SGS Perú" className="sm:col-span-2" />

                        {isEdit ? (
                            <>
                                {/* El periodo y el estado que de él se deduce van juntos: el estado no se elige, se calcula */}
                                <div className="grid grid-cols-1 gap-4 rounded-xl border border-border p-4 sm:col-span-4 sm:grid-cols-2">
                                    <InputField {...bind("validoDesde")} type="date" label="Válido desde:" optional />
                                    <InputField {...bind("validoHasta")} type="date" label="Válido hasta:" optional />
                                    <p className="flex flex-wrap items-center gap-2 text-[12.5px] text-ink-muted sm:col-span-2">
                                        Estado automático:
                                        <StatusBadge status={vigencia} />
                                    </p>
                                </div>
                                {!usesV1() && selectField("estadoTramite", "Estado del trámite:", TRAMITE_OPTIONS, "sm:col-span-2")}
                            </>
                        ) : (
                            <>
                                <InputField {...bind("validoDesde")} type="date" label="Válido desde:" optional className="sm:col-span-3" />
                                <InputField {...bind("validoHasta")} type="date" label="Válido hasta:" optional className="sm:col-span-3" />
                            </>
                        )}
                    </div>
                </ModalSection>

                <ModalSection title="Productores cubiertos y costo">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
                        <FormField
                            label="Productores cubiertos:"
                            optional
                            hint={producers.length > 0 ? `${values.productores.length} de ${producers.length} seleccionados` : undefined}
                            className="sm:col-span-6"
                        >
                            <ChipSelect
                                ariaLabel="Productores cubiertos por la certificación"
                                options={producers.map((producer) => ({
                                    value: producer.id,
                                    label: producer.nombre,
                                    badge: producer.kilos !== undefined && producer.kilos > 0
                                        ? `${formatKg(producer.kilos)} kg`
                                        : undefined,
                                }))}
                                value={values.productores}
                                onChange={handleProducersChange}
                                emptyMessage={isLoadingProducers ? "Cargando proveedores de la campaña…" : "Esta campaña todavía no tiene proveedores vinculados."}
                            />
                        </FormField>

                        <InputField
                            id="campaign-cert-kilosIniciales"
                            label="Kilos iniciales:"
                            value={String(kilosCalculados)}
                            readOnly
                            unit="kg"
                            hint="Suma calculada de productores"
                            className="sm:col-span-2"
                        />
                        {selectField("moneda", "Moneda:", MONEDA_OPTIONS, "sm:col-span-2")}
                        <InputField {...bind("costo")} label="Costo:" required leading={currencySymbol} step="0.01" min={0} placeholder="0.00" className="sm:col-span-2" />
                    </div>
                </ModalSection>

                <ModalSection title="Documentos y observaciones" aside="Opcional">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
                        <FormField id="campaign-cert-observaciones" label="Observaciones:" optional className="sm:col-span-6">
                            <Textarea
                                id="campaign-cert-observaciones"
                                className="min-h-20 resize-none"
                                placeholder="Escribe aquí las observaciones..."
                                value={values.observaciones}
                                onChange={(event) => update("observaciones")(event.target.value)}
                            />
                        </FormField>

                        <FormField className="sm:col-span-3">
                            <FileDropzone
                                label="Documento del certificado"
                                variant="horizontal"
                                optional
                                hint="PDF · Máx. 10 MB"
                                file={certificateFile ?? certificate?.documento ?? null}
                                replaceable={isEdit && certificate?.documento !== null}
                                onChange={setCertificateFile}
                            />
                        </FormField>
                        <FormField className="sm:col-span-3">
                            <FileDropzone
                                label="Documento de cotización"
                                variant="horizontal"
                                optional
                                hint="PDF · Máx. 10 MB"
                                file={quoteFile ?? certificate?.cotizacion ?? null}
                                replaceable={isEdit && certificate?.cotizacion !== null}
                                onChange={setQuoteFile}
                            />
                        </FormField>
                    </div>
                </ModalSection>
            </div>
        </AppModal>
    );
}
