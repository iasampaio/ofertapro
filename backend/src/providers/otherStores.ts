import { AffiliateCredentials, NicheId, Offer, StoreCoupon, StoreId } from '../types';

const DEMO_OTHER_OFFERS: Offer[] = [
  // MERCADO LIVRE
  {
    id: 'ml-2001',
    store: 'mercadolivre',
    title: 'Fritadeira Elétrica Air Fryer 4L Digital Antiaderente 1500W',
    price: 239.9,
    originalPrice: 389.9,
    discountPercent: 38,
    commissionRate: 8,
    imageUrl: 'https://images.unsplash.com/photo-1626074353765-517a681e40be?w=600&q=80',
    productUrl: 'https://www.mercadolivre.com.br/demo-airfryer',
    affiliateUrl: 'https://mercadolivre.com/sec/demo-airfryer',
    rating: 4.9,
    sales: 1850,
    shopName: 'Loja Oficial Eletro',
    category: 'Casa e Cozinha',
    niche: 'casa_cozinha',
    coupon: 'MELI20',
  },
  {
    id: 'ml-2002',
    store: 'mercadolivre',
    title: 'Aspirador de Pó Vertical 2 em 1 Portátil 1200W Filtro HEPA',
    price: 149.9,
    originalPrice: 249.9,
    discountPercent: 40,
    commissionRate: 8,
    imageUrl: 'https://images.unsplash.com/photo-1558317374-067fb5f30001?w=600&q=80',
    productUrl: 'https://www.mercadolivre.com.br/demo-aspirador',
    affiliateUrl: 'https://mercadolivre.com/sec/demo-aspirador',
    rating: 4.8,
    sales: 3240,
    shopName: 'Casa Fácil Oficial',
    category: 'Casa e Cozinha',
    niche: 'casa_cozinha',
  },
  {
    id: 'ml-2003',
    store: 'mercadolivre',
    title: 'Furadeira de Impacto 650W com Maleta e Kit 30 Brocas',
    price: 189.0,
    originalPrice: 319.0,
    discountPercent: 41,
    commissionRate: 9,
    imageUrl: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600&q=80',
    productUrl: 'https://www.mercadolivre.com.br/demo-furadeira',
    affiliateUrl: 'https://mercadolivre.com/sec/demo-furadeira',
    rating: 4.9,
    sales: 2190,
    shopName: 'Ferramentas BR',
    category: 'Ferramentas e Auto',
    niche: 'ferramentas_auto',
  },

  // AMAZON
  {
    id: 'amz-3001',
    store: 'amazon',
    title: 'Echo Dot 5ª Geração com Alexa — Som ainda mais vibrante',
    price: 299.0,
    originalPrice: 429.0,
    discountPercent: 30,
    commissionRate: 9,
    imageUrl: 'https://images.unsplash.com/photo-1543512214-318c7553f230?w=600&q=80',
    productUrl: 'https://www.amazon.com.br/dp/B09B8V1LZ3',
    affiliateUrl: 'https://amzn.to/demo-echodot',
    rating: 4.9,
    sales: 12400,
    shopName: 'Amazon Brasil',
    category: 'Eletrônicos',
    niche: 'eletronicos',
  },
  {
    id: 'amz-3002',
    store: 'amazon',
    title: 'Fire TV Stick HD com Controle Remoto por Voz com Alexa',
    price: 219.0,
    originalPrice: 349.0,
    discountPercent: 37,
    commissionRate: 9,
    imageUrl: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=600&q=80',
    productUrl: 'https://www.amazon.com.br/dp/B0CJM1GNFQ',
    affiliateUrl: 'https://amzn.to/demo-firetv',
    rating: 4.9,
    sales: 18900,
    shopName: 'Amazon Brasil',
    category: 'Eletrônicos',
    niche: 'eletronicos',
  },
  {
    id: 'amz-3003',
    store: 'amazon',
    title: 'Whey Protein Concentrado 900g + Creatina Monohidratada 300g',
    price: 129.9,
    originalPrice: 199.9,
    discountPercent: 35,
    commissionRate: 10,
    imageUrl: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=600&q=80',
    productUrl: 'https://www.amazon.com.br/dp/demo-whey',
    affiliateUrl: 'https://amzn.to/demo-whey',
    rating: 4.8,
    sales: 7600,
    shopName: 'NutriPrime Amazon',
    category: 'Fitness e Saúde',
    niche: 'fitness_saude',
  },

  // ALIEXPRESS
  {
    id: 'ali-4001',
    store: 'aliexpress',
    title: 'Teclado Mecânico Compacto 60% RGB Switch Red USB-C (Estoque no Brasil)',
    price: 118.5,
    originalPrice: 245.0,
    discountPercent: 52,
    commissionRate: 7,
    imageUrl: 'https://images.unsplash.com/photo-1595225476474-87563907a212?w=600&q=80',
    productUrl: 'https://pt.aliexpress.com/item/demo-teclado.html',
    affiliateUrl: 'https://s.click.aliexpress.com/e/demo-teclado',
    rating: 4.8,
    sales: 3100,
    shopName: 'KeyZone Official',
    category: 'Gamer & Info',
    niche: 'gamer_info',
    coupon: 'BR15',
  },
  {
    id: 'ali-4002',
    store: 'aliexpress',
    title: 'Mouse Gamer Sem Fio 2.4GHz Ultraleve 26000 DPI Sensor PAW3395',
    price: 134.9,
    originalPrice: 289.0,
    discountPercent: 53,
    commissionRate: 8,
    imageUrl: 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=600&q=80',
    productUrl: 'https://pt.aliexpress.com/item/demo-mouse.html',
    affiliateUrl: 'https://s.click.aliexpress.com/e/demo-mouse',
    rating: 4.9,
    sales: 4520,
    shopName: 'ProGamer Direct',
    category: 'Gamer & Info',
    niche: 'gamer_info',
    coupon: 'GAMER20',
  },
  {
    id: 'ali-4003',
    store: 'aliexpress',
    title: 'Projetor Portátil 4K Android Wi-Fi 6 Bluetooth Espelhamento Celular',
    price: 199.0,
    originalPrice: 449.0,
    discountPercent: 56,
    commissionRate: 9,
    imageUrl: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=600&q=80',
    productUrl: 'https://pt.aliexpress.com/item/demo-projetor.html',
    affiliateUrl: 'https://s.click.aliexpress.com/e/demo-projetor',
    rating: 4.8,
    sales: 8900,
    shopName: 'MagCubic Official',
    category: 'Eletrônicos',
    niche: 'eletronicos',
    coupon: 'BR30',
  },
];

