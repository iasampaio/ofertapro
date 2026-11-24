import { Platform } from 'react-native';

export type StoreId = 'shopee' | 'mercadolivre' | 'amazon' | 'aliexpress';

export type NicheId =
  | 'todos'
  | 'eletronicos'
  | 'casa_cozinha'
  | 'moda_beleza'
  | 'maternidade_bebe'
  | 'fitness_saude'
  | 'pets'
  | 'gamer_info'
  | 'ferramentas_auto';

export interface NicheInfo {
  id: NicheId;
  label: string;
  icon: string;
}

export const NICHES: NicheInfo[] = [
  { id: 'todos', label: 'Todos', icon: '🌟' },
  { id: 'eletronicos', label: 'Eletrônicos', icon: '🎧' },
  { id: 'casa_cozinha', label: 'Casa & Cozinha', icon: '🏠' },
  { id: 'moda_beleza', label: 'Moda & Beleza', icon: '💄' },
  { id: 'maternidade_bebe', label: 'Bebê', icon: '🍼' },
  { id: 'fitness_saude', label: 'Fitness', icon: '💪' },
  { id: 'pets', label: 'Pets', icon: '🐾' },
  { id: 'gamer_info', label: 'Gamer', icon: '🎮' },
  { id: 'ferramentas_auto', label: 'Ferramentas', icon: '🛠️' },
];

export interface Offer {
  id: string;
  store: StoreId;
  title: string;
  price: number;
  originalPrice?: number;
  discountPercent: number;
  commissionRate?: number;
  imageUrl: string;
  productUrl: string;
  affiliateUrl: string;
  rating?: number;
  sales?: number;
  shopName?: string;
  category: string;
  niche: NicheId;
  coupon?: string;
}

export interface StoreCoupon {
  id: string;
  store: StoreId;
  code: string;
  title: string;
  description: string;
  minSpend?: string;
  expiresLabel: string;
  affiliateUrl: string;
}

export type WhatsAppProviderType = 'evolution_webhook' | 'zapi_webhook' | 'cloud_api';

export interface WhatsAppAccount {
  id: string;
  label: string;
  phoneNumber: string;
  provider: WhatsAppProviderType;
  apiUrl: string;
  apiToken: string;
  instanceName?: string;
  status: 'connected' | 'disconnected';
}

export type ChannelType =
  | 'whatsapp_group'
  | 'whatsapp_status'
  | 'telegram'
  | 'whatsapp_cloud'
  | 'whatsapp_webhook';

export interface DistributionChannel {
  id: string;
  name: string;
  type: ChannelType;
  enabled: boolean;
  niche: NicheId;
  whatsappAccountId?: string;
  targetId: string;
  token?: string;
  webhookUrl?: string;
}

export interface ScheduledPost {
  id: string;
  offer: Offer;
  caption: string;
  channelIds: string[];
  scheduledFor: string;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  errorMessage?: string;
  sentAt?: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  plan?: 'free' | 'pro';
}

export interface AutomationSettings {
  user?: AuthUser;
  plan: 'free' | 'pro';
  autopilotEnabled: boolean;
  dailyPostsLimit: number;
  postsUsedToday: number;
  credentials: {
    shopeeAppId: string;
    shopeeAppSecret: string;
    mercadoLivreTag: string;
    amazonTag: string;
    aliexpressKey: string;
  };
  hasShopeeSecret: boolean;
  activeTemplateId: string;
  templates: Array<{ id: string; name: string; body: string }>;
  whatsappAccounts: WhatsAppAccount[];
  channels: DistributionChannel[];
}

// URL oficial do servidor na nuvem (Render.com)
let baseUrl = 'https://ofertapro-api.onrender.com';
let authToken: string | null = null;

export function setApiBaseUrl(url: string) {
  baseUrl = url.replace(/\/+$/, '');
}

