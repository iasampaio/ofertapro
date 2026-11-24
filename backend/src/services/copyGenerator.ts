import { CopyTemplate, NicheId, Offer, StoreId } from '../types';

const STORE_LABELS: Record<StoreId, string> = {
  shopee: 'SHOPEE',
  lomadee: 'LOJA OFICIAL',
  mercadolivre: 'MERCADO LIVRE',
  amazon: 'AMAZON',
  aliexpress: 'ALIEXPRESS',
};

const GENERAL_HOOKS = [
  '🚨 *ALERTA DE PREÇO BAIXO NA {{STORE}}!*',
  '😱 *OLHA ESSE DESCONTO QUE ACABOU DE CAIR NA {{STORE}}!*',
  '🔥 *ACHADINHO VIRAL COM {{DISCOUNT}}% OFF!*',
  '⚡ *CORRE! ESSA OFERTA NA {{STORE}} NÃO VAI DURAR!*',
  '💥 *BAIXOU MUITO! OPORTUNIDADE DO DIA NA {{STORE}}!*',
  '👀 *VOCÊ NÃO VAI ACREDITAR NESSE PREÇO NA {{STORE}}!*',
  '🎯 *PREÇO DE BLACK FRIDAY FORA DE ÉPOCA NA {{STORE}}!*',
  '💸 *ECONOMIZE AGORA! DESCONTÃO LIBERADO NA {{STORE}}!*',
  '🏆 *UM DOS MAIS VENDIDOS EM PROMOÇÃO NA {{STORE}}!*',
  '⏰ *RELÂMPAGO! CAIU {{DISCOUNT}}% AGORA NA {{STORE}}!*',
  '🤩 *SEGREDO DE ACHADINHO: OLHA QUANTO TÁ NA {{STORE}}!*',
  '📣 *AVISA TODO MUNDO! PREÇO DESPENCOU NA {{STORE}}!*',
];

const NICHE_HOOKS: Partial<Record<NicheId, string[]>> = {
  casa_cozinha: [
    '🏠 *SUA CASA MERECE ESSE ACHADINHO DA {{STORE}}!*',
    '🍳 *QUEM AMA COZINHA VAI PIRAR NESSE PREÇO NA {{STORE}}!*',
    '✨ *PRATICIDADE NO DIA A DIA COM {{DISCOUNT}}% OFF!*',
  ],
  eletronicos: [
    '🎧 *TECH EM PROMOÇÃO! PREÇO CAIU MUITO NA {{STORE}}!*',
    '📱 *GADGET DESEJADO COM {{DISCOUNT}}% DE DESCONTO!*',
  ],
  moda_beleza: [
    '💄 *ACHADINHO DE BELEZA QUE TODO MUNDO TÁ USANDO!*',
    '✨ *SE CUIDE PAGANDO BEM MENOS NA {{STORE}}!*',
  ],
  pets: [
    '🐾 *SEU PET VAI AMAR ESSE ACHADINHO NA {{STORE}}!*',
    '🐶 *MIMO PRO SEU PET COM {{DISCOUNT}}% OFF!*',
  ],
  fitness_saude: [
    '💪 *FOCO NO TREINO PAGANDO METADE NA {{STORE}}!*',
    '🏋️ *OFERTA FITNESS IMPERDÍVEL DE HOJE!*',
  ],
  gamer_info: [
    '🎮 *UPGRADE NO SETUP COM {{DISCOUNT}}% OFF NA {{STORE}}!*',
    '🖥️ *ACHADINHO GAMER QUE SUMIU DO ESTOQUE E VOLTOU BARATO!*',
  ],
  maternidade_bebe: [
    '🍼 *MAMÃES, OLHA ESSA ECONOMIA NA {{STORE}}!*',
    '👶 *ACHADINHO PERFEITO PRO BEBÊ COM {{DISCOUNT}}% OFF!*',
  ],
  ferramentas_auto: [
    '🛠️ *FERRAMENTA TOP COM PREÇO DE OPORTUNIDADE NA {{STORE}}!*',
    '🚗 *OFERTA PRA QUEM CURTE PRATICIDADE E ECONOMIA!*',
  ],
};

const CTA_LINES = [
  '🛒 *Garanta o seu antes que acabe:*',
  '👇 *Pegue sua oferta aqui:*',
  '⚡ *Clique para aproveitar agora:*',
  '🛍️ *Compre direto na loja oficial:*',
  '🔗 *Acesse o desconto por aqui:*',
  '🚀 *Corre no link antes que o preço suba:*',
];

const FOOTERS = [
  '⚠️ _Preço e estoque podem mudar a qualquer momento._',
  '⏳ _Oferta por tempo limitado — pode acabar hoje!_',
  '💡 _Dica: adicione no carrinho para garantir o valor!_',
  '🔥 _Salve o link antes que volte ao preço normal._',
];

function pickRandom<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

function formatBRL(value: number): string {
  return value.toFixed(2).replace('.', ',');
}

export function renderOfferCaption(offer: Offer, _template?: CopyTemplate): string {
  const storeName = STORE_LABELS[offer.store] || offer.store.toUpperCase();
  const originalPrice = offer.originalPrice
    ? formatBRL(offer.originalPrice)
    : formatBRL(offer.price * 1.35);

  const nichePool = offer.niche ? NICHE_HOOKS[offer.niche] || [] : [];
  const hookPool = [...GENERAL_HOOKS, ...nichePool];

  const rawHook = pickRandom(hookPool)
    .replace(/\{\{STORE\}\}/g, storeName)
    .replace(/\{\{DISCOUNT\}\}/g, String(offer.discountPercent));

  const cta = pickRandom(CTA_LINES);
  const footer = pickRandom(FOOTERS);
  const couponLine = offer.coupon ? `🎟️ Cupom: *${offer.coupon}*` : '';

  const lines = [
    rawHook,
    '',
    `📦 ${offer.title}`,
    '',
    offer.discountPercent > 0 ? `❌ De: ~R$ ${originalPrice}~` : '',
    `✅ *Por apenas: R$ ${formatBRL(offer.price)}*${
      offer.discountPercent > 0 ? ` (-${offer.discountPercent}% OFF!)` : ''
    }`,
    couponLine,
    '',
    cta,
    `👉 ${offer.affiliateUrl}`,
    '',
    footer,
  ];

  return lines.filter((l, idx) => l !== '' || lines[idx - 1] !== '').join('\n').trim();
}

/** Legenda curta, variada e direta otimizada para Status do WhatsApp */
export function renderStatusCaption(offer: Offer): string {
  const store = STORE_LABELS[offer.store] || offer.store.toUpperCase();
  const statusHooks = [
    `🔥 CAIU O PREÇO NA ${store}!`,
    `⚡ ACHADINHO DO DIA NA ${store}!`,
    `😱 OLHA ESSE PREÇO NA ${store}!`,
    `🚨 OFERTA RELÂMPAGO ${store}!`,
  ];
  const coupon = offer.coupon ? `\n🎟️ Cupom: ${offer.coupon}` : '';
  return [
    `${pickRandom(statusHooks)} (-${offer.discountPercent}% OFF)`,
    offer.title,
    `✅ Apenas R$ ${formatBRL(offer.price)}${coupon}`,
    `👉 ${offer.affiliateUrl}`,
  ].join('\n');
}
