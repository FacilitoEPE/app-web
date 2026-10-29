import { usesV1 } from '@/shared/api/data-contract';
import { campaignScreenV1 } from '@/modules/campaigns/api/v1-screen.api';
import { apiClient } from "@/shared/api/client";
import type {
  ClienteNegocioCampanaDto,
  CreateClienteNegocioCampanaDto,
  UpdateClienteNegocioCampanaDto,
} from "@/modules/campaigns/api/cliente-negocio-campana.dto";
import { toClienteNegocioCampana, type ClienteNegocioCampana } from "@/modules/campaigns/api/cliente-negocio-campana.mapper";

export async function getClientesNegocioCampana(campaniaId: number): Promise<ClienteNegocioCampana[]> {
  if (usesV1()) return campaignScreenV1.clients(campaniaId);
  const { data } = await apiClient.get<ClienteNegocioCampanaDto[]>(`/campanas/${campaniaId}/clientes-negocio`);
  return data.map(toClienteNegocioCampana);
}

export async function createClienteNegocioCampana(
  campaniaId: number,
  input: CreateClienteNegocioCampanaDto,
): Promise<ClienteNegocioCampana> {
  if (usesV1()) return campaignScreenV1.createClient(campaniaId, input);
  const { data } = await apiClient.post<ClienteNegocioCampanaDto>(`/campanas/${campaniaId}/clientes-negocio`, input);
  return toClienteNegocioCampana(data);
}

export async function updateClienteNegocioCampana(
  campaniaId: number,
  clienteNegocioCampanaId: number,
  input: UpdateClienteNegocioCampanaDto,
): Promise<ClienteNegocioCampana> {
  if (usesV1()) return campaignScreenV1.updateClient(campaniaId, clienteNegocioCampanaId, input);
  const { data } = await apiClient.patch<ClienteNegocioCampanaDto>(
    `/campanas/${campaniaId}/clientes-negocio/${clienteNegocioCampanaId}`,
    input,
  );
  return toClienteNegocioCampana(data);
}

export async function deleteClienteNegocioCampana(campaniaId: number, clienteNegocioCampanaId: number): Promise<void> {
  if (usesV1()) return campaignScreenV1.deleteClient(campaniaId, clienteNegocioCampanaId);
  await apiClient.delete(`/campanas/${campaniaId}/clientes-negocio/${clienteNegocioCampanaId}`);
}