export const STORE_COUPONS: StoreCoupon[] = [
  {
    id: 'cp-shp-1',
    store: 'shopee',
    code: 'SHOPEE20OFF',
    title: 'R$ 20 OFF em compras na Shopee',
    description: 'Válido para produtos selecionados com envio nacional.',
    minSpend: 'Mínimo R$ 99',
    expiresLabel: 'Válido hoje',
    affiliateUrl: 'https://shope.ee/cupons-shopee',
  },
  {
    id: 'cp-shp-2',
    store: 'shopee',
    code: 'FRETEGRATISAPP',
    title: 'Frete Grátis Extra no App Shopee',
    description: 'Cupom de frete grátis sem valor mínimo em lojas indicadas.',
    minSpend: 'Acima de R$ 19',
    expiresLabel: 'Acaba em 24h',
    affiliateUrl: 'https://shope.ee/frete-gratis',
  },
  {
    id: 'cp-ml-1',
    store: 'mercadolivre',
    code: 'MELI30',
    title: 'R$ 30 OFF no Mercado Livre',
    description: 'Desconto direto no carrinho em ofertas selecionadas.',
    minSpend: 'Mínimo R$ 199',
    expiresLabel: 'Limitado',
    affiliateUrl: 'https://mercadolivre.com/sec/cupons-meli',
  },
  {
    id: 'cp-amz-1',
    store: 'amazon',
    code: 'PRIME15',
    title: '15% OFF em Casa e Eletrônicos na Amazon',
    description: 'Cupom especial para membros Prime em itens elegíveis.',
    minSpend: 'Mínimo R$ 80',
    expiresLabel: 'Por tempo limitado',
    affiliateUrl: 'https://amzn.to/cupons-amazon',
  },
  {
    id: 'cp-ali-1',
    store: 'aliexpress',
    code: 'BRASIL25',
    title: 'R$ 25 OFF no AliExpress (Estoque Brasil)',
    description: 'Válido para produtos Choice e estoque nacional sem taxa extra.',
    minSpend: 'Mínimo R$ 150',
    expiresLabel: 'Válido esta semana',
    affiliateUrl: 'https://s.click.aliexpress.com/e/cupons-br',
  },
];

const ML_NICHE_QUERIES: Record<NicheId, string> = {
  todos: 'oferta do dia',
  eletronicos: 'fone bluetooth smartwatch caixa de som',
  casa_cozinha: 'air fryer aspirador panela cozinha',
  moda_beleza: 'perfume skincare secador cabelo',
  maternidade_bebe: 'fralda mochila maternidade bebe',
  fitness_saude: 'whey protein creatina academia',
  pets: 'racao cama bebedouro pet cachorro',
  gamer_info: 'teclado mecanico mouse gamer headset',
  ferramentas_auto: 'furadeira parafusadeira maleta ferramentas',
};

