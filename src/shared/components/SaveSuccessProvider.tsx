import { useCallback, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import SuccessModal from "@/shared/components/SuccessModal";
import { SaveSuccessContext } from "@/shared/hooks/useSaveSuccess";

type Notice = { title: string; description: string };

export default function SaveSuccessProvider({ children }: { children: ReactNode }) {
    const { pathname } = useLocation();
    const [state, setState] = useState<{ pathname: string; notice?: Notice }>({ pathname });
    if (state.pathname !== pathname) setState({ pathname });

    // La confirmación sobrevive al cierre del formulario, pero no al cambio de pantalla.
    const show = useCallback((title: string, description: string) => {
        setState(current => current.pathname === pathname ? { pathname, notice: { title, description } } : current);
    }, [pathname]);

    return (
        <SaveSuccessContext value={show}>
            {children}
            <SuccessModal
                open={state.notice !== undefined}
                onOpenChange={open => { if (!open) setState({ pathname }); }}
                title={state.notice?.title ?? ""}
                description={state.notice?.description ?? ""}
            />
        </SaveSuccessContext>
    );
}
