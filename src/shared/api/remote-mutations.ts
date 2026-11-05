import { getAuthToken } from '@/shared/offline/session';

export interface RemoteMutation {
    resource: string;
    data?: unknown;
    removedId?: number;
    token: string | undefined;
}
let revision = 0;
let listener: ((mutation: RemoteMutation) => void) | undefined;
export const remoteMutationRevision = () => revision;
export function registerRemoteMutation(listenerForView: (mutation: RemoteMutation) => void) { listener = listenerForView; }
export function recordRemoteMutation(resource: string, data?: unknown, removedId?: number, token = getAuthToken()) {
    revision++;
    listener?.({ resource: resource.replace(/^\/+/, ''), data, removedId, token });
}
