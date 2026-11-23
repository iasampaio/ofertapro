import { AffiliateCredentials, NicheId, Offer, StoreId } from '../types';
import { searchShopeeOffers } from './shopee';
import { searchOtherStoreOffers } from './otherStores';

export async function searchOffersAcrossStores(
  keyword: string,
  stores: StoreId[],
  credentials: AffiliateCredentials,
  niche: NicheId = 'todos'
): Promise<{ offers: Offer[]; liveStores: StoreId[] }> {
  const selected: StoreId[] =
    stores.length > 0 ? stores : ['shopee', 'mercadolivre', 'amazon', 'aliexpress'];

  const results = await Promise.all(
    selected.map(async (store) => {
      try {
        if (store === 'shopee') {
          const res = await searchShopeeOffers(keyword, credentials, niche);
          return { store, offers: res.offers, mode: res.mode };
        }
        const res = await searchOtherStoreOffers(store, keyword, credentials, niche);
        return { store, offers: res.offers, mode: res.mode };
      } catch (err) {
        console.warn(`[Providers] Falha na loja ${store}:`, err);
        return { store, offers: [] as Offer[], mode: 'demo' as const };
      }
    })
  );

  const offers = results
    .flatMap((r) => r.offers)
    .sort((a, b) => b.discountPercent - a.discountPercent);

  const liveStores = results.filter((r) => r.mode === 'live').map((r) => r.store);

  return { offers, liveStores };
}
