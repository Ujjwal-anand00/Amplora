import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { dbStore } from '../services/dbStore.js';
import { optionalAuth, authenticate } from '../middleware/auth.js';
import { createRateLimiter } from '../middleware/rateLimiter.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();
const contributionLimiter = createRateLimiter({ maxRequests: 40, windowMs: 60 * 1000 });

const contributionInputSchema = z.object({
  amount: z.number().int().positive('Contribution amount must be a positive integer in minor units'),
  currency: z.enum(['INR', 'USD']).optional().default('USD'),
  backerName: z.string().min(2, 'Backer name is required'),
  backerEmail: z.string().email().optional(),
  isAnonymous: z.boolean().optional(),
  supportNote: z.string().max(250).optional(),
  paymentMethodId: z.string().optional(),
  status: z.enum(['PENDING', 'SUCCEEDED', 'FAILED', 'CANCELLED']).optional(),
});

const checkoutInputSchema = z.object({
  outcome: z.enum(['SUCCEEDED', 'PENDING', 'REJECTED', 'FAILED', 'CANCELLED']),
  simulatedProvider: z.string().optional(),
});

// Helper for fee preview
const handlePreviewFees = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const amountStr = req.query.amount as string;
    const currency = (req.query.currency as 'INR' | 'USD') || 'USD';
    const amount = parseInt(amountStr, 10);


    if (isNaN(amount) || amount <= 0) {
      throw new AppError('Valid positive integer amount (in minor units) is required for fee preview.', 400);
    }

    const campaign = await dbStore.getCampaignByIdOrSlug(req.params.id);
    if (!campaign) {
      throw new AppError(`Campaign "${req.params.id}" not found.`, 404);
    }

    const breakdown = await dbStore.previewFeeBreakdown(amount, currency);

    res.json({
      success: true,
      campaignId: campaign.id,
      campaignTitle: campaign.title,
      campaignStatus: campaign.status,
      isEligibleForFunding:
        campaign.status === 'AVAILABLE_FOR_FUNDING' || campaign.status === 'FUNDING_GOAL_REACHED',
      breakdown,
    });
  } catch (err) {
    next(err);
  }
};

// Helper for creating pending contribution
const handleCreateContribution = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = contributionInputSchema.parse(req.body);
    const campaign = await dbStore.getCampaignByIdOrSlug(req.params.id);
    if (!campaign) {
      throw new AppError(`Campaign "${req.params.id}" not found.`, 404);
    }

    // Eligibility check
    if (
      campaign.status !== 'AVAILABLE_FOR_FUNDING' &&
      campaign.status !== 'FUNDING_GOAL_REACHED'
    ) {
      throw new AppError(
        `Campaign is in "${campaign.status}" state and cannot accept contributions. Only campaigns in funding phases can be backed.`,
        400
      );
    }

    // Prevent self-backing if user is campaign creator
    if (req.user?.id && campaign.creatorId === req.user.id) {
      throw new AppError('Creators cannot contribute to their own campaign under platform rules.', 400);
    }

    const initialStatus =
      input.status ||
      (input.paymentMethodId ? ('SUCCEEDED' as any) : ('PENDING' as any));

    // Create contribution
    const result = await dbStore.createContribution({
      campaignId: campaign.id,
      userId: req.user?.id,
      amount: input.amount,
      currency: input.currency,
      backerName: input.backerName,
      backerEmail: input.backerEmail,
      isAnonymous: input.isAnonymous,
      supportNote: input.supportNote,
      paymentProvider: input.paymentMethodId || 'simulated_escrow',
      initialStatus,
    });

    const receiptData = {
      receiptReference: result.contribution.receiptReference,
      amount: result.contribution.amount,
      currency: result.contribution.currency,
      platformFee: result.contribution.platformFee,
      netMediaAmount: result.contribution.netMediaAmount,
      estimatedCitizenReach: result.feeBreakdown.estimatedUniqueReach,
      backerName: result.contribution.backerName,
      createdAt: result.contribution.createdAt,
    };

    res.status(201).json({
      success: true,
      message:
        initialStatus === 'SUCCEEDED'
          ? 'Contribution successfully processed.'
          : 'Pending contribution registered. Ready for simulated checkout.',
      receiptReference: result.contribution.receiptReference,
      receipt: receiptData,
      contribution: result.contribution,
      campaignTotals: result.campaignTotals,
      feeBreakdown: result.feeBreakdown,
    });
  } catch (err) {
    next(err);
  }
};

