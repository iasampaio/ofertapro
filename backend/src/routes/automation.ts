import { Router } from 'express';
import { dbStore, DEFAULT_TEMPLATES } from '../db';
import { AuthenticatedRequest, requireAuth } from '../middleware/authMiddleware';
import { searchOffersAcrossStores } from '../providers';
import { renderOfferCaption, renderStatusCaption } from '../services/copyGenerator';
import { dispatchToChannels, sendWhatsAppStatus } from '../services/dispatcher';
import {
  isWithinBrazilBusinessHours,
  processDueScheduledPosts,
  runContinuousAutopilotForUser,
} from '../services/scheduler';
import {
  isBaileysConnected,
  listBaileysGroups,
  requestBaileysPairingCode,
} from '../services/whatsappBaileys';
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
    autopilotEnabled: user.autopilotEnabled,
    autopilotConfig: user.autopilotConfig,
    autopilotLastRun: user.autopilotLastRun,
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

/** PATCH /api/automation/autopilot/toggle — Ativa ou desativa o Piloto Automático (08h às 22h) */
automationRouter.patch('/autopilot/toggle', (req: AuthenticatedRequest, res) => {
  const user = dbStore.getUserById(req.user!.id);
  if (!user) {
    res.status(404).json({ error: 'Usuário não encontrado.' });
    return;
  }

  const enabled = Boolean(req.body.enabled);
  if (enabled && user.plan !== 'pro') {
    res.status(402).json({
      error:
        'O Piloto Automático (08h às 22h) é exclusivo para assinantes PRO 👑.',
      code: 'PRO_REQUIRED',
    });
    return;
  }

  dbStore.setAutopilotEnabled(user.id, enabled);
  res.json({ ok: true, autopilotEnabled: enabled });
});

/** POST /api/automation/autopilot/test-now — Dispara 1 rodada do Piloto Automático AGORA (ignora janela 08h–22h para teste) */
automationRouter.post('/autopilot/test-now', async (req: AuthenticatedRequest, res) => {
  try {
    const user = dbStore.getUserById(req.user!.id);
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }
    if (user.plan !== 'pro') {
      res.status(402).json({
        error: 'Recurso exclusivo PRO 👑.',
        code: 'PRO_REQUIRED',
      });
      return;
    }
    if (!user.autopilotConfig) {
      res.status(400).json({
        error: 'Clique primeiro em "Configurar Piloto Automático" e salve suas preferências.',
      });
      return;
    }

    const ok = await runContinuousAutopilotForUser(user);
    const latest = dbStore.listScheduledPosts(user.id).slice(-1)[0];

    res.json({
      success: ok,
      offerTitle: latest?.offer?.title || null,
      message: ok
        ? `Oferta "${latest?.offer?.title || ''}" postada agora pelo Piloto Automático! Confira seu WhatsApp.`
        : latest?.errorMessage ||
          'Não foi possível disparar. Verifique se seu WhatsApp está conectado na aba Canais.',
    });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Erro ao testar Piloto Automático',
    });
  }
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

    const account = dbStore.addWhatsAppAccount(user.id, {
      label: (label || `WhatsApp ${normalizedPhone.slice(-4)}`).trim(),
      phoneNumber: normalizedPhone,
      provider: evoUrl && evoKey ? 'evolution_webhook' : 'baileys_native',
      apiUrl: evoUrl,
      apiToken: evoKey,
      instanceName,
    });

    let pairingCode = '';
    let mode: 'live' | 'demo' = 'live';

    if (evoUrl && evoKey) {
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
      }
    } else {
      // Motor nativo Baileys embutido (100% grátis — gera código REAL do WhatsApp!)
      const paired = await requestBaileysPairingCode(account.id, normalizedPhone);
      pairingCode = paired.pairingCode;
      mode = 'live';
    }

    if (!pairingCode) {
      throw new Error('WhatsApp não retornou o código de pareamento. Tente novamente em alguns segundos.');
    }

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

