import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Field, FieldLabel } from "@/shared/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupText, InputGroupInput } from "@/shared/components/ui/input-group";
import { Mail, KeyRound } from "lucide-react";
import { requestPasswordRecovery } from "@/modules/auth/api/auth.api";
import { getBadRequestFieldErrors } from "@/shared/validation/api-form-errors";

interface RecoverFormControlProps {
    onBack: () => void;
}

export default function RecoverFormControl({ onBack }: RecoverFormControlProps) {
    const [correo, setCorreo] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (submitting) return;
        const trimmed = correo.trim();
        if (!trimmed) {
            setErrorMessage("Ingresa tu correo electrónico.");
            return;
        }
        setSubmitting(true);
        setErrorMessage("");
        setSuccessMessage("");
        try {
            const response = await requestPasswordRecovery(trimmed);
            setSuccessMessage(
                response.message,
            );
        } catch (err) {
            setErrorMessage(
                getBadRequestFieldErrors(err, { correo: "correo" }).correo
                ?? getBadRequestFieldErrors(err, {})._form
                ?? (err instanceof Error ? err.message : "No se pudo enviar el correo de recuperación."),
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="w-full flex flex-col items-center">
            <div className="h-12 w-12 rounded-full bg-brand/10 flex items-center justify-center mb-4">
                <Mail size={22} strokeWidth={2.5} className="text-brand" />
            </div>

            <h1 className="text-[24px] font-semibold text-ink tracking-tight text-center">Recuperar contraseña</h1>
            <div className="h-1 w-10 bg-brand rounded-full my-3"></div>
            <p className="text-xs text-muted-foreground text-center max-w-70 mb-6">
                Ingresa el correo de tu cuenta para recibir un enlace de recuperación.
            </p>

            <form className="flex flex-col gap-4 w-full" onSubmit={handleSubmit}>
                <Field className="space-y-1.5">
                    <FieldLabel htmlFor="recover-email" className="text-sm font-bold text-ink">
                        Correo electrónico
                    </FieldLabel>
                    <InputGroup className="h-11 border-border/70 bg-background transition-colors rounded-lg has-[[data-slot=input-group-control]:focus-visible]:border-brand has-[[data-slot=input-group-control]:focus-visible]:ring-1 has-[[data-slot=input-group-control]:focus-visible]:ring-brand/30">
                        <InputGroupAddon align="inline-start" className="pl-4 pr-2">
                            <InputGroupText className="text-brand"><Mail size={20} strokeWidth={2.5} /></InputGroupText>
                        </InputGroupAddon>
                        <InputGroupInput
                            id="recover-email"
                            name="email"
                            type="email"
                            required
                            value={correo}
                            onChange={(e) => {
                                setCorreo(e.target.value);
                                setErrorMessage("");
                            }}
                            autoComplete="email"
                            placeholder="Ingresa tu correo"
                            className="h-full text-foreground placeholder:text-muted-foreground/50 text-sm pl-2"
                        />
                    </InputGroup>
                </Field>

                {errorMessage && (
                    <p role="alert" className="text-sm font-medium text-destructive">
                        {errorMessage}
                    </p>
                )}
                {successMessage && (
                    <p role="status" className="text-sm font-medium text-brand">
                        {successMessage}
                    </p>
                )}

                <Button type="submit" size="xl" className="w-full" disabled={submitting}>
                    <KeyRound size={20} strokeWidth={2.5} /> {submitting ? "Enviando..." : "Recuperar"}
                </Button>

                <div className="mt-2 w-full flex justify-center">
                    <button type="button" onClick={onBack} className="text-brand text-sm font-bold hover:underline transition-colors">
                        Volver
                    </button>
                </div>
            </form>
        </div>
    );
}
