import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  RefreshControl,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { AdBanner } from '../components/AdBanner';
import { OfferCard } from '../components/OfferCard';
import { api, Offer, StoreCoupon, StoreId } from '../services/api';
import { shareOfferWithPhoto } from '../services/shareOffer';
import { STORE_META, useTheme } from '../theme';

const STORES: Array<{ id: StoreId | 'all'; label: string }> = [
  { id: 'all', label: 'Todas' },
  { id: 'shopee', label: 'Shopee' },
  { id: 'mercadolivre', label: 'Mercado Livre' },
  { id: 'amazon', label: 'Amazon' },
  { id: 'aliexpress', label: 'AliExpress' },
];

interface ShowcaseScreenProps {
  isPro: boolean;
}

export function ShowcaseScreen({ isPro }: ShowcaseScreenProps) {
  const { colors } = useTheme();
  const [section, setSection] = useState<'offers' | 'coupons'>('offers');
  const [offers, setOffers] = useState<Offer[]>([]);
  const [coupons, setCoupons] = useState<StoreCoupon[]>([]);
  const [query, setQuery] = useState('');
  const [selectedStore, setSelectedStore] = useState<StoreId | 'all'>('all');
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);
    try {
      if (section === 'offers') {
        const stores = selectedStore === 'all' ? [] : [selectedStore];
        const res = await api.getShowcase(query, stores);
        setOffers(res.offers);
      } else {
        const res = await api.getCoupons(selectedStore);
        setCoupons(res.coupons);
      }
    } catch {
      Alert.alert(
        'Servidor offline',
        'Inicie o backend (npm run dev na pasta backend) ou verifique o endereço na aba Canais.'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [selectedStore, section]);

  async function handleOpenOffer(offer: Offer) {
    const canOpen = await Linking.canOpenURL(offer.affiliateUrl);
    if (canOpen) {
      Linking.openURL(offer.affiliateUrl);
    } else {
      Alert.alert('Link da Oferta', offer.affiliateUrl);
    }
  }

  async function handleShareOffer(offer: Offer) {
    const storeLabel = STORE_META[offer.store].label;
    const text = `🔥 Achadinho na ${storeLabel}!\n${offer.title}\nPor R$ ${offer.price
      .toFixed(2)
      .replace('.', ',')} (-${offer.discountPercent}% OFF)\n👉 ${offer.affiliateUrl}`;
    await shareOfferWithPhoto(offer.imageUrl, text);
  }

  async function handleCopyAndUseCoupon(coupon: StoreCoupon) {
    await Clipboard.setStringAsync(coupon.code);
    Alert.alert(
      `Cupom ${coupon.code} copiado! 🎟️`,
      'Cole o código no carrinho da loja para aplicar o desconto.',
      [
        { text: 'Fechar', style: 'cancel' },
        {
          text: 'Abrir Loja',
          onPress: () => Linking.openURL(coupon.affiliateUrl),
        },
      ]
    );
  }

  async function handlePostCouponManually(coupon: StoreCoupon) {
    const storeLabel = STORE_META[coupon.store].label.toUpperCase();
    const text = [
      `🎟️ *CUPOM LIBERADO NA ${storeLabel}!*`,
      '',
      `🔥 *${coupon.title}*`,
      coupon.description,
      coupon.minSpend ? `📌 ${coupon.minSpend}` : '',
      '',
      `🏷️ Código: *${coupon.code}*`,
      `👉 Ative aqui: ${coupon.affiliateUrl}`,
      '',
      '⚠️ _Corra antes que o cupom esgote!_',
    ]
      .filter(Boolean)
      .join('\n');

    await Clipboard.setStringAsync(text);
    await Share.share({ message: text });
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Achadinhos do Dia
          </Text>
          <Text style={[styles.headerSub, { color: colors.textMuted, marginBottom: 0 }]}>
            Shopee, Mercado Livre, Amazon e AliExpress
          </Text>
        </View>
        <TouchableOpacity
          activeOpacity={0.75}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            backgroundColor: colors.primarySoft,
            paddingHorizontal: 10,
            paddingVertical: 7,
            borderRadius: 10,
          }}
          onPress={loadData}
        >
          <Ionicons name="refresh" size={15} color={colors.primaryDark} />
          <Text style={{ color: colors.primaryDark, fontWeight: '800', fontSize: 12 }}>
            Atualizar
          </Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.segmentRow, { backgroundColor: colors.primarySoft }]}>
        <TouchableOpacity
          style={[
            styles.segmentBtn,
            section === 'offers' && { backgroundColor: colors.primary },
          ]}
          onPress={() => setSection('offers')}
        >
          <Text
            style={[
              styles.segmentText,
              { color: section === 'offers' ? '#FFFFFF' : colors.primaryDark },
            ]}
          >
            🛍️ Achadinhos
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.segmentBtn,
            section === 'coupons' && { backgroundColor: colors.primary },
          ]}
          onPress={() => setSection('coupons')}
        >
          <Text
            style={[
              styles.segmentText,
              { color: section === 'coupons' ? '#FFFFFF' : colors.primaryDark },
            ]}
          >
            🎟️ Cupons (Manual)
          </Text>
        </TouchableOpacity>
      </View>

      {section === 'offers' ? (
        <View style={styles.searchRow}>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
            placeholderTextColor={colors.textMuted}
            placeholder="Buscar fone, air fryer, teclado, whey..."
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={loadData}
            returnKeyType="search"
          />
          <TouchableOpacity
            style={[styles.searchBtn, { backgroundColor: colors.primary }]}
            onPress={loadData}
          >
            <Text style={styles.searchBtnText}>Buscar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Text
          style={[
            styles.couponNote,
            { backgroundColor: colors.primarySoft, color: colors.primaryDark },
          ]}
        >
          💡 Cupons não são disparados no piloto automático — você escolhe aqui qual cupom quer copiar ou postar!
        </Text>
      )}

      <View style={styles.chipsRow}>
        {STORES.map((s) => {
          const active = selectedStore === s.id;
          return (
            <TouchableOpacity
              key={s.id}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? colors.primary : colors.card,
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setSelectedStore(s.id)}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: active ? '#FFFFFF' : colors.textMuted },
                ]}
              >
                {s.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <AdBanner isPro={isPro} />

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 32 }} />
      ) : section === 'offers' ? (
        <FlatList
          data={offers}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
          renderItem={({ item }) => (
            <OfferCard
              offer={item}
              primaryLabel="Pegar Oferta 🛒"
              onPrimaryPress={handleOpenOffer}
              secondaryLabel="Enviar"
              onSecondaryPress={handleShareOffer}
            />
          )}
          contentContainerStyle={{ paddingBottom: 24 }}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: colors.textMuted }]}>
              Nenhuma oferta encontrada.
            </Text>
          }
        />
      ) : (
        <FlatList
          data={coupons}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
          renderItem={({ item }) => {
            const storeInfo = STORE_META[item.store];
            return (
              <View
                style={[
                  styles.couponCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <View style={styles.couponTop}>
                  <View style={[styles.storeBadge, { backgroundColor: storeInfo.bg }]}>
                    <Text style={[styles.storeBadgeText, { color: storeInfo.color }]}>
                      {storeInfo.label}
                    </Text>
                  </View>
                  <Text style={[styles.expiresText, { color: colors.warning }]}>
                    ⏳ {item.expiresLabel}
                  </Text>
                </View>

                <Text style={[styles.couponTitle, { color: colors.text }]}>
                  {item.title}
                </Text>
                <Text style={[styles.couponDesc, { color: colors.textMuted }]}>
                  {item.description}
                </Text>

                <View
                  style={[
                    styles.codeBox,
                    {
                      borderColor: colors.primary,
                      backgroundColor: colors.primarySoft,
                    },
                  ]}
                >
                  <Text style={[styles.codeText, { color: colors.primaryDark }]}>
                    {item.code}
                  </Text>
                  {item.minSpend ? (
                    <Text style={[styles.minSpendText, { color: colors.textMuted }]}>
                      {item.minSpend}
                    </Text>
                  ) : null}
                </View>

                <View style={styles.couponActions}>
                  <TouchableOpacity
                    style={[styles.couponPrimaryBtn, { backgroundColor: colors.primary }]}
                    onPress={() => handleCopyAndUseCoupon(item)}
                  >
                    <Text style={styles.couponPrimaryText}>Copiar e Usar 🛒</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.couponPostBtn, { backgroundColor: colors.save }]}
                    onPress={() => handlePostCouponManually(item)}
                  >
                    <Text style={styles.couponPostText}>Postar Cupom 📲</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
          contentContainerStyle={{ paddingBottom: 24 }}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: colors.textMuted }]}>
              Nenhum cupom disponível para esta loja.
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  headerSub: {
    fontSize: 12,
    marginBottom: 10,
  },
  segmentRow: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 4,
    marginBottom: 10,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '700',
  },
  couponNote: {
    fontSize: 12,
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
    fontWeight: '600',
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
  },
  searchBtn: {
    paddingHorizontal: 16,
    borderRadius: 10,
    justifyContent: 'center',
  },
  searchBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  adSlot: {
    borderRadius: 10,
    padding: 9,
    marginBottom: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  adText: {
    fontSize: 11,
    fontWeight: '600',
  },
  couponCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
  },
  couponTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  storeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  storeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  expiresText: {
    fontSize: 11,
    fontWeight: '700',
  },
  couponTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  couponDesc: {
    fontSize: 12,
    marginBottom: 10,
  },
  codeBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  codeText: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  minSpendText: {
    fontSize: 11,
    fontWeight: '600',
  },
  couponActions: {
    flexDirection: 'row',
    gap: 8,
  },
  couponPrimaryBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  couponPrimaryText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  couponPostBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  couponPostText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  empty: {
    textAlign: 'center',
    marginTop: 40,
  },
});
