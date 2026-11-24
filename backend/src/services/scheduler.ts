import cron from 'node-cron';
import { dbStore } from '../db';
import { dispatchToChannels } from './dispatcher';

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

/**
 * Ajusta uma data de agendamento para cair dentro da janela 08h–22h (Brasília).
 * Se passar das 22h ou for antes das 08h, move automaticamente para 08:00.
 */
export function clampToBusinessHours(targetDate: Date): Date {
  const result = new Date(targetDate.getTime());
  for (let i = 0; i < 24; i++) {
    if (isWithinBrazilBusinessHours(result)) {
      return result;
    }
    // Avança 1 hora até entrar na janela 08h–22h
    result.setTime(result.getTime() + 60 * 60 * 1000);
  }
  return result;
}

/**
 * Motor de agendamento na nuvem MULTI-USUÁRIO + MULTI-WHATSAPP.
 * Respeita janela 08h–22h (Brasília) e o botão Ativar/Desativar Piloto Automático de cada usuário.
 */
export async function processDueScheduledPosts(forceIgnoreWindow = false): Promise<number> {
  if (!forceIgnoreWindow && !isWithinBrazilBusinessHours()) {
    return 0;
  }

  const duePosts = dbStore.listDuePendingPosts(new Date().toISOString());
  let processed = 0;

  for (const post of duePosts) {
    const owner = dbStore.getUserById(post.userId);
    if (!owner) continue;

    // Se o usuário desativou o Piloto Automático, não dispara automaticamente (a menos que clique manual em "Processar")
    if (!forceIgnoreWindow && !owner.autopilotEnabled) {
      continue;
    }

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
    processDueScheduledPosts(false).catch((err) => {
      console.error('[CloudScheduler] Erro ao processar fila:', err);
    });
  });

  console.log('[CloudScheduler] Agendador ativo (janela 08h–22h Brasília, verificação a cada 1 min).');
}
