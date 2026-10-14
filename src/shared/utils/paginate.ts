/** Filas por página de todas las tablas de la app */
export const TABLE_PAGE_SIZE = 8;

/**
 * Página visible de una lista. `page` puede quedar fuera de rango (p. ej. al filtrar o borrar la última fila de la
 * última página): se ajusta a la última página que existe. Es una función y no un hook a propósito, para poder
 * usarla después de los `return` tempranos de carga o error.
 */
export function paginate<T>(items: T[], page: number, pageSize = TABLE_PAGE_SIZE) {
    const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
    const currentPage = Math.min(Math.max(1, page), pageCount);
    const offset = (currentPage - 1) * pageSize;
    return { pageCount, currentPage, offset, visible: items.slice(offset, offset + pageSize) };
}
