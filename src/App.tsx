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
import DashboardLayout from '@/shared/layout/DashboardLayout'
import OfflinePage from '@/shared/components/OfflinePage'
import WelcomeSplash from '@/shared/components/WelcomeSplash'
import { unlockSplashAudio } from '@/shared/components/welcomeSplashSound'
import { navigationItems } from '@/shared/layout/navigationItems'
import { useImagesReady } from '@/shared/hooks/useImagesReady'
import HeroModulesImg from '@/assets/hero_modules.webp'
import HeroPhraseImg from '@/assets/hero_phrase.webp'
import { clearSession, getSession, saveSession } from '@/shared/offline/session'

// Imágenes de la portada de módulos: se precargan durante la bienvenida para que aparezca ya pintada
const MODULES_IMAGES = [
  HeroModulesImg,
  HeroPhraseImg,
  '/image/fondo_modules.webp',
  ...navigationItems.map((item) => item.image),
]

// Persistent layout wrapper for authenticated routes
const ProtectedLayout = ({ isAuthenticated, onLogout }: { isAuthenticated: boolean, onLogout: () => void }) => {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return (
    <DashboardLayout onLogout={onLogout}>
      <Outlet />
    </DashboardLayout>
  );
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [isOnline, setIsOnline] = useState(() => navigator.onLine)
  const [justReconnected, setJustReconnected] = useState(false)
  // La bienvenida solo se muestra tras un inicio de sesión real, no al recargar con la sesión guardada
  const [showWelcome, setShowWelcome] = useState(false)
  const modulesImagesReady = useImagesReady(MODULES_IMAGES, showWelcome)

  useEffect(() => {
    void getSession().then((session) => setIsAuthenticated(Boolean(session?.authenticated))).catch(() => setIsAuthenticated(false))
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

  const handleLogin = () => {
    // Se llama desde el clic de "Confirmar": es el gesto que el navegador exige para dejar sonar la intro
    unlockSplashAudio()
    setShowWelcome(true)
    setIsAuthenticated(true)
    void saveSession({ authenticated: true, savedAt: Date.now() })
  }
  const handleLogout = () => {
    setIsAuthenticated(false)
    void clearSession()
  };

  if (!isOnline) return <OfflinePage />
  if (isAuthenticated === null) return null

  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/login" 
          element={!isAuthenticated ? <AdminLoginPage onLogin={handleLogin} /> : <Navigate to="/modules" />} 
        />
        
        <Route element={<ProtectedLayout isAuthenticated={isAuthenticated} onLogout={handleLogout} />}>
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
        
        <Route path="/" element={<Navigate to="/modules" />} />
        <Route path="*" element={<Navigate to="/modules" />} />
      </Routes>
      {justReconnected && <div className="online-transition" role="status">Conexión restaurada</div>}
      {showWelcome && <WelcomeSplash ready={modulesImagesReady} onFinished={() => setShowWelcome(false)} />}
    </BrowserRouter>
  )
}

export default App
