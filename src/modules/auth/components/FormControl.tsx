import { refreshRemoteData, usesV1 } from '@/shared/api/data-contract';
import FormField from '@/shared/components/FormField';
import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Field, FieldLabel } from "@/shared/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupText, InputGroupInput, InputGroupButton } from "@/shared/components/ui/input-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { User, Lock, Eye, EyeOff, LogIn, Truck } from "lucide-react";
import Hint from "@/shared/components/Hint";
import SegmentedControl from "@/shared/components/SegmentedControl";
import { getRegisteredDrivers, setActiveDriver, useDriverPortalState } from "@/modules/driver-portal/driverPortal.store";

interface FormControlProps {
    onSubmit: () => void;
    onDriverLogin?: () => void;
}

const inputGroupClassName = "h-11 border-border/70 bg-background transition-colors rounded-lg has-[[data-slot=input-group-control]:focus-visible]:border-brand has-[[data-slot=input-group-control]:focus-visible]:ring-1 has-[[data-slot=input-group-control]:focus-visible]:ring-brand/30";

export default function FormControl({ onSubmit, onDriverLogin }: FormControlProps) {
    const [driverLoading, setDriverLoading] = useState(false);
    const [driverError, setDriverError] = useState("");
    const [role, setRole] = useState<"admin" | "chofer">("admin");
    const [showPassword, setShowPassword] = useState(false);
    const { activeDriverId } = useDriverPortalState();
    const drivers = getRegisteredDrivers();
    const driverItems = drivers.map((d) => ({
        value: d.id,
        label: `${d.nombre} · ${d.placaAsignada}`,
    }));

    return (
        <form
            className="flex flex-col w-full space-y-4"
            onSubmit={(e) => {
                e.preventDefault();
                if (role === "chofer" && (driverLoading || !drivers.length)) return;
                if (role === "chofer" && onDriverLogin) {
                    onDriverLogin();
                } else {
                    onSubmit();
                }
            }}
        >
            <Field className="space-y-1.5">
                <FieldLabel className="text-sm font-bold text-ink">Perfil de acceso</FieldLabel>
                <SegmentedControl
                    options={[
                        { label: "Administrador", value: "admin" },
                        { label: "Chofer", value: "chofer" },
                    ]}
                    value={role}
                    onChange={(next) => {
                        setRole(next as "admin" | "chofer");
                        if (next === "chofer" && usesV1()) {
                            setDriverLoading(true); setDriverError("");
                            void refreshRemoteData().catch(()=>setDriverError("No se pudieron cargar los choferes. Vuelve a seleccionar el perfil para reintentar.")).finally(()=>setDriverLoading(false));
                        }
                    }}
                />
            </Field>

            {role === "admin" ? (
                <>
                    <Field className="space-y-1.5">
                        <FieldLabel htmlFor="username" className="text-sm font-bold text-ink">Usuario</FieldLabel>
                        <InputGroup className={inputGroupClassName}>
                            <InputGroupAddon align="inline-start" className="pl-4 pr-2">
                                <InputGroupText className="text-brand"><User size={20} strokeWidth={2.5} /></InputGroupText>
                            </InputGroupAddon>
                            <InputGroupInput
                                id="username"
                                name="username"
                                autoComplete="username"
                                placeholder="Ingresa tu usuario"
                                className="h-full text-foreground placeholder:text-muted-foreground/50 text-sm pl-2"
                            />
                        </InputGroup>
                    </Field>

                    <Field className="space-y-1.5">
                        <FieldLabel htmlFor="password" className="text-sm font-bold text-ink">Contraseña</FieldLabel>
                        <InputGroup className={inputGroupClassName}>
                            <InputGroupAddon align="inline-start" className="pl-4 pr-2">
                                <InputGroupText className="text-brand"><Lock size={20} strokeWidth={2.5} /></InputGroupText>
                            </InputGroupAddon>
                            <InputGroupInput
                                id="password"
                                name="password"
                                type={showPassword ? "text" : "password"}
                                autoComplete="current-password"
                                placeholder="Ingresa tu contraseña"
                                className="h-full text-foreground placeholder:text-muted-foreground/50 text-sm pl-2"
                            />
                            <InputGroupAddon align="inline-end" className="pr-4">
                                <Hint label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>
                                    <InputGroupButton
                                        type="button"
                                        size="icon-sm"
                                        aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                                        aria-pressed={showPassword}
                                        onClick={() => setShowPassword((prev) => !prev)}
                                        className="text-ink-muted hover:text-brand transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={20} strokeWidth={2.5} /> : <Eye size={20} strokeWidth={2.5} />}
                                    </InputGroupButton>
                                </Hint>
                            </InputGroupAddon>
                        </InputGroup>
                    </Field>
                </>
            ) : (
                <Field className="space-y-1.5">
                    <FieldLabel className="text-sm font-bold text-ink">Chofer registrado</FieldLabel>
                    <Select
                        items={driverItems}
                        value={activeDriverId}
                        onValueChange={async (next) => {
                            if (next) await setActiveDriver(next as string);
                        }}
                    >
                        <SelectTrigger aria-label="Chofer registrado" className="h-11 rounded-lg bg-background font-semibold">
                            <Truck size={18} className="mr-2 text-brand shrink-0" />
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {drivers.map((driver) => (
                                <SelectItem key={driver.id} value={driver.id}>
                                    {driver.nombre} · Placa {driver.placaAsignada} ({driver.transportista})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <p className="text-[11.5px] font-medium text-ink-muted">
                        Accede al portal móvil del conductor para ver tus campañas, ruta de fincas y reportar etapas de despacho.
                    </p>
                </Field>
            )}

            <div className="pt-2">
                {role === "chofer" && <FormField error={driverError} hint={driverLoading ? "Cargando choferes…" : drivers.length ? undefined : "No hay choferes registrados."} />}
                <Button type="submit" size="xl" className="w-full" disabled={role === "chofer" && (driverLoading || !drivers.length)}>
                    <LogIn size={20} strokeWidth={2.5} /> {role === "chofer" ? "Ingresar al Portal del Chofer" : "Ingresar"}
                </Button>
            </div>
        </form>
    );
}
