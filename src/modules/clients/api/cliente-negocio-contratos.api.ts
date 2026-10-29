import { usesV1 } from '@/shared/api/data-contract';
import { clientScreenV1 } from '@/modules/clients/api/v1-screen.api';
import { apiClient } from "@/shared/api/client";
import type { ContratosClienteNegocioResponseDto } from "@/modules/clients/api/cliente-negocio-contratos.dto";

export async function getClienteNegocioContratos(clienteNegocioId: number): Promise<ContratosClienteNegocioResponseDto> {
  if (usesV1()) return clientScreenV1.contracts(clienteNegocioId);
  const { data } = await apiClient.get<ContratosClienteNegocioResponseDto>(`/clientes-negocio/${clienteNegocioId}/contratos`);
  return data;
}
