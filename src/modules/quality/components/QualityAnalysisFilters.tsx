import FilterBar, { FilterSearch, FilterSelectField, type FilterSelectOption } from "@/shared/components/FilterBar";

interface QualityAnalysisFiltersProps {
    search: string;
    onSearchChange: (value: string) => void;
    tipoFilter: string;
    onTipoChange: (value: string) => void;
    tipoOptions: FilterSelectOption[];
    estadoFilter: string;
    onEstadoChange: (value: string) => void;
    estadoOptions: FilterSelectOption[];
    hasActiveFilters: boolean;
    onClear: () => void;
    className?: string;
}

export default function QualityAnalysisFilters({
    search,
    onSearchChange,
    tipoFilter,
    onTipoChange,
    tipoOptions,
    estadoFilter,
    onEstadoChange,
    estadoOptions,
    hasActiveFilters,
    onClear,
    className,
}: QualityAnalysisFiltersProps) {
    return (
        <FilterBar onClear={onClear} canClear={hasActiveFilters} className={className ?? "mb-8"}>
            <FilterSearch
                value={search}
                onChange={onSearchChange}
                placeholder="Buscar por productor, finca o análisis..."
            />
            <FilterSelectField
                label="Tipo de análisis"
                allLabel="Todos"
                options={tipoOptions}
                value={tipoFilter}
                onChange={onTipoChange}
            />
            <FilterSelectField
                label="Resultado"
                allLabel="Todos"
                options={estadoOptions}
                value={estadoFilter}
                onChange={onEstadoChange}
            />
        </FilterBar>
    );
}
