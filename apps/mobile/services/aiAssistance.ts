import { CampaignCategory } from '../types/campaign';

export interface AiDraftSuggestion {
  title: string;
  category: CampaignCategory;
  summary: string;
  whatIsItAbout: string;
  whoToReach: string;
  whyItMatters: string;
  evidenceSummary: string;
  targetLocations: string[];
  audienceInterests: string[];
}

const DEMO_SUGGESTIONS: AiDraftSuggestion[] = [
  {
    title: 'Audit Hospital Facility Fees in Low-Income Clinics',
    category: 'Health',
    summary: 'Expose hidden hospital billing surcharges on routine outpatient visits and push for state billing transparency laws.',
    whatIsItAbout: 'Regional hospital monopolies are classifying basic doctor visits at community clinics as "hospital outpatient services", adding $250-$800 surcharges to uninsured patient bills.',
    whoToReach: 'Working families, state healthcare oversight committees, and patients receiving surprise facility invoices.',
    whyItMatters: 'Surprise facility fees are the single fastest-growing cause of medical bankruptcy for middle-class households.',
    evidenceSummary: 'Healthcare Cost Institute 2025 Facility Surcharge Dataset and consumer complaints filed with State Attorney General.',
    targetLocations: ['United States (National)', 'California', 'Texas'],
    audienceInterests: ['Public Health', 'Consumer Protection', 'Civic Accountability'],
  },
  {
    title: 'Mandate Solar Canopies Over Municipal School Parking Lots',
    category: 'Environment',
    summary: 'Redirect district utility expenditures toward classroom education by installing community solar arrays.',
    whatIsItAbout: 'Public school districts spend an average of $3.2M annually on grid electricity while their blacktop parking lots sit unshaded in high-insolation zones.',
    whoToReach: 'School district voters, parents, teachers unions, and clean energy municipal task forces.',
    whyItMatters: 'Solar canopy shade protects students during transit, powers air conditioning, and saves millions that go back to teacher salaries.',
    evidenceSummary: 'National Renewable Energy Laboratory (NREL) K-12 Solar Feasibility Study and District 5 Capital Budget.',
    targetLocations: ['California', 'Arizona', 'Pacific Northwest'],
    audienceInterests: ['Environmental Policy', 'Education Access', 'Clean Energy'],
  },
  {
    title: 'Protect Rural County Bus Routes from Privatization Cuts',
    category: 'Public Policy',
    summary: 'Place civic awareness ads before county transit board votes to preserve lifeline routes for seniors and non-drivers.',
    whatIsItAbout: 'Private contracting proposals seek to eliminate 14 fixed-route rural transit connections between farming towns and regional medical centers.',
    whoToReach: 'Rural residents, seniors, disabled transit riders, and county commissioners.',
    whyItMatters: 'Public transit in rural areas is a lifeline for dialysis, prescription pickup, and essential grocery access.',
    evidenceSummary: 'State Rural Transit Mobility Census 2025 and County Board Agenda Item 14-C.',
    targetLocations: ['Midwest Agricultural Corridors', 'Pacific Northwest'],
    audienceInterests: ['Local Governance', 'Civic Accountability', 'Community Development'],
  },
  {
    title: 'Independent Testing of Agricultural Runoff in Watersheds',
    category: 'Science',
    summary: 'Fund accredited laboratory sampling of PFAS and nitrate levels in public drinking wells near industrial mega-dairies.',
    whatIsItAbout: 'Regulatory agency testing has been deferred due to budget shortfalls, leaving 40,000 rural residents unaware of tap water nitrate spikes.',
    whoToReach: 'Rural well owners, pediatricians, water board trustees, and agricultural neighbors.',
    whyItMatters: 'High nitrate concentrations in domestic tap water correlate with acute infant health risks and long-term toxicity.',
    evidenceSummary: 'Geological Survey Water Resources Investigation Report #26-081.',
    targetLocations: ['Midwest Agricultural Corridors', 'California'],
    audienceInterests: ['Science Literacy', 'Public Health', 'Environmental Policy'],
  },
];

/**
 * Generates an AI-assisted draft suggestion.
 * Uses realistic deterministic civic domain suggestions with prompt-matching when no API key is supplied.
 */
export async function generateAiDraftSuggestion(prompt?: string): Promise<{
  isDemo: boolean;
  suggestion: AiDraftSuggestion;
}> {
  // Simulate network latency for authentic feel
  await new Promise(res => setTimeout(res, 800));

  if (prompt && prompt.trim().length > 0) {
    const q = prompt.toLowerCase();
    const matched = DEMO_SUGGESTIONS.find(
      s =>
        s.title.toLowerCase().includes(q) ||
        s.summary.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        s.whatIsItAbout.toLowerCase().includes(q)
    );
    if (matched) {
      return { isDemo: true, suggestion: matched };
    }
  }

  // Pick random suggestion
  const randomIndex = Math.floor(Math.random() * DEMO_SUGGESTIONS.length);
  return {
    isDemo: true,
    suggestion: DEMO_SUGGESTIONS[randomIndex],
  };
}
