import { useNavigate } from "react-router-dom";
import ModuleCard from "@/modules/users/components/ModuleCard";
import { navigationItems } from "@/shared/layout/navigationItems";

export default function ModulesGrid() {
  const navigate = useNavigate();

  return (
    <div className="grid w-full auto-rows-[225px] sm:auto-rows-[235px] xl:auto-rows-[240px] grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 lg:gap-5 xl:gap-6 px-4 sm:px-8 lg:px-12 xl:px-14 py-2 sm:py-3 my-auto">
      {navigationItems.map((module) => (
        <ModuleCard
          key={module.id}
          title={module.title}
          description={module.description}
          icon={<module.icon size={25} strokeWidth={1.85} />}
          image={module.image}
          onClick={() => navigate(module.url)}
        />
      ))}
    </div>
  );
}
