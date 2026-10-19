process.env.NODE_ENV = 'test';
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../server.js';
import { initializeDatabase } from '../services/dbStore.js';

describe('Auth & Gemini AI Functional Tests', () => {
  before(async () => {
    process.env.NODE_ENV = 'test';
    await initializeDatabase();
  });

  describe('Authentication & RBAC', () => {
    it('successfully logs in a pre-seeded admin with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@amplification.platform',
          password: 'Password123!',
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.user.role, 'ADMIN');
      assert.ok(res.body.token);
    });

    it('rejects login with incorrect password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@amplification.platform',
          password: 'WrongPassword!',
        });

      assert.equal(res.status, 401);
      assert.ok(res.body.error);
    });

    it('registers a new user and rejects duplicate email', async () => {
      const uniqueEmail = `test_${Date.now()}@test.org`;
      const registerRes = await request(app)
        .post('/api/auth/register')
        .send({
          email: uniqueEmail,
          password: 'Password123!',
          name: 'Civic Advocate',
          role: 'CREATOR',
        });

      assert.equal(registerRes.status, 201);
      assert.equal(registerRes.body.success, true);
      assert.equal(registerRes.body.user.email, uniqueEmail);

      // Attempt duplicate
      const duplicateRes = await request(app)
        .post('/api/auth/register')
        .send({
          email: uniqueEmail,
          password: 'Password123!',
          name: 'Duplicate Attempt',
        });

      assert.equal(duplicateRes.status, 409);
      assert.ok(duplicateRes.body.error);
    });

    it('returns current user profile with valid Bearer token for CREATOR', async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'creator@amplification.platform',
          password: 'Password123!',
        });

      const token = loginRes.body.token;

      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      assert.equal(meRes.status, 200);
      assert.equal(meRes.body.user.role, 'CREATOR');
    });

    it('registration strictly assigns CREATOR even if body specifies ADMIN', async () => {
      const uniqueEmail = `malicious_${Date.now()}@attacker.org`;
      const registerRes = await request(app)
        .post('/api/auth/register')
        .send({
          email: uniqueEmail,
          password: 'Password123!',
          name: 'Privilege Escalation Attempt',
          role: 'ADMIN',
        });

      assert.equal(registerRes.status, 201);
      assert.equal(registerRes.body.user.role, 'CREATOR');
    });

    it('blocks unauthenticated access to review queue with 401', async () => {
      const res = await request(app).get('/api/review/queue');
      assert.equal(res.status, 401);
    });

    it('blocks creators from accessing admin review endpoints with 403', async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'creator@amplification.platform',
          password: 'Password123!',
        });
      const token = loginRes.body.token;

      const res = await request(app)
        .get('/api/review/queue')
        .set('Authorization', `Bearer ${token}`);

      assert.equal(res.status, 403);
    });
  });

  describe('Gemini AI Endpoints (With Heuristic Fallbacks)', () => {
    it('generates campaign basics (Stage 1)', async () => {
      const res = await request(app)
        .post('/api/ai/basics')
        .send({
          topic: 'Protecting rural wetlands from illegal chemical dumping',
          category: 'Environment',
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.title);
      assert.ok(res.body.data.summary);
      assert.ok(res.body.data.keyMessage);
      assert.ok(res.body.data.publicInterestObjective);
    });

    it('generates story and narrative (Stage 2)', async () => {
      const res = await request(app)
        .post('/api/ai/story')
        .send({
          title: 'Clean Water For Cascade Valley',
          summary: 'Agricultural runoff has exceeded EPA safety thresholds for 3 consecutive months.',
          category: 'Environment',
          userSources: [
            {
              title: 'EPA County Water Quality Report',
              url: 'https://epa.gov/reports/cascade-valley',
            },
          ],
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.narrative);
      assert.ok(res.body.data.proposedSolution);
      assert.ok(Array.isArray(res.body.data.evidenceSummaries));
      assert.ok(res.body.data.disclosure);
    });

    it('generates campaign and ad visuals (Stage 3)', async () => {
      const res = await request(app)
        .post('/api/ai/visuals')
        .send({
          title: 'End Predatory Payday Lending',
          category: 'Economic Justice',
          summary: 'Exposing 400% interest rate traps affecting low-income families.',
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.adHeadlines.length > 0);
      assert.ok(res.body.data.imagePrompts.length > 0);
      assert.ok(res.body.data.platformVariations.meta);
    });

    it('generates reach and distribution plan (Stage 4)', async () => {
      const res = await request(app)
        .post('/api/ai/reach')
        .send({
          title: 'Fair Housing For All',
          category: 'Housing Rights',
          fundingGoalINR: 50000,
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.audienceSegments.length > 0);
      assert.ok(res.body.data.budgetRecommendations);
      assert.ok(res.body.data.budgetRecommendations.assumedCPM);
    });

    it('conducts comprehensive AI pre-submission audit (Stage 5)', async () => {
      const res = await request(app)
        .post('/api/ai/review')
        .send({
          title: 'Fix The Bridges Now',
          category: 'Infrastructure',
          summary: 'State route 9 bridge has structural micro-fractures in primary support spans.',
          narrative: 'Official state inspections noted the fracture in August. Citizens demand immediate repair allocation.',
          sources: [{ title: 'State DOT Inspection', url: 'https://dot.state.gov/bridges/sr9-report' }],
          targetAmount: 5000,
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(typeof res.body.data.overallReadinessScore === 'number');
      assert.ok(Array.isArray(res.body.data.preSubmissionChecklist));
      assert.ok(Array.isArray(res.body.data.flaggedClaims));
    });
  });
});
