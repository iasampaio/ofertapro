import React from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
  const imgSize = isCompact ? 82 : 98;
  const storeInfo = STORE_META[offer.store];

  const savings =
    offer.originalPrice && offer.originalPrice > offer.price
      ? offer.originalPrice - offer.price
      : 0;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          padding: isCompact ? 11 : 13,
        },
      ]}
    >
      <View style={styles.row}>
        <View style={{ position: 'relative' }}>
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
          {offer.discountPercent > 0 ? (
            <View style={[styles.discountTag, { backgroundColor: colors.save }]}>
              <Text style={styles.discountTagText}>-{offer.discountPercent}%</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.info}>
          <View style={styles.badges}>
            <View style={[styles.badge, { backgroundColor: storeInfo.bg }]}>
              <Text style={[styles.badgeText, { color: storeInfo.color }]}>
                {storeInfo.label}
              </Text>
            </View>
            {showCommission && offer.commissionRate ? (
              <View style={[styles.badge, { backgroundColor: colors.primarySoft }]}>
                <Text style={[styles.badgeText, { color: colors.primaryDark }]}>
                  {offer.commissionRate}% com.
                </Text>
              </View>
            ) : null}
            {offer.rating ? (
              <View style={styles.metaPill}>
                <Ionicons name="star" size={11} color="#F59E0B" />
                <Text style={[styles.metaText, { color: colors.textMuted }]}>
                  {offer.rating.toFixed(1)}
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
                { color: colors.primary, fontSize: isCompact ? 17 : 19 },
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

          {savings > 5 ? (
            <Text style={[styles.savings, { color: colors.save }]}>
              Economize R$ {savings.toFixed(2).replace('.', ',')}
            </Text>
          ) : null}

          {offer.coupon ? (
            <View style={styles.couponRow}>
              <Ionicons name="pricetag" size={11} color={colors.primary} />
              <Text style={[styles.coupon, { color: colors.primaryDark }]}>
                Cupom: {offer.coupon}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          activeOpacity={0.78}
          style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
          onPress={() => onPrimaryPress(offer)}
        >
          <Ionicons name="rocket-outline" size={15} color="#FFFFFF" />
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
            <Ionicons
              name="share-social-outline"
              size={15}
              color={colors.primaryDark}
            />
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
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#4C1D95',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  image: {
    borderRadius: 12,
  },
  discountTag: {
    position: 'absolute',
    top: 6,
    left: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  discountTagText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 5,
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    fontSize: 11,
    fontWeight: '700',
  },
  title: {
    fontWeight: '700',
    marginBottom: 5,
    lineHeight: 19,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: 6,
  },
  price: {
    fontWeight: '900',
  },
  originalPrice: {
    fontSize: 12,
    textDecorationLine: 'line-through',
  },
  savings: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  couponRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  coupon: {
    fontSize: 11,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  secondaryBtn: {
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontWeight: '800',
    fontSize: 13,
  },
});
