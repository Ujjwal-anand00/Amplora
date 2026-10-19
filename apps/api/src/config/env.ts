import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const DEV_AUTH_SECRET_DEFAULT = 'dev-super-secret-key-campaign-amplification-2026';

const envSchema = z
  .object({
    PORT: z
      .string()
      .default('4000')
      .transform(v => parseInt(v, 10)),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    DATABASE_URL: z
      .string({
        required_error: 'DATABASE_URL is required.',
      })
      .default('postgresql://postgres:postgres@localhost:5432/campaigns?schema=public'),
    DIRECT_URL: z.string().optional(),
    CLIENT_ORIGIN: z.string().default('*'),
    AUTH_SECRET: z.string().default(DEV_AUTH_SECRET_DEFAULT),
    GEMINI_API_KEY: z.string().optional(),
    ADMIN_EMAIL: z.string().email().optional().default('admin@campaign.com'),
    ADMIN_PASSWORD: z.string().min(8).optional().default('AdminSecurePassword2026!'),
  })
  .superRefine((data, ctx) => {
    // Ensure DIRECT_URL is populated for Prisma migration compatibility
    if (!data.DIRECT_URL) {
      data.DIRECT_URL = data.DATABASE_URL;
      process.env.DIRECT_URL = data.DATABASE_URL;
    }

    if (data.NODE_ENV === 'production') {
      // 1. Production database must not be a local connection
      if (
        !data.DATABASE_URL ||
        data.DATABASE_URL.includes('localhost') ||
        data.DATABASE_URL.includes('127.0.0.1')
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['DATABASE_URL'],
          message:
            'Production requires a managed cloud PostgreSQL connection (e.g. Supabase). Localhost is prohibited in production.',
        });
      }

      // 2. Production AUTH_SECRET must be strong and not the development default
      if (data.AUTH_SECRET === DEV_AUTH_SECRET_DEFAULT || data.AUTH_SECRET.length < 32) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['AUTH_SECRET'],
          message:
            'Production requires a secure AUTH_SECRET of at least 32 characters. Do not use the development placeholder.',
        });
      }
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Configuration Error: Invalid environment variables');
  parsed.error.issues.forEach(issue => {
    console.error(`   - ${issue.path.join('.')}: ${issue.message}`);
  });
  console.error('\n👉 Please check your .env or cloud hosting dashboard configuration.\n');
  process.exit(1);
}

export const env = parsed.data;

/**
 * Helper to safely extract host/provider info without leaking user, password, or query tokens
 */
export function getSanitizedDbTarget(connectionString: string): string {
  try {
    const url = new URL(connectionString);
    return `${url.protocol}//${url.host}${url.pathname}`;
  } catch {
    return '[Protected Connection String]';
  }
}
