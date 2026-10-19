import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { UserRole } from '@prisma/client';
import { dbStore } from '../services/dbStore.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

const reviewDecisionSchema = z.object({
  decision: z.enum(['APPROVED', 'CHANGES_REQUESTED', 'REJECTED']),
  feedback: z.string().min(5, 'Review feedback or reason must be at least 5 characters'),
  notes: z.string().optional(),
});

// All review routes are strictly protected and require authenticated ADMIN role
router.use(authenticate);
router.use(requireRole(UserRole.ADMIN));

/**
 * GET /api/review/queue
 * Returns list of submitted campaigns requiring review with filter options
 */
router.get('/queue', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;

    const queue = await dbStore.getReviewQueue({ status, search });

    res.json({
      success: true,
      total: queue.length,
      data: queue,
      filter: {
        status: status || 'ALL',
        search: search || '',
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/review/:campaignId
 * Returns the complete review inspection dossier with SSRF and creative validations
 */
router.get('/:campaignId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dossier = await dbStore.getReviewDossier(req.params.campaignId);

    res.json({
      success: true,
      data: dossier,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/review/:campaignId/decision
 * Submits an authoritative review decision (APPROVED, CHANGES_REQUESTED, REJECTED)
 */
router.post('/:campaignId/decision', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = reviewDecisionSchema.parse(req.body);
    const result = await dbStore.reviewCampaign({
      campaignId: req.params.campaignId,
      reviewerId: req.user!.id,
      decision: input.decision,
      feedback: input.feedback,
      notes: input.notes,
    });

    res.json({
      success: true,
      message: `Campaign status updated to ${result.campaign.status}.`,
      campaign: result.campaign,
      decision: result.decision,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
