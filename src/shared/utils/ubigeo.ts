import catalog from "@/shared/constants/ubigeo-peru.json";
import type { ComboboxOption } from "@/shared/components/ui/combobox";

// Catálogo extraído de src/assets/json/departamento.json de luis-keny/generador-documentaria-sunat (blob 7dd6be9962705657ac5c543c8f9a0d1fe2508406).
const departments: Record<string, Record<string, string[]>> = catalog;

const normalize = (name: string) => name.trim().normalize("NFD").replace(/\p{Diacritic}/gu, "").toUpperCase();
function findName(names: string[], value: string) {
    const normalized = normalize(value);
    return names.find(name => normalize(name) === normalized);
}

function toOptions(names: string[], current: string, match: string | undefined): ComboboxOption[] {
    // Conserva la escritura histórica al editar, incluso si el nombre no figura en el catálogo.
    const options = names.map(name => ({ label: name, value: name === match ? current : name }));
    if (current && !match) options.unshift({ label: current, value: current });
    return options;
}

export function getUbigeoOptions(departamento: string, provincia: string, distrito = "") {
    const departmentNames = Object.keys(departments);
    const department = findName(departmentNames, departamento);
    const provinces = department ? departments[department] : {};
    const provinceNames = Object.keys(provinces);
    const province = findName(provinceNames, provincia);
    const districts = province ? provinces[province] : [];

    return {
        departamento: toOptions(departmentNames, departamento, department),
        provincia: toOptions(provinceNames, provincia, province),
        distrito: toOptions(districts, distrito, findName(districts, distrito)),
    };
}
