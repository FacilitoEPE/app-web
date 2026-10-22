import SegmentedTabs from "@/shared/components/SegmentedTabs";
import { QUALITY_TABS, type QualityScope } from "@/modules/quality/quality.utils";

interface QualityStatusTabsProps {
    value: QualityScope;
    onChange: (value: QualityScope) => void;
    counts?: Record<QualityScope, number>;
    className?: string;
}

export default function QualityStatusTabs({ value, onChange, counts, className }: QualityStatusTabsProps) {
    const tabsWithCounts = QUALITY_TABS.map((tab) => ({
        ...tab,
        count: counts ? counts[tab.id as QualityScope] : undefined,
    }));

    return (
        <SegmentedTabs
            tabs={tabsWithCounts}
            value={value}
            onChange={(val) => onChange(val as QualityScope)}
            className={className}
            showLabelsOnMobile
        />
    );
}
