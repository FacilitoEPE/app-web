import { ArrowLeft, LogOut } from "lucide-react";
import LogoEmpresaOnly from "@/assets/image/logo_empresa_only.webp";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import ModuleLauncher from "@/shared/layout/ModuleLauncher";
import UserProfileLauncher from "@/shared/layout/UserProfileLauncher";
import Hint from "@/shared/components/Hint";
import ConfirmModal from "@/shared/components/ConfirmModal";
import { useGoBack } from "@/shared/hooks/useGoBack";
import CompanyBreadcrumb from "@/shared/layout/CompanyBreadcrumb";
import ThemeToggle from "@/shared/components/ThemeToggle";
import SettingsModal from "@/shared/layout/SettingsModal";
import type { AuthUser } from "@/shared/offline/session";

interface TopNavBarProps {
    onLogout?: () => void;
    user: AuthUser;
}

export default function TopNavBar({ onLogout, user }: TopNavBarProps) {
    const location = useLocation();
    const goBack = useGoBack();
    const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const isRoot = location.pathname === "/modules" || location.pathname === "/";

    return (
        <header className="relative z-40 w-full shrink-0 border-b border-border bg-card dark:border-b-brand/15">
            <div className="relative flex h-[72px] items-center justify-between px-4 sm:px-8 lg:px-14">
                <div className="flex items-center min-w-0">
                    {/* Botón de regresar animado (aparece empujando el logo) */}
                    <div
                        className={`overflow-hidden transition-[width,opacity] duration-500 ease-in-out flex items-center shrink-0 ${
                            isRoot ? "w-0 opacity-0" : "w-9 sm:w-12 opacity-100"
                        }`}
                    >
                        <Hint label="Regresar" side="bottom">
                            <button
                                onClick={goBack}
                                className="text-ink-muted hover:text-brand transition-all flex items-center justify-center shrink-0 w-8 h-8 rounded-full hover:bg-muted mr-1 sm:mr-4 active:scale-95"
                                aria-label="Regresar"
                            >
                                <ArrowLeft size={22} strokeWidth={2} />
                            </button>
                        </Hint>
                    </div>

                    {/* La marca lleva al selector de módulos */}
                    <Link
                        to="/modules"
                        aria-label="Ir al selector de módulos"
                        className="flex items-center gap-2.5 sm:gap-4 min-w-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                    >
                        <img
                            src={LogoEmpresaOnly}
                            alt="Agro Exportaciones Logo"
                            className="h-8 sm:h-10 w-auto object-contain shrink-0"
                        />
                        <div className="hidden min-[420px]:block h-8 sm:h-10 w-0.5 bg-brand shrink-0 rounded-full" />
                        <div className="hidden min-[420px]:flex flex-col justify-center min-w-0">
                            <span className="font-bold text-[13px] sm:text-[16px] md:text-[18px] leading-none text-brand-dark tracking-tight truncate">
                                <span className="sm:hidden">AGRO F.V.</span>
                                <span className="hidden sm:inline">AGRO EXPORTACIONES</span>
                            </span>
                            <span className="hidden sm:block text-[7px] md:text-[8px] tracking-[0.2em] font-bold text-brand mt-1.5">
                                CULTIVANDO CONFIANZA
                            </span>
                        </div>
                    </Link>
                </div>

                <CompanyBreadcrumb />

                <div className="relative z-20 ml-auto flex h-full shrink-0 items-center gap-3 sm:gap-6">
                    <ModuleLauncher />

                    <ThemeToggle />

                    <div className="hidden sm:block h-9 w-px bg-border shrink-0" />

                    {/* Perfil de usuario integrado como Dynamic Notch */}
                    <UserProfileLauncher
                        user={user}
                        onOpenSettings={() => setIsSettingsOpen(true)}
                        onOpenLogout={() => setIsLogoutConfirmOpen(true)}
                    />
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
