import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Default development network host fallback
// 10.0.2.2 is standard for Android Emulator; LAN IP or localhost for web/iOS
const DEFAULT_LAN_IP = '192.168.1.6';
const DEFAULT_PORT = '4000';

function getDevHost(): string {
  // Automatically discover development machine IP when running on Expo Go
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost ||
    (Constants as any).manifest?.debuggerHost;

  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      return ip;
    }
  }
  return DEFAULT_LAN_IP;
}

function getDefaultApiUrl(): string {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

  // In production builds, strictly require an explicit HTTPS remote endpoint
  if (typeof __DEV__ !== 'undefined' && !__DEV__) {
    if (!configuredUrl) {
      throw new Error(
        'Production configuration missing: EXPO_PUBLIC_API_URL environment variable is required for production builds. Please set it in your build configuration to the deployed HTTPS backend URL.'
      );
    }
    if (!configuredUrl.startsWith('https://')) {
      throw new Error(
        `Production security violation: EXPO_PUBLIC_API_URL must use HTTPS. Received: ${configuredUrl}`
      );
    }
    return configuredUrl.replace(/\/$/, '');
  }

  // Local development resolution
  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, '');
  }

  if (Platform.OS === 'web') {
    return `http://localhost:${DEFAULT_PORT}/api`;
  }
  const host = getDevHost();
  return `http://${host}:${DEFAULT_PORT}/api`;
}

export const API_BASE_URL = getDefaultApiUrl();

const AUTH_TOKEN_KEY = 'amp_auth_token_v1';
const DEMO_USER_ID_KEY = 'amp_demo_user_id_v1';

let cachedToken: string | null = null;
let cachedDemoUserId: string | null = null;

// Storage helpers
async function getStoredValue(key: string): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    }
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function setStoredValue(key: string, value: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  } catch {}
}

export interface ApiContributionPayload {
  amount: number; // in cents/minor units
  currency?: 'INR' | 'USD';
  backerName: string;
  backerEmail?: string;
  isAnonymous?: boolean;
  supportNote?: string;
  paymentMethodId?: string;
}

export interface ApiContributionResult {
  success: boolean;
  message: string;
  receiptReference: string;
  receipt?: any;
  contribution: any;
  campaignTotals: {
    raisedAmount: number;
    targetAmount: number;
    backerCount: number;
    status: string;
  };
  feeBreakdown: {
    amountMinor: number;
    platformFeeMinor: number;
    netMediaMinor: number;
    estimatedImpressions: number;
    estimatedUniqueReach: number;
  };
}

let activeSessionUser: any = null;

export function setActiveSessionUser(user: any) {
  activeSessionUser = user;
}

export function getActiveSessionUser(): any {
  return activeSessionUser;
}

export async function setAuthToken(token: string | null) {
  cachedToken = token;
  if (token) {
    await setStoredValue(AUTH_TOKEN_KEY, token);
  } else {
    await setStoredValue(AUTH_TOKEN_KEY, '');
  }
}

export async function clearAuthSession() {
  cachedToken = null;
  activeSessionUser = null;
  cachedDemoUserId = null;
  await setStoredValue(AUTH_TOKEN_KEY, '');
  await setStoredValue(DEMO_USER_ID_KEY, '');
}

