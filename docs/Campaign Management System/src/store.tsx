import { invoiceCollectionIssue } from './sales-billing'
import { freightIssue } from './transport-freight'
import { driverReceiptPatch, driverChecklistIssue, type DriverChecklistData, type DriverChecklistStep, type DriverReceiptInput } from './driver-receipt-model'
import { validateLiquidation } from './finance-flow'
import { useSharedActor } from './shared-provider'
import { reconcileLogistics, sameSource, trackedServices } from './delivery-tracking'
import { dispatchHistory } from './dispatch-model'
import { exportReadiness } from './export-harvest'
import { useDemoState } from './persistence'
import type { DispatchEvent, DispatchStage } from './dispatch-model'
import { DISPATCH_STAGES, dispatchStage } from './dispatch-model'
import { guideValidation } from './remission-model'
import type { LoadTravelExpenses } from './load-expenses'
import { deliveryHasLoad } from './quality-load-utils'
import { createSyntheticData } from './synthetic-data'
import { type Invoice, type PurchaseSettlement, type FinancialMovement, demoInvoices, demoSettlements, demoMovements, invoiceTotal, settlementTotal, paidTotal, money } from './finance-model'
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

// ---------- Types ----------
export type CampaignStatus = 'Planificado' | 'En Proceso' | 'Finalizado'
export type ProviderKind = 'Productor' | 'Acopiador'
export type ProviderState = 'Aprobado' | 'Por aprobar'

export interface Campaign {
  cierre?: { at: string; motivo: string }
  id: string
  nombre: string
  temporada: string
  fecha: string
  fechaFin: string
  fruta: string
  frutas: string[]
  derivadas: string[]
  responsable: string
  lineamientos: string
  observaciones: string
  reqComercial: number
  kilosProductores: number
  kilosCosechados: number | null
  estado: CampaignStatus
}

export interface SettlementPerson { id:string; nombres:string; apellidos:string; tipoDocumento:string; dni:string; vinculo:string }

export interface Provider {
  settlementPeople?: SettlementPerson[]
  uitConversions?: { id: string; settlementId: string; rate: number; date: string; source: string }[]
  id: string
  nombres: string
  apellidos: string
  dni: string
  tipoDocumento: string
  identidadDocumento: string
  zona: string
  tipo: ProviderKind
  fruta: string
  frutas: string[]
  categoria: string
  variedades: string[]
  telefono: string
  email: string
  codigo: string
  senasa: string
  estadoExamenSanidad: string
  fechaRegistro: string
  estado: ProviderState
  certificados: { id: string; nombre: string; fechaRevisionSenasa: string; documento: string }[]
  fincas?: Finca[]
  datosAgronomicos?: DatoAgronomico[]
  cantidad?: number
  campaignId?: string
}

export interface Finca {
  id: string
  codigoLugarProduccion?: string
  codigoCatastral?: string
  cultivo?: string
  variedad?: string
  edadCultivo?: string
  nombre: string
  departamento: string
  provincia: string
  distrito: string
  latitud: string
  longitud: string
  hsTotalFinca: string
  haCultivo: string
}

export interface DatoAgronomico {
  id: string
  campaignId?: string
  codigo?: string
  registeredAt?: string
  fincaId?: string
  nombre: string
  densidadPlantacion: string
  distanciamiento: string
  frecuenciaRiego: string
  nombreAplicacion: string
  aplicacionesAnio: string
}

export interface Exam {
  fruta?: string
  id: string
  fincaId?: string
  providerId: string
  campaignId?: string
  analisis: string
  resultado?: 'Negativo' | 'Positivo'
  fecha: string
  origen: string
  detalles: string
  muestra?: string
  fechaEnvio?: string
  estado?: 'Pendiente' | 'Enviado' | 'Con resultado'
  archivo?: string
}

export type EvaluationState = 'Entrevista pendiente' | 'Examen pendiente' | 'Aprobado'
export interface CampaignProvider {
  id: string
  campaignId: string
  providerId: string
  rol: ProviderKind
  fruta: string
  variedad: string
  kilosEstimados: number
  disponibilidadInicio: string
  disponibilidadFin: string
  precio?: number
  moneda: string
  observaciones: string
  estadoBd: 'Validado' | 'Sin validar'
  departamento: string
  provincia: string
  distrito: string
  latitud: string
  longitud: string
  densidadPlantacion: string
  distanciamiento: string
  frecuenciaRiego: string
  hsTotalFinca: string
  haCultivo: string
  nombreAplicacion: string
  aplicacionesAnio: string
  evaluacion: EvaluationState
  clasificacion?: 'Orgánico' | 'T2' | 'T3' | 'No califica'
  kilosOrganicos?: number
  finca?: string
  superficie?: number
  fincaId?: string
  fincaIds?: string[]
  agronomicoId?: string
}

export interface Interview {
  id: string
  fincaIds?: string[]
  farmRecords?: { fincaId: string; registeredAt: string; updatedAt: string }[]
  campaignId: string
  providerId: string
  fecha: string
  responsable: string
  finca: string
  ubicacion: string
  superficie: number
  cultivo: string
  variedad: string
  produccion: string
  observaciones: string
  estado: 'Borrador' | 'Completa'
  informe?: string
  evidencia?: string
}

export function certificationEstimatedKilos(participations: CampaignProvider[], campaignId: string, producerIds: string[]) {
  return Array.from(new Set(producerIds)).reduce((sum,id)=>{
    const amount=participations.find(p=>p.campaignId===campaignId&&p.providerId===id&&p.rol==='Productor')?.kilosEstimados||0
    return sum+(Number.isFinite(amount)&&amount>0?amount:0)
  },0)
}

export interface Certification {
  kilosHistory?: { fecha: string; kilos: number; producerIds: string[] }[]
  id: string
  campaignId: string
  nombre: string
  tipo: string
  organismo: string
  cobertura: string
  producerIds: string[]
  emision: string
  vigenciaInicio: string
  vencimiento: string
  kilos: number
  costo: number
  moneda: string
  estadoPago: 'Pendiente' | 'Parcial' | 'Pagado'
  documento?: string
  recibo?: string
  soporte?: string
  observaciones: string
  pagos: { id: string; monto: number; fecha: string; referencia: string; evidencia?: string }[]
  ampliaciones: { id: string; kilos: number; fecha: string; referencia: string }[]
}

export interface CommercialContract {
  id: string
  fecha: string
  contrato: string
  kilos: number
  precio?: number
  moneda: string
  condicionesPago: string
  condicionesEntrega: string
  observaciones: string
  entregas: { id: string; fecha: string; kilos: number; varietyQuantities?: { variety: string; kilos: number }[]; destino: string; observaciones: string; transportLinkId?: string; providers?: { providerId: string; fincaIds: string[] }[]; providerId?: string; fincaId?: string; vehicleId?: string; driverId?: string; start?: string; end?: string; origin?: string; operationId?: string; conditions?: string; freight?: number; freightObservation?: string }[]
}

export interface ClientRequirement {
  contratos?: CommercialContract[]
  id: string
  campaignId: string
  clientId: string
  fruta: string
  variedad: string
  variedades?: string[]
  canal: 'Industria' | 'Exportación'
  destino: string
  kilos: number
  kilosAcordados: number
  fechaRegistro: string
  entrega: string
  entregaInicio?: string
  entregaFin?: string
  precio?: number
  moneda: string
  estado: 'Requerimiento registrado' | 'En negociación' | 'Acuerdo confirmado'
  condiciones: string
  calidad: string
  observaciones: string
  documento?: string
  contrato?: string
  ficha?: string
  certificacionRequerida?: string
  cantidadPropuesta?: number
  condicionesPago?: string
  condicionesEntrega?: string
  fechaAceptacion?: string
  responsableConfirmacion?: string
  entregas: { id: string; fecha: string; kilos: number; varietyQuantities?: { variety: string; kilos: number }[]; destino: string; observaciones: string; transportLinkId?: string; providers?: { providerId: string; fincaIds: string[] }[]; providerId?: string; fincaId?: string; vehicleId?: string; driverId?: string; start?: string; end?: string; origin?: string; operationId?: string; conditions?: string; freight?: number; freightObservation?: string }[]
}

export type QualityRoute = 'Exportación' | 'Industria'
export interface ExportMtdRecord {
  id: string
  campaignId: string
  providerId: string
  fincaId: string
  value: string
  evidence: string
  recordedAt: string
  history: { value: string; evidence: string; recordedAt: string }[]
}
export interface QualityOperation {
  loadRegistration?: CampaignTransportService['annotation']
  viaticos?: LoadTravelExpenses
  loadNumber?: number
  qualityDecision?: 'Pendiente' | 'Aprobada' | 'Rechazada'
  rejectedDeliveries?: { id: string; sourceDelivery: { requirementId: string; contractId: string; deliveryId: string }; registeredAt: string }[]
  sourceDelivery?: { requirementId: string; contractId: string; deliveryId: string }
  id: string
  reference: string
  campaignId: string
  route: QualityRoute
  providerId: string
  origin: string
  expectedDate: string
  status: string
  estimatedQuantity: number
  harvestedQuantity: number
  acceptedQuantity: number
  loadedQuantity: number
  plantQuantity: number
  clientRequirementId?: string
  variety?: string
  observations: string
  analyses: { id: string; providerId?: string; fincaId?: string; date: string; type: string; origin: string; result: string; unit: string; observations: string; document: string }[]
  mtd?: { value: string; date: string; evidence: string; decision: string; observations: string }
  organization?: { harvestDate: string; serviceId: string; crewLead: string; transportConfirmed: boolean; crewConfirmed: boolean; arrivalConfirmed: boolean; trainingCompleted: boolean; evidence: string; mobility: string; supplies: string }
  advances: { id: string; providerId?: string; fincaId?: string; date: string; kilos: number; crates: number; observations: string; evidence: string; responsible: string }[]
  closure?: { staffReceipt?: string; mobilityReceipt?: string; completed?: boolean; endDate: string; report: string; observations: string; staffPaymentRequest: string; mobilityPaymentRequest: string; purchaseRecord: string; guide: string }
  industry?: { requestedVolume: string; collectionCenter: string; receptionDate: string; inspectionDate: string; inspectionResult: 'Sin registrar' | 'Cumple' | 'No cumple'; inspectionObservations: string; inspectionEvidence: string; rejectionReason: string; vehicleInspection: string; nonConformities: string; corrections: string; loadReport: string; purchaseRecord: string; guide: string; departureDate: string; arrivalDate: string; receivedReport: string }
  transport?: { id: string; cxpId: string; contract: string; kgPurchased: string; kgPlant: string; status: 'planificado' | 'en recojo' | 'despachado' | 'llegada'; guide: string; freight: string; sctr: string; stevedoring: string; tickets: string; food: string; company: string; vehicle: string; driver: string }
}

export interface LogisticsDelivery {
  transportServiceId?: string
  sourceDelivery?: QualityOperation['sourceDelivery']
  id: string
  reference: string
  sourceOperationId: string
  campaignId: string
  clientId?: string
  destination: string
  logisticsStatus: 'Preparada' | 'En ruta' | 'En espera' | 'En recepción' | 'Recepción completada'
  estimatedArrival: string
  windowStart: string
  windowEnd: string
  actualArrival: string
  arrivalObservations: string
  coordinationEvidence: string
  waitingReason: string
  rescheduledAttention: string
  purchases: { recognizedQuantity?: number; id: string; providerId: string; reference: string; fruit: string; quantity: number; guide: string; document: string; reviewStatus: string; observation: string }[]
  accountingStatus: string
  unloading: { start: string; end: string; observations: string; evidence: string }
  evaluation: { originWeight: number; plantWeight: number; report: string; observations: string; result: string }
  driverChecklist?: DriverChecklistData
  discard: { quantity: string; unit: string; reason: string; evidence: string }
  crates: { initial: string; returned: string; returnDate: string; evidence: string; coordination: string; vehicleExit: string; carrierCopy: boolean }
  documents: { fruitGuide: string; purchaseDetail: string; receptionReport: string; discardEvidence: string; crateReturn: string; signedExitGuide: string }
  physicalClosed: boolean
  administrativeClosed: boolean
}

export interface Contract {
  id: string
  nombre: string
  kg: number
  documento: string
  ficha: string
  fecha: string
  campaignId?: string
}

export interface Client {
  id: string
  empresa: string
  representante: string
  telefono: string
  correo: string
  ruc: string
  ubicacion: string
  tipo: string
  fechaRegistro: string
  contratos: Contract[]
}

export interface Vehicle {
  id: string
  placa: string
  capacidad: string
  pbv: string
  pesoNeto: string
  volumen?: string
  ancho?: string
  altura?: string
  profundidad?: string
  pesoBruto?: string
  chofer?: string
}

