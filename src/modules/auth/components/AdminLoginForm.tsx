import FormControl from "@/modules/auth/components/FormControl";
import { useLayoutEffect, useRef, useState } from "react";
import RecoverFormControl from "@/modules/auth/components/RecoverFormControl";
import ResetPasswordForm from "@/modules/auth/components/ResetPasswordForm";
import { Leaf } from "lucide-react";
import LogoEmpresaOnly from "@/assets/image/logo_empresa_only.webp";
import type { AccessProfile } from "@/modules/auth/api/auth.api";
type ViewState = 'login' | 'recover';

interface AdminLoginFormProps {
    onLogin: (profile: AccessProfile, username: string, password: string) => Promise<void>;
    resetting?: boolean;
}

export default function AdminLoginForm({ onLogin, resetting = false }: AdminLoginFormProps) {
    const [view, setView] = useState<ViewState>('login');
    const contentRef = useRef<HTMLDivElement>(null);
    const [cardHeight, setCardHeight] = useState<number>();
    useLayoutEffect(() => {
        if (contentRef.current && view === 'login' && !resetting) {
            setCardHeight(contentRef.current.scrollHeight);
        }
    }, [view, resetting]);

    return (
        <div
            className="w-full max-w-md rounded-2xl overflow-hidden relative z-10 bg-card shadow-2xl border border-border/40 transition-[height] duration-300 ease-in-out"
            style={{ height: !resetting && view === 'login' ? cardHeight : undefined }}
        >
            <div ref={contentRef} className="px-5 py-7 sm:px-10 sm:py-8 lg:px-12 flex flex-col">
                {resetting && <ResetPasswordForm />}
                {!resetting && view === 'recover' && <RecoverFormControl onBack={() => setView('login')} />}

                {!resetting && view === 'login' && (
                    <div className="w-full flex flex-col">
                        <div className="flex items-center gap-4 w-full mb-8">
                            <img src={LogoEmpresaOnly} alt="Agro Exportaciones Logo" className="h-14 w-auto object-contain shrink-0" />
                            <div className="h-14 w-0.5 bg-brand shrink-0 rounded-full"></div>
                            <div className="flex flex-col justify-center">
                                <span className="font-bold text-[18px] md:text-[20px] leading-none text-brand-dark tracking-tight">AGRO EXPORTACIONES</span>
                                <span className="text-[8px] md:text-[9px] tracking-[0.2em] font-bold text-brand mt-1.5">CULTIVANDO CONFIANZA</span>
                            </div>
                        </div>

                        <div className="mb-6">
                            <h1 className="text-[24px] font-semibold text-ink tracking-tight">Iniciar sesión</h1>
                            <div className="h-1 w-10 bg-brand rounded-full mb-3"></div>
                            <p className="text-xs text-muted-foreground">
                                Accede para continuar con tus operaciones
                            </p>
                        </div>

                        <FormControl onSubmit={onLogin} />

                        <div className="mt-6 w-full flex justify-center">
                            <button onClick={() => setView('recover')} className="text-brand text-sm font-bold hover:underline transition-colors">
                                ¿Olvidó su contraseña?
                            </button>
                        </div>

                        <div className="w-full mt-8 flex items-center gap-3">
                            <Leaf size={12} className="text-brand shrink-0" />
                            <span className="text-[9px] font-bold tracking-[0.15em] text-ink-muted whitespace-nowrap opacity-80">
                                GENTE QUE CULTIVA OPORTUNIDADES
                            </span>
                            <div className="flex-1 h-px bg-border"></div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
