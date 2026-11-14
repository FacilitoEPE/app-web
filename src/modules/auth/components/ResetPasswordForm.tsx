import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/shared/components/ui/button'
import { Field, FieldLabel } from '@/shared/components/ui/field'
import { Input } from '@/shared/components/ui/input'
import { resetPassword } from '@/modules/auth/api/auth.api'
import { actionErrorMessage } from '@/shared/api/action-errors'

export default function ResetPasswordForm() {
  const location = useLocation()
  const navigate = useNavigate()
  const [token] = useState(() => new URLSearchParams(location.hash.slice(1)).get('token') ?? '')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const validLink = /^[a-f0-9]{64}$/.test(token)

  useEffect(() => {
    if (location.hash) void navigate(location.pathname, { replace: true })
  }, [location.hash, location.pathname, navigate])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting || !validLink) return
    const fields = new FormData(event.currentTarget)
    const password = String(fields.get('password') ?? '')
    if (password !== fields.get('confirmation')) {
      setError('Las contraseñas no coinciden.')
      return
    }
    if (new TextEncoder().encode(password).length > 72) {
      setError('La contraseña es demasiado larga. Usa menos caracteres.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      setMessage((await resetPassword(token, password)).message)
    } catch (cause) {
      setError(actionErrorMessage(cause))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold text-ink">Restablecer contraseña</h1>
      {message ? <p role="status">{message}</p> : !validLink ? (
        <p role="alert">El enlace no es válido. Solicita uno nuevo desde el inicio de sesión.</p>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="reset-password">Nueva contraseña</FieldLabel>
            <Input id="reset-password" name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={72} />
            <p className="text-xs text-muted-foreground">Usa al menos 12 caracteres.</p>
          </Field>
          <Field>
            <FieldLabel htmlFor="reset-confirmation">Confirma la contraseña</FieldLabel>
            <Input id="reset-confirmation" name="confirmation" type="password" autoComplete="new-password" required minLength={12} maxLength={72} />
          </Field>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={submitting}>{submitting ? 'Guardando…' : 'Guardar contraseña'}</Button>
        </form>
      )}
      <Link to="/login" className="text-sm font-bold text-brand hover:underline">Ir al inicio de sesión</Link>
    </div>
  )
}
