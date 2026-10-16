import { CampaignDraft } from '../types/draft';
import { CampaignCategory } from '../types/campaign';
import { createNewDraft } from './draftInitialData';

export interface VoiceSampleScenario {
  id: string;
  topic: string;
  transcript: string;
  extractedTitle: string;
  extractedCategory: CampaignCategory;
  extractedSummary: string;
  extractedAudience: string;
}

export const SAMPLE_VOICE_TRANSCRIPTS: VoiceSampleScenario[] = [
  {
    id: 'voice-water',
    topic: 'Independent Water Testing in Public Schools',
    transcript:
      'We need to fund independent third-party laboratory testing of drinking water fountains in our public schools. Municipal utilities keep flushing the lines before compliance testing, which masks dangerous lead spikes. We want to reach parents, teachers, and school board trustees across the metropolitan district to demand certified third-party chain of custody water sampling.',
    extractedTitle: 'Independent Lead Testing in Public School Fountains',
    extractedCategory: 'Health',
    extractedSummary: 'Fund certified third-party laboratory testing of drinking water fountains across public school facilities.',
    extractedAudience: 'Parents, teachers, and school board trustees in metropolitan water district 9',
  },
  {
    id: 'voice-trails',
    topic: 'Protect Public Hiking Easement',
    transcript:
      'A luxury housing developer is asking county commissioners to vacate the 98-year-old public trailhead easement at Mile Marker 14. If they close this gate, thousands of hikers and emergency volunteers lose access to the state ridgeline trails. We want to place targeted civic awareness ads alerting outdoor enthusiasts and local voters before the zoning board vote next month.',
    extractedTitle: 'Protect Public Ridgeline Trailhead Easement',
    extractedCategory: 'Environment',
    extractedSummary: 'Place targeted civic awareness ads to prevent the privatization of historic public trail access at Mile Marker 14.',
    extractedAudience: 'Active outdoor recreation enthusiasts, hikers, and voters residing within 40 miles',
  },
  {
    id: 'voice-hospital',
    topic: 'Hospital Billing Facility Fee Transparency',
    transcript:
      'Our community health clinic was acquired by a regional hospital monopoly, and now patients receiving a simple ten-minute checkup are receiving surprise facility fee bills of four hundred dollars on top of physician fees. We need an advertising campaign to inform low-income patients of their right to financial assistance and demand county oversight.',
    extractedTitle: 'Stop Surprise Hospital Facility Surcharges',
    extractedCategory: 'Health',
    extractedSummary: 'Expose hidden hospital billing surcharges on routine clinic visits and mobilize patients for billing transparency.',
    extractedAudience: 'Working families, uninsured patients, and municipal healthcare oversight committees',
  },
];

/**
 * Parses a freeform voice transcript into draft structured fields
 */
export function parseVoiceTranscriptToDraft(transcript: string, mode: 'voice' = 'voice'): CampaignDraft {
  const draft = createNewDraft(mode);

  // Check if matches sample scenario
  const scenario = SAMPLE_VOICE_TRANSCRIPTS.find(s =>
    transcript.toLowerCase().includes(s.topic.toLowerCase()) ||
    transcript.toLowerCase().includes(s.extractedTitle.toLowerCase().slice(0, 15))
  );

  if (scenario) {
    draft.title = scenario.extractedTitle;
    draft.category = scenario.extractedCategory;
    draft.summary = scenario.extractedSummary;
    draft.whatIsItAbout = transcript;
    draft.whoToReach = scenario.extractedAudience;
    draft.whyItMatters = 'Transcribed from creator voice memo. Critical community issue requiring amplified public scrutiny.';
    draft.storyIntro = transcript;
    draft.storyHeadline = scenario.extractedTitle;
    draft.adHeadline = scenario.extractedTitle;
    draft.adDescription = scenario.extractedSummary;
    return draft;
  }

  // Generic heuristic extraction
  const sentences = transcript
    .split(/[.?!]/)
    .map(s => s.trim())
    .filter(Boolean);

  draft.title = (sentences[0] || 'Community Amplification Initiative').slice(0, 60);
  draft.summary = (sentences[1] || sentences[0] || 'Community awareness message').slice(0, 180);
  draft.whatIsItAbout = transcript;
  draft.storyIntro = transcript;
  draft.adHeadline = draft.title;
  draft.adDescription = draft.summary;

  // Simple category detection
  const lower = transcript.toLowerCase();
  if (lower.includes('water') || lower.includes('health') || lower.includes('hospital') || lower.includes('doctor')) {
    draft.category = 'Health';
  } else if (lower.includes('trail') || lower.includes('park') || lower.includes('solar') || lower.includes('climate') || lower.includes('environment')) {
    draft.category = 'Environment';
  } else if (lower.includes('school') || lower.includes('student') || lower.includes('library')) {
    draft.category = 'Education';
  } else if (lower.includes('bus') || lower.includes('transit') || lower.includes('zoning') || lower.includes('vote')) {
    draft.category = 'Public Policy';
  }

  return draft;
}
