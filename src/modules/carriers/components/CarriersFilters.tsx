import FilterBar, { FilterSearch, FilterSelectField } from "@/shared/components/FilterBar";

interface CarriersFiltersProps {
    search: string;
    onSearchChange: (value: string) => void;
    typeFilter?: string;
    onTypeFilterChange?: (value: string) => void;
    hasActiveFilters: boolean;
    onClear: () => void;
}

const TYPE_OPTIONS = [
    { value: "publico", label: "Transporte Público" },
    { value: "privado", label: "Transporte Privado" },
];

export default function CarriersFilters({
    search,
    onSearchChange,
    typeFilter = "all",
    onTypeFilterChange,
    hasActiveFilters,
    onClear,
}: CarriersFiltersProps) {
    return (
        <FilterBar onClear={onClear} canClear={hasActiveFilters} className="mb-8">
            <FilterSearch value={search} onChange={onSearchChange} placeholder="Buscar por nombre, RUC, MTC o documento..." />
            {onTypeFilterChange && (
                <FilterSelectField
                    label="Tipo de transporte"
                    allLabel="Todos los tipos"
                    value={typeFilter === "all" ? "" : typeFilter}
                    onChange={(val) => onTypeFilterChange(val || "all")}
                    options={TYPE_OPTIONS}
                />
            )}
        </FilterBar>
    );
}
