import { useRef, useState } from "react";
import { useResetOnToggle } from "@/shared/hooks/useModalForm";
import { getBadRequestFieldErrors, type FormFieldErrors } from "@/shared/validation/api-form-errors";
import { revealFormErrors } from "@/shared/utils/errorScroll";

interface UseFormSubmitOptions<V> {
    /** El modal que contiene el formulario: sus errores y su estado de guardado se reinician al abrirse o cerrarse */
    open: boolean;
    /** Revisión previa mínima (campos vacíos, formatos): devuelve los errores por campo, o `{}` si todo está bien */
    validate: (values: V) => FormFieldErrors;
    /** Guarda los valores. Si falla, el rechazo se interpreta como un 400 del backend y se ubica bajo cada campo */
    onSubmit: (values: V) => void | Promise<void>;
    /** Propiedades del backend → campo del formulario, para ubicar cada mensaje del 400 bajo su campo */
    backendFields: Record<string, string>;
}

/**
 * Flujo de guardado de un formulario en modal, igual que el de campañas: el botón nunca queda desactivado por
 * el contenido (solo mientras guarda), los errores de la revisión previa y los que devuelve el backend salen
 * bajo cada campo, y los que no pertenecen a ningún campo quedan en `errors._form`.
 */
export function useFormSubmit<V>({ open, validate, onSubmit, backendFields }: UseFormSubmitOptions<V>) {
    const [errors, setErrors] = useState<FormFieldErrors>({});
    const [saving, setSaving] = useState(false);
    // El estado no alcanza contra un doble clic: dos clics en el mismo instante verían `saving` en false
    const inFlight = useRef(false);

    useResetOnToggle(open, () => {
        setErrors({});
        setSaving(false);
        inFlight.current = false;
    });

    /** Quita el error de un campo (y el general) en cuanto el usuario lo corrige */
    const clearError = (field: string) => setErrors((current) => ({ ...current, [field]: undefined, _form: undefined }));

    const submit = async (values: V) => {
        if (inFlight.current) return;
        const found = validate(values);
        if (Object.keys(found).length > 0) {
            setErrors(found);
            revealFormErrors();
            return;
        }
        inFlight.current = true;
        setSaving(true);
        setErrors({});
        try {
            await onSubmit(values);
        } catch (error) {
            setErrors(getBadRequestFieldErrors(error, backendFields));
        } finally {
            inFlight.current = false;
            setSaving(false);
        }
    };

    return { errors, setErrors, saving, clearError, submit };
}
