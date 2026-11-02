import type { CampaignTransportService } from './store'

export const DISPATCH_STAGES = ['En carga', 'Salida', 'En camino', 'Llegada', 'Cierre'] as const
export type DispatchStage = typeof DISPATCH_STAGES[number]
export type DispatchEvent = { stage: DispatchStage; date: string; driverId: string; origin?: 'chofer' | 'seguimiento' | 'carga' }
export type DispatchReport = DispatchEvent & { origin: 'chofer' | 'seguimiento' | 'carga' }

/** Both interfaces read the same events. Historical events keep their origin. */
export function dispatchHistory(service?: CampaignTransportService): DispatchReport[] {
  if (!service) return []
  if (service.driverDispatch?.length) return service.driverDispatch.map(e => ({...e, origin:e.origin||'chofer'}))
  const history: DispatchReport[] = []
  if (service.annotation?.registeredAt) history.push({stage:'En carga',date:service.annotation.registeredAt,driverId:service.driverId,origin:'carga'})
  for (const event of service.movements || []) {
    const stage: DispatchStage = event.stage === 'Llegada' ? 'Llegada' : event.stage === 'Despachado' ? 'En camino' : 'En carga'
    if (stage === 'En carga' && history.some(e => e.stage === stage)) continue
    history.push({stage,date:event.date,driverId:service.driverId,origin:'seguimiento'})
  }
  return history
}

export const dispatchReport = (service?: CampaignTransportService) => dispatchHistory(service).at(-1)
export const dispatchStage = (service?: CampaignTransportService): DispatchStage => dispatchReport(service)?.stage || 'En carga'
