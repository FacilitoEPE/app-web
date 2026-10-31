import { apiClient } from '@/shared/api/client'
import type { AuthUser, PersistedSession } from '@/shared/offline/session'

export type AccessProfile = 'Administrador' | 'Chofer'

export async function login(usuario: string, password: string): Promise<PersistedSession> {
  const { data } = await apiClient.post<PersistedSession>('/api/v1/auth/login', { usuario, password })
  return data
}

export async function getAuthenticatedUser(): Promise<AuthUser> {
  const { data } = await apiClient.get<AuthUser>('/api/v1/auth/me')
  return data
}
