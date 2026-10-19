import { UserRole, CampaignStatus, ContributionStatus, ReportStatus } from '@prisma/client';

export interface SeedCampaign {
  id: string;
  slug: string;
  title: string;
  tagLine: string;
  summary: string;
  narrative: string;
  category: string;
  targetAmount: number; // Integer minor units (e.g. 500000 = $5,000)
  raisedAmount: number; // Integer minor units
  backerCount: number;
  reachMultiplier: number;
  estimatedReach: number;
  deliveredReach: number;
  trustScore: number;
  trustCategory: string;
  status: CampaignStatus;
  targetAudience: string;
  targetLocations: string[];
  audienceInterests: string[];
  distributionChannels: string[];
  imageUrl: string;
  adHeadline: string;
  adDescription: string;
  ctaText: string;
  creatorId?: string;
  creatorName: string;
  creatorType: string;
  daysLeft: number;
  durationDays: number;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  submissionTimestamp?: string | Date | null;
  approvalTimestamp?: string | Date | null;
  distributionTimestamp?: string | Date | null;
  storySections: Array<{
    heading: string;
    content: string;
    position: number;
    imageUrl?: string;
    imageCaption?: string;
    imageCredit?: string;
  }>;
  sources: Array<{
    title: string;
    publisher?: string;
    url: string;
    relevance: string;
    position: number;
  }>;
  contributions: Array<{
    amount: number;
    backerName: string;
    backerEmail?: string;
    supportNote?: string;
  }>;
  activities: Array<{
    eventType: string;
    metadata: any;
    createdAt: string;
  }>;
  report?: {
    advertisingBudgetAllocated: number;
    advertisingSpend: number;
    impressions: number;
    clicks: number;
    estimatedReach: number;
    measuredReach?: number;
    reportingStatus: ReportStatus;
  };
}

export interface SeedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string | null;
  bio?: string | null;
  passwordHash?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}
export const SEED_USERS: SeedUser[] = [
  {
    id: 'usr-admin-1',
    email: 'admin@amplification.platform',
    name: 'Platform Administrator',
    role: UserRole.ADMIN,
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80',
    passwordHash: '$2b$10$5kHKk9rdz4BAP4/5fv05OeN0DjwPsMqLnlzZlxi5LANUcfCRYdXvu', // Password123!
  },
  {
    id: 'usr-creator-1',
    email: 'creator@amplification.platform',
    name: 'Elena Vance (Creator)',
    role: UserRole.CREATOR,
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    passwordHash: '$2b$10$5kHKk9rdz4BAP4/5fv05OeN0DjwPsMqLnlzZlxi5LANUcfCRYdXvu', // Password123!
  },
];


