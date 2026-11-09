import FilterBar, { FilterSearch, FilterSelectField } from "@/shared/components/FilterBar";

interface CarriersFiltersProps {
    search: string;
    onSearchChange: (value: string) => void;
    typeFilter: string;
    onTypeFilterChange: (value: string) => void;
    hasActiveFilters: boolean;
    onClear: () => void;
}

const TYPE_OPTIONS = [
    { value: "publico", label: "Público" },
    { value: "privado", label: "Privado" },
];

export default function CarriersFilters({
    search,
    onSearchChange,
    typeFilter,
    onTypeFilterChange,
    hasActiveFilters,
    onClear,
}: CarriersFiltersProps) {
    return (
        <FilterBar onClear={onClear} canClear={hasActiveFilters} className="mb-8">
            <FilterSearch value={search} onChange={onSearchChange} placeholder="Buscar por nombre, RUC, MTC o documento..." />
            <FilterSelectField
                label="Tipo de transporte"
                value={typeFilter}
                onChange={onTypeFilterChange}
                options={TYPE_OPTIONS}
            />
        </FilterBar>
    );
}