/** GET /api/automation/whatsapp-accounts/:id/groups — Lista grupos reais do WhatsApp conectado */
automationRouter.get('/whatsapp-accounts/:id/groups', async (req: AuthenticatedRequest, res) => {
  try {
    const accountId = String(req.params.id);
    const accounts = dbStore.listWhatsAppAccounts(req.user!.id);
    const acc = accounts.find((a) => a.id === accountId);
    const groups = await listBaileysGroups(accountId, acc?.phoneNumber || '');
    res.json({
      connected: isBaileysConnected(accountId),
      groups,
    });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Erro ao listar grupos do WhatsApp',
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
      niches,
      intervalMinutes = 30,
      minDiscount = 0,
      count = 5,
      channelIds,
      targetMode = 'groups',
      whatsappAccountIds = [],
    } = req.body as {
      niche?: NicheId;
      niches?: NicheId[];
      intervalMinutes?: number;
      minDiscount?: number;
      count?: number;
      channelIds?: string[];
      targetMode?: 'groups' | 'status' | 'both';
      whatsappAccountIds?: string[];
    };

    const chosenNiches: NicheId[] =
      Array.isArray(niches) && niches.length > 0
        ? niches
        : [niche || 'todos'];
    const includesAll = chosenNiches.includes('todos');

    let userChannels = dbStore.listChannels(user.id).filter((c) => c.enabled);
    const matchingChannels: typeof userChannels = [];

    // 1. Inclui Grupos quando targetMode for 'groups' ou 'both'
    if (targetMode === 'groups' || targetMode === 'both') {
      const groupChannels = userChannels.filter((c) => c.type !== 'whatsapp_status');
      const selectedGroups =
        channelIds && channelIds.length > 0
          ? groupChannels.filter((c) => channelIds.includes(c.id))
          : includesAll
          ? groupChannels
          : groupChannels.filter(
              (c) => chosenNiches.includes(c.niche) || c.niche === 'todos'
            );
      matchingChannels.push(...selectedGroups);
    }

    // 2. Inclui Status dos WhatsApps selecionados quando targetMode for 'status' ou 'both'
    if (targetMode === 'status' || targetMode === 'both') {
      const userAccounts = dbStore.listWhatsAppAccounts(user.id);
      const chosenAccounts =
        whatsappAccountIds.length > 0
          ? userAccounts.filter((a) => whatsappAccountIds.includes(a.id))
          : userAccounts;

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
        matchingChannels.push(statusCh);
      }
    }

    if (matchingChannels.length === 0) {
      res.status(400).json({
        error:
          targetMode === 'status'
            ? 'Nenhum WhatsApp conectado encontrado para postar no Status. Conecte seu WhatsApp na aba Canais.'
            : 'Nenhum grupo ou Status ativo encontrado para os nichos escolhidos. Cadastre um destino na aba Canais primeiro.',
      });
      return;
    }

    const safeMinDiscount = Math.max(0, Math.min(95, Number(minDiscount) || 5));
    const safeInterval = Math.max(1, Math.min(1440, Number(intervalMinutes) || 30));

    // Salva a configuração CONTÍNUA do Piloto Automático (roda todos os dias de 08h às 22h sem parar!)
    dbStore.saveAutopilotConfig(
      user.id,
      {
        niches: chosenNiches,
        intervalMinutes: safeInterval,
        minDiscount: safeMinDiscount,
        targetMode,
        whatsappAccountIds,
      },
      true
    );

    // Se já estiver dentro da janela 08h–22h (Brasília), já dispara a 1ª oferta imediatamente!
    const refreshedUser = dbStore.getUserById(user.id)!;
    let postedFirstNow = false;
    if (isWithinBrazilBusinessHours()) {
      postedFirstNow = await runContinuousAutopilotForUser(refreshedUser).catch(() => false);
    }

    res.status(201).json({
      continuous: true,
      postedFirstNow,
      withinBusinessHours: isWithinBrazilBusinessHours(),
      scheduledCount: 1,
      channelsCount: matchingChannels.length,
      nichesCount: chosenNiches.length,
      intervalMinutes: safeInterval,
      minDiscount: safeMinDiscount,
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
  const count = await processDueScheduledPosts(true);
  res.json({ processed: count });
});