export const SEED_CAMPAIGNS: SeedCampaign[] = [
  {
    id: 'camp-1',
    slug: 'expose-junk-fees-healthcare',
    title: 'Expose Hidden Junk Fees in Healthcare Billing',
    tagLine: 'Targeted digital awareness ads educating patients on their rights under the No Surprises Act.',
    summary: 'Millions of patients pay unwarranted outpatient facility surcharges. Our community ad buy places legal rights alerts directly in front of patients facing contested medical invoices.',
    narrative: 'When regional hospital monopolies acquire neighborhood clinics, they quietly reclassify routine doctor checkups as hospital outpatient services. By funding targeted digital search ads and geo-fenced display campaigns around regional medical centers, we directly alert patients contesting unfair bills.',
    category: 'Health',
    targetAmount: 850000, // $8,500.00
    raisedAmount: 642000, // $6,420.00
    backerCount: 238,
    reachMultiplier: 27.2,
    estimatedReach: 231200,
    deliveredReach: 174624,
    trustScore: 96,
    trustCategory: 'Universal Trust Gold',
    status: CampaignStatus.AVAILABLE_FOR_FUNDING,
    targetAudience: 'Patients and families in regions with documented hospital facility fee surcharges',
    targetLocations: ['California', 'Texas', 'Pacific Northwest'],
    audienceInterests: ['Public Health', 'Consumer Protection', 'Civic Accountability'],
    distributionChannels: ['Meta Targeted Newsfeeds', 'Google Search & Display Ads', 'Local Gazette Network'],
    imageUrl: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=1200&q=80',
    adHeadline: 'Contesting a Surprise Hospital Bill?',
    adDescription: 'Federal law limits facility fee surcharges on routine clinic visits. Know your rights under the No Surprises Act.',
    ctaText: 'Learn The Facts',
    creatorName: 'Fair Care Healthcare Alliance',
    creatorType: 'Non-Profit Organization',
    daysLeft: 12,
    durationDays: 30,
    storySections: [
      {
        heading: 'The Quiet Reclassification of Clinic Care',
        content: 'When regional hospital monopolies acquire neighborhood clinics, patients receiving a simple 15-minute consultation suddenly face two bills: one for the physician, and another $450 "hospital facility charge" for simply sitting in the examination room.',
        position: 1,
        imageUrl: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&q=80',
        imageCaption: 'Regional clinics acquired by health conglomerates between 2021 and 2025.',
        imageCredit: 'Healthcare Cost Institute',
      },
      {
        heading: 'What Community Amplification Solves',
        content: 'Billboard and social feed awareness alerts target patients within a 5-mile radius of high-surcharge facilities. When patients invoke dispute resolution within 30 days of receiving bills, 71% of arbitrary facility charges are waived.',
        position: 2,
      },
    ],
    sources: [
      {
        title: 'HHS Advisory Bulletin on Hospital Facility Surcharges',
        publisher: 'U.S. Department of Health and Human Services',
        url: 'https://hhs.gov/guidance/facility-fees',
        relevance: 'Confirms patients rights to dispute fees under consumer protections.',
        position: 1,
      },
      {
        title: 'National Outpatient Surcharge Frequency Audit 2025',
        publisher: 'Healthcare Financial Transparency Initiative',
        url: 'https://hfti.org/reports/2025-audit',
        relevance: 'Shows facility fees increased 312% post-acquisition.',
        position: 2,
      },
    ],
    contributions: [
      { amount: 5000, backerName: 'Marcus Vance', supportNote: 'Patients deserve billing transparency!' },
      { amount: 15000, backerName: 'Civic Health Backer', supportNote: 'Keep up this vital amplification.' },
      { amount: 2500, backerName: 'Anonymous Advocate' },
    ],
    activities: [
      {
        eventType: 'CAMPAIGN_APPROVED',
        metadata: { reviewer: 'Sarah Chen', trustScore: 96 },
        createdAt: '2026-10-10T09:00:00.000Z',
      },
      {
        eventType: 'MILESTONE_REACHED',
        metadata: { milestone: '75% funded', totalBackers: 238 },
        createdAt: '2026-10-14T16:30:00.000Z',
      },
    ],
    report: {
      advertisingBudgetAllocated: 807500, // 95% of target
      advertisingSpend: 609900,
      impressions: 174624,
      clicks: 4210,
      estimatedReach: 231200,
      measuredReach: 129350,
      reportingStatus: ReportStatus.IN_PROGRESS,
    },
  },
  {
    id: 'camp-2',
    slug: 'protect-ridgeline-trailhead-easement',
    title: 'Protect Public Ridgeline Trails from Private Encroachment',
    tagLine: 'Targeted civic awareness ads alerting outdoor enthusiasts before county zoning hearings.',
    summary: 'Private estate developers are attempting to vacate a century-old trailhead easement. We pool community ad funds to notify outdoor recreation voters before the final zoning board vote.',
    narrative: 'Mile Marker 14 is the primary public footway to 40 miles of backcountry ridges. Quiet title vacation hearings take place with minimal advance notice. Targeted ads mobilize public comment.',
    category: 'Environment',
    targetAmount: 420000, // $4,200.00
    raisedAmount: 385000, // $3,850.00
    backerCount: 164,
    reachMultiplier: 27.0,
    estimatedReach: 113400,
    deliveredReach: 103950,
    trustScore: 94,
    trustCategory: 'Universal Trust Gold',
    status: CampaignStatus.AVAILABLE_FOR_FUNDING,
    targetAudience: 'Active outdoor recreation enthusiasts, hikers, and rural property owners in King County',
    targetLocations: ['Washington State', 'Pacific Northwest'],
    audienceInterests: ['Environmental Policy', 'Civic Accountability', 'Local Governance'],
    distributionChannels: ['Meta Targeted Newsfeeds', 'Google Search & Display Ads'],
    imageUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&q=80',
    adHeadline: 'Save Mile Marker 14 Public Trail Access',
    adDescription: 'County commissioners vote on privatizing historic trail access next week. See the public deed records and register your testimony.',
    ctaText: 'Amplify This Message',
    creatorId: 'usr-creator-1',
    creatorName: 'Cascadia Trail Coalition',
    creatorType: 'Grassroots Coalition',
    daysLeft: 6,
    durationDays: 30,
    storySections: [
      {
        heading: 'A 98-Year Public Right-of-Way',
        content: 'In 1928, logging operator Thomas Vance deeded perpetual public right-of-way to the county. Luxury estate owners have petitioned the county for vacation citing road maintenance costs.',
        position: 1,
        imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&q=80',
        imageCaption: 'The public easement currently used by 35,000 visitors annually.',
        imageCredit: 'Pacific Northwest Trail Library',
      },
    ],
    sources: [
      {
        title: 'King County Auditor Deed Registry #1928-0914-V',
        publisher: 'King County Records Department',
        url: 'https://kingcounty.gov/records/archives/deeds',
        relevance: 'Primary deed proving perpetual public pedestrian easement.',
        position: 1,
      },
    ],
    contributions: [
      { amount: 10000, backerName: 'Northwest Hiker' },
      { amount: 5000, backerName: 'Trail Preservation Fund' },
    ],
    activities: [
      {
        eventType: 'CAMPAIGN_APPROVED',
        metadata: { reviewer: 'Sarah Chen' },
        createdAt: '2026-10-12T11:00:00.000Z',
      },
    ],
  },
  {
    id: 'camp-3',
    slug: 'independent-school-drinking-water-testing',
    title: 'Independent Testing of Municipal Drinking Water Leads',
    tagLine: 'Fund certified third-party chain-of-custody laboratory testing in 24 elementary schools.',
    summary: 'Municipal self-testing protocols flushed fixtures for 20 minutes before taking samples, diluting stagnant lead concentrations. We fund certified independent chain-of-custody water audits.',
    narrative: 'Lead exposure causes permanent cognitive impairment. When municipal utilities self-report, pre-stagnation flushing conceals toxic concentrations. We fund independent certified testing and broadcast findings.',
    category: 'Science',
    targetAmount: 580000, // $5,800.00
    raisedAmount: 580000, // $5,800.00 (Goal Reached)
    backerCount: 295,
    reachMultiplier: 27.0,
    estimatedReach: 156600,
    deliveredReach: 156600,
    trustScore: 98,
    trustCategory: 'Universal Trust Gold',
    status: CampaignStatus.FUNDING_GOAL_REACHED,
    targetAudience: 'Parents, teachers, pediatricians, and trustees in municipal water district 9',
    targetLocations: ['California', 'Metropolitan Districts'],
    audienceInterests: ['Public Health', 'Education Access', 'Science Literacy'],
    distributionChannels: ['Meta Targeted Newsfeeds', 'Civic Journalism Ad Network'],
    imageUrl: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=1200&q=80',
    adHeadline: 'Certified Water Safety for School Fountains',
    adDescription: 'Help fund certified third-party water testing across District 9 elementary facilities.',
    ctaText: 'Demand Public Action',
    creatorName: 'Clean Water Watch',
    creatorType: 'Academic Researcher',
    daysLeft: 0,
    durationDays: 45,
    storySections: [
      {
        heading: 'Why Line Flushing Conceals Reality',
        content: 'EPA rules state tests must capture water that sat undisturbed in fixtures overnight. Municipal utility staff routinely pre-flushed water mains, invalidating regulatory safety assumptions.',
        position: 1,
      },
    ],
    sources: [
      {
        title: 'EPA Lead and Copper Rule Implementation Guidance',
        publisher: 'U.S. EPA',
        url: 'https://epa.gov/ground-water-and-drinking-water/lead-and-copper-rule',
        relevance: 'Prohibits pre-stagnation flushing prior to compliance testing.',
        position: 1,
      },
    ],
    contributions: [
      { amount: 20000, backerName: 'District 9 Parent Alliance' },
      { amount: 10000, backerName: 'Pediatric Care Group' },
    ],
    activities: [
      {
        eventType: 'FUNDING_GOAL_REACHED',
        metadata: { totalRaised: 580000, totalBackers: 295 },
        createdAt: '2026-10-15T18:00:00.000Z',
      },
    ],
  },
  {
    id: 'camp-4',
    slug: 'mandate-school-parking-solar-canopies',
    title: 'Mandate Solar Canopies Over Municipal School Parking Lots',
    tagLine: 'Redirect district utility expenditures toward classroom education through community solar.',
    summary: 'Public school districts spend $3.2M annually on grid electricity while their blacktop parking lots sit unshaded in high-insolation zones. Fund public awareness before school board ballot measures.',
    narrative: 'Installing solar shade structures protects students during pickup, powers classroom ventilation, and returns $2.1M annually directly into teacher salaries.',
    category: 'Education',
    targetAmount: 620000, // $6,200.00
    raisedAmount: 310000, // $3,100.00
    backerCount: 142,
    reachMultiplier: 27.0,
    estimatedReach: 167400,
    deliveredReach: 83700,
    trustScore: 91,
    trustCategory: 'Universal Trust Gold',
    status: CampaignStatus.AVAILABLE_FOR_FUNDING,
    targetAudience: 'School district voters, parents, teachers unions, and clean energy task forces',
    targetLocations: ['California', 'Arizona', 'Pacific Northwest'],
    audienceInterests: ['Education Access', 'Clean Energy', 'Environmental Policy'],
    distributionChannels: ['Meta Targeted Newsfeeds', 'Google Search & Display Ads'],
    imageUrl: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=1200&q=80',
    adHeadline: 'Solar Shade Over School Parking',
    adDescription: 'Save $2.1M annually in utility costs to invest directly in classroom teachers.',
    ctaText: 'Support Distribution',
    creatorName: 'Clean Schools Coalition',
    creatorType: 'Community Leader',
    daysLeft: 18,
    durationDays: 30,
    storySections: [
      {
        heading: 'Wasted Insolation in Suburban School Districts',
        content: 'Analysis of district satellite imagery shows over 40 acres of unshaded asphalt absorbing heat and accelerating asphalt degradation while utility power bills escalate.',
        position: 1,
      },
    ],
    sources: [
      {
        title: 'NREL K-12 School Solar Feasibility Assessment',
        publisher: 'National Renewable Energy Laboratory',
        url: 'https://nrel.gov/solar/k12-schools',
        relevance: 'Demonstrates average 8-year ROI for district solar shade structures.',
        position: 1,
      },
    ],
    contributions: [
      { amount: 5000, backerName: 'Solar Advocate' },
    ],
    activities: [],
  },
  {
    id: 'camp-5',
    slug: 'preserve-rural-county-bus-routes',
    title: 'Protect Rural County Bus Routes from Privatization Cuts',
    tagLine: 'Place civic awareness ads before transit board votes to preserve lifeline routes for seniors.',
    summary: 'Private contracting proposals seek to eliminate 14 fixed-route rural transit connections between farming towns and regional medical centers.',
    narrative: 'For non-driving seniors and disabled rural residents, fixed-route buses are the only reliable transportation for chemotherapy, kidney dialysis, and weekly grocery access.',
    category: 'Public Policy',
    targetAmount: 480000, // $4,800.00
    raisedAmount: 480000, // $4,800.00
    backerCount: 198,
    reachMultiplier: 27.0,
    estimatedReach: 129600,
    deliveredReach: 129600,
    trustScore: 93,
    trustCategory: 'Universal Trust Gold',
    status: CampaignStatus.PROMOTING,
    targetAudience: 'Rural residents, seniors, disabled transit riders, and county commissioners',
    targetLocations: ['Midwest Agricultural Corridors', 'Pacific Northwest'],
    audienceInterests: ['Local Governance', 'Civic Accountability', 'Community Development'],
    distributionChannels: ['Civic Journalism Ad Network', 'Local News Outlets'],
    imageUrl: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=1200&q=80',
    adHeadline: 'Rural Bus Routes are Lifelines',
    adDescription: 'County commissioners are voting on 14 route cuts. See the medical transit census data.',
    ctaText: 'Amplify This Message',
    creatorId: 'usr-creator-1',
    creatorName: 'Rural Transit Access Alliance',
    creatorType: 'Citizen Advocate',
    daysLeft: 4,
    durationDays: 30,
    storySections: [
      {
        heading: 'The True Human Cost of Transit Desertification',
        content: 'Surveying 400 rural riders found 82% use the bus for essential medical treatments that cannot be postponed without acute health degradation.',
        position: 1,
      },
    ],
    sources: [
      {
        title: 'State Rural Mobility Census 2025',
        publisher: 'Department of Transportation',
        url: 'https://dot.gov/rural-transit-census',
        relevance: 'Shows rural transit ridership grew 14% over past 2 years.',
        position: 1,
      },
    ],
    contributions: [
      { amount: 15000, backerName: 'Senior Advocates' },
    ],
    activities: [
      {
        eventType: 'PROMOTION_STARTED',
        metadata: { channels: ['Civic Journalism Ad Network', 'Local News Outlets'] },
        createdAt: '2026-10-14T08:00:00.000Z',
      },
    ],
    report: {
      advertisingBudgetAllocated: 456000,
      advertisingSpend: 412000,
      impressions: 111300,
      clicks: 2950,
      estimatedReach: 129600,
      measuredReach: 86400,
      reportingStatus: ReportStatus.IN_PROGRESS,
    },
  },
  {
    id: 'camp-6',
    slug: 'independent-groundwater-nitrate-testing',
    title: 'Independent Testing of Agricultural Runoff in Watersheds',
    tagLine: 'Fund accredited sampling of PFAS and nitrate levels in public drinking wells near mega-dairies.',
    summary: 'Budget shortfalls delayed regulatory testing, leaving 40,000 rural residents unaware of tap water nitrate spikes.',
    narrative: 'High nitrate concentrations in domestic tap water correlate with acute infant health risks and long-term endocrine disruption. Independent certified sampling restores public accountability.',
    category: 'Science',
    targetAmount: 750000, // $7,500.00
    raisedAmount: 520000, // $5,200.00
    backerCount: 215,
    reachMultiplier: 27.0,
    estimatedReach: 202500,
    deliveredReach: 140400,
    trustScore: 95,
    trustCategory: 'Universal Trust Gold',
    status: CampaignStatus.AVAILABLE_FOR_FUNDING,
    targetAudience: 'Rural well owners, pediatricians, water board trustees, and agricultural neighbors',
    targetLocations: ['Midwest Agricultural Corridors', 'California'],
    audienceInterests: ['Science Literacy', 'Public Health', 'Environmental Policy'],
    distributionChannels: ['Meta Targeted Newsfeeds', 'Google Search & Display Ads'],
    imageUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=80',
    adHeadline: 'Safe Well Water Testing in Valley Watersheds',
    adDescription: 'Help fund certified third-party testing for rural domestic wells.',
    ctaText: 'Learn The Facts',
    creatorName: 'Watershed Defense Fund',
    creatorType: 'Independent Journalist',
    daysLeft: 21,
    durationDays: 45,
    storySections: [
      {
        heading: 'The Regulatory Gap in Rural Well Safety',
        content: 'Private domestic wells are exempt from federal Safe Drinking Water Act testing, leaving low-income families reliant on voluntary testing.',
        position: 1,
      },
    ],
    sources: [
      {
        title: 'Geological Survey Water Resources Investigation Report #26-081',
        publisher: 'U.S. Geological Survey',
        url: 'https://usgs.gov/water-resources/valley-nitrates',
        relevance: 'Shows groundwater nitrate migration in alluvial aquifers.',
        position: 1,
      },
    ],
    contributions: [
      { amount: 10000, backerName: 'Groundwater Coalition' },
    ],
    activities: [],
  },
  {
    id: 'camp-7',
    slug: 'preserve-historic-brick-district-facades',
    title: 'Historic Preservation of Downtown Arts District Facades',
    tagLine: 'Public awareness ads prompting city council review of architectural demolition waivers.',
    summary: 'Demolition waivers granted without historic board review threaten century-old terra cotta facades in the cultural center.',
    narrative: 'Once lost, hand-carved terra cotta masonry can never be replicated. Targeted cultural ads rally support for adaptive reuse incentives.',
    category: 'Arts & Culture',
    targetAmount: 320000, // $3,200.00
    raisedAmount: 290000, // $2,900.00
    backerCount: 130,
    reachMultiplier: 27.0,
    estimatedReach: 86400,
    deliveredReach: 78300,
    trustScore: 92,
    trustCategory: 'Universal Trust Gold',
    status: CampaignStatus.AVAILABLE_FOR_FUNDING,
    targetAudience: 'Architects, historians, downtown residents, and small business owners',
    targetLocations: ['Midwest Agricultural Corridors', 'New York Tri-State'],
    audienceInterests: ['Arts & Culture', 'Local Governance', 'Community Development'],
    distributionChannels: ['Meta Targeted Newsfeeds', 'Local Gazette Network'],
    imageUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1200&q=80',
    adHeadline: 'Preserve Downtown Arts District Heritage',
    adDescription: 'Sign the petition urging adaptive reuse over demolition for 4th Street terra cotta buildings.',
    ctaText: 'Demand Public Action',
    creatorName: 'Architectural Heritage Alliance',
    creatorType: 'Non-Profit Organization',
    daysLeft: 14,
    durationDays: 30,
    storySections: [
      {
        heading: 'Adaptive Reuse vs. Surface Parking Lots',
        content: 'Developers propose replacing historic warehouse spaces with a surface parking deck. Comparable cities proved creative reuse generates 4x the municipal tax revenue.',
        position: 1,
      },
    ],
    sources: [
      {
        title: 'Municipal Historic Landmarks Commission Registry',
        publisher: 'City Planning Department',
        url: 'https://cityplanning.gov/landmarks/4th-street',
        relevance: 'Confirms historic significance designation from 1984.',
        position: 1,
      },
    ],
    contributions: [],
    activities: [],
  },
  {
    id: 'camp-8',
    slug: 'commercial-rent-stabilization-small-business',
    title: 'Commercial Rent Transparency for Neighborhood Small Businesses',
    tagLine: 'Targeted economic briefings on predatory rent renegotiation in commercial corridors.',
    summary: 'Independent grocers and neighborhood merchants face sudden 200% lease hikes from absentee hedge funds.',
    narrative: 'Commercial corridors thrive on stable independent retail. We amplify economic policy solutions that protect neighborhood merchants.',
    category: 'Economic Policy',
    targetAmount: 550000, // $5,500.00
    raisedAmount: 380000, // $3,800.00
    backerCount: 168,
    reachMultiplier: 27.0,
    estimatedReach: 148500,
    deliveredReach: 102600,
    trustScore: 90,
    trustCategory: 'Universal Trust Gold',
    status: CampaignStatus.AVAILABLE_FOR_FUNDING,
    targetAudience: 'Small business owners, local shoppers, and municipal economic development staff',
    targetLocations: ['New York Tri-State', 'California'],
    audienceInterests: ['Economic Policy', 'Consumer Protection', 'Community Development'],
    distributionChannels: ['Google Search & Display Ads', 'Meta Targeted Newsfeeds'],
    imageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&q=80',
    adHeadline: 'Save Neighborhood Main Street Shops',
    adDescription: 'Read the independent retail economic impact study and support commercial stabilization.',
    ctaText: 'Amplify This Message',
    creatorName: 'Main Street Merchants Coalition',
    creatorType: 'Small Business Alliance',
    daysLeft: 25,
    durationDays: 45,
    storySections: [
      {
        heading: 'The Financialization of Neighborhood Retail',
        content: 'When institutional investors acquire retail strips, they demand exorbitant lease rates that only national corporate chains can sustain, hollowing out community identity.',
        position: 1,
      },
    ],
    sources: [
      {
        title: 'Small Business Commercial Lease Burden Analysis',
        publisher: 'Institute for Local Self-Reliance',
        url: 'https://ilsr.org/commercial-rent-burden-2025',
        relevance: 'Documents independent business displacement trends.',
        position: 1,
      },
    ],
    contributions: [],
    activities: [],
  },
  {
    id: 'camp-9',
    slug: 'independent-community-journalism-endowment',
    title: 'Community Fund for Investigative Public Records Inquiries',
    tagLine: 'Subsidize state public records legal challenges for non-profit civic reporters.',
    summary: 'Public records compliance is increasingly denied by agencies relying on expensive court appeals. Community funds pay filing fees for transparency lawsuits.',
    narrative: 'When local newspapers closed, county contract oversight plummeted. We pool funds to file FOIA/public records petitions that expose municipal waste.',
    category: 'Community',
    targetAmount: 400000, // $4,000.00
    raisedAmount: 400000, // $4,000.00 (Completed)
    backerCount: 310,
    reachMultiplier: 27.0,
    estimatedReach: 108000,
    deliveredReach: 108000,
    trustScore: 97,
    trustCategory: 'Universal Trust Gold',
    status: CampaignStatus.COMPLETED,
    targetAudience: 'Civic advocates, investigative reporters, and government accountability watchdogs',
    targetLocations: ['United States (National)'],
    audienceInterests: ['Civic Accountability', 'Independent Journalism', 'Public Policy'],
    distributionChannels: ['Civic Journalism Ad Network', 'Google Search & Display Ads'],
    imageUrl: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1200&q=80',
    adHeadline: 'Protect Public Records Access',
    adDescription: 'Community legal fund successfully released 1,200 pages of public utility contracting audits.',
    ctaText: 'Read The Full Story',
    creatorId: 'usr-creator-1',
    creatorName: 'Open Records Foundation',
    creatorType: 'Independent Journalist',
    daysLeft: 0,
    durationDays: 30,
    storySections: [
      {
        heading: 'Transparency by the Public, for the Public',
        content: 'Thanks to 310 community contributors, our legal petition unlocked internal audit reports revealing $4.2M in unauthorized water utility contractor bonuses.',
        position: 1,
      },
    ],
    sources: [
      {
        title: 'State Superior Court Order on Public Records Docket #2026-FOIA-91',
        publisher: 'State Judiciary Records',
        url: 'https://courts.state.gov/dockets/2026-foia-91',
        relevance: 'Judicial ruling ordering full disclosure of withheld public documents.',
        position: 1,
      },
    ],
    contributions: [],
    activities: [
      {
        eventType: 'CAMPAIGN_COMPLETED',
        metadata: { outcome: 'Records released to public' },
        createdAt: '2026-10-10T12:00:00.000Z',
      },
    ],
    report: {
      advertisingBudgetAllocated: 380000,
      advertisingSpend: 380000,
      impressions: 108000,
      clicks: 5120,
      estimatedReach: 108000,
      measuredReach: 74200,
      reportingStatus: ReportStatus.FINAL,
    },
  },
  {
    id: 'camp-10',
    slug: 'rural-broadband-cooperative-advocacy',
    title: 'High-Speed Fiber Cooperative for Underserved Rural Valleys',
    tagLine: 'Targeted civic education ads promoting rural electric cooperative broadband expansion.',
    summary: 'Commercial telecom providers took $18M in state subsidies but left 6,000 mountain households with dial-up speeds. We rally rural members to vote for cooperative fiber buildout.',
    narrative: 'Electric cooperatives brought power to rural America in the 1930s. Today, cooperative member-owners can vote to string fiber along the same poles.',
    category: 'Business',
    targetAmount: 500000, // $5,000.00
    raisedAmount: 260000, // $2,600.00
    backerCount: 112,
    reachMultiplier: 27.0,
    estimatedReach: 135000,
    deliveredReach: 70200,
    trustScore: 92,
    trustCategory: 'Universal Trust Gold',
    status: CampaignStatus.AVAILABLE_FOR_FUNDING,
    targetAudience: 'Cooperative electric members, rural students, telehealth patients, and small farms',
    targetLocations: ['Pacific Northwest', 'Midwest Agricultural Corridors'],
    audienceInterests: ['Community Development', 'Education Access', 'Science Literacy'],
    distributionChannels: ['Meta Targeted Newsfeeds', 'Local Gazette Network'],
    imageUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=1200&q=80',
    adHeadline: 'Fast Reliable Internet for Our Co-op',
    adDescription: 'Learn how our electric cooperative can deliver 1Gbps fiber to every member household.',
    ctaText: 'Support Distribution',
    creatorName: 'Rural Fiber Initiative',
    creatorType: 'Grassroots Coalition',
    daysLeft: 22,
    durationDays: 45,
    storySections: [
      {
        heading: 'Why Big Telecom Left Us Behind',
        content: 'Low population density makes fiber unprofitable for Wall Street telecoms, but electric co-ops operate on at-cost principles and already own the pole rights.',
        position: 1,
      },
    ],
    sources: [
      {
        title: 'State Broadband Equity and Deployment Mapping Report',
        publisher: 'State Broadband Office',
        url: 'https://broadband.gov/equity-maps',
        relevance: 'Verifies 6,200 valley addresses lack FCC standard 100/20 Mbps broadband.',
        position: 1,
      },
    ],
    contributions: [],
    activities: [],
  },
  {
    id: 'camp-11',
    slug: 'independent-food-pantry-logistics-corridor',
    title: 'Cold Storage Expansion for Regional Food Rescue Logistics',
    tagLine: 'Direct advertising to local farmers and grocery warehouses to divert fresh produce from landfills.',
    summary: 'Over 40 tons of fresh agricultural surplus are dumped weekly due to lack of cold storage transport. We place business-to-business ads connecting growers with food rescue dispatch.',
    narrative: 'Hunger in farming valleys is a distribution crisis, not a production crisis. Direct B2B awareness ads divert grade-B produce straight into community pantries.',
    category: 'Other',
    targetAmount: 360000, // $3,600.00
    raisedAmount: 195000, // $1,950.00
    backerCount: 88,
    reachMultiplier: 27.0,
    estimatedReach: 97200,
    deliveredReach: 52650,
    trustScore: 94,
    trustCategory: 'Universal Trust Gold',
    status: CampaignStatus.SUBMITTED_FOR_REVIEW,
    targetAudience: 'Growers, packaging houses, logistics operators, and food relief volunteers',
    targetLocations: ['California', 'Midwest Agricultural Corridors'],
    audienceInterests: ['Public Health', 'Community Development', 'Environmental Policy'],
    distributionChannels: ['Google Search & Display Ads', 'Civic Journalism Ad Network'],
    imageUrl: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=1200&q=80',
    adHeadline: 'Divert Fresh Farm Surplus to Families',
    adDescription: 'Free tax-deductible cold storage pickup for regional agricultural producers.',
    ctaText: 'Learn The Facts',
    creatorId: 'usr-creator-1',
    creatorName: 'Valley Food Rescue Cooperative',
    creatorType: 'Non-Profit Organization',
    daysLeft: 19,
    durationDays: 30,
    storySections: [
      {
        heading: 'The Paradox of Waste in Productive Valleys',
        content: 'Farmers often cannot afford the packaging or diesel fuel to harvest cosmetically imperfect produce, while 1 in 5 valley children experiences food insecurity.',
        position: 1,
      },
    ],
    sources: [
      {
        title: 'USDA Agricultural Food Waste and Recovery Fact Sheet',
        publisher: 'U.S. Department of Agriculture',
        url: 'https://usda.gov/food-waste-recovery',
        relevance: 'Documents 30-40% food supply loss at harvest and retail levels.',
        position: 1,
      },
    ],
    contributions: [],
    activities: [],
  },
  {
    id: 'camp-12',
    slug: 'pedestrian-safety-corridors-transit-deserts',
    title: 'High-Visibility Crosswalks in Suburban School Zones',
    tagLine: 'Place civic accountability ads alerting city traffic engineers to dangerous arterial intersections.',
    summary: 'Four students were injured along 82nd Avenue where crosswalks are spaced 1.2 miles apart. Community ads mobilize civic pressure for rapid-flashing pedestrian beacons.',
    narrative: 'Children walking to public schools should not have to cross 5-lane 45mph arterials without pedestrian signals. We pool civic ad funds to spotlight state highway safety funds.',
    category: 'Community',
    targetAmount: 390000, // $3,900.00
    raisedAmount: 85000, // $850.00
    backerCount: 42,
    reachMultiplier: 27.0,
    estimatedReach: 105300,
    deliveredReach: 22950,
    trustScore: 93,
    trustCategory: 'Universal Trust Gold',
    status: CampaignStatus.AVAILABLE_FOR_FUNDING,
    targetAudience: 'Parents, neighborhood associations, transit riders, and city council members',
    targetLocations: ['Pacific Northwest', 'California'],
    audienceInterests: ['Civic Accountability', 'Education Access', 'Local Governance'],
    distributionChannels: ['Meta Targeted Newsfeeds', 'Local Gazette Network'],
    imageUrl: 'https://images.unsplash.com/photo-1508873696983-2df5293cb32b?w=1200&q=80',
    adHeadline: 'Safe Crossings for 82nd Avenue Students',
    adDescription: 'Review the high-crash corridor audit and urge city commissioners to install pedestrian beacons.',
    ctaText: 'Demand Public Action',
    creatorName: 'Eastside Safe Streets Coalition',
    creatorType: 'Citizen Advocate',
    daysLeft: 28,
    durationDays: 30,
    storySections: [
      {
        heading: 'A Known Crash Corridor Without Action',
        content: 'City Vision Zero audits identified 82nd Avenue as the highest-fatality arterial in the county five years ago, yet infrastructure capital remains concentrated in commercial downtown corridors.',
        position: 1,
      },
    ],
    sources: [
      {
        title: 'City Department of Transportation Vision Zero Crash Report',
        publisher: 'City Bureau of Transportation',
        url: 'https://transportation.gov/vision-zero/82nd-avenue',
        relevance: 'Designates corridor as tier-1 priority for signalized pedestrian crossings.',
        position: 1,
      },
    ],
    contributions: [],
    activities: [],
  },
  {
    id: 'camp-13',
    slug: 'multilingual-health-rights-hotline',
    title: 'Multilingual Health Rights Outreach for Farmworker Communities',
    tagLine: 'Targeted SMS and community radio ads informing agricultural workers of occupational health protections.',
    summary: 'Heat illness prevention regulations were strengthened, but 45,000 seasonal workers have not received notices in their primary language. Community ads amplify hotline guidance.',
    narrative: 'Seasonal farmworkers often lack access to digital health portals during excessive heat emergencies. Radio and mobile ads provide direct numbers to certified medical interpreters.',
    category: 'Health',
    targetAmount: 340000, // $3,400.00
    raisedAmount: 0,
    backerCount: 0,
    reachMultiplier: 27.0,
    estimatedReach: 91800,
    deliveredReach: 0,
    trustScore: 88,
    trustCategory: 'Universal Trust Standard',
    status: CampaignStatus.CHANGES_REQUESTED,
    targetAudience: 'Agricultural workers, community clinics, rural health navigators, and labor advocates',
    targetLocations: ['California', 'Pacific Northwest'],
    audienceInterests: ['Public Health', 'Civic Accountability', 'Community Development'],
    distributionChannels: ['Meta Targeted Newsfeeds', 'Local Gazette Network'],
    imageUrl: 'https://images.unsplash.com/photo-1595278069441-2cf29f8005a4?w=1200&q=80',
    adHeadline: 'Know Your Rights: Heat Safety Protections',
    adDescription: 'Free confidential health guidance in Spanish, Mixteco, and English.',
    ctaText: 'Access Hotline Guidance',
    creatorId: 'usr-creator-1',
    creatorName: 'Agricultural Health Coalition',
    creatorType: 'Grassroots Coalition',
    daysLeft: 30,
    durationDays: 30,
    storySections: [
      {
        heading: 'Heat Illness Prevention Is the Law',
        content: 'State standards mandate shade, clean water, and paid cool-down breaks when temperatures exceed 85 degrees Fahrenheit.',
        position: 1,
      },
    ],
    sources: [
      {
        title: 'Cal/OSHA Heat Illness Prevention Standard Title 8 Section 3395',
        publisher: 'Department of Industrial Relations',
        url: 'https://dir.ca.gov/title8/3395.html',
        relevance: 'Statutory basis for employer-provided hydration and shade.',
        position: 1,
      },
    ],
    contributions: [],
    activities: [
      {
        eventType: 'CAMPAIGN_CHANGES_REQUESTED',
        metadata: {
          reviewer: 'Sarah Chen, Lead Fact-Checker',
          feedback: 'Please attach certified translator credentials or local clinic verification letters for the hotline claims before public distribution.',
        },
        createdAt: '2026-10-15T10:00:00.000Z',
      },
    ],
  },
  {
    id: 'camp-14',
    slug: 'unauthorized-commercial-advertorial-attempt',
    title: 'Private Commercial Real Estate Advertorial Campaign',
    tagLine: 'Promotional display ads targeting municipal rezoning for luxury residential towers.',
    summary: 'A commercial development agency sought public amplification funds to lobby for municipal density bonuses for a private high-rise tower.',
    narrative: 'Commercial marketing submissions that lack civic public interest or verifiable non-profit stewardship violate our verification standards.',
    category: 'Business',
    targetAmount: 900000,
    raisedAmount: 0,
    backerCount: 0,
    reachMultiplier: 27.0,
    estimatedReach: 243000,
    deliveredReach: 0,
    trustScore: 42,
    trustCategory: 'Unverified / Disqualified',
    status: CampaignStatus.REJECTED,
    targetAudience: 'City planners and downtown real estate investors',
    targetLocations: ['California'],
    audienceInterests: ['Local Governance', 'Economic Policy'],
    distributionChannels: ['Meta Targeted Newsfeeds'],
    imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&q=80',
    adHeadline: 'Commercial Rezoning Public Notice',
    adDescription: 'Commercial advertorial submission.',
    ctaText: 'Learn More',
    creatorId: 'usr-creator-1',
    creatorName: 'Metropolitan Holdings LLC',
    creatorType: 'Private Enterprise',
    daysLeft: 0,
    durationDays: 30,
    storySections: [],
    sources: [],
    contributions: [],
    activities: [
      {
        eventType: 'CAMPAIGN_REJECTED',
        metadata: {
          reviewer: 'Sarah Chen, Lead Fact-Checker',
          feedback: 'Commercial product advertising without substantiated civic public interest violates the Universal Trust Standard Section 4.2.',
        },
        createdAt: '2026-10-14T16:00:00.000Z',
      },
    ],
  },
];
