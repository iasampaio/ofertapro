import { api } from './api';

/**
 * CONFIGURAÇÃO DE MONETIZAÇÃO — GOOGLE PLAY STORE
 *
 * 1. Crie os produtos de assinatura na Google Play Console:
 *    - ofertapro_pro_mensal (R$ 29,90/mês)
 *    - ofertapro_pro_anual  (R$ 249,90/ano)
 * 2. Crie conta gratuita no RevenueCat (https://www.revenuecat.com) e conecte sua Play Console.
 * 3. Cole abaixo sua Public Android API Key do RevenueCat e os IDs do AdMob.
 * 4. Antes de rodar `eas build --profile production`, instale:
 *    npx expo install react-native-purchases react-native-google-mobile-ads
 */
export const MONETIZATION_CONFIG = {
  revenueCatAndroidApiKey: 'COLE_SUA_CHAVE_REVENUECAT_AQUI',
  entitlementId: 'pro',
  products: {
    monthly: 'ofertapro_pro_mensal',
    yearly: 'ofertapro_pro_anual',
  },
  admob: {
    // ID de teste oficial do Google AdMob (troque pelo seu ID real antes de publicar)
    androidBannerUnitId: 'ca-app-pub-3940256099942544/6300978111',
  },
};

export async function purchaseProSubscription(
  cycle: 'monthly' | 'yearly'
): Promise<{ success: boolean; message: string }> {
  const hasRealKey =
    MONETIZATION_CONFIG.revenueCatAndroidApiKey &&
    !MONETIZATION_CONFIG.revenueCatAndroidApiKey.startsWith('COLE_');

  if (hasRealKey) {
    try {
      // Carrega o SDK nativo do RevenueCat apenas quando presente no build .aab
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Purchases = require('react-native-purchases').default;
      await Purchases.configure({
        apiKey: MONETIZATION_CONFIG.revenueCatAndroidApiKey,
      });

      const productId = MONETIZATION_CONFIG.products[cycle];
      const { customerInfo } = await Purchases.purchaseProduct(productId);
      const isPro = Boolean(
        customerInfo?.entitlements?.active?.[MONETIZATION_CONFIG.entitlementId]
      );

      if (isPro) {
        await api.activatePro('pro');
        return {
          success: true,
          message: 'Assinatura Google Play confirmada! Seu Plano PRO está ativo. 👑',
        };
      }
      return { success: false, message: 'Compra não confirmada pela Google Play.' };
    } catch (err: any) {
      if (err?.userCancelled) {
        return { success: false, message: 'Assinatura cancelada.' };
      }
      // Se estiver no Expo Go (sem módulo nativo), cai no modo teste abaixo
      if (!String(err?.message || '').includes('Cannot find module')) {
        throw err;
      }
    }
  }

  // Modo Teste / Expo Go: ativa diretamente no backend para você testar todas as funções PRO
  const res = await api.activatePro('pro');
  return {
    success: true,
    message: `${res.message} (Modo teste Expo Go — no build .aab usa Google Play Billing automaticamente.)`,
  };
}