export interface Chofer {
  tipoDocumento?: string
  numeroDocumento?: string
  licencia?: string
  id: string
  nombre: string
  telefono: string
  correo: string
}

export interface Transporter {
  id: string
  tipo?: 'Público' | 'Privado'
  mtc?: string
  cgn?: string
  documentoIdentidad?: string
  empresa: string
  ruc: string
  numero: string
  correo: string
  departamento?: string
  provincia?: string
  ciudad?: string
  vehiculos: Vehicle[]
  choferes: Chofer[]
}

export type PaymentState = 'Pendiente' | 'Adelanto' | 'Completado'
export interface Payment {
  id: string
  codigo: string
  transportista: string
  campaignId: string
  total: number
  pagado: number
  fechaAcordada: string
  fechaFinal: string
  boleta: boolean
  estado: PaymentState
}

// ---------- Fruit dictionary (validation source of truth) ----------
export const FRUIT_CATALOG: Record<string, string[]> = {
  Mango: ['Mango Kent', 'Mango Edward', 'Mango Haden', 'Mango Tommy Atkins', 'Mango Ataulfo'],
  Palta: ['Palta Hass', 'Palta Fuerte', 'Palta Zutano'],
  Arándano: ['Biloxi', 'Ventura', 'Emerald'],
  Uva: ['Red Globe', 'Crimson Seedless', 'Sugraone'],
  Banano: ['Cavendish', 'Orgánico', 'Baby Banano'],
}
export const FRUIT_NAMES = Object.keys(FRUIT_CATALOG)
export const EXAM_TYPES = [
  'CADMIO',
  'Residuos de Plaguicidas',
  'Microbiológico',
  'Metales Pesados',
  'Análisis Nutricional',
  'Trazabilidad de Campo',
]

// ---------- Seed ----------
const seedCampaigns: Campaign[] = [
  { id: 'c1', nombre: 'Mango 2026', temporada: '2025–2026', fecha: '2025-07-27', fechaFin: '2026-02-15', fruta: 'Mango', frutas: ['Mango'], derivadas: ['Mango Kent', 'Mango Edward'], responsable: 'Ana Torres', lineamientos: 'lineamientos-mango-2026.pdf', observaciones: 'Planificar certificación Global GAP para productores seleccionados.', reqComercial: 3000, kilosProductores: 2400, kilosCosechados: null, estado: 'Planificado' },
  { id: 'c2', nombre: 'Mango 2025', temporada: '2025', fecha: '2025-01-10', fechaFin: '2025-06-30', fruta: 'Mango', frutas: ['Mango'], derivadas: ['Mango Kent'], responsable: 'Juan Pérez', lineamientos: 'lineamientos-mango-2025.pdf', observaciones: '', reqComercial: 3100, kilosProductores: 3100, kilosCosechados: 2870, estado: 'En Proceso' },
  { id: 'c3', nombre: 'Palta Hass 2025', temporada: '2025', fecha: '2025-03-01', fechaFin: '2025-09-20', fruta: 'Palta', frutas: ['Palta'], derivadas: ['Palta Hass'], responsable: 'María Salazar', lineamientos: 'lineamientos-palta-2025.pdf', observaciones: '', reqComercial: 5200, kilosProductores: 4800, kilosCosechados: 5010, estado: 'En Proceso' },
  { id: 'c4', nombre: 'Arándano 2024', temporada: '2024', fecha: '2024-05-05', fechaFin: '2024-11-30', fruta: 'Arándano', frutas: ['Arándano'], derivadas: ['Biloxi', 'Ventura'], responsable: 'Carlos Ríos', lineamientos: 'lineamientos-arandano-2024.pdf', observaciones: '', reqComercial: 1800, kilosProductores: 1800, kilosCosechados: 1750, estado: 'Finalizado' },
]

const seedProviders: Provider[] = [
  { id: 'p1', nombres: 'Brayan', apellidos: 'Gay', dni: '98765412', tipoDocumento: 'DNI', identidadDocumento: 'dni-brayan-gay.pdf', zona: 'Piura', tipo: 'Acopiador', fruta: 'Mango', frutas: ['Mango', 'Banano'], categoria: 'Mango Edward', variedades: ['Mango Edward'], telefono: '987654123', email: 'brayan.gay@correo.pe', codigo: 'LP-PIU-0012', senasa: '2025-04-18', estadoExamenSanidad: 'Aprobado', fechaRegistro: '2025-02-01', estado: 'Aprobado', fincas: [{ id: 'f1', nombre: 'Fundo Tambogrande', departamento: 'Piura', provincia: 'Piura', distrito: 'Tambogrande', latitud: '-4.9275', longitud: '-80.3442', hsTotalFinca: '12', haCultivo: '8' }], datosAgronomicos: [{ id: 'a1', fincaId: 'f1', campaignId: 'c1', codigo: 'FYV-MAN-01', registeredAt: '2025-08-01T14:00:00Z', nombre: 'Plan Tambogrande', densidadPlantacion: '400', distanciamiento: '5 x 5', frecuenciaRiego: 'Cada 7 días', nombreAplicacion: 'Control integrado', aplicacionesAnio: '4' }], certificados: [{ id: 'cpr1', nombre: 'Certificado SENASA', fechaRevisionSenasa: '2025-04-18', documento: 'senasa-brayan-gay.pdf' }], cantidad: 1000, campaignId: 'c2' },
  { id: 'p2', nombres: 'Brayan', apellidos: 'Gay II', dni: '78451296', tipoDocumento: 'DNI', identidadDocumento: 'dni-brayan-gay-ii.pdf', zona: 'Lambayeque', tipo: 'Productor', fruta: 'Mango', frutas: ['Mango'], categoria: 'Mango Kent', variedades: ['Mango Kent'], telefono: '945112877', email: 'bgay2@correo.pe', codigo: 'LP-LAM-0013', senasa: '2025-05-02', estadoExamenSanidad: '', fechaRegistro: '2025-02-08', estado: 'Por aprobar', fincas: [{ id: 'f2', nombre: 'Finca El Sol', departamento: 'Lambayeque', provincia: 'Lambayeque', distrito: 'Motupe', latitud: '-6.1512', longitud: '-79.7144', hsTotalFinca: '6', haCultivo: '3.5' }], datosAgronomicos: [{ id: 'a2', fincaId: 'f2', campaignId: 'c1', codigo: 'FYV-MAN-02', registeredAt: '2025-08-02T14:00:00Z', nombre: 'Plan El Sol', densidadPlantacion: '420', distanciamiento: '5 x 4.5', frecuenciaRiego: 'Cada 6 días', nombreAplicacion: 'Manejo fitosanitario', aplicacionesAnio: '3' }], certificados: [{ id: 'cpr2', nombre: 'Revisión SENASA 2025', fechaRevisionSenasa: '2025-05-02', documento: 'revision-senasa-2025.pdf' }], cantidad: 800, campaignId: 'c2' },
  { id: 'p3', nombres: 'Roberto', apellidos: 'Palacios', dni: '75369841', tipoDocumento: 'DNI', identidadDocumento: 'dni-roberto-palacios.pdf', zona: 'Lima', tipo: 'Productor', fruta: 'Palta', frutas: ['Palta', 'Mango', 'Uva'], categoria: 'Palta Hass', variedades: ['Palta Hass'], telefono: '912345678', email: 'rpalacios@correo.pe', codigo: 'LP-LIM-0021', senasa: '2025-03-15', estadoExamenSanidad: 'Aprobado', fechaRegistro: '2025-03-01', estado: 'Aprobado', fincas: [{ id: 'f3', nombre: 'Parcela San José', departamento: 'Lima', provincia: 'Huaral', distrito: 'Chancay', latitud: '-11.5714', longitud: '-77.2672', hsTotalFinca: '9', haCultivo: '5' }], datosAgronomicos: [{ id: 'a3', fincaId: 'f3', campaignId: 'c1', codigo: 'FYV-MAN-03', registeredAt: '2025-08-03T14:00:00Z', nombre: 'Plan San José', densidadPlantacion: '450', distanciamiento: '5 x 4', frecuenciaRiego: 'Cada 5 días', nombreAplicacion: 'Programa campo limpio', aplicacionesAnio: '5' }], certificados: [{ id: 'cpr3', nombre: 'Certificado de lugar de producción', fechaRevisionSenasa: '2025-03-15', documento: 'certificado-lugar-produccion.pdf' }, { id: 'cpr4', nombre: 'Revisión SENASA complementaria', fechaRevisionSenasa: '2025-06-20', documento: 'senasa-complementaria.pdf' }], cantidad: 1500, campaignId: 'c3' },
  { id: 'p4', nombres: 'Felipe', apellidos: 'Cárdenas', dni: '74125896', tipoDocumento: 'DNI', identidadDocumento: 'dni-felipe-cardenas.pdf', zona: 'La Libertad', tipo: 'Acopiador', fruta: 'Palta', frutas: ['Palta'], categoria: 'Palta Fuerte', variedades: ['Palta Fuerte'], telefono: '933221100', email: 'fcardenas@correo.pe', codigo: 'LP-LIB-0022', senasa: '2025-03-20', estadoExamenSanidad: '', fechaRegistro: '2025-03-04', estado: 'Por aprobar', certificados: [], cantidad: 900, campaignId: 'c3' },
]

const seedExams: Exam[] = [
  { id: 'e1', providerId: 'p1', campaignId: 'c1', analisis: 'CADMIO', resultado: 'Negativo', fecha: '2025-05-28', origen: 'Parcela Norte', detalles: 'ACETAMIPRID 0.15 mg/kg, TRAZAS: CLORFENAPIR', muestra: 'M-2026-001', fechaEnvio: '2025-05-29', estado: 'Con resultado', archivo: 'laboratorio-cadmio.pdf' },
  { id: 'e2', providerId: 'p1', analisis: 'Microbiológico', resultado: 'Negativo', fecha: '2025-05-30', origen: 'Piura', detalles: 'E. Coli ausente, Salmonella ausente' },
  { id: 'e3', providerId: 'p3', analisis: 'Metales Pesados', resultado: 'Negativo', fecha: '2025-04-11', origen: 'Lima', detalles: 'Plomo < 0.05 mg/kg' },
]

const seedCampaignProviders: CampaignProvider[] = [
  { id: 'cp1', campaignId: 'c1', providerId: 'p1', rol: 'Acopiador', fruta: 'Mango', variedad: 'Mango Edward', kilosEstimados: 1000, disponibilidadInicio: '2025-12-01', disponibilidadFin: '2026-01-15', precio: 1.8, moneda: 'PEN', observaciones: 'Oferta sujeta a evaluación documental.', estadoBd: 'Sin validar', departamento: 'Piura', provincia: 'Piura', distrito: 'Tambogrande', latitud: '-4.9275', longitud: '-80.3442', densidadPlantacion: '400', distanciamiento: '5 x 5', frecuenciaRiego: 'Cada 7 días', hsTotalFinca: '12', haCultivo: '8', nombreAplicacion: 'Control integrado', aplicacionesAnio: '4', fincaId: 'f1', agronomicoId: 'a1', evaluacion: 'Examen pendiente' },
  { id: 'cp2', campaignId: 'c1', providerId: 'p2', rol: 'Productor', fruta: 'Mango', variedad: 'Mango Kent', kilosEstimados: 800, disponibilidadInicio: '2025-11-20', disponibilidadFin: '2026-01-10', moneda: 'PEN', observaciones: 'Visita de campo por completar.', estadoBd: 'Sin validar', departamento: 'Lambayeque', provincia: 'Lambayeque', distrito: 'Motupe', latitud: '-6.1512', longitud: '-79.7144', densidadPlantacion: '420', distanciamiento: '5 x 4.5', frecuenciaRiego: 'Cada 6 días', hsTotalFinca: '6', haCultivo: '3.5', nombreAplicacion: 'Manejo fitosanitario', aplicacionesAnio: '3', fincaId: 'f2', agronomicoId: 'a2', evaluacion: 'Entrevista pendiente', clasificacion: 'Orgánico', kilosOrganicos: 600, finca: 'Finca El Sol', superficie: 3.5 },
  { id: 'cp3', campaignId: 'c1', providerId: 'p3', rol: 'Productor', fruta: 'Mango', variedad: 'Mango Kent', kilosEstimados: 1500, disponibilidadInicio: '2025-12-10', disponibilidadFin: '2026-02-01', precio: 2.1, moneda: 'PEN', observaciones: 'Participación aprobada.', estadoBd: 'Validado', departamento: 'Lima', provincia: 'Huaral', distrito: 'Chancay', latitud: '-11.5714', longitud: '-77.2672', densidadPlantacion: '450', distanciamiento: '5 x 4', frecuenciaRiego: 'Cada 5 días', hsTotalFinca: '9', haCultivo: '5', nombreAplicacion: 'Programa campo limpio', aplicacionesAnio: '5', fincaId: 'f3', agronomicoId: 'a3', evaluacion: 'Aprobado', clasificacion: 'T2', kilosOrganicos: 0, finca: 'Parcela San José', superficie: 5 },
]