// Helper for simulated checkout
const handleSimulateCheckout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { receiptReference } = req.params;
    const body = checkoutInputSchema.parse(req.body);

    const result = await dbStore.simulateCheckout({
      receiptReference,
      outcome: body.outcome,
      simulatedProvider: body.simulatedProvider || 'simulated_test_checkout',
    });

    const isSuccess = body.outcome === 'SUCCEEDED';
    const statusCode = isSuccess ? 200 : body.outcome === 'PENDING' ? 202 : 400;

    res.status(isSuccess ? 200 : 200).json({
      success: isSuccess,
      status: body.outcome,
      message: result.message,
      receiptReference,
      contribution: result.contribution,
      campaignTotals: result.campaignTotals,
    });
  } catch (err) {
    next(err);
  }
};

// Helper for getting receipt
const handleGetReceipt = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { receiptReference } = req.params;
    const record = await dbStore.getContributionByReceipt(receiptReference);
    if (!record) {
      throw new AppError(`Receipt "${receiptReference}" not found.`, 404);
    }

    // Enforce privacy: if user is not author of contribution and not anonymous receipt query
    const campaign = await dbStore.getCampaignByIdOrSlug(record.campaignId);

    res.json({
      success: true,
      receipt: {
        ...record,
        campaignTitle: campaign?.title || 'Civic Amplification Campaign',
        campaignStatus: campaign?.status,
        disclosure: 'Simulated payment — no real money charged. For demonstration and platform evaluation purposes.',
      },
    });
  } catch (err) {
    next(err);
  }
};

// Mount route handlers with support for various mount points
router.get('/:id/preview-fees', optionalAuth, handlePreviewFees);
router.get('/campaigns/:id/preview-fees', optionalAuth, handlePreviewFees);

router.post('/:id/contributions', contributionLimiter, optionalAuth, handleCreateContribution);
router.post('/campaigns/:id/contributions', contributionLimiter, optionalAuth, handleCreateContribution);

router.post('/:receiptReference/checkout', handleSimulateCheckout);
router.post('/contributions/:receiptReference/checkout', handleSimulateCheckout);

router.get('/:receiptReference/receipt', optionalAuth, handleGetReceipt);
router.get('/contributions/:receiptReference/receipt', optionalAuth, handleGetReceipt);

// User Contribution History
router.get('/my/contributions', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const list = await dbStore.getContributionsByUser(req.user!.id);
    res.json({
      success: true,
      data: list,
    });
  } catch (err) {
    next(err);
  }
});

// Campaign Follow / Tracking Endpoints
const handleFollow = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || 'usr-demo-backer';
    const result = await dbStore.followCampaign(userId, req.params.id);
    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    next(err);
  }
};

const handleUnfollow = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || 'usr-demo-backer';
    const result = await dbStore.unfollowCampaign(userId, req.params.id);
    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    next(err);
  }
};

const handleIsFollowing = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || 'usr-demo-backer';
    const followed = await dbStore.isCampaignFollowed(userId, req.params.id);
    res.json({
      success: true,
      followed,
      campaignId: req.params.id,
    });
  } catch (err) {
    next(err);
  }
};

router.post('/:id/follow', optionalAuth, handleFollow);
router.post('/campaigns/:id/follow', optionalAuth, handleFollow);

router.delete('/:id/follow', optionalAuth, handleUnfollow);
router.delete('/campaigns/:id/follow', optionalAuth, handleUnfollow);

router.get('/:id/follow', optionalAuth, handleIsFollowing);
router.get('/campaigns/:id/follow', optionalAuth, handleIsFollowing);

router.get('/my/followed-campaigns', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || 'usr-demo-backer';
    const list = await dbStore.getFollowedCampaigns(userId);
    res.json({
      success: true,
      data: list,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
