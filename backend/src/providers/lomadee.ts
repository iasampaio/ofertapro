import { NicheId, Offer, StoreCoupon } from '../types';

const LOMADEE_BASE_URL = 'https://api.lomadee.com.br';

const LOMADEE_NICHE_KEYWORDS: Record<NicheId, string[]> = {
  todos: ['smart tv', 'air fryer', 'fone bluetooth', 'notebook', 'perfume', 'celular'],
  eletronicos: ['fone bluetooth', 'smartwatch', 'caixa de som', 'celular'],
  casa_cozinha: ['air fryer', 'aspirador', 'cafeteira', 'panela'],
  moda_beleza: ['perfume', 'secador', 'tenis', 'skincare'],
  maternidade_bebe: ['fralda', 'carrinho bebe', 'mamadeira'],
  fitness_saude: ['whey', 'bicicleta', 'esteira', 'halter'],
  pets: ['racao', 'pet', 'cachorro', 'gato'],
  gamer_info: ['teclado gamer', 'monitor gamer', 'headset gamer', 'mouse gamer'],
  ferramentas_auto: ['furadeira', 'parafusadeira', 'ferramentas'],
};

function getApiKey(): string {
  return (process.env.LOMADEE_APP_TOKEN || process.env.LOMADEE_API_KEY || '').trim();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractArray(json: any): any[] {
  if (Array.isArray(json)) return json;
  if (Array.isArray(json?.data)) return json.data;
  if (Array.isArray(json?.products)) return json.products;
  if (Array.isArray(json?.items)) return json.items;
  if (Array.isArray(json?.coupons)) return json.coupons;
  if (Array.isArray(json?.data?.items)) return json.data.items;
  if (Array.isArray(json?.data?.products)) return json.data.products;
  return [];
}

export async function searchLomadeeOffers(
  keyword: string,
  niche: NicheId = 'todos',
  limit = 12
): Promise<{ offers: Offer[]; mode: 'live' | 'demo'; error?: string }> {
  const apiKey = getApiKey();

  if (!apiKey) {
    return {
      offers: [],
      mode: 'demo',
      error: 'Configure LOMADEE_APP_TOKEN (chave lmd_prod_...) no Render.',
    };
  }

  try {
    const pool = LOMADEE_NICHE_KEYWORDS[niche] || LOMADEE_NICHE_KEYWORDS.todos;
    const searchTerm =
      keyword.trim() || pool[Math.floor(Math.random() * pool.length)];
    const randomPage = Math.floor(Math.random() * 3) + 1;

    const params = new URLSearchParams({
      page: String(randomPage),
      limit: String(limit),
    });
    if (searchTerm) {
      params.set('search', searchTerm);
    }

    const url = `${LOMADEE_BASE_URL}/affiliate/products?${params.toString()}`;
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'x-api-key': apiKey,
      },
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`Lomadee HTTP ${res.status}: ${errBody.slice(0, 160)}`);
    }

    let json = await res.json();
    let items = extractArray(json);

    // Se a página aleatória ou busca vier vazia, tenta página 1 sem filtro
    if (items.length === 0) {
      const fallbackUrl = `${LOMADEE_BASE_URL}/affiliate/products?page=1&limit=${limit}`;
      const fbRes = await fetch(fallbackUrl, {
        headers: { Accept: 'application/json', 'x-api-key': apiKey },
      });
      if (fbRes.ok) {
        json = await fbRes.json();
        items = extractArray(json);
      }
    }

    if (items.length === 0) {
      return {
        offers: [],
        mode: 'demo',
        error: 'Lomadee retornou 0 produtos. Verifique se você já se afiliou às marcas/campanhas no painel Lomadee.',
      };
    }

    const offers: Offer[] = items
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((item: any, idx: number): Offer | null => {
        const firstOpt = Array.isArray(item.options) ? item.options[0] : null;
        const firstOffer = Array.isArray(item.offers) ? item.offers[0] : null;
        const firstPricing = Array.isArray(firstOpt?.pricing)
          ? firstOpt.pricing[0]
          : firstOpt?.pricing || item.pricing || firstOffer?.pricing;

        const title = String(
          item.name || item.title || firstOpt?.name || firstOffer?.name || ''
        ).trim();

        const rawPrice =
          item.price ??
          item.salePrice ??
          firstPricing?.price ??
          firstPricing?.salePrice ??
          firstOpt?.price ??
          firstOffer?.price ??
          item.value ??
          0;
        const price = Number(
          typeof rawPrice === 'string' ? rawPrice.replace(',', '.') : rawPrice
        );

        const rawOrig =
          item.originalPrice ??
          item.priceFrom ??
          item.listPrice ??
          firstPricing?.listPrice ??
          firstPricing?.originalPrice ??
          firstPricing?.priceFrom ??
          firstOpt?.listPrice ??
          firstOffer?.priceFrom ??
          0;
        const orig = Number(
          typeof rawOrig === 'string' ? rawOrig.replace(',', '.') : rawOrig
        );

        const link = String(
          item.affiliateUrl ||
            item.shortUrl ||
            item.redirectUrl ||
            item.destinationUrl ||
            item.productUrl ||
            item.link ||
            item.url ||
            firstOpt?.affiliateUrl ||
            firstOpt?.link ||
            firstOpt?.url ||
            firstOffer?.link ||
            firstOffer?.url ||
            ''
        ).trim();

        const imageUrl = String(
          item.image ||
            item.imageUrl ||
            item.thumbnail ||
            firstOpt?.image ||
            firstOpt?.thumbnail ||
            (Array.isArray(item.images) ? item.images[0]?.url || item.images[0] : '') ||
            (Array.isArray(firstOpt?.images)
              ? firstOpt.images[0]?.url || firstOpt.images[0]
              : '') ||
            ''
        ).trim();

        if (!title || !link || !Number.isFinite(price) || price <= 0) return null;

        const originalPrice = orig > price ? orig : undefined;
        const discountPercent =
          Number(item.discount || item.discountPercent || firstPricing?.discount || 0) ||
          (originalPrice ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0);

        const brandName = String(
          item.brand?.name ||
            item.store?.name ||
            item.advertiser?.name ||
            item.organization?.name ||
            'Lojas BR'
        );

        return {
          id: `lom-${item.id || idx}-${Date.now().toString().slice(-4)}`,
          store: 'lomadee',
          title,
          price,
          originalPrice,
          discountPercent,
          commissionRate: Number(item.commissionRate || 8),
          imageUrl,
          productUrl: link,
          affiliateUrl: link,
          shopName: brandName,
          category: String(item.category?.name || brandName),
          niche,
        };
      })
      .filter((o): o is Offer => o !== null);

    if (offers.length === 0) {
      const sampleKeys = items[0] ? Object.keys(items[0]).join(', ') : 'none';
      const sampleJson = items[0] ? JSON.stringify(items[0]).slice(0, 350) : '';
      return {
        offers: [],
        mode: 'demo',
        error: `Lomadee chaves=[${sampleKeys}] sample=${sampleJson}`,
      };
    }

    return { offers, mode: 'live' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro na Lomadee API';
    console.warn('[LomadeeAPI] Erro:', msg);
    return { offers: [], mode: 'demo', error: msg };
  }
}

export async function fetchLomadeeCoupons(): Promise<StoreCoupon[]> {
  const apiKey = getApiKey();
  if (!apiKey) return [];

  try {
    const url = `${LOMADEE_BASE_URL}/affiliate/coupons?page=1&limit=15`;
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'x-api-key': apiKey,
      },
    });
    if (!res.ok) return [];

    const json = await res.json();
    const items = extractArray(json);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return items.slice(0, 15).map((c: any, idx: number) => ({
      id: `lom-cp-${c.id || idx}`,
      store: 'lomadee' as const,
      code: String(c.code || c.couponCode || 'OFERTA'),
      title: String(
        c.title || `${c.brand?.name || c.store?.name || 'Loja Parceira'} — ${c.description || 'Cupom Ativo'}`
      ),
      description: String(c.description || c.rules || 'Desconto especial da campanha.'),
      expiresLabel: String(c.expiresAt || c.vigency || c.endDate || 'Tempo limitado'),
      affiliateUrl: String(c.affiliateUrl || c.link || c.url || 'https://www.lomadee.com'),
    }));
  } catch {
    return [];
  }
}