const seedInterviews: Interview[] = [
  { id: 'i1', fincaIds: ['f3'], farmRecords: [{ fincaId: 'f3', registeredAt: '2025-08-05T14:00:00Z', updatedAt: '2025-08-05T14:00:00Z' }], campaignId: 'c1', providerId: 'p3', fecha: '2025-08-05', responsable: 'Ana Torres', finca: 'Parcela San José', ubicacion: 'Lima', superficie: 5, cultivo: 'Mango', variedad: 'Mango Kent', produccion: 'Rendimiento previsto de 300 kg por hectárea.', observaciones: 'Buen manejo de riego.', estado: 'Completa', informe: 'entrevista-san-jose.pdf' },
]

const seedCertifications: Certification[] = [
  { id: 'ce1', campaignId: 'c1', nombre: 'Certificado fitosanitario campaña Mango', tipo: 'Global GAP', organismo: 'Control Union', cobertura: 'Brayan Gay II / Roberto Palacios', producerIds: ['p2', 'p3'], emision: '', vigenciaInicio: '', vencimiento: '2026-04-30', kilos: 600, costo: 2400, moneda: 'USD', estadoPago: 'Parcial', documento: 'certificado-mango.pdf', recibo: 'recibo-certificacion.pdf', soporte: 'cotizacion-control-union.pdf', observaciones: 'Auditoría programada.', pagos: [{ id: 'pc1', monto: 1200, fecha: '2025-08-10', referencia: 'OP-84721', evidencia: 'voucher-84721.pdf' }], ampliaciones: [{ id: 'amp1', kilos: 200, fecha: '2025-10-15', referencia: 'ampliacion-global-gap-01.pdf' }] },
]

const seedRequirements: ClientRequirement[] = [
  { id: 'r1', campaignId: 'c1', clientId: 'cl1', fruta: 'Mango', variedad: 'Mango Kent', canal: 'Exportación', destino: 'Rotterdam, Países Bajos', kilos: 1200, kilosAcordados: 1000, fechaRegistro: '2025-08-12', entrega: '12/01/2026 – 18/01/2026', entregaInicio: '2026-01-12', entregaFin: '2026-01-18', precio: 2.9, moneda: 'USD', estado: 'Acuerdo confirmado', condiciones: 'FOB Callao.', calidad: '', observaciones: '', contrato: 'contrato-sutrimex-2026.pdf', ficha: 'ficha-kent.pdf', certificacionRequerida: 'Global GAP', cantidadPropuesta: 1000, condicionesPago: '30% de adelanto y saldo contra documentos.', condicionesEntrega: 'FOB Callao', fechaAceptacion: '2025-09-05', responsableConfirmacion: 'Ana Torres', entregas: [{ id: 'en1', fecha: '2026-01-12', kilos: 500, destino: 'Rotterdam', observaciones: 'Primera ventana' }, { id: 'en2', fecha: '2026-01-19', kilos: 500, destino: 'Rotterdam', observaciones: 'Segunda ventana' }] },
  { id: 'r2', campaignId: 'c1', clientId: 'cl2', fruta: 'Mango', variedad: 'Mango Edward', canal: 'Industria', destino: 'Callao', kilos: 900, kilosAcordados: 0, fechaRegistro: '2025-08-18', entrega: '01/01/2026 – 31/01/2026', entregaInicio: '2026-01-01', entregaFin: '2026-01-31', moneda: 'PEN', estado: 'En negociación', condiciones: 'Entrega semanal.', calidad: '', observaciones: 'Precio pendiente.', ficha: 'ficha-tecnica-fixgrom.pdf', certificacionRequerida: '', cantidadPropuesta: 750, condicionesPago: '', condicionesEntrega: '', entregas: [] },
  { id: 'r3', campaignId: 'c3', clientId: 'cl1', fruta: 'Palta', variedad: 'Palta Hass', canal: 'Exportación', destino: '', kilos: 1800, kilosAcordados: 0, fechaRegistro: '2025-04-02', entrega: '', moneda: 'USD', estado: 'Requerimiento registrado', condiciones: '', calidad: '', observaciones: 'Participación registrada sin contrato.', entregas: [] },
]

const seedQualityOperations: QualityOperation[] = [
  { id: 'op1', reference: 'EXP-MAN-001', campaignId: 'c1', route: 'Exportación', providerId: 'p2', origin: 'Finca El Sol · Lote Norte', expectedDate: '2026-01-08', status: 'Pendiente de revisión', estimatedQuantity: 420, harvestedQuantity: 0, acceptedQuantity: 0, loadedQuantity: 0, plantQuantity: 0, clientRequirementId: 'r1', variety: 'Mango Kent', observations: 'Pendiente análisis de materia seca del cliente.', analyses: [], mtd: { value: '0.32', date: '2026-01-02', evidence: 'mtd-lote-norte.pdf', decision: 'Continuar revisión', observations: 'El MTD no reemplaza los demás controles.' }, advances: [] },
  { id: 'op2', reference: 'EXP-MAN-002', campaignId: 'c1', route: 'Exportación', providerId: 'p2', origin: 'Finca El Sol · Lote Sur', expectedDate: '2026-01-18', status: 'Preparada', estimatedQuantity: 380, harvestedQuantity: 0, acceptedQuantity: 0, loadedQuantity: 0, plantQuantity: 0, variety: 'Mango Kent', observations: 'Operación restringida por revisión MTD del flujo.', analyses: [{ id: 'an1', date: '2026-01-10', type: 'Residuos de Plaguicidas', origin: 'Lote Sur', result: 'Conforme', unit: '', observations: 'Resultado documental recibido.', document: 'analisis-residuos-lote-sur.pdf' }], mtd: { value: '0.72', date: '2026-01-11', evidence: 'mtd-lote-sur.pdf', decision: 'No cosechar según regla del flujo', observations: 'Regla pendiente de validación para implementación.' }, advances: [] },
  { id: 'op3', reference: 'EXP-MAN-003', campaignId: 'c1', route: 'Exportación', providerId: 'p3', origin: 'Parcela San José', expectedDate: '2026-01-05', status: 'Cosecha terminada', estimatedQuantity: 600, harvestedQuantity: 548, acceptedQuantity: 0, loadedQuantity: 0, plantQuantity: 0, variety: 'Mango Kent', observations: 'Cierre físico realizado; documentación de movilidad pendiente.', analyses: [{ id: 'an2', date: '2025-12-28', type: 'Materia seca', origin: 'Parcela San José', result: '22.4', unit: '%', observations: 'Resultado remitido por cliente.', document: 'materia-seca-san-jose.pdf' }], mtd: { value: '0.18', date: '2025-12-27', evidence: 'mtd-san-jose.pdf', decision: 'Continuar revisión', observations: '' }, organization: { harvestDate: '2026-01-05', serviceId: 'srv1', crewLead: 'Mario Rojas', transportConfirmed: true, crewConfirmed: true, arrivalConfirmed: true, trainingCompleted: true, evidence: 'capacitacion-cuadrilla.pdf', mobility: 'Movilidad local contratada', supplies: 'Jabas, tijeras y EPP' }, advances: [{ id: 'av1', date: '2026-01-05', kilos: 310, crates: 62, observations: 'Primer turno.', evidence: 'avance-manana.jpg', responsible: 'Mario Rojas' }, { id: 'av2', date: '2026-01-05', kilos: 238, crates: 48, observations: 'Segundo turno.', evidence: 'avance-tarde.jpg', responsible: 'Mario Rojas' }], transport: { id: 'srv1', cxpId: 'cp3', contract: 'contrato-transporte-srv1.pdf', kgPurchased: '', kgPlant: '', status: 'planificado', guide: '', freight: '4200', sctr: 'Cobertura declarada', stevedoring: '350', tickets: '0', food: '180', company: 'SUTRIMEX', vehicle: 'v2', driver: 'ch1' }, closure: { endDate: '2026-01-05', report: 'informe-cosecha-san-jose.pdf', observations: 'Cierre físico completado.', staffPaymentRequest: 'solicitud-personal.pdf', mobilityPaymentRequest: '', purchaseRecord: 'compra-fruta-001.pdf', guide: 'guia-remision-001.pdf' } },
  { id: 'op4', reference: 'IND-PAL-001', campaignId: 'c3', route: 'Industria', providerId: 'p4', origin: 'Fundo Cárdenas', expectedDate: '2025-06-10', status: 'En control', estimatedQuantity: 700, harvestedQuantity: 0, acceptedQuantity: 0, loadedQuantity: 0, plantQuantity: 0, variety: 'Palta Fuerte', observations: 'Recepción conservada como rechazada.', analyses: [], advances: [], industry: { requestedVolume: '700', collectionCenter: 'Acopio Norte', receptionDate: '2025-06-10', inspectionDate: '2025-06-10', inspectionResult: 'No cumple', inspectionObservations: 'Daño externo visible.', inspectionEvidence: 'inspeccion-rechazo.pdf', rejectionReason: 'Condición no conforme para recepción.', vehicleInspection: '', nonConformities: '', corrections: '', loadReport: '', purchaseRecord: '', guide: '', departureDate: '', arrivalDate: '', receivedReport: '' } },
  { id: 'op5', reference: 'IND-PAL-002', campaignId: 'c3', route: 'Industria', providerId: 'p3', origin: 'Parcela San José', expectedDate: '2025-06-15', status: 'Lista para carga', estimatedQuantity: 900, harvestedQuantity: 0, acceptedQuantity: 842, loadedQuantity: 0, plantQuantity: 0, variety: 'Palta Hass', observations: 'Fruta aceptada y pesada.', analyses: [], advances: [], industry: { requestedVolume: '900', collectionCenter: 'Acopio Norte', receptionDate: '2025-06-15', inspectionDate: '2025-06-15', inspectionResult: 'Cumple', inspectionObservations: 'Recepción conforme.', inspectionEvidence: 'control-calidad-002.pdf', rejectionReason: '', vehicleInspection: 'Pendiente', nonConformities: '', corrections: '', loadReport: '', purchaseRecord: '', guide: '', departureDate: '', arrivalDate: '', receivedReport: '' } },
  { id: 'op6', reference: 'IND-MAN-003', campaignId: 'c2', route: 'Industria', providerId: 'p1', origin: 'Centro de acopio Piura', expectedDate: '2025-05-22', status: 'Despachada', estimatedQuantity: 1000, harvestedQuantity: 0, acceptedQuantity: 960, loadedQuantity: 940, plantQuantity: 915, variety: 'Mango Edward', observations: 'Servicio con llegada registrada.', analyses: [], advances: [], industry: { requestedVolume: '1000', collectionCenter: 'Acopio Piura', receptionDate: '2025-05-22', inspectionDate: '2025-05-22', inspectionResult: 'Cumple', inspectionObservations: 'Conforme.', inspectionEvidence: 'calidad-piura.pdf', rejectionReason: '', vehicleInspection: 'Conforme', nonConformities: '', corrections: '', loadReport: 'informe-carga-003.pdf', purchaseRecord: 'compra-003.pdf', guide: 'guia-003.pdf', departureDate: '2025-05-22', arrivalDate: '2025-05-23', receivedReport: 'reporte-planta-003.pdf' }, transport: { id: 'trz3', cxpId: 'cp1', contract: 'contrato-transporte-003.pdf', kgPurchased: '960', kgPlant: '915', status: 'llegada', guide: 'guia-003.pdf', freight: '3800', sctr: 'Declaración vigente', stevedoring: '260', tickets: '0', food: '140', company: 'SUTRIMEX', vehicle: 'v2', driver: 'ch1' } },
]

