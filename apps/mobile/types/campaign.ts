export type CampaignCategory =
  | 'Environment'
  | 'Health'
  | 'Science'
  | 'Education'
  | 'Public Policy'
  | 'Economic Policy'
  | 'Community'
  | 'Arts & Culture'
  | 'Business'
  | 'Other';

export type CreatorType =
  | 'Non-Profit Organization'
  | 'Grassroots Coalition'
  | 'Academic Researcher'
  | 'Citizen Advocate'
  | 'Independent Journalist'
  | 'Community Leader'
  | 'Small Business Alliance';

export type CampaignStatus =
  | 'ACTIVE'
  | 'UNDER_REVIEW'
  | 'FULLY_AMPLIFIED'
  | 'COMPLETED';

export interface CampaignCreator {
  id: string;
  name: string;
  type: CreatorType | string;
  role: string;
  avatarUrl: string;
  location: string;
  isVerified: boolean;
}

export interface SupportingSource {
  id: string;
  title: string;
  publisher: string;
  publishDate: string;
  summary: string;
  url: string;
  isPeerReviewed?: boolean;
}

export interface StorySection {
  id: string;
  title: string;
  paragraphs: string[];
  statCallout?: {
    value: string;
    label: string;
    context: string;
  };
  quote?: {
    text: string;
    author: string;
    title: string;
  };
  inlineImage?: {
    url: string;
    caption: string;
    credit?: string;
  };
}

export interface TargetAudience {
  description: string;
  locations: string[];
  demographics: string;
  interests: string[];
}

export interface Campaign {
  id: string;
  slug: string;
  title: string;
  tagLine: string;
  summary: string;
  category: CampaignCategory;
  coverImage: string;
  coverImageCaption?: string;
  creator: CampaignCreator;
  targetAmount: number;
  raisedAmount: number;
  backerCount: number;
  daysLeft: number;
  durationDays: number;
  createdAt: string;
  status: CampaignStatus;
  targetAudience: TargetAudience;
  adChannels: string[];
  story: {
    overview: string;
    sections: StorySection[];
  };
  sources: SupportingSource[];
  isFeatured?: boolean;
  priorityScore?: number; // Deterministic demo ranking
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
