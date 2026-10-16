import { Campaign, PlatformMetrics, CampaignDraft } from '../types/campaign';
import { SEEDED_CAMPAIGNS } from './campaignData';
import { SEEDED_DRAFTS } from './draftInitialData';

export const INITIAL_FALLBACK_CAMPAIGNS: Campaign[] = [...SEEDED_CAMPAIGNS];

export const FALLBACK_METRICS: PlatformMetrics = {
  totalRaised: 62450,
  totalReachFunded: 1687837,
  totalBackers: 2750,
  avgTrustScore: 92,
  activeCampaignsCount: 11,
  reachPerDollarRatio: 27.0,
  cpmBenchmark: 37.00,
};

export const SAMPLE_DRAFTS: CampaignDraft[] = [...SEEDED_DRAFTS];