export async function getAuthToken(): Promise<string | null> {
  if (!cachedToken) {
    cachedToken = await getStoredValue(AUTH_TOKEN_KEY);
  }
  return cachedToken;
}

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async getHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    if (!cachedToken) {
      cachedToken = await getStoredValue(AUTH_TOKEN_KEY);
    }
    if (cachedToken) {
      headers['Authorization'] = `Bearer ${cachedToken}`;
    }

    if (activeSessionUser) {
      headers['x-demo-user-id'] = activeSessionUser.id;
    } else {
      if (!cachedDemoUserId) {
        cachedDemoUserId = await getStoredValue(DEMO_USER_ID_KEY);
        if (!cachedDemoUserId) {
          cachedDemoUserId = `guest-${Math.random().toString(36).substring(2, 10)}`;
          await setStoredValue(DEMO_USER_ID_KEY, cachedDemoUserId);
        }
      }
      headers['x-demo-user-id'] = cachedDemoUserId;
    }

    return headers;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit & { timeoutMs?: number } = {}
  ): Promise<T> {
    const headers = await this.getHeaders();
    const isAiEndpoint = endpoint.startsWith('/ai/');
    const timeoutMs = options.timeoutMs ?? (isAiEndpoint ? 45000 : 15000);

    const controller = new AbortController();
    let isTimedOut = false;
    const timeoutId = setTimeout(() => {
      isTimedOut = true;
      controller.abort();
    }, timeoutMs);

    // Forward caller abort signal if supplied
    const callerSignal = options.signal;
    const onCallerAbort = () => {
      controller.abort();
    };

    if (callerSignal) {
      if (callerSignal.aborted) {
        clearTimeout(timeoutId);
        const err: any = new Error('Fetch request has been canceled');
        err.name = 'AbortError';
        throw err;
      }
      callerSignal.addEventListener('abort', onCallerAbort);
    }

    try {
      const url = `${this.baseUrl}${endpoint}`;
      const res = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          ...(options.headers || {}),
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        let errorMsg = `HTTP Error ${res.status}`;
        try {
          const errData = await res.json();
          errorMsg = errData.error || errData.message || errorMsg;
        } catch {}
        const httpErr: any = new Error(errorMsg);
        httpErr.status = res.status;
        throw httpErr;
      }

      return (await res.json()) as T;
    } catch (err: any) {
      clearTimeout(timeoutId);

      if (isTimedOut) {
        const timeoutError: any = new Error(
          `Request timed out after ${Math.round(timeoutMs / 1000)}s. The backend or AI service took longer than expected. Please verify your connection and try again.`
        );
        timeoutError.name = 'TimeoutError';
        timeoutError.status = 504;
        throw timeoutError;
      }

      if (callerSignal?.aborted || err?.name === 'AbortError' || err?.message?.includes('canceled') || err?.message?.includes('aborted')) {
        const abortErr: any = new Error('Fetch request has been canceled');
        abortErr.name = 'AbortError';
        throw abortErr;
      }

      if (err?.message?.includes('Network request failed') || err?.message?.includes('Failed to fetch')) {
        const netErr: any = new Error(
          `Cannot reach backend server at ${this.baseUrl}. Please ensure your device and server are on the same network.`
        );
        netErr.name = 'NetworkError';
        throw netErr;
      }

      throw err;
    } finally {
      clearTimeout(timeoutId);
      if (callerSignal) {
        callerSignal.removeEventListener('abort', onCallerAbort);
      }
    }
  }

  // 1. Health
  async checkHealth() {
    return this.request<{ status: string; service: string }>('/health');
  }

  // 2. Campaigns
  async getCampaigns(params?: {
    category?: string;
    search?: string;
    sort?: string;
    status?: string;
  }) {
    const q = new URLSearchParams();
    if (params?.category && params.category.toLowerCase() !== 'all') {
      q.append('category', params.category);
    }
    if (params?.search) q.append('search', params.search);
    if (params?.sort) q.append('sort', params.sort);
    if (params?.status && params.status !== 'all') q.append('status', params.status);

    const queryStr = q.toString() ? `?${q.toString()}` : '';
    return this.request<{ success: boolean; data: any[]; total: number }>(`/campaigns${queryStr}`);
  }

  async getCampaignById(idOrSlug: string) {
    return this.request<{ success: boolean; data: any }>(`/campaigns/${idOrSlug}`);
  }

  async getCampaignStatus(idOrSlug: string) {
    return this.request<{ success: boolean; data: any }>(`/campaigns/${idOrSlug}/status`);
  }

  // 3. Contributions & Simulated Checkout
  async previewFees(campaignId: string, amountMinor: number, currency: string = 'USD') {
    return this.request<{
      success: boolean;
      campaignId: string;
      campaignTitle: string;
      campaignStatus: string;
      isEligibleForFunding: boolean;
      breakdown: {
        amountMinor: number;
        platformFeeMinor: number;
        netMediaMinor: number;
        estimatedImpressions: number;
        estimatedUniqueReach: number;
        currency: string;
      };
    }>(`/campaigns/${campaignId}/preview-fees?amount=${amountMinor}&currency=${currency}`);
  }


  async createContribution(campaignId: string, payload: ApiContributionPayload): Promise<ApiContributionResult> {
    return this.request<ApiContributionResult>(`/campaigns/${campaignId}/contributions`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async simulateCheckout(
    receiptReference: string,
    outcome: 'SUCCEEDED' | 'PENDING' | 'REJECTED' | 'FAILED' | 'CANCELLED',
    simulatedProvider?: string
  ) {
    return this.request<{
      success: boolean;
      status: string;
      message: string;
      receiptReference: string;
      contribution: any;
      campaignTotals: any;
    }>(`/contributions/${receiptReference}/checkout`, {
      method: 'POST',
      body: JSON.stringify({ outcome, simulatedProvider }),
    });
  }

  async getReceipt(receiptReference: string) {
    return this.request<{ success: boolean; receipt: any }>(`/contributions/${receiptReference}/receipt`);
  }

  async getMyContributions() {
    return this.request<{ success: boolean; data: any[] }>('/my/contributions');
  }

  // Follow & Track
  async followCampaign(campaignId: string) {
    return this.request<{ success: boolean; followed: boolean; campaignId: string }>(`/campaigns/${campaignId}/follow`, {
      method: 'POST',
    });
  }

  async unfollowCampaign(campaignId: string) {
    return this.request<{ success: boolean; followed: boolean; campaignId: string }>(`/campaigns/${campaignId}/follow`, {
      method: 'DELETE',
    });
  }

  async isCampaignFollowed(campaignId: string) {
    return this.request<{ success: boolean; followed: boolean; campaignId: string }>(`/campaigns/${campaignId}/follow`);
  }

  async getFollowedCampaigns() {
    return this.request<{ success: boolean; data: any[] }>('/my/followed-campaigns');
  }

  // 4. Drafts (Autosave & Lifecycle)
  async getDrafts() {
    return this.request<{ success: boolean; data: any[] }>('/drafts');
  }

  async getDraftById(id: string) {
    return this.request<{ success: boolean; data: any }>(`/drafts/${id}`);
  }

  async saveDraft(draft: { id?: string; currentStep?: number; title?: string; [key: string]: any }) {
    if (draft.id) {
      return this.request<{ success: boolean; data: any; draft: any }>(`/drafts/${draft.id}`, {
        method: 'PATCH',
        body: JSON.stringify(draft),
      });
    }
    return this.request<{ success: boolean; data: any; draft: any }>('/drafts', {
      method: 'POST',
      body: JSON.stringify(draft),
    });
  }

  async submitDraftForReview(draftId: string) {
    return this.request<{ success: boolean; message: string; campaign: any }>(`/drafts/${draftId}/submit`, {
      method: 'POST',
    });
  }

  async deleteDraft(draftId: string) {
    return this.request<{ success: boolean; message: string }>(`/drafts/${draftId}`, {
      method: 'DELETE',
    });
  }

  // 5. Activity Feed & Notification Center
  async getActivityFeed(limit: number = 20) {
    return this.request<{ success: boolean; data: any[] }>(`/activity?limit=${limit}`);
  }

  async getActivities() {
    return this.request<{ success: boolean; data: any[]; unreadCount: number }>('/activity');
  }

  async markActivityRead(activityId: string) {
    return this.request<{ success: boolean; data: any }>(`/activity/${activityId}/read`, {
      method: 'POST',
    });
  }

  async markAllActivitiesRead() {
    return this.request<{ success: boolean; data: any }>('/activity/mark-all-read', {
      method: 'POST',
    });
  }

  async getNotificationPreferences() {
    return this.request<{ success: boolean; data: any }>('/activity/preferences');
  }

  async updateNotificationPreferences(prefs: any) {
    return this.request<{ success: boolean; data: any }>('/activity/preferences', {
      method: 'PUT',
      body: JSON.stringify(prefs),
    });
  }

  // 6. Creator Dashboard, Analytics & Reporting
  async getCreatorDashboard() {
    return this.request<{
      success: boolean;
      data: any[];
      overview: {
        totalCreated: number;
        draftsCount: number;
        underReviewCount: number;
        availableForFundingCount: number;
        promotingCount: number;
        completedCount: number;
        requiresActionCount: number;
      };
      drafts: any[];
    }>('/campaigns/my');
  }

  async getCampaignAnalytics(campaignId: string) {
    return this.request<{ success: boolean; data: any }>(`/campaigns/${campaignId}/analytics`);
  }

  async getCampaignReport(campaignId: string) {
    return this.request<{ success: boolean; data: any; report: any }>(`/campaigns/${campaignId}/report`);
  }

  async getCampaignUpdates(campaignId: string) {
    return this.request<{ success: boolean; data: any[] }>(`/campaigns/${campaignId}/updates`);
  }

  async addCampaignUpdate(campaignId: string, data: { title: string; content: string; impressions?: number; channels?: string[] }) {
    return this.request<{ success: boolean; data: any }>(`/campaigns/${campaignId}/updates`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // 6. Reviewer Workflow & Lifecycle Management
  async getReviewQueue(status?: string, search?: string) {
    const q = new URLSearchParams();
    if (status && status !== 'ALL') q.append('status', status);
    if (search) q.append('search', search);
    const queryStr = q.toString() ? `?${q.toString()}` : '';
    return this.request<{ success: boolean; total: number; data: any[] }>(`/review/queue${queryStr}`);
  }

  async getReviewDossier(campaignId: string) {
    return this.request<{ success: boolean; data: any }>(`/review/${campaignId}`);
  }

  async submitReviewDecision(
    campaignId: string,
    decision: 'APPROVED' | 'CHANGES_REQUESTED' | 'REJECTED',
    feedback: string,
    notes?: string
  ) {
    return this.request<{ success: boolean; message: string; campaign: any; decision: any }>(
      `/review/${campaignId}/decision`,
      {
        method: 'POST',
        body: JSON.stringify({ decision, feedback, notes }),
      }
    );
  }

  async resubmitCampaign(campaignId: string, updates?: any) {
    return this.request<{ success: boolean; message: string; data: any }>(
      `/campaigns/${campaignId}/resubmit`,
      {
        method: 'POST',
        body: JSON.stringify(updates || {}),
      }
    );
  }

  async publishCampaignForFunding(campaignId: string) {
    return this.request<{ success: boolean; message: string; data: any }>(
      `/campaigns/${campaignId}/publish-funding`,
      { method: 'POST' }
    );
  }

  async authorizeDistribution(campaignId: string) {
    return this.request<{ success: boolean; message: string; data: any }>(
      `/campaigns/${campaignId}/authorize-distribution`,
      { method: 'POST' }
    );
  }

  async startPromotion(campaignId: string) {
    return this.request<{ success: boolean; message: string; data: any }>(
      `/campaigns/${campaignId}/start-promotion`,
      { method: 'POST' }
    );
  }

  async cancelCampaign(campaignId: string, reason?: string) {
    return this.request<{ success: boolean; message: string; data: any }>(
      `/campaigns/${campaignId}/cancel`,
      {
        method: 'POST',
        body: JSON.stringify({ reason: reason || 'Cancelled by organizer.' }),
      }
    );
  }



  // 7. Real Authentication & Session
  async register(data: { email: string; name: string; password: string; role?: 'CREATOR' }) {
    const res = await this.request<{ success: boolean; token: string; user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res.token) {
      await this.setToken(res.token);
    }
    return res;
  }

  async login(emailOrData: string | { email: string; password: string }, maybePassword?: string) {
    const payload = typeof emailOrData === 'string'
      ? { email: emailOrData, password: maybePassword || '' }
      : emailOrData;
    const res = await this.request<{ success: boolean; token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (res.token) {
      await this.setToken(res.token);
    }
    return res;
  }

  async getCurrentUser() {
    return this.request<{ success: boolean; user: any }>('/auth/me');
  }

  async updateProfile(data: { name?: string; avatarUrl?: string | null; bio?: string | null }) {
    return this.request<{ success: boolean; user: any }>('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } catch {}
    await this.setToken(null);
  }

  async getMyCampaigns() {
    return this.request<{ success: boolean; data: any[] }>('/campaigns/my');
  }

  // 8. Gemini AI Services for Campaign Creation
  async generateAiBasics(
    data: { topic: string; category?: string; existingTitle?: string },
    options: { signal?: AbortSignal; timeoutMs?: number } = {}
  ) {
    return this.request<{ success: boolean; data: any; error?: string }>('/ai/basics', {
      method: 'POST',
      body: JSON.stringify(data),
      signal: options.signal,
      timeoutMs: options.timeoutMs,
    });
  }

  async generateAiStory(
    data: {
      title: string;
      summary: string;
      category?: string;
      userSources?: any[];
      contextNotes?: string;
    },
    options: { signal?: AbortSignal; timeoutMs?: number } = {}
  ) {
    return this.request<{ success: boolean; data: any; error?: string }>('/ai/story', {
      method: 'POST',
      body: JSON.stringify(data),
      signal: options.signal,
      timeoutMs: options.timeoutMs,
    });
  }

  async generateAiVisuals(
    data: {
      title: string;
      summary: string;
      category?: string;
      adHeadline?: string;
    },
    options: { signal?: AbortSignal; timeoutMs?: number } = {}
  ) {
    return this.request<{ success: boolean; data: any; error?: string }>('/ai/visuals', {
      method: 'POST',
      body: JSON.stringify(data),
      signal: options.signal,
      timeoutMs: options.timeoutMs,
    });
  }

  async generateAiThumbnail(
    data: {
      title: string;
      summary: string;
      category?: string;
      visualStyle?: string;
      promptInstructions?: string;
      audience?: string;
      objective?: string;
    },
    options: { signal?: AbortSignal; timeoutMs?: number } = {}
  ) {
    return this.request<{
      success: boolean;
      data: {
        imageUrl: string;
        visualPrompt: string;
        source: 'imagen' | 'editorial_asset';
        styleApplied: string;
        metadata: {
          aspectRatio: string;
          model: string;
          createdAt: string;
        };
      };
      error?: string;
    }>('/ai/thumbnail', {
      method: 'POST',
      body: JSON.stringify(data),
      signal: options.signal,
      timeoutMs: options.timeoutMs,
    });
  }

  async generateAiReach(
    data: {
      title: string;
      category?: string;
      targetLocations?: string[];
      fundingGoalUSD?: number;
      fundingGoalINR?: number;
    },
    options: { signal?: AbortSignal; timeoutMs?: number } = {}
  ) {
    return this.request<{ success: boolean; data: any; error?: string }>('/ai/reach', {
      method: 'POST',
      body: JSON.stringify(data),
      signal: options.signal,
      timeoutMs: options.timeoutMs,
    });
  }

  async reviewAiCampaign(
    data: {
      title: string;
      summary: string;
      narrative?: string;
      category?: string;
      targetAmount?: number;
      sources?: any[];
    },
    options: { signal?: AbortSignal; timeoutMs?: number } = {}
  ) {
    return this.request<{ success: boolean; data: any; error?: string }>('/ai/review', {
      method: 'POST',
      body: JSON.stringify(data),
      signal: options.signal,
      timeoutMs: options.timeoutMs,
    });
  }

  // 9. Real Voice-to-Campaign AI Services
  async transcribeAudio(
    data: {
      audioBase64: string;
      mimeType: string;
      durationSeconds?: number;
    },
    options: { signal?: AbortSignal; timeoutMs?: number } = {}
  ) {
    return this.request<{
      success: boolean;
      data: {
        transcript: string;
        modelUsed: string;
        confidence: number;
      };
      error?: string;
    }>('/ai/transcribe', {
      method: 'POST',
      body: JSON.stringify(data),
      signal: options.signal,
      timeoutMs: options.timeoutMs,
    });
  }

  async generateAiVoiceDraft(
    data: {
      transcript: string;
      category?: string;
      additionalNotes?: string;
    },
    options: { signal?: AbortSignal; timeoutMs?: number } = {}
  ) {
    return this.request<{
      success: boolean;
      data: {
        title: string;
        summary: string;
        category: string;
        publicInterestObjective: string;
        problemStatement: string;
        campaignStory: string;
        proposedSolution: string;
        targetAudience: string;
        suggestedChannels: string[];
        adHeadline: string;
        adCopy: string;
        imagePrompt: string;
        suggestedBudgetUSD: number;
        estimatedReach: number;
        missingInformation: string[];
        isFallback: boolean;
        modelUsed: string;
        disclosure: string;
      };
      error?: string;
    }>('/ai/voice-draft', {
      method: 'POST',
      body: JSON.stringify(data),
      signal: options.signal,
      timeoutMs: options.timeoutMs,
    });
  }

  async setToken(token: string | null) {
    cachedToken = token;
    if (token) {
      await setStoredValue(AUTH_TOKEN_KEY, token);
    } else {
      if (Platform.OS === 'web') {
        if (typeof localStorage !== 'undefined') localStorage.removeItem(AUTH_TOKEN_KEY);
      } else {
        await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
      }
    }
  }
}

export const apiClient = new ApiClient();

// ==========================================
// TanStack React Query Custom Hooks
// ==========================================

export function useCampaignsQuery(filters?: { category?: string; search?: string; sort?: string }) {
  return useQuery({
    queryKey: ['campaigns', filters],
    queryFn: async () => {
      const res = await apiClient.getCampaigns(filters);
      return res.data;
    },
    staleTime: 30 * 1000,
    retry: 1,
  });
}

export function useCampaignDetailQuery(idOrSlug: string) {
  return useQuery({
    queryKey: ['campaign', idOrSlug],
    queryFn: async () => {
      const res = await apiClient.getCampaignById(idOrSlug);
      return res.data;
    },
    enabled: Boolean(idOrSlug),
    staleTime: 30 * 1000,
    retry: 1,
  });
}

export function useActivityFeedQuery() {
  return useQuery({
    queryKey: ['activityFeed'],
    queryFn: async () => {
      const res = await apiClient.getActivityFeed(20);
      return res.data;
    },
    staleTime: 15 * 1000,
    refetchInterval: 20 * 1000,
  });
}

export function useContributeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      campaignId,
      payload,
    }: {
      campaignId: string;
      payload: ApiContributionPayload;
    }) => {
      return apiClient.createContribution(campaignId, payload);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['campaign', variables.campaignId] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['activityFeed'] });
    },
  });
}