const seedLogisticsDeliveries: LogisticsDelivery[] = [
  { id: 'ld1', reference: 'ENT-PAL-001', sourceOperationId: 'op5', campaignId: 'c3', clientId: 'cl1', destination: 'Planta Callao', logisticsStatus: 'Preparada', estimatedArrival: '2025-06-16T09:00', windowStart: '', windowEnd: '', actualArrival: '', arrivalObservations: '', coordinationEvidence: '', waitingReason: '', rescheduledAttention: '', purchases: [{ id: 'buy1', providerId: 'p3', reference: 'COMPRA-PAL-001', fruit: 'Palta', quantity: 842, guide: '', document: 'compra-palta-001.pdf', reviewStatus: 'Pendiente de revisión', observation: '' }], accountingStatus: 'Pendiente de revisión', unloading: { start: '', end: '', observations: '', evidence: '' }, evaluation: { originWeight: 842, plantWeight: 0, report: '', observations: '', result: '' }, discard: { quantity: '', unit: '', reason: '', evidence: '' }, crates: { initial: '', returned: '', returnDate: '', evidence: '', coordination: '', vehicleExit: '', carrierCopy: false }, documents: { fruitGuide: '', purchaseDetail: 'compra-palta-001.pdf', receptionReport: '', discardEvidence: '', crateReturn: '', signedExitGuide: '' }, physicalClosed: false, administrativeClosed: false },
  { id: 'ld2', reference: 'ENT-MAN-002', sourceOperationId: 'op3', campaignId: 'c1', clientId: 'cl1', destination: 'Terminal de frío Callao', logisticsStatus: 'En espera', estimatedArrival: '2026-01-06T18:30', windowStart: '2026-01-06T14:00', windowEnd: '2026-01-06T17:00', actualArrival: '2026-01-06T18:25', arrivalObservations: 'Llegada fuera de la ventana confirmada.', coordinationEvidence: 'coordinacion-llegada-002.pdf', waitingReason: 'Planta sin atención fuera del horario comunicado.', rescheduledAttention: '2026-01-07T08:00', purchases: [{ id: 'buy2', providerId: 'p3', reference: 'COMPRA-MAN-002', fruit: 'Mango', quantity: 548, guide: 'guia-remision-001.pdf', document: 'compra-fruta-001.pdf', reviewStatus: 'Compartido con Contabilidad', observation: '' }], accountingStatus: 'Compartido con Contabilidad', unloading: { start: '', end: '', observations: '', evidence: '' }, evaluation: { originWeight: 548, plantWeight: 0, report: '', observations: '', result: '' }, discard: { quantity: '', unit: '', reason: '', evidence: '' }, crates: { initial: '110', returned: '', returnDate: '', evidence: '', coordination: 'Coordinación pendiente con planta', vehicleExit: '', carrierCopy: false }, documents: { fruitGuide: 'guia-remision-001.pdf', purchaseDetail: 'compra-fruta-001.pdf', receptionReport: '', discardEvidence: '', crateReturn: '', signedExitGuide: '' }, physicalClosed: false, administrativeClosed: false },
  { id: 'ld3', reference: 'ENT-MAN-003', sourceOperationId: 'op6', campaignId: 'c2', clientId: 'cl2', destination: 'Planta industrial Lima', logisticsStatus: 'Recepción completada', estimatedArrival: '2025-05-23T07:30', windowStart: '2025-05-23T07:00', windowEnd: '2025-05-23T09:00', actualArrival: '2025-05-23T07:42', arrivalObservations: 'Llegada dentro de ventana.', coordinationEvidence: 'coordinacion-llegada-003.pdf', waitingReason: '', rescheduledAttention: '', purchases: [{ id: 'buy3', providerId: 'p1', reference: 'COMPRA-MAN-003-A', fruit: 'Mango', quantity: 610, guide: 'guia-003.pdf', document: 'compra-003-a.pdf', reviewStatus: 'Verificación registrada', observation: 'Conforme.' }, { id: 'buy4', providerId: 'p2', reference: 'COMPRA-MAN-003-B', fruit: 'Mango', quantity: 350, guide: 'guia-003.pdf', document: 'compra-003-b.pdf', reviewStatus: 'Verificación registrada', observation: 'Segundo origen propuesto.' }], accountingStatus: 'Verificación registrada', unloading: { start: '2025-05-23T08:05', end: '2025-05-23T09:10', observations: 'Descarga completada.', evidence: 'descarga-003.pdf' }, evaluation: { originWeight: 940, plantWeight: 915, report: 'reporte-planta-003.pdf', observations: 'Evaluación recibida de planta.', result: 'Carga recibida con descarte' }, discard: { quantity: '18', unit: 'kg', reason: 'Daño mecánico visible', evidence: 'descarte-003.pdf' }, crates: { initial: '188', returned: '160', returnDate: '2025-05-23', evidence: 'devolucion-parcial-jabas.pdf', coordination: 'Planta confirmó devolución parcial.', vehicleExit: '2025-05-23T11:30', carrierCopy: true }, documents: { fruitGuide: 'guia-003.pdf', purchaseDetail: 'detalle-compras-003.pdf', receptionReport: 'reporte-planta-003.pdf', discardEvidence: 'descarte-003.pdf', crateReturn: 'devolucion-parcial-jabas.pdf', signedExitGuide: 'guia-salida-firmada-003.pdf' }, physicalClosed: true, administrativeClosed: false },
]

const seedClients: Client[] = [
  {
    id: 'cl1', empresa: 'SUTRIMEX', representante: 'Brayan Ponce', telefono: '987456321', correo: 'sutrimex@gmail.com', ruc: '20987456321', ubicacion: 'Lima', tipo: 'Exportador', fechaRegistro: '2025-01-15',
    contratos: [
      { id: 'ct1', nombre: 'Contrato Mango Kent', kg: 3000, documento: 'contrato-sutrimex.pdf', ficha: 'ficha-mango-kent.pdf', fecha: '2025-02-08', campaignId: 'c2' },
      { id: 'ct2', nombre: 'Contrato Palta Hass', kg: 2500, documento: 'contrato-palta.pdf', ficha: 'ficha-palta.pdf', fecha: '2025-03-12', campaignId: 'c3' },
    ],
  },
  {
    id: 'cl2', empresa: 'FIXGROM', representante: 'Luis Chávez', telefono: '962541387', correo: 'fixgrom@gmail.com', ruc: '20987456210', ubicacion: 'Callao', tipo: 'Industria', fechaRegistro: '2025-01-22',
    contratos: [
      { id: 'ct3', nombre: 'Contrato Mango 2026', kg: 3000, documento: 'contrato-fixgrom.pdf', ficha: 'ficha-mango.pdf', fecha: '2025-07-30', campaignId: 'c1' },
    ],
  },
  {
    id: 'cl3', empresa: 'Batimix', representante: 'Brayan Galarza', telefono: '958632741', correo: 'info@batimix.com', ruc: '10265847930', ubicacion: 'Lima', tipo: 'Industria', fechaRegistro: '2025-02-03',
    contratos: [],
  },
]

const seedTransporters: Transporter[] = [
  {
    id: 't1', empresa: 'SUTRIMEX', ruc: '20987456321', numero: '987456321', correo: 'sutrimex@gmail.com', departamento: 'Lima', provincia: 'Lima', ciudad: 'Lima',
    vehiculos: [
      { id: 'v1', placa: 'C4K-908', capacidad: '35 m³', pbv: '12 t', pesoNeto: '5.3 t', volumen: '35', ancho: '2.40', altura: '2.50', profundidad: '6.10', pesoBruto: '12', chofer: 'Sin asignar' },
      { id: 'v2', placa: 'T6A-482', capacidad: '68 m³', pbv: '28 t', pesoNeto: '8.2 t', volumen: '68', ancho: '2.60', altura: '2.75', profundidad: '10.20', pesoBruto: '28', chofer: 'Miguel Torres' },
    ],
    choferes: [
      { id: 'ch1', nombre: 'Miguel Torres', telefono: '987654321', correo: 'm.torres@sutrimex.pe' },
      { id: 'ch2', nombre: 'Rosa Aguilar', telefono: '986112233', correo: 'r.aguilar@sutrimex.pe' },
    ],
  },
  {
    id: 't2', empresa: 'FIXGROM', ruc: '20962541387', numero: '962541387', correo: 'fixgrom@gmail.com', departamento: 'Callao', provincia: 'Callao', ciudad: 'Callao',
    vehiculos: [{ id: 'v3', placa: 'B9Q-714', capacidad: '74 m³', pbv: '30 t', pesoNeto: '9.0 t', volumen: '74', ancho: '2.60', altura: '2.85', profundidad: '10.00', pesoBruto: '30', chofer: 'Elena Ruiz' }],
    choferes: [{ id: 'ch3', nombre: 'Elena Ruiz', telefono: '954778821', correo: 'e.ruiz@fixgrom.pe' }],
  },
  { id: 't3', empresa: 'TRANSPACK', ruc: '20943218876', numero: '943218876', correo: 'transpack@gmail.com', departamento: 'La Libertad', provincia: 'Trujillo', ciudad: 'Trujillo', vehiculos: [{ id: 'v4', placa: 'A7R-221', capacidad: '46 m³', pbv: '18 t', pesoNeto: '6.8 t', volumen: '46', ancho: '2.50', altura: '2.65', profundidad: '7.10', pesoBruto: '18', chofer: 'Joel Cárdenas' }], choferes: [{ id: 'ch4', nombre: 'Joel Cárdenas', telefono: '941556677', correo: 'j.cardenas@transpack.pe' }] },
  { id: 't4', empresa: 'CARGO NORTE', ruc: '20978123400', numero: '978123400', correo: 'cargonorte@gmail.com', vehiculos: [], choferes: [] },
  { id: 't5', empresa: 'Transportes del Pacífico S.A.C.', ruc: '20654321876', numero: '981245670', correo: 'contacto@transportespacifico.pe', vehiculos: [], choferes: [] },
  { id: 't6', empresa: 'Logística Integral Norte E.I.R.L.', ruc: '20498123654', numero: '964378210', correo: 'operaciones@loginorte.pe', vehiculos: [], choferes: [] },
  { id: 't7', empresa: 'Servicios de Carga Andina S.R.L.', ruc: '20567432109', numero: '955621498', correo: 'carga@andina.pe', vehiculos: [], choferes: [] },
  { id: 't9', tipo: 'Privado', empresa: 'José Ramírez', documentoIdentidad: '45678912', ruc: '', numero: '987123456', correo: 'jramirez@correo.pe', departamento: 'Piura', provincia: 'Piura', ciudad: 'Piura', vehiculos: [{ id: 'v9', placa: 'P8A-420', capacidad: '40 m³', pbv: '18 t', pesoNeto: '6 t' }], choferes: [{ id: 'ch9', nombre: 'José Ramírez', telefono: '987123456', correo: 'jramirez@correo.pe' }] },
  { id: 't8', empresa: 'Distribuciones Valle Verde S.A.C.', ruc: '20345678912', numero: '972114586', correo: 'info@valleverde.pe', vehiculos: [], choferes: [] },
]

export const seedPayments: Payment[] = [
  { id: 'pg1', codigo: '#ADSA54ASD45', transportista: 'SUTRIMEX', campaignId: 'c2', total: 20000, pagado: 10000, fechaAcordada: '2025-02-15', fechaFinal: '2025-03-12', boleta: true, estado: 'Adelanto' },
  { id: 'pg2', codigo: '#KLM72PQR91', transportista: 'FIXGROM', campaignId: 'c3', total: 15000, pagado: 0, fechaAcordada: '2025-04-20', fechaFinal: '', boleta: false, estado: 'Pendiente' },
  { id: 'pg3', codigo: '#ZXC19VBN40', transportista: 'SUTRIMEX', campaignId: 'c4', total: 12000, pagado: 12000, fechaAcordada: '2024-10-01', fechaFinal: '2024-10-30', boleta: true, estado: 'Completado' },
]

export type LoadPackage = { type: 'Jabas' | 'Bines' | 'Mallas'; loaded: number; empty: number }

export interface GuideProvider { fruitType?: 'Orgánica' | 'Convencional'; providerId: string; fincaIds: string[]; kilos: number }
export interface RemissionGuideDetails {
  /** Legacy sender data retained for historical guides, not requested in the form. */
  senderName?: string; senderDocument?: string; senderAddress?: string
  handoverDate?: string
  carrierDocumentType?: string; carrierDocument?: string; carrierName?: string; carrierMtc?: string; vehiclePlate?: string
  driverFirstNames?: string; driverLastNames?: string
  originEstablishment?: string; destinationEstablishment?: string
  issueDate: string; shipmentDate: string; reason: string
  originAddress: string; originUbigeo: string; destinationAddress: string; destinationUbigeo: string
  driverDocumentType?: string; driverDocument: string; driverLicense: string
  grossWeight: number; packageCount: number; productCode: string; description: string
  standardCodes: string[]; standardText: string; observations: string
}
export interface CampaignTransportService {
  driverDispatch?: DispatchEvent[]
  sourceDelivery?: QualityOperation['sourceDelivery']
  id: string
  annotation?: {
    viaticos?: LoadTravelExpenses
    qualityResult?: 'Cumple'
    responsible: string
    registeredAt: string
    loadDate?: string
    variety?: string
    kilos: number
    /** Totales del camión (suma de todos los proveedores). */
    packages: LoadPackage[]
    /** Bultos separados por cada proveedor que va en el camión. */
    providers?: { providerId: string; variety?: string; kilos?: number; packages: LoadPackage[] }[]
    expenses?: { concept: 'Cuadrilla' | 'Anotadores'; amount: number }[]
    observations: string
  }
  freight?: number; freightObservation?: string
  logisticsCompleted?: boolean
  providerId?: string
  fincaId?: string
  guides?: { id: string; providers?: GuideProvider[]; details?: RemissionGuideDetails; reference: string; document: string; generatedAt?: string; snapshot?: { label: string; value: string }[]; requirementId: string; contractId: string; deliveryId: string; kilos: number }[]
  vehicleId: string
  driverId: string
  start: string
  end: string
  origin: string
  destination: string
  conditions: string
  operationId?: string
  movements?: { id: string; stage: 'En recojo' | 'Despachado' | 'Llegada'; date: string; observations: string }[]
  documents?: { guide: string; loadedKg: string; freight: string; currency: string; sctr: string; stevedoring: string; tickets: string; food: string; observations: string }
}

