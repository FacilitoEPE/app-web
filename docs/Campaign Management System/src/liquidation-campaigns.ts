import type { Campaign } from './store'
import type { SharedData } from './shared-protocol'

/** The same eligibility rule for purchase and sales liquidation. */
export function liquidationCampaigns(s: Pick<SharedData, 'campaigns' | 'campaignTransporters'>): Campaign[] {
  const withLoads = new Set(s.campaignTransporters
    .filter(link => link.services.some((service: { annotation?: unknown }) => !!service.annotation))
    .map(link => link.campaignId))
  return s.campaigns.filter((campaign: Campaign) => campaign.estado === 'En Proceso' || withLoads.has(campaign.id))
}
