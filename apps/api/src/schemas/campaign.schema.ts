import { z } from 'zod';

export const CampaignCategorySchema = z.enum([
  'Civic',
  'Environment',
  'Health',
  'Consumer',
  'Economic Policy',
  'Education',
  'Community'
]);

export const CreateCampaignSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(120),
  tagLine: z.string().min(10, 'Tagline must be at least 10 characters').max(200),
  narrative: z.string().min(30, 'Narrative must be at least 30 characters'),
  category: CampaignCategorySchema,
  targetAmount: z.number().positive('Target must be greater than 0'),
  targetAudience: z.string().min(5, 'Target audience description required'),
  adChannels: z.array(z.string()).min(1, 'Select at least one amplification channel'),
  imageUrl: z.string().url('Valid image URL required').optional(),
  creatorName: z.string().min(2).optional(),
});

export const BackCampaignSchema = z.object({
  campaignId: z.string(),
  amount: z.number().min(1, 'Minimum amplification pledge is $1'),
  backerName: z.string().min(2, 'Name is required').default('Anonymous Backer'),
  backerEmail: z.string().email().optional(),
  isAnonymous: z.boolean().default(false),
  supportNote: z.string().max(280).optional(),
});

export const QueryCampaignsSchema = z.object({
  category: z.string().optional(),
  search: z.string().optional(),
  sort: z.enum(['trending', 'nearly_funded', 'trust_score', 'newest']).default('trending'),
  limit: z.coerce.number().min(1).max(50).default(20),
  offset: z.coerce.number().min(0).default(0),
});

export type CreateCampaignInput = z.infer<typeof CreateCampaignSchema>;
export type BackCampaignInput = z.infer<typeof BackCampaignSchema>;
export type QueryCampaignsInput = z.infer<typeof QueryCampaignsSchema>;
