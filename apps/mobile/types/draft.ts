import { CampaignCategory } from './campaign';

export type DraftStep = 1 | 2 | 3 | 4 | 5;

export type CampaignLifecycleStatus =
  | 'draft'
  | 'submitted_for_review'
  | 'changes_requested'
  | 'approved'
  | 'available_for_funding'
  | 'promoting'
  | 'completed'
  | 'rejected'
  | 'cancelled';

export interface DraftStorySection {
  id: string;
  title: string;
  body: string;
  imageUrl?: string;
  imageCaption?: string;
  imageCredit?: string;
}

export interface DraftSource {
  id: string;
  title: string;
  publisher?: string;
  url: string;
  relevance: string;
}

export interface DraftStatistic {
  id: string;
  number: string;
  label: string;
  context: string;
}

export interface DraftAdAsset {
  id: string;
  uri: string;
  width?: number;
  height?: number;
  fileName?: string;
}

export interface CampaignDraft {
  id: string;
  createdAt: string;
  updatedAt: string;
  currentStep: DraftStep;
  status: CampaignLifecycleStatus;
  mode: 'manual' | 'voice';

  // Step 1: Basics
  title: string; // Required, max 60 chars
  category: CampaignCategory; // Required
  creatorName: string; // Required
  summary: string; // Concise summary
  whatIsItAbout: string; // Campaign subject
  whoToReach: string; // Target audience description
  whyItMatters: string; // Importance rationale
  evidenceSummary: string; // Supporting evidence summary
  coverImage?: string; // Cover image URL or local asset

  // Step 2: Story
  storyHeadline: string;
  storyIntro: string;
  storySections: DraftStorySection[];
  sources: DraftSource[];
  statistics: DraftStatistic[];
  suggestedActions: string[];

  // Step 3: Campaign & Ad Visuals
  adHeadline: string; // Defaults to title if blank
  adDescription: string; // Defaults to summary if blank
  ctaText: string; // Selected CTA
  adVisualAssets: DraftAdAsset[];

  // Step 4: Reach
  targetLocations: string[];
  audienceInterests: string[];
  distributionChannels: string[];
  durationDays: number;

  // Step 5: Submit
  fundingGoal: number; // Stored funding goal in USD
  policyAcknowledged: boolean;

  // Submission metadata
  submissionTimestamp?: string;
  reviewNotes?: string;
}

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error';
