import type { DispatchStage } from "@/shared/components/DispatchStepProgress";
import type { FileSource } from "@/shared/utils/fileSource";
export interface DriverProfile {
    id: string;
    nombre: string;
    documento: string;
    licencia: string;
    telefono: string;
    transportista: string;
    placaAsignada: string;
}
export interface DriverFarmStop {
    id: string;
    nombre: string;
    productor: string;
    codigoSenasa: string;
    distrito: string;
    provincia: string;
    latitud: number;
    longitud: number;
    variedad: string;
    kilosEstimados: number | null;
}
export interface DriverProviderLoadDetail {
    proveedorId: string;
    proveedorNombre: string;
    tipo: "Productor" | "Acopiador";
    fincaNombre: string;
    variedad: string;
    kilosCargados: number;
    jabasCargadas: number;
    jabasVacias: number;
    binesCargados: number;
    binesVacios: number;
    mallasCargadas: number;
    mallasVacias: number;
}
export interface DriverStageHistoryItem {
    etapa: DispatchStage;
    fechaHora: string;
    nota: string;
}
export interface DriverArrivalChecklist {
    kilosEnPlanta: string;
    huboDescarte: boolean;
    kilosDescarte: string;
    motivoDescarte: string;
    observacionesEntrega: string;
    registrado: boolean;
}
export interface DriverVehicleExitGuide {
    requiereGuia: boolean;
    numeroGuia: string;
    motivoSalida: string;
    bultosVaciosRetorno: string;
    kilosDescarteRetorno: string;
    archivo: FileSource | null;
    observaciones: string;
}
export interface DriverLoad {
    id: string;
    codigo: string;
    campaniaId: number;
    campaniaNombre: string;
    fruta: string;
    canal: "Exportación" | "Industria";
    driverId: string;
    transportista: string;
    placa: string;
    cliente: string;
    contratoRef: string;
    origen: string;
    destino: string;
    destinoLatitud: number | null;
    destinoLongitud: number | null;
    fechaProgramada: string;
    fechaCarga: string;
    anotador: string;
    kilosProgramados: number;
    viaticosMovilidad: number;
    viaticosInsumos: number;
    gastoCuadrilla: number;
    gastoAnotadores: number;
    observacionesCarga: string;
    etapa: DispatchStage;
    fincas: DriverFarmStop[];
    proveedores: DriverProviderLoadDetail[];
    historial: DriverStageHistoryItem[];
    checklistLlegada: DriverArrivalChecklist;
    guiaSalida: DriverVehicleExitGuide;
}
