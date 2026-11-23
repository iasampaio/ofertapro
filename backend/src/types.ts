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
  searchKeyword: string;
}

export const NICHES: NicheInfo[] = [
  { id: 'todos', label: 'Todos os Nichos', icon: '🌟', searchKeyword: '' },
  { id: 'eletronicos', label: 'Eletrônicos & Tech', icon: '🎧', searchKeyword: 'eletronicos' },
  { id: 'casa_cozinha', label: 'Casa & Cozinha', icon: '🏠', searchKeyword: 'cozinha' },
  { id: 'moda_beleza', label: 'Moda & Beleza', icon: '💄', searchKeyword: 'beleza' },
  { id: 'maternidade_bebe', label: 'Bebê & Maternidade', icon: '🍼', searchKeyword: 'bebe' },
  { id: 'fitness_saude', label: 'Fitness & Saúde', icon: '💪', searchKeyword: 'fitness' },
  { id: 'pets', label: 'Pets', icon: '🐾', searchKeyword: 'pet' },
  { id: 'gamer_info', label: 'Gamer & Info', icon: '🎮', searchKeyword: 'gamer' },
  { id: 'ferramentas_auto', label: 'Ferramentas & Auto', icon: '🛠️', searchKeyword: 'ferramentas' },
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

export type WhatsAppProviderType = 'cloud_api' | 'evolution_webhook' | 'zapi_webhook';

export interface WhatsAppAccount {
  id: string;
  label: string;
  phoneNumber: string;
  provider: WhatsAppProviderType;
  /** URL da API/Webhook (Evolution API, Z-API ou Cloud API Phone Number ID) */
  apiUrl: string;
  /** Token / API Key da instância */
  apiToken: string;
  /** Nome da instância (para Evolution API) ou ID do telefone (Meta Cloud API) */
  instanceName?: string;
  status: 'connected' | 'disconnected';
  createdAt: string;
}

export type ChannelType =
  | 'telegram'
  | 'whatsapp_cloud'
  | 'whatsapp_webhook'
  | 'whatsapp_group'
  | 'whatsapp_status';

export interface DistributionChannel {
  id: string;
  name: string;
  type: ChannelType;
  enabled: boolean;
  /** Nicho vinculado ao grupo/canal */
  niche: NicheId;
  /** ID da conta de WhatsApp conectada (quando for grupo de WhatsApp) */
  whatsappAccountId?: string;
  /** Para Telegram: Chat ID ou @canal. Para WhatsApp: ID do grupo (ex: 120363...@g.us) ou número */
  targetId: string;
  token?: string;
  webhookUrl?: string;
  createdAt: string;
}

export type ScheduleStatus = 'pending' | 'sent' | 'failed' | 'cancelled';

export interface ScheduledPost {
  id: string;
  offer: Offer;
  caption: string;
  channelIds: string[];
  scheduledFor: string;
  status: ScheduleStatus;
  errorMessage?: string;
  sentAt?: string;
  createdAt: string;
}

export interface AffiliateCredentials {
  shopeeAppId: string;
  shopeeAppSecret: string;
  mercadoLivreTag: string;
  amazonTag: string;
  aliexpressKey: string;
}

export interface CopyTemplate {
  id: string;
  name: string;
  body: string;
}

export interface UserSettings {
  plan: 'free' | 'pro';
  dailyPostsLimit: number;
  postsUsedToday: number;
  lastUsageDate: string;
  credentials: AffiliateCredentials;
  activeTemplateId: string;
  templates: CopyTemplate[];
  channels: DistributionChannel[];
  scheduledPosts: ScheduledPost[];
}
