import { usesV1 } from '@/shared/api/data-contract';
import { campaignScreenV1 } from '@/modules/campaigns/api/v1-screen.api';
import { apiClient } from "@/shared/api/client";
import type { CampanaDto, FrutaDto, FrutaDerivadaDto, UpdateCampanaDto } from "@/modules/campaigns/api/campaign.dto";
import { toCampana, toCreateCampanaDto, type Campana, type CampaignFormInput } from "@/modules/campaigns/api/campaign.mapper";
import { formatFecha } from "@/modules/campaigns/api/fecha.util";
import { ensureViewDocuments } from '@/modules/operations/api/operations-context.api';
import type { StoredFile } from '@/shared/utils/fileSource';

export async function getCampaignDocument(id: number): Promise<StoredFile | null> {
  const files = await ensureViewDocuments();
  const file = files.find(item => item.tipo === 'campana' && item.entidadId === id);
  return file ? { url: file.url, name: file.name, type: file.type, size: file.size } : null;
}

export async function getFrutas(): Promise<FrutaDto[]> {
  if (usesV1()) return campaignScreenV1.fruits();
  const { data } = await apiClient.get<FrutaDto[]>("/v1/frutas");
  return data;
}

export async function getFrutaDerivadas(frutaId: number): Promise<FrutaDerivadaDto[]> {
  if (usesV1()) return campaignScreenV1.varieties(frutaId);
  const { data } = await apiClient.get<FrutaDerivadaDto[]>(`/v1/frutas/${frutaId}/derivadas`);
  return data;
}

export async function getCampanas(): Promise<Campana[]> {
  if (usesV1()) return campaignScreenV1.list();
  const { data } = await apiClient.get<CampanaDto[]>("/v1/campanas");
  return data.map(toCampana);
}

export async function getCampana(id: number): Promise<Campana> {
  if (usesV1()) return campaignScreenV1.get(id);
  const { data } = await apiClient.get<CampanaDto>(`/v1/campanas/${id}`);
  return toCampana(data);
}

export async function createCampana(input: CampaignFormInput): Promise<Campana> {
  if (usesV1()) return campaignScreenV1.create(input);
  const { data } = await apiClient.post<CampanaDto>("/v1/campanas", toCreateCampanaDto(input));
  return toCampana(data);
}

export async function updateCampana(id: number, input: Partial<CampaignFormInput>): Promise<Campana> {
  if (usesV1()) return campaignScreenV1.update(id, input);
  const dto: UpdateCampanaDto = {
    ...input,
    fechaInicio: input.fechaInicio ? formatFecha(input.fechaInicio) : undefined,
    fechaFin: input.fechaFin ? formatFecha(input.fechaFin) : undefined,
  };
  const { data } = await apiClient.patch<CampanaDto>(`/v1/campanas/${id}`, dto);
  return toCampana(data);
}

export async function deleteCampana(id: number): Promise<void> {
  if (usesV1()) return campaignScreenV1.remove(id);
  await apiClient.delete(`/v1/campanas/${id}`);
}
