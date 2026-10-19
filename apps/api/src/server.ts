import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import http from 'http';
import { env, getSanitizedDbTarget } from './config/env.js';
import { initializeDatabase, checkDatabaseReadiness } from './services/dbStore.js';
import { prisma } from './lib/prisma.js';
import campaignRoutes from './routes/campaign.routes.js';
import draftRoutes from './routes/draft.routes.js';
import contributionRoutes from './routes/contribution.routes.js';
import activityRoutes from './routes/activity.routes.js';
import reviewRoutes from './routes/review.routes.js';
import authRoutes from './routes/auth.routes.js';
import aiRoutes from './routes/ai.routes.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// 1. Security Headers Middleware
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// 2. CORS Configuration
// Allow configured web origins, plus requests without Origin (mobile apps, health-check probes, curl)
const allowedOrigins =
  env.CLIENT_ORIGIN === '*'
    ? '*'
    : env.CLIENT_ORIGIN.split(',').map(s => s.trim().replace(/\/$/, ''));

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. native mobile apps, server-to-server health checks)
      if (!origin) return callback(null, true);
      if (allowedOrigins === '*' || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS policy blocked access from origin: ${origin}`));
    },
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-demo-user-id', 'x-demo-user-role'],
    credentials: true,
  })
);

// 3. Request Payload Size Limits (supports audio payloads up to 25MB)
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// 4. Safe Production Structured Logging
if (env.NODE_ENV !== 'test') {
  app.use((req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    res.on('finish', () => {
      const durationMs = Date.now() - startTime;
      const logEntry = {
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.originalUrl || req.url,
        status: res.statusCode,
        durationMs,
        ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        userAgent: req.headers['user-agent']?.slice(0, 80),
      };
      if (env.NODE_ENV === 'production') {
        console.log(JSON.stringify(logEntry));
      } else {
        console.log(`[${logEntry.timestamp}] ${logEntry.method} ${logEntry.url} ${logEntry.status} - ${durationMs}ms`);
      }
    });
    next();
  });
}

// 5. Health Check (Liveness Probe for Render)
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'campaign-amplification-api',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
    geminiConfigured: !!(env.GEMINI_API_KEY && env.GEMINI_API_KEY.trim().length > 0),
  });
});

// 6. Readiness Check (Dependency & PostgreSQL Probe)
app.get('/api/ready', async (_req: Request, res: Response) => {
  const readiness = await checkDatabaseReadiness();
  if (readiness.ok) {
    res.json({
      status: 'ready',
      database: readiness.type,
      latencyMs: readiness.latencyMs,
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
    });
  } else {
    res.status(503).json({
      status: 'not_ready',
      database: 'disconnected',
      message: 'Critical dependency check failed.',
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
    });
  }
});

// 7. Mount Application Routes
app.use('/api/auth', authRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/campaigns', contributionRoutes); // POST /api/campaigns/:id/contributions
app.use('/api/contributions', contributionRoutes); // GET /api/contributions/:receipt/receipt
app.use('/api', contributionRoutes); // GET /api/my/contributions
app.use('/api/drafts', draftRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/review', reviewRoutes);
app.use('/api/ai', aiRoutes);

// 8. Centralized Error Handler
app.use(errorHandler);

// 9. Server Lifecycle & Graceful Shutdown
let httpServer: http.Server | null = null;
const isTest = env.NODE_ENV === 'test' || process.env.npm_lifecycle_event === 'test' || process.env.NODE_ENV === 'test';

if (!isTest) {
  initializeDatabase()
    .then(() => {
      httpServer = app.listen(env.PORT, '0.0.0.0', () => {
        console.log(`🚀 Campaign Amplification API live on port ${env.PORT} (${env.NODE_ENV})`);
        console.log(`📡 Health Check:  http://0.0.0.0:${env.PORT}/api/health`);
        console.log(`🔍 Readiness:     http://0.0.0.0:${env.PORT}/api/ready`);
        console.log(`🗄️ Database:      ${getSanitizedDbTarget(env.DATABASE_URL)}`);
      });
    })
    .catch(err => {
      console.error('❌ Failed to start API server:', err.message);
      process.exit(1);
    });
}

function handleGracefulShutdown(signal: string) {
  console.log(`\n🛑 Received ${signal}. Commencing graceful server shutdown...`);
  if (httpServer) {
    httpServer.close(async () => {
      console.log('🔒 HTTP listener closed. Draining active connections...');
      try {
        await prisma.$disconnect();
        console.log('🔌 Database connection cleanly closed.');
      } catch (err: any) {
        console.error('⚠️ Error closing database connection:', err.message);
      }
      process.exit(0);
    });

    // Hard cutoff if connections hang longer than 10 seconds
    setTimeout(() => {
      console.error('⚠️ Shutdown timeout exceeded (10s). Forcing process exit.');
      process.exit(1);
    }, 10000).unref();
  } else {
    process.exit(0);
  }
}

process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));
process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));

export default app;
