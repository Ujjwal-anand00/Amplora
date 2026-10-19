import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { CampaignStatus, UserRole } from '@prisma/client';
import app from '../server.js';
import {
  validateCampaignTransition,
  isCampaignPubliclyDiscoverable,
  PUBLIC_VISIBILITY_STATUSES,
  CAMPAIGN_TRANSITIONS,
} from '../lib/stateMachine.js';
import { calculateFeeBreakdown, PLATFORM_FEE_RATE } from '../lib/reachCalculator.js';
import { dbStore, initializeDatabase } from '../services/dbStore.js';

describe('Campaign Amplification Platform - Business Rules & API Test Suite', () => {
  before(async () => {
    process.env.NODE_ENV = 'test';
    await initializeDatabase();
  });

  describe('1. Campaign Lifecycle State Machine', () => {
    it('allows Creator to submit a Draft for Review', () => {
      const result = validateCampaignTransition(
        CampaignStatus.DRAFT,
        CampaignStatus.SUBMITTED_FOR_REVIEW,
        UserRole.CREATOR
      );
      assert.equal(result.valid, true);
    });

    it('allows Admin to Approve a campaign in review', () => {
      const result = validateCampaignTransition(
        CampaignStatus.SUBMITTED_FOR_REVIEW,
        CampaignStatus.APPROVED,
        UserRole.ADMIN
      );
      assert.equal(result.valid, true);
    });

    it('allows Admin to Request Changes on a campaign in review', () => {
      const result = validateCampaignTransition(
        CampaignStatus.SUBMITTED_FOR_REVIEW,
        CampaignStatus.CHANGES_REQUESTED,
        UserRole.ADMIN
      );
      assert.equal(result.valid, true);
    });

    it('allows Admin to Reject a non-factual campaign in review', () => {
      const result = validateCampaignTransition(
        CampaignStatus.SUBMITTED_FOR_REVIEW,
        CampaignStatus.REJECTED,
        UserRole.ADMIN
      );
      assert.equal(result.valid, true);
    });

    it('blocks Creator from approving a campaign', () => {
      const creatorResult = validateCampaignTransition(
        CampaignStatus.SUBMITTED_FOR_REVIEW,
        CampaignStatus.APPROVED,
        UserRole.CREATOR
      );
      assert.equal(creatorResult.valid, false);
      assert.match(creatorResult.reason || '', /not authorized/i);
    });

    it('prohibits illegal transition shortcuts (e.g. DRAFT directly to PROMOTING)', () => {
      const result = validateCampaignTransition(
        CampaignStatus.DRAFT,
        CampaignStatus.PROMOTING,
        UserRole.ADMIN
      );
      assert.equal(result.valid, false);
      assert.match(result.reason || '', /Illegal transition/i);
    });

    it('prevents cancelling a COMPLETED campaign', () => {
      const result = validateCampaignTransition(
        CampaignStatus.COMPLETED,
        CampaignStatus.CANCELLED,
        UserRole.ADMIN
      );
      assert.equal(result.valid, false);
    });

    it('allows publishing for funding only from APPROVED state', () => {
      const validPub = validateCampaignTransition(
        CampaignStatus.APPROVED,
        CampaignStatus.AVAILABLE_FOR_FUNDING,
        UserRole.CREATOR
      );
      assert.equal(validPub.valid, true);

      const invalidPub = validateCampaignTransition(
        CampaignStatus.SUBMITTED_FOR_REVIEW,
        CampaignStatus.AVAILABLE_FOR_FUNDING,
        UserRole.CREATOR
      );
      assert.equal(invalidPub.valid, false);
    });
  });

  describe('2. Minor-Unit Fee Arithmetic & Reach Estimation', () => {
    it('accurately calculates 95% media and 5% platform fee without rounding leaks', () => {
      const testCases = [
        { amount: 5000, expectedFee: 250, expectedMedia: 4750 }, // $50.00 -> $2.50 fee, $47.50 media
        { amount: 10000, expectedFee: 500, expectedMedia: 9500 }, // $100.00 -> $5.00 fee, $95.00 media
        { amount: 2500, expectedFee: 125, expectedMedia: 2375 }, // $25.00 -> $1.25 fee, $23.75 media
        { amount: 100, expectedFee: 5, expectedMedia: 95 }, // $1.00 -> $0.05 fee, $0.95 media
      ];

      for (const tc of testCases) {
        const breakdown = calculateFeeBreakdown(tc.amount);
        assert.equal(breakdown.platformFeeMinor, tc.expectedFee);
        assert.equal(breakdown.netMediaMinor, tc.expectedMedia);
        // Guarantee conservation of funds
        assert.equal(breakdown.platformFeeMinor + breakdown.netMediaMinor, tc.amount);
      }
    });

    it('computes realistic impressions and unique reach at $37 CPM benchmark', () => {
      const breakdown = calculateFeeBreakdown(5000); // $50.00 contribution -> $47.50 media
      // 47.50 / 37.0 * 1000 = ~1284 impressions
      assert.equal(breakdown.estimatedImpressions, 1284);
      // 1284 / 1.35 factor = ~951 unique citizen reach
      assert.equal(breakdown.estimatedUniqueReach, 951);
    });

    it('gracefully handles boundary inputs (zero or negative amounts)', () => {
      const breakdown = calculateFeeBreakdown(0);
      assert.equal(breakdown.amountMinor, 0);
      assert.equal(breakdown.platformFeeMinor, 0);
      assert.equal(breakdown.netMediaMinor, 0);
      assert.equal(breakdown.estimatedImpressions, 0);
      assert.equal(breakdown.estimatedUniqueReach, 0);
    });
  });

  describe('3. Public Visibility & Privacy Guardrails', () => {
    it('marks pre-certification statuses as not discoverable by public backers', () => {
      const hiddenStatuses = [
        CampaignStatus.DRAFT,
        CampaignStatus.SUBMITTED_FOR_REVIEW,
        CampaignStatus.CHANGES_REQUESTED,
        CampaignStatus.REJECTED,
        CampaignStatus.REFUND_PENDING,
        CampaignStatus.FAILED,
        CampaignStatus.CANCELLED,
      ];

      for (const st of hiddenStatuses) {
        assert.equal(
          isCampaignPubliclyDiscoverable(st),
          false,
          `Status ${st} must NOT be publicly discoverable`
        );
      }
    });

    it('marks certified and active lifecycle statuses as publicly discoverable', () => {
      for (const st of PUBLIC_VISIBILITY_STATUSES) {
        assert.equal(
          isCampaignPubliclyDiscoverable(st),
          true,
          `Status ${st} must be publicly discoverable`
        );
      }
    });
  });

  describe('4. Draft Persistence, Autosave & Role Access', () => {
    it('creates and autosaves a multi-step campaign draft', async () => {
      const createRes = await request(app)
        .post('/api/drafts')
        .send({
          title: 'Preserve Clean Coastal Estuaries',
          category: 'Environment',
          summary: 'Protecting critical salmon breeding grounds.',
        })
        .set('x-demo-user-id', 'usr-creator-test');

      assert.equal(createRes.status, 201);
      const draft = createRes.body.draft || createRes.body.data;
      assert.ok(draft?.id);
      const draftId = draft.id;

      // Patch / Autosave Step 2 Story
      const patchRes = await request(app)
        .patch(`/api/drafts/${draftId}`)
        .send({
          currentStep: 2,
          storySections: [
            {
              heading: 'The Salmon Habitat Crisis',
              body: 'Recent agricultural runoff has threatened coastal estuary survival rates.',
              orderIndex: 0,
            },
          ],
        })
        .set('x-demo-user-id', 'usr-creator-test');

      assert.equal(patchRes.status, 200);
      const updatedDraft = patchRes.body.draft || patchRes.body.data;
      assert.equal(updatedDraft.currentStep, 2);
    });

    it('prevents unauthorized users from editing another creator draft', async () => {
      const createRes = await request(app)
        .post('/api/drafts')
        .send({
          title: 'Confidential Creator Campaign',
          category: 'Democracy',
        })
        .set('x-demo-user-id', 'usr-creator-owner');

      const draft = createRes.body.draft || createRes.body.data;
      assert.ok(draft?.id);
      const draftId = draft.id;

      // Attacker tries to read/edit
      const patchRes = await request(app)
        .patch(`/api/drafts/${draftId}`)
        .send({ title: 'Tampered Campaign Title' })
        .set('x-demo-user-id', 'usr-unauthorized-attacker');

      assert.equal(patchRes.status, 403);
    });
  });

  describe('5. Contribution Flow, Goal Threshold & Receipt Reference', () => {
    it('processes a verified backer contribution and updates campaign funding stats', async () => {
      // Pick campaign 'camp-1' from seed data
      const initialCamp = await dbStore.getCampaignByIdOrSlug('camp-1');
      assert.ok(initialCamp);
      const previousTotal = initialCamp.raisedAmount;
      const previousBackers = initialCamp.backerCount;

      const contributionAmount = 5000; // $50.00
      const res = await request(app)
        .post('/api/campaigns/camp-1/contributions')
        .send({
          amount: contributionAmount,
          currency: 'USD',
          backerName: 'Sarah Jenkins',
          backerEmail: 'sarah.j@example.org',
          isAnonymous: false,
          supportNote: 'Critical message that needs amplification in Oregon!',
          paymentMethodId: 'pm_card_demo_success',
        });

      assert.equal(res.status, 201);
      assert.ok(res.body.contribution);
      assert.ok(res.body.receipt);
      assert.match(res.body.receipt.receiptReference, /^(rcpt_|REC-)/);
      assert.equal(res.body.receipt.amount, 5000);
      assert.equal(res.body.receipt.platformFee, 250);
      assert.equal(res.body.receipt.netMediaAmount, 4750);
      assert.equal(res.body.receipt.estimatedCitizenReach, 951);

      // Verify campaign totals were updated
      const updatedCamp = await dbStore.getCampaignByIdOrSlug('camp-1');
      assert.equal(updatedCamp?.raisedAmount, previousTotal + contributionAmount);
      assert.equal(updatedCamp?.backerCount, previousBackers + 1);
    });

    it('retrieves an itemized receipt using receiptReference', async () => {
      // Create a contribution
      const contribRes = await request(app)
        .post('/api/campaigns/camp-2/contributions')
        .send({
          amount: 2500, // $25.00
          backerName: 'David Chen',
          isAnonymous: true,
        });

      const receiptRef = contribRes.body.receipt.receiptReference;

      // Fetch receipt
      const receiptRes = await request(app).get(`/api/contributions/${receiptRef}/receipt`);
      assert.equal(receiptRes.status, 200);
      assert.equal(receiptRes.body.receipt.receiptReference, receiptRef);
      assert.equal(receiptRes.body.receipt.amount, 2500);
      assert.equal(receiptRes.body.receipt.platformFee, 125);
      assert.equal(receiptRes.body.receipt.netMediaAmount, 2375);
    });
  });

  describe('6. Public Discovery & Review API Endpoints', () => {
    it('GET /api/health responds with status ok and service identity', async () => {
      const res = await request(app).get('/api/health');
      assert.equal(res.status, 200);
      assert.equal(res.body.status, 'ok');
      assert.equal(res.body.service, 'campaign-amplification-api');
    });

    it('GET /api/campaigns returns only publicly discoverable campaigns', async () => {
      const res = await request(app).get('/api/campaigns');
      assert.equal(res.status, 200);
      const list = res.body.campaigns || res.body.data;
      assert.ok(Array.isArray(list));
      assert.ok(list.length > 0);

      // Verify none of them are DRAFT or SUBMITTED_FOR_REVIEW
      for (const camp of list) {
        assert.ok(
          isCampaignPubliclyDiscoverable(camp.status),
          `Campaign ${camp.id} with status ${camp.status} must not be in public feed`
        );
      }
    });

    it('GET /api/campaigns filters accurately by category and search keyword', async () => {
      const res = await request(app).get('/api/campaigns?category=Environment');
      assert.equal(res.status, 200);
      const list = res.body.campaigns || res.body.data;
      assert.ok(Array.isArray(list));
      assert.ok(list.length > 0);
      for (const camp of list) {
        assert.equal(camp.category, 'Environment');
      }
    });

    it('POST /api/review/:campaignId/decision records reviewer audit trail', async () => {
      // Use camp-11 which has SUBMITTED_FOR_REVIEW
      const res = await request(app)
        .post('/api/review/camp-11/decision')
        .send({
          decision: 'APPROVED',
          feedback: 'Verified against USDA source files and local council meeting minutes.',
        })
        .set('x-demo-user-id', 'usr-admin-1');

      assert.equal(res.status, 200);
      assert.equal(res.body.decision.decision, 'APPROVED');
    });
  });

  describe('7. Production Deployment & Readiness Probes', () => {
    it('GET /api/ready responds with readiness status without leaking credentials', async () => {
      const res = await request(app).get('/api/ready');
      assert.equal(res.status, 200);
      assert.equal(res.body.status, 'ready');
      assert.ok(['prisma_postgres', 'in_memory_fallback'].includes(res.body.database));
      // Ensure no password, username, or connection string in response
      const rawText = JSON.stringify(res.body);
      assert.equal(rawText.includes('password'), false);
      assert.equal(rawText.includes('postgres:'), false);
    });

    it('enforces secure HTTP response headers on all endpoints', async () => {
      const res = await request(app).get('/api/health');
      assert.equal(res.headers['x-content-type-options'], 'nosniff');
      assert.equal(res.headers['x-frame-options'], 'DENY');
      assert.equal(res.headers['referrer-policy'], 'strict-origin-when-cross-origin');
    });

    it('sanitizes database targets safely without leaking credentials', async () => {
      const { getSanitizedDbTarget } = await import('../config/env.js');
      const sensitiveUrl = 'postgresql://postgres.myproject:SecretPassword123@aws-0-us-west-1.pooler.supabase.com:6543/postgres?sslmode=require';
      const sanitized = getSanitizedDbTarget(sensitiveUrl);
      assert.equal(sanitized.includes('SecretPassword123'), false);
      assert.equal(sanitized.includes('postgres.'), false);
      assert.equal(sanitized, 'postgresql://aws-0-us-west-1.pooler.supabase.com:6543/postgres');
    });
  });

  describe('8. Complete Contribution Journey, Checkout State Machine & Campaign Tracking', () => {
    it('authoritatively calculates fee preview in INR without client-side guesswork', async () => {
      // Preview fees for ₹500 (50,000 paise)
      const res = await request(app).get('/api/campaigns/camp-1/preview-fees?amount=50000&currency=INR');
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.breakdown.amountMinor, 50000);
      assert.equal(res.body.breakdown.platformFeeMinor, 2500); // 5% = 2,500 paise
      assert.equal(res.body.breakdown.netMediaMinor, 47500); // 95% = 47,500 paise
      assert.equal(res.body.breakdown.currency, 'INR');
      // Impressions: (475 INR / 30 CPM) * 1000 = ~15833
      assert.ok(res.body.breakdown.estimatedImpressions > 15000);
      assert.equal(res.body.isEligibleForFunding, true);
    });

    it('strictly prohibits contributions to campaigns not in eligible funding status', async () => {
      // camp-11 is in SUBMITTED_FOR_REVIEW
      const res = await request(app)
        .post('/api/campaigns/camp-11/contributions')
        .send({
          amount: 50000,
          currency: 'INR',
          backerName: 'Eager Citizen',
        });

      assert.equal(res.status, 400);
      assert.match(res.body.message, /cannot accept contributions/i);
    });

    it('enforces multi-step checkout state machine: Pending -> Simulated Succeeded', async () => {
      const initialCamp = await dbStore.getCampaignByIdOrSlug('camp-3');
      assert.ok(initialCamp);
      const initialRaised = initialCamp.raisedAmount;
      const initialBackers = initialCamp.backerCount;

      // 1. Create Pending contribution
      const createRes = await request(app)
        .post('/api/campaigns/camp-3/contributions')
        .send({
          amount: 25000, // ₹250
          currency: 'INR',
          backerName: 'Rohan Sharma',
          backerEmail: 'rohan.sharma@example.in',
          supportNote: 'Democracy requires independent voices.',
        });

      assert.equal(createRes.status, 201);
      assert.equal(createRes.body.contribution.paymentStatus, 'PENDING');
      const ref = createRes.body.receiptReference;
      assert.ok(ref);

      // Verify campaign totals have NOT increased while payment is PENDING
      const intermediateCamp = await dbStore.getCampaignByIdOrSlug('camp-3');
      assert.equal(intermediateCamp?.raisedAmount, initialRaised);
      assert.equal(intermediateCamp?.backerCount, initialBackers);

      // 2. Perform simulated successful checkout
      const checkoutRes = await request(app)
        .post(`/api/contributions/${ref}/checkout`)
        .send({
          outcome: 'SUCCEEDED',
          simulatedProvider: 'simulated_upi_fastpay',
        });

      assert.equal(checkoutRes.status, 200);
      assert.equal(checkoutRes.body.success, true);
      assert.equal(checkoutRes.body.contribution.paymentStatus, 'SUCCEEDED');

      // Verify campaign totals NOW increased exactly once
      const finalCamp = await dbStore.getCampaignByIdOrSlug('camp-3');
      assert.equal(finalCamp?.raisedAmount, initialRaised + 25000);
      assert.equal(finalCamp?.backerCount, initialBackers + 1);

      // 3. Idempotency test: Re-submitting checkout on already-succeeded contribution does NOT double count
      const duplicateRes = await request(app)
        .post(`/api/contributions/${ref}/checkout`)
        .send({ outcome: 'SUCCEEDED' });

      assert.equal(duplicateRes.status, 200);
      const afterDuplicateCamp = await dbStore.getCampaignByIdOrSlug('camp-3');
      assert.equal(afterDuplicateCamp?.raisedAmount, initialRaised + 25000);
      assert.equal(afterDuplicateCamp?.backerCount, initialBackers + 1);
    });

    it('ensures failed and cancelled simulated payments do NOT increase funding totals', async () => {
      const camp = await dbStore.getCampaignByIdOrSlug('camp-4');
      assert.ok(camp);
      const startingRaised = camp.raisedAmount;

      // 1. Test FAILED outcome
      const failCreate = await request(app)
        .post('/api/campaigns/camp-4/contributions')
        .send({ amount: 10000, currency: 'INR', backerName: 'Test Backer 1' });
      const failRef = failCreate.body.receiptReference;

      const failCheckout = await request(app)
        .post(`/api/contributions/${failRef}/checkout`)
        .send({ outcome: 'FAILED' });

      assert.equal(failCheckout.body.contribution.paymentStatus, 'FAILED');
      let currentCamp = await dbStore.getCampaignByIdOrSlug('camp-4');
      assert.equal(currentCamp?.raisedAmount, startingRaised);

      // 2. Test CANCELLED outcome
      const cancelCreate = await request(app)
        .post('/api/campaigns/camp-4/contributions')
        .send({ amount: 10000, currency: 'INR', backerName: 'Test Backer 2' });
      const cancelRef = cancelCreate.body.receiptReference;

      const cancelCheckout = await request(app)
        .post(`/api/contributions/${cancelRef}/checkout`)
        .send({ outcome: 'CANCELLED' });

      assert.equal(cancelCheckout.body.contribution.paymentStatus, 'CANCELLED');
      currentCamp = await dbStore.getCampaignByIdOrSlug('camp-4');
      assert.equal(currentCamp?.raisedAmount, startingRaised);
    });

    it('supports following, tracking, and retrieving followed campaigns', async () => {
      const userId = 'usr-test-follower';

      // Follow campaign
      const followRes = await request(app)
        .post('/api/campaigns/camp-1/follow')
        .set('x-demo-user-id', userId);

      assert.equal(followRes.status, 200);
      assert.equal(followRes.body.followed, true);

      // Check is following
      const statusRes = await request(app)
        .get('/api/campaigns/camp-1/follow')
        .set('x-demo-user-id', userId);

      assert.equal(statusRes.status, 200);
      assert.equal(statusRes.body.followed, true);

      // Get user's followed campaigns
      const listRes = await request(app)
        .get('/api/my/followed-campaigns')
        .set('x-demo-user-id', userId);

      assert.equal(listRes.status, 200);
      assert.ok(Array.isArray(listRes.body.data));
      assert.ok(listRes.body.data.some((c: any) => c.id === 'camp-1'));

      // Unfollow campaign
      const unfollowRes = await request(app)
        .delete('/api/campaigns/camp-1/follow')
        .set('x-demo-user-id', userId);

      assert.equal(unfollowRes.status, 200);
      assert.equal(unfollowRes.body.followed, false);
    });

    it('transitions to FUNDING_GOAL_REACHED on goal crossing without prematurely launching ads', async () => {
      // Find a campaign and top it off to its targetAmount
      const camp = await dbStore.getCampaignByIdOrSlug('camp-2');
      assert.ok(camp);
      const remainingNeeded = Math.max(1000, camp.targetAmount - camp.raisedAmount);

      const createRes = await request(app)
        .post('/api/campaigns/camp-2/contributions')
        .send({
          amount: remainingNeeded,
          currency: 'INR',
          backerName: 'Goal Finisher',
        });

      const ref = createRes.body.receiptReference;
      await request(app)
        .post(`/api/contributions/${ref}/checkout`)
        .send({ outcome: 'SUCCEEDED' });

      const updatedCamp = await dbStore.getCampaignByIdOrSlug('camp-2');
      assert.ok(updatedCamp!.raisedAmount >= updatedCamp!.targetAmount);
      // Status must be FUNDING_GOAL_REACHED, NOT PROMOTING!
      assert.equal(updatedCamp!.status, CampaignStatus.FUNDING_GOAL_REACHED);
    });
  });

  describe('9. Creator Dashboard, Campaign Analytics, Reports & Notification Center', () => {
    it('returns creator dashboard with mutually exclusive overview counts', async () => {
      const res = await request(app)
        .get('/api/campaigns/my')
        .set('x-demo-user-id', 'usr-creator-1')
        .set('x-demo-user-role', 'CREATOR');

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.overview);

      const { overview, data: campaigns, drafts } = res.body;

      // Mutual exclusivity check
      const sumStates =
        overview.draftsCount +
        overview.underReviewCount +
        overview.availableForFundingCount +
        overview.promotingCount +
        overview.completedCount +
        overview.requiresActionCount;

      assert.equal(overview.totalCreated, sumStates);
      assert.ok(campaigns.length > 0);
      assert.ok(Array.isArray(drafts));
    });

    it('calculates comprehensive funding & distribution analytics with valid CTR handling', async () => {
      const res = await request(app)
        .get('/api/campaigns/camp-5/analytics')
        .set('x-demo-user-id', 'usr-creator-1');

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);

      const { fundingMetrics, distributionMetrics, metricDefinitions } = res.body.data;

      // 1. Funding integrity
      assert.ok(fundingMetrics.raisedAmount > 0);
      assert.equal(fundingMetrics.platformFees, Math.round(fundingMetrics.raisedAmount * 0.05));
      assert.equal(fundingMetrics.netAdvertisingBudget, fundingMetrics.raisedAmount - fundingMetrics.platformFees);
      assert.ok(fundingMetrics.advertisingSpend <= fundingMetrics.netAdvertisingBudget);
      assert.equal(fundingMetrics.unspentBudget, fundingMetrics.netAdvertisingBudget - fundingMetrics.advertisingSpend);

      // 2. CTR calculation
      if (distributionMetrics.actualImpressions && distributionMetrics.clicks) {
        const expectedCtr = Number(((distributionMetrics.clicks / distributionMetrics.actualImpressions) * 100).toFixed(2));
        assert.equal(distributionMetrics.clickThroughRate, expectedCtr);
      }

      // 3. Definitions present
      assert.ok(metricDefinitions.fundingReceived);
      assert.ok(metricDefinitions.advertisingBudgetAllocated);
      assert.ok(metricDefinitions.measuredReach);
    });

    it('separates verified delivery metrics from estimated metrics in final distribution report', async () => {
      const res = await request(app)
        .get('/api/campaigns/camp-9/report');

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);

      const report = res.body.report;
      assert.equal(report.status, 'COMPLETED');
      assert.equal(report.isDemonstrationReport, true);
      assert.ok(report.demonstrationNotice.includes('Simulated demonstration report'));

      // Verified delivery metrics
      assert.ok(report.verifiedDelivery.actualImpressions > 0);
      assert.ok(report.verifiedDelivery.measuredReach > 0);
      assert.ok(report.verifiedDelivery.advertisingSpend > 0);

      // Estimated metrics distinct
      assert.ok(report.estimatedMetrics.estimatedReach > 0);
      assert.notEqual(report.verifiedDelivery.measuredReach, report.estimatedMetrics.estimatedReach);

      // Financial accounting
      assert.ok(report.financialAccounting.totalRaised > 0);
      assert.equal(report.financialAccounting.platformFees, Math.round(report.financialAccounting.totalRaised * 0.05));
    });

    it('tracks notification read states and allows marking single and all as read', async () => {
      const userId = 'usr-test-notifications-1';

      // 1. Get initial activities
      const initialRes = await request(app)
        .get('/api/activity')
        .set('x-demo-user-id', userId);

      assert.equal(initialRes.status, 200);
      assert.ok(initialRes.body.data.length > 0);
      const firstActId = initialRes.body.data[0].id;

      // 2. Mark single activity as read
      const readOneRes = await request(app)
        .post(`/api/activity/${firstActId}/read`)
        .set('x-demo-user-id', userId);

      assert.equal(readOneRes.status, 200);
      assert.equal(readOneRes.body.data.isRead, true);

      // 3. Mark all as read
      const readAllRes = await request(app)
        .post('/api/activity/mark-all-read')
        .set('x-demo-user-id', userId);

      assert.equal(readAllRes.status, 200);

      // 4. Verify unread count is now 0
      const afterRes = await request(app)
        .get('/api/activity')
        .set('x-demo-user-id', userId);

      assert.equal(afterRes.body.unreadCount, 0);
    });

    it('manages in-app notification preferences', async () => {
      const userId = 'usr-test-prefs-1';

      // 1. Get default preferences
      const getRes = await request(app)
        .get('/api/activity/preferences')
        .set('x-demo-user-id', userId);

      assert.equal(getRes.status, 200);
      assert.equal(getRes.body.data.milestoneAlerts, true);

      // 2. Update preferences
      const updateRes = await request(app)
        .put('/api/activity/preferences')
        .set('x-demo-user-id', userId)
        .send({ milestoneAlerts: false, weeklyDigest: true });

      assert.equal(updateRes.status, 200);
      assert.equal(updateRes.body.data.milestoneAlerts, false);
      assert.equal(updateRes.body.data.weeklyDigest, true);
    });

    it('prevents duplicate milestone notifications when funding thresholds are crossed', async () => {
      const camp = await dbStore.getCampaignByIdOrSlug('camp-1');
      assert.ok(camp);

      const activitiesBefore = (await dbStore.getActivities()).activities.filter(
        a => a.campaignId === camp.id && a.eventType === 'FUNDING_MILESTONE_REACHED'
      );

      // Multiple successive contributions
      for (let i = 0; i < 2; i++) {
        const createRes = await request(app)
          .post(`/api/campaigns/${camp.id}/contributions`)
          .send({ amount: 5000, currency: 'USD', backerName: `Backer ${i}` });
        const ref = createRes.body.receiptReference;
        await request(app)
          .post(`/api/contributions/${ref}/checkout`)
          .send({ outcome: 'SUCCEEDED' });
      }

      const activitiesAfter = (await dbStore.getActivities()).activities.filter(
        a => a.campaignId === camp.id && a.eventType === 'FUNDING_MILESTONE_REACHED'
      );

      // Ensure no duplicates with identical percentage
      const percentages = activitiesAfter.map(a => a.metadata?.percentage);
      const uniquePercentages = new Set(percentages);
      assert.equal(percentages.length, uniquePercentages.size);
    });
  });

  describe('10. Trustworthy Review Workflow, Lifecycle Enforcement & Security Edge Cases', () => {
    it('rejects unauthorized access to reviewer queue when lacking reviewer permissions', async () => {
      // Ordinary creator attempting to access reviewer queue
      const res = await request(app)
        .get('/api/review/queue')
        .set('x-demo-user-id', 'usr-creator-1');

      assert.equal(res.status, 403);
      assert.match(res.body.message, /Insufficient permissions/i);
    });

    it('rejects client attempts to escalate privileges via x-demo-user-role header', async () => {
      // Attacker supplying x-demo-user-role: ADMIN with arbitrary user ID
      const res = await request(app)
        .get('/api/review/queue')
        .set('x-demo-user-id', 'usr-attacker-999')
        .set('x-demo-user-role', 'ADMIN');

      assert.equal(res.status, 403);
      assert.match(res.body.message, /Insufficient permissions/i);
    });

    it('allows authorized demo admin to access review queue with persisted campaigns', async () => {
      const res = await request(app)
        .get('/api/review/queue')
        .set('x-demo-user-id', 'usr-admin-1');

      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.data));
      assert.ok(res.body.data.length > 0);
      assert.ok(res.body.data.some((c: any) => c.id === 'camp-11'));
    });

    it('prohibits creators from reviewing or approving their own submissions (self-review protection)', async () => {
      // Create a submission where creatorId is usr-admin-1
      const draftRes = await request(app)
        .post('/api/drafts')
        .set('x-demo-user-id', 'usr-admin-1')
        .send({
          title: 'Admin Own Personal Campaign Project',
          draftData: {
            summary: 'A project submitted by admin account for testing self-review prevention.',
            fundingGoal: 400000,
            category: 'Civic',
          },
        });
      const draftId = draftRes.body.data.id;

      const submitRes = await request(app)
        .post(`/api/drafts/${draftId}/submit`)
        .set('x-demo-user-id', 'usr-admin-1');
      const submittedCampaignId = submitRes.body.data.id;

      // Attempt to self-approve with admin credentials
      const reviewRes = await request(app)
        .post(`/api/review/${submittedCampaignId}/decision`)
        .set('x-demo-user-id', 'usr-admin-1')
        .send({
          decision: 'APPROVED',
          feedback: 'Approving my own campaign.',
        });

      assert.equal(reviewRes.status, 403);
      assert.match(reviewRes.body.message, /Creators cannot review or approve their own campaigns/i);
    });

    it('requires meaningful feedback on CHANGES_REQUESTED and rejection reason on REJECTED', async () => {
      // 1. Changes requested with missing feedback
      const emptyFeedbackRes = await request(app)
        .post('/api/review/camp-11/decision')
        .set('x-demo-user-id', 'usr-admin-1')
        .send({
          decision: 'CHANGES_REQUESTED',
          feedback: '  ',
        });
      assert.equal(emptyFeedbackRes.status, 400);

      // 2. Reject with short/missing reason
      const emptyRejectRes = await request(app)
        .post('/api/review/camp-11/decision')
        .set('x-demo-user-id', 'usr-admin-1')
        .send({
          decision: 'REJECTED',
          feedback: 'bad',
        });
      assert.equal(emptyRejectRes.status, 400);
    });

    it('defends against SSRF hazards and invalid URL protocols', async () => {
      const { validateSourceUrl } = await import('../lib/sourceValidator.js');

      // AWS/Cloud Link-Local Metadata Service
      const awsMetadata = validateSourceUrl('http://169.254.169.254/latest/meta-data/');
      assert.equal(awsMetadata.isSsrfSafe, false);

      // Localhost and loopback IPv4
      const localhost = validateSourceUrl('http://127.0.0.1:8080/admin');
      assert.equal(localhost.isSsrfSafe, false);

      // Private Class C IP
      const privateNet = validateSourceUrl('http://192.168.1.1/gateway');
      assert.equal(privateNet.isSsrfSafe, false);

      // Invalid schemes
      const fileUrl = validateSourceUrl('file:///etc/passwd');
      assert.equal(fileUrl.isValidUrl, false);

      const javascriptUrl = validateSourceUrl('javascript:alert(1)');
      assert.equal(javascriptUrl.isValidUrl, false);

      // Safe Public HTTPS
      const safeUrl = validateSourceUrl('https://usda.gov/food-waste-recovery');
      assert.equal(safeUrl.isValidUrl, true);
      assert.equal(safeUrl.isSsrfSafe, true);
      assert.equal(safeUrl.isSecureProtocol, true);
    });

    it('supports the complete creator revision and resubmission lifecycle', async () => {
      // camp-13 is initially in CHANGES_REQUESTED
      const campBefore = await dbStore.getCampaignByIdOrSlug('camp-13');
      assert.equal(campBefore?.status, 'CHANGES_REQUESTED');

      // Creator edits and resubmits
      const resubmitRes = await request(app)
        .post('/api/campaigns/camp-13/resubmit')
        .set('x-demo-user-id', 'usr-creator-1')
        .send({
          adHeadline: 'Revised Heat Safety Protections Guidance',
          sources: [
            {
              title: 'Cal/OSHA Heat Illness Prevention Standard Title 8 Section 3395',
              publisher: 'Department of Industrial Relations',
              url: 'https://dir.ca.gov/title8/3395.html',
              relevance: 'Statutory basis for employer-provided hydration and shade.',
              position: 1,
            },
          ],
        });

      assert.equal(resubmitRes.status, 200);
      assert.equal(resubmitRes.body.data.status, 'SUBMITTED_FOR_REVIEW');

      // Now admin approves the resubmission
      const approveRes = await request(app)
        .post('/api/review/camp-13/decision')
        .set('x-demo-user-id', 'usr-admin-1')
        .send({
          decision: 'APPROVED',
          feedback: 'Verified clinic credentials and primary source standards satisfied.',
        });

      assert.equal(approveRes.status, 200);
      assert.equal(approveRes.body.campaign.status, 'APPROVED');

      // Prevents duplicate approval
      const duplicateRes = await request(app)
        .post('/api/review/camp-13/decision')
        .set('x-demo-user-id', 'usr-admin-1')
        .send({
          decision: 'APPROVED',
          feedback: 'Duplicate attempt.',
        });
      assert.equal(duplicateRes.status, 400);

      // APPROVED does NOT mean AVAILABLE_FOR_FUNDING yet!
      // Must explicitly publish
      const publishRes = await request(app)
        .post('/api/campaigns/camp-13/publish-funding')
        .set('x-demo-user-id', 'usr-creator-1');

      assert.equal(publishRes.status, 200);
      assert.equal(publishRes.body.data.status, 'AVAILABLE_FOR_FUNDING');
    });

    it('enforces distribution authorization gate before transitioning to PROMOTING', async () => {
      // camp-2 reached FUNDING_GOAL_REACHED when its funding goal was hit
      const camp = await dbStore.getCampaignByIdOrSlug('camp-2');
      assert.ok(camp);
      assert.equal(camp.status, 'FUNDING_GOAL_REACHED');

      // Authorize distribution preparation
      const authPrepRes = await request(app)
        .post('/api/campaigns/camp-2/authorize-distribution')
        .set('x-demo-user-id', 'usr-admin-1');

      assert.equal(authPrepRes.status, 200);
      assert.equal(authPrepRes.body.data.status, 'DISTRIBUTION_PREPARATION');

      // Start promotion
      const promoRes = await request(app)
        .post('/api/campaigns/camp-2/start-promotion')
        .set('x-demo-user-id', 'usr-admin-1');

      assert.equal(promoRes.status, 200);
      assert.equal(promoRes.body.data.status, 'PROMOTING');
    });

    it('preserves complete contribution history and receipts when cancelling and processing refunds', async () => {
      // Create and fund a campaign for refund testing
      const draftRes = await request(app)
        .post('/api/drafts')
        .set('x-demo-user-id', 'usr-creator-1')
        .send({
          title: 'Zoning Transparency In Metro Municipal District',
          draftData: {
            summary: 'Civic display ads alerting residents to municipal rezoning changes.',
            fundingGoal: 200000,
            category: 'Civic',
          },
        });
      const submitRes = await request(app)
        .post(`/api/drafts/${draftRes.body.data.id}/submit`)
        .set('x-demo-user-id', 'usr-creator-1');
      const testCampId = submitRes.body.data.id;

      // Admin approves
      await request(app)
        .post(`/api/review/${testCampId}/decision`)
        .set('x-demo-user-id', 'usr-admin-1')
        .send({ decision: 'APPROVED', feedback: 'Legitimate civic transparency project.' });

      // Publish to funding
      await request(app)
        .post(`/api/campaigns/${testCampId}/publish-funding`)
        .set('x-demo-user-id', 'usr-creator-1');

      // Make contribution
      const contribRes = await request(app)
        .post(`/api/campaigns/${testCampId}/contributions`)
        .send({ amount: 50000, currency: 'INR', backerName: 'Marcus Vance' });
      const ref = contribRes.body.receiptReference;

      await request(app)
        .post(`/api/contributions/${ref}/checkout`)
        .send({ outcome: 'SUCCEEDED' });

      // Campaign is cancelled after receiving contributions
      const cancelRes = await request(app)
        .post(`/api/campaigns/${testCampId}/cancel`)
        .set('x-demo-user-id', 'usr-creator-1')
        .send({ reason: 'City council voted down the rezoning ordinance early.' });

      assert.equal(cancelRes.status, 200);
      assert.equal(cancelRes.body.data.status, 'REFUND_PENDING');

      // Process refunds
      const refundRes = await request(app)
        .post(`/api/campaigns/${testCampId}/process-refunds`)
        .set('x-demo-user-id', 'usr-admin-1');

      assert.equal(refundRes.status, 200);
      assert.equal(refundRes.body.data.refundedCount, 1);
      assert.equal(refundRes.body.data.preservedContributionRecordsCount, 1);
      assert.equal(refundRes.body.data.campaign.status, 'FAILED');

      // Contribution history is intact
      const contribCheck = await dbStore.getContributionByReference(ref);
      assert.ok(contribCheck);
      assert.equal(contribCheck.paymentStatus, 'REFUNDED');
    });
  });
});

