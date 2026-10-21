import { CalendarRange } from "lucide-react";
import PageHeader from "@/shared/layout/PageHeader";

/**
 * Programa semanal de entregas de una campaña. Es una vista aparte que todavía se está definiendo: por ahora existe
 * su ruta y su archivo, sin diseño. Cuando se defina, esta página la arma con los componentes compartidos
 * (banner de campaña, `TableCard`, etc.) como las demás vistas de la campaña.
 */
export default function CampaignWeeklyDeliveryProgramPage() {
    return (
        <div className="px-4 py-5 sm:px-8 lg:px-14">
            <PageHeader
                icon={<CalendarRange size={24} strokeWidth={2.5} />}
                title="Programa semanal de entregas"
                description="Esta vista todavía está en preparación."
            />
        </div>
    );
}
