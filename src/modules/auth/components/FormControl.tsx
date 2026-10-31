import FormField from '@/shared/components/FormField'
import { useState } from 'react'
import { Button } from '@/shared/components/ui/button'
import { Field, FieldLabel } from '@/shared/components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupText, InputGroupInput, InputGroupButton } from '@/shared/components/ui/input-group'
import { User, Lock, Eye, EyeOff, LogIn } from 'lucide-react'
import Hint from '@/shared/components/Hint'
import SegmentedControl from '@/shared/components/SegmentedControl'
import type { AccessProfile } from '@/modules/auth/api/auth.api'

interface FormControlProps {
  onSubmit: (profile: AccessProfile, username: string, password: string) => Promise<void>
}

const inputGroupClassName = 'h-11 border-border/70 bg-background transition-colors rounded-lg has-[[data-slot=input-group-control]:focus-visible]:border-brand has-[[data-slot=input-group-control]:focus-visible]:ring-1 has-[[data-slot=input-group-control]:focus-visible]:ring-brand/30'

export default function FormControl({ onSubmit }: FormControlProps) {
  const [role, setRole] = useState<AccessProfile>('Administrador')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  return (
    <form
      className="flex flex-col w-full space-y-4"
      onSubmit={(event) => {
        event.preventDefault()
        const formData = new FormData(event.currentTarget)
        const username = String(formData.get('username') ?? '').trim()
        const password = String(formData.get('password') ?? '')
        if (!username || !password || submitting) return
        setSubmitting(true)
        setError('')
        void onSubmit(role, username, password)
          .catch((reason: unknown) => {
            const errorPayload = reason as { message?: unknown } | null
            const nestedPayload = errorPayload?.message as { message?: unknown } | undefined
            const message = typeof errorPayload?.message === 'string'
              ? errorPayload.message
              : typeof nestedPayload?.message === 'string'
                ? nestedPayload.message
                : 'No se pudo iniciar sesión.'
            setError(message)
          })
          .finally(() => setSubmitting(false))
      }}
    >
      <Field className="space-y-1.5">
        <FieldLabel className="text-sm font-bold text-ink">Perfil de acceso</FieldLabel>
        <SegmentedControl
          options={[
            { label: 'Administrador', value: 'Administrador' },
            { label: 'Chofer', value: 'Chofer' },
          ]}
          value={role}
          onChange={(next) => setRole(next as AccessProfile)}
        />
      </Field>

      <Field className="space-y-1.5">
        <FieldLabel htmlFor="username" className="text-sm font-bold text-ink">Usuario</FieldLabel>
        <InputGroup className={inputGroupClassName}>
          <InputGroupAddon align="inline-start" className="pl-4 pr-2">
            <InputGroupText className="text-brand"><User size={20} strokeWidth={2.5} /></InputGroupText>
          </InputGroupAddon>
          <InputGroupInput id="username" name="username" autoComplete="username" placeholder="Ingresa tu usuario" required className="h-full text-foreground placeholder:text-muted-foreground/50 text-sm pl-2" />
        </InputGroup>
      </Field>

      <Field className="space-y-1.5">
        <FieldLabel htmlFor="password" className="text-sm font-bold text-ink">Contraseña</FieldLabel>
        <InputGroup className={inputGroupClassName}>
          <InputGroupAddon align="inline-start" className="pl-4 pr-2">
            <InputGroupText className="text-brand"><Lock size={20} strokeWidth={2.5} /></InputGroupText>
          </InputGroupAddon>
          <InputGroupInput id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Ingresa tu contraseña" required className="h-full text-foreground placeholder:text-muted-foreground/50 text-sm pl-2" />
          <InputGroupAddon align="inline-end" className="pr-4">
            <Hint label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
              <InputGroupButton type="button" size="icon-sm" aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={showPassword} onClick={() => setShowPassword((previous) => !previous)} className="text-ink-muted hover:text-brand transition-colors">
                {showPassword ? <EyeOff size={20} strokeWidth={2.5} /> : <Eye size={20} strokeWidth={2.5} />}
              </InputGroupButton>
            </Hint>
          </InputGroupAddon>
        </InputGroup>
      </Field>

      <div className="pt-2">
        <FormField error={error} />
        <Button type="submit" size="xl" className="w-full" disabled={submitting}>
          <LogIn size={20} strokeWidth={2.5} /> {submitting ? 'Verificando…' : role === 'Chofer' ? 'Ingresar al Portal del Chofer' : 'Ingresar'}
        </Button>
      </div>
    </form>
  )
}
