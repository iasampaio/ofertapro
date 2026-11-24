import { DistributionChannel, Offer, WhatsAppAccount } from '../types';
import { renderStatusCaption } from './copyGenerator';
import { sendBaileysImage } from './whatsappBaileys';

export interface DispatchResult {
  channelId: string;
  channelName: string;
  success: boolean;
  message: string;
}

async function sendToTelegram(
  channel: DistributionChannel,
  offer: Offer,
  caption: string
): Promise<DispatchResult> {
  const token = channel.token || process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return {
      channelId: channel.id,
      channelName: channel.name,
      success: false,
      message: 'Token do Bot do Telegram não configurado.',
    };
  }

  const endpoint = `https://api.telegram.org/bot${token}/sendPhoto`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: channel.targetId,
      photo: offer.imageUrl,
      caption,
      parse_mode: 'Markdown',
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    return {
      channelId: channel.id,
      channelName: channel.name,
      success: false,
      message: `Telegram HTTP ${res.status}: ${errText}`,
    };
  }

  return {
    channelId: channel.id,
    channelName: channel.name,
    success: true,
    message: 'Enviado com sucesso para o Telegram.',
  };
}

async function sendViaWhatsAppAccount(
  channel: DistributionChannel,
  account: WhatsAppAccount,
  offer: Offer,
  caption: string
): Promise<DispatchResult> {
  if (account.provider === 'baileys_native' || (!account.apiUrl && account.provider !== 'cloud_api')) {
    const res = await sendBaileysImage(
      account.id,
      account.phoneNumber,
      channel.targetId,
      offer.imageUrl,
      caption
    );
    return {
      channelId: channel.id,
      channelName: `${channel.name} (${account.label})`,
      success: res.success,
      message: res.message,
    };
  }

  if (account.provider === 'cloud_api') {
    const phoneNumberId = account.instanceName || process.env.WHATSAPP_PHONE_NUMBER_ID;
    const token = account.apiToken || process.env.WHATSAPP_CLOUD_API_TOKEN;
    if (!token || !phoneNumberId) {
      return {
        channelId: channel.id,
        channelName: `${channel.name} (${account.label})`,
        success: false,
        message: 'WhatsApp Cloud API sem Token ou Phone Number ID.',
      };
    }

    const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: channel.targetId,
        type: 'image',
        image: { link: offer.imageUrl, caption },
      }),
    });

    if (!res.ok) {
      return {
        channelId: channel.id,
        channelName: `${channel.name} (${account.label})`,
        success: false,
        message: `Meta Cloud API HTTP ${res.status}: ${await res.text()}`,
      };
    }

    return {
      channelId: channel.id,
      channelName: `${channel.name} (${account.label})`,
      success: true,
      message: `Enviado via ${account.label} (${account.phoneNumber}).`,
    };
  }

  // Evolution API / Z-API / Webhook na nuvem (suporta envio direto para grupos `@g.us`)
  const baseUrl = account.apiUrl.replace(/\/+$/, '');
  if (!baseUrl) {
    return {
      channelId: channel.id,
      channelName: `${channel.name} (${account.label})`,
      success: false,
      message: `Configure a URL da instância no WhatsApp "${account.label}".`,
    };
  }

  const endpoint =
    account.provider === 'evolution_webhook' && account.instanceName
      ? `${baseUrl}/message/sendMedia/${encodeURIComponent(account.instanceName)}`
      : baseUrl;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (account.apiToken) {
    headers['apikey'] = account.apiToken;
    headers['Authorization'] = `Bearer ${account.apiToken}`;
    headers['Client-Token'] = account.apiToken;
  }

  const payload =
    account.provider === 'evolution_webhook'
      ? {
          number: channel.targetId,
          mediatype: 'image',
          media: offer.imageUrl,
          caption,
        }
      : {
          phone: channel.targetId,
          image: offer.imageUrl,
          caption,
          link: offer.affiliateUrl,
        };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    return {
      channelId: channel.id,
      channelName: `${channel.name} (${account.label})`,
      success: false,
      message: `WhatsApp (${account.label}) HTTP ${res.status}: ${await res.text()}`,
    };
  }

  return {
    channelId: channel.id,
    channelName: `${channel.name} (${account.label})`,
    success: true,
    message: `Enviado no grupo via ${account.label} (${account.phoneNumber}).`,
  };
}

