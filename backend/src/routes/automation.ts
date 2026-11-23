import { Router } from 'express';
import { dbStore, DEFAULT_TEMPLATES } from '../db';
import { AuthenticatedRequest, requireAuth } from '../middleware/authMiddleware';
import { searchOffersAcrossStores } from '../providers';
import { renderOfferCaption, renderStatusCaption } from '../services/copyGenerator';
import { dispatchToChannels, sendWhatsAppStatus } from '../services/dispatcher';
import { processDueScheduledPosts } from '../services/scheduler';
import {
  AffiliateCredentials,
  ChannelType,
  NICHES,
  NicheId,
  Offer,
  WhatsAppProviderType,
} from '../types';

export const automationRouter = Router();
automationRouter.use(requireAuth);

/** GET /api/automation/settings */
automationRouter.get('/settings', (req: AuthenticatedRequest, res) => {
  const user = dbStore.getUserById(req.user!.id);
  if (!user) {
    res.status(404).json({ error: 'Usuário não encontrado.' });
    return;
  }

  const channels = dbStore.listChannels(user.id);
  const whatsappAccounts = dbStore.listWhatsAppAccounts(user.id).map((a) => ({
    ...a,
    apiToken: a.apiToken ? '••••••••' : '',
  }));

  res.json({
    user: { id: user.id, name: user.name, email: user.email },
    plan: user.plan,
    dailyPostsLimit: user.dailyPostsLimit,
    postsUsedToday: user.postsUsedToday,
    credentials: {
      ...user.credentials,
      shopeeAppSecret: user.credentials.shopeeAppSecret ? '••••••••' : '',
    },
    hasShopeeSecret: Boolean(user.credentials.shopeeAppSecret),
    activeTemplateId: user.activeTemplateId,
    templates: DEFAULT_TEMPLATES,
    niches: NICHES,
    whatsappAccounts,
    channels,
  });
});

/** PUT /api/automation/credentials */
automationRouter.put('/credentials', (req: AuthenticatedRequest, res) => {
  const body = req.body as Partial<AffiliateCredentials>;
  dbStore.updateCredentials(req.user!.id, body);
  res.json({ ok: true });
});

/**
 * POST /api/automation/whatsapp-accounts/pair
 * Conecta um WhatsApp apenas pelo número de celular gerando código de pareamento de 8 dígitos.
 */
