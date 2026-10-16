import { Campaign, PlatformMetrics, CampaignDraft } from '../types/campaign';
import { SEEDED_CAMPAIGNS } from './campaignData';

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

export const SAMPLE_DRAFTS: CampaignDraft[] = [
  {
    id: 'draft-101',
    title: 'Protect Public Hiking Trails from Private Encroachment',
    tagLine: 'Targeted civic awareness ads around county zoning board meetings.',
    narrative: 'Private developers are attempting to close historic access rights to public ridgeline trailheads.',
    category: 'Environment',
    targetAmount: 3500,
    targetAudience: 'Active outdoor recreation enthusiasts in King County',
    adChannels: ['Meta Targeted Display', 'Local Gazette Network'],
    savedAt: '2 hours ago',
    mode: 'manual',
  },
  {
    id: 'draft-102',
    title: 'Transparency in Local School Library Advisory',
    tagLine: 'Community information ads regarding open review meetings.',
    narrative: 'Transcribed from voice memo: We need to mobilize parents to attend the open advisory forum.',
    category: 'Education',
    targetAmount: 2200,
    targetAudience: 'Parents within District 4',
    adChannels: ['Meta Targeted Display', 'Google Search Ads'],
    savedAt: 'Yesterday',
    mode: 'voice',
  },
];
