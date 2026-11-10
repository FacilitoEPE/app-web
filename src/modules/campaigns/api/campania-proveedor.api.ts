import { usesV1 } from '@/shared/api/data-contract';
import { campaignScreenV1 } from '@/modules/campaigns/api/v1-screen.api';
import { apiClient } from "@/shared/api/client";
import type {
  CampaniaProveedorDto,
  CreateCampaniaProveedorDto,
  UpdateCampaniaProveedorDto,
} from "@/modules/campaigns/api/campania-proveedor.dto";
import type { CampaniaProveedor } from "@/modules/campaigns/api/campania-proveedor.mapper";

export async function getCampaniaProveedoresByCampania(campaniaId: number): Promise<CampaniaProveedor[]> {
  if (usesV1()) return campaignScreenV1.providers(campaniaId);
  const { data } = await apiClient.get<CampaniaProveedorDto[]>(`/v1/campanias-proveedores/campania/${campaniaId}`);
  return data;
}
export async function getCampaignParticipation(campaniaId: number, cxpId: number): Promise<CampaniaProveedor> {
  if (usesV1()) return campaignScreenV1.provider(campaniaId, cxpId);
  const relation = (await getCampaniaProveedoresByCampania(campaniaId)).find(row => row.cxpId === cxpId);
  if (!relation) throw new Error('No se encontró el proveedor en esta campaña.');
  return relation;
}

export async function createCampaniaProveedor(input: CreateCampaniaProveedorDto): Promise<CampaniaProveedor> {
  if (usesV1()) return campaignScreenV1.createProvider(input);
  const { data } = await apiClient.post<CampaniaProveedorDto>("/v1/campanias-proveedores", input);
  return data;
}

export async function updateCampaniaProveedor(cxpId: number, input: UpdateCampaniaProveedorDto): Promise<CampaniaProveedor> {
  if (usesV1()) return campaignScreenV1.updateProvider(cxpId, input);
  const { data } = await apiClient.patch<CampaniaProveedorDto>(`/v1/campanias-proveedores/${cxpId}`, input);
  return data;
}

export async function deleteCampaniaProveedor(cxpId: number): Promise<void> {
  if (usesV1()) return campaignScreenV1.deleteProvider(cxpId);
  await apiClient.delete(`/v1/campanias-proveedores/${cxpId}`);
}
