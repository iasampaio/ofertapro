import fs from 'fs';
import path from 'path';
import { v4 as uuid } from 'uuid';
import {
  AffiliateCredentials,
  AutopilotConfig,
  CopyTemplate,
  DistributionChannel,
  NicheId,
  Offer,
  ScheduledPost,
  ScheduleStatus,
  WhatsAppAccount,
  WhatsAppProviderType,
} from './types';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { DatabaseSync } = require('node:sqlite') as {
  DatabaseSync: new (filename: string) => {
    exec: (sql: string) => void;
    prepare: (sql: string) => {
      run: (...params: unknown[]) => { changes: number };
      get: (...params: unknown[]) => Record<string, unknown> | undefined;
      all: (...params: unknown[]) => Array<Record<string, unknown>>;
    };
  };
};

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'ofertapro.db');
const db = new DatabaseSync(DB_PATH);

db.exec(`
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    plan TEXT NOT NULL DEFAULT 'free',
    daily_posts_limit INTEGER NOT NULL DEFAULT 5,
    posts_used_today INTEGER NOT NULL DEFAULT 0,
    last_usage_date TEXT NOT NULL,
    shopee_app_id TEXT NOT NULL DEFAULT '',
    shopee_app_secret TEXT NOT NULL DEFAULT '',
    mercadolivre_tag TEXT NOT NULL DEFAULT '',
    amazon_tag TEXT NOT NULL DEFAULT '',
    aliexpress_key TEXT NOT NULL DEFAULT '',
    active_template_id TEXT NOT NULL DEFAULT 'urgencia',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS whatsapp_accounts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    label TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    provider TEXT NOT NULL DEFAULT 'evolution_webhook',
    api_url TEXT NOT NULL DEFAULT '',
    api_token TEXT NOT NULL DEFAULT '',
    instance_name TEXT,
    status TEXT NOT NULL DEFAULT 'connected',
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS channels (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    niche TEXT NOT NULL DEFAULT 'todos',
    whatsapp_account_id TEXT,
    target_id TEXT NOT NULL,
    token TEXT,
    webhook_url TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS scheduled_posts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    offer_json TEXT NOT NULL,
    caption TEXT NOT NULL,
    channel_ids_json TEXT NOT NULL,
    scheduled_for TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    error_message TEXT,
    sent_at TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

// Migração segura caso o banco anterior já exista sem as colunas `niche` e `whatsapp_account_id`
try {
  db.exec(`ALTER TABLE channels ADD COLUMN niche TEXT NOT NULL DEFAULT 'todos';`);
} catch {
  // Coluna já existe
}
try {
  db.exec(`ALTER TABLE channels ADD COLUMN whatsapp_account_id TEXT;`);
} catch {
  // Coluna já existe
}
try {
  db.exec(`ALTER TABLE users ADD COLUMN autopilot_enabled INTEGER NOT NULL DEFAULT 0;`);
} catch {
  // Coluna já existe
}
try {
  db.exec(`ALTER TABLE users ADD COLUMN autopilot_config_json TEXT;`);
} catch {
  // Coluna já existe
}
try {
  db.exec(`ALTER TABLE users ADD COLUMN autopilot_last_run TEXT;`);
} catch {
  // Coluna já existe
}
try {
  db.exec(`ALTER TABLE users ADD COLUMN autopilot_posted_ids_json TEXT NOT NULL DEFAULT '[]';`);
} catch {
  // Coluna já existe
}

export const DEFAULT_TEMPLATES: CopyTemplate[] = [
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

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  plan: 'free' | 'pro';
  autopilotEnabled: boolean;
  autopilotConfig: AutopilotConfig | null;
  autopilotLastRun: string | null;
  autopilotPostedIds: string[];
  dailyPostsLimit: number;
  postsUsedToday: number;
  lastUsageDate: string;
  credentials: AffiliateCredentials;
  activeTemplateId: string;
  createdAt: string;
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function mapUserRow(row: Record<string, unknown>): UserRecord {
  let autopilotConfig: AutopilotConfig | null = null;
  if (row.autopilot_config_json) {
    try {
      autopilotConfig = JSON.parse(String(row.autopilot_config_json)) as AutopilotConfig;
    } catch {
      autopilotConfig = null;
    }
  }
  let autopilotPostedIds: string[] = [];
  if (row.autopilot_posted_ids_json) {
    try {
      autopilotPostedIds = JSON.parse(String(row.autopilot_posted_ids_json)) as string[];
    } catch {
      autopilotPostedIds = [];
    }
  }

  return {
    id: String(row.id),
    name: String(row.name),
    email: String(row.email),
    passwordHash: String(row.password_hash),
    plan: row.plan === 'pro' ? 'pro' : 'free',
    autopilotEnabled: Number(row.autopilot_enabled) === 1,
    autopilotConfig,
    autopilotLastRun: row.autopilot_last_run ? String(row.autopilot_last_run) : null,
    autopilotPostedIds,
    dailyPostsLimit: Number(row.daily_posts_limit) || 5,
    postsUsedToday: Number(row.posts_used_today) || 0,
    lastUsageDate: String(row.last_usage_date),
    credentials: {
      shopeeAppId: String(row.shopee_app_id || ''),
      shopeeAppSecret: String(row.shopee_app_secret || ''),
      mercadoLivreTag: String(row.mercadolivre_tag || ''),
      amazonTag: String(row.amazon_tag || ''),
      aliexpressKey: String(row.aliexpress_key || ''),
    },
    activeTemplateId: String(row.active_template_id || 'urgencia'),
    createdAt: String(row.created_at),
  };
}

function resetDailyCounterIfNeeded(user: UserRecord): UserRecord {
  const today = todayIsoDate();
  if (user.lastUsageDate !== today) {
    db.prepare(
      'UPDATE users SET posts_used_today = 0, last_usage_date = ? WHERE id = ?'
    ).run(today, user.id);
    user.postsUsedToday = 0;
    user.lastUsageDate = today;
  }
  return user;
}

export const dbStore = {
  createUser(name: string, email: string, passwordHash: string): UserRecord {
    const id = uuid();
    const now = new Date().toISOString();
    const today = todayIsoDate();
    db.prepare(
      `INSERT INTO users (id, name, email, password_hash, plan, daily_posts_limit, posts_used_today, last_usage_date, created_at)
       VALUES (?, ?, ?, ?, 'free', 5, 0, ?, ?)`
    ).run(id, name.trim(), email.trim().toLowerCase(), passwordHash, today, now);

    return this.getUserById(id)!;
  },

  getUserByEmail(email: string): UserRecord | null {
    const row = db
      .prepare('SELECT * FROM users WHERE email = ?')
      .get(email.trim().toLowerCase());
    return row ? resetDailyCounterIfNeeded(mapUserRow(row)) : null;
  },

  getUserById(id: string): UserRecord | null {
    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    return row ? resetDailyCounterIfNeeded(mapUserRow(row)) : null;
  },

  updateCredentials(userId: string, creds: Partial<AffiliateCredentials>): void {
    const current = this.getUserById(userId);
    if (!current) return;

    const next: AffiliateCredentials = {
      shopeeAppId: creds.shopeeAppId ?? current.credentials.shopeeAppId,
      shopeeAppSecret:
        creds.shopeeAppSecret && creds.shopeeAppSecret !== '••••••••'
          ? creds.shopeeAppSecret
          : current.credentials.shopeeAppSecret,
      mercadoLivreTag: creds.mercadoLivreTag ?? current.credentials.mercadoLivreTag,
      amazonTag: creds.amazonTag ?? current.credentials.amazonTag,
      aliexpressKey: creds.aliexpressKey ?? current.credentials.aliexpressKey,
    };

    db.prepare(
      `UPDATE users
       SET shopee_app_id = ?, shopee_app_secret = ?, mercadolivre_tag = ?, amazon_tag = ?, aliexpress_key = ?
       WHERE id = ?`
    ).run(
      next.shopeeAppId,
      next.shopeeAppSecret,
      next.mercadoLivreTag,
      next.amazonTag,
      next.aliexpressKey,
      userId
    );
  },

  updatePlan(userId: string, plan: 'free' | 'pro'): void {
    db.prepare('UPDATE users SET plan = ? WHERE id = ?').run(plan, userId);
  },

  setAutopilotEnabled(userId: string, enabled: boolean): void {
    db.prepare('UPDATE users SET autopilot_enabled = ? WHERE id = ?').run(
      enabled ? 1 : 0,
      userId
    );
  },

  saveAutopilotConfig(userId: string, config: AutopilotConfig, enable = true): void {
    db.prepare(
      'UPDATE users SET autopilot_config_json = ?, autopilot_enabled = ? WHERE id = ?'
    ).run(JSON.stringify(config), enable ? 1 : 0, userId);
  },

  listAutopilotActiveUsers(): UserRecord[] {
    const rows = db
      .prepare(
        `SELECT * FROM users WHERE plan = 'pro' AND autopilot_enabled = 1 AND autopilot_config_json IS NOT NULL`
      )
      .all();
    return rows.map((r) => resetDailyCounterIfNeeded(mapUserRow(r)));
  },

  recordAutopilotRun(userId: string, offerId: string): void {
    const user = this.getUserById(userId);
    const prevIds = user?.autopilotPostedIds || [];
    const nextIds = [...prevIds.filter((id) => id !== offerId), offerId].slice(-60);
    db.prepare(
      'UPDATE users SET autopilot_last_run = ?, autopilot_posted_ids_json = ? WHERE id = ?'
    ).run(new Date().toISOString(), JSON.stringify(nextIds), userId);
  },

  canPublishMore(user: UserRecord): boolean {
    if (user.plan === 'pro') return true;
    return user.postsUsedToday < user.dailyPostsLimit;
  },

  incrementUsage(userId: string): void {
    db.prepare(
      'UPDATE users SET posts_used_today = posts_used_today + 1, last_usage_date = ? WHERE id = ?'
    ).run(todayIsoDate(), userId);
  },

  // --- WHATSAPP ACCOUNTS (MULTI-WHATSAPP) ---
  listWhatsAppAccounts(userId: string): WhatsAppAccount[] {
    const rows = db
      .prepare('SELECT * FROM whatsapp_accounts WHERE user_id = ? ORDER BY created_at DESC')
      .all(userId);

    return rows.map((r) => ({
      id: String(r.id),
      label: String(r.label),
      phoneNumber: String(r.phone_number),
      provider: String(r.provider) as WhatsAppProviderType,
      apiUrl: String(r.api_url || ''),
      apiToken: String(r.api_token || ''),
      instanceName: r.instance_name ? String(r.instance_name) : undefined,
      status: r.status === 'disconnected' ? 'disconnected' : 'connected',
      createdAt: String(r.created_at),
    }));
  },

  addWhatsAppAccount(
    userId: string,
    input: {
      label: string;
      phoneNumber: string;
      provider: WhatsAppProviderType;
      apiUrl: string;
      apiToken: string;
      instanceName?: string;
    }
  ): WhatsAppAccount {
    const id = uuid();
    const createdAt = new Date().toISOString();
    db.prepare(
      `INSERT INTO whatsapp_accounts (id, user_id, label, phone_number, provider, api_url, api_token, instance_name, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'connected', ?)`
    ).run(
      id,
      userId,
      input.label,
      input.phoneNumber,
      input.provider,
      input.apiUrl,
      input.apiToken,
      input.instanceName || null,
      createdAt
    );

    return {
      id,
      ...input,
      status: 'connected',
      createdAt,
    };
  },

  deleteWhatsAppAccount(userId: string, accountId: string): void {
    db.prepare('DELETE FROM whatsapp_accounts WHERE id = ? AND user_id = ?').run(
      accountId,
      userId
    );
  },

  // --- CHANNELS / GRUPOS POR NICHO ---
  listChannels(userId: string): DistributionChannel[] {
    const rows = db
      .prepare('SELECT * FROM channels WHERE user_id = ? ORDER BY created_at DESC')
      .all(userId);
    return rows.map((r) => ({
      id: String(r.id),
      name: String(r.name),
      type: String(r.type) as DistributionChannel['type'],
      enabled: Number(r.enabled) === 1,
      niche: (String(r.niche || 'todos') as NicheId) || 'todos',
      whatsappAccountId: r.whatsapp_account_id ? String(r.whatsapp_account_id) : undefined,
      targetId: String(r.target_id),
      token: r.token ? String(r.token) : undefined,
      webhookUrl: r.webhook_url ? String(r.webhook_url) : undefined,
      createdAt: String(r.created_at),
    }));
  },

  addChannel(
    userId: string,
    input: Omit<DistributionChannel, 'id' | 'enabled' | 'createdAt'>
  ): DistributionChannel {
    const id = uuid();
    const createdAt = new Date().toISOString();
    const niche = input.niche || 'todos';

    db.prepare(
      `INSERT INTO channels (id, user_id, name, type, enabled, niche, whatsapp_account_id, target_id, token, webhook_url, created_at)
       VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      userId,
      input.name,
      input.type,
      niche,
      input.whatsappAccountId || null,
      input.targetId,
      input.token || null,
      input.webhookUrl || null,
      createdAt
    );

    return {
      id,
      ...input,
      niche,
      enabled: true,
      createdAt,
    };
  },

  updateChannel(
    userId: string,
    channelId: string,
    patch: { enabled?: boolean; name?: string; niche?: NicheId; whatsappAccountId?: string }
  ): DistributionChannel | null {
    const existing = this.listChannels(userId).find((c) => c.id === channelId);
    if (!existing) return null;

    const enabled =
      patch.enabled !== undefined ? (patch.enabled ? 1 : 0) : existing.enabled ? 1 : 0;
    const name = patch.name !== undefined ? patch.name : existing.name;
    const niche = patch.niche !== undefined ? patch.niche : existing.niche;
    const whatsappAccountId =
      patch.whatsappAccountId !== undefined
        ? patch.whatsappAccountId
        : existing.whatsappAccountId;

    db.prepare(
      'UPDATE channels SET enabled = ?, name = ?, niche = ?, whatsapp_account_id = ? WHERE id = ? AND user_id = ?'
    ).run(enabled, name, niche, whatsappAccountId || null, channelId, userId);

    return { ...existing, enabled: enabled === 1, name, niche, whatsappAccountId };
  },

  deleteChannel(userId: string, channelId: string): void {
    db.prepare('DELETE FROM channels WHERE id = ? AND user_id = ?').run(channelId, userId);
  },

  // --- SCHEDULED POSTS ---
  listScheduledPosts(userId: string): ScheduledPost[] {
    const rows = db
      .prepare('SELECT * FROM scheduled_posts WHERE user_id = ? ORDER BY scheduled_for ASC')
      .all(userId);
    return rows.map((r) => ({
      id: String(r.id),
      offer: JSON.parse(String(r.offer_json)) as Offer,
      caption: String(r.caption),
      channelIds: JSON.parse(String(r.channel_ids_json)) as string[],
      scheduledFor: String(r.scheduled_for),
      status: String(r.status) as ScheduleStatus,
      errorMessage: r.error_message ? String(r.error_message) : undefined,
      sentAt: r.sent_at ? String(r.sent_at) : undefined,
      createdAt: String(r.created_at),
    }));
  },

  addScheduledPost(
    userId: string,
    input: { offer: Offer; caption: string; channelIds: string[]; scheduledFor: string }
  ): ScheduledPost {
    const id = uuid();
    const createdAt = new Date().toISOString();
    db.prepare(
      `INSERT INTO scheduled_posts (id, user_id, offer_json, caption, channel_ids_json, scheduled_for, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`
    ).run(
      id,
      userId,
      JSON.stringify(input.offer),
      input.caption,
      JSON.stringify(input.channelIds),
      input.scheduledFor,
      createdAt
    );

    return {
      id,
      offer: input.offer,
      caption: input.caption,
      channelIds: input.channelIds,
      scheduledFor: input.scheduledFor,
      status: 'pending',
      createdAt,
    };
  },

  deleteScheduledPost(userId: string, postId: string): void {
    db.prepare('DELETE FROM scheduled_posts WHERE id = ? AND user_id = ?').run(postId, userId);
  },

  listDuePendingPosts(nowIso: string): Array<ScheduledPost & { userId: string }> {
    const rows = db
      .prepare(
        `SELECT * FROM scheduled_posts WHERE status = 'pending' AND scheduled_for <= ? ORDER BY scheduled_for ASC`
      )
      .all(nowIso);

    return rows.map((r) => ({
      id: String(r.id),
      userId: String(r.user_id),
      offer: JSON.parse(String(r.offer_json)) as Offer,
      caption: String(r.caption),
      channelIds: JSON.parse(String(r.channel_ids_json)) as string[],
      scheduledFor: String(r.scheduled_for),
      status: 'pending' as const,
      createdAt: String(r.created_at),
    }));
  },

  markScheduledPostResult(
    postId: string,
    status: 'sent' | 'failed',
    errorMessage?: string
  ): void {
    const sentAt = status === 'sent' ? new Date().toISOString() : null;
    db.prepare(
      'UPDATE scheduled_posts SET status = ?, sent_at = ?, error_message = ? WHERE id = ?'
    ).run(status, sentAt, errorMessage || null, postId);
  },
};
