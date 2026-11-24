import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { OfferCard } from '../components/OfferCard';
import { ProBanner } from '../components/ProBadge';
import { SelectDropdown } from '../components/SelectModal';
import {
  api,
  AutomationSettings,
  NICHES,
  NicheId,
  Offer,
} from '../services/api';
import { shareOfferWithPhoto } from '../services/shareOffer';
import { useTheme } from '../theme';

type PostTargetMode = 'groups' | 'status' | 'both';

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
  const { width } = useWindowDimensions();
  const isCompact = width < 360;

  const [query, setQuery] = useState('');
  const [selectedNiches, setSelectedNiches] = useState<NicheId[]>(['todos']);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal de disparo / escolha de destino (Grupo, Status ou Ambos)
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [postTarget, setPostTarget] = useState<PostTargetMode>('groups');
  const [caption, setCaption] = useState('');
  const [selectedChannelIds, setSelectedChannelIds] = useState<string[]>([]);
  const [selectedWaAccountIds, setSelectedWaAccountIds] = useState<string[]>([]);
  const [scheduleMinutes, setScheduleMinutes] = useState('15');
  const [sending, setSending] = useState(false);

  // Modal "Colar Link Real" (Mercado Livre, Amazon, Shopee, AliExpress)
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [manualUrl, setManualUrl] = useState('');
  const [manualTitle, setManualTitle] = useState('');
  const [manualPrice, setManualPrice] = useState('');
  const [manualCoupon, setManualCoupon] = useState('');
  const [parsingLink, setParsingLink] = useState(false);

  // Modal de configuração do Piloto Automático (PRO)
  const [autopilotOpen, setAutopilotOpen] = useState(false);
  const [autoTargetMode, setAutoTargetMode] = useState<PostTargetMode>('both');
  const [autoNiches, setAutoNiches] = useState<NicheId[]>(['todos']);
  const [autoChannelIds, setAutoChannelIds] = useState<string[]>([]);
  const [autoWaIds, setAutoWaIds] = useState<string[]>([]);
  const [autoInterval, setAutoInterval] = useState('30');
  const [autoMinDiscount, setAutoMinDiscount] = useState('5');
  const [autoCount, setAutoCount] = useState('5');
  const [autoLoading, setAutoLoading] = useState(false);
  const [testingAutopilot, setTestingAutopilot] = useState(false);

  async function searchProducts(nichesOverride?: NicheId[]) {
    const activeNiches =
      nichesOverride && nichesOverride.length > 0 ? nichesOverride : selectedNiches;
    const effective = activeNiches.length > 0 ? activeNiches : (['todos'] as NicheId[]);
    setLoading(true);
    try {
      const toQuery: NicheId[] = effective.includes('todos') ? ['todos'] : effective;
      const results = await Promise.all(
        toQuery.map((n) => api.searchOffers(query, [], n))
      );
      const unique = new Map<string, Offer>();
      for (const r of results) {
        for (const o of r.offers) {
          unique.set(o.id, o);
        }
      }
      setOffers(
        Array.from(unique.values()).sort(
          (a, b) => b.discountPercent - a.discountPercent
        )
      );
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
    searchProducts(selectedNiches);
  }, [selectedNiches]);

  async function openComposer(offer: Offer) {
    setSelectedOffer(offer);
    setPostTarget('groups');
    setCaption('Gerando copy persuasiva...');

    const activeChannels = (settings?.channels || []).filter((c) => c.enabled);
    const matching = selectedNiches.includes('todos')
      ? activeChannels
      : activeChannels.filter(
          (c) => selectedNiches.includes(c.niche) || c.niche === 'todos'
        );
    setSelectedChannelIds(matching.map((c) => c.id));
    setSelectedWaAccountIds((settings?.whatsappAccounts || []).map((a) => a.id));

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

  function toggleWaAccountSelection(id: string) {
    setSelectedWaAccountIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  async function handleOneTapShare() {
    if (!caption || !selectedOffer) return;
    await shareOfferWithPhoto(selectedOffer.imageUrl, caption);
  }

  async function handlePublishNow() {
    if (!selectedOffer) return;
    setSending(true);
    const messages: string[] = [];

    try {
      if (postTarget === 'groups' || postTarget === 'both') {
        const res = await api.dispatchNow(
          selectedOffer,
          caption,
          selectedChannelIds,
          selectedNiches[0] || 'todos'
        );
        messages.push(
          ...res.results.map(
            (r) => `${r.success ? '✅' : '❌'} ${r.channelName}: ${r.message}`
          )
        );
      }

      if (postTarget === 'status' || postTarget === 'both') {
        if (settings && settings.whatsappAccounts.length > 0) {
          const res = await api.dispatchStatus(
            selectedOffer,
            caption,
            selectedWaAccountIds
          );
          messages.push(
            ...res.results.map(
              (r) => `${r.success ? '✅' : '❌'} ${r.channelName}: ${r.message}`
            )
          );
        } else {
          await shareOfferWithPhoto(selectedOffer.imageUrl, caption);
          setSending(false);
          return;
        }
      }

      Alert.alert('Resultado da Postagem 🚀', messages.join('\n') || 'Concluído!');
      onRefreshSettings();
      setSelectedOffer(null);
    } catch (err: any) {
      if (err?.code === 'PRO_REQUIRED') {
        Alert.alert('Limite do Plano Grátis', err.message, [
          { text: 'Depois', style: 'cancel' },
          { text: 'Ver Plano PRO', onPress: onOpenPro },
        ]);
      } else {
        Alert.alert('Erro ao postar', err?.message || 'Falha no disparo');
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
        selectedNiches[0] || 'todos'
      );
      Alert.alert(
        'Agendado na Nuvem ☁️',
        `Oferta agendada para daqui a ${mins} min em ${selectedChannelIds.length} destino(s)!`
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

  async function handleParseManualLink() {
    if (!manualUrl.trim().startsWith('http')) {
      Alert.alert('Atenção', 'Cole um link real começando com https://');
      return;
    }

    setParsingLink(true);
    try {
      const priceNum = parseFloat(manualPrice.replace(',', '.')) || 0;
      const res = await api.parseRealLink({
        url: manualUrl.trim(),
        title: manualTitle.trim() || undefined,
        price: priceNum,
        coupon: manualCoupon.trim() || undefined,
      });
      setLinkModalOpen(false);
      setManualUrl('');
      setManualTitle('');
      setManualPrice('');
      setManualCoupon('');

      setSelectedOffer(res.offer);
      setPostTarget('groups');
      setCaption(res.caption);
      const activeChannels = (settings?.channels || []).filter((c) => c.enabled);
      setSelectedChannelIds(activeChannels.map((c) => c.id));
      setSelectedWaAccountIds((settings?.whatsappAccounts || []).map((a) => a.id));
    } catch (err: any) {
      Alert.alert('Erro', err?.message || 'Não foi possível ler este link.');
    } finally {
      setParsingLink(false);
    }
  }

  async function handleToggleAutopilot(nextVal: boolean) {
    if (nextVal && settings?.plan !== 'pro') {
      Alert.alert(
        'Piloto Automático PRO 👑',
        'O Piloto Automático (08h às 22h) é exclusivo para assinantes PRO!',
        [
          { text: 'Agora não', style: 'cancel' },
          { text: 'Ver Plano PRO', onPress: onOpenPro },
        ]
      );
      return;
    }

    try {
      await api.toggleAutopilot(nextVal);
      onRefreshSettings();
    } catch (err: any) {
      Alert.alert('Aviso', err?.message || 'Não foi possível alterar o Piloto Automático.');
    }
  }

  async function handleTestAutopilotNow() {
    if (settings?.plan !== 'pro') {
      onOpenPro();
      return;
    }
    setTestingAutopilot(true);
    try {
      const res = await api.testAutopilotNow();
      Alert.alert(
        res.success ? 'Piloto Automático Testado! ✅' : 'Aviso do Teste',
        res.message
      );
      onRefreshSettings();
    } catch (err: any) {
      Alert.alert('Erro no Teste', err?.message || 'Não foi possível testar agora.');
    } finally {
      setTestingAutopilot(false);
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
    setAutoNiches(
      settings?.autopilotConfig?.niches?.length
        ? settings.autopilotConfig.niches
        : selectedNiches.length > 0
        ? selectedNiches
        : ['todos']
    );
    setAutoChannelIds(
      settings?.autopilotConfig?.channelIds?.length
        ? settings.autopilotConfig.channelIds
        : (settings?.channels || [])
            .filter((c) => c.enabled && c.type !== 'whatsapp_status')
            .map((c) => c.id)
    );
    setAutoWaIds(
      settings?.autopilotConfig?.whatsappAccountIds?.length
        ? settings.autopilotConfig.whatsappAccountIds
        : (settings?.whatsappAccounts || []).map((a) => a.id)
    );
    setAutopilotOpen(true);
  }

  async function handleConfirmAutopilot() {
    const interval = Math.max(1, parseInt(autoInterval, 10) || 30);
    const minDiscount = Math.max(0, Math.min(95, parseInt(autoMinDiscount, 10) || 0));
    const count = Math.max(1, Math.min(20, parseInt(autoCount, 10) || 5));
    const chosenNiches: NicheId[] = autoNiches.length > 0 ? autoNiches : ['todos'];

    setAutoLoading(true);
    try {
      const res = await api.scheduleBatchByNiche(
        chosenNiches,
        interval,
        minDiscount,
        count,
        autoTargetMode,
        autoWaIds,
        autoChannelIds
      );
      setAutopilotOpen(false);
      onRefreshSettings();
      const targetDesc =
        autoTargetMode === 'status'
          ? 'Status do WhatsApp'
          : autoTargetMode === 'groups'
          ? 'Grupos'
          : 'Grupos + Status do WhatsApp';
      Alert.alert(
        'Piloto Automático Contínuo Ativado ♾️',
        `Configurado! Vai postar todos os dias de 08h às 22h (Brasília), de ${res.intervalMinutes} em ${res.intervalMinutes} min, ofertas com ${res.minDiscount}%+ OFF em ${targetDesc} — sem parar até você desligar!`
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

  const targetButtonLabel =
    postTarget === 'groups'
      ? '✅ Postar nos Grupos Selecionados'
      : postTarget === 'status'
      ? '✅ Postar no Status do WhatsApp'
      : '✅ Postar nos Grupos + Status';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text
        style={[
          styles.headerTitle,
          { color: colors.text, fontSize: isCompact ? 19 : 22 },
        ]}
      >
        🤖 Automação por Nicho
      </Text>
      <Text style={[styles.headerSub, { color: colors.textMuted }]}>
        Escolha o nicho, gere sua copy e escolha onde postar: Grupos ou Status.
      </Text>

      {settings ? (
        <ProBanner
          plan={settings.plan}
          postsUsedToday={settings.postsUsedToday}
          dailyLimit={settings.dailyPostsLimit}
          onPressUpgrade={onOpenPro}
        />
      ) : null}

      <SelectDropdown
        title="🎯 Selecionar Nichos (pode marcar vários)"
        placeholder="Todos os Nichos"
        multiSelect
        options={NICHES.map((n) => ({
          id: n.id,
          label: `${n.icon} ${n.label}`,
        }))}
        selectedIds={selectedNiches}
        onChange={(ids) => {
          setSelectedNiches(ids.length > 0 ? (ids as NicheId[]) : ['todos']);
        }}
      />

      {/* CARD PILOTO AUTOMÁTICO ON/OFF (08h às 22h) */}
      <View
        style={[
          styles.autopilotBar,
          {
            backgroundColor: colors.card,
            borderColor: settings?.autopilotEnabled ? colors.save : colors.border,
          },
        ]}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.autopilotBarTitle, { color: colors.text }]}>
            {settings?.autopilotEnabled
              ? '🟢 Piloto Automático ATIVADO'
              : '⚪ Piloto Automático DESATIVADO'}
          </Text>
          <Text style={[styles.autopilotBarSub, { color: colors.textMuted }]}>
            {settings?.autopilotConfig
              ? `♾️ A cada ${settings.autopilotConfig.intervalMinutes} min • ${settings.autopilotConfig.minDiscount}%+ OFF • 08h–22h`
              : 'Disparos contínuos todos os dias de 08h às 22h (Brasília)'}
          </Text>
        </View>
        <Switch
          value={Boolean(settings?.autopilotEnabled)}
          onValueChange={handleToggleAutopilot}
          trackColor={{ false: colors.border, true: colors.save }}
          thumbColor="#FFFFFF"
        />
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={[
            styles.batchBtn,
            {
              flex: 1,
              marginBottom: 0,
              backgroundColor:
                settings?.plan === 'pro' ? colors.secondary : colors.proBg,
            },
          ]}
          onPress={handleOpenAutopilot}
        >
          <Text style={styles.batchBtnText}>
            {settings?.plan === 'pro'
              ? '⚡ Configurar Piloto'
              : '👑 Piloto Automático (PRO)'}
          </Text>
        </TouchableOpacity>

        {settings?.plan === 'pro' ? (
          <TouchableOpacity
            activeOpacity={0.8}
            style={[
              styles.batchBtn,
              {
                marginBottom: 0,
                paddingHorizontal: 14,
                backgroundColor: colors.save,
              },
            ]}
            onPress={handleTestAutopilotNow}
            disabled={testingAutopilot}
          >
            {testingAutopilot ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.batchBtnText}>🧪 Postar Agora</Text>
            )}
          </TouchableOpacity>
        ) : null}
      </View>

      <TouchableOpacity
        activeOpacity={0.8}
        style={[
          styles.batchBtn,
          {
            backgroundColor: colors.primarySoft,
            borderWidth: 1,
            borderColor: colors.primary,
          },
        ]}
        onPress={() => setLinkModalOpen(true)}
      >
        <Text style={[styles.batchBtnText, { color: colors.primaryDark }]}>
          🔗 Colar Link Real (Mercado Livre / Amazon / AliExpress / Shopee)
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
          activeOpacity={0.8}
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
              primaryLabel="Escolher Onde Postar 🚀"
              onPrimaryPress={openComposer}
            />
          )}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      )}

      {/* MODAL RESPONSIVO: ESCOLHER ONDE POSTAR (GRUPOS, STATUS OU AMBOS) */}
      <Modal visible={Boolean(selectedOffer)} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            style={[styles.modalCard, { backgroundColor: colors.card }]}
            contentContainerStyle={{ paddingBottom: 28 }}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              ✨ Onde você quer postar?
            </Text>

            {/* SELETOR DE DESTINO: GRUPOS / STATUS / AMBOS */}
            <View style={[styles.targetTabs, { backgroundColor: colors.inputBg }]}>
              {(
                [
                  { id: 'groups', label: '👥 Grupos' },
                  { id: 'status', label: '🟢 Status WA' },
                  { id: 'both', label: '🚀 Ambos' },
                ] as const
              ).map((t) => {
                const active = postTarget === t.id;
                return (
                  <TouchableOpacity
                    key={t.id}
                    activeOpacity={0.8}
                    style={[
                      styles.targetTab,
                      active && { backgroundColor: colors.primary },
                    ]}
                    onPress={() => setPostTarget(t.id)}
                  >
                    <Text
                      style={[
                        styles.targetTabText,
                        { color: active ? '#FFFFFF' : colors.textMuted },
                      ]}
                    >
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* SELEÇÃO DE GRUPOS EM LISTA */}
            {postTarget === 'groups' || postTarget === 'both' ? (
              <SelectDropdown
                title="👥 Escolher Grupos"
                placeholder="Toque para selecionar os grupos..."
                multiSelect
                options={(settings?.channels || []).map((ch) => ({
                  id: ch.id,
                  label: ch.name,
                  subtitle: `Nicho: ${NICHES.find((n) => n.id === ch.niche)?.label || 'Todos'}`,
                }))}
                selectedIds={selectedChannelIds}
                onChange={setSelectedChannelIds}
                emptyMessage="Nenhum grupo salvo ainda — busque seus grupos na aba ⚙️ Canais."
              />
            ) : null}

            {/* SELEÇÃO DE WHATSAPPS PARA STATUS EM LISTA */}
            {postTarget === 'status' || postTarget === 'both' ? (
              <SelectDropdown
                title="🟢 WhatsApps para Status"
                placeholder="Toque para escolher o WhatsApp..."
                multiSelect
                options={(settings?.whatsappAccounts || []).map((acc) => ({
                  id: acc.id,
                  label: `📱 ${acc.label}`,
                  subtitle: acc.phoneNumber,
                }))}
                selectedIds={selectedWaAccountIds}
                onChange={setSelectedWaAccountIds}
                emptyMessage="Nenhum WhatsApp conectado na nuvem — usaremos o compartilhamento em 1 toque com foto!"
              />
            ) : null}

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 6,
              }}
            >
              <Text style={[styles.modalLabel, { color: colors.textMuted, marginBottom: 0 }]}>
                Legenda pronta (editável):
              </Text>
              <TouchableOpacity
                onPress={async () => {
                  if (!selectedOffer) return;
                  try {
                    const res = await api.generateCopy(selectedOffer);
                    setCaption(res.caption);
                  } catch {
                    // mantém a atual
                  }
                }}
              >
                <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 12 }}>
                  🎲 Gerar outra frase
                </Text>
              </TouchableOpacity>
            </View>
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
              activeOpacity={0.8}
              style={[styles.modalBtn, { backgroundColor: colors.save }]}
              onPress={handlePublishNow}
              disabled={sending}
            >
              {sending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.modalBtnText}>{targetButtonLabel}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.modalBtn, { backgroundColor: colors.primary }]}
              onPress={handleScheduleCloud}
              disabled={sending}
            >
              <Text style={styles.modalBtnText}>☁️ Agendar na Nuvem</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.modalBtn, { backgroundColor: colors.lilac }]}
              onPress={handleOneTapShare}
            >
              <Text style={styles.modalBtnText}>
                📸 Compartilhar Foto + Legenda em 1 Toque
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
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL CONFIGURÁVEL DO PILOTO AUTOMÁTICO (PRO) */}
      <Modal visible={autopilotOpen} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <ScrollView
              showsVerticalScrollIndicator
              contentContainerStyle={{ paddingBottom: 20 }}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                ⚡ Configurar Piloto Automático (08h–22h)
              </Text>

              <Text style={[styles.modalLabel, { color: colors.textMuted }]}>
                📍 Onde o Piloto Automático vai postar?
              </Text>
              <View style={[styles.targetTabs, { backgroundColor: colors.inputBg }]}>
                {(
                  [
                    { id: 'groups', label: '👥 Grupos' },
                    { id: 'status', label: '🟢 Status WA' },
                    { id: 'both', label: '🚀 Ambos' },
                  ] as const
                ).map((t) => {
                  const active = autoTargetMode === t.id;
                  return (
                    <TouchableOpacity
                      key={t.id}
                      activeOpacity={0.8}
                      style={[
                        styles.targetTab,
                        active && { backgroundColor: colors.primary },
                      ]}
                      onPress={() => setAutoTargetMode(t.id)}
                    >
                      <Text
                        style={[
                          styles.targetTabText,
                          { color: active ? '#FFFFFF' : colors.textMuted },
                        ]}
                      >
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

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
                {['5', '10', '20', '30', '40', '50'].map((d) => {
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

              <SelectDropdown
                title="🎯 Escolher Nichos (pode marcar vários)"
                placeholder="Selecione 1 ou mais nichos..."
                multiSelect
                options={NICHES.map((n) => ({
                  id: n.id,
                  label: `${n.icon} ${n.label}`,
                }))}
                selectedIds={autoNiches}
                onChange={(ids) => setAutoNiches(ids as NicheId[])}
              />

              {autoTargetMode === 'groups' || autoTargetMode === 'both' ? (
                <SelectDropdown
                  title="👥 Escolher Grupos do Piloto (pode marcar vários)"
                  placeholder="Selecione os grupos..."
                  multiSelect
                  options={(settings?.channels || [])
                    .filter((c) => c.type !== 'whatsapp_status')
                    .map((ch) => ({
                      id: ch.id,
                      label: ch.name,
                      subtitle: `Nicho: ${NICHES.find((n) => n.id === ch.niche)?.label || 'Todos'}`,
                    }))}
                  selectedIds={autoChannelIds}
                  onChange={setAutoChannelIds}
                  emptyMessage="Nenhum grupo salvo ainda — busque seus grupos na aba ⚙️ Canais."
                />
              ) : null}

              {autoTargetMode === 'status' || autoTargetMode === 'both' ? (
                <SelectDropdown
                  title="🟢 Escolher Status de quais WhatsApps (pode marcar vários)"
                  placeholder="Selecione 1 ou mais WhatsApps para Status..."
                  multiSelect
                  options={(settings?.whatsappAccounts || []).map((acc) => ({
                    id: acc.id,
                    label: `📱 Status — ${acc.label}`,
                    subtitle: acc.phoneNumber,
                  }))}
                  selectedIds={autoWaIds}
                  onChange={setAutoWaIds}
                  emptyMessage="Nenhum WhatsApp conectado — conecte seu número na aba ⚙️ Canais."
                />
              ) : null}

              <View
                style={{
                  backgroundColor: colors.primarySoft,
                  borderRadius: 10,
                  padding: 10,
                  marginBottom: 8,
                }}
              >
                <Text
                  style={{
                    color: colors.primaryDark,
                    fontSize: 12,
                    fontWeight: '700',
                  }}
                >
                  ♾️ Modo Contínuo Automático: posta ofertas novas todos os dias de 08h às 22h (Brasília), sem repetir produtos, até você desligar o botão!
                </Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.modalBtn, { backgroundColor: colors.save, marginTop: 4 }]}
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
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL COLAR LINK REAL (ML / AMAZON / ALIEXPRESS / SHOPEE) */}
      <Modal visible={linkModalOpen} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                🔗 Postar a partir de Link Real
              </Text>
              <Text style={[styles.headerSub, { color: colors.textMuted }]}>
                Cole seu link real de afiliado do Mercado Livre, Amazon, AliExpress ou Shopee — o app monta a legenda chamativa e posta nos grupos ou Status!
              </Text>

              <Text style={[styles.modalLabel, { color: colors.textMuted }]}>
                Link de afiliado (obrigatório):
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: colors.border,
                    color: colors.text,
                    marginBottom: 10,
                  },
                ]}
                placeholderTextColor={colors.textMuted}
                placeholder="https://mercadolivre.com/sec/... ou https://amzn.to/..."
                value={manualUrl}
                onChangeText={setManualUrl}
                autoCapitalize="none"
              />

              <Text style={[styles.modalLabel, { color: colors.textMuted }]}>
                Título do produto (opcional — tenta ler automático):
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: colors.border,
                    color: colors.text,
                    marginBottom: 10,
                  },
                ]}
                placeholderTextColor={colors.textMuted}
                placeholder="Ex: Air Fryer Mondial 4L"
                value={manualTitle}
                onChangeText={setManualTitle}
              />

              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modalLabel, { color: colors.textMuted }]}>
                    Preço R$ (opcional):
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.inputBg,
                        borderColor: colors.border,
                        color: colors.text,
                      },
                    ]}
                    placeholderTextColor={colors.textMuted}
                    placeholder="Ex: 199,90"
                    keyboardType="decimal-pad"
                    value={manualPrice}
                    onChangeText={setManualPrice}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modalLabel, { color: colors.textMuted }]}>
                    Cupom (opcional):
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.inputBg,
                        borderColor: colors.border,
                        color: colors.text,
                      },
                    ]}
                    placeholderTextColor={colors.textMuted}
                    placeholder="Ex: MELI20"
                    value={manualCoupon}
                    onChangeText={setManualCoupon}
                    autoCapitalize="characters"
                  />
                </View>
              </View>

              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.modalBtn, { backgroundColor: colors.save }]}
                onPress={handleParseManualLink}
                disabled={parsingLink}
              >
                {parsingLink ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalBtnText}>
                    ✅ Gerar Oferta e Escolher Onde Postar
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setLinkModalOpen(false)}
              >
                <Text style={[styles.closeBtnText, { color: colors.textMuted }]}>
                  Cancelar
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  headerTitle: {
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
  autopilotBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
    gap: 8,
  },
  autopilotBarTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  autopilotBarSub: {
    fontSize: 11,
    marginTop: 1,
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
    padding: 18,
    maxHeight: '92%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 10,
  },
  targetTabs: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 4,
    marginBottom: 12,
    gap: 4,
  },
  targetTab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
  },
  targetTabText: {
    fontSize: 12,
    fontWeight: '800',
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
    marginBottom: 8,
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
    marginBottom: 8,
  },
  captionInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    height: 125,
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
    width: 76,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
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
