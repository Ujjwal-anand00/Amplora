import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Campaign, CampaignCategory } from '../types/campaign';
import { SEEDED_CAMPAIGNS } from './campaignData';

const BOOKMARKS_STORAGE_KEY = 'campaign_saved_ids_v1';

// In-memory master store
let masterCampaigns: Campaign[] = [...SEEDED_CAMPAIGNS];
let savedCampaignIds: Set<string> = new Set(['camp-clean-air', 'camp-preventive-health']);
let listeners: Array<() => void> = [];

// Persistence helpers
async function loadPersistedBookmarks() {
  try {
    let raw: string | null = null;
    if (Platform.OS === 'web') {
      raw = typeof localStorage !== 'undefined' ? localStorage.getItem(BOOKMARKS_STORAGE_KEY) : null;
    } else {
      raw = await SecureStore.getItemAsync(BOOKMARKS_STORAGE_KEY);
    }
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        savedCampaignIds = new Set(parsed);
        notifyListeners();
      }
    }
  } catch (err) {
    console.warn('[Storage] Could not load persisted bookmarks:', err);
  }
}

async function persistBookmarks() {
  try {
    const raw = JSON.stringify(Array.from(savedCampaignIds));
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(BOOKMARKS_STORAGE_KEY, raw);
      }
    } else {
      await SecureStore.setItemAsync(BOOKMARKS_STORAGE_KEY, raw);
    }
  } catch (err) {
    console.warn('[Storage] Could not persist bookmarks:', err);
  }
}

// Initial hydration
loadPersistedBookmarks();

function notifyListeners() {
  listeners.forEach(fn => fn());
}

export interface CampaignFilterOptions {
  category?: string;
  search?: string;
  sort?: 'recommended' | 'most_funded' | 'ending_soon' | 'newest';
  status?: 'all' | 'active' | 'nearly_funded' | 'fully_amplified';
  progressRange?: 'all' | 'under_50' | '50_99' | 'fully_funded';
}

export const campaignStore = {
  getAllCampaigns(): Campaign[] {
    return [...masterCampaigns];
  },

  getCampaignById(idOrSlug: string): Campaign | undefined {
    return masterCampaigns.find(c => c.id === idOrSlug || c.slug === idOrSlug);
  },

  getFeaturedCampaign(): Campaign {
    return masterCampaigns.find(c => c.isFeatured) || masterCampaigns[0];
  },

  getSavedCampaignIds(): string[] {
    return Array.from(savedCampaignIds);
  },

  isCampaignSaved(id: string): boolean {
    return savedCampaignIds.has(id);
  },

  toggleBookmark(id: string): boolean {
    if (savedCampaignIds.has(id)) {
      savedCampaignIds.delete(id);
    } else {
      savedCampaignIds.add(id);
    }
    persistBookmarks();
    notifyListeners();
    return savedCampaignIds.has(id);
  },

  addContribution(campaignId: string, amount: number) {
    const campaign = masterCampaigns.find(c => c.id === campaignId);
    if (campaign) {
      campaign.raisedAmount += amount;
      campaign.backerCount += 1;
      if (campaign.raisedAmount >= campaign.targetAmount) {
        campaign.status = 'FULLY_AMPLIFIED';
      }
      notifyListeners();
    }
  },

  filterAndSort(options: CampaignFilterOptions): Campaign[] {
    let result = [...masterCampaigns];

    // 1. Category Filter
    if (options.category && options.category.toLowerCase() !== 'all') {
      result = result.filter(
        c => c.category.toLowerCase() === options.category!.toLowerCase()
      );
    }

    // 2. Search query (case-insensitive across title, summary, category, creator, and audience)
    if (options.search && options.search.trim().length > 0) {
      const q = options.search.toLowerCase().trim();
      result = result.filter(c =>
        c.title.toLowerCase().includes(q) ||
        c.summary.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        c.creator.name.toLowerCase().includes(q) ||
        c.targetAudience.description.toLowerCase().includes(q)
      );
    }

    // 3. Status filter
    if (options.status && options.status !== 'all') {
      if (options.status === 'active') {
        result = result.filter(c => c.status === 'ACTIVE');
      } else if (options.status === 'nearly_funded') {
        result = result.filter(
          c => (c.raisedAmount / c.targetAmount) >= 0.75 && c.raisedAmount < c.targetAmount
        );
      } else if (options.status === 'fully_amplified') {
        result = result.filter(c => c.status === 'FULLY_AMPLIFIED' || c.raisedAmount >= c.targetAmount);
      }
    }

    // 4. Progress Range filter
    if (options.progressRange && options.progressRange !== 'all') {
      if (options.progressRange === 'under_50') {
        result = result.filter(c => (c.raisedAmount / c.targetAmount) < 0.5);
      } else if (options.progressRange === '50_99') {
        result = result.filter(
          c => (c.raisedAmount / c.targetAmount) >= 0.5 && (c.raisedAmount / c.targetAmount) < 1.0
        );
      } else if (options.progressRange === 'fully_funded') {
        result = result.filter(c => (c.raisedAmount / c.targetAmount) >= 1.0);
      }
    }

    // 5. Sorting
    switch (options.sort) {
      case 'most_funded':
        result.sort((a, b) => (b.raisedAmount / b.targetAmount) - (a.raisedAmount / a.targetAmount));
        break;
      case 'ending_soon':
        result.sort((a, b) => a.daysLeft - b.daysLeft);
        break;
      case 'newest':
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'recommended':
      default:
        // Deterministic demo ranking based on editorial priorityScore
        result.sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));
        break;
    }

    return result;
  },

  subscribe(listener: () => void): () => void {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  },
};

/**
 * React hook to access reactive campaign store state
 */
export function useCampaignStore() {
  const [, setVersion] = useState(0);

  useEffect(() => {
    return campaignStore.subscribe(() => setVersion(v => v + 1));
  }, []);

  return campaignStore;
}
