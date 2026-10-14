/**
 * Catálogo de frutas y variedades que maneja el módulo de proveedores. Lo comparten el formulario de proveedor
 * (qué frutas trabaja) y el de finca (qué cultivo y variedad tiene cada finca).
 *
 * TODO(api): hoy es una lista fija; el backend expone `/frutas` y sus derivadas, que la reemplazarán.
 */
export interface FrutaCatalogo {
    id: string;
    nombre: string;
    variedades: string[];
}

export const CATALOGO_FRUTAS: FrutaCatalogo[] = [
    { id: "mango", nombre: "Mango", variedades: ["Kent", "Edward", "Haden", "Tommy Atkins"] },
    { id: "uva", nombre: "Uva", variedades: ["Red Globe", "Crimson", "Autumn Royal", "Sweet Celebration"] },
    { id: "arandano", nombre: "Arándano", variedades: ["Biloxi", "Ventura", "Emerald", "Rocío"] },
    { id: "palta", nombre: "Palta", variedades: ["Hass", "Fuerte", "Zutano", "Ettinger"] },
];

/** Frutas que trabaja un proveedor, como las guarda su formulario: el id del catálogo y sus variedades */
export interface FrutaSeleccionada {
    frutaId: string;
    variedades: string[];
}

/**
 * El proveedor guarda cada fruta por su id del catálogo y `FruitVarietyPicker` trabaja con el nombre (igual que
 * la finca). Estas dos funciones traducen entre ambas formas; una fruta que no está en el catálogo se descarta.
 */
export const toCultivos = (frutas: FrutaSeleccionada[]): { fruta: string; variedades: string[] }[] =>
    frutas.flatMap(({ frutaId, variedades }) => {
        const fruta = CATALOGO_FRUTAS.find((item) => item.id === frutaId);
        return fruta ? [{ fruta: fruta.nombre, variedades }] : [];
    });

export const toFrutasProveedor = (cultivos: { fruta: string; variedades: string[] }[]): FrutaSeleccionada[] =>
    cultivos.flatMap(({ fruta, variedades }) => {
        const item = CATALOGO_FRUTAS.find((catalogo) => catalogo.nombre === fruta);
        return item ? [{ frutaId: item.id, variedades }] : [];
    });
