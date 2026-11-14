import { apiClient } from '@/shared/api/client';
import { recordRemoteMutation } from '@/shared/api/remote-mutations';
import { getAuthToken } from '@/shared/offline/session';
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
export interface ApiV1Error {
    statusCode: number;
    code: string;
    message: string;
    fieldErrors: Record<string, string>;
}
export type ListQuery = Record<string, string | number | boolean | undefined>;
function endpoint(resource: string) {
    return `/v1/${resource.replace(/^\/+/, '')}`;
}
let viewDetail: ((resource: string, id: number) => unknown) | undefined;
export function registerViewDetailReader(reader: typeof viewDetail) { viewDetail = reader; }
/** VITE_API_BASE_URL selects real backend or /mock-api/. No fallback after errors. */
export function createV1ReadResource<T>(resource: string) {
    return {
        async list(query: ListQuery = {}, signal?: AbortSignal): Promise<ApiPage<T>> {
            const { data } = await apiClient.get<ApiPage<T>>(endpoint(resource), { params: query, signal, timeout: 15000 });
            return data;
        },
        async get(id: number, fresh = false, signal?: AbortSignal): Promise<T> {
            const existing = !fresh ? viewDetail?.(resource, id) : undefined;
            if (existing !== undefined) return existing as T;
            const { data } = await apiClient.get<T>(`${endpoint(resource)}/${id}`, { signal, timeout: 15000 });
            return data;
        },
    };
}
export function createV1AppendResource<T, Input>(resource: string) {
    return {
        ...createV1ReadResource<T>(resource),
        async create(input: Input): Promise<T> {
            const token = getAuthToken();
            const { data } = await apiClient.post<T>(endpoint(resource), input);
            recordRemoteMutation(resource, data, undefined, token);
            return data;
        },
    };
}
export function createV1Resource<T, Input>(resource: string) {
    return {
        ...createV1AppendResource<T, Input>(resource),
        async update(id: number, input: Partial<Input>): Promise<T> {
            const token = getAuthToken();
            const { data } = await apiClient.patch<T>(`${endpoint(resource)}/${id}`, input);
            recordRemoteMutation(resource, data, undefined, token);
            return data;
        },
        async remove(id: number): Promise<void> {
            const token = getAuthToken();
            await apiClient.delete(`${endpoint(resource)}/${id}`);
            recordRemoteMutation(resource, undefined, id, token);
        },
    };
}
export async function postV1Action<T, Input>(resource: string, input: Input): Promise<T> {
    const token = getAuthToken();
    const { data } = await apiClient.post<T>(endpoint(resource), input);
    recordRemoteMutation(resource, data, undefined, token);
    return data;
}
