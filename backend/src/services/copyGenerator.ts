import { CopyTemplate, Offer, StoreId } from '../types';

const STORE_LABELS: Record<StoreId, string> = {
  shopee: 'SHOPEE',
  mercadolivre: 'MERCADO LIVRE',
  amazon: 'AMAZON',
  aliexpress: 'ALIEXPRESS',
};

function formatBRL(value: number): string {
  return value.toFixed(2).replace('.', ',');
}

export function renderOfferCaption(offer: Offer, template: CopyTemplate): string {
  const originalPrice = offer.originalPrice
    ? formatBRL(offer.originalPrice)
    : formatBRL(offer.price * 1.35);

  const couponLine = offer.coupon ? `🎟️ Cupom: *${offer.coupon}*` : '';

  return template.body
    .replace(/\{\{STORE\}\}/g, STORE_LABELS[offer.store] || offer.store.toUpperCase())
    .replace(/\{\{TITLE\}\}/g, offer.title)
    .replace(/\{\{PRICE\}\}/g, formatBRL(offer.price))
    .replace(/\{\{ORIGINAL_PRICE\}\}/g, originalPrice)
    .replace(/\{\{DISCOUNT\}\}/g, String(offer.discountPercent))
    .replace(/\{\{LINK\}\}/g, offer.affiliateUrl)
    .replace(/\{\{COUPON_LINE\}\}/g, couponLine)
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Legenda curta e direta otimizada para Status do WhatsApp */
export function renderStatusCaption(offer: Offer): string {
  const store = STORE_LABELS[offer.store] || offer.store.toUpperCase();
  const coupon = offer.coupon ? `\n🎟️ Cupom: ${offer.coupon}` : '';
  return [
    `🔥 OFERTA ${store} (-${offer.discountPercent}% OFF)`,
    offer.title,
    `✅ Apenas R$ ${formatBRL(offer.price)}${coupon}`,
    `👉 Link: ${offer.affiliateUrl}`,
  ].join('\n');
}
