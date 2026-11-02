import { ChangeMark, ModalChangeNote } from './review-changes'
import { documentName, documentUrl, uploadStoredDocument } from './stored-documents'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

// ---------- Buttons ----------
type BtnVariant = 'primary' | 'ghost' | 'outline' | 'soft' | 'danger'
export function Button({
  children, variant = 'primary', className = '', ...rest
}: { children: ReactNode; variant?: BtnVariant } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf/50 disabled:opacity-50 disabled:pointer-events-none'
  const styles: Record<BtnVariant, string> = {
    primary: 'bg-forest text-white hover:bg-forest-600 shadow-sm',
    ghost: 'text-ink-soft hover:bg-leaf-50 hover:text-forest',
    outline: 'border border-line bg-surface text-ink hover:border-leaf hover:text-forest',
    soft: 'bg-leaf-50 text-forest hover:bg-leaf/15',
    danger: 'bg-danger text-white hover:brightness-110',
  }
  return (
    <button className={`${base} ${styles[variant]} ${className}`} {...rest}>
      {children}
    </button>
  )
}

// ---------- Badge / Status ----------
export function StatusPill({ estado }: { estado: string }) {
  const map: Record<string, string> = {
    Planificado: 'bg-plan-50 text-plan',
    'En Proceso': 'bg-proc-50 text-proc',
    Finalizado: 'bg-done-50 text-done',
    Aprobado: 'bg-done-50 text-done',
    'Por aprobar': 'bg-proc-50 text-proc',
    Validado: 'bg-done-50 text-done',
    'Sin validar': 'bg-proc-50 text-proc',
    Vigente: 'bg-done-50 text-done',
    'Por vencer': 'bg-proc-50 text-proc',
    Vencida: 'bg-red-50 text-danger',
    Pendiente: 'bg-proc-50 text-proc',
    'Pendiente de recepción': 'bg-plan-50 text-plan',
    'Pendiente de preparación': 'bg-proc-50 text-proc',
    'Pendiente de facturación': 'bg-mango-50 text-clay',
    'Pendiente de cobro': 'bg-proc-50 text-proc',
    'Cobro parcial': 'bg-plan-50 text-plan',
    Cobrada: 'bg-done-50 text-done',
    Enviado: 'bg-plan-50 text-plan',
    'Con resultado': 'bg-done-50 text-done',
    'Entrevista pendiente': 'bg-proc-50 text-proc',
    'Examen pendiente': 'bg-plan-50 text-plan',
    Rechazado: 'bg-red-50 text-danger',
    'En trámite': 'bg-plan-50 text-plan',
    Observado: 'bg-proc-50 text-proc',
    Certificado: 'bg-done-50 text-done',
    Parcial: 'bg-plan-50 text-plan',
    Pagado: 'bg-done-50 text-done',
    'Requerimiento registrado': 'bg-proc-50 text-proc',
    'En negociación': 'bg-plan-50 text-plan',
    'Acuerdo confirmado': 'bg-done-50 text-done',
    Borrador: 'bg-canvas text-ink-soft',
    Completa: 'bg-done-50 text-done',
    Adelanto: 'bg-plan-50 text-plan',
    Completado: 'bg-done-50 text-done',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${map[estado] ?? 'bg-leaf-50 text-forest'}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {estado}
    </span>
  )
}

export function Chip({ children, onRemove }: { children: ReactNode; onRemove?: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-mango-50 px-2.5 py-1 text-xs font-medium text-clay">
      {children}
      {onRemove && (
        <button onClick={onRemove} className="rounded-full text-clay/60 hover:text-clay" aria-label="Quitar">
          ×
        </button>
      )}
    </span>
  )
}

// ---------- Form fields ----------
export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{label}</span>
      {children}
      {hint && <span className="text-xs text-ink-soft">{hint}</span>}
    </label>
  )
}

const inputCls =
  'w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none transition focus:border-leaf focus:ring-2 focus:ring-leaf/20 placeholder:text-ink-soft/60'

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputCls} ${props.className ?? ''}`} />
}
export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputCls} resize-none ${props.className ?? ''}`} />
}
export function Select({ children, className, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className={`relative ${className ?? ''}`}>
      <select {...rest} className={`${inputCls} w-full cursor-pointer appearance-none pr-10`}>
        {children}
      </select>
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-forest"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </div>
  )
}

