import type { SharedData } from './shared-protocol.js'
import type { PurchaseSettlement } from './finance-model.js'
import { money, paidTotal, settlementTotal } from './finance-model.js'

type CampaignData = Pick<SharedData, 'settlements' | 'campaignTransporters' | 'qualityOperations'>

export function campaignSettlements(s: CampaignData, campaignId: string): PurchaseSettlement[] {
  if (!campaignId) return []
  return s.settlements.filter((document: PurchaseSettlement) => {
    if (document.transportLinkId) {
      return s.campaignTransporters.find(link => link.id === document.transportLinkId)?.campaignId === campaignId
    }
    const operation = s.qualityOperations.find(item => item.id === document.operationId)
    if (operation) return operation.campaignId === campaignId
    return !!document.transportServiceId && s.campaignTransporters.some(link =>
      link.campaignId === campaignId && link.services.some((service: { id: string }) => service.id === document.transportServiceId))
  })
}

export function paidCampaignSettlements(s: CampaignData & Pick<SharedData, 'financialMovements'>, campaignId: string): PurchaseSettlement[] {
  return campaignSettlements(s, campaignId)
    .filter(document => {
      const total = settlementTotal(document)
      const paid = paidTotal(s.financialMovements, 'Pago', document.id)
      return total > 0 && paid > 0 && money(total - paid) <= 0
    })
    .sort((a, b) => b.date.localeCompare(a.date) || a.number.localeCompare(b.number))
}
