import FormField from "@/shared/components/FormField";
import { Combobox } from "@/shared/components/ui/combobox";
import { getUbigeoOptions } from "@/shared/utils/ubigeo";

interface UbigeoFieldBinding {
    id: string;
    value: string;
    error?: string;
    onChange: (value: string) => void;
}

interface UbigeoFieldsProps {
    departamento: UbigeoFieldBinding;
    provincia: UbigeoFieldBinding;
    distrito?: UbigeoFieldBinding;
    distritoLabel?: string;
    className?: string;
    distritoClassName?: string;
    disabled?: boolean;
}

export default function UbigeoFields({
    departamento, provincia, distrito, distritoLabel = "Distrito", className, distritoClassName = className, disabled,
}: UbigeoFieldsProps) {
    const options = getUbigeoOptions(departamento.value, provincia.value, distrito?.value);

    return (
        <>
            <FormField id={departamento.id} label="Departamento" required error={departamento.error} className={className}>
                <Combobox
                    id={departamento.id}
                    required
                    invalid={Boolean(departamento.error)}
                    disabled={disabled}
                    options={options.departamento}
                    value={departamento.value}
                    placeholder="Selecciona un departamento"
                    onChange={value => {
                        if (value === departamento.value) return;
                        departamento.onChange(value);
                        provincia.onChange("");
                        distrito?.onChange("");
                    }}
                />
            </FormField>
            <FormField id={provincia.id} label="Provincia" required error={provincia.error} className={className}>
                <Combobox
                    key={departamento.value}
                    id={provincia.id}
                    required
                    invalid={Boolean(provincia.error)}
                    disabled={disabled || options.provincia.length === 0}
                    options={options.provincia}
                    value={provincia.value}
                    placeholder={departamento.value ? "Selecciona una provincia" : "Primero elige un departamento"}
                    onChange={value => {
                        if (value === provincia.value) return;
                        provincia.onChange(value);
                        distrito?.onChange("");
                    }}
                />
            </FormField>
            {distrito && (
                <FormField id={distrito.id} label={distritoLabel} required error={distrito.error} className={distritoClassName}>
                    <Combobox
                        key={`${departamento.value}/${provincia.value}`}
                        id={distrito.id}
                        required
                        invalid={Boolean(distrito.error)}
                        disabled={disabled || options.distrito.length === 0}
                        options={options.distrito}
                        value={distrito.value}
                        placeholder={provincia.value ? `Selecciona ${distritoLabel.toLowerCase()}` : "Primero elige una provincia"}
                        onChange={distrito.onChange}
                    />
                </FormField>
            )}
        </>
    );
}
