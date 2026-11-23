import crypto from 'crypto';
import { AffiliateCredentials, NICHES, NicheId, Offer } from '../types';

const SHOPEE_GRAPHQL_URL =
  process.env.SHOPEE_API_URL || 'https://open-api.affiliate.shopee.com.br/graphql';

function buildShopeeAuthHeader(appId: string, appSecret: string, payload: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const baseString = `${appId}${timestamp}${payload}${appSecret}`;
  const signature = crypto.createHash('sha256').update(baseString).digest('hex');
  return `SHA256 Credential=${appId}, Timestamp=${timestamp}, Signature=${signature}`;
}

async function callShopeeGraphQL<T>(
  appId: string,
  appSecret: string,
  query: string,
  variables: Record<string, unknown> = {}
): Promise<T> {
  const payload = JSON.stringify({ query, variables });
  const authorization = buildShopeeAuthHeader(appId, appSecret, payload);

  const response = await fetch(SHOPEE_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authorization,
    },
    body: payload,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Shopee API HTTP ${response.status}: ${text}`);
  }

  const json = (await response.json()) as { data?: T; errors?: Array<{ message: string }> };
  if (json.errors && json.errors.length > 0) {
    throw new Error(`Shopee GraphQL Error: ${json.errors[0].message}`);
  }

  if (!json.data) {
    throw new Error('Shopee API retornou resposta vazia.');
  }

  return json.data;
}

const DEMO_SHOPEE_OFFERS: Offer[] = [
  {
    id: 'shp-1001',
    store: 'shopee',
    title: 'Fone de Ouvido Bluetooth TWS Pro com Cancelamento de Ruído e Estojo LED',
    price: 49.9,
    originalPrice: 129.9,
    discountPercent: 62,
    commissionRate: 12,
    imageUrl: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&q=80',
    productUrl: 'https://shopee.com.br/product/demo/1001',
    affiliateUrl: 'https://shope.ee/demo-fone-tws',
    rating: 4.9,
    sales: 4320,
    shopName: 'TechBrasil Oficial',
    category: 'Eletrônicos',
    niche: 'eletronicos',
    coupon: 'SHOPEE10',
  },
  {
    id: 'shp-1002',
    store: 'shopee',
    title: 'Garrafa Térmica Inox 1.2L com Canudo Parede Dupla Conserva 24h',
    price: 58.9,
    originalPrice: 119.0,
    discountPercent: 51,
    commissionRate: 10,
    imageUrl: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600&q=80',
    productUrl: 'https://shopee.com.br/product/demo/1002',
    affiliateUrl: 'https://shope.ee/demo-garrafa-termica',
    rating: 4.8,
    sales: 2890,
    shopName: 'Casa & Estilo BR',
    category: 'Casa e Cozinha',
    niche: 'casa_cozinha',
    coupon: 'FRETEGRATIS',
  },
  {
    id: 'shp-1003',
    store: 'shopee',
    title: 'Smartwatch Relógio Inteligente Tela AMOLED Faz Ligações + 2 Pulseiras',
    price: 89.9,
    originalPrice: 219.9,
    discountPercent: 59,
    commissionRate: 14,
    imageUrl: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=600&q=80',
    productUrl: 'https://shopee.com.br/product/demo/1003',
    affiliateUrl: 'https://shope.ee/demo-smartwatch',
    rating: 4.9,
    sales: 5120,
    shopName: 'SmartGear Store',
    category: 'Eletrônicos',
    niche: 'eletronicos',
  },
  {
    id: 'shp-1004',
    store: 'shopee',
    title: 'Mini Processador Elétrico Recarregável USB 250ml 3 Lâminas Inox',
    price: 24.9,
    originalPrice: 59.9,
    discountPercent: 58,
    commissionRate: 11,
    imageUrl: 'https://images.unsplash.com/photo-1585515320310-259814833e62?w=600&q=80',
    productUrl: 'https://shopee.com.br/product/demo/1004',
    affiliateUrl: 'https://shope.ee/demo-processador',
    rating: 4.7,
    sales: 9410,
    shopName: 'Utilidades Prime',
    category: 'Casa e Cozinha',
    niche: 'casa_cozinha',
    coupon: 'CASA5',
  },
  {
    id: 'shp-1005',
    store: 'shopee',
    title: 'Kit Sérum Vitamina C + Ácido Hialurônico + Protetor Facial FPS 60',
    price: 44.9,
    originalPrice: 109.9,
    discountPercent: 59,
    commissionRate: 15,
    imageUrl: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&q=80',
    productUrl: 'https://shopee.com.br/product/demo/1005',
    affiliateUrl: 'https://shope.ee/demo-kit-skincare',
    rating: 4.9,
    sales: 6230,
    shopName: 'Beleza Pura Oficial',
    category: 'Moda e Beleza',
    niche: 'moda_beleza',
    coupon: 'BELEZA10',
  },
  {
    id: 'shp-1006',
    store: 'shopee',
    title: 'Tapete Higiênico Lavável + Fonte Bebedouro Automática Silenciosa para Pets',
    price: 69.9,
    originalPrice: 149.9,
    discountPercent: 53,
    commissionRate: 12,
    imageUrl: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=600&q=80',
    productUrl: 'https://shopee.com.br/product/demo/1006',
    affiliateUrl: 'https://shope.ee/demo-kit-pet',
    rating: 4.8,
    sales: 3180,
    shopName: 'PetShop Brasil',
    category: 'Pets',
    niche: 'pets',
  },
  {
    id: 'shp-1007',
    store: 'shopee',
    title: 'Kit 5 Faixas Elásticas Mini Band + Corda de Pular Rolamento Profissional',
    price: 32.9,
    originalPrice: 79.9,
    discountPercent: 59,
    commissionRate: 13,
    imageUrl: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600&q=80',
    productUrl: 'https://shopee.com.br/product/demo/1007',
    affiliateUrl: 'https://shope.ee/demo-kit-fitness',
    rating: 4.9,
    sales: 4820,
    shopName: 'FitPro Esportes',
    category: 'Fitness e Saúde',
    niche: 'fitness_saude',
  },
  {
    id: 'shp-1008',
    store: 'shopee',
    title: 'Mochila Maternidade Impermeável Térmica Multifuncional com Trocador USB',
    price: 79.9,
    originalPrice: 169.9,
    discountPercent: 53,
    commissionRate: 12,
    imageUrl: 'https://images.unsplash.com/photo-1519689680058-324335c77eba?w=600&q=80',
    productUrl: 'https://shopee.com.br/product/demo/1008',
    affiliateUrl: 'https://shope.ee/demo-mochila-bebe',
    rating: 4.9,
    sales: 2710,
    shopName: 'Mundo Baby BR',
    category: 'Bebê e Maternidade',
    niche: 'maternidade_bebe',
  },
  {
    id: 'shp-1009',
    store: 'shopee',
    title: 'Parafusadeira e Furadeira sem Fio 21V com 2 Baterias + Maleta 24 Peças',
    price: 139.9,
    originalPrice: 279.9,
    discountPercent: 50,
    commissionRate: 10,
    imageUrl: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600&q=80',
    productUrl: 'https://shopee.com.br/product/demo/1009',
    affiliateUrl: 'https://shope.ee/demo-parafusadeira',
    rating: 4.8,
    sales: 3940,
    shopName: 'Casa das Ferramentas',
    category: 'Ferramentas e Auto',
    niche: 'ferramentas_auto',
  },
];

interface ShopeeProductNode {
  itemId: string;
  productName: string;
  priceMin: string;
  priceMax: string;
  priceDiscountRate: number;
  commissionRate: string;
  imageUrl: string;
  productLink: string;
  offerLink: string;
  ratingStar: string;
  sales: number;
  shopName: string;
}

export async function searchShopeeOffers(
  keyword: string,
  credentials: AffiliateCredentials,
  niche: NicheId = 'todos',
  limit = 12
): Promise<{ offers: Offer[]; mode: 'live' | 'demo' }> {
  const appId = credentials.shopeeAppId || process.env.SHOPEE_APP_ID;
  const appSecret = credentials.shopeeAppSecret || process.env.SHOPEE_APP_SECRET;

  const nicheInfo = NICHES.find((n) => n.id === niche);
  const effectiveKeyword =
    keyword.trim() || (niche !== 'todos' ? nicheInfo?.searchKeyword || '' : '');

  if (!appId || !appSecret) {
    let list = DEMO_SHOPEE_OFFERS;
    if (niche !== 'todos') {
      list = list.filter((o) => o.niche === niche);
    }
    const q = keyword.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (o) =>
          o.title.toLowerCase().includes(q) || o.category.toLowerCase().includes(q)
      );
    }
    return {
      offers: list.length > 0 ? list : DEMO_SHOPEE_OFFERS.slice(0, 4),
      mode: 'demo',
    };
  }

  const query = `
    query SearchOffers($keyword: String, $limit: Int) {
      productOfferV2(keyword: $keyword, listType: 2, sortType: 2, limit: $limit) {
        nodes {
          itemId
          productName
          priceMin
          priceMax
          priceDiscountRate
          commissionRate
          imageUrl
          productLink
          offerLink
          ratingStar
          sales
          shopName
        }
      }
    }
  `;

  const data = await callShopeeGraphQL<{
    productOfferV2: { nodes: ShopeeProductNode[] };
  }>(appId, appSecret, query, {
    keyword: effectiveKeyword || undefined,
    limit,
  });

  const nodes = data.productOfferV2?.nodes || [];
  const offers: Offer[] = nodes.map((n) => {
    const price = parseFloat(n.priceMin) || 0;
    const discount = n.priceDiscountRate || 0;
    const originalPrice =
      discount > 0 && discount < 100
        ? Number((price / (1 - discount / 100)).toFixed(2))
        : undefined;

    return {
      id: `shp-${n.itemId}`,
      store: 'shopee',
      title: n.productName,
      price,
      originalPrice,
      discountPercent: discount,
      commissionRate: parseFloat(n.commissionRate) || 0,
      imageUrl: n.imageUrl,
      productUrl: n.productLink,
      affiliateUrl: n.offerLink || n.productLink,
      rating: parseFloat(n.ratingStar) || undefined,
      sales: n.sales,
      shopName: n.shopName,
      category: nicheInfo?.label || 'Shopee Ofertas',
      niche,
    };
  });

  return { offers, mode: 'live' };
}

export async function generateShopeeShortLink(
  originUrl: string,
  subIds: string[],
  credentials: AffiliateCredentials
): Promise<{ shortLink: string; mode: 'live' | 'demo' }> {
  const appId = credentials.shopeeAppId || process.env.SHOPEE_APP_ID;
  const appSecret = credentials.shopeeAppSecret || process.env.SHOPEE_APP_SECRET;

  if (!appId || !appSecret) {
    const hash = crypto.createHash('md5').update(originUrl).digest('hex').slice(0, 7);
    return {
      shortLink: `https://shope.ee/${hash}`,
      mode: 'demo',
    };
  }

  const mutation = `
    mutation GenerateShortLink($originUrl: String!, $subIds: [String!]) {
      generateShortLink(input: { originUrl: $originUrl, subIds: $subIds }) {
        shortLink
      }
    }
  `;

  const data = await callShopeeGraphQL<{
    generateShortLink: { shortLink: string };
  }>(appId, appSecret, mutation, { originUrl, subIds });

  return {
    shortLink: data.generateShortLink.shortLink,
    mode: 'live',
  };
}
