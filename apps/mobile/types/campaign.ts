export type CampaignCategory =
  | 'Civic'
  | 'Environment'
  | 'Health'
  | 'Consumer'
  | 'Economic Policy'
  | 'Education'
  | 'Community';

export type CampaignStatus =
  | 'DRAFT'
  | 'UNDER_REVIEW'
  | 'ACTIVE'
  | 'FULLY_AMPLIFIED'
  | 'COMPLETED';

export interface CampaignCreator {
  id: string;
  name: string;
  avatarUrl: string;
  verified: boolean;
}

export interface Campaign {
  id: string;
  title: string;
  slug: string;
  tagLine: string;
  narrative: string;
  category: CampaignCategory | string;
  targetAmount: number;
  raisedAmount: number;
  backerCount: number;
  reachMultiplier: number;
  estimatedReach: number;
  deliveredReach: number;
  trustScore: number;
  trustCategory: string;
  status: CampaignStatus;
  targetAudience: string;
  adChannels: string[];
  imageUrl: string;
  daysLeft: number;
  creator: CampaignCreator;
  createdAt: string;
}

export interface PlatformMetrics {
  totalRaised: number;
  totalReachFunded: number;
  totalBackers: number;
  avgTrustScore: number;
  activeCampaignsCount: number;
  reachPerDollarRatio: number;
  cpmBenchmark: number;
}

export interface CampaignDraft {
  id: string;
  title: string;
  tagLine: string;
  narrative: string;
  category: string;
  targetAmount: number;
  targetAudience: string;
  adChannels: string[];
  savedAt: string;
  mode: 'manual' | 'voice';
}