export function useFeePreviewQuery(campaignId: string, amountMinor: number, currency: string = 'INR') {
  return useQuery({
    queryKey: ['feePreview', campaignId, amountMinor, currency],
    queryFn: async () => {
      return apiClient.previewFees(campaignId, amountMinor, currency);
    },
    enabled: Boolean(campaignId) && amountMinor > 0,
    staleTime: 60 * 1000,
  });
}

export function useSimulateCheckoutMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      receiptReference,
      outcome,
      simulatedProvider,
      campaignId,
    }: {
      receiptReference: string;
      outcome: 'SUCCEEDED' | 'PENDING' | 'REJECTED' | 'FAILED' | 'CANCELLED';
      simulatedProvider?: string;
      campaignId?: string;
    }) => {
      return apiClient.simulateCheckout(receiptReference, outcome, simulatedProvider);
    },
    onSuccess: (_, variables) => {
      if (variables.campaignId) {
        queryClient.invalidateQueries({ queryKey: ['campaign', variables.campaignId] });
      }
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['activityFeed'] });
      queryClient.invalidateQueries({ queryKey: ['myContributions'] });
    },
  });
}

export function useMyContributionsQuery() {
  return useQuery({
    queryKey: ['myContributions'],
    queryFn: async () => {
      const res = await apiClient.getMyContributions();
      return res.data;
    },
    staleTime: 30 * 1000,
  });
}

