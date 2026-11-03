import FilterBar, { FilterSearch, FilterSelectField, type FilterSelectOption } from "@/shared/components/FilterBar";

interface QualityFiltersProps {
    search: string;
    onSearchChange: (value: string) => void;
    campaignFilter: string;
    onCampaignChange: (value: string) => void;
    campaignOptions: FilterSelectOption[];
    statusFilter: string;
    onStatusChange: (value: string) => void;
    statusOptions: FilterSelectOption[];
    hasActiveFilters: boolean;
    onClear: () => void;
    className?: string;
}

export default function QualityFilters({
    search,
    onSearchChange,
    campaignFilter,
    onCampaignChange,
    campaignOptions,
    statusFilter,
    onStatusChange,
    statusOptions,
    hasActiveFilters,
    onClear,
    className,
}: QualityFiltersProps) {
    return (
        <FilterBar onClear={onClear} canClear={hasActiveFilters} className={className ?? "mb-8"}>
            <FilterSearch
                value={search}
                onChange={onSearchChange}
                placeholder="Buscar por campaña o fruta..."
            />
            <FilterSelectField
                label="Campaña"
                allLabel="Todas"
                options={campaignOptions}
                value={campaignFilter}
                onChange={onCampaignChange}
            />
            <FilterSelectField
                label="Estado de campaña"
                allLabel="Todos"
                options={statusOptions}
                value={statusFilter}
                onChange={onStatusChange}
            />

        </FilterBar>
    );
}
