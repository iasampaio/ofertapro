import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { OfferCard } from '../components/OfferCard';
import { ProBanner } from '../components/ProBadge';
import {
  api,
  AutomationSettings,
  NICHES,
  NicheId,
  Offer,
} from '../services/api';
import { useTheme } from '../theme';

interface SearchGeneratorScreenProps {
  settings: AutomationSettings | null;
  onRefreshSettings: () => void;
  onOpenPro: () => void;
}

export function SearchGeneratorScreen({
  settings,
  onRefreshSettings,
  onOpenPro,
}: SearchGeneratorScreenProps) {
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const [selectedNiche, setSelectedNiche] = useState<NicheId>('todos');
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(false);

  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [caption, setCaption] = useState('');
  const [selectedChannelIds, setSelectedChannelIds] = useState<string[]>([]);
  const [scheduleMinutes, setScheduleMinutes] = useState('15');
  const [sending, setSending] = useState(false);

  // Modal de configuração do Piloto Automático (PRO)
  const [autopilotOpen, setAutopilotOpen] = useState(false);
  const [autoInterval, setAutoInterval] = useState('30');
  const [autoMinDiscount, setAutoMinDiscount] = useState('30');
  const [autoCount, setAutoCount] = useState('5');
  const [autoLoading, setAutoLoading] = useState(false);

  async function searchProducts(nicheOverride?: NicheId) {
    const activeNiche = nicheOverride ?? selectedNiche;
    setLoading(true);
    try {
      const res = await api.searchOffers(query, [], activeNiche);
      setOffers(res.offers);
    } catch (err) {
      Alert.alert(
        'Erro na busca',
        err instanceof Error ? err.message : 'Verifique se o backend está online.'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    searchProducts(selectedNiche);
  }, [selectedNiche]);

  async function openComposer(offer: Offer) {
    setSelectedOffer(offer);
    setCaption('Gerando copy persuasiva...');

    const activeChannels = (settings?.channels || []).filter((c) => c.enabled);
    const matching =
      selectedNiche === 'todos'
        ? activeChannels
        : activeChannels.filter(
            (c) => c.niche === selectedNiche || c.niche === 'todos'
          );
    setSelectedChannelIds(matching.map((c) => c.id));

    try {
      const res = await api.generateCopy(offer);
      setCaption(res.caption);
    } catch {
      setCaption(
        `🔥 ${offer.title}\n✅ R$ ${offer.price.toFixed(2)}\n👉 ${offer.affiliateUrl}`
      );
    }
  }

  function toggleChannelSelection(id: string) {
    setSelectedChannelIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  async function handleOneTapShare() {
    if (!caption) return;
    await Clipboard.setStringAsync(caption);
    await Share.share({ message: caption });
  }

  async function handlePostStatus() {
    if (!selectedOffer) return;

    if (settings && settings.whatsappAccounts.length > 0) {
      setSending(true);
      try {
        const res = await api.dispatchStatus(selectedOffer);
        const summary = res.results
          .map((r) => `${r.success ? '✅' : '❌'} ${r.channelName}: ${r.message}`)
          .join('\n');
        Alert.alert('Postagem no Status 🟢', summary);
        onRefreshSettings();
        setSelectedOffer(null);
      } catch (err: any) {
        if (err?.code === 'PRO_REQUIRED') {
          Alert.alert('Limite do Plano Grátis', err.message, [
            { text: 'Depois', style: 'cancel' },
            { text: 'Ver Plano PRO', onPress: onOpenPro },
          ]);
        } else {
          Alert.alert('Erro no Status', err?.message || 'Falha ao postar no Status');
        }
      } finally {
        setSending(false);
      }
      return;
    }

    const statusText = `🔥 OFERTA (-${selectedOffer.discountPercent}% OFF)\n${selectedOffer.title}\n✅ Por R$ ${selectedOffer.price
      .toFixed(2)
      .replace('.', ',')}\n👉 ${selectedOffer.affiliateUrl}`;
    await Clipboard.setStringAsync(statusText);
    await Share.share({ message: statusText });
  }

  async function handleDispatchNow() {
    if (!selectedOffer) return;
    setSending(true);
    try {
      const res = await api.dispatchNow(
        selectedOffer,
        caption,
        selectedChannelIds,
        selectedNiche
      );
      const summary = res.results
        .map((r) => `${r.success ? '✅' : '❌'} ${r.channelName}: ${r.message}`)
        .join('\n');
      Alert.alert('Resultado do Disparo', summary);
      onRefreshSettings();
      setSelectedOffer(null);
    } catch (err: any) {
      if (err?.code === 'PRO_REQUIRED') {
        Alert.alert('Limite do Plano Grátis', err.message, [
          { text: 'Depois', style: 'cancel' },
          { text: 'Ver Plano PRO', onPress: onOpenPro },
        ]);
      } else {
        Alert.alert('Erro', err?.message || 'Falha no disparo');
      }
    } finally {
      setSending(false);
    }
  }

  async function handleScheduleCloud() {
    if (!selectedOffer) return;
    const mins = Math.max(1, parseInt(scheduleMinutes, 10) || 15);
    const scheduledFor = new Date(Date.now() + mins * 60 * 1000).toISOString();

    setSending(true);
    try {
      await api.schedulePost(
        selectedOffer,
        caption,
        scheduledFor,
        selectedChannelIds,
        selectedNiche
      );
      Alert.alert(
        'Agendado na Nuvem ☁️',
        `Oferta agendada para daqui a ${mins} min em ${selectedChannelIds.length} grupo(s)!`
      );
      setSelectedOffer(null);
    } catch (err: any) {
      if (err?.code === 'PRO_REQUIRED') {
        Alert.alert('Recurso PRO', err.message, [
          { text: 'Depois', style: 'cancel' },
          { text: 'Assinar PRO', onPress: onOpenPro },
        ]);
      } else {
        Alert.alert('Erro', err?.message || 'Falha ao agendar');
      }
    } finally {
      setSending(false);
    }
  }

  function handleOpenAutopilot() {
    if (settings?.plan !== 'pro') {
      Alert.alert(
        'Piloto Automático PRO 👑',
        'O Piloto Automático por Nicho é exclusivo para assinantes PRO. Assine para postar ofertas automaticamente 24h na nuvem!',
        [
          { text: 'Agora não', style: 'cancel' },
          { text: 'Ver Plano PRO', onPress: onOpenPro },
        ]
      );
      return;
    }
    setAutopilotOpen(true);
  }

  async function handleConfirmAutopilot() {
    const interval = Math.max(1, parseInt(autoInterval, 10) || 30);
    const minDiscount = Math.max(0, Math.min(95, parseInt(autoMinDiscount, 10) || 0));
    const count = Math.max(1, Math.min(20, parseInt(autoCount, 10) || 5));

    const nicheLabel =
      NICHES.find((n) => n.id === selectedNiche)?.label || 'Todos os Nichos';

    setAutoLoading(true);
    try {
      const res = await api.scheduleBatchByNiche(
        selectedNiche,
        interval,
        minDiscount,
        count
      );
      setAutopilotOpen(false);
      Alert.alert(
        'Piloto Automático Ativado ⚡',
        `${res.scheduledCount} oferta(s) do nicho "${nicheLabel}" com no mínimo ${res.minDiscount}% OFF foram agendadas de ${res.intervalMinutes} em ${res.intervalMinutes} min para ${res.channelsCount} grupo(s)/Status!`
      );
    } catch (err: any) {
      if (err?.code === 'PRO_REQUIRED') {
        setAutopilotOpen(false);
        Alert.alert('Recurso PRO 👑', err.message, [
          { text: 'Depois', style: 'cancel' },
          { text: 'Assinar PRO', onPress: onOpenPro },
        ]);
      } else {
        Alert.alert('Atenção', err?.message || 'Não foi possível ativar o piloto automático.');
      }
    } finally {
      setAutoLoading(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.headerTitle, { color: colors.text }]}>
        🤖 Automação por Nicho
      </Text>
      <Text style={[styles.headerSub, { color: colors.textMuted }]}>
        Escolha o nicho, filtre ofertas e dispare nos grupos ou Status do WhatsApp.
      </Text>

      {settings ? (
        <ProBanner
          plan={settings.plan}
          postsUsedToday={settings.postsUsedToday}
          dailyLimit={settings.dailyPostsLimit}
          onPressUpgrade={onOpenPro}
        />
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.nichesScroll}
        contentContainerStyle={{ paddingVertical: 2 }}
      >
        {NICHES.map((n) => {
          const active = selectedNiche === n.id;
          return (
            <TouchableOpacity
              key={n.id}
              style={[
                styles.nicheChip,
                {
                  backgroundColor: active ? colors.primary : colors.card,
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setSelectedNiche(n.id)}
            >
              <Text
                style={[
                  styles.nicheText,
                  { color: active ? '#FFFFFF' : colors.text },
                ]}
              >
                {n.icon} {n.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <TouchableOpacity
        style={[
          styles.batchBtn,
          {
            backgroundColor:
              settings?.plan === 'pro' ? colors.secondary : colors.proBg,
          },
        ]}
        onPress={handleOpenAutopilot}
      >
        <Text style={styles.batchBtnText}>
          {settings?.plan === 'pro'
            ? '⚡ Configurar Piloto Automático deste Nicho'
            : '👑 Piloto Automático por Nicho (Exclusivo PRO)'}
        </Text>
      </TouchableOpacity>

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
          placeholder="Filtrar produto dentro deste nicho..."
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => searchProducts()}
        />
        <TouchableOpacity
          style={[styles.searchBtn, { backgroundColor: colors.primary }]}
          onPress={() => searchProducts()}
        >
          <Text style={styles.searchBtnText}>Buscar</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 32 }} />
      ) : (
        <FlatList
          data={offers}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <OfferCard
              offer={item}
              showCommission
              primaryLabel="Gerar Copy e Disparar 🚀"
              onPrimaryPress={openComposer}
            />
          )}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      )}

      <Modal visible={Boolean(selectedOffer)} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView
            style={[styles.modalCard, { backgroundColor: colors.card }]}
            contentContainerStyle={{ paddingBottom: 24 }}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              ✨ Disparar / Agendar Oferta
            </Text>

            <Text style={[styles.modalLabel, { color: colors.textMuted }]}>
              Grupos de destino ({selectedChannelIds.length} selecionado(s)):
            </Text>
            {settings && settings.channels.length > 0 ? (
              <View style={styles.groupsWrap}>
                {settings.channels.map((ch) => {
                  const isSelected = selectedChannelIds.includes(ch.id);
                  return (
                    <TouchableOpacity
                      key={ch.id}
                      style={[
                        styles.groupChip,
                        {
                          borderColor: isSelected ? colors.save : colors.border,
                          backgroundColor: isSelected
                            ? colors.successSoft
                            : colors.inputBg,
                        },
                      ]}
                      onPress={() => toggleChannelSelection(ch.id)}
                    >
                      <Text
                        style={[
                          styles.groupChipText,
                          { color: isSelected ? colors.save : colors.text },
                        ]}
                      >
                        {isSelected ? '☑️ ' : '⬜ '}
                        {ch.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <Text style={[styles.noGroupHint, { color: colors.warning }]}>
                Nenhum grupo cadastrado ainda — cadastre seus grupos na aba ⚙️ Canais ou use o Compartilhamento em 1 Toque abaixo.
              </Text>
            )}

            <Text style={[styles.modalLabel, { color: colors.textMuted }]}>
              Legenda pronta (editável):
            </Text>
            <TextInput
              style={[
                styles.captionInput,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.inputBg,
                  color: colors.text,
                },
              ]}
              multiline
              value={caption}
              onChangeText={setCaption}
            />

            <View style={styles.scheduleRow}>
              <Text style={[styles.scheduleLabel, { color: colors.text }]}>
                Agendar daqui a (min):
              </Text>
              <TextInput
                style={[
                  styles.minutesInput,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.inputBg,
                    color: colors.text,
                  },
                ]}
                keyboardType="numeric"
                value={scheduleMinutes}
                onChangeText={setScheduleMinutes}
              />
            </View>

            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: colors.primary }]}
              onPress={handleDispatchNow}
              disabled={sending}
            >
              <Text style={styles.modalBtnText}>
                🚀 Disparar Agora nos Grupos Selecionados
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: colors.secondary }]}
              onPress={handleScheduleCloud}
              disabled={sending}
            >
              <Text style={styles.modalBtnText}>☁️ Agendar na Nuvem</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: colors.save }]}
              onPress={handlePostStatus}
              disabled={sending}
            >
              <Text style={styles.modalBtnText}>
                🟢 Postar no Status do WhatsApp
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: colors.lilac }]}
              onPress={handleOneTapShare}
            >
              <Text style={styles.modalBtnText}>
                📲 Compartilhar em 1 Toque (WhatsApp / Insta)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setSelectedOffer(null)}
            >
              <Text style={[styles.closeBtnText, { color: colors.textMuted }]}>
                Fechar
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* MODAL CONFIGURÁVEL DO PILOTO AUTOMÁTICO (PRO) */}
      <Modal visible={autopilotOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              ⚡ Configurar Piloto Automático
            </Text>
            <Text style={[styles.headerSub, { color: colors.textMuted }]}>
              Nicho ativo:{' '}
              {NICHES.find((n) => n.id === selectedNiche)?.icon}{' '}
              {NICHES.find((n) => n.id === selectedNiche)?.label}
            </Text>

            <Text style={[styles.modalLabel, { color: colors.textMuted }]}>
              ⏱️ Disparar de quantos em quantos minutos?
            </Text>
            <View style={styles.groupsWrap}>
              {['10', '15', '30', '60'].map((m) => {
                const active = autoInterval === m;
                return (
                  <TouchableOpacity
                    key={m}
                    style={[
                      styles.groupChip,
                      {
                        borderColor: active ? colors.primary : colors.border,
                        backgroundColor: active ? colors.primary : colors.inputBg,
                      },
                    ]}
                    onPress={() => setAutoInterval(m)}
                  >
                    <Text
                      style={[
                        styles.groupChipText,
                        { color: active ? '#FFFFFF' : colors.text },
                      ]}
                    >
                      {m} min
                    </Text>
                  </TouchableOpacity>
                );
              })}
              <TextInput
                style={[
                  styles.minutesInput,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.inputBg,
                    color: colors.text,
                  },
                ]}
                keyboardType="numeric"
                value={autoInterval}
                onChangeText={setAutoInterval}
                placeholder="min"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <Text style={[styles.modalLabel, { color: colors.textMuted }]}>
              🏷️ Desconto mínimo (% OFF):
            </Text>
            <View style={styles.groupsWrap}>
              {['20', '30', '40', '50', '60'].map((d) => {
                const active = autoMinDiscount === d;
                return (
                  <TouchableOpacity
                    key={d}
                    style={[
                      styles.groupChip,
                      {
                        borderColor: active ? colors.primary : colors.border,
                        backgroundColor: active ? colors.primary : colors.inputBg,
                      },
                    ]}
                    onPress={() => setAutoMinDiscount(d)}
                  >
                    <Text
                      style={[
                        styles.groupChipText,
                        { color: active ? '#FFFFFF' : colors.text },
                      ]}
                    >
                      {d}%+
                    </Text>
                  </TouchableOpacity>
                );
              })}
              <TextInput
                style={[
                  styles.minutesInput,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.inputBg,
                    color: colors.text,
                  },
                ]}
                keyboardType="numeric"
                value={autoMinDiscount}
                onChangeText={setAutoMinDiscount}
                placeholder="%"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <Text style={[styles.modalLabel, { color: colors.textMuted }]}>
              📦 Quantidade de ofertas para agendar na fila:
            </Text>
            <View style={styles.groupsWrap}>
              {['3', '5', '10'].map((q) => {
                const active = autoCount === q;
                return (
                  <TouchableOpacity
                    key={q}
                    style={[
                      styles.groupChip,
                      {
                        borderColor: active ? colors.primary : colors.border,
                        backgroundColor: active ? colors.primary : colors.inputBg,
                      },
                    ]}
                    onPress={() => setAutoCount(q)}
                  >
                    <Text
                      style={[
                        styles.groupChipText,
                        { color: active ? '#FFFFFF' : colors.text },
                      ]}
                    >
                      {q} ofertas
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: colors.save, marginTop: 8 }]}
              onPress={handleConfirmAutopilot}
              disabled={autoLoading}
            >
              {autoLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.modalBtnText}>
                  ✅ Salvar e Ativar Piloto Automático
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setAutopilotOpen(false)}
            >
              <Text style={[styles.closeBtnText, { color: colors.textMuted }]}>
                Cancelar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  nichesScroll: {
    maxHeight: 40,
    marginBottom: 8,
  },
  nicheChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 6,
  },
  nicheText: {
    fontSize: 12,
    fontWeight: '600',
  },
  batchBtn: {
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  batchBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(9, 9, 11, 0.72)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 10,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  groupsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  groupChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  groupChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  noGroupHint: {
    fontSize: 12,
    marginBottom: 10,
  },
  captionInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    height: 140,
    textAlignVertical: 'top',
    fontSize: 13,
    marginBottom: 12,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  scheduleLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  minutesInput: {
    width: 80,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    textAlign: 'center',
    fontWeight: '700',
  },
  modalBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 8,
  },
  modalBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  closeBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  closeBtnText: {
    fontWeight: '600',
  },
});