export async function sendWhatsAppStatus(
  account: WhatsAppAccount,
  offer: Offer,
  caption: string
): Promise<DispatchResult> {
  if (account.provider === 'baileys_native' || !account.apiUrl) {
    const res = await sendBaileysImage(
      account.id,
      account.phoneNumber,
      'status@broadcast',
      offer.imageUrl,
      caption
    );
    return {
      channelId: `status-${account.id}`,
      channelName: `Status (${account.label})`,
      success: res.success,
      message: res.message,
    };
  }

  const baseUrl = account.apiUrl.replace(/\/+$/, '');
  if (!baseUrl) {
    return {
      channelId: `status-${account.id}`,
      channelName: `Status (${account.label})`,
      success: false,
      message: `Configure a URL da instância no WhatsApp "${account.label}" para postar no Status na nuvem.`,
    };
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (account.apiToken) {
    headers['apikey'] = account.apiToken;
    headers['Authorization'] = `Bearer ${account.apiToken}`;
    headers['Client-Token'] = account.apiToken;
  }

  let endpoint = baseUrl;
  let payload: Record<string, unknown>;

  if (account.provider === 'evolution_webhook' && account.instanceName) {
    endpoint = `${baseUrl}/message/sendStatus/${encodeURIComponent(account.instanceName)}`;
    payload = {
      type: 'image',
      content: offer.imageUrl,
      caption,
      allContacts: true,
    };
  } else {
    // Z-API / Webhook genérico de Status
    endpoint = baseUrl.includes('send-image-status')
      ? baseUrl
      : `${baseUrl}/send-image-status`;
    payload = {
      image: offer.imageUrl,
      caption,
      link: offer.affiliateUrl,
    };
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    return {
      channelId: `status-${account.id}`,
      channelName: `Status (${account.label})`,
      success: false,
      message: `Status (${account.label}) HTTP ${res.status}: ${await res.text()}`,
    };
  }

  return {
    channelId: `status-${account.id}`,
    channelName: `Status (${account.label})`,
    success: true,
    message: `Publicado no Status do WhatsApp ${account.label} (${account.phoneNumber})!`,
  };
}

export async function dispatchToChannels(
  channels: DistributionChannel[],
  offer: Offer,
  caption: string,
  whatsappAccounts: WhatsAppAccount[] = []
): Promise<DispatchResult[]> {
  // Remove duplicados pelo mesmo destino (ex: mesmo grupo salvo em vários nichos) — NUNCA posta 2x/3x no mesmo grupo!
  const seenTargets = new Set<string>();
  const enabledChannels = channels.filter((c) => {
    if (!c.enabled) return false;
    const dedupeKey = `${c.type}:${c.whatsappAccountId || 'default'}:${c.targetId}`;
    if (seenTargets.has(dedupeKey)) return false;
    seenTargets.add(dedupeKey);
    return true;
  });

  if (enabledChannels.length === 0) {
    return [
      {
        channelId: 'none',
        channelName: 'Nenhum grupo/canal selecionado',
        success: false,
        message: 'Cadastre ou ative pelo menos um grupo para este nicho na aba Canais.',
      },
    ];
  }

  return Promise.all(
    enabledChannels.map(async (channel) => {
      try {
        if (channel.type === 'telegram') {
          return await sendToTelegram(channel, offer, caption);
        }

        const account =
          whatsappAccounts.find((a) => a.id === channel.whatsappAccountId) ||
          whatsappAccounts[0];

        if (channel.type === 'whatsapp_status') {
          if (!account) {
            return {
              channelId: channel.id,
              channelName: channel.name,
              success: false,
              message: 'Conecte um WhatsApp na aba Canais para postar no Status.',
            };
          }
          // Status usa legenda curta otimizada (dentro do limite de caracteres do WhatsApp Status)
          const statusCaption = renderStatusCaption(offer);
          return await sendWhatsAppStatus(account, offer, statusCaption);
        }

        if (account) {
          return await sendViaWhatsAppAccount(channel, account, offer, caption);
        }

        return {
          channelId: channel.id,
          channelName: channel.name,
          success: false,
          message:
            'Nenhum WhatsApp conectado vinculado a este grupo. Conecte um WhatsApp na aba Canais.',
        };
      } catch (err) {
        return {
          channelId: channel.id,
          channelName: channel.name,
          success: false,
          message: err instanceof Error ? err.message : 'Erro desconhecido no envio',
        };
      }
    })
  );
}
