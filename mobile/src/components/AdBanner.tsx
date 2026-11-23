import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme';

interface AdBannerProps {
  isPro: boolean;
}

/**
 * Exibe Banner do Google AdMob apenas para usuários do Plano Grátis.
 * Assinantes PRO têm experiência 100% livre de anúncios.
 *
 * No build .aab de produção (após `npx expo install react-native-google-mobile-ads`),
 * basta descomentar o BannerAd nativo abaixo com seu Unit ID em `monetization.ts`.
 */
export function AdBanner({ isPro }: AdBannerProps) {
  const { colors } = useTheme();
  if (isPro) return null;

  return (
    <View
      style={[
        styles.adSlot,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.adText, { color: colors.textMuted }]}>
        📢 Banner Google AdMob (removido automaticamente no Plano PRO)
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  adSlot: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  adText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
