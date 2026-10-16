import { INITIAL_CAMPAIGNS, CampaignEntity } from '../data/mockCampaigns.js';
import { CreateCampaignInput, BackCampaignInput, QueryCampaignsInput } from '../schemas/campaign.schema.js';

// In-memory runtime state (with Prisma readiness)
let campaignsStore: CampaignEntity[] = [...INITIAL_CAMPAIGNS];

export class CampaignService {
  /**
   * List campaigns with filtering, search and sorting
   */
  async getCampaigns(query: QueryCampaignsInput) {
    let result = [...campaignsStore];

    if (query.category && query.category.toLowerCase() !== 'all') {
      result = result.filter(
        c => c.category.toLowerCase() === query.category!.toLowerCase()
      );
    }

    if (query.search && query.search.trim() !== '') {
      const q = query.search.toLowerCase().trim();
      result = result.filter(
        c =>
          c.title.toLowerCase().includes(q) ||
          c.tagLine.toLowerCase().includes(q) ||
          c.narrative.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q)
      );
    }

    // Sorting
    switch (query.sort) {
      case 'nearly_funded':
        result.sort((a, b) => (b.raisedAmount / b.targetAmount) - (a.raisedAmount / a.targetAmount));
        break;
      case 'trust_score':
        result.sort((a, b) => b.trustScore - a.trustScore);
        break;
      case 'newest':
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'trending':
      default:
        result.sort((a, b) => b.backerCount - a.backerCount);
        break;
    }

    return {
      total: result.length,
      limit: query.limit,
      offset: query.offset,
      campaigns: result.slice(query.offset, query.offset + query.limit),
    };
  }

  /**
   * Get single campaign by ID or Slug
   */
  async getCampaignById(idOrSlug: string) {
    const campaign = campaignsStore.find(c => c.id === idOrSlug || c.slug === idOrSlug);
    if (!campaign) {
      throw new Error(`Campaign with id or slug "${idOrSlug}" not found`);
    }
    return campaign;
  }

  /**
   * Create a new campaign
   */
  async createCampaign(input: CreateCampaignInput): Promise<CampaignEntity> {
    const reachMultiplier = 27.0; // Benchmark: $1 = ~27 targeted impressions
    const estimatedReach = Math.round(input.targetAmount * reachMultiplier);
    const slug = input.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '') + '-' + Math.floor(Math.random() * 1000);

    const newCampaign: CampaignEntity = {
      id: `camp-${Date.now()}`,
      title: input.title,
      slug,
      tagLine: input.tagLine,
      narrative: input.narrative,
      category: input.category,
      targetAmount: input.targetAmount,
      raisedAmount: 0,
      backerCount: 0,
      reachMultiplier,
      estimatedReach,
      deliveredReach: 0,
      trustScore: 92, // Initial high baseline under review
      trustCategory: 'Gold Standard',
      status: 'ACTIVE',
      targetAudience: input.targetAudience,
      adChannels: input.adChannels,
      imageUrl: input.imageUrl || 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=80',
      daysLeft: 14,
      creator: {
        id: `usr-${Date.now()}`,
        name: input.creatorName || 'Community Advocate',
        avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
        verified: true,
      },
      createdAt: new Date().toISOString(),
    };

    campaignsStore.unshift(newCampaign);
    return newCampaign;
  }

  /**
   * Fund/Back campaign amplification
   */
  async backCampaign(input: BackCampaignInput) {
    const campaign = campaignsStore.find(c => c.id === input.campaignId);
    if (!campaign) {
      throw new Error(`Campaign "${input.campaignId}" not found`);
    }

    const reachFunded = Math.round(input.amount * campaign.reachMultiplier);
    campaign.raisedAmount += input.amount;
    campaign.backerCount += 1;
    campaign.deliveredReach += Math.round(reachFunded * 0.8); // initial deployment

    if (campaign.raisedAmount >= campaign.targetAmount) {
      campaign.status = 'FULLY_AMPLIFIED';
    }

    return {
      success: true,
      contribution: {
        id: `cntr-${Date.now()}`,
        campaignId: campaign.id,
        amount: input.amount,
        reachFunded,
        backerName: input.isAnonymous ? 'Anonymous Advocate' : input.backerName,
        createdAt: new Date().toISOString(),
      },
      updatedCampaign: campaign,
    };
  }

  /**
   * Aggregate platform stats
   */
  async getPlatformMetrics() {
    const totalRaised = campaignsStore.reduce((acc, c) => acc + c.raisedAmount, 0);
    const totalReachFunded = Math.round(totalRaised * 27.0);
    const totalBackers = campaignsStore.reduce((acc, c) => acc + c.backerCount, 0);
    const avgTrustScore = Math.round(
      campaignsStore.reduce((acc, c) => acc + c.trustScore, 0) / (campaignsStore.length || 1)
    );

    return {
      totalRaised,
      totalReachFunded,
      totalBackers,
      avgTrustScore,
      activeCampaignsCount: campaignsStore.filter(c => c.status === 'ACTIVE').length,
      reachPerDollarRatio: 27.0,
      cpmBenchmark: 37.04, // $37 per 1,000 views outside network
    };
  }
}

export const campaignService = new CampaignService();
