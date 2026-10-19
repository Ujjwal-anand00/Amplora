import { CampaignStatus, UserRole } from '@prisma/client';

export interface TransitionRule {
  from: CampaignStatus[];
  to: CampaignStatus;
  allowedRoles: UserRole[];
  description: string;
}

export const CAMPAIGN_TRANSITIONS: Record<string, TransitionRule> = {
  SUBMIT: {
    from: [CampaignStatus.DRAFT, CampaignStatus.CHANGES_REQUESTED],
    to: CampaignStatus.SUBMITTED_FOR_REVIEW,
    allowedRoles: [UserRole.CREATOR, UserRole.ADMIN],
    description: 'Creator submits draft for factual and editorial certification.',
  },
  APPROVE: {
    from: [CampaignStatus.SUBMITTED_FOR_REVIEW],
    to: CampaignStatus.APPROVED,
    allowedRoles: [UserRole.ADMIN],
    description: 'Administrator certifies claims and approves campaign.',
  },
  REQUEST_CHANGES: {
    from: [CampaignStatus.SUBMITTED_FOR_REVIEW],
    to: CampaignStatus.CHANGES_REQUESTED,
    allowedRoles: [UserRole.ADMIN],
    description: 'Administrator requests additional primary sources or clarity.',
  },
  REJECT: {
    from: [CampaignStatus.SUBMITTED_FOR_REVIEW],
    to: CampaignStatus.REJECTED,
    allowedRoles: [UserRole.ADMIN],
    description: 'Administrator rejects campaign due to non-verifiable claims or policy breach.',
  },
  PUBLISH_FOR_FUNDING: {
    from: [CampaignStatus.APPROVED],
    to: CampaignStatus.AVAILABLE_FOR_FUNDING,
    allowedRoles: [UserRole.CREATOR, UserRole.ADMIN],
    description: 'Certified campaign is published to the public feed for community pooling.',
  },
  REACH_GOAL: {
    from: [CampaignStatus.AVAILABLE_FOR_FUNDING],
    to: CampaignStatus.FUNDING_GOAL_REACHED,
    allowedRoles: [UserRole.ADMIN], // System event when totalRaised >= targetAmount
    description: 'Community backer contributions reach the amplification goal threshold.',
  },
  EXPIRE_DEADLINE: {
    from: [CampaignStatus.AVAILABLE_FOR_FUNDING],
    to: CampaignStatus.FUNDING_PERIOD_ENDED,
    allowedRoles: [UserRole.ADMIN],
    description: 'Campaign active duration expires.',
  },
  PREPARE_DISTRIBUTION: {
    from: [CampaignStatus.FUNDING_GOAL_REACHED],
    to: CampaignStatus.DISTRIBUTION_PREPARATION,
    allowedRoles: [UserRole.ADMIN],
    description: 'Escrow released to reserve third-party ad inventory and creative pre-flight checks.',
  },
  START_PROMOTION: {
    from: [CampaignStatus.DISTRIBUTION_PREPARATION],
    to: CampaignStatus.PROMOTING,
    allowedRoles: [UserRole.ADMIN],
    description: 'Live advertising distribution begins across candidate channels.',
  },
  COMPLETE_PROMOTION: {
    from: [CampaignStatus.PROMOTING],
    to: CampaignStatus.COMPLETED,
    allowedRoles: [UserRole.ADMIN],
    description: 'All advertising budget delivered, verified impression receipts published.',
  },
  INITIATE_REFUND: {
    from: [CampaignStatus.FUNDING_PERIOD_ENDED, CampaignStatus.CANCELLED],
    to: CampaignStatus.REFUND_PENDING,
    allowedRoles: [UserRole.ADMIN],
    description: 'Campaign did not hit viable threshold; escrow refund process initiated.',
  },
  COMPLETE_REFUND: {
    from: [CampaignStatus.REFUND_PENDING],
    to: CampaignStatus.FAILED,
    allowedRoles: [UserRole.ADMIN],
    description: 'Refunds returned to backer accounts according to platform escrow policy.',
  },
  CANCEL: {
    from: [
      CampaignStatus.DRAFT,
      CampaignStatus.SUBMITTED_FOR_REVIEW,
      CampaignStatus.APPROVED,
      CampaignStatus.AVAILABLE_FOR_FUNDING,
      CampaignStatus.CHANGES_REQUESTED,
    ],
    to: CampaignStatus.CANCELLED,
    allowedRoles: [UserRole.CREATOR, UserRole.ADMIN],
    description: 'Campaign cancelled prior to ad distribution.',
  },
};

/**
 * Validates whether a state transition is legal and permitted for a given user role
 */
export function validateCampaignTransition(
  currentStatus: CampaignStatus,
  targetStatus: CampaignStatus,
  userRole: UserRole = UserRole.ADMIN
): { valid: boolean; reason?: string } {
  const transition = Object.values(CAMPAIGN_TRANSITIONS).find(
    t => t.to === targetStatus && t.from.includes(currentStatus)
  );

  if (!transition) {
    return {
      valid: false,
      reason: `Illegal transition from ${currentStatus} to ${targetStatus}.`,
    };
  }

  if (!transition.allowedRoles.includes(userRole)) {
    return {
      valid: false,
      reason: `Role ${userRole} is not authorized to transition campaign from ${currentStatus} to ${targetStatus}. Requires ${transition.allowedRoles.join(' or ')}.`,
    };
  }

  return { valid: true };
}

/**
 * Public visibility filter:
 * Only APPROVED, AVAILABLE_FOR_FUNDING, FUNDING_GOAL_REACHED, DISTRIBUTION_PREPARATION, PROMOTING, COMPLETED
 * can be discovered by the public.
 */
export const PUBLIC_VISIBILITY_STATUSES: CampaignStatus[] = [
  CampaignStatus.APPROVED,
  CampaignStatus.AVAILABLE_FOR_FUNDING,
  CampaignStatus.FUNDING_GOAL_REACHED,
  CampaignStatus.DISTRIBUTION_PREPARATION,
  CampaignStatus.PROMOTING,
  CampaignStatus.COMPLETED,
];

export function isCampaignPubliclyDiscoverable(status: CampaignStatus): boolean {
  return PUBLIC_VISIBILITY_STATUSES.includes(status);
}
