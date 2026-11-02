import { ReviewChangesProvider, ReviewToolbar, ModuleChangeNotes, ChangeMark } from './review-changes'
import { FinancePendingDestination } from './finance-pending'
import { pendingModule, type PendingNavigation } from './finance-navigation'
import { SharedDataProvider } from './shared-provider'
import { DemoLogin, type DemoAccount } from './driver-mobile'
import { useEffect, useState } from 'react'
import { StoreProvider, useStore } from './store'
import { Button, Toasts } from './ui'
import {
  CampaignsModule, ProvidersModule, ClientsModule, TransportModule, QualityModule, LogisticsModule, PaymentsModule,
} from './modules'

import { BillingModule, SettlementModule } from './finance'

type NavKey = 'campanas' | 'proveedores' | 'comercial' | 'transporte' | 'calidad' | 'logistica' | 'pagos' | 'facturacion' | 'liquidacion'

const NAV: { key: NavKey; label: string; icon: string }[] = [
  { key: 'comercial', label: 'Gestión Comercial', icon: '📊' },
  { key: 'campanas', label: 'Gestión de Campaña', icon: '🌱' },
  { key: 'proveedores', label: 'Gestión de Proveedores', icon: '🧑‍🌾' },
  { key: 'transporte', label: 'Gestión de Transporte', icon: '🚚' },
  { key: 'calidad', label: 'Cosecha y Control de Calidad', icon: '🧪' },
  { key: 'logistica', label: 'Logística y Despacho', icon: '▣' },
  { key: 'facturacion', label: 'Facturación y cobros', icon: '🧾' },
  { key: 'liquidacion', label: 'Liquidación de Compra', icon: '⚖' },
]

function Logo({ dark }: { dark?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className={`grid h-9 w-9 place-items-center rounded-xl font-display text-lg font-bold ${dark ? 'bg-leaf text-white' : 'bg-forest text-white'}`}>🌿</div>
      <div className="leading-tight">
        <div className={`font-display text-base font-bold ${dark ? 'text-white' : 'text-ink'}`}>Agro</div>
        <div className={`text-xs font-medium ${dark ? 'text-leaf-50/70' : 'text-ink-soft'}`}>Exportaciones</div>
      </div>
    </div>
  )
}

// ---------------- Module launcher ----------------
const CARD_TONES: Record<NavKey, string> = {
  comercial: 'from-leaf to-leaf/80 text-white',
  campanas: 'from-[#5ec8b0] to-[#4bb9a0] text-forest',
  proveedores: 'from-[#5ec8b0] to-[#4bb9a0] text-forest',
  transporte: 'from-[#5ec8b0] to-[#4bb9a0] text-forest',
  calidad: 'from-[#5ec8b0] to-[#4bb9a0] text-forest',
  logistica: 'from-[#5ec8b0] to-[#4bb9a0] text-forest',
  facturacion: 'from-[#5ec8b0] to-[#4bb9a0] text-forest',
  liquidacion: 'from-[#5ec8b0] to-[#4bb9a0] text-forest',
  pagos: 'from-[#5ec8b0] to-[#4bb9a0] text-forest',
}

function Launcher({ onSelect, onLogout }: { onSelect: (k: NavKey) => void; onLogout: () => void }) {
  return (
    <div className="grid min-h-screen bg-canvas lg:grid-cols-[1fr_320px]">
      {/* Module grid */}
      <div className="border-line px-6 py-8 lg:border-r lg:px-10 lg:py-12">
        <div className="mb-5"><ReviewToolbar /><div className="mt-3"><ChangeMark priority="media" code="H15">Marca unificada: Agro Exportaciones</ChangeMark></div></div><h1 className="mb-1 font-display text-2xl font-bold text-ink">Módulos del sistema</h1>
        <p className="mb-8 text-sm text-ink-soft">Selecciona un módulo para comenzar, Administrador.</p>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {NAV.map((n, i) => (
            <button
              key={n.key}
              onClick={() => onSelect(n.key)}
              style={{ animationDelay: `${i * 60}ms` }}
              className={`animate-row group relative flex aspect-square flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br p-6 text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/40 ${CARD_TONES[n.key]}`}
            >
              <span className="text-4xl opacity-90">{n.icon}</span>
              <div>
                <div className="font-display text-xl font-bold leading-tight">{n.label}</div>
                <div className="mt-2 inline-flex items-center gap-1 text-sm font-medium opacity-0 transition group-hover:opacity-90">Ingresar →</div>
              </div>
              <span className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10" />
            </button>
          ))}
        </div>
      </div>

      {/* User rail */}
      <aside className="flex flex-col items-center gap-6 px-8 py-10">
        <Logo />
        <div className="mt-6 grid h-32 w-32 place-items-center rounded-full bg-plan-50 text-6xl">🧑‍🌾</div>
        <div className="text-center">
          <div className="font-display text-lg font-semibold text-ink">Administrador</div>
          <div className="text-sm text-ink-soft">Administrador</div>
        </div>
        <div className="flex-1" />
        <Button variant="primary" className="w-full max-w-[220px] bg-plan hover:brightness-110" onClick={onLogout}>Cerrar sesión</Button>
      </aside>
    </div>
  )
}