export function useFollowedCampaignsQuery() {
  return useQuery({
    queryKey: ['followedCampaigns'],
    queryFn: async () => {
      const res = await apiClient.getFollowedCampaigns();
      return res.data;
    },
    staleTime: 30 * 1000,
  });
}

export function useFollowCampaignMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ campaignId, action }: { campaignId: string; action: 'follow' | 'unfollow' }) => {
      if (action === 'follow') {
        return apiClient.followCampaign(campaignId);
      }
      return apiClient.unfollowCampaign(campaignId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followedCampaigns'] });
    },
  });
}

export function useCreatorDashboardQuery(userId?: string) {
  return useQuery({
    queryKey: ['creatorDashboard', userId || 'anonymous'],
    queryFn: async () => {
      return apiClient.getCreatorDashboard();
    },
    enabled: userId !== undefined ? Boolean(userId) : true,
    staleTime: 15 * 1000,
  });
}

export function useCampaignAnalyticsQuery(campaignId: string) {
  return useQuery({
    queryKey: ['campaignAnalytics', campaignId],
    queryFn: async () => {
      const res = await apiClient.getCampaignAnalytics(campaignId);
      return res.data;
    },
    enabled: Boolean(campaignId),
    staleTime: 20 * 1000,
  });
}

export function useCampaignReportQuery(campaignId: string) {
  return useQuery({
    queryKey: ['campaignReport', campaignId],
    queryFn: async () => {
      const res = await apiClient.getCampaignReport(campaignId);
      return res.data || res.report;
    },
    enabled: Boolean(campaignId),
    staleTime: 60 * 1000,
  });
}

