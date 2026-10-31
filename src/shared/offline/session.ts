export interface AuthUser {
  usuarioId: number
  usuario: string
  personaId: number
  nombres: string
  apellidos: string
  correo: string | null
  rol: { rolId: number; nombre: 'Administrador' | 'Chofer' }
}

export interface PersistedSession {
  accessToken: string
  user: AuthUser
}

const SESSION_KEY = 'epe.auth.session'

export function getSession(): PersistedSession | undefined {
  try {
    const serialized = sessionStorage.getItem(SESSION_KEY)
    if (!serialized) return undefined
    const session = JSON.parse(serialized) as PersistedSession
    if (!session.accessToken || !session.user?.rol?.nombre) return undefined
    return session
  } catch {
    return undefined
  }
}

export function getAuthToken(): string | undefined {
  return getSession()?.accessToken
}

export function saveSession(session: PersistedSession): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY)
}