// ---------------- Shell ----------------
function Shell({ nav, setNav, onHome, onLogout }: { nav: NavKey; setNav: (k: NavKey) => void; onHome: () => void; onLogout: () => void }) {
  const [pending,setPending]=useState<PendingNavigation|null>(null)
  useEffect(()=>{const open=(event:Event)=>{const target=(event as CustomEvent<PendingNavigation>).detail;if(!target?.source||!['Cobro','Pago'].includes(target.kind))return;setPending(target);setNav(pendingModule(target));window.scrollTo(0,0)};window.addEventListener('app:finance-pending',open);return()=>window.removeEventListener('app:finance-pending',open)},[setNav])
  const [moduleMenu, setModuleMenu] = useState(false)
  const [userMenu, setUserMenu] = useState(false)
  const s = useStore()
  useEffect(() => {
    const navigate = (event: Event) => {
      const next = (event as CustomEvent<NavKey>).detail
      if (NAV.some((item) => item.key === next)){setPending(null);setNav(next)}
    }
    window.addEventListener('app:navigate', navigate)
    return () => window.removeEventListener('app:navigate', navigate)
  }, [setNav])

  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-[82px] w-full max-w-none items-center justify-between px-5 lg:px-8">
          <div className="flex min-w-0 items-center gap-4 sm:gap-5">
            <button onClick={onHome} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-2xl leading-none text-[#8a9aae] transition hover:bg-canvas hover:text-forest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/30" title="Volver a módulos" aria-label="Volver a módulos">←</button>
            <div className="flex min-w-0 items-center gap-3 border-l border-[#b7c3cf] pl-4 sm:gap-4 sm:pl-5">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-leaf-50 text-2xl" aria-hidden="true">🌿</div>
              <div className="min-w-0">
                <div className="truncate font-display text-lg font-bold leading-tight tracking-tight text-forest sm:text-xl">AGRO EXPORTACIONES</div>
                <div className="mt-1 hidden text-[10px] font-bold uppercase tracking-[.18em] text-leaf sm:block">Cultivando confianza</div>
              </div>
            </div>
          </div>
          <div className="relative flex items-center gap-2">
            <button
              onClick={() => { setModuleMenu(!moduleMenu); setUserMenu(false) }}
              aria-expanded={moduleMenu}
              aria-label="Abrir módulos"
              className={`grid h-10 w-10 place-items-center rounded-xl border transition ${moduleMenu ? 'border-forest bg-forest text-white' : 'border-line bg-surface text-[#8a9aae] hover:border-forest/40 hover:text-forest'}`}
            >
              <span className="grid grid-cols-2 gap-1" aria-hidden="true"><i className="h-1.5 w-1.5 rounded-[2px] border border-current" /><i className="h-1.5 w-1.5 rounded-[2px] border border-current" /><i className="h-1.5 w-1.5 rounded-[2px] border border-current" /><i className="h-1.5 w-1.5 rounded-[2px] border border-current" /></span>
            </button>
            <button className="relative hidden h-10 w-10 place-items-center rounded-xl text-2xl text-[#8a9aae] transition hover:bg-canvas sm:grid" aria-label="Notificaciones">♧<span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-danger ring-2 ring-surface" /></button>
            <div className="hidden h-9 w-px bg-line sm:block" />
            <button onClick={() => { setUserMenu(!userMenu); setModuleMenu(false) }} className="flex items-center gap-2 rounded-full transition hover:bg-canvas sm:rounded-xl sm:px-2 sm:py-1" aria-label="Abrir menú de usuario" aria-expanded={userMenu}>
              <span className="grid h-10 w-10 place-items-center rounded-full bg-leaf text-sm font-bold text-white">JP</span>
              <span className="hidden text-left leading-tight md:block"><span className="block text-sm font-bold text-ink">Administrador</span><span className="block text-xs text-ink-soft">Administrador</span></span>
              <span className="hidden px-1 text-lg text-[#8a9aae] md:block">⌄</span>
            </button>

            {moduleMenu && (
              <div className="animate-modal absolute right-0 top-[52px] w-[min(560px,calc(100vw-2.5rem))] rounded-[20px] border border-line bg-surface p-4 shadow-[0_18px_45px_rgba(20,33,26,.16)] sm:p-5">
                <div className="mb-3 flex items-center justify-between px-1"><span className="text-xs font-semibold uppercase tracking-[.12em] text-ink-soft">Módulos</span><button onClick={onHome} className="text-xs font-semibold text-forest hover:underline">Ver inicio</button></div>
                <nav className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  {NAV.map((n) => (
                    <button key={n.key} onClick={() => { setPending(null); setNav(n.key); setModuleMenu(false) }} className={`group flex min-h-28 flex-col items-center justify-center gap-2 rounded-2xl px-3 py-4 text-center transition ${nav === n.key ? 'bg-leaf-50 text-forest' : 'text-ink hover:bg-canvas'}`}>
                      <span className={`grid h-11 w-11 place-items-center rounded-full text-xl transition ${nav === n.key ? 'bg-surface shadow-sm' : 'bg-[#f4f5f5] group-hover:bg-leaf-50'}`}>{n.icon}</span>
                      <span className="max-w-28 text-sm font-medium leading-tight">{n.label.replace('Gestión de ', '').replace('Gestión ', '')}</span>
                    </button>
                  ))}
                </nav>
              </div>
            )}
            {userMenu && (
              <div className="animate-modal absolute right-0 top-[52px] w-56 rounded-2xl border border-line bg-surface p-2 shadow-[0_18px_45px_rgba(20,33,26,.16)]">
                <div className="border-b border-line px-3 py-2.5"><div className="text-sm font-semibold text-ink">Administrador</div><div className="text-xs text-ink-soft">Administrador</div></div>
                <button onClick={onLogout} className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-danger transition hover:bg-red-50"><span>⏻</span> Cerrar sesión</button>
              </div>
            )}
          </div>
        </div>
      </header>
      <ReviewToolbar />

      <main className="mx-auto w-full max-w-7xl px-5 py-6 lg:px-8 lg:py-8">
        <ModuleChangeNotes module={nav} />
        {pending?<FinancePendingDestination key={pending.source.key+'-'+pending.task} target={pending} onBack={()=>{setPending(null);setNav(pending.kind==='Cobro'?'facturacion':'liquidacion');window.scrollTo(0,0)}}/>:<>
        {nav === 'campanas' && <CampaignsModule />}
        {nav === 'proveedores' && <ProvidersModule />}
        {nav === 'comercial' && <ClientsModule />}
        {nav === 'transporte' && <TransportModule />}
        {nav === 'calidad' && <QualityModule />}
        {nav === 'logistica' && <LogisticsModule />}
        {nav === 'facturacion' && <BillingModule />}
        {nav === 'liquidacion' && <SettlementModule />}
        {nav === 'pagos' && <PaymentsModule />}
        </>}
      </main>

      <Toasts toasts={s.toasts} />
    </div>
  )
}

export default function App() {
  const [account, setAccount] = useState<DemoAccount | null>(null)
  const [screen, setScreen] = useState<'home' | 'app'>('home')
  const [nav, setNav] = useState<NavKey>('campanas')

  const logout = () => { setAccount(null); setScreen('home') }

  return (
    <ReviewChangesProvider><SharedDataProvider><StoreProvider>
      {!account ? (
        <DemoLogin onLogin={(user) => { setAccount(user); setScreen('home') }} />
      ) : account.role === 'driver' ? (
        <LogisticsModule driverAccount={account} onLogout={logout} />
      ) : screen === 'home' ? (
        <Launcher onSelect={(k) => { setNav(k); setScreen('app') }} onLogout={logout} />
      ) : (
        <Shell nav={nav} setNav={setNav} onHome={() => setScreen('home')} onLogout={logout} />
      )}
    </StoreProvider></SharedDataProvider></ReviewChangesProvider>
  )
}