interface MLSearchItem {
  id: string;
  title: string;
  price: number;
  original_price?: number | null;
  thumbnail: string;
  permalink: string;
  seller?: { nickname?: string };
  sold_quantity?: number;
}

let cachedMlToken: { token: string; expiresAt: number } | null = null;

async function getMercadoLivreAccessToken(): Promise<string | null> {
  if (process.env.MERCADOLIVRE_ACCESS_TOKEN) {
    return process.env.MERCADOLIVRE_ACCESS_TOKEN.trim();
  }

  const clientId = (process.env.MERCADOLIVRE_CLIENT_ID || '').trim();
  const clientSecret = (process.env.MERCADOLIVRE_CLIENT_SECRET || '').trim();
  if (!clientId || !clientSecret) return null;

  if (cachedMlToken && cachedMlToken.expiresAt > Date.now()) {
    return cachedMlToken.token;
  }

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch('https://api.mercadolibre.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    throw new Error(`Mercado Livre OAuth HTTP ${res.status}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in?: number };
  cachedMlToken = {
    token: data.access_token,
    expiresAt: Date.now() + ((data.expires_in || 21600) - 300) * 1000,
  };
  return cachedMlToken.token;
}

async function fetchMercadoLivreLive(
  keyword: string,
  niche: NicheId,
  affiliateTag: string
): Promise<Offer[]> {
  const q = keyword.trim() || ML_NICHE_QUERIES[niche] || 'oferta';
  const offset = Math.floor(Math.random() * 20);
  const url = `https://api.mercadolibre.com/sites/MLB/search?q=${encodeURIComponent(
    q
  )}&offset=${offset}&limit=12`;

  const headers: Record<string, string> = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
    Accept: 'application/json',
  };

  const token = await getMercadoLivreAccessToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, { headers });

  if (!res.ok) {
    throw new Error(
      `Mercado Livre HTTP ${res.status}${
        !token ? ' (configure MERCADOLIVRE_CLIENT_ID e MERCADOLIVRE_CLIENT_SECRET no Render)' : ''
      }`
    );
  }

  const json = (await res.json()) as { results?: MLSearchItem[] };
  const items = json.results || [];

  return items
    .filter((item) => item.price > 0)
    .map((item) => {
      const original =
        item.original_price && item.original_price > item.price
          ? item.original_price
          : undefined;
      const discount = original
        ? Math.round(((original - item.price) / original) * 100)
        : 0;
      const highResImg = (item.thumbnail || '')
        .replace(/^http:\/\//, 'https://')
        .replace(/-I\.jpg$/, '-O.jpg');

      const affiliateUrl = affiliateTag
        ? `${item.permalink}#matt_word=${encodeURIComponent(affiliateTag)}`
        : item.permalink;

      return {
        id: `ml-${item.id}`,
        store: 'mercadolivre' as const,
        title: item.title,
        price: item.price,
        originalPrice: original,
        discountPercent: discount,
        commissionRate: 8,
        imageUrl: highResImg,
        productUrl: item.permalink,
        affiliateUrl,
        sales: item.sold_quantity,
        shopName: item.seller?.nickname || 'Mercado Livre',
        category: 'Mercado Livre',
        niche,
      };
    });
}

export async function searchOtherStoreOffers(
  store: Exclude<StoreId, 'shopee'>,
  keyword: string,
  credentials: AffiliateCredentials,
  niche: NicheId = 'todos'
): Promise<{ offers: Offer[]; mode: 'live' | 'demo'; error?: string }> {
  let mlError: string | undefined;
  // Busca AO VIVO automática no Mercado Livre Brasil (quando credenciais OAuth estiverem no Render)
  if (store === 'mercadolivre') {
    try {
      const liveOffers = await fetchMercadoLivreLive(
        keyword,
        niche,
        credentials.mercadoLivreTag || process.env.MERCADOLIVRE_AFFILIATE_TAG || ''
      );
      if (liveOffers.length > 0) {
        return { offers: liveOffers, mode: 'live' };
      }
    } catch (err) {
      mlError = err instanceof Error ? err.message : 'Erro Mercado Livre';
      console.warn('[MercadoLivreAPI] Sem ofertas ao vivo:', mlError);
    }
  }

  // Sem produtos fictícios! Retorna lista vazia até a API oficial da loja estar configurada.
  return {
    offers: [],
    mode: 'demo',
    error: mlError,
  };
}
