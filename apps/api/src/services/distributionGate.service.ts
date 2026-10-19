import { CampaignStatus, UserRole } from '@prisma/client';
import { SeedCampaign } from '../data/seedData.js';
import { validateCreatives } from '../lib/sourceValidator.js';
import { AppError } from '../middleware/errorHandler.js';

export interface GateCheckItem {
  passed: boolean;
  name: string;
  details: string;
}

export interface GateValidationResult {
  eligible: boolean;
  campaignId: string;
  currentStatus: CampaignStatus;
  checks: Record<string, GateCheckItem>;
  blockingReasons: string[];
}

export class DistributionGateService {
  /**
   * Evaluates all prerequisites required before a campaign can transition into
   * DISTRIBUTION_PREPARATION or live PROMOTING.
   */
  validateDistributionPrerequisites(campaign: SeedCampaign): GateValidationResult {
    const checks: Record<string, GateCheckItem> = {};
    const blockingReasons: string[] = [];

    // 1. Eligible Campaign State
    const eligibleState =
      campaign.status === CampaignStatus.FUNDING_GOAL_REACHED ||
      campaign.status === CampaignStatus.DISTRIBUTION_PREPARATION;
    checks['lifecycleStatus'] = {
      passed: eligibleState,
      name: 'Eligible Lifecycle State',
      details: eligibleState
        ? `Campaign is in eligible status: ${campaign.status}`
        : `Campaign status "${campaign.status}" is ineligible. Must be FUNDING_GOAL_REACHED or DISTRIBUTION_PREPARATION.`,
    };
    if (!eligibleState) {
      blockingReasons.push(`Campaign must reach funding goal or be in preparation before distribution. Current: ${campaign.status}`);
    }

    // 2. Factual Review Certification
    // Must have passed factual review
    const reviewCertified = Boolean(campaign.approvalTimestamp || campaign.status !== CampaignStatus.SUBMITTED_FOR_REVIEW);
    checks['reviewApproval'] = {
      passed: reviewCertified,
      name: 'Factual Certification & Approval',
      details: reviewCertified
        ? 'Campaign passed editorial and factual verification review.'
        : 'Campaign has not received administrator certification.',
    };
    if (!reviewCertified) {
      blockingReasons.push('Campaign must be formally certified and approved by an administrator.');
    }

    // 3. Required Funding Threshold
    const fundingMet = campaign.raisedAmount >= campaign.targetAmount;
    checks['fundingThreshold'] = {
      passed: fundingMet,
      name: 'Funding Goal Threshold',
      details: `Raised $${(campaign.raisedAmount / 100).toLocaleString('en-US')} of $${(campaign.targetAmount / 100).toLocaleString('en-US')} goal.`,
    };
    if (!fundingMet) {
      blockingReasons.push(`Funding threshold not met (${Math.round((campaign.raisedAmount / campaign.targetAmount) * 100)}%).`);
    }

    // 4. Valid Advertising Budget (95% media allocation)
    const netMediaAllocation = Math.floor(campaign.raisedAmount * 0.95);
    const validMediaBudget = netMediaAllocation > 0;
    checks['advertisingBudget'] = {
      passed: validMediaBudget,
      name: 'Dedicated Media Budget Allocation',
      details: validMediaBudget
        ? `Allocated net media spend: $${(netMediaAllocation / 100).toLocaleString('en-US')} (95% of contributions).`
        : 'Zero media budget allocated.',
    };

    if (!validMediaBudget) {
      blockingReasons.push('Net advertising media allocation must be greater than zero.');
    }

    // 5. Approved Creative Assets
    const creativeValidation = validateCreatives({
      headline: campaign.adHeadline,
      description: campaign.adDescription,
      imageUrl: campaign.imageUrl,
    });
    const creativesPassed =
      creativeValidation.headlineValid &&
      creativeValidation.descriptionValid &&
      creativeValidation.imageUrlValid;
    checks['creativeAssets'] = {
      passed: creativesPassed,
      name: 'Ad Creative Pre-Flight Validation',
      details: creativesPassed
        ? 'Headline, description, and cover creative pass technical specifications.'
        : `Creative defects: ${creativeValidation.warnings.join(', ')}`,
    };
    if (!creativesPassed) {
      blockingReasons.push(`Creative validation failed: ${creativeValidation.warnings.join('; ')}`);
    }

    // 6. Targeting and Distribution Settings
    const targetingPassed =
      Array.isArray(campaign.targetLocations) &&
      campaign.targetLocations.length > 0 &&
      Array.isArray(campaign.distributionChannels) &&
      campaign.distributionChannels.length > 0;
    checks['distributionTargeting'] = {
      passed: targetingPassed,
      name: 'Geographic & Channel Targeting',
      details: targetingPassed
        ? `${campaign.distributionChannels.join(', ')} targeted to ${campaign.targetLocations.join(', ')}.`
        : 'Missing target geography or distribution channels.',
    };
    if (!targetingPassed) {
      blockingReasons.push('Campaign must specify at least one target location and distribution channel.');
    }

    const eligible = blockingReasons.length === 0;

    return {
      eligible,
      campaignId: campaign.id,
      currentStatus: campaign.status,
      checks,
      blockingReasons,
    };
  }

  /**
   * Asserts readiness, throwing a structured AppError if prerequisites are not satisfied.
   */
  assertReadyForPreparation(campaign: SeedCampaign): GateValidationResult {
    const result = this.validateDistributionPrerequisites(campaign);
    if (!result.eligible) {
      throw new AppError(
        `Distribution authorization denied: ${result.blockingReasons.join('; ')}`,
        422
      );
    }
    return result;
  }
}

export const distributionGate = new DistributionGateService();
