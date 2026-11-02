import { usesV1 } from '@/shared/api/data-contract';
import { carrierScreenV1 } from '@/modules/carriers/api/v1-screen.api';
import type { CarrierExtras } from '@/modules/carriers/carrierProfile.utils';
import { apiClient } from "@/shared/api/client";
import type { Carrier, Driver, Vehicle } from "@/modules/carriers/carriers.data";

interface VehicleDto {
  idVehiculoExterno: number;
  idEmpresaTransporteExterno?: number;
  placa: string;
  volumen: number | string;
  ancho: number | string;
  altura: number | string;
  profundidad: number | string;
  pesoNeto: number | string;
  pesoBruto: number | string;
}

interface DriverDto {
  idChoferTransporteExterno: number;
  idEmpresaTransporteExterno?: number;
  nombre: string;
  telefono: string;
  correo: string;
  tipoDocumento?: string;
  numeroDocumento?: string;
  numeroLicencia?: string;
}

interface CarrierDto {
  idEmpresaTransporteExterno: number;
  nombreCompleto: string;
  ruc: string;
  correo: string;
  numero: string;
  vehiculos?: VehicleDto[];
  choferes?: DriverDto[];
}

export interface CarrierInput {
  nombre: string;
  numero: string;
  correo: string;
  ruc: string;
}

export interface VehicleInput {
  placa: string;
  ancho: number;
  altura: number;
  profundidad: number;
  /** Dato propio del vehículo: ya no se deriva de las tres medidas */
  volumen: number;
  pesoNeto: number;
  pesoBruto: number;
}

export interface DriverInput {
  nombre: string;
  telefono: string;
  correo: string;
  tipoDocumento?: string;
  numeroDocumento?: string;
  numeroLicencia?: string;
}

function toVehicle(dto: VehicleDto, carrierId: number): Vehicle {
  return {
    id: dto.idVehiculoExterno,
    carrierId: dto.idEmpresaTransporteExterno ?? carrierId,
    placa: dto.placa,
    volumen: Number(dto.volumen),
    ancho: Number(dto.ancho),
    altura: Number(dto.altura),
    profundidad: Number(dto.profundidad),
    pesoNeto: Number(dto.pesoNeto),
    pesoBruto: Number(dto.pesoBruto),
  };
}

function toDriver(dto: DriverDto, carrierId: number): Driver {
  return {
    id: dto.idChoferTransporteExterno,
    carrierId: dto.idEmpresaTransporteExterno ?? carrierId,
    nombre: dto.nombre,
    telefono: dto.telefono,
    correo: dto.correo,
    tipoDocumento: dto.tipoDocumento,
    numeroDocumento: dto.numeroDocumento,
    numeroLicencia: dto.numeroLicencia,
  };
}

function toCarrier(dto: CarrierDto): Carrier {
  const id = dto.idEmpresaTransporteExterno;
  return {
    id,
    nombre: dto.nombreCompleto,
    numero: dto.numero,
    correo: dto.correo,
    ruc: dto.ruc,
    vehiculos: (dto.vehiculos ?? []).map((vehicle) => toVehicle(vehicle, id)),
    choferes: (dto.choferes ?? []).map((driver) => toDriver(driver, id)),
  };
}

export async function getCarriers(): Promise<Carrier[]> {
  if (usesV1()) return carrierScreenV1.list();
  const { data } = await apiClient.get<CarrierDto[]>("/empresas-transporte-externo");
  return data.map(toCarrier);
}

export async function getCarrier(id: number): Promise<Carrier> {
  if (usesV1()) return carrierScreenV1.get(id);
  const { data } = await apiClient.get<CarrierDto>(`/empresas-transporte-externo/${id}`);
  return toCarrier(data);
}

export async function createCarrier(input: CarrierInput, extras?: CarrierExtras): Promise<Carrier> {
  if (usesV1()) return carrierScreenV1.create(input, extras);
  const { data } = await apiClient.post<CarrierDto>("/empresas-transporte-externo", {
    nombreCompleto: input.nombre,
    // El independiente (privado) puede no tener RUC: se omite en vez de mandarlo vacío
    ...(input.ruc ? { ruc: input.ruc } : {}),
    correo: input.correo,
    numero: input.numero,
  });
  return toCarrier(data);
}

export async function updateCarrier(id: number, input: Partial<CarrierInput>, extras?: CarrierExtras): Promise<Carrier> {
  if (usesV1()) return carrierScreenV1.update(id, input, extras);
  const payload = {
    ...(input.nombre !== undefined ? { nombreCompleto: input.nombre } : {}),
    ...(input.ruc !== undefined ? { ruc: input.ruc } : {}),
    ...(input.correo !== undefined ? { correo: input.correo } : {}),
    ...(input.numero !== undefined ? { numero: input.numero } : {}),
  };
  const { data } = await apiClient.patch<CarrierDto>(`/empresas-transporte-externo/${id}`, payload);
  return toCarrier(data);
}

export async function deleteCarrier(id: number): Promise<void> {
  if (usesV1()) return carrierScreenV1.remove(id);
  await apiClient.delete(`/empresas-transporte-externo/${id}`);
}

function toVehiclePayload(carrierId: number, input: VehicleInput) {
  return {
    idEmpresaTransporteExterno: carrierId,
    placa: input.placa.trim().toUpperCase(),
    volumen: input.volumen,
    ancho: input.ancho,
    altura: input.altura,
    profundidad: input.profundidad,
    pesoNeto: input.pesoNeto,
    pesoBruto: input.pesoBruto,
  };
}

export async function createVehicle(carrierId: number, input: VehicleInput): Promise<Vehicle> {
  if (usesV1()) return carrierScreenV1.vehicle(carrierId, input);
  const { data } = await apiClient.post<VehicleDto>("/vehiculos-externos", toVehiclePayload(carrierId, input));
  return toVehicle(data, carrierId);
}

export async function updateVehicle(id: number, carrierId: number, input: VehicleInput): Promise<Vehicle> {
  if (usesV1()) return carrierScreenV1.vehicle(carrierId, input, id);
  const { data } = await apiClient.patch<VehicleDto>(`/vehiculos-externos/${id}`, {
    placa: input.placa.trim().toUpperCase(),
    volumen: input.volumen,
    ancho: input.ancho,
    altura: input.altura,
    profundidad: input.profundidad,
    pesoNeto: input.pesoNeto,
    pesoBruto: input.pesoBruto,
  });
  return toVehicle(data, data.idEmpresaTransporteExterno ?? carrierId);
}

export async function deleteVehicle(id: number): Promise<void> {
  if (usesV1()) return carrierScreenV1.removeVehicle(id);
  await apiClient.delete(`/vehiculos-externos/${id}`);
}

export async function createDriver(carrierId: number, input: DriverInput): Promise<Driver> {
  if (usesV1()) return carrierScreenV1.driver(carrierId, input);
  const { data } = await apiClient.post<DriverDto>("/choferes-transporte-externo", {
    idEmpresaTransporteExterno: carrierId,
    ...input,
  });
  return toDriver(data, carrierId);
}

export async function updateDriver(id: number, input: Partial<DriverInput>): Promise<Driver> {
  if (usesV1()) return carrierScreenV1.updateDriver(id, input);
  const { data } = await apiClient.patch<DriverDto>(`/choferes-transporte-externo/${id}`, input);
  return toDriver(data, data.idEmpresaTransporteExterno ?? 0);
}

export async function deleteDriver(id: number): Promise<void> {
  if (usesV1()) return carrierScreenV1.removeDriver(id);
  await apiClient.delete(`/choferes-transporte-externo/${id}`);
}
