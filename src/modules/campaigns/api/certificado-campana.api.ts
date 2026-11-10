import { apiClient } from "@/shared/api/client";
import type {
  CertificadoCampanaDto,
  CreateCertificadoCampanaDto,
  UpdateCertificadoCampanaDto,
} from "@/modules/campaigns/api/certificado-campana.dto";
import { toCertificadoCampana, type CertificadoCampana } from "@/modules/campaigns/api/certificado-campana.mapper";

export async function createCertificadoCampana(
  campaniaId: number,
  input: CreateCertificadoCampanaDto,
): Promise<CertificadoCampana> {
  const { data } = await apiClient.post<CertificadoCampanaDto>(`/v1/campanas/${campaniaId}/certificados`, input);
  return toCertificadoCampana(data);
}

export async function getCertificadosCampana(campaniaId: number): Promise<CertificadoCampana[]> {
  const { data } = await apiClient.get<CertificadoCampanaDto[]>(`/v1/campanas/${campaniaId}/certificados`);
  return data.map(toCertificadoCampana);
}

export async function deleteCertificadoCampana(campaniaId: number, certificadoId: number): Promise<void> {
  await apiClient.delete(`/v1/campanas/${campaniaId}/certificados/${certificadoId}`);
}

export async function updateCertificadoCampana(
  campaniaId: number,
  certificadoId: number,
  input: UpdateCertificadoCampanaDto,
): Promise<CertificadoCampana> {
  const { data } = await apiClient.patch<CertificadoCampanaDto>(`/v1/campanas/${campaniaId}/certificados/${certificadoId}`, input);
  return toCertificadoCampana(data);
}
