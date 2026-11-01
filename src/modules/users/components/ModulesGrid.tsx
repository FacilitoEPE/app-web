import { containerNavigate } from "@/shared/utils/containerNavigation";
import { useNavigate } from "react-router-dom";
import ModuleCard from "@/modules/users/components/ModuleCard";
import { navigationItems } from "@/shared/layout/navigationItems";
import { preloadModule } from '@/routePreload';

export default function ModulesGrid() {
  const navigate = useNavigate();

  return (
    <div className="modules-grid grid w-full px-4 sm:px-8 lg:px-12 xl:px-14"
      onPointerOver={event => {
        const path = (event.target as Element).closest<HTMLElement>('[data-module-path]')?.dataset.modulePath;
        if (path) preloadModule(path);
      }}
      onFocusCapture={event => {
        const path = event.target.closest<HTMLElement>('[data-module-path]')?.dataset.modulePath;
        if (path) preloadModule(path);
      }}
    >
      {navigationItems.map((module) => (
        <ModuleCard
          key={module.id}
          path={module.url}
          title={module.title}
          description={module.description}
          icon={<module.icon size={25} strokeWidth={1.85} />}
          image={module.image}
          onClick={(event) => {
            containerNavigate(event.currentTarget, () => { void navigate(module.url); });
          }}
        />
      ))}
    </div>
  );
}
