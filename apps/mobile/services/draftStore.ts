import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { CampaignDraft, AutosaveStatus } from '../types/draft';
import { SEEDED_DRAFTS, createNewDraft } from './draftInitialData';
import { campaignStore } from './campaignStore';

const DRAFTS_STORAGE_KEY = 'campaign_drafts_v2';
const ACTIVE_DRAFT_ID_KEY = 'campaign_active_draft_id_v2';

let draftsList: CampaignDraft[] = [...SEEDED_DRAFTS];
let activeDraft: CampaignDraft | null = null;
let autosaveStatus: AutosaveStatus = 'idle';
let autosaveTimer: NodeJS.Timeout | null = null;
let listeners: Array<() => void> = [];

// Persistence
async function loadPersistedDrafts() {
  try {
    let raw: string | null = null;
    if (Platform.OS === 'web') {
      raw = typeof localStorage !== 'undefined' ? localStorage.getItem(DRAFTS_STORAGE_KEY) : null;
    } else {
      raw = await SecureStore.getItemAsync(DRAFTS_STORAGE_KEY);
    }

    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        draftsList = parsed;
        notifyListeners();
      }
    } else {
      // First run: save seeded drafts
      await persistDrafts();
    }
  } catch (err) {
    console.warn('[DraftStore] Failed to load persisted drafts:', err);
  }
}

async function persistDrafts(): Promise<boolean> {
  try {
    const raw = JSON.stringify(draftsList);
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(DRAFTS_STORAGE_KEY, raw);
      }
    } else {
      await SecureStore.setItemAsync(DRAFTS_STORAGE_KEY, raw);
    }
    return true;
  } catch (err) {
    console.warn('[DraftStore] Failed to persist drafts:', err);
    return false;
  }
}

// Initialize on module load
loadPersistedDrafts();

function notifyListeners() {
  setTimeout(() => {
    listeners.forEach(fn => fn());
  }, 0);
}

export const draftStore = {
  getDrafts(): CampaignDraft[] {
    return [...draftsList];
  },

  getDraftById(id: string): CampaignDraft | undefined {
    return draftsList.find(d => d.id === id);
  },

  getActiveDraft(): CampaignDraft | null {
    return activeDraft;
  },

  getAutosaveStatus(): AutosaveStatus {
    return autosaveStatus;
  },

  setActiveDraft(draft: CampaignDraft) {
    activeDraft = { ...draft };
    const idx = draftsList.findIndex(d => d.id === draft.id);
    if (idx >= 0) {
      draftsList[idx] = { ...activeDraft };
    } else {
      draftsList.unshift({ ...activeDraft });
    }
    notifyListeners();
  },

  /**
   * Starts a new draft or loads an existing draft by ID
   */
  startOrResumeDraft(draftId?: string, mode: 'manual' | 'voice' = 'manual'): CampaignDraft {
    if (draftId) {
      const existing = draftsList.find(d => d.id === draftId);
      if (existing) {
        activeDraft = { ...existing };
        autosaveStatus = 'saved';
        notifyListeners();
        return activeDraft;
      }
    }

    // Otherwise create brand new draft
    const newDraft = createNewDraft(mode);
    activeDraft = newDraft;
    draftsList = [newDraft, ...draftsList];
    persistDrafts();
    autosaveStatus = 'saved';
    notifyListeners();
    return newDraft;
  },

  /**
   * Updates fields of the active draft with debounced autosave
   */
  updateActiveDraft(fields: Partial<CampaignDraft>, immediate = false) {
    if (!activeDraft) return;

    activeDraft = {
      ...activeDraft,
      ...fields,
      updatedAt: new Date().toISOString(),
    };

    // Update in drafts list memory
    const idx = draftsList.findIndex(d => d.id === activeDraft!.id);
    if (idx >= 0) {
      draftsList[idx] = { ...activeDraft };
    } else {
      draftsList.unshift({ ...activeDraft });
    }

    if (immediate) {
      if (autosaveTimer) clearTimeout(autosaveTimer);
      autosaveStatus = 'saving';
      notifyListeners();
      persistDrafts().then(ok => {
        autosaveStatus = ok ? 'saved' : 'error';
        notifyListeners();
      });
      return;
    }

    // Debounced autosave (600ms)
    autosaveStatus = 'saving';
    notifyListeners();

    if (autosaveTimer) clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(async () => {
      const ok = await persistDrafts();
      autosaveStatus = ok ? 'saved' : 'error';
      notifyListeners();
    }, 600);
  },

  /**
   * Force save active draft immediately (e.g. before navigating or leaving)
   */
  async saveImmediately(): Promise<boolean> {
    if (autosaveTimer) clearTimeout(autosaveTimer);
    if (!activeDraft) return true;

    autosaveStatus = 'saving';
    notifyListeners();

    activeDraft.updatedAt = new Date().toISOString();
    const idx = draftsList.findIndex(d => d.id === activeDraft!.id);
    if (idx >= 0) {
      draftsList[idx] = { ...activeDraft };
    }

    const success = await persistDrafts();
    autosaveStatus = success ? 'saved' : 'error';
    notifyListeners();
    return success;
  },

  /**
   * Deletes a draft from storage
   */
  async deleteDraft(id: string): Promise<boolean> {
    draftsList = draftsList.filter(d => d.id !== id);
    if (activeDraft?.id === id) {
      activeDraft = null;
      autosaveStatus = 'idle';
    }
    const success = await persistDrafts();
    notifyListeners();
    return success;
  },

  /**
   * Submits a draft for review.
   * Updates lifecycle status to 'submitted_for_review' with timestamp.
   */
  async submitDraftForReview(draftId: string): Promise<CampaignDraft | null> {
    const draft = draftsList.find(d => d.id === draftId) || activeDraft;
    if (!draft) return null;

    const submittedDraft: CampaignDraft = {
      ...draft,
      status: 'submitted_for_review',
      submissionTimestamp: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    activeDraft = submittedDraft;
    const idx = draftsList.findIndex(d => d.id === draftId);
    if (idx >= 0) {
      draftsList[idx] = submittedDraft;
    }

    await persistDrafts();
    notifyListeners();
    return submittedDraft;
  },

  subscribe(listener: () => void): () => void {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  },
};

export function useDraftStore() {
  const [, setVersion] = useState(0);

  useEffect(() => {
    return draftStore.subscribe(() => setVersion(v => v + 1));
  }, []);

  return draftStore;
}
