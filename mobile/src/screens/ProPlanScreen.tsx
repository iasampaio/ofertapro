import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { api } from '../services/api';
import { purchaseProSubscription } from '../services/monetization';
import { useTheme } from '../theme';

interface ProPlanScreenProps {
  currentPlan: 'free' | 'pro';
  onPlanChanged: () => void;
}

const PRO_BENEFITS = [
  '⚡ Piloto Automático por Nicho 24h na nuvem (exclusivo PRO)',
  '📱 Conecte vários números de WhatsApp ao mesmo tempo',
  '🟢 Postagem automática no Status do WhatsApp e grupos ilimitados',
  '🛍️ Busca multi-loja (Shopee, Mercado Livre, Amazon e AliExpress)',
  '✨ Templates de copy de alta conversão personalizáveis',
  '🚫 Zero anúncios em todo o aplicativo',
];

export function ProPlanScreen({ currentPlan, onPlanChanged }: ProPlanScreenProps) {
  const { colors } = useTheme();
  const [selectedCycle, setSelectedCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [loading, setLoading] = useState(false);

  async function handleSubscribe() {
    setLoading(true);
    try {
      const res = await purchaseProSubscription(selectedCycle);
      if (res.success) {
        Alert.alert('Bem-vindo ao PRO 👑', res.message);
        onPlanChanged();
      } else {
        Alert.alert('Aviso', res.message);
      }
    } catch (err: any) {
      Alert.alert('Erro', err?.message || 'Não foi possível ativar o plano.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDowngradeDemo() {
    await api.activatePro('free');
    onPlanChanged();
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <View style={[styles.hero, { backgroundColor: colors.proBg }]}>
        <Text style={[styles.heroBadge, { color: colors.proGold }]}>AFILIADO PRO</Text>
        <Text style={styles.heroTitle}>Automatize suas vendas no piloto automático</Text>
        <Text style={styles.heroSub}>
          Ideal para quem gerencia grupos por nicho e quer escalar comissões todos os dias.
        </Text>
      </View>

      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          O que você desbloqueia:
        </Text>
        {PRO_BENEFITS.map((item) => (
          <Text key={item} style={[styles.benefit, { color: colors.text }]}>
            {item}
          </Text>
        ))}
      </View>

      <View style={styles.plansRow}>
        <TouchableOpacity
          style={[
            styles.planBox,
            {
              backgroundColor:
                selectedCycle === 'monthly' ? colors.primarySoft : colors.card,
              borderColor:
                selectedCycle === 'monthly' ? colors.primary : colors.border,
            },
          ]}
          onPress={() => setSelectedCycle('monthly')}
        >
          <Text style={[styles.planName, { color: colors.text }]}>Mensal</Text>
          <Text style={[styles.planPrice, { color: colors.primary }]}>R$ 29,90</Text>
          <Text style={[styles.planDesc, { color: colors.textMuted }]}>por mês</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.planBox,
            {
              backgroundColor:
                selectedCycle === 'yearly' ? colors.primarySoft : colors.card,
              borderColor:
                selectedCycle === 'yearly' ? colors.primary : colors.border,
            },
          ]}
          onPress={() => setSelectedCycle('yearly')}
        >
          <View style={[styles.saveTag, { backgroundColor: colors.save }]}>
            <Text style={styles.saveTagText}>ECONOMIZE 30%</Text>
          </View>
          <Text style={[styles.planName, { color: colors.text }]}>Anual</Text>
          <Text style={[styles.planPrice, { color: colors.primary }]}>R$ 249,90</Text>
          <Text style={[styles.planDesc, { color: colors.textMuted }]}>
            equivale a R$ 20,82/mês
          </Text>
        </TouchableOpacity>
      </View>

      {currentPlan === 'pro' ? (
        <View style={[styles.activeBox, { backgroundColor: colors.successSoft }]}>
          <Text style={[styles.activeTitle, { color: colors.success }]}>
            ✅ Seu Plano PRO já está ativo!
          </Text>
          <TouchableOpacity onPress={handleDowngradeDemo}>
            <Text style={[styles.downgradeText, { color: colors.textMuted }]}>
              Voltar para modo Grátis (teste)
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.ctaBtn, { backgroundColor: colors.save }]}
          onPress={handleSubscribe}
          disabled={loading}
        >
          <Text style={styles.ctaBtnText}>
            {loading
              ? 'Processando...'
              : selectedCycle === 'yearly'
              ? 'Assinar PRO Anual — R$ 249,90'
              : 'Assinar PRO Mensal — R$ 29,90'}
          </Text>
        </TouchableOpacity>
      )}

      <Text style={[styles.legal, { color: colors.textMuted }]}>
        Assinatura processada com segurança pela Google Play Store. Cancele quando quiser nas
        configurações da sua conta Google.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  hero: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 14,
  },
  heroBadge: {
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 1,
    marginBottom: 6,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 6,
  },
  heroSub: {
    color: '#E9D5FF',
    fontSize: 13,
  },
  card: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 10,
  },
  benefit: {
    fontSize: 13,
    marginBottom: 8,
  },
  plansRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  planBox: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    borderWidth: 2,
    alignItems: 'center',
  },
  saveTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 6,
  },
  saveTagText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  planName: {
    fontSize: 14,
    fontWeight: '700',
  },
  planPrice: {
    fontSize: 20,
    fontWeight: '800',
    marginVertical: 4,
  },
  planDesc: {
    fontSize: 11,
  },
  ctaBtn: {
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  ctaBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  activeBox: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  activeTitle: {
    fontWeight: '800',
    fontSize: 15,
    marginBottom: 8,
  },
  downgradeText: {
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  legal: {
    fontSize: 11,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
});
