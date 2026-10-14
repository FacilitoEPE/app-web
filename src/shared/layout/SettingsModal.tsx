import { useState } from "react";
import { Settings, X } from "lucide-react";
import AppModal from "@/shared/components/AppModal";
import FormField from "@/shared/components/FormField";
import SegmentedControl from "@/shared/components/SegmentedControl";
import { Button } from "@/shared/components/ui/button";
import { Switch } from "@/shared/components/ui/switch";
import { useTheme, type Theme } from "@/shared/hooks/useTheme";
import { isSplashMuted, saveSplashMuted } from "@/shared/components/welcomeSplashSound";

const THEME_OPTIONS = [
    { value: "light", label: "Claro" },
    { value: "dark", label: "Oscuro" },
];

/**
 * Preferencias del usuario en este equipo: tema y sonido de la intro. Se aplican al instante y se recuerdan en el
 * navegador; no hay nada que guardar en el backend todavía (TODO(api): mover a la cuenta cuando exista el servicio).
 */
export default function SettingsModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
    const { theme, setTheme } = useTheme();
    const [soundOn, setSoundOn] = useState(() => !isSplashMuted());

    const toggleSound = (on: boolean) => {
        setSoundOn(on);
        saveSplashMuted(!on);
    };

    return (
        <AppModal
            open={open}
            onOpenChange={onOpenChange}
            icon={<Settings size={22} strokeWidth={2} />}
            title="Configuración"
            description="Preferencias de la aplicación en este equipo. Los cambios se aplican al instante."
            size="sm"
            footer={<Button variant="outline" size="xl" onClick={() => onOpenChange(false)}><X size={20} strokeWidth={2.5} /> Cerrar</Button>}
        >
            <div className="flex flex-col gap-5">
                <FormField label="Tema" hint="El modo oscuro reduce el brillo en ambientes con poca luz.">
                    <SegmentedControl options={THEME_OPTIONS} value={theme} onChange={(value) => setTheme(value as Theme)} />
                </FormField>

                <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface-page/60 px-4 py-3">
                    <div className="min-w-0">
                        <p id="settings-sound-label" className="text-[13px] font-semibold text-ink">Sonido de la intro</p>
                        <p className="text-[12px] text-ink-muted">Música breve de la animación al iniciar sesión.</p>
                    </div>
                    <Switch checked={soundOn} onCheckedChange={toggleSound} aria-labelledby="settings-sound-label" />
                </div>
            </div>
        </AppModal>
    );
}