export function getApiBaseUrl(): string {
  return baseUrl;
}

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options?.headers as Record<string, string>) || {}),
  };

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Erro HTTP ${res.status}`) as Error & {
      code?: string;
      status?: number;
    };
    err.code = data.code;
    err.status = res.status;
    throw err;
  }
  return data as T;
}

export const api = {
  // --- AUTH ---
  register: (name: string, email: string, password: string) =>
    request<{ token: string; user: AuthUser }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }),

  login: (email: string, password: string) =>
    request<{ token: string; user: AuthUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  me: () => request<{ user: AuthUser }>('/api/auth/me'),

  // --- OFFERS ---
  getShowcase: (q = '', stores: StoreId[] = [], niche: NicheId = 'todos') => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (stores.length) params.set('stores', stores.join(','));
    if (niche !== 'todos') params.set('niche', niche);
    return request<{ offers: Offer[]; liveStores: StoreId[] }>(
      `/api/offers/showcase?${params.toString()}`
    );
  },

  getCoupons: (store: StoreId | 'all' = 'all') =>
    request<{ coupons: StoreCoupon[] }>(`/api/offers/coupons?store=${store}`),

  searchOffers: (q = '', stores: StoreId[] = [], niche: NicheId = 'todos') => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (stores.length) params.set('stores', stores.join(','));
    if (niche !== 'todos') params.set('niche', niche);
    return request<{ offers: Offer[]; liveStores: StoreId[] }>(
      `/api/offers/search?${params.toString()}`
    );
  },

  generateCopy: (offer: Offer, templateId?: string) =>
    request<{ caption: string }>('/api/offers/copy', {
      method: 'POST',
      body: JSON.stringify({ offer, templateId }),
    }),

  generateShortLink: (url: string) =>
    request<{ shortLink: string; mode: 'live' | 'demo' }>('/api/offers/shortlink', {
      method: 'POST',
      body: JSON.stringify({ url }),
    }),

  // --- AUTOMATION & MULTI-WHATSAPP ---
  getSettings: () => request<AutomationSettings>('/api/automation/settings'),

  toggleAutopilot: (enabled: boolean) =>
    request<{ ok: boolean; autopilotEnabled: boolean }>(
      '/api/automation/autopilot/toggle',
      {
        method: 'PATCH',
        body: JSON.stringify({ enabled }),
      }
    ),

  saveCredentials: (credentials: Partial<AutomationSettings['credentials']>) =>
    request<{ ok: boolean }>('/api/automation/credentials', {
      method: 'PUT',
      body: JSON.stringify(credentials),
    }),

  pairWhatsAppByPhone: (label: string, phoneNumber: string) =>
    request<{
      account: WhatsAppAccount;
      pairingCode: string;
      mode: 'live' | 'demo';
      instructions: string;
    }>('/api/automation/whatsapp-accounts/pair', {
      method: 'POST',
      body: JSON.stringify({ label, phoneNumber }),
    }),

  addWhatsAppAccount: (payload: {
    label: string;
    phoneNumber: string;
    provider: WhatsAppProviderType;
    apiUrl: string;
    apiToken: string;
    instanceName?: string;
  }) =>
    request<WhatsAppAccount>('/api/automation/whatsapp-accounts', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  deleteWhatsAppAccount: (id: string) =>
    request<{ ok: boolean }>(`/api/automation/whatsapp-accounts/${id}`, {
      method: 'DELETE',
    }),

  getWhatsAppGroups: (accountId: string) =>
    request<{
      connected: boolean;
      groups: Array<{ id: string; name: string; participantsCount: number }>;
    }>(`/api/automation/whatsapp-accounts/${accountId}/groups`),

  addChannel: (payload: {
    name: string;
    type: ChannelType;
    targetId: string;
    niche: NicheId;
    whatsappAccountId?: string;
    token?: string;
    webhookUrl?: string;
  }) =>
    request<DistributionChannel>('/api/automation/channels', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  toggleChannel: (id: string, enabled: boolean) =>
    request<DistributionChannel>(`/api/automation/channels/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ enabled }),
    }),

  deleteChannel: (id: string) =>
    request<{ ok: boolean }>(`/api/automation/channels/${id}`, {
      method: 'DELETE',
    }),

  dispatchNow: (
    offer: Offer,
    caption: string,
    channelIds?: string[],
    niche?: NicheId
  ) =>
    request<{
      results: Array<{ channelName: string; success: boolean; message: string }>;
    }>('/api/automation/dispatch', {
      method: 'POST',
      body: JSON.stringify({ offer, caption, channelIds, niche }),
    }),

  dispatchStatus: (offer: Offer, caption?: string, whatsappAccountIds?: string[]) =>
    request<{
      results: Array<{ channelName: string; success: boolean; message: string }>;
      caption: string;
    }>('/api/automation/dispatch-status', {
      method: 'POST',
      body: JSON.stringify({ offer, caption, whatsappAccountIds }),
    }),

  getSchedule: () => request<{ posts: ScheduledPost[] }>('/api/automation/schedule'),

  schedulePost: (
    offer: Offer,
    caption: string,
    scheduledFor: string,
    channelIds?: string[],
    niche?: NicheId
  ) =>
    request<ScheduledPost>('/api/automation/schedule', {
      method: 'POST',
      body: JSON.stringify({ offer, caption, scheduledFor, channelIds, niche }),
    }),

  scheduleBatchByNiche: (
    niches: NicheId[],
    intervalMinutes = 30,
    minDiscount = 30,
    count = 5,
    targetMode: 'groups' | 'status' | 'both' = 'both',
    whatsappAccountIds: string[] = []
  ) =>
    request<{
      scheduledCount: number;
      channelsCount: number;
      nichesCount: number;
      intervalMinutes: number;
      minDiscount: number;
    }>('/api/automation/schedule/batch-by-niche', {
      method: 'POST',
      body: JSON.stringify({
        niches,
        intervalMinutes,
        minDiscount,
        count,
        targetMode,
        whatsappAccountIds,
      }),
    }),

  deleteScheduledPost: (id: string) =>
    request<{ ok: boolean }>(`/api/automation/schedule/${id}`, {
      method: 'DELETE',
    }),

  runSchedulerNow: () =>
    request<{ processed: number }>('/api/automation/schedule/run-now', {
      method: 'POST',
    }),

  activatePro: (plan: 'free' | 'pro') =>
    request<{ ok: boolean; plan: 'free' | 'pro'; message: string }>(
      '/api/billing/activate-pro',
      {
        method: 'POST',
        body: JSON.stringify({ plan }),
      }
    ),
};
