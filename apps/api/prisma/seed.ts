import { PrismaClient, CampaignStatus, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { SEED_CAMPAIGNS, SEED_USERS } from '../src/data/seedData.js';
import { calculateFeeBreakdown } from '../src/lib/reachCalculator.js';

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PRODUCTION_SEED !== 'true') {
    console.error('⛔ ABORTED: Database seeding is blocked in production mode.');
    console.error('   To explicitly seed a staging or production database, set ALLOW_PRODUCTION_SEED=true.');
    process.exit(1);
  }

  console.log('🌱 Starting Campaign Amplification Database Seed...');

  // 1. Provision Initial Administrator Account (Idempotent, strictly from ENV)
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@campaign.com').trim().toLowerCase();
  const adminPassword = (process.env.ADMIN_PASSWORD || '').trim();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!adminEmail || !emailRegex.test(adminEmail)) {
    console.error('❌ SEED ERROR: ADMIN_EMAIL environment variable is missing or invalid.');
    console.error('   Please provide a valid administrator email address via ADMIN_EMAIL.');
    process.exit(1);
  }

  if (!adminPassword || adminPassword.length < 8) {
    console.error('❌ SEED ERROR: ADMIN_PASSWORD environment variable is missing or shorter than 8 characters.');
    console.error('   Please provide a strong, unique administrator password (min 8 characters) via ADMIN_PASSWORD.');
    process.exit(1);
  }

  // Migrate any legacy reviewer/backer user records in database before upsert
  try {
    await prisma.$executeRawUnsafe(`UPDATE "User" SET role = 'ADMIN' WHERE role::text = 'REVIEWER'`);
    await prisma.$executeRawUnsafe(`UPDATE "User" SET role = 'CREATOR' WHERE role::text NOT IN ('ADMIN', 'CREATOR')`);
  } catch {
    // Handled safely if already on updated schema or in development
  }

  const adminPasswordHash = await bcrypt.hash(adminPassword, 10);
  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      role: UserRole.ADMIN,
      passwordHash: adminPasswordHash,
      name: process.env.ADMIN_NAME || 'Platform Administrator',
    },
    create: {
      id: 'usr-admin-1',
      email: adminEmail,
      name: process.env.ADMIN_NAME || 'Platform Administrator',
      role: UserRole.ADMIN,
      passwordHash: adminPasswordHash,
    },
  });
  console.log(`   ✓ Provisioned Administrator: ${adminUser.email} (${adminUser.role})`);

  // 2. Seed Users (Creator accounts)
  for (const u of SEED_USERS) {
    // Administrator is already provisioned exclusively from environment variables in Step 1
    if (u.role === UserRole.ADMIN || u.id === 'usr-admin-1' || u.email === adminEmail) continue;
    const defaultPasswordHash = await bcrypt.hash('CampaignSecure2026!', 10);
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        role: u.role,
      },
      create: {
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        passwordHash: defaultPasswordHash,
      },
    });
    console.log(`   ✓ Seeded User: ${u.email} (${u.role})`);
  }

  // 2. Seed Campaigns
  for (const c of SEED_CAMPAIGNS) {
    const campaign = await prisma.campaign.upsert({
      where: { slug: c.slug },
      update: {
        title: c.title,
        tagLine: c.tagLine,
        summary: c.summary,
        category: c.category,
        targetAmount: c.targetAmount,
        raisedAmount: c.raisedAmount,
        backerCount: c.backerCount,
        status: c.status,
        imageUrl: c.imageUrl,
        targetAudience: c.targetAudience,
        targetLocations: c.targetLocations,
        audienceInterests: c.audienceInterests,
        distributionChannels: c.distributionChannels,
        adHeadline: c.adHeadline,
        adDescription: c.adDescription,
        ctaText: c.ctaText,
        creatorName: c.creatorName,
      },
      create: {
        id: c.id,
        slug: c.slug,
        title: c.title,
        tagLine: c.tagLine,
        summary: c.summary,
        narrative: c.narrative,
        category: c.category,
        targetAmount: c.targetAmount,
        raisedAmount: c.raisedAmount,
        backerCount: c.backerCount,
        reachMultiplier: c.reachMultiplier,
        estimatedReach: c.estimatedReach,
        deliveredReach: c.deliveredReach,
        trustScore: c.trustScore,
        trustCategory: c.trustCategory,
        status: c.status,
        targetAudience: c.targetAudience,
        targetLocations: c.targetLocations,
        audienceInterests: c.audienceInterests,
        distributionChannels: c.distributionChannels,
        imageUrl: c.imageUrl,
        adHeadline: c.adHeadline,
        adDescription: c.adDescription,
        ctaText: c.ctaText,
        creatorName: c.creatorName,
        creatorId: 'usr-creator-1',
        daysLeft: c.daysLeft,
        durationDays: c.durationDays,
      },
    });

    // Seed Story Sections
    if (c.storySections && c.storySections.length > 0) {
      await prisma.campaignStorySection.deleteMany({ where: { campaignId: campaign.id } });
      for (const sec of c.storySections) {
        await prisma.campaignStorySection.create({
          data: {
            campaignId: campaign.id,
            heading: sec.heading,
            content: sec.content,
            position: sec.position,
            imageUrl: sec.imageUrl,
            imageCaption: sec.imageCaption,
            imageCredit: sec.imageCredit,
          },
        });
      }
    }

    // Seed Sources
    if (c.sources && c.sources.length > 0) {
      await prisma.campaignSource.deleteMany({ where: { campaignId: campaign.id } });
      for (const src of c.sources) {
        await prisma.campaignSource.create({
          data: {
            campaignId: campaign.id,
            title: src.title,
            publisher: src.publisher,
            url: src.url,
            relevance: src.relevance,
            position: src.position,
          },
        });
      }
    }

    // Seed Sample Report
    if (c.report) {
      await prisma.campaignReport.upsert({
        where: { campaignId: campaign.id },
        update: {
          advertisingSpend: c.report.advertisingSpend,
          impressions: c.report.impressions,
          clicks: c.report.clicks,
          measuredReach: c.report.measuredReach,
        },
        create: {
          campaignId: campaign.id,
          advertisingBudgetAllocated: c.report.advertisingBudgetAllocated,
          advertisingSpend: c.report.advertisingSpend,
          impressions: c.report.impressions,
          clicks: c.report.clicks,
          estimatedReach: c.report.estimatedReach,
          measuredReach: c.report.measuredReach,
          reportingStatus: c.report.reportingStatus,
        },
      });
    }

    console.log(`   ✓ Seeded Campaign: ${c.title} (${c.category})`);
  }

  console.log('✅ Database seed completed successfully.');
}

main()
  .catch(e => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
