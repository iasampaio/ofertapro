import cron from 'node-cron';
import { dbStore, DEFAULT_TEMPLATES, UserRecord } from '../db';
import { searchOffersAcrossStores } from '../providers';
import { renderOfferCaption } from './copyGenerator';
import { dispatchToChannels } from './dispatcher';
import { NicheId } from '../types';

/**
 * Verifica se o horário atual em Brasília (America/Sao_Paulo) está entre 08:00 e 21:59.
 * Postagens automáticas só rodam de 08h às 22h!
 */
export function isWithinBrazilBusinessHours(date = new Date()): boolean {
  const hourStr = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    hour: 'numeric',
    hour12: false,
  }).format(date);
  const hour = parseInt(hourStr, 10);
  return hour >= 8 && hour < 22;
}

export function clampToBusinessHours(targetDate: Date): Date {
  const result = new Date(targetDate.getTime());
  for (let i = 0; i < 24; i++) {
    if (isWithinBrazilBusinessHours(result)) {
      return result;
    }
    result.setTime(result.getTime() + 60 * 60 * 1000);
  }
  return result;
}

/**
 * Executa 1 rodada do Piloto Automático Contínuo para um usuário PRO.
 * Busca ofertas novas (sem repetir as últimas 60 postadas) e dispara nos Grupos / Status / Ambos.
 */
export async function runContinuousAutopilotForUser(user: UserRecord): Promise<boolean> {
  const cfg = user.autopilotConfig;
  if (!cfg) return false;

  const niches: NicheId[] = cfg.niches.length > 0 ? cfg.niches : ['todos'];
  const includesAll = niches.includes('todos');
  const chosenNiche = includesAll
    ? 'todos'
    : niches[Math.floor(Math.random() * niches.length)];

  let userChannels = dbStore.listChannels(user.id).filter((c) => c.enabled);
  const whatsappAccounts = dbStore.listWhatsAppAccounts(user.id);
  const targetChannels: typeof userChannels = [];

  if (cfg.targetMode === 'groups' || cfg.targetMode === 'both') {
    const groupChannels = userChannels.filter((c) => c.type !== 'whatsapp_status');
    const matched = includesAll
      ? groupChannels
      : groupChannels.filter((c) => niches.includes(c.niche) || c.niche === 'todos');
    targetChannels.push(...matched);
  }

  if (cfg.targetMode === 'status' || cfg.targetMode === 'both') {
    const chosenAccounts =
      cfg.whatsappAccountIds.length > 0
        ? whatsappAccounts.filter((a) => cfg.whatsappAccountIds.includes(a.id))
        : whatsappAccounts;

    for (const acc of chosenAccounts) {
      let statusCh = userChannels.find(
        (c) => c.type === 'whatsapp_status' && c.whatsappAccountId === acc.id
      );
      if (!statusCh) {
        statusCh = dbStore.addChannel(user.id, {
          name: `Status — ${acc.label}`,
          type: 'whatsapp_status',
          niche: 'todos',
          whatsappAccountId: acc.id,
          targetId: 'status@broadcast',
        });
        userChannels = [...userChannels, statusCh];
      }
      targetChannels.push(statusCh);
    }
  }

  if (targetChannels.length === 0) return false;

  const searchRes = await searchOffersAcrossStores(
    '',
    ['shopee', 'mercadolivre', 'amazon', 'aliexpress'],
    user.credentials,
    chosenNiche
  );

  // Filtra pelo desconto mínimo e evita repetir ofertas recentes
  const candidates = searchRes.offers.filter(
    (o) =>
      o.discountPercent >= cfg.minDiscount &&
      !user.autopilotPostedIds.includes(o.id)
  );

  // Se todas do lote já foram postadas recentemente, permite reciclar a melhor
  const offer =
    candidates[0] ||
    searchRes.offers.find((o) => o.discountPercent >= cfg.minDiscount) ||
    searchRes.offers[0];

  if (!offer) return false;

  const template =
    DEFAULT_TEMPLATES.find((t) => t.id === user.activeTemplateId) || DEFAULT_TEMPLATES[0];
  const caption = renderOfferCaption(offer, template);

  const results = await dispatchToChannels(
    targetChannels,
    offer,
    caption,
    whatsappAccounts
  );

  const anySuccess = results.some((r) => r.success);
  dbStore.recordAutopilotRun(user.id, offer.id);

  // Registra também no histórico da Agenda para o usuário ver o que o Piloto postou
  const post = dbStore.addScheduledPost(user.id, {
    offer,
    caption,
    channelIds: targetChannels.map((c) => c.id),
    scheduledFor: new Date().toISOString(),
  });
  dbStore.markScheduledPostResult(
    post.id,
    anySuccess ? 'sent' : 'failed',
    anySuccess ? undefined : results.map((r) => `${r.channelName}: ${r.message}`).join(' | ')
  );

  console.log(
    `[Autopilot] Usuário ${user.email}: "${offer.title.slice(0, 40)}..." -> ${
      anySuccess ? 'ENVIADO' : 'FALHOU'
    }`
  );
  return anySuccess;
}