automationRouter.post('/whatsapp-accounts/pair', async (req: AuthenticatedRequest, res) => {
  try {
    const user = dbStore.getUserById(req.user!.id);
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }

    const { label, phoneNumber } = req.body as {
      label?: string;
      phoneNumber?: string;
    };

    const digits = (phoneNumber || '').replace(/\D/g, '');
    if (digits.length < 10) {
      res.status(400).json({
        error: 'Informe um número de celular válido com DDD (ex: 11999998888).',
      });
      return;
    }

    const normalizedPhone = digits.startsWith('55') ? digits : `55${digits}`;

    const existing = dbStore.listWhatsAppAccounts(user.id);
    if (user.plan === 'free' && existing.length >= 1) {
      res.status(402).json({
        error:
          'No Plano Grátis você conecta 1 WhatsApp. Assine o PRO para conectar vários números de WhatsApp ao mesmo tempo!',
        code: 'PRO_REQUIRED',
      });
      return;
    }

    const instanceName = `ofertapro_${user.id.slice(0, 6)}_${normalizedPhone.slice(-4)}`;
    const evoUrl = (process.env.EVOLUTION_API_URL || '').replace(/\/+$/, '');
    const evoKey = process.env.EVOLUTION_API_KEY || '';

    let pairingCode = '';
    let mode: 'live' | 'demo' = 'demo';

    if (evoUrl && evoKey) {
      // 1. Cria a instância na Evolution API (ignora se já existir)
      await fetch(`${evoUrl}/instance/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: evoKey },
        body: JSON.stringify({
          instanceName,
          number: normalizedPhone,
          integration: 'WHATSAPP-BAILEYS',
          qrcode: false,
        }),
      }).catch(() => {});

      // 2. Solicita o código de pareamento de 8 dígitos para o número
      const connectRes = await fetch(
        `${evoUrl}/instance/connect/${encodeURIComponent(instanceName)}?number=${normalizedPhone}`,
        {
          method: 'GET',
          headers: { apikey: evoKey },
        }
      );

      if (connectRes.ok) {
        const data = (await connectRes.json()) as {
          pairingCode?: string;
          code?: string;
        };
        pairingCode = data.pairingCode || data.code || '';
        mode = 'live';
      }
    }

    if (!pairingCode) {
      // Modo demonstração quando EVOLUTION_API_URL ainda não foi configurada no servidor
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      const pick = () => chars[Math.floor(Math.random() * chars.length)];
      pairingCode = `${pick()}${pick()}${pick()}${pick()}-${pick()}${pick()}${pick()}${pick()}`;
      mode = 'demo';
    }

    const account = dbStore.addWhatsAppAccount(user.id, {
      label: (label || `WhatsApp ${normalizedPhone.slice(-4)}`).trim(),
      phoneNumber: normalizedPhone,
      provider: 'evolution_webhook',
      apiUrl: evoUrl,
      apiToken: evoKey,
      instanceName,
    });

    res.status(201).json({
      account,
      pairingCode,
      mode,
      instructions:
        'Abra o WhatsApp no celular → ⋮ (Mais opções) → Aparelhos conectados → Conectar um aparelho → Conectar com número de telefone e digite este código.',
    });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Erro ao gerar código de pareamento',
    });
  }
});

/** POST /api/automation/whatsapp-accounts — Conecta múltiplos números de WhatsApp (avançado) */
automationRouter.post('/whatsapp-accounts', (req: AuthenticatedRequest, res) => {
  const user = dbStore.getUserById(req.user!.id);
  if (!user) {
    res.status(404).json({ error: 'Usuário não encontrado.' });
    return;
  }

  const { label, phoneNumber, provider, apiUrl, apiToken, instanceName } = req.body as {
    label?: string;
    phoneNumber?: string;
    provider?: WhatsAppProviderType;
    apiUrl?: string;
    apiToken?: string;
    instanceName?: string;
  };

  if (!label || !phoneNumber) {
    res.status(400).json({ error: 'Informe um apelido (ex: WhatsApp Casa) e o número.' });
    return;
  }

  const existing = dbStore.listWhatsAppAccounts(user.id);
  if (user.plan === 'free' && existing.length >= 1) {
    res.status(402).json({
      error:
        'No Plano Grátis você conecta 1 WhatsApp. Assine o PRO para conectar vários números de WhatsApp ao mesmo tempo!',
      code: 'PRO_REQUIRED',
    });
    return;
  }

  const account = dbStore.addWhatsAppAccount(user.id, {
    label: label.trim(),
    phoneNumber: phoneNumber.trim(),
    provider: provider || 'evolution_webhook',
    apiUrl: (apiUrl || '').trim(),
    apiToken: (apiToken || '').trim(),
    instanceName: instanceName?.trim() || undefined,
  });

  res.status(201).json(account);
});

/** DELETE /api/automation/whatsapp-accounts/:id */
automationRouter.delete('/whatsapp-accounts/:id', (req: AuthenticatedRequest, res) => {
  dbStore.deleteWhatsAppAccount(req.user!.id, String(req.params.id));
  res.json({ ok: true });
});

/** POST /api/automation/channels — Cadastra grupo/canal vinculado a um Nicho e a um WhatsApp */
automationRouter.post('/channels', (req: AuthenticatedRequest, res) => {
  const user = dbStore.getUserById(req.user!.id);
  if (!user) {
    res.status(404).json({ error: 'Usuário não encontrado.' });
    return;
  }

  const { name, type, targetId, niche, whatsappAccountId, token, webhookUrl } = req.body as {
    name?: string;
    type?: ChannelType;
    targetId?: string;
    niche?: NicheId;
    whatsappAccountId?: string;
    token?: string;
    webhookUrl?: string;
  };

  if (!name || !type || !targetId) {
    res.status(400).json({ error: 'Informe nome do grupo, tipo e ID de destino.' });
    return;
  }

  const existingChannels = dbStore.listChannels(user.id);
  if (user.plan === 'free' && existingChannels.length >= 2) {
    res.status(402).json({
      error:
        'Plano Grátis permite até 2 grupos. Assine o PRO para cadastrar grupos ilimitados por nicho!',
      code: 'PRO_REQUIRED',
    });
    return;
  }

  const channel = dbStore.addChannel(user.id, {
    name: name.trim(),
    type,
    niche: niche || 'todos',
    whatsappAccountId: whatsappAccountId || undefined,
    targetId: targetId.trim(),
    token: token || undefined,
    webhookUrl: webhookUrl || undefined,
  });
  res.status(201).json(channel);
});

/** PATCH /api/automation/channels/:id */
automationRouter.patch('/channels/:id', (req: AuthenticatedRequest, res) => {
  const updated = dbStore.updateChannel(req.user!.id, String(req.params.id), {
    enabled: typeof req.body.enabled === 'boolean' ? req.body.enabled : undefined,
    name: typeof req.body.name === 'string' ? req.body.name : undefined,
    niche: typeof req.body.niche === 'string' ? (req.body.niche as NicheId) : undefined,
    whatsappAccountId:
      typeof req.body.whatsappAccountId === 'string'
        ? req.body.whatsappAccountId
        : undefined,
  });
  if (!updated) {
    res.status(404).json({ error: 'Canal não encontrado.' });
    return;
  }
  res.json(updated);
});

/** DELETE /api/automation/channels/:id */
automationRouter.delete('/channels/:id', (req: AuthenticatedRequest, res) => {
  dbStore.deleteChannel(req.user!.id, String(req.params.id));
  res.json({ ok: true });
});

/** POST /api/automation/dispatch — Disparo imediato (por nicho ou canais escolhidos) */
automationRouter.post('/dispatch', async (req: AuthenticatedRequest, res) => {
  try {
    const user = dbStore.getUserById(req.user!.id);
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }

    const { offer, caption, channelIds, niche } = req.body as {
      offer?: Offer;
      caption?: string;
      channelIds?: string[];
      niche?: NicheId;
    };

    if (!offer) {
      res.status(400).json({ error: 'Oferta obrigatória.' });
      return;
    }

    if (!dbStore.canPublishMore(user)) {
      res.status(402).json({
        error: `Limite diário de ${user.dailyPostsLimit} disparos atingido no Plano Grátis. Assine o PRO para disparos ilimitados.`,
        code: 'PRO_REQUIRED',
      });
      return;
    }

    const template =
      DEFAULT_TEMPLATES.find((t) => t.id === user.activeTemplateId) || DEFAULT_TEMPLATES[0];
    const finalCaption = caption || renderOfferCaption(offer, template);

    const userChannels = dbStore.listChannels(user.id);
    const whatsappAccounts = dbStore.listWhatsAppAccounts(user.id);

    let targetChannels = userChannels.filter((c) => c.enabled);
    if (channelIds && channelIds.length > 0) {
      targetChannels = userChannels.filter((c) => channelIds.includes(c.id));
    } else if (niche && niche !== 'todos') {
      targetChannels = targetChannels.filter(
        (c) => c.niche === niche || c.niche === 'todos'
      );
    }

    const results = await dispatchToChannels(
      targetChannels,
      offer,
      finalCaption,
      whatsappAccounts
    );
    if (results.some((r) => r.success)) {
      dbStore.incrementUsage(user.id);
    }

    res.json({ results, caption: finalCaption });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Erro ao disparar oferta',
    });
  }
});

/** POST /api/automation/dispatch-status — Posta direto no Status de 1 ou vários WhatsApps */
automationRouter.post('/dispatch-status', async (req: AuthenticatedRequest, res) => {
  try {
    const user = dbStore.getUserById(req.user!.id);
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }

    const { offer, caption, whatsappAccountIds } = req.body as {
      offer?: Offer;
      caption?: string;
      whatsappAccountIds?: string[];
    };

    if (!offer) {
      res.status(400).json({ error: 'Oferta obrigatória.' });
      return;
    }

    if (!dbStore.canPublishMore(user)) {
      res.status(402).json({
        error: `Limite diário de ${user.dailyPostsLimit} disparos atingido no Plano Grátis. Assine o PRO para disparos ilimitados.`,
        code: 'PRO_REQUIRED',
      });
      return;
    }

    const allAccounts = dbStore.listWhatsAppAccounts(user.id);
    const targets =
      whatsappAccountIds && whatsappAccountIds.length > 0
        ? allAccounts.filter((a) => whatsappAccountIds.includes(a.id))
        : allAccounts;

    if (targets.length === 0) {
      res.status(400).json({
        error:
          'Nenhum WhatsApp conectado. Conecte pelo menos um número na aba Canais ou use a postagem em 1 Toque no Status.',
      });
      return;
    }

    const statusCaption = caption || renderStatusCaption(offer);
    const results = await Promise.all(
      targets.map((acc) => sendWhatsAppStatus(acc, offer, statusCaption))
    );

    if (results.some((r) => r.success)) {
      dbStore.incrementUsage(user.id);
    }

    res.json({ results, caption: statusCaption });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Erro ao postar no Status',
    });
  }
});

/** GET /api/automation/schedule */
automationRouter.get('/schedule', (req: AuthenticatedRequest, res) => {
  const posts = dbStore.listScheduledPosts(req.user!.id);
  res.json({ posts });
});

/** POST /api/automation/schedule */
automationRouter.post('/schedule', (req: AuthenticatedRequest, res) => {
  const user = dbStore.getUserById(req.user!.id);
  if (!user) {
    res.status(404).json({ error: 'Usuário não encontrado.' });
    return;
  }

  const { offer, caption, channelIds, scheduledFor, niche } = req.body as {
    offer?: Offer;
    caption?: string;
    channelIds?: string[];
    scheduledFor?: string;
    niche?: NicheId;
  };

  if (!offer || !scheduledFor) {
    res.status(400).json({ error: 'Informe "offer" e "scheduledFor" (ISO 8601).' });
    return;
  }

  const pendingCount = dbStore
    .listScheduledPosts(user.id)
    .filter((p) => p.status === 'pending').length;

  if (user.plan === 'free' && pendingCount >= 3) {
    res.status(402).json({
      error:
        'Plano Grátis permite até 3 postagens na fila. Assine o PRO para agendamentos ilimitados 24h na nuvem.',
      code: 'PRO_REQUIRED',
    });
    return;
  }

  const template =
    DEFAULT_TEMPLATES.find((t) => t.id === user.activeTemplateId) || DEFAULT_TEMPLATES[0];
  const userChannels = dbStore.listChannels(user.id);

  let selectedChannels = channelIds || [];
  if (selectedChannels.length === 0) {
    const active = userChannels.filter((c) => c.enabled);
    selectedChannels = (
      niche && niche !== 'todos'
        ? active.filter((c) => c.niche === niche || c.niche === 'todos')
        : active
    ).map((c) => c.id);
  }

  const post = dbStore.addScheduledPost(user.id, {
    offer,
    caption: caption || renderOfferCaption(offer, template),
    channelIds: selectedChannels,
    scheduledFor,
  });

  res.status(201).json(post);
});

/**
 * POST /api/automation/schedule/batch-by-niche
 * Piloto Automático por Nicho — EXCLUSIVO PARA ASSINANTES PRO!
 */
automationRouter.post('/schedule/batch-by-niche', async (req: AuthenticatedRequest, res) => {
  try {
    const user = dbStore.getUserById(req.user!.id);
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }

    if (user.plan !== 'pro') {
      res.status(402).json({
        error:
          'O Piloto Automático por Nicho é exclusivo para assinantes PRO 👑. Faça upgrade para agendar ofertas no piloto automático 24h!',
        code: 'PRO_REQUIRED',
      });
      return;
    }

    const {
      niche,
      intervalMinutes = 30,
      minDiscount = 0,
      count = 5,
      channelIds,
    } = req.body as {
      niche?: NicheId;
      intervalMinutes?: number;
      minDiscount?: number;
      count?: number;
      channelIds?: string[];
    };

    const chosenNiche: NicheId = niche || 'todos';
    const userChannels = dbStore.listChannels(user.id).filter((c) => c.enabled);
    const matchingChannels =
      channelIds && channelIds.length > 0
        ? userChannels.filter((c) => channelIds.includes(c.id))
        : chosenNiche === 'todos'
        ? userChannels
        : userChannels.filter((c) => c.niche === chosenNiche || c.niche === 'todos');

    if (matchingChannels.length === 0) {
      res.status(400).json({
        error:
          'Nenhum grupo ou Status ativo encontrado para este nicho. Cadastre um destino na aba Canais primeiro.',
      });
      return;
    }

    const safeMinDiscount = Math.max(0, Math.min(95, Number(minDiscount) || 0));
    const safeInterval = Math.max(1, Math.min(1440, Number(intervalMinutes) || 30));
    const maxToSchedule = Math.max(1, Math.min(Number(count) || 5, 20));

    const searchRes = await searchOffersAcrossStores(
      '',
      ['shopee', 'mercadolivre', 'amazon', 'aliexpress'],
      user.credentials,
      chosenNiche
    );

    const filteredOffers = searchRes.offers.filter(
      (o) => o.discountPercent >= safeMinDiscount
    );

    if (filteredOffers.length === 0) {
      res.status(400).json({
        error: `Nenhuma oferta encontrada neste nicho com desconto mínimo de ${safeMinDiscount}% OFF. Tente baixar um pouco o desconto mínimo.`,
      });
      return;
    }

    const offers = filteredOffers.slice(0, maxToSchedule);
    const template =
      DEFAULT_TEMPLATES.find((t) => t.id === user.activeTemplateId) || DEFAULT_TEMPLATES[0];

    const created = offers.map((offer, idx) => {
      const scheduledFor = new Date(
        Date.now() + (idx + 1) * safeInterval * 60 * 1000
      ).toISOString();
      return dbStore.addScheduledPost(user.id, {
        offer,
        caption: renderOfferCaption(offer, template),
        channelIds: matchingChannels.map((c) => c.id),
        scheduledFor,
      });
    });

    res.status(201).json({
      scheduledCount: created.length,
      channelsCount: matchingChannels.length,
      intervalMinutes: safeInterval,
      minDiscount: safeMinDiscount,
      posts: created,
    });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Erro ao agendar lote por nicho',
    });
  }
});

/** DELETE /api/automation/schedule/:id */
automationRouter.delete('/schedule/:id', (req: AuthenticatedRequest, res) => {
  dbStore.deleteScheduledPost(req.user!.id, String(req.params.id));
  res.json({ ok: true });
});

/** POST /api/automation/schedule/run-now */
automationRouter.post('/schedule/run-now', async (_req, res) => {
  const count = await processDueScheduledPosts();
  res.json({ processed: count });
});
