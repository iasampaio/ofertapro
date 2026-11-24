import { NicheId, Offer, StoreCoupon } from '../types';

const LOMADEE_NICHE_KEYWORDS: Record<NicheId, string[]> = {
  todos: ['smart tv', 'air fryer', 'fone bluetooth', 'notebook', 'geladeira', 'perfume'],
  eletronicos: ['fone bluetooth', 'smartwatch', 'caixa de som', 'celular'],
  casa_cozinha: ['air fryer', 'aspirador', 'cafeteira', 'panela'],
  moda_beleza: ['perfume', 'secador cabelo', 'tenis', 'skincare'],
  maternidade_bebe: ['fralda', 'carrinho bebe', 'mamadeira'],
  fitness_saude: ['whey protein', 'bicicleta', 'esteira', 'halter'],
  pets: ['racao cachorro', 'racao gato', 'arranhador'],
  gamer_info: ['teclado gamer', 'monitor gamer', 'headset gamer', 'mouse gamer'],
  ferramentas_auto: ['furadeira', 'parafusadeira', 'lavadora alta pressao'],
};

interface LomadeeOfferItem {
  id: string;
  name: string;
  price: number;
  priceFrom?: number;
  discount?: number;
  thumbnail?: string;
  link: string;
  store?: { id?: number; name?: string };
  category?: { name?: string };
}

interface LomadeeCouponItem {
  id: number | string;
  description: string;
  code: string;
  discount?: number;
  store?: { name?: string };
  vigency?: string;
  link: string;
}

export async function searchLomadeeOffers(
  keyword: string,
  niche: NicheId = 'todos',
  limit = 12
): Promise<{ offers: Offer[]; mode: 'live' | 'demo'; error?: string }> {
  const appToken = (process.env.LOMADEE_APP_TOKEN || '').trim();
  const sourceId = (process.env.LOMADEE_SOURCE_ID || '').trim();

  if (!appToken || !sourceId) {
    return {
      offers: [],
      mode: 'demo',
      error: 'Configure LOMADEE_APP_TOKEN e LOMADEE_SOURCE_ID no Render.',
    };
  }

  try {
    const pool = LOMADEE_NICHE_KEYWORDS[niche] || LOMADEE_NICHE_KEYWORDS.todos;
    const searchTerm =
      keyword.trim() || pool[Math.floor(Math.random() * pool.length)];
    const randomPage = Math.floor(Math.random() * 3) + 1;

    const url = `https://api.lomadee.com/v3/${encodeURIComponent(
      appToken
    )}/offer/_search?sourceId=${encodeURIComponent(sourceId)}&keyword=${encodeURIComponent(
      searchTerm
    )}&size=${limit}&page=${randomPage}`;

    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) {
      throw new Error(`Lomadee HTTP ${res.status}`);
    }

    const json = (await res.json()) as {
      offers?: LomadeeOfferItem[];
      requestInfo?: { status?: string; message?: string };
    };

    const items = json.offers || [];
    if (items.length === 0) {
      // Tenta bestsellers se a busca por palavra-chave vier vazia
      const bestUrl = `https://api.lomadee.com/v3/${encodeURIComponent(
        appToken
      )}/offer/_bestsellers?sourceId=${encodeURIComponent(sourceId)}&size=${limit}&page=1`;
      const bestRes = await fetch(bestUrl, { headers: { Accept: 'application/json' } });
      if (bestRes.ok) {
        const bestJson = (await bestRes.json()) as { offers?: LomadeeOfferItem[] };
        items.push(...(bestJson.offers || []));
      }
    }

    if (items.length === 0) {
      return {
        offers: [],
        mode: 'demo',
        error: json.requestInfo?.message || 'Lomadee retornou 0 ofertas.',
      };
    }

    const offers: Offer[] = items
      .filter((o) => o.price > 0 && o.link)
      .map((o) => {
        const originalPrice =
          o.priceFrom && o.priceFrom > o.price ? o.priceFrom : undefined;
        const discountPercent =
          o.discount && o.discount > 0
            ? Math.round(o.discount)
            : originalPrice
            ? Math.round(((originalPrice - o.price) / originalPrice) * 100)
            : 0;

        return {
          id: `lom-${o.id}`,
          store: 'lomadee',
          title: o.name,
          price: o.price,
          originalPrice,
          discountPercent,
          commissionRate: 8,
          imageUrl: o.thumbnail || '',
          productUrl: o.link,
          affiliateUrl: o.link,
          shopName: o.store?.name || 'Lojas Parceiras',
          category: o.category?.name || o.store?.name || 'Lomadee',
          niche,
        };
      });

    return { offers, mode: 'live' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro na Lomadee API';
    console.warn('[LomadeeAPI] Erro:', msg);
    return { offers: [], mode: 'demo', error: msg };
  }
}

export async function fetchLomadeeCoupons(): Promise<StoreCoupon[]> {
  const appToken = (process.env.LOMADEE_APP_TOKEN || '').trim();
  const sourceId = (process.env.LOMADEE_SOURCE_ID || '').trim();
  if (!appToken || !sourceId) return [];

  try {
    const url = `https://api.lomadee.com/v3/${encodeURIComponent(
      appToken
    )}/coupon/_all?sourceId=${encodeURIComponent(sourceId)}`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return [];

    const json = (await res.json()) as { coupons?: LomadeeCouponItem[] };
    return (json.coupons || []).slice(0, 15).map((c) => ({
      id: `lom-cp-${c.id}`,
      store: 'lomadee',
      code: c.code || 'OFERTA',
      title: `${c.store?.name || 'Loja Parceira'} — ${c.description}`,
      description: c.description,
      expiresLabel: c.vigency || 'Válido por tempo limitado',
      affiliateUrl: c.link,
    }));
  } catch {
    return [];
  }
}
