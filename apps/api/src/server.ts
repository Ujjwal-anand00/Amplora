import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import campaignRoutes from './routes/campaign.routes.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Security & Parsing
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));
app.use(express.json());

// Request logging in development
if (process.env.NODE_ENV !== 'test') {
  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });
}

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'campaign-amplification-api',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// App routes
app.use('/api/campaigns', campaignRoutes);

// Error Handling
app.use(errorHandler);

// Start server if not imported
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 Campaign Amplification API running on http://localhost:${PORT}`);
    console.log(`📡 Healthcheck: http://localhost:${PORT}/api/health`);
    console.log(`🎯 Campaigns endpoint: http://localhost:${PORT}/api/campaigns`);
  });
}

export default app;
