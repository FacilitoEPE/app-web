import type { ReactNode } from "react";
import { TooltipProvider } from "@/shared/components/ui/tooltip";
import TopNavBar from "@/shared/layout/TopNavBar";
import type { AuthUser } from "@/shared/offline/session";

interface DashboardLayoutProps {
    children: ReactNode;
    onLogout?: () => void;
    user: AuthUser;
}

export default function DashboardLayout({ children, onLogout, user }: DashboardLayoutProps) {
    return (
        <TooltipProvider delay={300}>
            <div className="flex flex-col h-screen overflow-hidden w-full">
                <TopNavBar onLogout={onLogout} user={user} />

                <div className="flex flex-1 overflow-hidden w-full relative z-10">
                    {/* `relative` para que los fondos absolutos de cada página se anclen acá y no en un ancestro lejano */}
                    <main className="relative flex-1 overflow-y-auto page-ambient">
                        {children}
                    </main>
                </div>
            </div>
        </TooltipProvider>
    );
}