/**
 * Verifica todos os assinantes PRO com Piloto Automático Contínuo ATIVADO
 * e dispara uma nova oferta sempre que o intervalo (em minutos) tiver passado (08h–22h Brasília).
 */
export async function processContinuousAutopilot(): Promise<number> {
  if (!isWithinBrazilBusinessHours()) return 0;

  const activeUsers = dbStore.listAutopilotActiveUsers();
  const now = Date.now();
  let executed = 0;

  for (const user of activeUsers) {
    const cfg = user.autopilotConfig;
    if (!cfg) continue;

    const intervalMs = Math.max(1, cfg.intervalMinutes) * 60 * 1000;
    const lastRunMs = user.autopilotLastRun ? new Date(user.autopilotLastRun).getTime() : 0;

    if (!lastRunMs || now - lastRunMs >= intervalMs) {
      await runContinuousAutopilotForUser(user).catch((err) => {
        console.error(`[Autopilot] Erro no usuário ${user.email}:`, err);
      });
      executed += 1;
    }
  }

  return executed;
}

export async function processDueScheduledPosts(forceIgnoreWindow = false): Promise<number> {
  if (!forceIgnoreWindow && !isWithinBrazilBusinessHours()) {
    return 0;
  }

  const duePosts = dbStore.listDuePendingPosts(new Date().toISOString());
  let processed = 0;

  for (const post of duePosts) {
    const owner = dbStore.getUserById(post.userId);
    if (!owner) continue;

    const userChannels = dbStore.listChannels(post.userId);
    const whatsappAccounts = dbStore.listWhatsAppAccounts(post.userId);
    const targetChannels = userChannels.filter((c) => post.channelIds.includes(c.id));

    const results = await dispatchToChannels(
      targetChannels,
      post.offer,
      post.caption,
      whatsappAccounts
    );
    const anySuccess = results.some((r) => r.success);

    if (anySuccess) {
      dbStore.markScheduledPostResult(post.id, 'sent');
    } else {
      const errorMsg = results
        .map((r) => `${r.channelName}: ${r.message}`)
        .join(' | ');
      dbStore.markScheduledPostResult(post.id, 'failed', errorMsg);
    }

    processed += 1;
  }

  return processed;
}

export function startCloudScheduler(): void {
  cron.schedule('* * * * *', () => {
    processDueScheduledPosts(false).catch((err) => {
      console.error('[CloudScheduler] Erro fila manual:', err);
    });
    processContinuousAutopilot().catch((err) => {
      console.error('[CloudScheduler] Erro piloto contínuo:', err);
    });
  });

  console.log(
    '[CloudScheduler] Agendador + Piloto Automático Contínuo ativos (08h–22h Brasília).'
  );
}