export interface CampaignTransporter {
  quotation?: string
  id: string
  campaignId: string
  transporterId: string
  fecha: string
  services: CampaignTransportService[]
  paymentAgreement?: { type: 'Adelanto' | 'Completo'; total: number; advance: number; due: string; currency: string; receipt: string; receiptAttachmentId?: string }
}

// ---------- Store ----------
interface Store {
  invoices: Invoice[]
  settlements: PurchaseSettlement[]
  financialMovements: FinancialMovement[]
  saveInvoice: (item: Omit<Invoice, 'id'> & { id?: string }) => boolean
  saveSettlement: (item: Omit<PurchaseSettlement, 'id'> & { id?: string }) => boolean
  addFinancialMovement: (item: Omit<FinancialMovement, 'id'>) => boolean
  campaigns: Campaign[]
  providers: Provider[]
  saveProviderFarm: (providerId: string, farm: Finca, agronomy: Omit<DatoAgronomico, 'id' | 'nombre' | 'fincaId' | 'campaignId' | 'codigo' | 'registeredAt'>, campaignId?: string, registerInterview?: boolean) => void
  associateCampaignFarm: (campaignId: string, providerId: string, farmId: string) => void
  exams: Exam[]
  campaignProviders: CampaignProvider[]
  interviews: Interview[]
  certifications: Certification[]
  requirements: ClientRequirement[]
  qualityOperations: QualityOperation[]
  exportMtdRecords: ExportMtdRecord[]
  saveExportMtd: (record: Pick<ExportMtdRecord, 'campaignId' | 'providerId' | 'fincaId' | 'value' | 'evidence'>) => boolean
  logisticsDeliveries: LogisticsDelivery[]
  clients: Client[]
  transporters: Transporter[]
  campaignTransporters: CampaignTransporter[]
  assignTransportFreight: (linkId:string,serviceId:string,amount:number,observation?:string)=>string|void
  saveTransportPaymentAgreement: (linkId: string, agreement: NonNullable<CampaignTransporter['paymentAgreement']>) => boolean
  linkCampaignTransporter: (campaignId: string, transporterId: string, quotation: string) => void
  rejectIndustryDelivery: (operationId: string, source: NonNullable<QualityOperation['sourceDelivery']>, serviceId?: string) => void
  rejectDriverLoad: (transporterId:string,driverId:string,source:NonNullable<QualityOperation['sourceDelivery']>) => string | void
  saveDriverLoad: (transporterId:string,driverId:string,source:NonNullable<QualityOperation['sourceDelivery']>,annotation:NonNullable<CampaignTransportService['annotation']>) => string | void
  saveDriverChecklist: (transporterId:string,driverId:string,linkId:string,serviceId:string,step:DriverChecklistStep,input:DriverReceiptInput) => string | void
  advanceDriverDispatch: (transporterId:string,driverId:string,linkId:string,serviceId:string,next:DispatchStage) => string | void
  saveCampaignTransportService: (linkId: string, service: Omit<CampaignTransportService, 'id'> & { id?: string }) => void
  payments: Payment[]
  addCampaign: (c: Omit<Campaign, 'id'>) => void
  updateCampaign: (id: string, c: Partial<Campaign>) => void
  addProvider: (p: Omit<Provider, 'id'>) => void
  updateProvider: (id: string, p: Partial<Provider>) => void
  addExam: (e: Omit<Exam, 'id'>) => void
  addCampaignProvider: (p: Omit<CampaignProvider, 'id'>) => void
  updateCampaignProvider: (id: string, p: Partial<CampaignProvider>) => void
  addInterview: (i: Omit<Interview, 'id'>) => void
  addCertification: (c: Omit<Certification, 'id'>) => void
  updateCertification: (id: string, c: Partial<Certification>) => void
  addCertificationPayment: (certificationId: string, payment: Omit<Certification['pagos'][number], 'id'>) => void
  addCertificationExpansion: (certificationId: string, expansion: Omit<Certification['ampliaciones'][number], 'id'>) => void
  addRequirement: (r: Omit<ClientRequirement, 'id'>) => string
  updateRequirement: (id: string, r: Partial<ClientRequirement>) => void
  saveCommercialContract: (requirementId: string, contract: Omit<CommercialContract, 'id'> & { id?: string }) => void
  addQualityOperation: (operation: Omit<QualityOperation, 'id'>) => string
  updateQualityOperation: (id: string, operation: Partial<QualityOperation>) => void
  addLogisticsDelivery: (delivery: Omit<LogisticsDelivery, 'id'>) => string
  updateLogisticsDelivery: (id: string, delivery: Partial<LogisticsDelivery>) => void
  addClient: (c: Omit<Client, 'id'>) => void
  updateClient: (id: string, c: Partial<Client>) => void
  addContract: (clientId: string, ct: Omit<Contract, 'id'>) => void
  addTransporter: (t: Omit<Transporter, 'id' | 'vehiculos' | 'choferes'>) => void
  updateTransporter: (id: string, t: Partial<Transporter>) => void
  addVehicle: (transporterId: string, v: Omit<Vehicle, 'id'>) => void
  updateVehicle: (transporterId: string, vehicleId: string, v: Partial<Vehicle>) => void
  addChofer: (transporterId: string, c: Omit<Chofer, 'id'>) => void
  updateChofer: (transporterId: string, choferId: string, c: Partial<Chofer>) => void
  addPayment: (p: Omit<Payment, 'id'>) => void
  updatePayment: (id: string, p: Partial<Payment>) => void
  toast: (msg: string) => void
  toasts: { id: number; msg: string }[]
}

const Ctx = createContext<Store | null>(null)
const uid = () => Math.random().toString(36).slice(2, 9)

export function campaignStatusByDate(campaign: Pick<Campaign, 'estado' | 'fecha'>, today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())): CampaignStatus {
  if (campaign.estado === 'Finalizado') return 'Finalizado'
  return campaign.fecha && campaign.fecha <= today ? 'En Proceso' : 'Planificado'
}

export const syntheticData = createSyntheticData({ campaigns: seedCampaigns, providers: seedProviders, participations: seedCampaignProviders, exams: seedExams, interviews: seedInterviews, certifications: seedCertifications, requirements: seedRequirements, operations: seedQualityOperations, logistics: seedLogisticsDeliveries, clients: seedClients, transporters: seedTransporters })

