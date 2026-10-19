import { CampaignStatus, ContributionStatus, ReportStatus, UserRole } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { SEED_CAMPAIGNS, SEED_USERS, SeedCampaign } from '../data/seedData.js';
import { calculateFeeBreakdown } from '../lib/reachCalculator.js';
import { validateCampaignTransition, isCampaignPubliclyDiscoverable } from '../lib/stateMachine.js';
import { env, getSanitizedDbTarget } from '../config/env.js';
import { validateSourceUrl, validateCreatives } from '../lib/sourceValidator.js';
import { distributionGate } from './distributionGate.service.js';
import { AppError } from '../middleware/errorHandler.js';

let isPrismaConnected = false;

// In-Memory Transactional Store
interface MemoryDraft {
  id: string;
  ownerId?: string;
  anonymousToken?: string;
  currentStep: number;
  title: string;
  status: string;
  draftData: any;
  createdAt: Date;
  updatedAt: Date;
}

interface MemoryContribution {
  id: string;
  campaignId: string;
  userId?: string;
  amount: number;
  currency: string;
  netMediaAmount: number;
  platformFee: number;
  totalCharged: number;
  reachFunded: number;
  backerName: string;
  backerEmail?: string;
  isAnonymous: boolean;
  supportNote?: string;
  paymentProvider: string;
  paymentStatus: ContributionStatus;
  receiptReference: string;
  createdAt: Date;
}

interface MemoryActivity {
  id: string;
  campaignId: string;
  actorId?: string;
  eventType: string;
  metadata?: any;
  createdAt: Date;
}

interface MemoryReviewDecision {
  id: string;
  campaignId: string;
  reviewerId: string;
  decision: string;
  feedback: string;
  createdAt: Date;
}

// State containers
let memoryUsers = [...SEED_USERS];
let memoryCampaigns: SeedCampaign[] = JSON.parse(JSON.stringify(SEED_CAMPAIGNS)).map((c: any) => ({
  ...c,
  creatorId: c.creatorId || 'usr-creator-1',
}));
let memoryDrafts: MemoryDraft[] = [
  {
    id: 'draft-101',
    ownerId: 'usr-creator-1',
    anonymousToken: 'anon-demo-token-101',
    currentStep: 2,
    title: 'Protect Public Ridgeline Trails from Private Encroachment',
    status: 'draft',
    draftData: {
      category: 'Environment',
      creatorName: 'Cascadia Trail Coalition',
      summary: 'Prevent zoning variances from cutting off century-old public trailhead access in the foothills.',
      targetLocations: ['Washington State', 'Pacific Northwest'],
      fundingGoal: 420000,
    },
    createdAt: new Date('2026-10-14T10:30:00.000Z'),
    updatedAt: new Date('2026-10-16T08:15:00.000Z'),
  },
  {
    id: 'draft-102',
    ownerId: 'usr-creator-1',
    anonymousToken: 'anon-demo-token-102',
    currentStep: 1,
    title: 'Independent Testing of Municipal Drinking Water Leads',
    status: 'draft',
    draftData: {
      category: 'Health',
      creatorName: 'Clean Water Watch',
      summary: 'Fund independent laboratory water testing verification in 24 legacy school distribution networks.',
      targetLocations: ['California', 'Metropolitan Districts'],
      fundingGoal: 580000,
    },
    createdAt: new Date('2026-10-15T14:00:00.000Z'),
    updatedAt: new Date('2026-10-16T09:20:00.000Z'),
  },
];
let memoryContributions: MemoryContribution[] = [];
let memoryActivities: MemoryActivity[] = [];
let memoryReviewDecisions: MemoryReviewDecision[] = [];
let memoryFollows: { userId: string; campaignId: string; createdAt: Date }[] = [];
let memoryReadActivities = new Set<string>(); // "userId:activityId"
let memoryPreferences: Record<string, {
  userId: string;
  milestoneAlerts: boolean;
  contributionAlerts: boolean;
  moderationAlerts: boolean;
  weeklyDigest: boolean;
}> = {};
let memoryCampaignUpdates: Array<{
  id: string;
  campaignId: string;
  title: string;
  content: string;
  impressions: number;
  channels: string[];
  screenshotUrl?: string;
  postedAt: Date;
}> = [
  {
    id: 'upd-camp-5-1',
    campaignId: 'camp-5',
    title: 'Lifeline Bus Ad Campaign Deployed to Local Gazette Network',
    content: 'Geo-targeted display advertisements alerting rural riders to the public transit hearing reached 45,000 residents across 3 counties.',
    impressions: 45000,
    channels: ['Civic Journalism Ad Network', 'Local News Outlets'],
    postedAt: new Date('2026-10-15T09:00:00.000Z'),
  },
  {
    id: 'upd-camp-9-1',
    campaignId: 'camp-9',
    title: 'Investigation Concluded: Audit Records Released',
    content: 'Public records petition funded by 310 community contributors unlocked full documentation of $4.2M in contractor surcharges.',
    impressions: 108000,
    channels: ['Civic Journalism Ad Network', 'Google Search & Display Ads'],
    postedAt: new Date('2026-10-11T14:00:00.000Z'),
  },
];

// Populate seed activities & contributions
memoryCampaigns.forEach(c => {
  if (c.contributions) {
    c.contributions.forEach((contrib, idx) => {
      const fees = calculateFeeBreakdown(contrib.amount);
      memoryContributions.push({
        id: `contrib-${c.id}-${idx + 1}`,
        campaignId: c.id,
        amount: contrib.amount,
        currency: 'USD',
        netMediaAmount: fees.netMediaMinor,
        platformFee: fees.platformFeeMinor,
        totalCharged: contrib.amount,
        reachFunded: fees.estimatedImpressions,
        backerName: contrib.backerName,
        backerEmail: contrib.backerEmail,
        isAnonymous: false,
        supportNote: contrib.supportNote,
        paymentProvider: 'simulated_escrow',
        paymentStatus: ContributionStatus.SUCCEEDED,
        receiptReference: `REC-${c.id.slice(-4)}-${idx + 1000}`,
        createdAt: new Date(),
      });
    });
  }
  if (c.activities) {
    c.activities.forEach((act, idx) => {
      memoryActivities.push({
        id: `act-${c.id}-${idx + 1}`,
        campaignId: c.id,
        eventType: act.eventType,
        metadata: act.metadata,
        createdAt: new Date(act.createdAt),
      });
    });
  }
});

// Seed reviewer decisions (migrated to administrator identity)
memoryReviewDecisions.push({
  id: 'rev-camp-13-1',
  campaignId: 'camp-13',
  reviewerId: 'usr-admin-1',
  decision: 'CHANGES_REQUESTED',
  feedback: 'Please attach certified translator credentials or local clinic verification letters for the hotline claims before public distribution.',
  createdAt: new Date('2026-10-15T10:00:00.000Z'),
});
memoryReviewDecisions.push({
  id: 'rev-camp-14-1',
  campaignId: 'camp-14',
  reviewerId: 'usr-admin-1',
  decision: 'REJECTED',
  feedback: 'Commercial product advertising without substantiated civic public interest violates the Universal Trust Standard Section 4.2.',
  createdAt: new Date('2026-10-14T16:00:00.000Z'),
});

function emitFundingMilestones(campaignId: string, prevRaised: number, newRaised: number, target: number) {
  if (target <= 0) return;
  const milestones = [
    { pct: 25, title: '25% of Funding Goal Reached' },
    { pct: 50, title: '50% Halfway Funding Milestone Reached' },
    { pct: 75, title: '75% Major Funding Milestone Reached' },
  ];

  for (const m of milestones) {
    const thresholdVal = Math.round(target * (m.pct / 100));
    if (prevRaised < thresholdVal && newRaised >= thresholdVal) {
      // Deduplication: only emit if this milestone percentage has not yet been emitted
      const alreadyEmitted = memoryActivities.some(
        a => a.campaignId === campaignId && a.eventType === 'FUNDING_MILESTONE_REACHED' && a.metadata?.percentage === m.pct
      );
      if (!alreadyEmitted) {
        memoryActivities.unshift({
          id: `act-${Date.now()}-milestone-${m.pct}`,
          campaignId,
          eventType: 'FUNDING_MILESTONE_REACHED',
          metadata: {
            percentage: m.pct,
            title: m.title,
            currentRaised: newRaised,
            targetAmount: target,
          },
          createdAt: new Date(),
        });
      }
    }
  }
}

export async function initializeDatabase(): Promise<{ isPrismaConnected: boolean }> {
  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    // Verify that database schema tables exist before activating Prisma mode
    await prisma.campaign.findFirst();
    isPrismaConnected = true;
    console.log(`✅ Managed PostgreSQL connection verified via Prisma (${getSanitizedDbTarget(env.DATABASE_URL)}).`);
  } catch (err: any) {
    isPrismaConnected = false;
    const cleanError = err.message?.split('\n')[0] || 'Unknown database connection error';

    if (env.NODE_ENV === 'production') {
      console.error('❌ FATAL: Production database connection failed.');
      console.error(`   Target: ${getSanitizedDbTarget(env.DATABASE_URL)}`);
      console.error(`   Reason: ${cleanError}`);
      console.error('   Production cannot fall back to in-memory storage. Aborting startup.');
      throw new Error(`Managed database connection failed in production: ${cleanError}`);
    }

    console.warn('ℹ️ PostgreSQL not currently reachable; running with in-memory transactional database store.');
    console.warn(`   Reason: ${cleanError}`);
  }
  return { isPrismaConnected };
}

