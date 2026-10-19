import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { aiService } from '../services/ai.service.js';
import { optionalAuth } from '../middleware/auth.js';
import { createRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();
const aiLimiter = createRateLimiter({ maxRequests: 30, windowMs: 60 * 1000 });

// Stage 1: Basics Schema
const basicsRequestSchema = z.object({
  topic: z.string().min(3, 'Topic must be at least 3 characters').max(300, 'Topic must be under 300 characters'),
  category: z.string().optional(),
  existingTitle: z.string().max(100).optional(),
  targetAudienceHint: z.string().max(200).optional(),
});

// Stage 2: Story Schema
const storyRequestSchema = z.object({
  title: z.string().min(5, 'Title required'),
  summary: z.string().min(10, 'Summary required'),
  category: z.string().default('Public Policy'),
  userSources: z
    .array(
      z.object({
        title: z.string(),
        url: z.string(),
        relevance: z.string().optional(),
      })
    )
    .optional(),
  contextNotes: z.string().max(500).optional(),
});

// Stage 3: Visuals Schema
const visualsRequestSchema = z.object({
  title: z.string().min(5),
  summary: z.string().min(10),
  category: z.string().default('Public Policy'),
  adHeadline: z.string().optional(),
});

// Stage 3: Thumbnail Schema
const thumbnailRequestSchema = z.object({
  title: z.string().min(3),
  summary: z.string().optional(),
  category: z.string().optional(),
  visualStyle: z.string().optional(),
  promptInstructions: z.string().optional(),
  audience: z.string().optional(),
  objective: z.string().optional(),
});

// Stage 4: Reach Schema
const reachRequestSchema = z.object({
  title: z.string().min(5),
  category: z.string().default('Public Policy'),
  targetLocations: z.array(z.string()).optional(),
  fundingGoalUSD: z.number().positive().optional(),
  fundingGoalINR: z.number().positive().optional(),
});


// Stage 5: Review Schema
const reviewRequestSchema = z.object({
  title: z.string().min(5),
  summary: z.string().min(10),
  narrative: z.string().optional(),
  category: z.string().default('Public Policy'),
  targetAmount: z.number().optional(),
  sources: z
    .array(
      z.object({
        title: z.string(),
        url: z.string(),
      })
    )
    .optional(),
});

const handleAiError = (res: Response, err: any, fallbackMessage: string) => {
  const status =
    typeof err?.status === 'number'
      ? err.status
      : err?.name === 'ZodError'
        ? 400
        : err?.message?.includes('quota') || err?.message?.includes('rate limit')
          ? 429
          : err?.message?.includes('timed out')
            ? 504
            : 400;

  res.status(status).json({
    success: false,
    error: err?.message || fallbackMessage,
  });
};

/**
 * POST /api/ai/basics
 * Generates campaign title, tagline, summary, problem statement, and public-interest objective
 */
router.post('/basics', optionalAuth, aiLimiter, async (req: Request, res: Response) => {
  try {
    const input = basicsRequestSchema.parse(req.body);
    const result = await aiService.generateBasics(input);
    res.json({ success: true, data: result });
  } catch (err: any) {
    handleAiError(res, err, 'Could not generate campaign basics.');
  }
});

/**
 * POST /api/ai/story
 * Synthesizes background context, problem explanation, narrative, and evidence summary
 */
router.post('/story', optionalAuth, aiLimiter, async (req: Request, res: Response) => {
  try {
    const input = storyRequestSchema.parse(req.body);
    const result = await aiService.generateStory(input);
    res.json({ success: true, data: result });
  } catch (err: any) {
    handleAiError(res, err, 'Could not synthesize campaign narrative.');
  }
});

/**
 * POST /api/ai/visuals
 * Generates creative concepts, ad copy, CTAs, platform variations, and image prompts
 */
router.post('/visuals', optionalAuth, aiLimiter, async (req: Request, res: Response) => {
  try {
    const input = visualsRequestSchema.parse(req.body);
    const result = await aiService.generateVisuals(input);
    res.json({ success: true, data: result });
  } catch (err: any) {
    handleAiError(res, err, 'Could not generate visual ad concepts.');
  }
});

/**
 * POST /api/ai/thumbnail
 * Generates an advertising campaign thumbnail using Imagen 3 or curated editorial matching
 */
router.post('/thumbnail', optionalAuth, aiLimiter, async (req: Request, res: Response) => {
  try {
    const input = thumbnailRequestSchema.parse(req.body);
    const result = await aiService.generateThumbnail(input);
    res.json({ success: true, data: result });
  } catch (err: any) {
    handleAiError(res, err, 'Could not generate campaign thumbnail.');
  }
});

/**
 * POST /api/ai/reach
 * Recommends audience segments, distribution channels, targeting, and budget breakdowns
 */
router.post('/reach', optionalAuth, aiLimiter, async (req: Request, res: Response) => {
  try {
    const input = reachRequestSchema.parse(req.body);
    const result = await aiService.generateReach(input);
    res.json({ success: true, data: result });
  } catch (err: any) {
    handleAiError(res, err, 'Could not generate distribution plan.');
  }
});

/**
 * POST /api/ai/review
 * Pre-submission fact-checking audit, consistency check, and readiness score
 */
router.post('/review', optionalAuth, aiLimiter, async (req: Request, res: Response) => {
  try {
    const input = reviewRequestSchema.parse(req.body);
    const result = await aiService.reviewCampaign(input);
    res.json({ success: true, data: result });
  } catch (err: any) {
    handleAiError(res, err, 'Could not conduct campaign audit.');
  }
});

// Voice Audio Transcription Schema
const transcribeRequestSchema = z.object({
  audioBase64: z.string().min(50, 'Audio data required'),
  mimeType: z.string().default('audio/m4a'),
  durationSeconds: z.number().max(180, 'Audio duration must be under 3 minutes').optional(),
});

/**
 * POST /api/ai/transcribe
 * Real speech-to-text audio transcription powered by multimodal Gemini AI
 */
router.post('/transcribe', optionalAuth, aiLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = transcribeRequestSchema.parse(req.body);
    const result = await aiService.transcribeAudio(input);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      error: err?.message || 'Could not transcribe audio. Please verify your recording or enter text manually.',
    });
  }
});

// Voice Draft Generation Schema
const voiceDraftRequestSchema = z.object({
  transcript: z.string().min(10, 'Transcript must be at least 10 characters'),
  category: z.string().optional(),
  additionalNotes: z.string().max(500).optional(),
});

/**
 * POST /api/ai/voice-draft
 * Synthesizes a comprehensive 5-step campaign draft strictly from user's voice transcript
 */
router.post('/voice-draft', optionalAuth, aiLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = voiceDraftRequestSchema.parse(req.body);
    const result = await aiService.generateCampaignFromTranscript(input);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      error: err?.message || 'Could not synthesize campaign from transcript. Please try again or fill in the draft manually.',
    });
  }
});

export default router;
