import FilterBar, { FilterSearch, FilterSelectField } from "@/shared/components/FilterBar";

interface ProvidersFiltersProps {
    search: string;
    onSearchChange: (value: string) => void;
    zoneFilter?: string;
    onZoneFilterChange?: (value: string) => void;
    zoneOptions?: { value: string; label: string }[];
    hasActiveFilters: boolean;
    onClear: () => void;
}

export default function ProvidersFilters({
    search,
    onSearchChange,
    zoneFilter = "all",
    onZoneFilterChange,
    zoneOptions = [],
    hasActiveFilters,
    onClear,
}: ProvidersFiltersProps) {
    return (
        <FilterBar onClear={onClear} canClear={hasActiveFilters} className="mb-8">
            <FilterSearch value={search} onChange={onSearchChange} placeholder="Buscar por nombre, documento o zona..." />
            {onZoneFilterChange && zoneOptions.length > 0 && (
                <FilterSelectField
                    label="Zona productora"
                    allLabel="Todas las zonas"
                    value={zoneFilter === "all" ? "" : zoneFilter}
                    onChange={(val) => onZoneFilterChange(val || "all")}
                    options={zoneOptions}
                />
            )}
        </FilterBar>
    );
}