export function useCampaignUpdatesQuery(campaignId: string) {
  return useQuery({
    queryKey: ['campaignUpdates', campaignId],
    queryFn: async () => {
      const res = await apiClient.getCampaignUpdates(campaignId);
      return res.data;
    },
    enabled: Boolean(campaignId),
    staleTime: 30 * 1000,
  });
}

export function useActivityNotificationsQuery() {
  return useQuery({
    queryKey: ['activityNotifications'],
    queryFn: async () => {
      return apiClient.getActivities();
    },
    staleTime: 15 * 1000,
    refetchInterval: 20 * 1000,
  });
}

export function useMarkActivityReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (activityId: string) => {
      return apiClient.markActivityRead(activityId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activityNotifications'] });
      queryClient.invalidateQueries({ queryKey: ['activityFeed'] });
    },
  });
}

export function useMarkAllActivitiesReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      return apiClient.markAllActivitiesRead();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activityNotifications'] });
      queryClient.invalidateQueries({ queryKey: ['activityFeed'] });
    },
  });
}

export function useNotificationPreferencesQuery() {
  return useQuery({
    queryKey: ['notificationPreferences'],
    queryFn: async () => {
      const res = await apiClient.getNotificationPreferences();
      return res.data;
    },
  });
}

export function useUpdateNotificationPreferencesMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (prefs: any) => {
      return apiClient.updateNotificationPreferences(prefs);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationPreferences'] });
    },
  });
}

