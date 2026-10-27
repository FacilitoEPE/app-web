import FormControl from "@/modules/auth/components/FormControl";
import { useLayoutEffect, useRef, useState } from "react";
import RecoverFormControl from "@/modules/auth/components/RecoverFormControl";
import ConfirmSuccessFormControl from "@/modules/auth/components/ConfirmSuccessFormControl";
import { CheckCircle2, Download, Leaf, PauseCircle, RotateCcw } from "lucide-react";
import LogoEmpresaOnly from "@/assets/image/logo_empresa_only.webp";
type ViewState = 'login' | 'recover' | 'confirm';
type DownloadState = 'idle' | 'downloading' | 'cancelled' | 'complete';

interface AdminLoginFormProps {
    onLogin: () => void;
    onDriverLogin?: () => void;
}

export default function AdminLoginForm({ onLogin, onDriverLogin }: AdminLoginFormProps) {
    const [view, setView] = useState<ViewState>('login');
    const contentRef = useRef<HTMLDivElement>(null);
    const [cardHeight, setCardHeight] = useState<number>();
    const [downloadState, setDownloadState] = useState<DownloadState>('idle');
    const [downloadProgress, setDownloadProgress] = useState(0);

    useLayoutEffect(() => {
        if (downloadState !== 'downloading') return;
        const timer = window.setInterval(() => {
            setDownloadProgress((current) => {
                const next = Math.min(current + 8, 100);
                if (next === 100) {
                    window.clearInterval(timer);
                    setDownloadState('complete');
                }
                return next;
            });
        }, 220);
        return () => window.clearInterval(timer);
    }, [downloadState]);

    useLayoutEffect(() => {
        if (contentRef.current) {
            setCardHeight(contentRef.current.scrollHeight);
        }
    }, [view]);

    return (
        <div
            className="w-full max-w-md rounded-2xl overflow-hidden relative z-10 bg-card shadow-2xl border border-border/40 transition-[height] duration-300 ease-in-out"
            style={{ height: cardHeight }}
        >
            <div ref={contentRef} className="px-5 py-7 sm:px-10 sm:py-8 lg:px-12 flex flex-col">
                {view === 'recover' && <RecoverFormControl onBack={() => setView('login')} />}

                {view === 'confirm' && <ConfirmSuccessFormControl onBack={() => setView('login')} onConfirm={onLogin} />}

                {view === 'login' && (
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

                        <FormControl onSubmit={() => setView('confirm')} onDriverLogin={onDriverLogin} />

                        <OfflineDownload
                            state={downloadState}
                            progress={downloadProgress}
                            onStart={() => {
                                setDownloadProgress(0);
                                setDownloadState('downloading');
                            }}
                            onCancel={() => setDownloadState('cancelled')}
                        />

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

interface OfflineDownloadProps {
    state: DownloadState;
    progress: number;
    onStart: () => void;
    onCancel: () => void;
}

function OfflineDownload({ state, progress, onStart, onCancel }: OfflineDownloadProps) {
    if (state === 'complete') {
        return (
            <div className="offline-download offline-download-success" role="status">
                <CheckCircle2 size={17} />
                <span>Acceso sin conexión listo</span>
            </div>
        );
    }

    if (state === 'downloading') {
        return (
            <div className="offline-download" role="status" aria-live="polite">
                <div className="offline-download-row">
                    <span className="offline-download-label"><Download size={16} className="download-bounce" /> Descargando acceso sin conexión</span>
                    <span>{progress}%</span>
                </div>
                <div className="offline-progress-track"><div className="offline-progress-value" style={{ width: `${progress}%` }} /></div>
                <button type="button" className="offline-download-action" onClick={onCancel}><PauseCircle size={14} /> Cancelar</button>
            </div>
        );
    }

    if (state === 'cancelled') {
        return (
            <div className="offline-download offline-download-cancelled" role="status">
                <span>Descarga cancelada</span>
                <button type="button" className="offline-download-action" onClick={onStart}><RotateCcw size={14} /> Descargar de nuevo</button>
            </div>
        );
    }

    return (
        <button type="button" className="offline-download offline-download-start" onClick={onStart}>
            <Download size={16} />
            <span><strong>Preparar acceso sin conexión</strong><small>Descarga lo necesario para continuar sin internet</small></span>
        </button>
    );
}
