import RequiredMark from "@/shared/components/RequiredMark";
import type { ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/shared/components/ui/field";

interface FormFieldProps {
    /** Id del control: enlaza la etiqueta (`htmlFor`) y el mensaje de error (`${id}-error`) */
    id?: string;
    /** Se omite cuando el control dibuja su propia etiqueta (p. ej. `FileDropzone`) */
    label?: ReactNode;
    /** Marca el campo como obligatorio: asterisco en la etiqueta */
    required?: boolean;
    /** Anota "(opcional)" en la etiqueta */
    optional?: boolean;
    /** "compact": etiqueta chica en mayúsculas, para formularios densos */
    variant?: "default" | "compact";
    error?: string;
    /** Ayuda debajo del control; se reemplaza por el error cuando lo hay */
    hint?: string;
    /** Clases del contenedor, p. ej. `sm:col-span-2` para ocupar dos columnas de una grilla */
    className?: string;
    /** El control: `Input`, `Select`, `Combobox`, `DatePicker`, `Textarea`, `FileDropzone`… Sin él, solo se muestra el error (error general del formulario). */
    children?: ReactNode;
}

/**
 * Un campo de formulario: etiqueta + control + ayuda/error, con el mismo espaciado y el mismo error
 * (con ícono y animación de entrada) en todos los modales. Es el único lugar donde se arma ese trío:
 * `InputField` lo usa para texto y número; los selectores, fechas, áreas de texto y archivos lo usan directo.
 * El control debe llevar el `id` que se pasa acá y `aria-invalid` cuando hay error.
 */
export default function FormField({ id, label, required, optional, variant, error, hint, className, children }: FormFieldProps) {
    return (
        <Field className={className} data-invalid={error ? true : undefined}>
            {label && (
                // `htmlFor` se conserva para el nombre accesible del control, pero un clic en el título no debe
                // enfocar el input ni abrir el selector: solo el recuadro del campo responde.
                <FieldLabel htmlFor={id} variant={variant} optional={optional} onClick={(event) => event.preventDefault()}>
                    {label} {required && !optional && <RequiredMark />}
                </FieldLabel>
            )}
            {children}
            {error ? (
                <div className="animate-in slide-in-from-top-1 fade-in duration-300">
                    <FieldError id={id ? `${id}-error` : undefined} className="flex items-center gap-2 text-[13px] font-medium">
                        <AlertCircle size={14} className="shrink-0" /> {error}
                    </FieldError>
                </div>
            ) : hint && <FieldDescription className="text-[12px]">{hint}</FieldDescription>}
        </Field>
    );
}