// Reviewer & State Machine Hooks
export function useReviewQueueQuery(filters?: { status?: string; search?: string }) {
  return useQuery({
    queryKey: ['reviewQueue', filters],
    queryFn: async () => {
      const res = await apiClient.getReviewQueue(filters?.status, filters?.search);
      return res.data;
    },
    staleTime: 10 * 1000,
  });
}

export function useReviewDossierQuery(campaignId: string) {
  return useQuery({
    queryKey: ['reviewDossier', campaignId],
    queryFn: async () => {
      const res = await apiClient.getReviewDossier(campaignId);
      return res.data;
    },
    enabled: Boolean(campaignId),
    staleTime: 10 * 1000,
  });
}

export function useSubmitReviewDecisionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      campaignId,
      decision,
      feedback,
      notes,
    }: {
      campaignId: string;
      decision: 'APPROVED' | 'CHANGES_REQUESTED' | 'REJECTED';
      feedback: string;
      notes?: string;
    }) => {
      return apiClient.submitReviewDecision(campaignId, decision, feedback, notes);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reviewQueue'] });
      queryClient.invalidateQueries({ queryKey: ['reviewDossier', variables.campaignId] });
      queryClient.invalidateQueries({ queryKey: ['campaign', variables.campaignId] });
      queryClient.invalidateQueries({ queryKey: ['creatorDashboard'] });
    },
  });
}

