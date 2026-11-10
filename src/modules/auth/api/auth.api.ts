import { apiClient } from '@/shared/api/client'
import type { AuthUser, PersistedSession } from '@/shared/offline/session'

export type AccessProfile = 'Administrador' | 'Chofer'

export async function login(usuario: string, password: string): Promise<PersistedSession> {
  const { data } = await apiClient.post<PersistedSession>('/v1/auth/login', { usuario, password })
  return data
}

export async function getAuthenticatedUser(): Promise<AuthUser> {
  const { data } = await apiClient.get<AuthUser>('/v1/auth/me')
  return data
}

export async function getUserById(usuarioId: number): Promise<AuthUser> {
  const { data } = await apiClient.get<AuthUser>(`/v1/auth/usuarios/${usuarioId}`)
  return data
}

export async function requestPasswordRecovery(correo: string): Promise<{ message: string }> {
  const { data } = await apiClient.post<{ message: string }>('/v1/auth/recuperar-password', { correo })
  return data
}
