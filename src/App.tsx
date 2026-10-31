import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import './App.css'
import AdminLoginPage from './modules/auth/pages/AdminLoginPage'
import UsersModulesPage from './modules/users/pages/UsersModulesPage'
import CampaignsPage from './modules/campaigns/pages/CampaignsPage'
import CampaignDetailsPage from './modules/campaigns/pages/CampaignDetailsPage'
import CampaignProvidersPage from './modules/campaigns/pages/CampaignProvidersPage'
import CampaignClientsPage from '@/modules/campaigns/pages/CampaignClientsPage'
import CampaignClientContractsPage from '@/modules/campaigns/pages/CampaignClientContractsPage'
import CampaignContractDeliveriesPage from '@/modules/campaigns/pages/CampaignContractDeliveriesPage'
import CampaignProviderDetailsPage from './modules/campaigns/pages/CampaignProviderDetailsPage'
import CampaignInterviewsPage from './modules/campaigns/pages/CampaignInterviewsPage'
import CampaignExamsPage from './modules/campaigns/pages/CampaignExamsPage'
import CampaignCertificationsPage from './modules/campaigns/pages/CampaignCertificationsPage'
import CampaignCarriersPage from './modules/campaigns/pages/CampaignCarriersPage'
import CampaignDeliveriesPage from './modules/campaigns/pages/CampaignDeliveriesPage'
import CampaignWeeklyDeliveryProgramPage from './modules/campaigns/pages/CampaignWeeklyDeliveryProgramPage'
import ProvidersPage from './modules/providers/pages/ProvidersPage'
import ProviderFincasPage from './modules/providers/pages/ProviderFincasPage'
import ProviderDetailsPage from './modules/providers/pages/ProviderDetailsPage'
import ProviderCertificadosPage from './modules/providers/pages/ProviderCertificadosPage'
import CommercialPlanningPage from './modules/commercial-planning/pages/CommercialPlanningPage'
import ClientDetailsPage from './modules/commercial-planning/pages/ClientDetailsPage'
import CarriersPage from './modules/carriers/pages/CarriersPage'
import CarrierDetailsPage from './modules/carriers/pages/CarrierDetailsPage'
import QualityPage from '@/modules/quality/pages/QualityPage'
import LogisticsPage from '@/modules/logistics/pages/LogisticsPage'
import BillingPage from '@/modules/billing/pages/BillingPage'
import PurchaseSettlementPage from '@/modules/purchase-settlement/pages/PurchaseSettlementPage'
import DriverPortalPage from '@/modules/driver-portal/pages/DriverPortalPage'
import DashboardLayout from '@/shared/layout/DashboardLayout'
import FrontendDataBoundary from '@/FrontendDataBoundary'
import OfflinePage from '@/shared/components/OfflinePage'
import WelcomeSplash from '@/shared/components/WelcomeSplash'
import { unlockSplashAudio } from '@/shared/components/welcomeSplashSound'
import { navigationItems } from '@/shared/layout/navigationItems'
import { useImagesReady } from '@/shared/hooks/useImagesReady'
import HeroModulesImg from '@/assets/hero_modules.webp'
import HeroPhraseImg from '@/assets/hero_phrase.webp'
import { clearSession, getSession, saveSession } from '@/shared/offline/session'
import type { PersistedSession, AuthUser } from '@/shared/offline/session'
import { getAuthenticatedUser, login, type AccessProfile } from '@/modules/auth/api/auth.api'

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
  const [sessionReady, setSessionReady] = useState(false)
  const [isOnline, setIsOnline] = useState(() => navigator.onLine)
  const [justReconnected, setJustReconnected] = useState(false)
  // La bienvenida solo se muestra tras un inicio de sesión real, no al recargar con la sesión guardada
  const [showWelcome, setShowWelcome] = useState(false)
  const modulesImagesReady = useImagesReady(MODULES_IMAGES, showWelcome)

  useEffect(() => {
    const saved = getSession()
    if (!saved) { setSessionReady(true); return }
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
    setShowWelcome(profile === 'Administrador')
    // Se llama desde el clic de "Confirmar": es el gesto que el navegador exige para dejar sonar la intro
    if (profile === 'Administrador') unlockSplashAudio()
  }
  const handleLogout = () => {
    setSession(null)
    clearSession()
  };

  if (!isOnline) return <OfflinePage />
  if (!sessionReady) return null

  return (
    <BrowserRouter>
      <Routes>
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
      </Routes>
      {justReconnected && <div className="online-transition" role="status">Conexión restaurada</div>}
      {showWelcome && <WelcomeSplash ready={modulesImagesReady} onFinished={() => setShowWelcome(false)} />}
    </BrowserRouter>
  )
}

export default App
