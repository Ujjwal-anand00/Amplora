import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { FeaturedCampaignCard } from '../../components/campaigns/FeaturedCampaignCard';
import { HorizontalCampaignCard } from '../../components/campaigns/HorizontalCampaignCard';
import { CampaignCard } from '../../components/campaigns/CampaignCard';
import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { colors, typography, spacing, radii, shadows } from '../../theme';
import { useCampaignStore } from '../../services/campaignStore';
import { DEFAULT_REACH_CONFIG, formatMetricNumber } from '../../lib/reachCalculator';

export default function HomeScreen() {
  const router = useRouter();
  const store = useCampaignStore();
  const [refreshing, setRefreshing] = useState(false);

  const allCampaigns = store.getAllCampaigns();
  const featuredCampaign = store.getFeaturedCampaign();
  const horizontalCampaigns = allCampaigns.filter(c => c.id !== featuredCampaign.id).slice(0, 5);
  const recentCampaigns = allCampaigns.filter(c => c.id !== featuredCampaign.id).slice(2, 6);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 600);
  };

  // 1 dollar gives approximately 27 impressions at $37 CPM
  const impressionsPerDollar = Math.round((1 / DEFAULT_REACH_CONFIG.assumedCPM) * 1000);

  return (
    <ScreenContainer refreshing={refreshing} onRefresh={onRefresh} padded={true}>
      {/* 1. Header: Brand mark, wordmark, greeting, and profile shortcut */}
      <View style={styles.header}>
        <View style={styles.brandGroup}>
          <View style={styles.brandLogoCircle}>
            <Ionicons name="megaphone" size={17} color={colors.accent} />
          </View>
          <View>
            <Text style={styles.brandWordmark}>CAMPAIGNS</Text>
            <Text style={styles.brandSub}>Message Amplification</Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => router.push('/(tabs)/profile')}
          activeOpacity={0.7}
          style={styles.profileBtn}
          accessibilityLabel="Open profile"
        >
          <Avatar
            name="Advocate"
            size={38}
            source="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80"
          />
        </TouchableOpacity>
      </View>

      {/* 2. Editorial Hero */}
      <View style={styles.heroSection}>
        <View style={styles.heroPreheadingRow}>
          <View style={styles.demoPillBadge}>
            <Text style={styles.demoPillText}>DEMO ENVIRONMENT</Text>
          </View>
          <Text style={styles.heroMetaText}>Cross-Network Media Spend</Text>
        </View>

        <Text style={styles.heroHeadline}>
          Good messages deserve a wider audience.
        </Text>
        <Text style={styles.heroSupportingText}>
          Discover campaigns that bring important ideas to more people through community-funded promotion.
          Contributions pay for targeted advertising distribution, not operational overhead.
        </Text>

        {/* Reach Illustration Box */}
        <View style={styles.reachIllustrationCard}>
          <View style={styles.reachEquationRow}>
            <View style={styles.budgetPill}>
              <Text style={styles.budgetPillText}>$1.00</Text>
            </View>
            <Ionicons name="arrow-forward" size={16} color={colors.primary} />
            <View style={styles.reachResultBox}>
              <Text style={styles.reachResultNumber}>
                ≈ {impressionsPerDollar} Ad Impressions
              </Text>
              <Text style={styles.reachAssumptionText}>
                Based on an illustrative demo assumption of ${DEFAULT_REACH_CONFIG.assumedCPM} CPM (~$0.037 / view).
              </Text>
            </View>
          </View>
          <Text style={styles.reachDisclaimer}>
            *Actual delivery varies with advertising costs, inventory, targeting density, and creative performance. Not a guaranteed audience size.
          </Text>
        </View>

        {/* Primary and Secondary CTAs */}
        <View style={styles.heroCtasRow}>
          <Button
            title="Explore campaigns"
            onPress={() => router.push('/(tabs)/explore')}
            variant="primary"
            size="md"
            style={styles.heroCtaBtn}
            icon={<Ionicons name="compass-outline" size={18} color={colors.textInverse} />}
          />
          <Button
            title="Start a campaign"
            onPress={() => router.push('/(tabs)/create')}
            variant="secondary"
            size="md"
            style={styles.heroCtaBtn}
            icon={<Ionicons name="add-circle-outline" size={18} color={colors.textPrimary} />}
          />
        </View>
      </View>

      {/* 3. Featured Campaign Section */}
      <View style={styles.sectionDivider} />
      <FeaturedCampaignCard
        campaign={featuredCampaign}
        onPress={() => router.push(`/campaign/${featuredCampaign.id}`)}
      />

      {/* 4. Horizontally Browsable Section */}
      <SectionHeader
        title="Urgent Community Causes"
        subtitle="Campaigns approaching their funding and distribution deadlines"
        actionText="View all"
        onActionPress={() => router.push('/(tabs)/explore')}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalScrollContent}
        style={styles.horizontalScrollView}
      >
        {horizontalCampaigns.map(camp => (
          <HorizontalCampaignCard
            key={camp.id}
            campaign={camp}
            onPress={() => router.push(`/campaign/${camp.id}`)}
          />
        ))}
      </ScrollView>

      {/* 5. How It Works (3 Clear Steps) */}
      <View style={styles.howItWorksCard}>
        <Text style={styles.howItWorksHeader}>How Amplification Works</Text>
        <Text style={styles.howItWorksSub}>
          Reaching a funding goal does not automatically mean advertising has launched.
          Every campaign follows an auditable lifecycle.
        </Text>

        <View style={styles.stepsContainer}>
          {/* Step 1 */}
          <View style={styles.stepRow}>
            <View style={styles.stepNumberBadge}>
              <Text style={styles.stepNumber}>1</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Create</Text>
              <Text style={styles.stepDescription}>
                Advocates prepare a focused message, intended audience targeting, and supporting verifiable source records.
              </Text>
            </View>
          </View>

          <View style={styles.stepConnector} />

          {/* Step 2 */}
          <View style={styles.stepRow}>
            <View style={styles.stepNumberBadge}>
              <Text style={styles.stepNumber}>2</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Review</Text>
              <Text style={styles.stepDescription}>
                The platform checks source documentation, confirms ad policy eligibility, and sets up distribution parameters.
              </Text>
            </View>
          </View>

          <View style={styles.stepConnector} />

          {/* Step 3 */}
          <View style={styles.stepRow}>
            <View style={styles.stepNumberBadge}>
              <Text style={styles.stepNumber}>3</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Amplify</Text>
              <Text style={styles.stepDescription}>
                Community contributions fund cross-network ad placement to reach targeted audiences beyond existing follower feeds.
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* 6. Recent Campaigns Feed */}
      <SectionHeader
        title="Recent Public Submissions"
        subtitle="Newly vetted messages seeking initial promotional backers"
        actionText="Explore 10+ topics"
        onActionPress={() => router.push('/(tabs)/explore')}
      />

      {recentCampaigns.map(camp => (
        <CampaignCard
          key={camp.id}
          campaign={camp}
          onPress={() => router.push(`/campaign/${camp.id}`)}
        />
      ))}

      {/* 7. Final Creator Invitation CTA */}
      <View style={styles.creatorInvitationCard}>
        <View style={styles.creatorInvitationIcon}>
          <Ionicons name="create-outline" size={26} color={colors.primary} />
        </View>
        <Text style={styles.creatorInvitationTitle}>Have an important message to share?</Text>
        <Text style={styles.creatorInvitationBody}>
          Start an amplification campaign to put your evidence and advocacy directly in front of the audiences who need to see it.
        </Text>
        <Button
          title="Start a Campaign"
          onPress={() => router.push('/(tabs)/create')}
          variant="primary"
          size="md"
          icon={<Ionicons name="add-circle-outline" size={18} color={colors.textInverse} />}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    marginBottom: spacing.md,
  },
  brandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  brandLogoCircle: {
    width: 34,
    height: 34,
    borderRadius: radii.sm,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandWordmark: {
    ...typography.labelLarge,
    letterSpacing: 1.5,
    color: colors.primary,
    fontWeight: '800',
  },
  brandSub: {
    ...typography.labelSmall,
    color: colors.textSecondary,
    fontSize: 9,
    letterSpacing: 0.5,
  },
  profileBtn: {
    borderRadius: radii.pill,
  },

  // Hero Section
  heroSection: {
    backgroundColor: colors.surface,
    borderRadius: radii.xxl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  heroPreheadingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  demoPillBadge: {
    backgroundColor: colors.accentSubtle,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  demoPillText: {
    ...typography.labelSmall,
    color: colors.accentDark,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  heroMetaText: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    fontSize: 11,
  },
  heroHeadline: {
    ...typography.displayLarge,
    color: colors.textPrimary,
    lineHeight: 36,
    marginBottom: spacing.xs,
  },
  heroSupportingText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  reachIllustrationCard: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: spacing.md,
  },
  reachEquationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  budgetPill: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
  },
  budgetPillText: {
    ...typography.labelLarge,
    color: colors.textInverse,
    fontWeight: '800',
  },
  reachResultBox: {
    flex: 1,
  },
  reachResultNumber: {
    ...typography.headingSmall,
    color: colors.primary,
    fontWeight: '700',
  },
  reachAssumptionText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 1,
  },
  reachDisclaimer: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    fontSize: 10,
    lineHeight: 14,
    fontStyle: 'italic',
  },
  heroCtasRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  heroCtaBtn: {
    flex: 1,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: colors.borderSubtle,
    marginVertical: spacing.sm,
  },

  // Horizontal Scroll
  horizontalScrollView: {
    marginHorizontal: -spacing.md,
    marginBottom: spacing.lg,
  },
  horizontalScrollContent: {
    paddingHorizontal: spacing.md,
  },

  // How It Works
  howItWorksCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xxl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: spacing.xl,
    ...shadows.card,
  },
  howItWorksHeader: {
    ...typography.headingMedium,
    color: colors.textPrimary,
    marginBottom: spacing.xxs,
  },
  howItWorksSub: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  stepsContainer: {
    paddingLeft: spacing.xs,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  stepNumberBadge: {
    width: 28,
    height: 28,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  stepNumber: {
    ...typography.labelMedium,
    color: colors.primary,
    fontWeight: '700',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    ...typography.labelLarge,
    color: colors.textPrimary,
    fontWeight: '700',
    marginBottom: 2,
  },
  stepDescription: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  stepConnector: {
    width: 2,
    height: 16,
    backgroundColor: colors.borderSubtle,
    marginLeft: 13,
    marginVertical: 4,
  },

  // Creator Invitation
  creatorInvitationCard: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii.xl,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginTop: spacing.md,
    marginBottom: spacing.xxl,
  },
  creatorInvitationIcon: {
    width: 52,
    height: 52,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  creatorInvitationTitle: {
    ...typography.headingMedium,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  creatorInvitationBody: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.md,
    maxWidth: 320,
  },
});
