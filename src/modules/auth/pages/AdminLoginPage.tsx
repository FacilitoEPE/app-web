import AdminLoginForm from "@/modules/auth/components/AdminLoginForm";
import { Globe, Sprout, TrendingUp } from "lucide-react";
import type { AccessProfile } from "@/modules/auth/api/auth.api";

interface AdminLoginPageProps {
  onLogin: (profile: AccessProfile, username: string, password: string) => Promise<void>;
  resetting?: boolean;
}

export default function AdminLoginPage({ onLogin, resetting }: AdminLoginPageProps) {
  return (
    <div
      className="min-h-screen w-full flex flex-col lg:flex-row relative bg-cover bg-center bg-no-repeat overflow-hidden"
      style={{ backgroundImage: "url('/image/fondo_login.webp')" }}
    >
      {/* Panel de marca: en móvil se reduce a un encabezado corto sobre la foto */}
      <div className="relative flex flex-col justify-between px-6 pt-10 pb-8 sm:px-10 lg:p-20 w-full lg:w-[45%] z-10 text-white">
        <div className="absolute inset-0 -z-10 bg-linear-to-b lg:bg-linear-to-r from-black/70 via-black/40 to-transparent pointer-events-none"></div>

        <div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[56px] font-normal leading-none tracking-tight">
            De la cosecha<br/>
            a la <span className="text-primary lg:text-brand font-medium">exportación</span>
          </h1>
          <div className="h-1 w-16 lg:w-20 bg-brand mt-4 mb-4 lg:mt-6 lg:mb-6"></div>
          <p className="text-sm md:text-base max-w-sm text-white/90">
            Conectamos el esfuerzo del campo con oportunidades en el mundo.
          </p>
        </div>

        {/* Decorativo: sin valor en pantallas chicas, donde el foco es el formulario */}
        <div className="hidden lg:flex gap-4 md:gap-6 mt-auto items-center">
          <div className="flex items-center gap-1.5 h-10">
            <div className="h-full w-1 bg-brand"></div>
            <div className="h-[70%] w-1 bg-brand"></div>
            <div className="h-[40%] w-1 bg-brand"></div>
          </div>

          <div className="flex items-center gap-3 border-r border-white/30 pr-4 md:pr-6">
            <Sprout size={28} className="text-brand" />
            <span className="text-xs font-medium leading-tight text-white">Producción<br/>responsable</span>
          </div>
          <div className="flex items-center gap-3 border-r border-white/30 pr-4 md:pr-6">
            <Globe size={28} className="text-brand" />
            <span className="text-xs font-medium leading-tight">Mercados<br/>globales</span>
          </div>
          <div className="flex items-center gap-3">
            <TrendingUp size={28} className="text-brand" />
            <span className="text-xs font-medium leading-tight">Un futuro<br/>más sostenible</span>
          </div>
        </div>
      </div>

      <div className="hidden lg:flex absolute right-4 top-1/2 -translate-y-1/2 [writing-mode:vertical-rl] text-[10px] font-bold tracking-[0.2em] text-foreground/80 z-20 items-center gap-4 whitespace-nowrap">
        <div className="h-8 w-0.5 bg-brand"></div>
        [AGRO EXPORTA. CONECTA. TRANSFORMA]
        <div className="h-8 w-0.5 bg-brand"></div>
      </div>

      <div className="flex flex-1 w-full lg:w-1/2 items-center justify-center lg:justify-end px-4 pb-10 sm:px-10 lg:pb-0 lg:pr-12 z-10">
          <AdminLoginForm onLogin={onLogin} resetting={resetting} />
      </div>
    </div>
  );
}
