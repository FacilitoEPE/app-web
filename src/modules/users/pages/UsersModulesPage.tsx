import ModulesGrid from "@/modules/users/components/ModulesGrid";
import HeroModules from "@/modules/users/components/HeroModules";
import ModulesFooter from "@/modules/users/components/ModulesFooter";
import WaveClipDefs from "@/modules/users/components/WaveClipDefs";

export default function UsersModulesPage() {
  return (
    <>
      {/* Definiciones de los recortes curvos, compartidas por el hero y las cards */}
      <WaveClipDefs />
      <div className="absolute inset-0 z-0 bg-surface-page" aria-hidden="true">
        <div
          className="absolute inset-0 mix-blend-multiply opacity-70"
          style={{
            backgroundImage: "url('/image/fondo_modules.webp')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        ></div>
      </div>

      <div className="relative z-10 w-full min-h-full flex flex-col justify-between">
        <HeroModules />
        <ModulesGrid />
        <ModulesFooter />
      </div>
    </>
  );
}
