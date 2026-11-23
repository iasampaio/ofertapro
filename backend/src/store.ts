import fs from 'fs';
import path from 'path';
import { UserSettings } from './types';

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'db.json');

const DEFAULT_TEMPLATES = [
  {
    id: 'urgencia',
    name: 'Oferta Relâmpago (Alta Conversão)',
    body: [
      '🔥 *ACHADINHO IMPERDÍVEL NA {{STORE}}!*',
      '',
      '📦 {{TITLE}}',
      '',
      '❌ De: ~R$ {{ORIGINAL_PRICE}}~',
      '✅ *Por apenas: R$ {{PRICE}}* ({{DISCOUNT}}% OFF!)',
      '{{COUPON_LINE}}',
      '',
      '🛒 *Garanta o seu antes que acabe:*',
      '👉 {{LINK}}',
      '',
      '⚠️ _Preço e estoque sujeitos a alteração a qualquer momento._',
    ].join('\n'),
  },
  {
    id: 'direto',
    name: 'Direto ao Ponto (Minimalista)',
    body: [
      '⚡ *{{TITLE}}*',
      '💰 *R$ {{PRICE}}* ({{DISCOUNT}}% OFF na {{STORE}})',
      '{{COUPON_LINE}}',
      '🔗 Compre aqui: {{LINK}}',
    ].join('\n'),
  },
];

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function getDefaultSettings(): UserSettings {
  return {
    plan: 'free',
    dailyPostsLimit: 5,
    postsUsedToday: 0,
    lastUsageDate: todayIsoDate(),
    credentials: {
      shopeeAppId: process.env.SHOPEE_APP_ID || '',
      shopeeAppSecret: process.env.SHOPEE_APP_SECRET || '',
      mercadoLivreTag: process.env.MERCADOLIVRE_AFFILIATE_TAG || '',
      amazonTag: process.env.AMAZON_ASSOCIATE_TAG || '',
      aliexpressKey: process.env.ALIEXPRESS_APP_KEY || '',
    },
    activeTemplateId: 'urgencia',
    templates: DEFAULT_TEMPLATES,
    channels: [],
    scheduledPosts: [],
  };
}

let cachedSettings: UserSettings | null = null;

export function loadSettings(): UserSettings {
  if (cachedSettings) {
    resetDailyCounterIfNeeded(cachedSettings);
    return cachedSettings;
  }

  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as UserSettings;
      cachedSettings = {
        ...getDefaultSettings(),
        ...parsed,
        credentials: {
          ...getDefaultSettings().credentials,
          ...(parsed.credentials || {}),
        },
      };
      resetDailyCounterIfNeeded(cachedSettings);
      return cachedSettings;
    }
  } catch (err) {
    console.warn('[Store] Falha ao ler db.json, usando padrão:', err);
  }

  cachedSettings = getDefaultSettings();
  saveSettings(cachedSettings);
  return cachedSettings;
}

export function saveSettings(settings: UserSettings): void {
  cachedSettings = settings;
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(DATA_FILE, JSON.stringify(settings, null, 2), 'utf-8');
}

function resetDailyCounterIfNeeded(settings: UserSettings): void {
  const today = todayIsoDate();
  if (settings.lastUsageDate !== today) {
    settings.postsUsedToday = 0;
    settings.lastUsageDate = today;
    saveSettings(settings);
  }
}

export function canPublishMore(settings: UserSettings): boolean {
  resetDailyCounterIfNeeded(settings);
  if (settings.plan === 'pro') return true;
  return settings.postsUsedToday < settings.dailyPostsLimit;
}

export function incrementUsage(settings: UserSettings): void {
  resetDailyCounterIfNeeded(settings);
  settings.postsUsedToday += 1;
  saveSettings(settings);
}
