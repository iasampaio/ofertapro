import { Router } from 'express';
import { dbStore, DEFAULT_TEMPLATES } from '../db';
import { AuthenticatedRequest, requireAuth } from '../middleware/authMiddleware';
import { searchOffersAcrossStores } from '../providers';
import { STORE_COUPONS } from '../providers/otherStores';
import { generateShopeeShortLink } from '../providers/shopee';
import { renderOfferCaption } from '../services/copyGenerator';
import { NICHES, NicheId, Offer, StoreId } from '../types';

export const offersRouter = Router();

/** GET /api/offers/niches — Lista todos os nichos disponíveis */
offersRouter.get('/niches', (_req, res) => {
  res.json({ niches: NICHES });
});

/** GET /api/offers/debug-stores — Diagnóstico seguro para ver se Shopee e Mercado Livre estão ao vivo */
offersRouter.get('/debug-stores', async (_req, res) => {
  const { searchShopeeOffers } = await import('../providers/shopee');
  const { searchOtherStoreOffers } = await import('../providers/otherStores');

  const creds = {
    shopeeAppId: process.env.SHOPEE_APP_ID || '',
    shopeeAppSecret: process.env.SHOPEE_APP_SECRET || '',
    mercadoLivreTag: process.env.MERCADOLIVRE_AFFILIATE_TAG || '',
    amazonTag: process.env.AMAZON_ASSOCIATE_TAG || '',
    aliexpressKey: process.env.ALIEXPRESS_APP_KEY || '',
  };

  const [shopeeRes, mlRes] = await Promise.all([
    searchShopeeOffers('', creds, 'todos', 3),
    searchOtherStoreOffers('mercadolivre', '', creds, 'todos'),
  ]);

  res.json({
    shopee: {
      hasEnvKeys: Boolean(creds.shopeeAppId && creds.shopeeAppSecret),
      mode: shopeeRes.mode,
      error: shopeeRes.error || null,
      sampleLink: shopeeRes.offers[0]?.affiliateUrl || null,
    },
    mercadolivre: {
      mode: mlRes.mode,
      sampleLink: mlRes.offers[0]?.affiliateUrl || null,
    },
  });
});

/**
 * GET /api/offers/coupons — Lista cupons ativos na vitrine (NÃO automático: usuário escolhe se posta!)
 */
offersRouter.get('/coupons', (req, res) => {
  const storeParam = String(req.query.store || 'all');
  const coupons =
    storeParam && storeParam !== 'all'
      ? STORE_COUPONS.filter((c) => c.store === storeParam)
      : STORE_COUPONS;
  res.json({ coupons });
});

/** GET /api/offers/showcase — Vitrine pública (comissão do dono do app) */
offersRouter.get('/showcase', async (req, res) => {
  try {
    const keyword = String(req.query.q || '');
    const niche = (String(req.query.niche || 'todos') as NicheId) || 'todos';
    const storeParam = String(req.query.stores || '');
    const stores = storeParam
      ? (storeParam.split(',').filter(Boolean) as StoreId[])
      : (['shopee', 'mercadolivre', 'amazon', 'aliexpress'] as StoreId[]);

    const ownerCredentials = {
      shopeeAppId: process.env.SHOPEE_APP_ID || '',
      shopeeAppSecret: process.env.SHOPEE_APP_SECRET || '',
      mercadoLivreTag: process.env.MERCADOLIVRE_AFFILIATE_TAG || '',
      amazonTag: process.env.AMAZON_ASSOCIATE_TAG || '',
      aliexpressKey: process.env.ALIEXPRESS_APP_KEY || '',
    };

    const result = await searchOffersAcrossStores(keyword, stores, ownerCredentials, niche);
    res.json({
      offers: result.offers,
      liveStores: result.liveStores,
      total: result.offers.length,
    });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Erro ao buscar vitrine de ofertas',
    });
  }
});

/** GET /api/offers/search — Busca na Área do Afiliado com filtro por Nicho */
offersRouter.get('/search', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const user = dbStore.getUserById(req.user!.id);
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }

    const keyword = String(req.query.q || '');
    const niche = (String(req.query.niche || 'todos') as NicheId) || 'todos';
    const storeParam = String(req.query.stores || '');
    const stores = storeParam
      ? (storeParam.split(',').filter(Boolean) as StoreId[])
      : (['shopee', 'mercadolivre', 'amazon', 'aliexpress'] as StoreId[]);

    const result = await searchOffersAcrossStores(keyword, stores, user.credentials, niche);
    res.json({
      offers: result.offers,
      liveStores: result.liveStores,
      total: result.offers.length,
    });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Erro ao buscar produtos',
    });
  }
});

/** POST /api/offers/shortlink */
offersRouter.post('/shortlink', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const user = dbStore.getUserById(req.user!.id);
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }

    const { url, subIds } = req.body as { url?: string; subIds?: string[] };
    if (!url) {
      res.status(400).json({ error: 'Informe o campo "url".' });
      return;
    }

    const result = await generateShopeeShortLink(
      url,
      Array.isArray(subIds) ? subIds : ['ofertapro'],
      user.credentials
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Erro ao gerar link curto',
    });
  }
});

/** POST /api/offers/copy */
offersRouter.post('/copy', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = dbStore.getUserById(req.user!.id);
  const { offer, templateId } = req.body as { offer?: Offer; templateId?: string };
  if (!offer) {
    res.status(400).json({ error: 'Informe o objeto "offer".' });
    return;
  }

  const chosenId = templateId || user?.activeTemplateId || 'urgencia';
  const template =
    DEFAULT_TEMPLATES.find((t) => t.id === chosenId) || DEFAULT_TEMPLATES[0];

  const caption = renderOfferCaption(offer, template);
  res.json({ caption, templateId: template.id });
});
