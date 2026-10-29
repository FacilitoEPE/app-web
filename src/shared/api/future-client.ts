import { apiClient } from '@/shared/api/client';
export type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];
export interface JsonObject {
    [key: string]: JsonValue;
}
export interface ApiPage<T> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
}
export interface FutureApiError {
    statusCode: number;
    code: string;
    message: string;
    fieldErrors: Record<string, string>;
}
export type ListQuery = Record<string, string | number | boolean | undefined>;
function endpoint(resource: string) {
    return `/v1/${resource.replace(/^\/+/, '')}`;
}
/** VITE_API_BASE_URL selects real backend or /mock-api/. No fallback after errors. */
export function createV1ReadResource<T>(resource: string) {
    return {
        async list(query: ListQuery = {}): Promise<ApiPage<T>> {
            const { data } = await apiClient.get<ApiPage<T>>(endpoint(resource), { params: query });
            return data;
        },
        async get(id: number): Promise<T> {
            const { data } = await apiClient.get<T>(`${endpoint(resource)}/${id}`);
            return data;
        },
    };
}
export function createV1AppendResource<T, Input>(resource: string) {
    return {
        ...createV1ReadResource<T>(resource),
        async create(input: Input): Promise<T> {
            const { data } = await apiClient.post<T>(endpoint(resource), input);
            return data;
        },
    };
}
export function createV1Resource<T, Input>(resource: string) {
    return {
        ...createV1AppendResource<T, Input>(resource),
        async update(id: number, input: Partial<Input>): Promise<T> {
            const { data } = await apiClient.patch<T>(`${endpoint(resource)}/${id}`, input);
            return data;
        },
        async remove(id: number): Promise<void> {
            await apiClient.delete(`${endpoint(resource)}/${id}`);
        },
    };
}
export async function postV1Action<T, Input>(resource: string, input: Input): Promise<T> {
    const { data } = await apiClient.post<T>(endpoint(resource), input);
    return data;
}
