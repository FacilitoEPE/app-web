import { lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import './App.css'
import DashboardLayout from '@/shared/layout/DashboardLayout'
import FrontendDataBoundary from '@/FrontendDataBoundary'
import OfflinePage from '@/shared/components/OfflinePage'
import { PageLoading } from '@/shared/components/PageState'
import WelcomeSplash from '@/shared/components/WelcomeSplash'
import { unlockSplashAudio } from '@/shared/components/welcomeSplashSound'
import { isSplashSkipped } from '@/shared/components/welcomeSplashPreference'
import { navigationItems } from '@/shared/layout/navigationItems'
import { useImagesReady } from '@/shared/hooks/useImagesReady'
import HeroModulesImg from '@/assets/hero_modules.webp'
import HeroPhraseImg from '@/assets/hero_phrase.webp'
import { clearSession, getSession, saveSession } from '@/shared/offline/session'
import type { PersistedSession, AuthUser } from '@/shared/offline/session'
import { getAuthenticatedUser, login, type AccessProfile } from '@/modules/auth/api/auth.api'

const AdminLoginPage = lazy(() => import('@/modules/auth/pages/AdminLoginPage'))
const UsersModulesPage = lazy(() => import('@/modules/users/pages/UsersModulesPage'))
const CampaignsPage = lazy(() => import('@/modules/campaigns/pages/CampaignsPage'))
const CampaignDetailsPage = lazy(() => import('@/modules/campaigns/pages/CampaignDetailsPage'))
const CampaignProvidersPage = lazy(() => import('@/modules/campaigns/pages/CampaignProvidersPage'))
const CampaignClientsPage = lazy(() => import('@/modules/campaigns/pages/CampaignClientsPage'))
const CampaignClientContractsPage = lazy(() => import('@/modules/campaigns/pages/CampaignClientContractsPage'))
const CampaignContractDeliveriesPage = lazy(() => import('@/modules/campaigns/pages/CampaignContractDeliveriesPage'))
const CampaignProviderDetailsPage = lazy(() => import('@/modules/campaigns/pages/CampaignProviderDetailsPage'))
const CampaignInterviewsPage = lazy(() => import('@/modules/campaigns/pages/CampaignInterviewsPage'))
const CampaignExamsPage = lazy(() => import('@/modules/campaigns/pages/CampaignExamsPage'))
const CampaignCertificationsPage = lazy(() => import('@/modules/campaigns/pages/CampaignCertificationsPage'))
const CampaignCarriersPage = lazy(() => import('@/modules/campaigns/pages/CampaignCarriersPage'))
const CampaignDeliveriesPage = lazy(() => import('@/modules/campaigns/pages/CampaignDeliveriesPage'))
const CampaignWeeklyDeliveryProgramPage = lazy(() => import('@/modules/campaigns/pages/CampaignWeeklyDeliveryProgramPage'))
const ProvidersPage = lazy(() => import('@/modules/providers/pages/ProvidersPage'))
const ProviderFincasPage = lazy(() => import('@/modules/providers/pages/ProviderFincasPage'))
const ProviderDetailsPage = lazy(() => import('@/modules/providers/pages/ProviderDetailsPage'))
const ProviderCertificadosPage = lazy(() => import('@/modules/providers/pages/ProviderCertificadosPage'))
const CommercialPlanningPage = lazy(() => import('@/modules/commercial-planning/pages/CommercialPlanningPage'))
const ClientDetailsPage = lazy(() => import('@/modules/commercial-planning/pages/ClientDetailsPage'))
const CarriersPage = lazy(() => import('@/modules/carriers/pages/CarriersPage'))
const CarrierDetailsPage = lazy(() => import('@/modules/carriers/pages/CarrierDetailsPage'))
const QualityPage = lazy(() => import('@/modules/quality/pages/QualityPage'))
const LogisticsPage = lazy(() => import('@/modules/logistics/pages/LogisticsPage'))
const BillingPage = lazy(() => import('@/modules/billing/pages/BillingPage'))
const PurchaseSettlementPage = lazy(() => import('@/modules/purchase-settlement/pages/PurchaseSettlementPage'))
const DriverPortalPage = lazy(() => import('@/modules/driver-portal/pages/DriverPortalPage'))

// Imágenes de la portada de módulos: se precargan durante la bienvenida para que aparezca ya pintada
const MODULES_IMAGES = [
  HeroModulesImg,
  HeroPhraseImg,
  '/image/fondo_modules.webp',
  ...navigationItems.map((item) => item.image),
]

// Persistent layout wrapper for authenticated routes
const ProtectedLayout = ({ session, onLogout }: { session: PersistedSession | null, onLogout: () => void }) => {
  if (!session) {
    return <Navigate to="/login" replace />;
  }
  if (session.user.rol.nombre !== 'Administrador') return <Navigate to="/chofer" replace />
  return (
    <DashboardLayout onLogout={onLogout} user={session.user}>
      <FrontendDataBoundary><Outlet /></FrontendDataBoundary>
    </DashboardLayout>
  );
};

function RequireDriver({ session, onLogout }: { session: PersistedSession | null; onLogout: () => void }) {
  if (!session) return <Navigate to="/login" replace />
  if (session.user.rol.nombre !== 'Chofer') return <Navigate to="/modules" replace />
  return <DriverPortalPage onLogout={onLogout} />
}

function App() {
  const [session, setSession] = useState<PersistedSession | null>(null)
  const [sessionReady, setSessionReady] = useState(() => !getSession())
  const [isOnline, setIsOnline] = useState(() => navigator.onLine)
  const [justReconnected, setJustReconnected] = useState(false)
  // La bienvenida solo se muestra tras un inicio de sesión real, no al recargar con la sesión guardada
  const [showWelcome, setShowWelcome] = useState(false)
  const modulesImagesReady = useImagesReady(MODULES_IMAGES, showWelcome)

  useEffect(() => {
    const saved = getSession()
    if (!saved) return
    void getAuthenticatedUser()
      .then((user: AuthUser) => {
        const restored = { ...saved, user }
        saveSession(restored)
        setSession(restored)
      })
      .catch(() => clearSession())
      .finally(() => setSessionReady(true))
  }, [])

  useEffect(() => {
    const expireSession = () => setSession(null)
    window.addEventListener('epe:auth-expired', expireSession)
    return () => window.removeEventListener('epe:auth-expired', expireSession)
  }, [])

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setJustReconnected(true)
      window.setTimeout(() => setJustReconnected(false), 1400)
    }
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const handleLogin = async (profile: AccessProfile, username: string, password: string) => {
    const authenticated = await login(username, password)
    if (authenticated.user.rol.nombre !== profile) {
      throw new Error('El perfil seleccionado no corresponde a esta cuenta.')
    }
    saveSession(authenticated)
    setSession(authenticated)
    const showIntro = profile === 'Administrador' && !isSplashSkipped()
    setShowWelcome(showIntro)
    // Se llama desde el clic de "Confirmar": es el gesto que el navegador exige para dejar sonar la intro
    if (showIntro) unlockSplashAudio()
  }
  const handleLogout = () => {
    setSession(null)
    clearSession()
  };

  if (!isOnline) return <OfflinePage />
  if (!sessionReady) return null

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoading label="Cargando pantalla…" />}><Routes>
        <Route 
          path="/login" 
          element={!session ? <AdminLoginPage onLogin={handleLogin} /> : <Navigate to={session.user.rol.nombre === 'Chofer' ? '/chofer' : '/modules'} />}
        />
        <Route path="/chofer" element={<RequireDriver session={session} onLogout={handleLogout} />} />
        <Route element={<ProtectedLayout session={session} onLogout={handleLogout} />}>
          <Route path="/modules" element={<UsersModulesPage />} />
          <Route path="/campaigns" element={<CampaignsPage />} />
          <Route path="/campaigns/:id" element={<CampaignDetailsPage />} />
          <Route path="/campaigns/:id/providers" element={<CampaignProvidersPage />} />
          <Route path="/campaigns/:id/clients" element={<CampaignClientsPage />} />
          <Route path="/campaigns/:id/clients/:clientLinkId/contracts" element={<CampaignClientContractsPage />} />
          <Route path="/campaigns/:id/clients/:clientLinkId/contracts/:contractId/deliveries" element={<CampaignContractDeliveriesPage />} />
          <Route path="/campaigns/:id/providers/:cxpId" element={<CampaignProviderDetailsPage />} />
          <Route path="/campaigns/:id/providers/:cxpId/interviews" element={<CampaignInterviewsPage />} />
          <Route path="/campaigns/:id/providers/:cxpId/exams" element={<CampaignExamsPage />} />
          <Route path="/campaigns/:id/certifications" element={<CampaignCertificationsPage />} />
          <Route path="/campaigns/:id/carriers" element={<CampaignCarriersPage />} />
          <Route path="/campaigns/:id/deliveries" element={<CampaignDeliveriesPage />} />
          <Route path="/campaigns/:id/weekly-delivery-program" element={<CampaignWeeklyDeliveryProgramPage />} />
          <Route path="/proveedores" element={<ProvidersPage />} />
          <Route path="/proveedores/:id" element={<ProviderDetailsPage />} />
          <Route path="/proveedores/:id/fincas" element={<ProviderFincasPage />} />
          <Route path="/proveedores/:id/certificados" element={<ProviderCertificadosPage />} />
          <Route path="/planificacion-comercial" element={<CommercialPlanningPage />} />
          <Route path="/planificacion-comercial/:id" element={<ClientDetailsPage />} />
          <Route path="/transportistas" element={<CarriersPage />} />
          <Route path="/transportistas/:id" element={<CarrierDetailsPage />} />
          <Route path="/calidad" element={<QualityPage />} />
          <Route path="/logistica-despacho" element={<LogisticsPage />} />
          <Route path="/facturacion-cobros" element={<BillingPage />} />
          <Route path="/liquidacion-compra" element={<PurchaseSettlementPage />} />
        </Route>
        
        <Route path="/" element={<Navigate to={session?.user.rol.nombre === 'Chofer' ? '/chofer' : '/modules'} />} />
        <Route path="*" element={<Navigate to={session?.user.rol.nombre === 'Chofer' ? '/chofer' : '/modules'} />} />
      </Routes></Suspense>
      {justReconnected && <div className="online-transition" role="status">Conexión restaurada</div>}
      {showWelcome && <WelcomeSplash ready={modulesImagesReady} onFinished={() => setShowWelcome(false)} />}
    </BrowserRouter>
  )
}

export default App
