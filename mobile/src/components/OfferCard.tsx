import React from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Offer } from '../services/api';
import { STORE_META, useTheme } from '../theme';

interface OfferCardProps {
  offer: Offer;
  primaryLabel: string;
  onPrimaryPress: (offer: Offer) => void;
  secondaryLabel?: string;
  onSecondaryPress?: (offer: Offer) => void;
  showCommission?: boolean;
}

export function OfferCard({
  offer,
  primaryLabel,
  onPrimaryPress,
  secondaryLabel,
  onSecondaryPress,
  showCommission = false,
}: OfferCardProps) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const isCompact = width < 360;
  const imgSize = isCompact ? 76 : 92;
  const storeInfo = STORE_META[offer.store];

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          padding: isCompact ? 10 : 12,
        },
      ]}
    >
      <View style={styles.row}>
        <Image
          source={{ uri: offer.imageUrl }}
          style={[
            styles.image,
            {
              width: imgSize,
              height: imgSize,
              backgroundColor: colors.inputBg,
            },
          ]}
        />
        <View style={styles.info}>
          <View style={styles.badges}>
            <View style={[styles.badge, { backgroundColor: storeInfo.bg }]}>
              <Text style={[styles.badgeText, { color: storeInfo.color }]}>
                {storeInfo.label}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: colors.successSoft }]}>
              <Text style={[styles.badgeText, { color: colors.success }]}>
                -{offer.discountPercent}% OFF
              </Text>
            </View>
            {showCommission && offer.commissionRate ? (
              <View style={[styles.badge, { backgroundColor: colors.primarySoft }]}>
                <Text style={[styles.badgeText, { color: colors.primaryDark }]}>
                  {offer.commissionRate}% com.
                </Text>
              </View>
            ) : null}
          </View>

          <Text
            style={[
              styles.title,
              { color: colors.text, fontSize: isCompact ? 13 : 14 },
            ]}
            numberOfLines={2}
          >
            {offer.title}
          </Text>

          <View style={styles.priceRow}>
            <Text
              style={[
                styles.price,
                { color: colors.primary, fontSize: isCompact ? 16 : 18 },
              ]}
            >
              R$ {offer.price.toFixed(2).replace('.', ',')}
            </Text>
            {offer.originalPrice ? (
              <Text style={[styles.originalPrice, { color: colors.textMuted }]}>
                R$ {offer.originalPrice.toFixed(2).replace('.', ',')}
              </Text>
            ) : null}
          </View>

          {offer.coupon ? (
            <Text style={[styles.coupon, { color: colors.success }]}>
              🎟️ Cupom: {offer.coupon}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          activeOpacity={0.78}
          style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
          onPress={() => onPrimaryPress(offer)}
        >
          <Text style={styles.primaryBtnText} numberOfLines={1}>
            {primaryLabel}
          </Text>
        </TouchableOpacity>

        {secondaryLabel && onSecondaryPress ? (
          <TouchableOpacity
            activeOpacity={0.78}
            style={[styles.secondaryBtn, { backgroundColor: colors.primarySoft }]}
            onPress={() => onSecondaryPress(offer)}
          >
            <Text
              style={[styles.secondaryBtnText, { color: colors.primaryDark }]}
              numberOfLines={1}
            >
              {secondaryLabel}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  image: {
    borderRadius: 10,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginBottom: 5,
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  title: {
    fontWeight: '600',
    marginBottom: 5,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: 6,
  },
  price: {
    fontWeight: '800',
  },
  originalPrice: {
    fontSize: 12,
    textDecorationLine: 'line-through',
  },
  coupon: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  primaryBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  secondaryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontWeight: '700',
    fontSize: 13,
  },
});
