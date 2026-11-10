import { usesV1 } from '@/shared/api/data-contract';
import { providerScreenV1 } from '@/modules/providers/api/v1-screen.api';
import { apiClient } from "@/shared/api/client";
import type { ProveedorDto, ProveedorInput } from "@/modules/providers/api/proveedor.dto";
import type { Proveedor } from "@/modules/providers/api/proveedor.mapper";

export async function getProveedores(): Promise<Proveedor[]> {
  if (usesV1()) return providerScreenV1.list();
  const { data } = await apiClient.get<ProveedorDto[]>("/v1/proveedores");
  if (!Array.isArray(data)) {
    throw new Error("Invalid response format: expected an array");
  }
  return data;
}

export async function getProveedor(proveedorId: number): Promise<Proveedor> {
  if (usesV1()) return providerScreenV1.get(proveedorId);
  const { data } = await apiClient.get<ProveedorDto>(`/v1/proveedores/${proveedorId}`);
  return data;
}

export async function createProveedor(input: ProveedorInput): Promise<Proveedor> {
  if (usesV1()) return providerScreenV1.create(input);
  const { data } = await apiClient.post<ProveedorDto>("/v1/proveedores", input);
  return data;
}

export async function updateProveedor(proveedorId: number, input: ProveedorInput): Promise<Proveedor> {
  if (usesV1()) return providerScreenV1.update(proveedorId, input);
  const { data } = await apiClient.patch<ProveedorDto>(`/v1/proveedores/${proveedorId}`, input);
  return data;
}

export async function deleteProveedor(proveedorId: number): Promise<void> {
  if (usesV1()) return providerScreenV1.remove(proveedorId);
  await apiClient.delete(`/v1/proveedores/${proveedorId}`);
}
