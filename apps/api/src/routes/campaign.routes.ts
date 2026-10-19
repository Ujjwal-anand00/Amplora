import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { dbStore } from '../services/dbStore.js';
import { optionalAuth, authenticate } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { isCampaignPubliclyDiscoverable } from '../lib/stateMachine.js';
import { CampaignStatus } from '@prisma/client';

const router = Router();

const querySchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  status: z.nativeEnum(CampaignStatus).optional(),
  sort: z.enum(['recommended', 'most_funded', 'ending_soon', 'newest']).optional(),
  limit: z.string().optional().transform(v => (v ? Math.min(50, Math.max(1, parseInt(v, 10))) : 20)),
  offset: z.string().optional().transform(v => (v ? Math.max(0, parseInt(v, 10)) : 0)),
});

// GET /api/campaigns
router.get('/', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = querySchema.parse(req.query);
    const result = await dbStore.getCampaigns({
      search: query.search,
      category: query.category,
      status: query.status,
      sort: query.sort,
      limit: query.limit,
      offset: query.offset,
      publicOnly: true,
    });

    res.json({
      success: true,
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      data: result.campaigns,
      campaigns: result.campaigns,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/campaigns/my (Creator's own campaigns and dashboard overview)
router.get('/my', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dashboard = await dbStore.getCreatorDashboard(req.user!.id, req.user!.isAnonymous);
    res.json({
      success: true,
      data: dashboard.campaigns,
      total: dashboard.campaigns.length,
      overview: dashboard.overview,
      drafts: dashboard.drafts,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/campaigns/mine (Alias for authenticated user's authored campaigns)
router.get('/mine', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dashboard = await dbStore.getCreatorDashboard(req.user!.id, req.user!.isAnonymous);
    res.json({
      success: true,
      data: dashboard.campaigns,
      total: dashboard.campaigns.length,
      overview: dashboard.overview,
      drafts: dashboard.drafts,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/campaigns/:id
router.get('/:id', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const campaign = await dbStore.getCampaignByIdOrSlug(req.params.id);
    if (!campaign) {
      throw new AppError(`Campaign "${req.params.id}" not found.`, 404);
    }

    // Guard: Only public or owner/reviewer can view non-public campaigns
    const isPublic = isCampaignPubliclyDiscoverable(campaign.status);
    const isOwner = req.user?.id && campaign.creatorId === req.user.id;
    const isAdmin = req.user?.role === 'ADMIN';

    if (!isPublic && !isOwner && !isAdmin) {
      throw new AppError('This campaign is currently in review and not yet publicly discoverable.', 403);
    }

    res.json({
      success: true,
      data: campaign,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/campaigns/:id/status (Lifecycle timeline)
router.get('/:id/status', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const campaign = await dbStore.getCampaignByIdOrSlug(req.params.id);
    if (!campaign) {
      throw new AppError(`Campaign "${req.params.id}" not found.`, 404);
    }

    const timeline = [
      {
        stage: 1,
        title: 'Campaign Submitted',
        description: 'Structured claims and verifiable evidence received.',
        status: 'COMPLETED',
        timestamp: campaign.submissionTimestamp || campaign.createdAt,
      },
      {
        stage: 2,
        title: 'Content & Primary Source Review',
        description: 'Independent fact-checkers verify deed registries and government records.',
        status: campaign.status === 'SUBMITTED_FOR_REVIEW' ? 'IN_PROGRESS' : 'COMPLETED',
      },
      {
        stage: 3,
        title: 'Certification & Approval',
        description: 'Universal Trust Standard clearance granted.',
        status: ['APPROVED', 'AVAILABLE_FOR_FUNDING', 'FUNDING_GOAL_REACHED', 'PROMOTING', 'COMPLETED'].includes(campaign.status)
          ? 'COMPLETED'
          : 'UPCOMING',
        timestamp: campaign.approvalTimestamp,
      },
      {
        stage: 4,
        title: 'Community Funding Launch',
        description: 'Published to Explore feed for citizen ad pool contributions.',
        status: ['AVAILABLE_FOR_FUNDING', 'FUNDING_GOAL_REACHED', 'PROMOTING', 'COMPLETED'].includes(campaign.status)
          ? 'COMPLETED'
          : 'UPCOMING',
      },
      {
        stage: 5,
        title: 'Ad Creative & Channel Setup',
        description: 'Placements reserved with media networks, escrow funded.',
        status: ['DISTRIBUTION_PREPARATION', 'PROMOTING', 'COMPLETED'].includes(campaign.status) ? 'COMPLETED' : 'UPCOMING',
      },
      {
        stage: 6,
        title: 'Targeted Promotion Live',
        description: 'Verified public awareness messages broadcast to target citizens.',
        status: campaign.status === 'PROMOTING' ? 'IN_PROGRESS' : campaign.status === 'COMPLETED' ? 'COMPLETED' : 'UPCOMING',
      },
    ];

    res.json({
      success: true,
      campaignId: campaign.id,
      currentStatus: campaign.status,
      trustScore: campaign.trustScore,
      trustCategory: campaign.trustCategory,
      timeline,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/campaigns/:id/analytics (Creator funding & ad delivery metrics)
router.get('/:id/analytics', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const campaign = await dbStore.getCampaignByIdOrSlug(req.params.id);
    if (!campaign) {
      throw new AppError(`Campaign "${req.params.id}" not found.`, 404);
    }

    const isPublic = isCampaignPubliclyDiscoverable(campaign.status);
    const isOwner = req.user?.id && (campaign.creatorId === req.user.id || req.user.isAnonymous);
    const isAdmin = req.user?.role === 'ADMIN';

    if (!isPublic && !isOwner && !isAdmin) {
      throw new AppError('Analytics are private to the campaign creator and administrators.', 403);
    }

    const analytics = await dbStore.getCampaignAnalytics(campaign.id);
    res.json({
      success: true,
      data: analytics,
      analytics,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/campaigns/:id/report (Final distribution report separating estimated from measured)
router.get('/:id/report', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const campaign = await dbStore.getCampaignByIdOrSlug(req.params.id);
    if (!campaign) {
      throw new AppError(`Campaign "${req.params.id}" not found.`, 404);
    }

    const report = await dbStore.getCampaignReport(campaign.id);
    res.json({
      success: true,
      campaignId: campaign.id,
      report,
      data: report,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/campaigns/:id/updates (Timeline of distribution updates)
router.get('/:id/updates', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const campaign = await dbStore.getCampaignByIdOrSlug(req.params.id);
    if (!campaign) {
      throw new AppError(`Campaign "${req.params.id}" not found.`, 404);
    }

    const updates = await dbStore.getCampaignUpdates(campaign.id);
    res.json({
      success: true,
      data: updates,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/campaigns/:id/updates (Creator posting an amplification update)
router.post('/:id/updates', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const campaign = await dbStore.getCampaignByIdOrSlug(req.params.id);
    if (!campaign) {
      throw new AppError(`Campaign "${req.params.id}" not found.`, 404);
    }

    const isOwner = campaign.creatorId === req.user!.id || req.user!.isAnonymous;
    const isAdmin = req.user!.role === 'ADMIN';
    if (!isOwner && !isAdmin) {
      throw new AppError('Only the campaign creator or authorized administrators can post updates.', 403);
    }

    const { title, content, impressions, channels } = req.body;
    if (!title || !content) {
      throw new AppError('Title and content are required for campaign updates.', 400);
    }

    const update = await dbStore.addCampaignUpdate(campaign.id, {
      title,
      content,
      impressions: typeof impressions === 'number' ? impressions : 0,
      channels: Array.isArray(channels) ? channels : undefined,
    });

    res.status(201).json({
      success: true,
      data: update,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/campaigns/:id/resubmit (Creator addressing feedback and resubmitting)
router.post('/:id/resubmit', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await dbStore.resubmitCampaign(req.params.id, req.user!.id, req.body);
    res.json({
      success: true,
      message: 'Campaign resubmitted for editorial and factual review.',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/campaigns/:id/publish-funding (Publish certified campaign to public funding feed)
router.post('/:id/publish-funding', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await dbStore.publishCampaignForFunding(req.params.id, req.user!.id);
    res.json({
      success: true,
      message: 'Campaign is now open and available for community backer funding.',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/campaigns/:id/authorize-distribution (Evaluate distribution gate & prepare inventory)
router.post('/:id/authorize-distribution', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await dbStore.authorizeDistribution(req.params.id, req.user!.id);
    res.json({
      success: true,
      message: 'Campaign distribution prerequisites verified and pre-flight inventory reserved.',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/campaigns/:id/start-promotion (Launch live simulated ad distribution)
router.post('/:id/start-promotion', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await dbStore.startPromotion(req.params.id, req.user!.id);
    res.json({
      success: true,
      message: 'Targeted civic advertisement promotion has commenced across verified channels.',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/campaigns/:id/cancel (Cancel campaign prior to promotion)
router.post('/:id/cancel', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reason = typeof req.body.reason === 'string' ? req.body.reason : 'Cancelled by organizer.';
    const updated = await dbStore.cancelCampaign(req.params.id, req.user!.id, reason);
    res.json({
      success: true,
      message: `Campaign cancelled. Current status: ${updated.status}.`,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/campaigns/:id/process-refunds (Process backer refunds while preserving contribution history)
router.post('/:id/process-refunds', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await dbStore.processRefunds(req.params.id, req.user!.id);
    res.json({
      success: true,
      message: `Successfully processed refunds for ${result.refundedCount} backer contributions. History preserved.`,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