export function StoreProvider({ children }: { children: ReactNode }) {
  const sharedActor=useSharedActor()
  const [campaigns, setCampaigns] = useDemoState('campaigns', syntheticData.campaigns.map((campaign) => ({ ...campaign, estado: campaignStatusByDate(campaign), derivadas: Array.from(new Set(campaign.frutas.flatMap((fruit) => FRUIT_CATALOG[fruit] || []))) })))
  useEffect(() => {
    const refresh = () => setCampaigns((current) => {
      const updated = current.map((campaign) => ({ ...campaign, estado: campaignStatusByDate(campaign) }))
      return updated.some((campaign, index) => campaign.estado !== current[index].estado) ? updated : current
    })
    const timer = setInterval(refresh, 60000)
    window.addEventListener('focus', refresh)
    return () => { clearInterval(timer); window.removeEventListener('focus', refresh) }
  }, [])
  const [providers, setProviders] = useDemoState('providers', syntheticData.providers)
  const [exams, setExams] = useDemoState('exams', syntheticData.exams)
  const [campaignProviders, setCampaignProviders] = useDemoState('campaignProviders', syntheticData.participations)
  const [interviews, setInterviews] = useDemoState('interviews', syntheticData.interviews)
  const [certifications, setCertifications] = useDemoState('certifications', syntheticData.certifications)
  const [requirements, setRequirements] = useDemoState('requirements', syntheticData.requirements)
  const [qualityOperations, setQualityOperations] = useDemoState('qualityOperations', syntheticData.operations)
  const [exportMtdRecords, setExportMtdRecords] = useDemoState<ExportMtdRecord[]>('exportMtdRecords', syntheticData.exportMtdRecords)
  const [logisticsDeliveries, setLogisticsDeliveries] = useDemoState('logisticsDeliveries', syntheticData.logistics)
  const [clients, setClients] = useDemoState('clients', syntheticData.clients)
  const [transporters, setTransporters] = useDemoState('transporters', syntheticData.transporters)
  const [campaignTransporters, setCampaignTransporters] = useDemoState<CampaignTransporter[]>('campaignTransporters', syntheticData.campaignTransporters)
  const [invoices, setInvoices] = useDemoState('invoices', syntheticData.invoices)
  const [settlements, setSettlements] = useDemoState('settlements', syntheticData.settlements)
  const [financialMovements, setFinancialMovements] = useDemoState('financialMovements', syntheticData.movements)
  const [payments, setPayments] = useDemoState('payments', seedPayments)
  useEffect(()=>{
    setLogisticsDeliveries(current=>reconcileLogistics(current,{campaignTransporters,qualityOperations,requirements}))
  },[campaignTransporters,qualityOperations,requirements,logisticsDeliveries,setLogisticsDeliveries])
  const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([])

  const notifyLoadConflict = () => {
    const id=Date.now();setToasts(current=>[...current,{id,msg:'Esta entrega ya tiene una carga registrada.'}]);setTimeout(()=>setToasts(current=>current.filter(t=>t.id!==id)),3200)
  }
  const value = useMemo<Store>(() => ({
    campaigns, providers, exams, campaignProviders, interviews, certifications, requirements, qualityOperations, exportMtdRecords, logisticsDeliveries, clients, transporters, campaignTransporters, payments, invoices, settlements, financialMovements, toasts,
    toast: (msg) => {
      const id = Date.now() + Math.random()
      setToasts((t) => [...t, { id, msg }])
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200)
    },
    addCampaign: (c) => setCampaigns((s) => [{ ...c, estado: campaignStatusByDate(c), id: uid() }, ...s]),
    updateCampaign: (id, c) => setCampaigns((s) => s.map((x) => (x.id === id ? { ...x, ...c, estado: campaignStatusByDate({ ...x, ...c }) } : x))),
    associateCampaignFarm: (campaignId, providerId, farmId) => {
      if (!providers.some(p => p.id === providerId && p.fincas?.some(f => f.id === farmId))) return
      setCampaignProviders(current => current.map(p => p.campaignId === campaignId && p.providerId === providerId ? { ...p, fincaIds: Array.from(new Set([...(p.fincaIds ?? (p.fincaId ? [p.fincaId] : [])), farmId])) } : p))
    },
    saveProviderFarm: (providerId, farm, agronomy, campaignId, registerInterview) => {
      if (!providers.some(p => p.id === providerId) || !farm.nombre.trim()) return
      if (Object.values(agronomy).some(value => value.trim()) && !campaigns.some(c => c.id === campaignId)) return
      if (registerInterview && (!campaignId || !campaignProviders.some(p => p.providerId === providerId && p.campaignId === campaignId && p.rol === 'Productor'))) return
      setProviders(current => current.map(p => {
        if (p.id !== providerId) return p
        const existing = p.datosAgronomicos?.find(a => a.fincaId === farm.id && a.campaignId === campaignId)
        const hasAgronomy = Object.values(agronomy).some(value => value.trim())
        const campaign = campaigns.find(c => c.id === campaignId)
        const prefix = (campaign?.fruta || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase()
        const sequence = current.flatMap(provider => provider.datosAgronomicos || []).filter(a => a.campaignId === campaignId).reduce((max, a) => Math.max(max, Number(a.codigo?.split('-').at(-1) || 0)), 0) + 1
        const data = { ...agronomy, id: existing?.id || uid(), nombre: farm.nombre, fincaId: farm.id, campaignId, codigo: existing?.codigo || `FYV-${prefix}-${String(sequence).padStart(2, '0')}`, registeredAt: existing?.registeredAt || new Date().toISOString() }
        return { ...p, fincas: p.fincas?.some(f => f.id === farm.id) ? p.fincas.map(f => f.id === farm.id ? farm : f) : [...(p.fincas || []), farm], datosAgronomicos: hasAgronomy && campaign ? [...(p.datosAgronomicos || []).filter(a => !(a.fincaId === farm.id && a.campaignId === campaignId)), data] : (p.datosAgronomicos || []) }
      }))
      if (campaignId) setCampaignProviders(current => current.map(p => p.campaignId === campaignId && p.providerId === providerId ? { ...p, fincaIds: Array.from(new Set([...(p.fincaIds ?? (p.fincaId ? [p.fincaId] : [])), farm.id])) } : p))
      if (registerInterview && campaignId) {
        const now = new Date().toISOString()
        const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
        const provider = providers.find(p => p.id === providerId)!
        const campaign = campaigns.find(c => c.id === campaignId)!
        setInterviews(current => {
          const existing = current.find(i => i.providerId === providerId && i.campaignId === campaignId)
          const previous = existing?.farmRecords?.find(r => r.fincaId === farm.id)
          const record = { fincaId: farm.id, registeredAt: previous?.registeredAt || now, updatedAt: now }
          const farmRecords = previous ? existing!.farmRecords!.map(r => r.fincaId === farm.id ? record : r) : [...(existing?.farmRecords || []), record]
          const fincaIds = farmRecords.map(r => r.fincaId)
          const farms = [...(provider.fincas || []).filter(f => f.id !== farm.id), farm].filter(f => fincaIds.includes(f.id))
          const saved: Interview = { ...existing, id: existing?.id || uid(), providerId, campaignId, fincaIds, farmRecords, fecha: existing?.fecha || date, responsable: existing?.responsable || campaign.responsable, finca: farms.map(f => f.nombre).join(', '), ubicacion: provider.zona, superficie: farms.reduce((n, f) => n + Number(f.haCultivo || 0), 0), cultivo: campaign.fruta, variedad: farms.map(f => f.variedad).filter(Boolean).join(', '), produccion: existing?.produccion || '', observaciones: existing?.observaciones || '', estado: 'Completa' }
          return existing ? current.map(i => i.id === existing.id ? saved : i) : [...current, saved]
        })
        const related = exams.filter(e => e.providerId === providerId && e.campaignId === campaignId)
        const clear = related.length > 0 && related.every(e => (!e.estado || e.estado === 'Con resultado') && e.resultado === 'Negativo')
        setCampaignProviders(current => current.map(p => p.providerId === providerId && p.campaignId === campaignId ? { ...p, evaluacion: clear ? 'Aprobado' : 'Examen pendiente', estadoBd: clear ? 'Validado' : 'Sin validar' } : p))
      }

    },
    addProvider: (p) => setProviders((s) => [{ ...p, id: uid() }, ...s]),
    updateProvider: (id, p) => setProviders((s) => s.map((x) => (x.id === id ? { ...x, ...p } : x))),
    addExam: (exam) => {
      const e = exam.estado && exam.estado !== 'Con resultado' ? { ...exam, resultado: undefined } : exam
      if (e.estado === 'Con resultado' && !e.resultado) return
      setExams((current) => [{ ...e, id: uid() }, ...current])
      if (!e.campaignId) return
      const related = [e, ...exams.filter((item) => item.providerId === e.providerId && item.campaignId === e.campaignId)]
      const finished = related.every((item) => !item.estado || item.estado === 'Con resultado')
      const clear = finished && related.every((item) => item.resultado === 'Negativo')
      setCampaignProviders((current) => current.map((participation) => {
        if (participation.providerId !== e.providerId || participation.campaignId !== e.campaignId) return participation
        const needsInterview = participation.rol === 'Productor' && !interviews.some((item) => item.providerId === e.providerId && item.campaignId === e.campaignId && item.estado === 'Completa')
        const evaluacion: EvaluationState = !clear ? 'Examen pendiente' : needsInterview ? 'Entrevista pendiente' : 'Aprobado'
        return { ...participation, estadoBd: evaluacion === 'Aprobado' ? 'Validado' : 'Sin validar', evaluacion }
      }))
    },
    addCampaignProvider: (p) => setCampaignProviders((s) => [{ ...p, id: uid() }, ...s]),
    updateCampaignProvider: (id, p) => setCampaignProviders((s) => s.map((x) => (x.id === id ? { ...x, ...p } : x))),
    addInterview: (i) => {
      if (!campaignProviders.some(p => p.campaignId === i.campaignId && p.providerId === i.providerId && p.rol === 'Productor')) return
      setInterviews((current) => { const existing = current.find(item => item.campaignId === i.campaignId && item.providerId === i.providerId); return [{ ...i, id: existing?.id || uid() }, ...current.filter(item => item.campaignId !== i.campaignId || item.providerId !== i.providerId)] })
      const related = exams.filter((item) => item.providerId === i.providerId && item.campaignId === i.campaignId)
      const clear = related.length > 0 && related.every((item) => (!item.estado || item.estado === 'Con resultado') && item.resultado === 'Negativo')
      setCampaignProviders((current) => current.map((participation) => participation.providerId === i.providerId && participation.campaignId === i.campaignId ? { ...participation, evaluacion: clear ? i.estado === 'Completa' ? 'Aprobado' : 'Entrevista pendiente' : 'Examen pendiente', estadoBd: clear && i.estado === 'Completa' ? 'Validado' : 'Sin validar' } : participation))
    },
    addCertification: (c) => setCertifications(current => {
      if(current.some(item=>item.campaignId===c.campaignId))return current
      const kilos=certificationEstimatedKilos(campaignProviders,c.campaignId,c.producerIds)
      return [{...c,kilos,id:uid(),kilosHistory:[{fecha:new Date().toISOString(),kilos,producerIds:[...c.producerIds]}]},...current]
    }),
    updateCertification: (id, changes) => setCertifications(current => current.map(existing=>{
      if(existing.id!==id)return existing
      const campaignId=changes.campaignId||existing.campaignId
      if(current.some(c=>c.id!==id&&c.campaignId===campaignId))return existing
      const producerIds=Array.from(new Set(changes.producerIds||existing.producerIds))
      const kilos=certificationEstimatedKilos(campaignProviders,campaignId,producerIds)
      const history=existing.kilosHistory?.length?existing.kilosHistory:[{fecha:existing.emision,kilos:existing.kilos,producerIds:[...existing.producerIds]}]
      const changed=kilos!==existing.kilos||[...producerIds].sort().join('|')!==[...existing.producerIds].sort().join('|')
      return {...existing,...changes,producerIds,kilos,kilosHistory:changed?[...history,{fecha:new Date().toISOString(),kilos,producerIds}]:history}
    })),
    addCertificationPayment: (certificationId, payment) =>
      setCertifications((s) => s.map((x) => x.id === certificationId ? { ...x, pagos: [...x.pagos, { ...payment, id: uid() }] } : x)),
    addCertificationExpansion: (certificationId, expansion) =>
      setCertifications((s) => s.map((x) => x.id === certificationId ? { ...x, ampliaciones: [...x.ampliaciones, { ...expansion, id: uid() }] } : x)),
    addRequirement: (r) => {
      const id = uid()
      setRequirements((s) => [{ ...r, id, contratos: r.contratos || [] }, ...s])
      return id
    },
    saveCommercialContract: (requirementId, contract) => setRequirements((current) => current.map((r) => {
      if (r.id !== requirementId) return r
      const saved = { ...contract, id: contract.id || uid() }
      const contratos = contract.id ? r.contratos.map((item) => item.id === contract.id ? saved : item) : [...r.contratos, saved]
      return { ...r, contratos, contrato: contratos[0]?.contrato, kilosAcordados: contratos.reduce((total, item) => total + item.kilos, 0), entregas: contratos.flatMap((item) => item.entregas) }
    })),
    updateRequirement: (id, r) => setRequirements((s) => s.map((x) => (x.id === id ? { ...x, ...r, contratos: r.contratos || x.contratos } : x))),
    addQualityOperation: (operation) => {
      if (operation.route === 'Exportación' && operation.sourceDelivery && deliveryHasLoad(qualityOperations,campaignTransporters,operation.sourceDelivery)) {
        notifyLoadConflict(); return qualityOperations.find(o=>o.route==='Exportación'&&o.sourceDelivery?.requirementId===operation.sourceDelivery?.requirementId&&o.sourceDelivery?.contractId===operation.sourceDelivery?.contractId&&o.sourceDelivery?.deliveryId===operation.sourceDelivery?.deliveryId)?.id || ''
      }
      const id = uid()
      setQualityOperations((s) => [{ ...operation, id }, ...s])
      return id
    },
    saveExportMtd: (record) => {
      if (!campaignProviders.some(p=>p.campaignId===record.campaignId&&p.providerId===record.providerId&&p.rol==='Productor') || !providers.some(p=>p.id===record.providerId&&p.fincas?.some(f=>f.id===record.fincaId)) || !record.value.trim() || !Number.isFinite(Number(record.value)) || Number(record.value)<0 || !record.evidence.trim()) return false
      setExportMtdRecords(current=>{
        const existing=current.find(r=>r.campaignId===record.campaignId&&r.providerId===record.providerId&&r.fincaId===record.fincaId)
        if(existing&&existing.value===record.value&&existing.evidence===record.evidence)return current
        const recordedAt=new Date().toISOString()
        const saved={...record,id:existing?.id||uid(),recordedAt,history:[...(existing?.history||[]),{value:record.value,evidence:record.evidence,recordedAt}]}
        return existing?current.map(r=>r.id===existing.id?saved:r):[...current,saved]
      })
      return true
    },
    updateQualityOperation: (id, operation) => setQualityOperations((s) => s.map((x) => x.id === id ? { ...x, ...operation } : x)),
    addLogisticsDelivery: (delivery) => {
      const id = uid()
      setLogisticsDeliveries((s) => [{ ...delivery, id }, ...s])
      return id
    },
    updateLogisticsDelivery: (id, delivery) => setLogisticsDeliveries((s) => s.map((x) => x.id === id ? { ...x, ...delivery } : x)),
    addClient: (c) => setClients((s) => [{ ...c, id: uid() }, ...s]),
    updateClient: (id, c) => setClients((s) => s.map((x) => (x.id === id ? { ...x, ...c } : x))),
    addContract: (clientId, ct) =>
      setClients((s) => s.map((x) => (x.id === clientId ? { ...x, contratos: [...x.contratos, { ...ct, id: uid() }] } : x))),
    assignTransportFreight: (linkId,serviceId,amount,observation) => {
      const link=campaignTransporters.find(l=>l.id===linkId),service=link?.services.find(x=>x.id===serviceId)
      if(!link||!service||!campaigns.some(c=>c.id===link.campaignId&&c.estado==='En Proceso'))return 'Selecciona una carga de una campaña en proceso.'
      const source=service.sourceDelivery
      const links=campaignTransporters.map(l=>l.id===linkId?{...l,services:l.services.map(x=>x.id===serviceId?{...x,freight:amount,freightObservation:(observation||'').trim()}:x)}:l)
      const reqs=requirements.map(r=>r.id===source?.requirementId?{...r,contratos:r.contratos.map(c=>c.id===source.contractId?{...c,entregas:c.entregas.map(d=>d.id===source.deliveryId?{...d,freight:amount,freightObservation:(observation||'').trim()}:d)}:c)}:r)
      const issue=freightIssue({campaignTransporters:links,requirements:reqs,settlements,financialMovements},{campaignTransporters,requirements,settlements,financialMovements})
      if(issue)return issue
      setCampaignTransporters(links);setRequirements(reqs)
    },
    saveTransportPaymentAgreement: (linkId, agreement) => {
      const link = campaignTransporters.find(l => l.id === linkId)
      if (!link || !campaigns.some(c => c.id === link.campaignId && c.estado === 'En Proceso') || ((settlements.some(d => d.transportLinkId === linkId)||financialMovements.some(m=>m.transportAdvanceLinkId===linkId)) && JSON.stringify(link.paymentAgreement && {type:link.paymentAgreement.type,total:link.paymentAgreement.total,advance:link.paymentAgreement.advance,due:link.paymentAgreement.due,currency:link.paymentAgreement.currency})!==JSON.stringify({type:agreement.type,total:agreement.total,advance:agreement.advance,due:agreement.due,currency:agreement.currency})) || !Number.isFinite(agreement.total) || agreement.total <= 0 || !Number.isFinite(agreement.advance) || agreement.advance < 0 || agreement.advance > agreement.total || !agreement.due) return false
      setCampaignTransporters(current => current.map(l => l.id === linkId ? { ...l, paymentAgreement: { ...agreement, advance: agreement.type === 'Completo' ? 0 : agreement.advance } } : l))
      return true
    },
    linkCampaignTransporter: (campaignId, transporterId, quotation) => {
      if (!quotation.trim()) return
      if (!campaigns.some((campaign) => campaign.id === campaignId && campaign.estado === 'En Proceso') || !transporters.some((company) => company.id === transporterId)) return
      setCampaignTransporters((current) => current.some((item) => item.campaignId === campaignId && item.transporterId === transporterId) ? current : [...current, { id: uid(), campaignId, transporterId, quotation: quotation.trim(), fecha: new Date().toISOString().slice(0, 10), services: [] }])
    },
    rejectIndustryDelivery: (operationId, source, serviceId) => {
      const operation = qualityOperations.find(o => o.id === operationId && o.route === 'Industria')
      if (!operation || !requirements.some(r => r.id === source.requirementId && r.campaignId === operation.campaignId && r.contratos.some(c => c.id === source.contractId && c.entregas.some(d => d.id === source.deliveryId)))) return
      if (!serviceId && deliveryHasLoad(qualityOperations,campaignTransporters,source)) { notifyLoadConflict(); return }
      if (serviceId && campaignTransporters.some(l => l.services.some(i => i.id === serviceId && i.guides?.some(g => g.generatedAt)))) return
      const loaded = campaignTransporters.flatMap(l => l.services).filter(i => i.operationId === operationId && i.id !== serviceId).reduce((sum, i) => sum + (i.annotation?.kilos || 0), 0)
      setQualityOperations(current => current.map(o => o.id === operationId ? { ...o, loadedQuantity: loaded, status: loaded > 0 ? 'Carga registrada' : 'Rechazada', rejectedDeliveries: [...(o.rejectedDeliveries || []), { id: uid(), sourceDelivery: source, registeredAt: new Date().toISOString() }] } : o))
      if (serviceId) setCampaignTransporters(current => current.map(l => ({ ...l, services: l.services.filter(i => i.id !== serviceId) })))
    },
    rejectDriverLoad: (transporterId,driverId,source) => {
      const r=requirements.find(r=>r.id===source.requirementId)
      const d=r?.contratos.find(c=>c.id===source.contractId)?.entregas.find(d=>d.id===source.deliveryId)
      const link=campaignTransporters.find(l=>l.id===d?.transportLinkId&&l.transporterId===transporterId)
      if(!r||r.canal!=='Industria'||!d||!link||d.driverId!==driverId||!campaigns.some(c=>c.id===r.campaignId&&c.estado==='En Proceso'))return 'La entrega no está disponible para este usuario.'
      const same=(s:QualityOperation['sourceDelivery'])=>s?.requirementId===source.requirementId&&s.contractId===source.contractId&&s.deliveryId===source.deliveryId
      const service=link.services.find(i=>same(i.sourceDelivery))
      if(service&&(dispatchStage(service)!=='En carga'||service.guides?.some(g=>g.generatedAt)))return 'La carga ya salió o tiene guías emitidas.'
      const existing=qualityOperations.find(o=>o.campaignId===r.campaignId&&o.route==='Industria'&&(same(o.sourceDelivery)||!o.sourceDelivery))
      const rejection={id:uid(),sourceDelivery:source,registeredAt:new Date().toISOString()}
      if(existing)setQualityOperations(current=>current.map(o=>o.id===existing.id?{...o,rejectedDeliveries:[...(o.rejectedDeliveries||[]).filter(x=>!same(x.sourceDelivery)),rejection]}:o))
      else setQualityOperations(current=>[{id:uid(),campaignId:r.campaignId,route:'Industria',reference:'RECHAZO-MOV-'+rejection.id,providerId:'',origin:d.origin||'',expectedDate:d.fecha,status:'Rechazada',estimatedQuantity:0,harvestedQuantity:0,acceptedQuantity:0,loadedQuantity:0,plantQuantity:0,observations:'',analyses:[],advances:[],rejectedDeliveries:[rejection]},...current])
      if(service){setCampaignTransporters(current=>current.map(l=>l.id===link.id?{...l,services:l.services.filter(i=>i.id!==service.id)}:l));setLogisticsDeliveries(current=>current.filter(d=>!(d.transportServiceId===service.id||(!d.transportServiceId&&trackedServices({campaignTransporters,qualityOperations,requirements},d).some(m=>m.service.id===service.id)))))}
    },
    saveDriverLoad: (transporterId,driverId,source,annotation) => {
      const r=requirements.find(r=>r.id===source.requirementId)
      const d=r?.contratos.find(c=>c.id===source.contractId)?.entregas.find(d=>d.id===source.deliveryId)
      const link=campaignTransporters.find(l=>l.id===d?.transportLinkId&&l.transporterId===transporterId&&l.campaignId===r?.campaignId)
      if(!r||!d||!link||d.driverId!==driverId)return 'Esta carga no está asignada a tu usuario.'
      if(!campaigns.some(c=>c.id===r.campaignId&&c.estado==='En Proceso'))return 'La campaña no está en proceso.'
      const same=(s:QualityOperation['sourceDelivery'])=>s?.requirementId===source.requirementId&&s.contractId===source.contractId&&s.deliveryId===source.deliveryId
      const sourceOperation=qualityOperations.find(o=>o.route===r.canal&&same(o.sourceDelivery))
      const service=link.services.find(i=>same(i.sourceDelivery))||(sourceOperation?link.services.find(i=>!i.sourceDelivery&&i.operationId===sourceOperation.id):undefined)
      const existing=qualityOperations.find(o=>o.id===service?.operationId)||sourceOperation
      if(service&&(service.driverId!==driverId||dispatchStage(service)!=='En carga'||service.guides?.some(g=>g.generatedAt)))return 'Esta carga ya salió o tiene una guía emitida y no se puede editar.'
      if(existing?.qualityDecision==='Rechazada'||qualityOperations.some(o=>o.rejectedDeliveries?.some(x=>same(x.sourceDelivery))))return 'La carga fue rechazada por calidad.'
      const entries=d.providers?.length?d.providers:d.providerId?[{providerId:d.providerId,fincaIds:d.fincaId?[d.fincaId]:[]}]:[]
      if(!annotation.providers?.length||annotation.providers.some(p=>!entries.some(e=>e.providerId===p.providerId)||!p.variety||!Number.isFinite(p.kilos)||!p.kilos||p.kilos<0||!p.packages.length||p.packages.some(b=>!Number.isInteger(b.loaded)||b.loaded<0||!Number.isInteger(b.empty)||b.empty<0)))return 'Revisa proveedores, variedades, kilos y bultos.'
      if(existing?.advances.length&&annotation.providers.some(p=>(p.kilos||0)+.01<existing.advances.filter(a=>a.providerId===p.providerId).reduce((n,a)=>n+a.kilos,0)))return 'Los kilos no pueden ser menores a los avances ya registrados.'
      const total=annotation.providers.reduce((n,p)=>n+(p.kilos||0),0)
      if(!Number.isFinite(annotation.kilos)||annotation.kilos<=0||Math.abs(total-annotation.kilos)>.01||total>d.kilos+.01)return 'Los kilos no coinciden con los proveedores o superan la entrega.'
      if(r.canal==='Exportación'&&exportReadiness({qualityOperations,exportMtdRecords,providers,campaignProviders,requirements,campaignTransporters,transporters} as unknown as Store, {...existing,campaignId:r.campaignId,route:r.canal,sourceDelivery:source} as QualityOperation).blocked)return 'El MTD supera el límite. El administrador debe resolver la revisión.'
      const operationId=existing?.id||uid();const serviceId=service?.id||(r.canal==='Exportación'?'harvest-'+operationId:uid())
      const operation:QualityOperation={campaignId:r.campaignId,route:r.canal,reference:'CARGA-MOV-'+operationId,providerId:entries[0]?.providerId||'',origin:d.origin||'',expectedDate:d.start||d.fecha,status:'Carga registrada',estimatedQuantity:total,harvestedQuantity:r.canal==='Exportación'?total:0,acceptedQuantity:0,loadedQuantity:total,plantQuantity:0,observations:'',analyses:[],advances:[],...existing,id:operationId,sourceDelivery:source,loadRegistration:r.canal==='Exportación'?annotation:existing?.loadRegistration,variety:annotation.variety,viaticos:annotation.viaticos,qualityDecision:existing?.qualityDecision||'Pendiente'}
      operation.estimatedQuantity=total;operation.loadedQuantity=total
      if(r.canal==='Exportación'&&!operation.advances.length)operation.harvestedQuantity=total
      if(r.canal==='Exportación')operation.qualityDecision=sharedActor?.role==='driver'?(existing?.qualityDecision||'Pendiente'):exportReadiness({qualityOperations,exportMtdRecords,providers,campaignProviders,requirements,campaignTransporters,transporters} as unknown as Store,operation).reviewed?'Aprobada':'Pendiente'
      operation.transport={id:serviceId,cxpId:'',contract:'',kgPurchased:String(total),kgPlant:'',status:'planificado',guide:'',freight:'',sctr:'',stevedoring:'',tickets:'',food:'',company:transporters.find(t=>t.id===transporterId)?.empresa||'',vehicle:d.vehicleId||'',driver:driverId}
      const saved:CampaignTransportService={...service,id:serviceId,operationId,sourceDelivery:source,providerId:entries[0]?.providerId,fincaId:entries[0]?.fincaIds[0],vehicleId:d.vehicleId||'',driverId,start:d.start||'',end:d.end||'',origin:d.origin||'',destination:d.destino,conditions:d.conditions||'',freight:service?.freight??d.freight,freightObservation:service?.freightObservation??d.freightObservation,logisticsCompleted:true,annotation,guides:service?.guides?.map(g=>!g.generatedAt&&!g.details&&!g.providers&&service.guides?.length===1?{...g,kilos:total}:g),driverDispatch:service?.driverDispatch?.length?service.driverDispatch:[{stage:'En carga',date:new Date().toISOString(),driverId}]}
      setLogisticsDeliveries(current=>{
        const linked=current.find(d=>d.campaignId===r.campaignId&&(d.transportServiceId===serviceId||(!d.transportServiceId&&trackedServices({campaignTransporters,qualityOperations,requirements},d).some(m=>m.service.id===serviceId))))
        return linked?current.map(d=>d.id===linked.id?{...d,sourceOperationId:operationId,transportServiceId:serviceId,sourceDelivery:source,evaluation:{...d.evaluation,originWeight:total}}:d):[{id:uid(),reference:'DESP-'+serviceId,sourceOperationId:operationId,transportServiceId:serviceId,sourceDelivery:source,campaignId:r.campaignId,clientId:r.clientId,destination:d.destino,logisticsStatus:'Preparada',estimatedArrival:d.end||d.fecha,windowStart:'',windowEnd:'',actualArrival:'',arrivalObservations:'',coordinationEvidence:'',waitingReason:'',rescheduledAttention:'',purchases:[],accountingStatus:'Pendiente de revisión',unloading:{start:'',end:'',observations:'',evidence:''},evaluation:{originWeight:total,plantWeight:0,report:'',observations:'',result:''},discard:{quantity:'',unit:'',reason:'',evidence:''},crates:{initial:'',returned:'',returnDate:'',evidence:'',coordination:'',vehicleExit:'',carrierCopy:false},documents:{fruitGuide:'',purchaseDetail:'',receptionReport:'',discardEvidence:'',crateReturn:'',signedExitGuide:''},physicalClosed:false,administrativeClosed:false},...current]
      })
      setQualityOperations(current=>current.some(o=>o.id===operationId)?current.map(o=>o.id===operationId?operation:o):[operation,...current])
      setCampaignTransporters(current=>current.map(l=>l.id===link.id?{...l,services:l.services.some(i=>i.id===serviceId)?l.services.map(i=>i.id===serviceId?saved:i):[...l.services,saved]}:l))
    },
    saveDriverChecklist: (transporterId,driverId,linkId,serviceId,step,input) => {
      const link=campaignTransporters.find(l=>l.id===linkId&&l.transporterId===transporterId)
      const service=link?.services.find(i=>i.id===serviceId&&i.driverId===driverId)
      if(!link||!service||!(dispatchStage(service)==='Llegada'||(step==='exitGuide'&&dispatchStage(service)==='Cierre')))return 'Confirma tu llegada antes de registrar estos datos.'
      if(!campaigns.some(c=>c.id===link.campaignId&&c.estado==='En Proceso'))return 'La campaña no está en proceso.'
      const matches=logisticsDeliveries.filter(d=>d.campaignId===link.campaignId&&trackedServices({campaignTransporters,qualityOperations,requirements},d).some(m=>m.link.id===linkId&&m.service.id===serviceId))
      if(matches.length!==1)return 'No hay una entrega única vinculada a esta carga. Espera la sincronización o consulta al administrador.'
      const delivery=matches[0]
      try{
        const patch=driverReceiptPatch(delivery,service,step,input,driverId)
        setLogisticsDeliveries(current=>current.map(d=>d.id===delivery.id?{...d,...patch}:d))
        if(step==='receipt'&&service.operationId)setQualityOperations(current=>current.map(o=>o.id===service.operationId?{...o,plantQuantity:patch.evaluation!.plantWeight,...(o.transport?{transport:{...o.transport,kgPlant:String(patch.evaluation!.plantWeight)}}:{})}:o))
      }catch(error){return error instanceof Error?error.message:'No se pudo guardar el paso.'}
    },
    advanceDriverDispatch: (transporterId,driverId,linkId,serviceId,next) => {
      const link=campaignTransporters.find(l=>l.id===linkId&&l.transporterId===transporterId)
      const service=link?.services.find(i=>i.id===serviceId&&i.driverId===driverId)
      if(!link||!service?.annotation)return 'Guarda primero los datos de carga.'
      if(!campaigns.some(c=>c.id===link.campaignId&&c.estado==='En Proceso'))return 'La campaña no está en proceso.'
      const current=dispatchStage(service)
      if(DISPATCH_STAGES[DISPATCH_STAGES.indexOf(current)+1]!==next)return 'Actualiza la vista: el estado de este despacho cambió.'
      const operation=qualityOperations.find(o=>o.id===service.operationId)
      if(next==='Salida'&&(operation?.qualityDecision==='Rechazada'||(operation?.route==='Exportación'&&operation.qualityDecision!=='Aprobada')))return 'El administrador debe aprobar primero la revisión de calidad de Exportación.'
      if(next==='Cierre'){
        const matches=logisticsDeliveries.filter(d=>d.campaignId===link.campaignId&&trackedServices({campaignTransporters,qualityOperations,requirements},d).some(m=>m.service.id===serviceId))
        if(matches.length!==1)return 'La carga debe tener una entrega única para cerrar.'
        const issue=driverChecklistIssue(matches[0],service);if(issue)return issue
      }
      const date=new Date().toISOString();const event={stage:next,date,driverId}
      const belongs=(d:LogisticsDelivery)=>d.campaignId===link.campaignId&&(d.transportServiceId===serviceId||(!d.transportServiceId&&trackedServices({campaignTransporters,qualityOperations,requirements},d).some(m=>m.service.id===serviceId)))
      setCampaignTransporters(current=>current.map(l=>l.id===linkId?{...l,services:l.services.map(i=>i.id===serviceId?{...i,driverDispatch:[...dispatchHistory(i).map(({stage,date,driverId,origin})=>({stage,date,driverId,origin})),event]}:i)}:l))
      if(next==='Salida'||next==='En camino')setLogisticsDeliveries(current=>current.map(d=>belongs(d)?{...d,transportServiceId:serviceId,sourceDelivery:service.sourceDelivery,logisticsStatus:'En ruta'}:d))
      if(operation?.transport)setQualityOperations(current=>current.map(o=>o.id===operation.id?{...o,transport:{...o.transport!,status:next==='Llegada'||next==='Cierre'?'llegada':'despachado'}}:o))
      if(next==='Llegada')setLogisticsDeliveries(current=>current.map(d=>belongs(d)?{...d,transportServiceId:serviceId,sourceDelivery:service.sourceDelivery,actualArrival:date,logisticsStatus:'En recepción'}:d))
    },
    saveCampaignTransportService: (linkId, service) => {
      if (!service.id && service.annotation && deliveryHasLoad(qualityOperations,campaignTransporters,service.sourceDelivery)) { notifyLoadConflict(); return }
      const link = campaignTransporters.find((item) => item.id === linkId)
      const company = transporters.find((item) => item.id === link?.transporterId)
      const draft = !!service.annotation && !service.logisticsCompleted
      if (!link || !company || !campaigns.some((item) => item.id === link.campaignId && item.estado === 'En Proceso') || !company.vehiculos.some((item) => item.id === service.vehicleId) || (!draft && !company.choferes.some((item) => item.id === service.driverId))) return
      if (service.operationId && !qualityOperations.some((item) => item.id === service.operationId && item.campaignId === link.campaignId)) return
      if (service.annotation && (!Number.isFinite(service.annotation.kilos) || service.annotation.kilos <= 0 || !service.annotation.packages.length || service.annotation.packages.some(p => !Number.isInteger(p.loaded) || !Number.isInteger(p.empty) || p.loaded < 0 || p.empty < 0))) return
      if (service.providerId && !draft) {
        const provider = providers.find(p => p.id === service.providerId)
        if (!campaignProviders.some(p => p.campaignId === link.campaignId && p.providerId === service.providerId && (p.rol === 'Productor' || qualityOperations.some(o => o.id === service.operationId && o.route === 'Industria'))) || !provider?.fincas?.some(f => f.id === service.fincaId)) return
        if (service.operationId && !qualityOperations.some(o => o.id === service.operationId && (o.providerId === service.providerId || (!o.providerId && (service.annotation?.providers?.some(p => p.providerId === service.providerId) ?? false)) || (o.route === 'Industria' && !!service.sourceDelivery && requirements.some(r => r.id === service.sourceDelivery!.requirementId && r.campaignId === o.campaignId && r.contratos.some(c => c.id === service.sourceDelivery!.contractId && c.entregas.some(d => d.id === service.sourceDelivery!.deliveryId && (d.providers?.some(p => p.providerId === service.providerId) || d.providerId === service.providerId)))))))) return
      }
      if (service.guides?.some(g => {
        const req = requirements.find(r => r.id === g.requirementId && r.campaignId === link.campaignId)
        const contract = req?.contratos.find(c => c.id === g.contractId)
        return !contract || (g.generatedAt && (!g.document || !g.reference)) || !Number.isFinite(g.kilos) || g.kilos <= 0 || (!!g.deliveryId && !contract.entregas.some(d => d.id === g.deliveryId))
      })) return
      if (service.guides?.some(g=>(g.details||g.providers)&&!!guideValidation({providers,campaignProviders,requirements,qualityOperations,campaignTransporters,campaigns,transporters},service as CampaignTransportService,g,service.guides||[]))) return
      const saved = { ...service, id: service.id || uid() }
      const annotatedLoads = [...campaignTransporters.flatMap(l => l.services).filter(i => i.id !== saved.id && i.operationId === saved.operationId && i.annotation), ...(saved.annotation ? [saved] : [])]
      const annotatedKilos = annotatedLoads.reduce((n, i) => n + (i.annotation?.kilos || 0), 0)
      if (saved.operationId) setQualityOperations((current) => current.map((operation) => {
        if (operation.id !== saved.operationId) return operation
        const doc = saved.documents
        const latest = saved.movements?.[saved.movements.length - 1]
        const status = latest?.stage === 'Llegada' ? 'llegada' : latest?.stage === 'Despachado' ? 'despachado' : latest?.stage === 'En recojo' ? 'en recojo' : 'planificado'
        return { ...operation, ...(saved.annotation ? { loadedQuantity: annotatedKilos, status: operation.route === 'Exportación' ? operation.status : saved.annotation.qualityResult === 'Cumple' || draft ? 'Carga registrada' : operation.status } : {}), transport: { id: saved.id, cxpId: operation.transport?.cxpId || campaignProviders.find((item) => item.campaignId === link.campaignId && item.providerId === operation.providerId)?.id || '', contract: operation.transport?.contract || '', kgPurchased: String(operation.acceptedQuantity || operation.harvestedQuantity || ''), kgPlant: String(operation.plantQuantity || ''), status, guide: doc?.guide || operation.transport?.guide || '', freight: doc?.freight || '', sctr: doc?.sctr || '', stevedoring: doc?.stevedoring || '', tickets: doc?.tickets || '', food: doc?.food || '', company: company.empresa, vehicle: saved.vehicleId, driver: saved.driverId } }
      }))
      setCampaignTransporters((current) => current.map((item) => item.id === linkId ? { ...item, services: item.services.some((existing) => existing.id === saved.id) ? item.services.map((existing) => existing.id === saved.id ? saved : existing) : [...item.services, saved] } : item))
    },
    addTransporter: (t) => setTransporters((s) => [{ ...t, id: uid(), vehiculos: [], choferes: [] }, ...s]),
    updateTransporter: (id, t) => setTransporters((s) => s.map((x) => x.id === id ? { ...x, ...t } : x)),
    addVehicle: (transporterId, v) =>
      setTransporters((s) => s.map((x) => (x.id === transporterId ? { ...x, vehiculos: [...x.vehiculos, { ...v, id: uid() }] } : x))),
    updateVehicle: (transporterId, vehicleId, v) =>
      setTransporters((s) => s.map((x) => x.id === transporterId ? { ...x, vehiculos: x.vehiculos.map((vehicle) => vehicle.id === vehicleId ? { ...vehicle, ...v } : vehicle) } : x)),
    addChofer: (transporterId, c) =>
      setTransporters((s) => s.map((x) => (x.id === transporterId ? { ...x, choferes: [...(x.choferes ?? []), { ...c, id: uid() }] } : x))),
    updateChofer: (transporterId, choferId, c) =>
      setTransporters((s) => s.map((x) => x.id === transporterId ? { ...x, choferes: x.choferes.map((driver) => driver.id === choferId ? { ...driver, ...c } : driver) } : x)),
    saveInvoice: (item) => {
      const record = { ...item, id: item.id || uid() }
      if(validateLiquidation({ campaigns, providers, exams, campaignProviders, interviews, certifications, requirements, qualityOperations, exportMtdRecords, logisticsDeliveries, clients, transporters, campaignTransporters, payments, invoices, settlements, financialMovements },record,'Cobro')) return false
      const requirement = requirements.find((r) => r.id === item.requirementId)
      const contract = requirement?.contratos.find((c) => c.id === item.contractId)
      if (!contract || paidTotal(financialMovements, 'Cobro', record.id) > 0 || invoices.some((i) => i.id !== record.id && i.number.toLowerCase() === record.number.toLowerCase()) || !Number.isFinite(invoiceTotal(record)) || invoiceTotal(record) <= 0) return false
      if (item.deliveryId && !logisticsDeliveries.some((d) => d.id === item.deliveryId && d.campaignId === requirement!.campaignId && d.clientId === requirement!.clientId)) return false
      const invoicedKg = invoices.filter((i) => i.id !== record.id && i.requirementId === item.requirementId && i.contractId === item.contractId).reduce((sum, i) => sum + i.kilos, 0)
      if (invoicedKg + item.kilos > contract.kilos) return false
      setInvoices((current) => item.id ? current.map((i) => i.id === item.id ? record : i) : [...current, record]); return true
    },
    saveSettlement: (item) => {
      const record = { ...item, id: item.id || uid() }
      if(validateLiquidation({ campaigns, providers, exams, campaignProviders, interviews, certifications, requirements, qualityOperations, exportMtdRecords, logisticsDeliveries, clients, transporters, campaignTransporters, payments, invoices, settlements, financialMovements },record,'Pago')) return false
      if (!(item.transportLinkId ? campaignTransporters.some(l => l.id === item.transportLinkId && l.paymentAgreement) : qualityOperations.some((o) => o.id === item.operationId)) || paidTotal(financialMovements, 'Pago', record.id) > 0 || settlements.some((i) => i.id !== record.id && (i.number.toLowerCase() === record.number.toLowerCase() || (record.transportLinkId ? i.transportLinkId === record.transportLinkId && (!record.transportServiceId || i.transportServiceId === record.transportServiceId) : !i.transportLinkId && i.operationId === record.operationId && i.transportServiceId === record.transportServiceId && i.providerId === record.providerId))) || !Number.isFinite(settlementTotal(record)) || settlementTotal(record) <= 0) return false
      setSettlements((current) => item.id ? current.map((i) => i.id === item.id ? record : i) : [...current, record]); return true
    },
    addFinancialMovement: (item) => {
      const target = item.kind === 'Cobro' ? invoices.find((i) => i.id === item.documentId) : settlements.find((i) => i.id === item.documentId)
      if(item.kind==='Pago'&&target&&'transportLinkId' in target&&target.transportLinkId&&!target.transportServiceId)return false
      if (!target || !Number.isFinite(item.amount) || item.amount <= 0 || money(item.amount) <= 0 || !item.date || !item.reference || !item.evidence) return false
      if(item.kind==='Cobro'&&invoiceCollectionIssue(target as Invoice,item.date))return false
      const total = item.kind === 'Cobro' ? invoiceTotal(target as Invoice) : settlementTotal(target as PurchaseSettlement)
      if (money(item.amount) > money(total - paidTotal(financialMovements, item.kind, target.id))) return false
      if (financialMovements.some((m) => m.kind === item.kind && m.documentId === item.documentId && m.reference.toLowerCase() === item.reference.toLowerCase())) return false
      setFinancialMovements((current) => [...current, { ...item, amount: money(item.amount), id: uid() }]); return true
    },
    addPayment: (p) => setPayments((s) => [{ ...p, id: uid() }, ...s]),
    updatePayment: (id, p) => setPayments((s) => s.map((x) => (x.id === id ? { ...x, ...p } : x))),
  }), [sharedActor, campaigns, providers, exams, campaignProviders, interviews, certifications, requirements, qualityOperations, exportMtdRecords, logisticsDeliveries, clients, transporters, campaignTransporters, payments, invoices, settlements, financialMovements, toasts])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore() {
  const s = useContext(Ctx)
  if (!s) throw new Error('useStore must be used within StoreProvider')
  return s
}
