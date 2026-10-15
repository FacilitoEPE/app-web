import { ChevronDown, LogOut, Settings, User, ArrowLeft } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import LogoEmpresaOnly from "@/assets/image/logo_empresa_only.webp";
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import ModuleLauncher from "@/shared/layout/ModuleLauncher";
import Hint from "@/shared/components/Hint";
import ConfirmModal from "@/shared/components/ConfirmModal";
import { BRAND_ACTIVE_SURFACE } from "@/shared/styles/brandGradients";
import { getParentHref } from "@/shared/layout/breadcrumbRoutes";
import CompanyBreadcrumb from "@/shared/layout/CompanyBreadcrumb";
import ThemeToggle from "@/shared/components/ThemeToggle";
import NotificationsMenu from "@/shared/layout/NotificationsMenu";
import SettingsModal from "@/shared/layout/SettingsModal";

interface TopNavBarProps {
    onLogout?: () => void;
}

export default function TopNavBar({ onLogout }: TopNavBarProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const isRoot = location.pathname === '/modules' || location.pathname === '/';

    return (
        <header className="shrink-0 bg-card w-full z-20 border-b border-border dark:border-b-brand/15">
            <div className="relative flex h-[72px] items-center justify-between px-4 sm:px-8 lg:px-14">
            <div className="flex items-center min-w-0">
                {/* Botón de regresar animado (aparece empujando el logo) */}
                <div
                    className={`overflow-hidden transition-[width,opacity] duration-500 ease-in-out flex items-center shrink-0 ${
                        isRoot ? 'w-0 opacity-0' : 'w-9 sm:w-12 opacity-100'
                    }`}
                >
                    <Hint label="Regresar" side="bottom">
                        <button
                            // Vuelve a la vista anterior de la escalera (la misma que enlaza el breadcrumb)
                            onClick={() => navigate(getParentHref(location.pathname))}
                            className="text-ink-muted hover:text-brand transition-all flex items-center justify-center shrink-0 w-8 h-8 rounded-full hover:bg-muted mr-1 sm:mr-4 active:scale-95"
                            aria-label="Regresar"
                        >
                            <ArrowLeft size={22} strokeWidth={2} />
                        </button>
                    </Hint>
                </div>

                <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
                    <img src={LogoEmpresaOnly} alt="Agro Exportaciones Logo" className="h-8 sm:h-10 w-auto object-contain shrink-0" />
                    {/* Línea divisoria verde como en el login */}
                    <div className="hidden min-[420px]:block h-8 sm:h-10 w-0.5 bg-brand shrink-0 rounded-full"></div>
                    {/* El lockup completo no cabe en móvil: se deja solo la marca corta */}
                    {/* Bajo 420px no entra ni la marca corta junto a los controles: queda solo el logo */}
                    <div className="hidden min-[420px]:flex flex-col justify-center min-w-0">
                        <span className="font-bold text-[13px] sm:text-[16px] md:text-[18px] leading-none text-brand-dark tracking-tight truncate">
                            <span className="sm:hidden">AGRO F.V.</span>
                            <span className="hidden sm:inline">AGRO EXPORTACIONES</span>
                        </span>
                        <span className="hidden sm:block text-[7px] md:text-[8px] tracking-[0.2em] font-bold text-brand mt-1.5">CULTIVANDO CONFIANZA</span>
                    </div>
                </div>
            </div>
            <CompanyBreadcrumb />

            <div className="flex items-center gap-3 sm:gap-6 ml-auto shrink-0">
                <ModuleLauncher />

                <ThemeToggle />

                <NotificationsMenu />

                <div className="hidden sm:block h-9 w-px bg-border shrink-0"></div>

                <DropdownMenu>
                    <DropdownMenuTrigger aria-label="Menú de usuario" className="flex items-center gap-3 p-1 sm:p-1.5 sm:pl-2 rounded-xl transition-all hover:bg-muted outline-none focus-visible:ring-2 focus-visible:ring-brand/30 focus-visible:border-brand/40 active:scale-95">
                        <span
                            className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full border border-transparent text-white"
                            style={BRAND_ACTIVE_SURFACE}
                        >
                            <User size={20} strokeWidth={2} />
                        </span>
                        {/* Nombre y rol se ocultan en móvil: el avatar basta como acceso al menú */}
                        <span className="hidden md:flex flex-col items-start">
                            <span className="text-sm font-bold text-ink leading-tight">Juan Pérez</span>
                            <span className="text-xs text-ink-muted font-medium">Usuario Normal</span>
                        </span>
                        <ChevronDown size={16} className="hidden md:block text-ink-muted ml-1" />
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="end" sideOffset={8} className="w-56 p-1.5">
                        <DropdownMenuItem className="gap-3 px-3 py-2.5 text-[13px] font-medium text-ink-body" onClick={() => setIsSettingsOpen(true)}>
                            <Settings size={16} />
                            Configuración
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            variant="destructive"
                            className="gap-3 px-3 py-2.5 text-[13px] font-medium"
                            onClick={() => setIsLogoutConfirmOpen(true)}
                        >
                            <LogOut size={16} />
                            Cerrar sesión
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            <SettingsModal open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
            <ConfirmModal
                open={isLogoutConfirmOpen}
                onOpenChange={setIsLogoutConfirmOpen}
                tone="warning"
                icon={<LogOut size={28} strokeWidth={2.25} />}
                title="¿Cerrar sesión?"
                description="Tendrás que volver a ingresar tus credenciales para acceder al sistema."
                confirmLabel="Sí, cerrar sesión"
                onConfirm={() => onLogout?.()}
            />
            </div>
        </header>
    );
}
