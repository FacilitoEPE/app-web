/** Fruta que cultiva el proveedor, con las variedades que trabaja. */
export interface FrutaProveedor {
    nombre: string;
    variedades: string[];
}

/**
 * Información productiva del proveedor que muestra su detalle: estado de sanidad agraria y frutas con
 * sus variedades. La edita el formulario de proveedor y vive en el almacén local (ver `providerLocalData.store.ts`).
 */
export interface ProduccionProveedor {
    /** "Sin registrar" | "Registrado" | "En proceso" (las opciones del formulario de proveedor) */
    estadoSanidad: string;
    frutas: FrutaProveedor[];
}
