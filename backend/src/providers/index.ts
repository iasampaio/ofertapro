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
      if (store === 'shopee') {
        const res = await searchShopeeOffers(keyword, credentials, niche);
        return { store, ...res };
      }
      const res = await searchOtherStoreOffers(store, keyword, credentials, niche);
      return { store, ...res };
    })
  );

  const offers = results
    .flatMap((r) => r.offers)
    .sort((a, b) => b.discountPercent - a.discountPercent);

  const liveStores = results.filter((r) => r.mode === 'live').map((r) => r.store);

  return { offers, liveStores };
}
