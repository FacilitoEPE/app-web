import { usesV1 } from '@/shared/api/data-contract';
import { clientScreenV1 } from '@/modules/clients/api/v1-screen.api';
import { apiClient } from "@/shared/api/client";
import type { ClienteNegocioDto, ClienteNegocioInput } from "@/modules/clients/api/cliente-negocio.dto";
import { toClienteNegocio, type ClienteNegocio } from "@/modules/clients/api/cliente-negocio.mapper";

export async function getClientesNegocio(): Promise<ClienteNegocio[]> {
  if (usesV1()) return clientScreenV1.list();
  const { data } = await apiClient.get<ClienteNegocioDto[]>("/v1/clientes-negocio");
  return data.map(toClienteNegocio);
}
export async function getClienteNegocio(id: number): Promise<ClienteNegocio> {
  if (usesV1()) return clientScreenV1.get(id);
  const { data } = await apiClient.get<ClienteNegocioDto>(`/v1/clientes-negocio/${id}`);
  return toClienteNegocio(data);
}

export async function createClienteNegocio(input: ClienteNegocioInput): Promise<ClienteNegocio> {
  if (usesV1()) return clientScreenV1.create(input);
  const { data } = await apiClient.post<ClienteNegocioDto>("/v1/clientes-negocio", input);
  return toClienteNegocio(data);
}

export async function updateClienteNegocio(id: number, input: Partial<ClienteNegocioInput>): Promise<ClienteNegocio> {
  if (usesV1()) return clientScreenV1.update(id, input);
  const { data } = await apiClient.patch<ClienteNegocioDto>(`/v1/clientes-negocio/${id}`, input);
  return toClienteNegocio(data);
}

export async function deleteClienteNegocio(id: number): Promise<void> {
  if (usesV1()) return clientScreenV1.remove(id);
  await apiClient.delete(`/v1/clientes-negocio/${id}`);
}
