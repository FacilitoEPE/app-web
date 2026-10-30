import { CalendarDays, ReceiptText, Scale, ShieldCheck, Truck, User, Users, Warehouse, type LucideIcon } from "lucide-react";
import CampaignPlanningImg from "@/assets/campaign_planning.webp";
import SupplierManagementImg from "@/assets/supplier_management.webp";
import CustomerManagementImg from "@/assets/customer_management.webp";
import TransportManagementImg from "@/assets/transport_management.webp";
import QualityManagementImg from "@/assets/quality_management.webp";
import LogisticsDispatchImg from "@/assets/logistics_dispatch.webp";
import BillingCollectionsImg from "@/assets/billing_collections.webp";
import PurchaseSettlementImg from "@/assets/purchase_settlement.webp";
import type { ModuleIconName } from "@/shared/layout/ModuleLauncherIcon";

export interface NavigationItem {
  id: ModuleIconName;
  title: string;
  navTitle: string;
  description: string;
  url: string;
  icon: LucideIcon;
  image: string;
  status: "available" | "building";
}

/** Fuente única para la portada de módulos, el selector del header y sus rutas principales. */
export const navigationItems: NavigationItem[] = [
  { id: "providers", title: "Gestión de Proveedores", navTitle: "Proveedores", description: "Administra y evalúa a tus proveedores.", url: "/proveedores", icon: Users, image: SupplierManagementImg, status: "available" },
  { id: "campaigns", title: "Gestión de Campaña", navTitle: "Campañas", description: "Organiza y planifica tus campañas de exportación.", url: "/campaigns", icon: CalendarDays, image: CampaignPlanningImg, status: "available" },
  { id: "commercial-planning", title: "Gestión Comercial", navTitle: "Gestión Comercial", description: "Administra y da seguimiento a tus clientes.", url: "/planificacion-comercial", icon: User, image: CustomerManagementImg, status: "available" },
  { id: "transport", title: "Gestión de Transporte", navTitle: "Transporte", description: "Coordina la logística y flota de transporte de forma eficiente.", url: "/transportistas", icon: Truck, image: TransportManagementImg, status: "available" },
  { id: "quality", title: "Cosecha y Control de Calidad", navTitle: "Cosecha y Control de Calidad", description: "Supervisa la cosecha y controla la calidad de los productos para exportación.", url: "/calidad", icon: ShieldCheck, image: QualityManagementImg, status: "available" },
  { id: "logistics", title: "Logística y Despacho", navTitle: "Logística y Despacho", description: "Coordina almacenes, pedidos y despachos para cada operación de exportación.", url: "/logistica-despacho", icon: Warehouse, image: LogisticsDispatchImg, status: "building" },
  { id: "purchase-settlement", title: "Liquidación de Compra", navTitle: "Liquidación de Compra", description: "Calcula y registra las liquidaciones de compra realizadas a productores.", url: "/liquidacion-compra", icon: Scale, image: PurchaseSettlementImg, status: "building" },
  { id: "billing", title: "Facturación y Cobros", navTitle: "Facturación y Cobros", description: "Controla comprobantes, vencimientos y cobros de las operaciones comerciales.", url: "/facturacion-cobros", icon: ReceiptText, image: BillingCollectionsImg, status: "building" },
];
