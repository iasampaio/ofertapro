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

/** GET /api/offers/debug-stores — Diagnóstico seguro para ver se Shopee, Lomadee e Mercado Livre estão ao vivo */
offersRouter.get('/debug-stores', async (_req, res) => {
  const { searchShopeeOffers } = await import('../providers/shopee');
  const { searchLomadeeOffers } = await import('../providers/lomadee');
  const { searchOtherStoreOffers } = await import('../providers/otherStores');

  const creds = {
    shopeeAppId: process.env.SHOPEE_APP_ID || '',
    shopeeAppSecret: process.env.SHOPEE_APP_SECRET || '',
    mercadoLivreTag: process.env.MERCADOLIVRE_AFFILIATE_TAG || '',
    amazonTag: process.env.AMAZON_ASSOCIATE_TAG || '',
    aliexpressKey: process.env.ALIEXPRESS_APP_KEY || '',
  };

  const [shopeeRes, lomadeeRes, mlRes] = await Promise.all([
    searchShopeeOffers('', creds, 'todos', 3),
    searchLomadeeOffers('', 'todos', 3),
    searchOtherStoreOffers('mercadolivre', '', creds, 'todos'),
  ]);

  res.json({
    shopee: {
      hasEnvKeys: Boolean(creds.shopeeAppId && creds.shopeeAppSecret),
      mode: shopeeRes.mode,
      error: shopeeRes.error || null,
      sampleLink: shopeeRes.offers[0]?.affiliateUrl || null,
    },
    lomadee: {
      hasEnvKeys: Boolean(process.env.LOMADEE_APP_TOKEN && process.env.LOMADEE_SOURCE_ID),
      mode: lomadeeRes.mode,
      error: lomadeeRes.error || null,
      sampleLink: lomadeeRes.offers[0]?.affiliateUrl || null,
    },
    mercadolivre: {
      mode: mlRes.mode,
      error: mlRes.error || null,
      sampleLink: mlRes.offers[0]?.affiliateUrl || null,
    },
  });
});

/**
 * GET /api/offers/coupons — Lista cupons ativos na vitrine (Lomadee ao vivo + base)
 */
offersRouter.get('/coupons', async (req, res) => {
  const { fetchLomadeeCoupons } = await import('../providers/lomadee');
  const storeParam = String(req.query.store || 'all');
  const liveCoupons = await fetchLomadeeCoupons();
  const allCoupons = [...liveCoupons, ...STORE_COUPONS];
  const coupons =
    storeParam && storeParam !== 'all'
      ? allCoupons.filter((c) => c.store === storeParam)
      : allCoupons;
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
      : (['shopee', 'lomadee', 'mercadolivre', 'amazon', 'aliexpress'] as StoreId[]);

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
      : (['shopee', 'lomadee', 'mercadolivre', 'amazon', 'aliexpress'] as StoreId[]);

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

/**
 * POST /api/offers/parse-link
 * Recebe um link REAL (Mercado Livre, Amazon, Shopee ou AliExpress), extrai título/foto via OpenGraph
 * e devolve um objeto Offer + legenda chamativa pronta para disparar nos Grupos ou Status!
 */
offersRouter.post('/parse-link', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { url, title, price, originalPrice, coupon } = req.body as {
      url?: string;
      title?: string;
      price?: number;
      originalPrice?: number;
      coupon?: string;
    };

    if (!url || !url.startsWith('http')) {
      res.status(400).json({ error: 'Cole um link válido começando com https://' });
      return;
    }

    const lower = url.toLowerCase();
    let store: StoreId = 'shopee';
    if (lower.includes('mercadolivre') || lower.includes('mercadolibre') || lower.includes('meli')) {
      store = 'mercadolivre';
    } else if (lower.includes('amazon') || lower.includes('amzn')) {
      store = 'amazon';
    } else if (lower.includes('aliexpress') || lower.includes('s.click')) {
      store = 'aliexpress';
    }

    let extractedTitle = (title || '').trim();
    let extractedImage = '';

    // Tenta extrair título e foto reais da página (OpenGraph)
    try {
      const pageRes = await fetch(url, {
        redirect: 'follow',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
        },
      });
      if (pageRes.ok) {
        const html = await pageRes.text();
        if (!extractedTitle) {
          const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
          const tagTitle = html.match(/<title[^>]*>([^<]+)<\/title>/i);
          extractedTitle = (ogTitle?.[1] || tagTitle?.[1] || '').trim();
        }
        const ogImg = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
        if (ogImg?.[1]) {
          extractedImage = ogImg[1];
        }
      }
    } catch {
      // Continua mesmo se a loja bloquear fetch HTML
    }

    const parsedPrice = Number(price) || 0;
    const parsedOrig = Number(originalPrice) || undefined;
    const discountPercent =
      parsedOrig && parsedPrice > 0 && parsedOrig > parsedPrice
        ? Math.round(((parsedOrig - parsedPrice) / parsedOrig) * 100)
        : 0;

    const offer: Offer = {
      id: `manual-${Date.now()}`,
      store,
      title: extractedTitle || `Oferta Especial ${store.toUpperCase()}`,
      price: parsedPrice,
      originalPrice: parsedOrig,
      discountPercent,
      imageUrl: extractedImage,
      productUrl: url.trim(),
      affiliateUrl: url.trim(),
      category: store.toUpperCase(),
      niche: 'todos',
      coupon: coupon?.trim() || undefined,
    };

    const caption = renderOfferCaption(offer, DEFAULT_TEMPLATES[0]);
    res.json({ offer, caption });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Erro ao processar link real',
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