export function useResubmitCampaignMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ campaignId, updates }: { campaignId: string; updates?: any }) => {
      return apiClient.resubmitCampaign(campaignId, updates);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reviewQueue'] });
      queryClient.invalidateQueries({ queryKey: ['reviewDossier', variables.campaignId] });
      queryClient.invalidateQueries({ queryKey: ['campaign', variables.campaignId] });
      queryClient.invalidateQueries({ queryKey: ['creatorDashboard'] });
    },
  });
}

export function usePublishFundingMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (campaignId: string) => {
      return apiClient.publishCampaignForFunding(campaignId);
    },
    onSuccess: (_, campaignId) => {
      queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] });
      queryClient.invalidateQueries({ queryKey: ['creatorDashboard'] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });
}

export function useAuthorizeDistributionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (campaignId: string) => {
      return apiClient.authorizeDistribution(campaignId);
    },
    onSuccess: (_, campaignId) => {
      queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] });
      queryClient.invalidateQueries({ queryKey: ['creatorDashboard'] });
    },
  });
}

export function useStartPromotionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (campaignId: string) => {
      return apiClient.startPromotion(campaignId);
    },
    onSuccess: (_, campaignId) => {
      queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] });
      queryClient.invalidateQueries({ queryKey: ['creatorDashboard'] });
    },
  });
}

export function useCurrentUserQuery() {
  return useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        const res = await apiClient.getCurrentUser();
        return res?.user || null;
      } catch {
        return null;
      }
    },
    staleTime: 60 * 1000,
  });
}

export function useMyCampaignsQuery(userId?: string) {
  return useQuery({
    queryKey: ['myCampaigns', userId || 'anonymous'],
    queryFn: async () => {
      const res = await apiClient.getMyCampaigns();
      return res?.data || [];
    },
    enabled: userId !== undefined ? Boolean(userId) : true,
    staleTime: 15 * 1000,
  });
}
