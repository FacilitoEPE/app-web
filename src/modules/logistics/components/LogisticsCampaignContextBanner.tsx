import { PackageCheck, Truck } from "lucide-react";
import LogisticsDispatchImg from "@/assets/logistics_dispatch.webp";
import type { LogisticsLoad } from "@/modules/logistics/logistics.models";
import ContextBanner from "@/shared/components/ContextBanner";
import StatusBadge from "@/shared/components/StatusBadge";

export default function LogisticsCampaignContextBanner({ load, caption }: { load: LogisticsLoad; caption: string }) {
    return <ContextBanner ariaLabel={load.campaniaNombre}
        eyebrow={{ icon: <Truck size={15} />, label: "Campaña de exportación" }}
        title={load.campaniaNombre} titleAddon={<StatusBadge status={load.estadoCampania} />}
        meta={[{ icon: <PackageCheck size={15} />, content: `${load.codigo} · ${load.cliente}` }]}
        caption={caption} image={LogisticsDispatchImg} />;
}
