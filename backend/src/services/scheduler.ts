import cron from 'node-cron';
import { dbStore } from '../db';
import { dispatchToChannels } from './dispatcher';

/**
 * Motor de agendamento na nuvem MULTI-USUÁRIO + MULTI-WHATSAPP.
 */
export async function processDueScheduledPosts(): Promise<number> {
  const duePosts = dbStore.listDuePendingPosts(new Date().toISOString());
  let processed = 0;

  for (const post of duePosts) {
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

  if (processed > 0) {
    console.log(`[CloudScheduler] ${processed} postagem(ns) processada(s).`);
  }

  return processed;
}

export function startCloudScheduler(): void {
  cron.schedule('* * * * *', () => {
    processDueScheduledPosts().catch((err) => {
      console.error('[CloudScheduler] Erro ao processar fila:', err);
    });
  });

  console.log('[CloudScheduler] Agendador multi-usuário na nuvem ativo (1 min).');
}
