import { CampaignDraft } from '../types/draft';
import { CampaignCategory } from '../types/campaign';
import { createNewDraft } from './draftInitialData';

export interface AiVoiceDraftResult {
  title: string;
  summary: string;
  category: string;
  publicInterestObjective: string;
  problemStatement: string;
  campaignStory: string;
  proposedSolution: string;
  targetAudience: string;
  suggestedChannels: string[];
  adHeadline: string;
  adCopy: string;
  imagePrompt: string;
  suggestedBudgetUSD: number;
  estimatedReach: number;
  missingInformation: string[];
  isFallback?: boolean;
  modelUsed?: string;
  disclosure?: string;
}

const VALID_CATEGORIES: CampaignCategory[] = [
  'Environment',
  'Health',
  'Science',
  'Education',
  'Public Policy',
  'Economic Policy',
  'Community',
  'Arts & Culture',
];

export function normalizeCategory(categoryName: string): CampaignCategory {
  const match = VALID_CATEGORIES.find(
    c => c.toLowerCase() === categoryName.toLowerCase() ||
         categoryName.toLowerCase().includes(c.toLowerCase())
  );
  if (match) return match;
  if (categoryName.toLowerCase().includes('policy')) return 'Public Policy';
  if (categoryName.toLowerCase().includes('water') || categoryName.toLowerCase().includes('climate')) return 'Environment';
  if (categoryName.toLowerCase().includes('transit') || categoryName.toLowerCase().includes('road')) return 'Public Policy';
  return 'Public Policy';
}

/**
 * Maps the structured AI voice draft synthesis into the 5-step CampaignDraft data model
 */
export function buildCampaignDraftFromAiResult(
  aiResult: AiVoiceDraftResult,
  transcript: string
): CampaignDraft {
  const draft = createNewDraft('voice');
  const cat = normalizeCategory(aiResult.category);

  draft.title = aiResult.title.slice(0, 60);
  draft.category = cat;
  draft.summary = aiResult.summary;
  draft.whatIsItAbout = aiResult.problemStatement;
  draft.whoToReach = aiResult.targetAudience;
  draft.whyItMatters = aiResult.publicInterestObjective;
  draft.voiceTranscript = transcript;
  draft.aiGeneratedFields = [
    'title',
    'summary',
    'whatIsItAbout',
    'whoToReach',
    'whyItMatters',
    'storyHeadline',
    'storyIntro',
    'adHeadline',
    'adDescription',
    'targetLocations',
    'distributionChannels',
    'fundingGoal',
  ];

  if (aiResult.missingInformation && aiResult.missingInformation.length > 0) {
    draft.evidenceSummary = `Action required by creator: Verify and provide: ${aiResult.missingInformation.join('; ')}`;
  } else {
    draft.evidenceSummary = 'Synthesized from creator spoken brief. Verify citations in Step 2 before editorial submission.';
  }

  // Step 2: Story
  draft.storyHeadline = aiResult.title;
  draft.storyIntro = aiResult.summary;
  draft.storySections = [
    {
      id: `sec-problem-${Date.now()}`,
      title: 'Community Impact & Problem Context',
      body: aiResult.problemStatement,
    },
    {
      id: `sec-solution-${Date.now() + 1}`,
      title: 'Proposed Solution & Public Interest Advocacy',
      body: aiResult.proposedSolution,
    },
    {
      id: `sec-narrative-${Date.now() + 2}`,
      title: 'Why Amplification Matters',
      body: aiResult.campaignStory,
    },
  ];

  // Step 3: Visuals & Ad Creative
  draft.adHeadline = aiResult.adHeadline || aiResult.title.slice(0, 30);
  draft.adDescription = aiResult.adCopy || aiResult.summary.slice(0, 90);
  draft.ctaText = 'Amplify This Message';

  // Step 4: Reach
  draft.targetLocations = ['United States (National)'];
  draft.distributionChannels = Array.isArray(aiResult.suggestedChannels) && aiResult.suggestedChannels.length > 0
    ? aiResult.suggestedChannels
    : ['Meta (Facebook/Instagram)', 'Google Search Ads', 'Local Digital Displays'];

  // Step 5: Submit
  draft.fundingGoal = typeof aiResult.suggestedBudgetUSD === 'number' && aiResult.suggestedBudgetUSD > 0
    ? aiResult.suggestedBudgetUSD
    : 1500;

  return draft;
}

/**
 * Fallback parser for manual text input when offline or when external AI is unconfigured
 */
export function parseVoiceTranscriptToDraft(transcript: string, mode: 'voice' = 'voice'): CampaignDraft {
  const draft = createNewDraft(mode);
  draft.voiceTranscript = transcript;

  const sentences = transcript
    .split(/[.?!]/)
    .map(s => s.trim())
    .filter(Boolean);

  draft.title = (sentences[0] || 'Community Civic Amplification').slice(0, 60);
  draft.summary = (sentences[1] || sentences[0] || 'Community public-interest awareness message').slice(0, 180);
  draft.whatIsItAbout = transcript;
  draft.storyIntro = transcript;
  draft.storyHeadline = draft.title;
  draft.adHeadline = draft.title;
  draft.adDescription = draft.summary;

  const lower = transcript.toLowerCase();
  if (lower.includes('water') || lower.includes('health') || lower.includes('hospital') || lower.includes('doctor')) {
    draft.category = 'Health';
  } else if (lower.includes('trail') || lower.includes('park') || lower.includes('solar') || lower.includes('climate') || lower.includes('environment')) {
    draft.category = 'Environment';
  } else if (lower.includes('school') || lower.includes('student') || lower.includes('library')) {
    draft.category = 'Education';
  } else {
    draft.category = 'Public Policy';
  }

  return draft;
}
