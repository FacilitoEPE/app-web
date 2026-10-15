import FilterBar, { FilterSearch } from "@/shared/components/FilterBar";

interface ProvidersFiltersProps {
    search: string;
    onSearchChange: (value: string) => void;
    hasActiveFilters: boolean;
    onClear: () => void;
}

export default function ProvidersFilters({ search, onSearchChange, hasActiveFilters, onClear }: ProvidersFiltersProps) {
    return (
        <FilterBar onClear={onClear} canClear={hasActiveFilters} className="mb-8">
            <FilterSearch value={search} onChange={onSearchChange} placeholder="Buscar por nombre, documento o zona..." />
        </FilterBar>
    );
}
