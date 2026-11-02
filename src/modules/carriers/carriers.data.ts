export interface Carrier {
    id: number;
    nombre: string;
    numero: string;
    correo: string;
    ruc: string;
    vehiculos: Vehicle[];
    choferes: Driver[];
}

/** Medidas en metros, volumen en m³ y pesos según el contrato de la API. */
export interface Vehicle {
    id: number;
    carrierId: number;
    placa: string;
    volumen: number;
    ancho: number;
    altura: number;
    profundidad: number;
    pesoNeto: number;
    pesoBruto: number;
}

/** Los conductores no tienen una relación fija con un vehículo en el modelo; se asignan por trazabilidad y rango de fechas. */
export interface Driver {
    id: number;
    carrierId: number;
    nombre: string;
    telefono: string;
    correo: string;
    tipoDocumento?: string;
    numeroDocumento?: string;
    numeroLicencia?: string;
}

export const vehicleVolume = (vehicle: Vehicle) => vehicle.volumen;
