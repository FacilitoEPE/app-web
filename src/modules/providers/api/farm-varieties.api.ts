import { apiClient } from '@/shared/api/client';

export async function getFarmVarietyIds(providerId: number, farmId: number): Promise<number[]> {
    const { data } = await apiClient.get<number[]>(`/api/proveedores/${providerId}/fincas/${farmId}/variedades`);
    return data;
}

export async function replaceFarmVarietyIds(providerId: number, farmId: number, ids: number[]): Promise<void> {
    await apiClient.put(`/api/proveedores/${providerId}/fincas/${farmId}/variedades`, ids);
}
