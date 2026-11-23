import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../theme';

interface ProBannerProps {
  plan: 'free' | 'pro';
  postsUsedToday: number;
  dailyLimit: number;
  onPressUpgrade: () => void;
}

export function ProBanner({
  plan,
  postsUsedToday,
  dailyLimit,
  onPressUpgrade,
}: ProBannerProps) {
  const { colors } = useTheme();

  if (plan === 'pro') {
    return (
      <View style={[styles.banner, { backgroundColor: colors.successSoft }]}>
        <Text style={[styles.title, { color: colors.success }]}>
          👑 Plano Afiliado PRO Ativo — Piloto Automático e WhatsApps Ilimitados
        </Text>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.banner, { backgroundColor: colors.proBg }]}
      onPress={onPressUpgrade}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>
          ⚡ Plano Grátis ({postsUsedToday}/{dailyLimit} disparos hoje)
        </Text>
        <Text style={styles.subtitle}>
          Desbloqueie múltiplos WhatsApps + Piloto Automático 24h na nuvem
        </Text>
      </View>
      <View style={[styles.cta, { backgroundColor: colors.proGold }]}>
        <Text style={styles.ctaText}>SER PRO</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  subtitle: {
    color: '#E9D5FF',
    fontSize: 11,
    marginTop: 2,
  },
  cta: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  ctaText: {
    color: '#0F172A',
    fontWeight: '800',
    fontSize: 11,
  },
});