export async function checkDatabaseReadiness(): Promise<{
  ok: boolean;
  type: 'prisma_postgres' | 'in_memory_fallback';
  latencyMs: number;
  error?: string;
}> {
  const start = Date.now();
  if (isPrismaConnected) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return {
        ok: true,
        type: 'prisma_postgres',
        latencyMs: Date.now() - start,
      };
    } catch {
      return {
        ok: false,
        type: 'prisma_postgres',
        latencyMs: Date.now() - start,
        error: 'Database ping query failed',
      };
    }
  }

  // In non-production, in-memory store is considered ready for testing/demo
  return {
    ok: env.NODE_ENV !== 'production',
    type: 'in_memory_fallback',
    latencyMs: Date.now() - start,
  };
}

export const dbStore = {
  isPrismaActive(): boolean {
    return isPrismaConnected;
  },

  // 1. Users
  async findUserByEmail(email: string) {
    if (isPrismaConnected) {
      return prisma.user.findUnique({ where: { email } });
    }
    return memoryUsers.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
  },

  async findUserById(id: string) {
    if (isPrismaConnected) {
      return prisma.user.findUnique({ where: { id } });
    }
    return memoryUsers.find(u => u.id === id) || null;
  },

  async createUser(data: { email: string; name: string; passwordHash?: string; role?: UserRole; avatarUrl?: string | null }) {
    if (isPrismaConnected) {
      return prisma.user.create({ data: { ...data, role: data.role || UserRole.CREATOR } });
    }
    const newUser = {
      id: `usr-${Date.now()}`,
      email: data.email,
      name: data.name,
      passwordHash: data.passwordHash || null,
      role: data.role || UserRole.CREATOR,
      avatarUrl: data.avatarUrl || null,
      bio: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    memoryUsers.push(newUser);
    return newUser;
  },

  async updateUser(id: string, data: { name?: string; avatarUrl?: string | null; bio?: string | null }) {
    if (isPrismaConnected) {
      return prisma.user.update({ where: { id }, data });
    }
    const idx = memoryUsers.findIndex(u => u.id === id);
    if (idx !== -1) {
      memoryUsers[idx] = { ...memoryUsers[idx], ...data, updatedAt: new Date() };
      return memoryUsers[idx];
    }
    return null;
  },


  // 2. Campaigns
  async getCampaigns(options: {
    search?: string;
    category?: string;
    status?: CampaignStatus;
    sort?: string;
    limit?: number;
    offset?: number;
    publicOnly?: boolean;
  }) {
    const {
      search,
      category,
      status,
      sort = 'recommended',
      limit = 20,
      offset = 0,
      publicOnly = true,
    } = options;

    if (isPrismaConnected) {
      const where: any = {};
      if (category && category.toLowerCase() !== 'all') {
        where.category = { equals: category, mode: 'insensitive' };
      }
      if (status) {
        where.status = status;
      } else if (publicOnly) {
        where.status = {
          in: [
            CampaignStatus.APPROVED,
            CampaignStatus.AVAILABLE_FOR_FUNDING,
            CampaignStatus.FUNDING_GOAL_REACHED,
            CampaignStatus.DISTRIBUTION_PREPARATION,
            CampaignStatus.PROMOTING,
            CampaignStatus.COMPLETED,
          ],
        };
      }
      if (search && search.trim().length > 0) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { summary: { contains: search, mode: 'insensitive' } },
          { creatorName: { contains: search, mode: 'insensitive' } },
        ];
      }

      let orderBy: any = { createdAt: 'desc' };
      if (sort === 'most_funded') orderBy = { raisedAmount: 'desc' };
      if (sort === 'ending_soon') orderBy = { daysLeft: 'asc' };
      if (sort === 'newest') orderBy = { createdAt: 'desc' };

      const [total, campaigns] = await Promise.all([
        prisma.campaign.count({ where }),
        prisma.campaign.findMany({
          where,
          orderBy,
          take: limit,
          skip: offset,
          include: { storySections: true, sources: true },
        }),
      ]);

      return { total, limit, offset, campaigns };
    }

    // In-memory implementation
    let list = [...memoryCampaigns];

    if (publicOnly) {
      list = list.filter(c => isCampaignPubliclyDiscoverable(c.status));
    }

    if (category && category.toLowerCase() !== 'all') {
      list = list.filter(c => c.category.toLowerCase() === category.toLowerCase());
    }

    if (status) {
      list = list.filter(c => c.status === status);
    }

    if (search && search.trim().length > 0) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        c =>
          c.title.toLowerCase().includes(q) ||
          c.summary.toLowerCase().includes(q) ||
          c.creatorName.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q)
      );
    }

    // Sorting
    switch (sort) {
      case 'most_funded':
        list.sort((a, b) => b.raisedAmount / b.targetAmount - a.raisedAmount / a.targetAmount);
        break;
      case 'ending_soon':
        list.sort((a, b) => a.daysLeft - b.daysLeft);
        break;
      case 'newest':
        list.sort((a, b) => new Date(b.imageUrl ? 0 : 0).getTime() - 0);
        break;
      case 'recommended':
      default:
        list.sort((a, b) => b.trustScore - a.trustScore);
        break;
    }

    return {
      total: list.length,
      limit,
      offset,
      campaigns: list.slice(offset, offset + limit),
    };
  },

  async getCampaignByIdOrSlug(idOrSlug: string) {
    if (isPrismaConnected) {
      return prisma.campaign.findFirst({
        where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
        include: {
          storySections: { orderBy: { position: 'asc' } },
          sources: { orderBy: { position: 'asc' } },
          report: true,
          updates: { orderBy: { postedAt: 'desc' } },
        },
      });
    }

    const campaign = memoryCampaigns.find(c => c.id === idOrSlug || c.slug === idOrSlug);
    return campaign || null;
  },

  // 3. Drafts
  async getDraftsByOwner(ownerId?: string, anonymousToken?: string) {
    if (isPrismaConnected) {
      return prisma.campaignDraft.findMany({
        where: {
          OR: [
            ...(ownerId ? [{ ownerId }, { anonymousToken: ownerId }] : []),
            ...(anonymousToken ? [{ anonymousToken }] : []),
          ],
        },
        orderBy: { updatedAt: 'desc' },
      });
    }

    return memoryDrafts.filter(
      d => (ownerId && d.ownerId === ownerId) || (anonymousToken && d.anonymousToken === anonymousToken)
    );
  },

  async getDraftById(id: string) {
    if (isPrismaConnected) {
      return prisma.campaignDraft.findUnique({ where: { id } });
    }
    return memoryDrafts.find(d => d.id === id) || null;
  },

  async createOrUpdateDraft(data: {
    id?: string;
    ownerId?: string;
    anonymousToken?: string;
    currentStep?: number;
    title?: string;
    status?: string;
    draftData: any;
  }) {
    const draftId = data.id || `draft-${Date.now()}`;
    const now = new Date();

    if (isPrismaConnected) {
      let validOwnerId: string | null = null;
      let token = data.anonymousToken || null;
      if (data.ownerId) {
        let userExists = await prisma.user.findUnique({ where: { id: data.ownerId } }).catch(() => null);
        if (!userExists) {
          userExists = await prisma.user.create({
            data: {
              id: data.ownerId,
              email: `${data.ownerId}@demo.local`,
              name: data.ownerId,
              role: 'CREATOR',
            },
          }).catch(() => null);
        }
        if (userExists) {
          validOwnerId = data.ownerId;
        } else {
          token = token || data.ownerId;
        }
      }

      return prisma.campaignDraft.upsert({
        where: { id: draftId },
        create: {
          id: draftId,
          ownerId: validOwnerId,
          anonymousToken: token,
          currentStep: data.currentStep || 1,
          title: data.title || data.draftData?.title || 'Untitled Campaign',
          status: data.status || 'draft',
          draftData: data.draftData,
          createdAt: now,
          updatedAt: now,
        },
        update: {
          ownerId: validOwnerId || undefined,
          anonymousToken: token || undefined,
          currentStep: data.currentStep,
          title: data.title || data.draftData?.title,
          status: data.status,
          draftData: data.draftData,
          updatedAt: now,
        },
      });
    }

    const idx = memoryDrafts.findIndex(d => d.id === draftId);
    if (idx >= 0) {
      memoryDrafts[idx] = {
        ...memoryDrafts[idx],
        currentStep: data.currentStep || memoryDrafts[idx].currentStep,
        title: data.title || data.draftData?.title || memoryDrafts[idx].title,
        status: data.status || memoryDrafts[idx].status,
        draftData: { ...memoryDrafts[idx].draftData, ...data.draftData },
        updatedAt: now,
      };
      return memoryDrafts[idx];
    } else {
      const newDraft: MemoryDraft = {
        id: draftId,
        ownerId: data.ownerId,
        anonymousToken: data.anonymousToken,
        currentStep: data.currentStep || 1,
        title: data.title || data.draftData?.title || 'Untitled Campaign',
        status: data.status || 'draft',
        draftData: data.draftData,
        createdAt: now,
        updatedAt: now,
      };
      memoryDrafts.unshift(newDraft);
      return newDraft;
    }
  },

  async deleteDraft(id: string) {
    if (isPrismaConnected) {
      await prisma.campaignDraft.delete({ where: { id } });
      return true;
    }
    const initialLen = memoryDrafts.length;
    memoryDrafts = memoryDrafts.filter(d => d.id !== id);
    return memoryDrafts.length < initialLen;
  },

  // 4. Submit Campaign from Draft
  async submitDraft(draftId: string, ownerId?: string): Promise<any> {
    const draft = await this.getDraftById(draftId);
    if (!draft) {
      throw new Error('Draft not found.');
    }

    const payload = draft.draftData || {};
    const title = draft.title || payload.title;
    if (!title || title.trim().length < 5) {
      throw new Error('Campaign title must be at least 5 characters.');
    }
    if (!payload.summary || payload.summary.trim().length < 10) {
      throw new Error('Campaign summary must be at least 10 characters.');
    }

    const fundingGoal = parseInt(payload.fundingGoal, 10) || 500000;
    const slug =
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '') + `-${Date.now().toString().slice(-4)}`;

    const campaignId = `camp-${Date.now()}`;
    const now = new Date();

    const newCampaign: SeedCampaign = {
      id: campaignId,
      slug,
      title,
      tagLine: payload.summary.slice(0, 80),
      summary: payload.summary,
      narrative: payload.whatIsItAbout || payload.storyIntro || payload.summary,
      category: payload.category || 'Environment',
      targetAmount: fundingGoal,
      raisedAmount: 0,
      backerCount: 0,
      reachMultiplier: 27.0,
      estimatedReach: Math.round((fundingGoal / 100 / 37.0) * 1000),
      deliveredReach: 0,
      trustScore: 92,
      trustCategory: 'Universal Trust Gold',
      status: CampaignStatus.SUBMITTED_FOR_REVIEW,
      targetAudience: payload.whoToReach || 'Targeted local citizens',
      targetLocations: payload.targetLocations || ['United States (National)'],
      audienceInterests: payload.audienceInterests || ['Civic Accountability'],
      distributionChannels: payload.distributionChannels || ['Meta Targeted Newsfeeds'],
      imageUrl: payload.coverImage || 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=1200&q=80',
      adHeadline: payload.adHeadline || title,
      adDescription: payload.adDescription || payload.summary,
      ctaText: payload.ctaText || 'Amplify This Message',
      creatorId: ownerId || 'usr-creator-1',
      creatorName: payload.creatorName || 'Anonymous Creator',
      creatorType: 'Grassroots Advocate',
      daysLeft: payload.durationDays || 30,
      durationDays: payload.durationDays || 30,
      submissionTimestamp: now,
      storySections: payload.storySections || [
        {
          heading: 'Background & Facts',
          content: payload.whatIsItAbout || payload.summary,
          position: 1,
        },
      ],
      sources: payload.sources || [],
      contributions: [],
      activities: [
        {
          eventType: 'CAMPAIGN_SUBMITTED',
          metadata: { submittedAt: now.toISOString(), submissionId: campaignId },
          createdAt: now.toISOString(),
        },
      ],
    };

    // Update draft status
    await this.createOrUpdateDraft({
      id: draftId,
      status: 'submitted_for_review',
      draftData: { ...payload, submissionTimestamp: now.toISOString(), campaignId },
    });

    if (isPrismaConnected) {
      let validCreatorId: string | null = null;
      if (ownerId) {
        const userExists = await prisma.user.findUnique({ where: { id: ownerId } }).catch(() => null);
        if (userExists) {
          validCreatorId = ownerId;
        }
      }

      const createdCampaign = await prisma.campaign.create({
        data: {
          id: campaignId,
          slug,
          title,
          tagLine: newCampaign.tagLine,
          summary: newCampaign.summary,
          narrative: newCampaign.narrative,
          category: newCampaign.category,
          targetAmount: newCampaign.targetAmount,
          raisedAmount: 0,
          backerCount: 0,
          reachMultiplier: newCampaign.reachMultiplier,
          estimatedReach: newCampaign.estimatedReach,
          deliveredReach: 0,
          trustScore: newCampaign.trustScore,
          trustCategory: newCampaign.trustCategory,
          status: CampaignStatus.SUBMITTED_FOR_REVIEW,
          targetAudience: newCampaign.targetAudience,
          targetLocations: newCampaign.targetLocations,
          audienceInterests: newCampaign.audienceInterests,
          distributionChannels: newCampaign.distributionChannels,
          imageUrl: newCampaign.imageUrl,
          adHeadline: newCampaign.adHeadline,
          adDescription: newCampaign.adDescription,
          ctaText: newCampaign.ctaText,
          creatorId: validCreatorId,
          creatorName: newCampaign.creatorName,
          daysLeft: newCampaign.daysLeft,
          durationDays: newCampaign.durationDays,
          submissionTimestamp: now,
          storySections: {
            create: (newCampaign.storySections || []).map((sec, idx) => ({
              heading: sec.heading || `Section ${idx + 1}`,
              content: sec.content || '',
              position: sec.position ?? idx + 1,
              imageUrl: sec.imageUrl || null,
              imageCaption: sec.imageCaption || null,
            })),
          },
          sources: {
            create: (newCampaign.sources || []).map((src, idx) => ({
              title: src.title || `Source ${idx + 1}`,
              publisher: src.publisher || null,
              url: src.url || 'https://example.com',
              relevance: src.relevance || 'Primary source record',
              position: src.position ?? idx + 1,
            })),
          },
        },
        include: {
          storySections: true,
          sources: true,
          report: true,
        },
      });

      await prisma.campaignActivity.create({
        data: {
          campaignId: createdCampaign.id,
          actorId: ownerId,
          eventType: 'CAMPAIGN_SUBMITTED',
          metadata: { title, targetAmount: fundingGoal },
        },
      }).catch(() => {});

      memoryCampaigns.unshift(createdCampaign as any);
      return createdCampaign;
    }

    memoryCampaigns.unshift(newCampaign);
    memoryActivities.unshift({
      id: `act-${Date.now()}`,
      campaignId,
      actorId: ownerId,
      eventType: 'CAMPAIGN_SUBMITTED',
      metadata: { title, targetAmount: fundingGoal },
      createdAt: now,
    });

    return newCampaign;
  },

  // 5. Contributions
  async previewFeeBreakdown(amountMinor: number, currency: 'INR' | 'USD' = 'USD') {
    if (amountMinor <= 0) {
      throw new Error('Contribution amount must be a positive integer.');
    }
    return calculateFeeBreakdown(amountMinor, currency);
  },

  async createContribution(data: {
    campaignId: string;
    userId?: string;
    amount: number; // integer minor units
    currency?: 'INR' | 'USD';
    backerName: string;
    backerEmail?: string;
    isAnonymous?: boolean;
    supportNote?: string;
    paymentProvider?: string;
    initialStatus?: ContributionStatus;
  }) {
    const campaign = await this.getCampaignByIdOrSlug(data.campaignId);
    if (!campaign) {
      throw new Error(`Campaign "${data.campaignId}" not found.`);
    }

    if (
      campaign.status !== CampaignStatus.AVAILABLE_FOR_FUNDING &&
      campaign.status !== CampaignStatus.FUNDING_GOAL_REACHED
    ) {
      throw new Error(`Campaign is in status ${campaign.status} and cannot accept contributions.`);
    }

    if (data.amount <= 0) {
      throw new Error('Contribution amount must be a positive integer.');
    }

    const currency = data.currency || 'USD';
    const fees = calculateFeeBreakdown(data.amount, currency);
    const receiptReference = `REC-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`;

    const now = new Date();
    const status = data.initialStatus || ContributionStatus.PENDING;

    if (isPrismaConnected) {
      const result = await prisma.$transaction(async (tx) => {
        const createdContrib = await tx.contribution.create({
          data: {
            campaignId: campaign.id,
            userId: data.userId,
            amount: data.amount,
            currency,
            netMediaAmount: fees.netMediaMinor,
            platformFee: fees.platformFeeMinor,
            totalCharged: data.amount,
            reachFunded: fees.estimatedImpressions,
            backerName: data.isAnonymous ? 'Anonymous Contributor' : data.backerName,
            backerEmail: data.backerEmail,
            isAnonymous: Boolean(data.isAnonymous),
            supportNote: data.supportNote,
            paymentProvider: data.paymentProvider || 'simulated_escrow',
            paymentStatus: status,
            receiptReference,
          },
        });

        let updatedCamp: any = campaign;
        if (status === ContributionStatus.SUCCEEDED) {
          const nextRaised = campaign.raisedAmount + data.amount;
          const nextBackers = campaign.backerCount + 1;
          const nextReach = campaign.deliveredReach + fees.estimatedImpressions;
          let nextCampStatus = campaign.status;

          if (nextRaised >= campaign.targetAmount && campaign.status === CampaignStatus.AVAILABLE_FOR_FUNDING) {
            nextCampStatus = CampaignStatus.FUNDING_GOAL_REACHED;
            await tx.campaignActivity.create({
              data: {
                campaignId: campaign.id,
                eventType: 'FUNDING_GOAL_REACHED',
                metadata: { totalRaised: nextRaised, backerCount: nextBackers },
              },
            });
          }

          updatedCamp = await tx.campaign.update({
            where: { id: campaign.id },
            data: {
              raisedAmount: nextRaised,
              backerCount: nextBackers,
              deliveredReach: nextReach,
              status: nextCampStatus,
            },
          });

          await tx.campaignActivity.create({
            data: {
              campaignId: campaign.id,
              actorId: data.userId,
              eventType: 'CONTRIBUTION_RECEIVED',
              metadata: {
                amount: data.amount,
                currency,
                reachFunded: fees.estimatedImpressions,
                backerName: createdContrib.backerName,
                receiptReference,
              },
            },
          });
        }

        return { createdContrib, updatedCamp };
      });

      return {
        contribution: result.createdContrib,
        campaignTotals: {
          raisedAmount: result.updatedCamp.raisedAmount,
          targetAmount: result.updatedCamp.targetAmount,
          backerCount: result.updatedCamp.backerCount,
          status: result.updatedCamp.status,
        },
        feeBreakdown: fees,
      };
    }

    // In-memory fallback
    const record: MemoryContribution = {
      id: `contrib-${Date.now()}`,
      campaignId: campaign.id,
      userId: data.userId,
      amount: data.amount,
      currency,
      netMediaAmount: fees.netMediaMinor,
      platformFee: fees.platformFeeMinor,
      totalCharged: data.amount,
      reachFunded: fees.estimatedImpressions,
      backerName: data.isAnonymous ? 'Anonymous Contributor' : data.backerName,
      backerEmail: data.backerEmail,
      isAnonymous: Boolean(data.isAnonymous),
      supportNote: data.supportNote,
      paymentProvider: data.paymentProvider || 'simulated_escrow',
      paymentStatus: status,
      receiptReference,
      createdAt: now,
    };

    if (status === ContributionStatus.SUCCEEDED) {
      campaign.raisedAmount += data.amount;
      campaign.backerCount += 1;
      campaign.deliveredReach += fees.estimatedImpressions;

      if (campaign.raisedAmount >= campaign.targetAmount && campaign.status === CampaignStatus.AVAILABLE_FOR_FUNDING) {
        campaign.status = CampaignStatus.FUNDING_GOAL_REACHED;
        memoryActivities.unshift({
          id: `act-${Date.now()}-goal`,
          campaignId: campaign.id,
          eventType: 'FUNDING_GOAL_REACHED',
          metadata: { totalRaised: campaign.raisedAmount, backerCount: campaign.backerCount },
          createdAt: now,
        });
      }

      memoryActivities.unshift({
        id: `act-${Date.now()}-contrib`,
        campaignId: campaign.id,
        actorId: data.userId,
        eventType: 'CONTRIBUTION_RECEIVED',
        metadata: {
          amount: data.amount,
          currency,
          reachFunded: fees.estimatedImpressions,
          backerName: record.backerName,
          receiptReference,
        },
        createdAt: now,
      });
    }

    memoryContributions.unshift(record);

    return {
      contribution: record,
      campaignTotals: {
        raisedAmount: campaign.raisedAmount,
        targetAmount: campaign.targetAmount,
        backerCount: campaign.backerCount,
        status: campaign.status,
      },
      feeBreakdown: fees,
    };
  },

  async simulateCheckout(data: {
    receiptReference: string;
    outcome: 'SUCCEEDED' | 'PENDING' | 'REJECTED' | 'FAILED' | 'CANCELLED';
    simulatedProvider?: string;
  }) {
    const now = new Date();

    if (isPrismaConnected) {
      return await prisma.$transaction(async (tx) => {
        const contrib = await tx.contribution.findUnique({
          where: { receiptReference: data.receiptReference },
        });
        if (!contrib) {
          throw new Error(`Contribution with receipt "${data.receiptReference}" not found.`);
        }

        // Idempotency: if already SUCCEEDED
        if (contrib.paymentStatus === ContributionStatus.SUCCEEDED) {
          const camp = await tx.campaign.findUnique({ where: { id: contrib.campaignId } });
          return {
            contribution: contrib,
            campaignTotals: camp ? {
              raisedAmount: camp.raisedAmount,
              targetAmount: camp.targetAmount,
              backerCount: camp.backerCount,
              status: camp.status,
            } : null,
            message: 'Payment already succeeded previously (idempotent result).',
          };
        }

        if (contrib.paymentStatus === data.outcome) {
          const camp = await tx.campaign.findUnique({ where: { id: contrib.campaignId } });
          return {
            contribution: contrib,
            campaignTotals: camp ? {
              raisedAmount: camp.raisedAmount,
              targetAmount: camp.targetAmount,
              backerCount: camp.backerCount,
              status: camp.status,
            } : null,
            message: `Contribution is already in ${data.outcome} state.`,
          };
        }

        const camp = await tx.campaign.findUnique({ where: { id: contrib.campaignId } });
        if (!camp) {
          throw new Error(`Associated campaign "${contrib.campaignId}" not found.`);
        }

        let updatedContrib: any = contrib;
        let updatedCamp: any = camp;

        if (data.outcome === 'SUCCEEDED') {
          if (
            camp.status !== CampaignStatus.AVAILABLE_FOR_FUNDING &&
            camp.status !== CampaignStatus.FUNDING_GOAL_REACHED
          ) {
            throw new Error(`Campaign is in status ${camp.status} and cannot accept successful funding.`);
          }

          const nextRaised = camp.raisedAmount + contrib.amount;
          const nextBackers = camp.backerCount + 1;
          const nextReach = camp.deliveredReach + contrib.reachFunded;
          let nextCampStatus = camp.status;

          if (nextRaised >= camp.targetAmount && camp.status === CampaignStatus.AVAILABLE_FOR_FUNDING) {
            nextCampStatus = CampaignStatus.FUNDING_GOAL_REACHED;
            await tx.campaignActivity.create({
              data: {
                campaignId: camp.id,
                eventType: 'FUNDING_GOAL_REACHED',
                metadata: { totalRaised: nextRaised, backerCount: nextBackers },
              },
            });
          }

          updatedCamp = await tx.campaign.update({
            where: { id: camp.id },
            data: {
              raisedAmount: nextRaised,
              backerCount: nextBackers,
              deliveredReach: nextReach,
              status: nextCampStatus,
            },
          });

          updatedContrib = await tx.contribution.update({
            where: { id: contrib.id },
            data: {
              paymentStatus: ContributionStatus.SUCCEEDED,
              paymentProvider: data.simulatedProvider || contrib.paymentProvider,
            },
          });

          await tx.campaignActivity.create({
            data: {
              campaignId: camp.id,
              actorId: contrib.userId,
              eventType: 'CONTRIBUTION_RECEIVED',
              metadata: {
                amount: contrib.amount,
                currency: contrib.currency,
                reachFunded: contrib.reachFunded,
                backerName: contrib.backerName,
                receiptReference: contrib.receiptReference,
              },
            },
          });
        } else if (data.outcome === 'FAILED' || data.outcome === 'REJECTED') {
          updatedContrib = await tx.contribution.update({
            where: { id: contrib.id },
            data: {
              paymentStatus: ContributionStatus.FAILED,
              paymentProvider: data.simulatedProvider || contrib.paymentProvider,
            },
          });
          await tx.campaignActivity.create({
            data: {
              campaignId: camp.id,
              actorId: contrib.userId,
              eventType: 'CONTRIBUTION_FAILED',
              metadata: {
                reason: data.outcome === 'REJECTED' ? 'Payment rejected by test provider' : 'Payment simulation failed',
                receiptReference: contrib.receiptReference,
              },
            },
          });
        } else if (data.outcome === 'CANCELLED') {
          updatedContrib = await tx.contribution.update({
            where: { id: contrib.id },
            data: {
              paymentStatus: ContributionStatus.CANCELLED,
              paymentProvider: data.simulatedProvider || contrib.paymentProvider,
            },
          });
        }

        return {
          contribution: updatedContrib,
          campaignTotals: {
            raisedAmount: updatedCamp.raisedAmount,
            targetAmount: updatedCamp.targetAmount,
            backerCount: updatedCamp.backerCount,
            status: updatedCamp.status,
          },
          message: `Simulated checkout processed: ${data.outcome}`,
        };
      });
    }

    // In-memory fallback
    const contrib = memoryContributions.find(c => c.receiptReference === data.receiptReference);
    if (!contrib) {
      throw new Error(`Contribution with receipt "${data.receiptReference}" not found.`);
    }

    const camp = memoryCampaigns.find(c => c.id === contrib.campaignId);
    if (!camp) {
      throw new Error(`Associated campaign "${contrib.campaignId}" not found.`);
    }

    // Idempotency: if already SUCCEEDED
    if (contrib.paymentStatus === ContributionStatus.SUCCEEDED) {
      return {
        contribution: contrib,
        campaignTotals: {
          raisedAmount: camp.raisedAmount,
          targetAmount: camp.targetAmount,
          backerCount: camp.backerCount,
          status: camp.status,
        },
        message: 'Payment already succeeded previously (idempotent result).',
      };
    }

    if (contrib.paymentStatus === data.outcome) {
      return {
        contribution: contrib,
        campaignTotals: {
          raisedAmount: camp.raisedAmount,
          targetAmount: camp.targetAmount,
          backerCount: camp.backerCount,
          status: camp.status,
        },
        message: `Contribution is already in ${data.outcome} state.`,
      };
    }

    if (data.outcome === 'SUCCEEDED') {
      if (
        camp.status !== CampaignStatus.AVAILABLE_FOR_FUNDING &&
        camp.status !== CampaignStatus.FUNDING_GOAL_REACHED
      ) {
        throw new Error(`Campaign is in status ${camp.status} and cannot accept successful funding.`);
      }

      contrib.paymentStatus = ContributionStatus.SUCCEEDED;
      if (data.simulatedProvider) contrib.paymentProvider = data.simulatedProvider;

      const prevRaised = camp.raisedAmount;
      camp.raisedAmount += contrib.amount;
      camp.backerCount += 1;
      camp.deliveredReach += contrib.reachFunded;

      emitFundingMilestones(camp.id, prevRaised, camp.raisedAmount, camp.targetAmount);

      if (camp.raisedAmount >= camp.targetAmount && camp.status === CampaignStatus.AVAILABLE_FOR_FUNDING) {
        camp.status = CampaignStatus.FUNDING_GOAL_REACHED;
        memoryActivities.unshift({
          id: `act-${Date.now()}-goal`,
          campaignId: camp.id,
          eventType: 'FUNDING_GOAL_REACHED',
          metadata: { totalRaised: camp.raisedAmount, backerCount: camp.backerCount },
          createdAt: now,
        });
      }

      memoryActivities.unshift({
        id: `act-${Date.now()}-contrib`,
        campaignId: camp.id,
        actorId: contrib.userId,
        eventType: 'CONTRIBUTION_RECEIVED',
        metadata: {
          amount: contrib.amount,
          currency: contrib.currency,
          reachFunded: contrib.reachFunded,
          backerName: contrib.backerName,
          receiptReference: contrib.receiptReference,
        },
        createdAt: now,
      });
    } else if (data.outcome === 'FAILED' || data.outcome === 'REJECTED') {
      contrib.paymentStatus = ContributionStatus.FAILED;
      if (data.simulatedProvider) contrib.paymentProvider = data.simulatedProvider;
      memoryActivities.unshift({
        id: `act-${Date.now()}-failed`,
        campaignId: camp.id,
        actorId: contrib.userId,
        eventType: 'CONTRIBUTION_FAILED',
        metadata: {
          reason: data.outcome === 'REJECTED' ? 'Payment rejected by test provider' : 'Payment simulation failed',
          receiptReference: contrib.receiptReference,
        },
        createdAt: now,
      });
    } else if (data.outcome === 'CANCELLED') {
      contrib.paymentStatus = ContributionStatus.CANCELLED;
      if (data.simulatedProvider) contrib.paymentProvider = data.simulatedProvider;
    }

    return {
      contribution: contrib,
      campaignTotals: {
        raisedAmount: camp.raisedAmount,
        targetAmount: camp.targetAmount,
        backerCount: camp.backerCount,
        status: camp.status,
      },
      message: `Simulated checkout processed: ${data.outcome}`,
    };
  },

  async getContributionsByUser(userId: string) {
    if (isPrismaConnected) {
      return prisma.contribution.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
    }
    return memoryContributions.filter(c => c.userId === userId);
  },

  async getContributionByReceipt(receiptReference: string) {
    if (isPrismaConnected) {
      return prisma.contribution.findUnique({
        where: { receiptReference },
      });
    }
    return memoryContributions.find(c => c.receiptReference === receiptReference) || null;
  },

  async getContributionByReference(receiptReference: string) {
    return this.getContributionByReceipt(receiptReference);
  },

  // Campaign Tracking & Following
  async followCampaign(userId: string, campaignId: string) {
    const camp = await this.getCampaignByIdOrSlug(campaignId);
    if (!camp) {
      throw new Error(`Campaign "${campaignId}" not found.`);
    }

    if (isPrismaConnected && (prisma as any).followedCampaign) {
      await (prisma as any).followedCampaign.upsert({
        where: {
          userId_campaignId: {
            userId,
            campaignId: camp.id,
          },
        },
        create: {
          userId,
          campaignId: camp.id,
        },
        update: {},
      });
      return { followed: true, campaignId: camp.id };
    }

    const existing = memoryFollows.find(f => f.userId === userId && f.campaignId === camp.id);
    if (!existing) {
      memoryFollows.push({ userId, campaignId: camp.id, createdAt: new Date() });
    }
    return { followed: true, campaignId: camp.id };
  },

  async unfollowCampaign(userId: string, campaignId: string) {
    const camp = await this.getCampaignByIdOrSlug(campaignId);
    const targetId = camp ? camp.id : campaignId;

    if (isPrismaConnected && (prisma as any).followedCampaign) {
      try {
        await (prisma as any).followedCampaign.delete({
          where: {
            userId_campaignId: {
              userId,
              campaignId: targetId,
            },
          },
        });
      } catch {
        // Safe to ignore if record does not exist
      }
      return { followed: false, campaignId: targetId };
    }

    memoryFollows = memoryFollows.filter(f => !(f.userId === userId && f.campaignId === targetId));
    return { followed: false, campaignId: targetId };
  },

  async isCampaignFollowed(userId: string, campaignId: string): Promise<boolean> {
    const camp = await this.getCampaignByIdOrSlug(campaignId);
    const targetId = camp ? camp.id : campaignId;

    if (isPrismaConnected && (prisma as any).followedCampaign) {
      const record = await (prisma as any).followedCampaign.findUnique({
        where: {
          userId_campaignId: {
            userId,
            campaignId: targetId,
          },
        },
      });
      return !!record;
    }

    return memoryFollows.some(f => f.userId === userId && f.campaignId === targetId);
  },

  async getFollowedCampaigns(userId: string) {
    if (isPrismaConnected && (prisma as any).followedCampaign) {
      const records = await (prisma as any).followedCampaign.findMany({
        where: { userId },
        include: { campaign: true },
        orderBy: { createdAt: 'desc' },
      });
      return records.map((r: any) => r.campaign);
    }

    const campaignIds = memoryFollows
      .filter(f => f.userId === userId)
      .map(f => f.campaignId);
    return memoryCampaigns.filter(c => campaignIds.includes(c.id));
  },

  // 6. Review Workflow, Dossier & Lifecycle Management
  async getReviewQueue(filters?: { status?: string; search?: string }) {
    let campaigns = [...memoryCampaigns];

    if (filters?.status && filters.status !== 'ALL') {
      const targetStatus = filters.status.toUpperCase();
      if (targetStatus === 'PENDING' || targetStatus === 'SUBMITTED_FOR_REVIEW') {
        campaigns = campaigns.filter(c => c.status === CampaignStatus.SUBMITTED_FOR_REVIEW);
      } else if (targetStatus === 'CHANGES_REQUESTED') {
        campaigns = campaigns.filter(c => c.status === CampaignStatus.CHANGES_REQUESTED);
      } else if (targetStatus === 'APPROVED') {
        campaigns = campaigns.filter(c => c.status === CampaignStatus.APPROVED);
      } else if (targetStatus === 'REJECTED') {
        campaigns = campaigns.filter(c => c.status === CampaignStatus.REJECTED);
      } else {
        campaigns = campaigns.filter(c => c.status === (targetStatus as CampaignStatus));
      }
    } else if (!filters?.status) {
      // By default, prioritize campaigns in active review pipelines
      campaigns = campaigns.filter(c =>
        ([
          CampaignStatus.SUBMITTED_FOR_REVIEW,
          CampaignStatus.CHANGES_REQUESTED,
          CampaignStatus.APPROVED,
          CampaignStatus.REJECTED,
        ] as CampaignStatus[]).includes(c.status)
      );
    }

    if (filters?.search && filters.search.trim()) {
      const q = filters.search.toLowerCase().trim();
      campaigns = campaigns.filter(
        c =>
          c.title.toLowerCase().includes(q) ||
          c.creatorName.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q)
      );
    }

    const now = new Date();
    return campaigns.map(c => {
      const subTime = c.submissionTimestamp ? new Date(c.submissionTimestamp) : new Date(c.createdAt || now);
      const ageHours = Math.max(0, (now.getTime() - subTime.getTime()) / (1000 * 60 * 60));
      const ageDays = Math.floor(ageHours / 24);

      const outstanding: string[] = [];
      if (!c.sources || c.sources.length === 0) {
        outstanding.push('Missing supporting evidence sources');
      }
      if (!c.adHeadline || !c.imageUrl) {
        outstanding.push('Incomplete advertising creative assets');
      }
      if (c.status === CampaignStatus.SUBMITTED_FOR_REVIEW) {
        outstanding.push('Awaiting factual editorial certification');
      } else if (c.status === CampaignStatus.CHANGES_REQUESTED) {
        outstanding.push('Awaiting creator revisions');
      }

      return {
        id: c.id,
        slug: c.slug,
        title: c.title,
        summary: c.summary,
        category: c.category,
        status: c.status,
        creatorId: c.creatorId || 'usr-creator-1',
        creatorName: c.creatorName,
        creatorType: c.creatorType,
        targetAmount: c.targetAmount,
        raisedAmount: c.raisedAmount,
        targetLocations: c.targetLocations,
        distributionChannels: c.distributionChannels,
        submissionTimestamp: c.submissionTimestamp || c.createdAt,
        ageDays,
        ageHours: Math.round(ageHours),
        sourceCount: c.sources ? c.sources.length : 0,
        outstandingRequirements: outstanding,
      };
    });
  },

  async getReviewDossier(campaignId: string) {
    const campaign = await this.getCampaignByIdOrSlug(campaignId);
    if (!campaign) {
      throw new AppError(`Campaign "${campaignId}" not found.`, 404);
    }

    // Source validation diagnostics with SSRF checks
    const sourceValidations = ((campaign as any).sources || []).map((src: any) => {
      const validation = validateSourceUrl(src.url);
      return {
        ...src,
        validation,
      };
    });

    // Creative pre-flight check
    const creativeValidation = validateCreatives({
      headline: campaign.adHeadline || '',
      description: campaign.adDescription || '',
      imageUrl: campaign.imageUrl || '',
    });

    // Distribution readiness gate check
    const gateCheck = distributionGate.validateDistributionPrerequisites(campaign as any);

    // Fee & media budgeting
    const netMediaAllocation = Math.floor(campaign.targetAmount * 0.95);
    const platformFee = Math.floor(campaign.targetAmount * 0.05);

    // Review decisions history
    const decisions = memoryReviewDecisions.filter(d => d.campaignId === campaign.id);

    return {
      campaign,
      creator: {
        id: campaign.creatorId || 'usr-creator-1',
        name: campaign.creatorName,
        type: (campaign as any).creatorType || 'COMMUNITY_ORGANIZER',
      },
      sourceValidations,
      creativeValidation,
      gateCheck,
      budgetAssumptions: {
        targetAmount: campaign.targetAmount,
        platformFee,
        netMediaAllocation,
        cpmPaise: 15000, // ₹150 CPM
        estimatedImpressions: Math.round((netMediaAllocation / 15000) * 1000),
      },
      policyAcknowledgements: {
        termsAccepted: true,
        civicAmplificationOnlyAcknowledged: true,
        factualAccuracyAffirmed: true,
      },
      reviewDecisions: decisions,
      activities: memoryActivities.filter(a => a.campaignId === campaign.id),
    };
  },

  async reviewCampaign(data: {
    campaignId: string;
    reviewerId: string;
    decision: 'APPROVED' | 'CHANGES_REQUESTED' | 'REJECTED';
    feedback: string;
    notes?: string;
  }) {
    const campaign = await this.getCampaignByIdOrSlug(data.campaignId);
    if (!campaign) {
      throw new AppError(`Campaign "${data.campaignId}" not found.`, 404);
    }

    // 1. Critical Authorization Guard: Creators CANNOT review or approve their own submissions
    if (campaign.creatorId && campaign.creatorId === data.reviewerId) {
      throw new AppError('Creators cannot review or approve their own campaigns.', 403);
    }

    // 2. Prevent duplicate decision submissions
    if (
      (data.decision === 'APPROVED' && campaign.status === CampaignStatus.APPROVED) ||
      (data.decision === 'CHANGES_REQUESTED' && campaign.status === CampaignStatus.CHANGES_REQUESTED) ||
      (data.decision === 'REJECTED' && campaign.status === CampaignStatus.REJECTED)
    ) {
      throw new AppError(`Campaign is already in ${campaign.status} status. Duplicate review decision rejected.`, 400);
    }

    // 3. Mandatory feedback verification
    if (data.decision === 'CHANGES_REQUESTED' && (!data.feedback || data.feedback.trim().length < 5)) {
      throw new AppError('Meaningful feedback is required when requesting changes.', 400);
    }
    if (data.decision === 'REJECTED' && (!data.feedback || data.feedback.trim().length < 5)) {
      throw new AppError('A valid rejection reason is required when rejecting a campaign.', 400);
    }

    let nextStatus: CampaignStatus;
    if (data.decision === 'APPROVED') {
      nextStatus = CampaignStatus.APPROVED;
    } else if (data.decision === 'CHANGES_REQUESTED') {
      nextStatus = CampaignStatus.CHANGES_REQUESTED;
    } else {
      nextStatus = CampaignStatus.REJECTED;
    }

    const transition = validateCampaignTransition(campaign.status, nextStatus, UserRole.ADMIN);
    if (!transition.valid) {
      throw new AppError(transition.reason || 'Illegal state transition.', 400);
    }

    campaign.status = nextStatus;
    const now = new Date();
    if (data.decision === 'APPROVED') {
      campaign.approvalTimestamp = now;
    }

    const decisionRecord: MemoryReviewDecision = {
      id: `rev-${Date.now()}`,
      campaignId: campaign.id,
      reviewerId: data.reviewerId,
      decision: data.decision,
      feedback: data.feedback,
      createdAt: now,
    };

    memoryReviewDecisions.push(decisionRecord);

    // Record immutable audit activity
    const activityEvent = `CAMPAIGN_${data.decision}`;
    memoryActivities.unshift({
      id: `act-${Date.now()}-rev`,
      campaignId: campaign.id,
      actorId: data.reviewerId,
      eventType: activityEvent,
      metadata: {
        decision: data.decision,
        feedback: data.feedback,
        reviewerId: data.reviewerId,
      },
      createdAt: now,
    });

    return { campaign, decision: decisionRecord };
  },

  async resubmitCampaign(campaignId: string, creatorId: string, updates?: any) {
    const campaign = await this.getCampaignByIdOrSlug(campaignId);
    if (!campaign) {
      throw new AppError(`Campaign "${campaignId}" not found.`, 404);
    }

    // Verify creator ownership
    if (campaign.creatorId && campaign.creatorId !== creatorId) {
      throw new AppError('Only the campaign creator can resubmit this campaign.', 403);
    }

    // Must be in CHANGES_REQUESTED or DRAFT to resubmit
    if (campaign.status !== CampaignStatus.CHANGES_REQUESTED && campaign.status !== CampaignStatus.DRAFT) {
      throw new AppError(`Cannot resubmit campaign with status "${campaign.status}". Must be CHANGES_REQUESTED or DRAFT.`, 400);
    }

    // Apply updates if provided
    if (updates) {
      if (updates.title) campaign.title = updates.title;
      if (updates.summary) campaign.summary = updates.summary;
      if (updates.storySections) campaign.storySections = updates.storySections;
      if (updates.sources) campaign.sources = updates.sources;
      if (updates.adHeadline) campaign.adHeadline = updates.adHeadline;
      if (updates.adDescription) campaign.adDescription = updates.adDescription;
      if (updates.imageUrl) campaign.imageUrl = updates.imageUrl;
    }

    campaign.status = CampaignStatus.SUBMITTED_FOR_REVIEW;
    const now = new Date();
    campaign.submissionTimestamp = now;
    campaign.updatedAt = now;

    memoryActivities.unshift({
      id: `act-${Date.now()}-resubmit`,
      campaignId: campaign.id,
      actorId: creatorId,
      eventType: 'CAMPAIGN_RESUBMITTED',
      metadata: { resubmittedAt: now.toISOString() },
      createdAt: now,
    });

    return campaign;
  },

  async publishCampaignForFunding(campaignId: string, actorId: string) {
    const campaign = await this.getCampaignByIdOrSlug(campaignId);
    if (!campaign) {
      throw new AppError(`Campaign "${campaignId}" not found.`, 404);
    }

    if (campaign.status !== CampaignStatus.APPROVED) {
      throw new AppError(
        `Cannot publish campaign for funding with status "${campaign.status}". Campaign must be in APPROVED status.`,
        400
      );
    }

    campaign.status = CampaignStatus.AVAILABLE_FOR_FUNDING;
    const now = new Date();
    campaign.updatedAt = now;

    memoryActivities.unshift({
      id: `act-${Date.now()}-pub`,
      campaignId: campaign.id,
      actorId,
      eventType: 'CAMPAIGN_PUBLISHED_FOR_FUNDING',
      metadata: { publishedAt: now.toISOString() },
      createdAt: now,
    });

    return campaign;
  },

  async authorizeDistribution(campaignId: string, actorId: string) {
    const campaign = await this.getCampaignByIdOrSlug(campaignId);
    if (!campaign) {
      throw new AppError(`Campaign "${campaignId}" not found.`, 404);
    }

    // Run distribution gate pre-flight check
    distributionGate.assertReadyForPreparation(campaign as any);

    campaign.status = CampaignStatus.DISTRIBUTION_PREPARATION;
    const now = new Date();
    campaign.updatedAt = now;

    memoryActivities.unshift({
      id: `act-${Date.now()}-dist-prep`,
      campaignId: campaign.id,
      actorId,
      eventType: 'CAMPAIGN_DISTRIBUTION_PREPARATION_STARTED',
      metadata: {
        netMediaAllocation: Math.floor(campaign.raisedAmount * 0.95),
        authorizedAt: now.toISOString(),
      },
      createdAt: now,
    });

    return campaign;
  },

  async startPromotion(campaignId: string, actorId: string) {
    const campaign = await this.getCampaignByIdOrSlug(campaignId);
    if (!campaign) {
      throw new AppError(`Campaign "${campaignId}" not found.`, 404);
    }

    if (
      campaign.status !== CampaignStatus.DISTRIBUTION_PREPARATION &&
      campaign.status !== CampaignStatus.FUNDING_GOAL_REACHED
    ) {
      throw new AppError(
        `Cannot start promotion for campaign with status "${campaign.status}". Must be in DISTRIBUTION_PREPARATION.`,
        400
      );
    }

    distributionGate.assertReadyForPreparation(campaign as any);

    campaign.status = CampaignStatus.PROMOTING;
    const now = new Date();
    (campaign as any).distributionTimestamp = now;
    campaign.updatedAt = now;

    memoryActivities.unshift({
      id: `act-${Date.now()}-promo`,
      campaignId: campaign.id,
      actorId,
      eventType: 'CAMPAIGN_PROMOTION_STARTED',
      metadata: {
        channels: campaign.distributionChannels,
        simulated: true,
        startedAt: now.toISOString(),
      },
      createdAt: now,
    });

    return campaign;
  },

  async cancelCampaign(campaignId: string, actorId: string, reason: string) {
    const campaign = await this.getCampaignByIdOrSlug(campaignId);
    if (!campaign) {
      throw new AppError(`Campaign "${campaignId}" not found.`, 404);
    }

    if (
      campaign.status === CampaignStatus.PROMOTING ||
      campaign.status === CampaignStatus.COMPLETED ||
      campaign.status === CampaignStatus.CANCELLED ||
      campaign.status === CampaignStatus.FAILED
    ) {
      throw new AppError(`Campaign cannot be cancelled in "${campaign.status}" state.`, 400);
    }

    const previousStatus = campaign.status;
    const hasFunds = campaign.raisedAmount > 0;
    // If contributions have already been collected, transition to REFUND_PENDING
    campaign.status = hasFunds ? CampaignStatus.REFUND_PENDING : CampaignStatus.CANCELLED;
    const now = new Date();
    campaign.updatedAt = now;

    memoryActivities.unshift({
      id: `act-${Date.now()}-cancel`,
      campaignId: campaign.id,
      actorId,
      eventType: 'CAMPAIGN_CANCELLED',
      metadata: {
        reason: reason || 'Campaign cancelled by organizer.',
        previousStatus,
        raisedAmount: campaign.raisedAmount,
        refundRequired: hasFunds,
      },
      createdAt: now,
    });

    return campaign;
  },

  async processRefunds(campaignId: string, actorId: string) {
    const campaign = await this.getCampaignByIdOrSlug(campaignId);
    if (!campaign) {
      throw new AppError(`Campaign "${campaignId}" not found.`, 404);
    }

    const contributions = memoryContributions.filter(c => c.campaignId === campaign.id);
    let totalRefunded = 0;
    let refundedCount = 0;
    const now = new Date();

    for (const c of contributions) {
      if (c.paymentStatus === ContributionStatus.SUCCEEDED) {
        c.paymentStatus = ContributionStatus.REFUNDED;
        totalRefunded += c.totalCharged;
        refundedCount++;
      }
    }

    campaign.status = CampaignStatus.FAILED;
    campaign.updatedAt = now;

    memoryActivities.unshift({
      id: `act-${Date.now()}-refunds`,
      campaignId: campaign.id,
      actorId,
      eventType: 'CAMPAIGN_REFUNDS_COMPLETED',
      metadata: {
        refundedCount,
        totalRefunded,
        processedAt: now.toISOString(),
      },
      createdAt: now,
    });

    return {
      campaign,
      refundedCount,
      totalRefunded,
      preservedContributionRecordsCount: contributions.length,
    };
  },

  // 7. Activities & Notifications Center
  async getRecentActivities(limit = 20) {
    return memoryActivities.slice(0, limit);
  },

  async getActivities(userId?: string, limit = 50) {
    const list = memoryActivities.slice(0, limit);
    const now = new Date();

    const enriched = list.map(act => {
      const isRead = userId ? memoryReadActivities.has(`${userId}:${act.id}`) : false;
      const actDate = new Date(act.createdAt);
      const diffHours = (now.getTime() - actDate.getTime()) / (1000 * 60 * 60);

      let period = 'Past Activity';
      if (diffHours < 24 && actDate.getDate() === now.getDate()) {
        period = 'Today';
      } else if (diffHours < 48) {
        period = 'Yesterday';
      } else if (diffHours < 168) {
        period = 'Earlier This Week';
      }

      return {
        ...act,
        isRead,
        period,
      };
    });

    const unreadCount = enriched.filter(e => !e.isRead).length;

    return {
      activities: enriched,
      unreadCount,
    };
  },

  async markActivityRead(activityId: string, userId: string) {
    memoryReadActivities.add(`${userId}:${activityId}`);
    return { success: true, activityId, isRead: true };
  },

  async markAllActivitiesRead(userId: string) {
    for (const act of memoryActivities) {
      memoryReadActivities.add(`${userId}:${act.id}`);
    }
    return { success: true, markedCount: memoryActivities.length };
  },

  async getNotificationPreferences(userId: string) {
    return memoryPreferences[userId] || {
      userId,
      milestoneAlerts: true,
      contributionAlerts: true,
      moderationAlerts: true,
      weeklyDigest: false,
    };
  },

  async updateNotificationPreferences(userId: string, prefs: any) {
    const current = await this.getNotificationPreferences(userId);
    memoryPreferences[userId] = {
      ...current,
      ...prefs,
      userId,
    };
    return memoryPreferences[userId];
  },

  // 8. Campaign Updates
  async getCampaignUpdates(campaignId: string) {
    return memoryCampaignUpdates.filter(u => u.campaignId === campaignId);
  },

  async addCampaignUpdate(campaignId: string, data: { title: string; content: string; impressions?: number; channels?: string[] }) {
    const newUpdate = {
      id: `upd-${campaignId}-${Date.now()}`,
      campaignId,
      title: data.title,
      content: data.content,
      impressions: data.impressions || 0,
      channels: data.channels || ['Civic Media Network'],
      postedAt: new Date(),
    };
    memoryCampaignUpdates.unshift(newUpdate);
    return newUpdate;
  },

  // 9. Creator Dashboard
  async getCreatorDashboard(userId: string, _isAnonymous = false) {
    let campaignsList: SeedCampaign[];
    if (isPrismaConnected) {
      campaignsList = await prisma.campaign.findMany({
        where: { creatorId: userId },
        orderBy: { updatedAt: 'desc' },
        include: { report: true, reviewDecisions: true },
      }) as any;
    } else {
      campaignsList = memoryCampaigns.filter(c => c.creatorId === userId);
    }

    // Get user's drafts
    const drafts = await this.getDraftsByOwner(userId, userId);

    // Mutually exclusive status counts
    let draftsCount = drafts.length;
    let underReviewCount = 0;
    let availableForFundingCount = 0;
    let promotingCount = 0;
    let completedCount = 0;
    let requiresActionCount = 0;

    for (const c of campaignsList) {
      switch (c.status) {
        case CampaignStatus.SUBMITTED_FOR_REVIEW:
          underReviewCount++;
          break;
        case CampaignStatus.APPROVED:
        case CampaignStatus.AVAILABLE_FOR_FUNDING:
        case CampaignStatus.FUNDING_GOAL_REACHED:
        case CampaignStatus.FUNDING_PERIOD_ENDED:
          availableForFundingCount++;
          break;
        case CampaignStatus.DISTRIBUTION_PREPARATION:
        case CampaignStatus.PROMOTING:
          promotingCount++;
          break;
        case CampaignStatus.COMPLETED:
          completedCount++;
          break;
        case CampaignStatus.CHANGES_REQUESTED:
        case CampaignStatus.REJECTED:
        case CampaignStatus.CANCELLED:
        case CampaignStatus.FAILED:
        case CampaignStatus.REFUND_PENDING:
          requiresActionCount++;
          break;
        default:
          break;
      }
    }

    const totalCreated = campaignsList.length + draftsCount;

    const formattedCampaigns = campaignsList.map(c => {
      const feedback = memoryReviewDecisions.filter(r => r.campaignId === c.id);
      const progressPct = c.targetAmount > 0 ? Math.min(100, Math.round((c.raisedAmount / c.targetAmount) * 100)) : 0;

      let allowedActions: string[] = [];
      if (c.status === CampaignStatus.DRAFT) {
        allowedActions = ['edit', 'preview', 'delete', 'resume'];
      } else if (c.status === CampaignStatus.SUBMITTED_FOR_REVIEW) {
        allowedActions = ['view_submitted', 'view_status'];
      } else if (c.status === CampaignStatus.CHANGES_REQUESTED) {
        allowedActions = ['inspect_feedback', 'edit_fields', 'resubmit'];
      } else if (c.status === CampaignStatus.AVAILABLE_FOR_FUNDING || c.status === CampaignStatus.FUNDING_GOAL_REACHED) {
        allowedActions = ['preview', 'share', 'view_progress', 'view_analytics', 'view_activity'];
      } else if (c.status === CampaignStatus.PROMOTING || c.status === CampaignStatus.DISTRIBUTION_PREPARATION) {
        allowedActions = ['inspect_promotion', 'view_metrics', 'view_analytics', 'view_updates'];
      } else if (c.status === CampaignStatus.COMPLETED) {
        allowedActions = ['open_report', 'inspect_results', 'share_report', 'view_analytics'];
      } else {
        allowedActions = ['view_status_reason'];
      }

      return {
        id: c.id,
        slug: c.slug,
        title: c.title,
        tagLine: c.tagLine,
        category: c.category,
        imageUrl: c.imageUrl,
        status: c.status,
        targetAmount: c.targetAmount,
        raisedAmount: c.raisedAmount,
        fundingPercentage: progressPct,
        backerCount: c.backerCount,
        estimatedImpressions: c.estimatedReach,
        daysLeft: c.daysLeft,
        durationDays: c.durationDays,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        allowedActions,
        moderationFeedback: feedback.length > 0 ? feedback[feedback.length - 1] : null,
        hasReport: c.status === CampaignStatus.COMPLETED || !!c.report,
      };
    });

    return {
      overview: {
        totalCreated,
        draftsCount,
        underReviewCount,
        availableForFundingCount,
        promotingCount,
        completedCount,
        requiresActionCount,
      },
      campaigns: formattedCampaigns,
      drafts,
    };
  },

  // 10. Campaign Analytics
  async getCampaignAnalytics(campaignId: string) {
    const campaign = await this.getCampaignByIdOrSlug(campaignId);
    if (!campaign) {
      throw new Error(`Campaign "${campaignId}" not found.`);
    }

    const targetAmount = campaign.targetAmount;
    const raisedAmount = campaign.raisedAmount;
    const fundingPercentage = targetAmount > 0 ? Math.round((raisedAmount / targetAmount) * 100) : 0;
    const backerCount = campaign.backerCount;
    const averageContribution = backerCount > 0 ? Math.round(raisedAmount / backerCount) : 0;
    const platformFees = Math.round(raisedAmount * 0.05); // 5% escrow and operations fee
    const netAdvertisingBudget = raisedAmount - platformFees; // 95% media allocation

    let advertisingSpend = 0;
    if (campaign.report?.advertisingSpend) {
      advertisingSpend = campaign.report.advertisingSpend;
    } else if (campaign.status === CampaignStatus.COMPLETED) {
      advertisingSpend = netAdvertisingBudget;
    } else if (campaign.status === CampaignStatus.PROMOTING) {
      advertisingSpend = Math.round(netAdvertisingBudget * 0.65);
    } else {
      advertisingSpend = 0; // Not yet launched
    }
    const unspentBudget = Math.max(0, netAdvertisingBudget - advertisingSpend);

    const estimatedImpressions = campaign.estimatedReach;
    const actualImpressions = campaign.report?.impressions || (
      campaign.status === CampaignStatus.PROMOTING || campaign.status === CampaignStatus.COMPLETED
        ? campaign.deliveredReach
        : null
    );
    const estimatedReach = campaign.estimatedReach;
    const measuredReach = campaign.report?.measuredReach || (
      campaign.status === CampaignStatus.COMPLETED
        ? Math.round(campaign.deliveredReach / 1.35)
        : null
    );
    const clicks = campaign.report?.clicks || (
      actualImpressions && actualImpressions > 0
        ? Math.round(actualImpressions * 0.024)
        : null
    );

    let clickThroughRate: number | null = null;
    if (actualImpressions !== null && actualImpressions > 0 && clicks !== null) {
      clickThroughRate = Number(((clicks / actualImpressions) * 100).toFixed(2));
    }

    const reportingStatus = campaign.status === CampaignStatus.COMPLETED
      ? 'FINAL'
      : campaign.status === CampaignStatus.PROMOTING
      ? 'IN_PROGRESS'
      : 'PENDING_DEPLOYMENT';

    const durationText = `${campaign.durationDays} days (${campaign.daysLeft > 0 ? `${campaign.daysLeft} days remaining` : 'Ended'})`;

    const metricDefinitions = {
      fundingReceived: 'Gross funds contributed by citizen backers via verified escrow.',
      platformFees: 'Authoritative 5% fee covering escrow custody, trust verification, and ad server infrastructure.',
      advertisingBudgetAllocated: 'Net 95% of contributions committed directly to purchasing digital and local media space.',
      advertisingSpend: 'Actual media dollars deployed to ad networks for verified impressions.',
      unspentBudget: 'Allocated budget awaiting subsequent placement flights or subject to escrow return policy.',
      estimatedImpressions: 'Projected ad views based on baseline CPM benchmarks prior to distribution completion.',
      actualImpressions: 'Verified ad impressions recorded by third-party ad serving infrastructure.',
      estimatedReach: 'Projected unique individuals exposed to the amplified message.',
      measuredReach: 'De-duplicated unique individuals reached, verified through post-campaign measurement.',
      clicks: 'Interactions where viewers tapped the public awareness alert to inspect sources or take civic action.',
      clickThroughRate: 'Percentage of viewers who actively clicked to learn more (Clicks ÷ Impressions × 100).',
    };

    return {
      campaign: {
        id: campaign.id,
        slug: campaign.slug,
        title: campaign.title,
        category: campaign.category,
        status: campaign.status,
        imageUrl: campaign.imageUrl,
        trustScore: campaign.trustScore,
        trustCategory: campaign.trustCategory,
      },
      fundingMetrics: {
        targetAmount,
        raisedAmount,
        fundingPercentage,
        backerCount,
        averageContribution,
        platformFees,
        netAdvertisingBudget,
        advertisingSpend,
        unspentBudget,
      },
      distributionMetrics: {
        estimatedImpressions,
        actualImpressions,
        estimatedReach,
        measuredReach,
        clicks,
        clickThroughRate,
        reportingStatus,
        campaignDuration: durationText,
      },
      metricDefinitions,
    };
  },

  // 11. Final Distribution Report
  async getCampaignReport(campaignId: string) {
    const analytics = await this.getCampaignAnalytics(campaignId);
    const campaign = await this.getCampaignByIdOrSlug(campaignId);
    const updates = await this.getCampaignUpdates(campaignId);

    return {
      campaignId: campaign!.id,
      title: campaign!.title,
      tagLine: campaign!.tagLine,
      category: campaign!.category,
      status: campaign!.status,
      reportingPeriod: `${new Date(campaign!.createdAt || Date.now()).toLocaleDateString()} — ${new Date().toLocaleDateString()}`,
      isDemonstrationReport: true,
      demonstrationNotice: 'Simulated demonstration report. Metrics represent mock ad distribution telemetry for evaluation purposes.',
      verifiedDelivery: {
        actualImpressions: analytics.distributionMetrics.actualImpressions,
        measuredReach: analytics.distributionMetrics.measuredReach,
        clicks: analytics.distributionMetrics.clicks,
        clickThroughRate: analytics.distributionMetrics.clickThroughRate,
        advertisingSpend: analytics.fundingMetrics.advertisingSpend,
      },
      estimatedMetrics: {
        estimatedReach: analytics.distributionMetrics.estimatedReach,
        estimatedImpressions: analytics.distributionMetrics.estimatedImpressions,
        projectedFundingGoal: analytics.fundingMetrics.targetAmount,
      },
      financialAccounting: {
        totalRaised: analytics.fundingMetrics.raisedAmount,
        platformFees: analytics.fundingMetrics.platformFees,
        advertisingBudgetAllocated: analytics.fundingMetrics.netAdvertisingBudget,
        advertisingSpend: analytics.fundingMetrics.advertisingSpend,
        unspentBudget: analytics.fundingMetrics.unspentBudget,
        unspentPolicyStatus: analytics.fundingMetrics.unspentBudget > 0
          ? 'Reserved for follow-up civic advocacy placements'
          : 'Fully deployed to verified ad media',
      },
      updates,
      summaryOutcome: campaign!.status === CampaignStatus.COMPLETED
        ? 'The message amplification goal was achieved. High-impact alerts reached targeted citizens, prompting direct civic engagement.'
        : campaign!.status === CampaignStatus.PROMOTING
        ? 'Distribution is actively ongoing across selected public interest media networks.'
        : 'Campaign is currently in citizen funding phase; advertising delivery begins once certified.',
      metricDefinitions: analytics.metricDefinitions,
    };
  },
};
