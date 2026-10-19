import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { dbStore } from '../services/dbStore.js';
import { authenticate } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

const draftPayloadSchema = z.object({
  id: z.string().optional(),
  currentStep: z.number().min(1).max(5).optional(),
  title: z.string().optional(),
  draftData: z.record(z.any()).optional(),
});

// All draft routes require authentication (either Bearer token or x-demo-user-id header)
router.use(authenticate);

// GET /api/drafts
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const drafts = await dbStore.getDraftsByOwner(req.user!.id, req.user!.id);
    res.json({
      success: true,
      data: drafts,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/drafts
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id, currentStep, title, draftData, ...rest } = req.body || {};
    const mergedData = { ...(draftData || {}), ...rest };

    const newDraft = await dbStore.createOrUpdateDraft({
      id: id,
      ownerId: req.user!.id,
      anonymousToken: req.user!.isAnonymous ? req.user!.id : undefined,
      currentStep: currentStep || 1,
      title: title || rest.title || 'Untitled Campaign',
      draftData: mergedData,
    });

    res.status(201).json({
      success: true,
      data: newDraft,
      draft: newDraft,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/drafts/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const draft = await dbStore.getDraftById(req.params.id);
    if (!draft) {
      throw new AppError(`Draft "${req.params.id}" not found.`, 404);
    }

    // Owner authorization
    const isOwner =
      (draft.ownerId && draft.ownerId === req.user!.id) ||
      (draft.anonymousToken && draft.anonymousToken === req.user!.id);
    if (!isOwner) {
      throw new AppError('Unauthorized access to private draft.', 403);
    }

    res.json({
      success: true,
      data: draft,
      draft: draft,
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/drafts/:id (Autosave endpoint)
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id, currentStep, title, draftData, ...rest } = req.body || {};
    const existing = await dbStore.getDraftById(req.params.id);
    if (!existing) {
      throw new AppError(`Draft "${req.params.id}" not found.`, 404);
    }

    const isOwner =
      (existing.ownerId && existing.ownerId === req.user!.id) ||
      (existing.anonymousToken && existing.anonymousToken === req.user!.id);
    if (!isOwner) {
      throw new AppError('Unauthorized access to private draft.', 403);
    }

    const mergedData = { ...(existing.draftData || {}), ...(draftData || {}), ...rest };

    const updated = await dbStore.createOrUpdateDraft({
      id: req.params.id,
      currentStep: currentStep !== undefined ? currentStep : existing.currentStep,
      title: title !== undefined ? title : existing.title,
      draftData: mergedData,
    });

    res.json({
      success: true,
      data: updated,
      draft: updated,
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/drafts/:id
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await dbStore.getDraftById(req.params.id);
    if (!existing) {
      throw new AppError(`Draft "${req.params.id}" not found.`, 404);
    }

    const isOwner =
      (existing.ownerId && existing.ownerId === req.user!.id) ||
      (existing.anonymousToken && existing.anonymousToken === req.user!.id);
    if (!isOwner) {
      throw new AppError('Unauthorized access to private draft.', 403);
    }

    await dbStore.deleteDraft(req.params.id);
    res.json({
      success: true,
      message: 'Draft deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/drafts/:id/submit
router.post('/:id/submit', async (req: Request, res: Response, next: NextFunction) => {
  try {
    let existing = await dbStore.getDraftById(req.params.id);
    if (!existing) {
      if (req.body && (req.body.title || req.body.summary || req.body.draftData)) {
        existing = await dbStore.createOrUpdateDraft({
          id: req.params.id,
          ownerId: req.user!.id,
          currentStep: 5,
          title: req.body.title || req.body.draftData?.title || 'Untitled Campaign',
          draftData: req.body.draftData || req.body,
        });
      } else {
        throw new AppError(`Draft "${req.params.id}" not found.`, 404);
      }
    }

    const isOwner =
      (existing.ownerId && existing.ownerId === req.user!.id) ||
      (existing.anonymousToken && existing.anonymousToken === req.user!.id);
    if (!isOwner) {
      throw new AppError('Unauthorized access to private draft.', 403);
    }

    const submittedCampaign = await dbStore.submitDraft(req.params.id, req.user!.id);

    res.status(201).json({
      success: true,
      message: 'Campaign submitted successfully for Universal Trust Standard (UUTS) review.',
      campaign: submittedCampaign,
      data: submittedCampaign,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