// ---------- Searchable Select ----------
export function SearchableSelect({
  options, value, onChange, placeholder = 'Buscar…',
}: { options: string[]; value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  const filtered = options.filter((o) => o.toLowerCase().includes(q.toLowerCase()))
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`${inputCls} flex items-center justify-between text-left`}
      >
        <span className={value ? 'text-ink' : 'text-ink-soft/60'}>{value || placeholder}</span>
        <span className="text-ink-soft">▾</span>
      </button>
      {open && (
        <div className="animate-expand absolute z-30 mt-1 w-full rounded-lg border border-line bg-surface p-1 shadow-lg">
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Escribe para filtrar…"
            className="mb-1 w-full rounded-md border border-line px-2.5 py-1.5 text-sm outline-none focus:border-leaf"
          />
          <div className="max-h-44 overflow-auto">
            {filtered.length === 0 && <div className="px-2.5 py-2 text-sm text-ink-soft">Sin resultados</div>}
            {filtered.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => { onChange(o); setOpen(false); setQ('') }}
                className={`block w-full rounded-md px-2.5 py-1.5 text-left text-sm hover:bg-leaf-50 ${o === value ? 'bg-leaf-50 font-medium text-forest' : 'text-ink'}`}
              >
                {o}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------- File drop ----------
export function FileDrop({ label = 'Adjuntar documento', onFile }: { label?: string; onFile?: (name: string | null) => void }) {
  const [name, setName] = useState<string | null>(null), [busy,setBusy]=useState(false), [error,setError]=useState('')
  const current=name||label, url=documentUrl(current)
  return <div><div className="mb-1"><ChangeMark priority="alta" code="H11">Archivo almacenado · PDF, PNG o JPG hasta 2 MB</ChangeMark></div><label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-line bg-canvas/50 px-3 py-3 text-sm text-ink-soft transition hover:border-leaf hover:bg-leaf-50/50">
    <span className="grid h-8 w-8 place-items-center rounded-md bg-leaf-50 text-forest">↑</span>
    <span className="flex-1 truncate">{busy?'Guardando documento…':documentName(current)}</span>
    <span className="text-xs font-medium text-forest">{busy?'Espera':name?'Cambiar':'Subir'}</span>
    <input type="file" accept="application/pdf,image/png,image/jpeg" disabled={busy||!onFile} className="hidden" onChange={async event=>{
      const input=event.currentTarget,file=input.files?.[0];if(!file||!onFile)return
      setBusy(true);setError('')
      try{const reference=await uploadStoredDocument(file);setName(reference);onFile(reference)}catch(e){setError(e instanceof Error?e.message:'No se pudo guardar el documento.')}finally{setBusy(false);input.value=''}
    }}/>
  </label>{url&&<a className="mt-2 inline-block text-xs font-semibold text-forest underline" href={url} target="_blank" rel="noopener noreferrer">Ver documento adjunto</a>}{!onFile&&<p className="mt-1 text-xs text-ink-soft">Este adjunto aún no tiene un registro asociado.</p>}{error&&<p role="alert" className="mt-2 text-sm text-danger">{error}</p>}</div>
}

// ---------- Modal ----------
export function Modal({
  open, onClose, title, children, footer, wide,
}: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    if (open) document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="animate-overlay fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-forest/40 p-4 backdrop-blur-sm sm:items-center" onMouseDown={onClose}>
      <div
        className={`animate-modal my-auto w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} rounded-2xl bg-surface shadow-2xl`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h3 className="font-display text-lg font-semibold text-ink">{title}</h3>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-ink-soft transition hover:bg-canvas" aria-label="Cerrar">
            ×
          </button>
        </div>
        <div className="max-h-[70vh] overflow-auto px-6 py-5"><ModalChangeNote title={title} />{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line px-6 py-4">{footer}</div>}
      </div>
    </div>
  )
}

// ---------- Confirm ----------
export function Confirm({
  open, onClose, onConfirm, question, confirmLabel = 'Sí, continuar',
}: { open: boolean; onClose: () => void; onConfirm: () => void; question: string; confirmLabel?: string }) {
  return (
    <Modal open={open} onClose={onClose} title="Confirmar acción"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>No</Button>
          <Button onClick={() => { onConfirm(); onClose() }}>{confirmLabel}</Button>
        </>
      }
    >
      <p className="text-sm text-ink-soft">{question}</p>
    </Modal>
  )
}

// ---------- KPI ----------
type KpiTone = 'leaf' | 'plan' | 'proc' | 'mango'
const kpiTones: Record<KpiTone, string> = {
  leaf: 'bg-leaf-50 text-forest',
  plan: 'bg-plan-50 text-plan',
  proc: 'bg-proc-50 text-proc',
  mango: 'bg-mango-50 text-clay',
}
export function Kpi({ label, value, tone = 'leaf', icon }: { label: string; value: ReactNode; tone?: KpiTone; icon?: ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3.5">
      <div className={`grid h-10 w-10 place-items-center rounded-lg text-lg ${kpiTones[tone]}`}>{icon}</div>
      <div>
        <div className="font-display text-2xl font-bold leading-none text-ink">{value}</div>
        <div className="mt-1 text-xs font-medium text-ink-soft">{label}</div>
      </div>
    </div>
  )
}

// ---------- Table shell ----------
export function Table({ head, children }: { head: ReactNode[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-surface">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-line bg-canvas/60 text-left">
            {head.map((h, index) => (
              <th key={index} className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-soft">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  )
}

export function IconBtn({ title, onClick, children }: { title: string; onClick?: () => void; children: ReactNode }) {
  return (
    <button
      title={title}
      aria-label={title}
      onClick={onClick}
      className="grid h-8 w-8 place-items-center rounded-lg border border-line text-ink-soft transition hover:border-leaf hover:bg-leaf-50 hover:text-forest"
    >
      {children}
    </button>
  )
}

// ---------- Toasts ----------
export function Toasts({ toasts }: { toasts: { id: number; msg: string }[] }) {
  return (
    <div className="fixed bottom-6 right-6 z-[60] flex flex-col gap-2">
      {toasts.map((t) => (
        <div key={t.id} className="animate-toast flex items-center gap-2.5 rounded-xl bg-forest px-4 py-3 text-sm font-medium text-white shadow-xl">
          <span className="grid h-5 w-5 place-items-center rounded-full bg-leaf text-white">✓</span>
          {t.msg}
        </div>
      ))}
    </div>
  )
}

// ---------- Page header ----------
export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-soft">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

// ---------- Filter bar ----------
export function FilterBar({ children, onClear }: { children: ReactNode; onClear: () => void }) {
  return (
    <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-line bg-surface p-4">
      {children}
      <button onClick={onClear} className="ml-auto self-end rounded-lg px-3 py-2 text-sm font-medium text-ink-soft transition hover:bg-canvas hover:text-forest">
        ↺ Limpiar filtros
      </button>
    </div>
  )
}

// ---------- Tabs ----------
export function Tabs({ tabs, active, onChange }: { tabs: string[]; active: string; onChange: (t: string) => void }) {
  return (
    <div className="mb-4 inline-flex rounded-xl border border-line bg-surface p-1">
      {tabs.map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${active === t ? 'bg-forest text-white shadow-sm' : 'text-ink-soft hover:text-forest'}`}
        >
          {t}
        </button>
      ))}
    </div>
  )
}

export function fmtDate(d: string) {
  if (!d) return '--/--/----'
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}
export function fmtNum(n: number) {
  return n.toLocaleString('es-PE')
}


export function ActionsMenu({ title, items, horizontal = false }: { title: string; items: { label: string; onClick: () => void }[]; horizontal?: boolean }) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const close = () => { setPosition(null); trigger.current?.focus() }
  useEffect(() => {
    if (!position) return
    panel.current?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true })
    const outside = (event: MouseEvent) => { if (!panel.current?.contains(event.target as Node) && !trigger.current?.contains(event.target as Node)) setPosition(null) }
    const reposition = () => setPosition(null)
    document.addEventListener('mousedown', outside)
    window.addEventListener('resize', reposition)
    window.addEventListener('scroll', reposition, true)
    return () => { document.removeEventListener('mousedown', outside); window.removeEventListener('resize', reposition); window.removeEventListener('scroll', reposition, true) }
  }, [position])
  return <><button ref={trigger} title={title} aria-label={title} aria-haspopup="menu" aria-expanded={!!position} className="grid h-8 w-8 place-items-center rounded-lg border border-line text-ink-soft hover:border-leaf hover:bg-leaf-50 hover:text-forest" onClick={() => {
    if (position) { setPosition(null); return }
    const rect = trigger.current!.getBoundingClientRect()
    const height = items.length * 40 + 8
    setPosition({ left: Math.max(8, Math.min(rect.right - 190, window.innerWidth - 198)), top: rect.bottom + height + 8 > window.innerHeight ? Math.max(8, rect.top - height - 4) : rect.bottom + 4 })
  }}><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx={horizontal ? 5 : 12} cy={horizontal ? 12 : 5} r="2" /><circle cx="12" cy="12" r="2" /><circle cx={horizontal ? 19 : 12} cy={horizontal ? 12 : 19} r="2" /></svg></button>{position && createPortal(<div ref={panel} role="menu" aria-label={title} style={{ top: position.top, left: position.left }} className="fixed z-[70] w-[190px] rounded-xl border border-line bg-surface p-1 shadow-xl" onKeyDown={(event) => {
    if (event.key === 'Escape') { event.preventDefault(); close() }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); const buttons = [...panel.current!.querySelectorAll<HTMLButtonElement>('button')]; const current = buttons.indexOf(document.activeElement as HTMLButtonElement); buttons[(current + (event.key === 'ArrowDown' ? 1 : buttons.length - 1)) % buttons.length]?.focus() }
    if (event.key === 'Tab') setPosition(null)
  }}>{items.map((item) => <button key={item.label} role="menuitem" className="block w-full rounded-lg px-3 py-2.5 text-left text-sm text-ink hover:bg-leaf-50 focus:bg-leaf-50 focus:outline-none" onClick={() => { close(); item.onClick() }}>{item.label}</button>)}</div>, document.body)}</>
}

