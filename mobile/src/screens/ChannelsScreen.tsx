import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import {
  api,
  AutomationSettings,
  ChannelType,
  getApiBaseUrl,
  NICHES,
  NicheId,
  setApiBaseUrl,
  WhatsAppProviderType,
} from '../services/api';
import { useTheme } from '../theme';

interface ChannelsScreenProps {
  settings: AutomationSettings | null;
  onRefreshSettings: () => void;
  onOpenPro: () => void;
}

export function ChannelsScreen({
  settings,
  onRefreshSettings,
  onOpenPro,
}: ChannelsScreenProps) {
  const { colors } = useTheme();
  const [serverUrl, setServerUrl] = useState(getApiBaseUrl());

  const [shopeeAppId, setShopeeAppId] = useState('');
  const [shopeeAppSecret, setShopeeAppSecret] = useState('');
  const [amazonTag, setAmazonTag] = useState('');
  const [mlTag, setMlTag] = useState('');

  const [waLabel, setWaLabel] = useState('');
  const [waPhone, setWaPhone] = useState('');
  const [pairingLoading, setPairingLoading] = useState(false);
  const [pairingResult, setPairingResult] = useState<{
    code: string;
    phone: string;
    mode: 'live' | 'demo';
    instructions: string;
  } | null>(null);
  const [showAdvancedWa, setShowAdvancedWa] = useState(false);
  const [waProvider, setWaProvider] = useState<WhatsAppProviderType>('evolution_webhook');
  const [waApiUrl, setWaApiUrl] = useState('');
  const [waToken, setWaToken] = useState('');
  const [waInstance, setWaInstance] = useState('');

  const [channelType, setChannelType] = useState<ChannelType>('whatsapp_group');
  const [channelName, setChannelName] = useState('');
  const [channelNiche, setChannelNiche] = useState<NicheId>('todos');
  const [selectedWaId, setSelectedWaId] = useState<string>('');
  const [targetId, setTargetId] = useState('');
  const [telegramToken, setTelegramToken] = useState('');
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [fetchedGroups, setFetchedGroups] = useState<
    Array<{ id: string; name: string; participantsCount: number }>
  >([]);

  useEffect(() => {
    if (settings) {
      setShopeeAppId(settings.credentials.shopeeAppId || '');
      setShopeeAppSecret(settings.credentials.shopeeAppSecret || '');
      setAmazonTag(settings.credentials.amazonTag || '');
      setMlTag(settings.credentials.mercadoLivreTag || '');
      if (!selectedWaId && settings.whatsappAccounts.length > 0) {
        setSelectedWaId(settings.whatsappAccounts[0].id);
      }
    }
  }, [settings]);

  async function handlePairByPhone() {
    if (!waPhone.trim()) {
      Alert.alert('Atenção', 'Digite o número de celular com DDD (ex: 11999998888).');
      return;
    }

    setPairingLoading(true);
    try {
      const res = await api.pairWhatsAppByPhone(
        waLabel.trim() || `WhatsApp ${waPhone.replace(/\D/g, '').slice(-4)}`,
        waPhone.trim()
      );
      setPairingResult({
        code: res.pairingCode,
        phone: res.account.phoneNumber,
        mode: res.mode,
        instructions: res.instructions,
      });
      setWaLabel('');
      setWaPhone('');
      setSelectedWaId(res.account.id);
      onRefreshSettings();
    } catch (err: any) {
      if (err?.code === 'PRO_REQUIRED') {
        Alert.alert('Múltiplos WhatsApps (PRO)', err.message, [
          { text: 'Depois', style: 'cancel' },
          { text: 'Ver Plano PRO', onPress: onOpenPro },
        ]);
      } else {
        Alert.alert('Erro', err?.message || 'Não foi possível gerar o código.');
      }
    } finally {
      setPairingLoading(false);
    }
  }

  async function handleAddWhatsApp() {
    if (!waLabel.trim() || !waPhone.trim()) {
      Alert.alert('Atenção', 'Informe um nome (ex: WhatsApp Casa) e o número.');
      return;
    }

    try {
      const created = await api.addWhatsAppAccount({
        label: waLabel.trim(),
        phoneNumber: waPhone.trim(),
        provider: waProvider,
        apiUrl: waApiUrl.trim(),
        apiToken: waToken.trim(),
        instanceName: waInstance.trim() || undefined,
      });
      setWaLabel('');
      setWaPhone('');
      setWaApiUrl('');
      setWaToken('');
      setWaInstance('');
      setSelectedWaId(created.id);
      onRefreshSettings();
      Alert.alert(
        'WhatsApp conectado! 📱',
        `"${created.label}" salvo. Agora você pode vincular grupos e Status a este número.`
      );
    } catch (err: any) {
      if (err?.code === 'PRO_REQUIRED') {
        Alert.alert('Múltiplos WhatsApps (PRO)', err.message, [
          { text: 'Depois', style: 'cancel' },
          { text: 'Ver Plano PRO', onPress: onOpenPro },
        ]);
      } else {
        Alert.alert('Erro', err?.message || 'Não foi possível conectar o WhatsApp.');
      }
    }
  }

  async function handleSaveCredentials() {
    try {
      await api.saveCredentials({
        shopeeAppId,
        shopeeAppSecret,
        amazonTag,
        mercadoLivreTag: mlTag,
      });
      Alert.alert('Salvo! ✅', 'Suas chaves oficiais de afiliado foram atualizadas.');
      onRefreshSettings();
    } catch (err: any) {
      Alert.alert('Erro', err?.message || 'Não foi possível salvar.');
    }
  }

  async function handleFetchWhatsAppGroups() {
    const accountId = selectedWaId || settings?.whatsappAccounts[0]?.id;
    if (!accountId) {
      Alert.alert(
        'Conecte um WhatsApp primeiro',
        'Conecte pelo menos 1 número acima para buscar seus grupos automaticamente.'
      );
      return;
    }

    setLoadingGroups(true);
    try {
      const res = await api.getWhatsAppGroups(accountId);
      setFetchedGroups(res.groups);
      if (res.groups.length === 0) {
        Alert.alert(
          'Nenhum grupo encontrado',
          res.connected
            ? 'Este WhatsApp ainda não participa de nenhum grupo.'
            : 'Este WhatsApp ainda está sincronizando ou não foi pareado. Aguarde alguns segundos e tente de novo.'
        );
      }
    } catch (err: any) {
      Alert.alert('Erro', err?.message || 'Não foi possível buscar os grupos.');
    } finally {
      setLoadingGroups(false);
    }
  }

  async function handleQuickAddGroup(group: { id: string; name: string }) {
    const accountId = selectedWaId || settings?.whatsappAccounts[0]?.id;
    try {
      await api.addChannel({
        name: group.name,
        type: 'whatsapp_group',
        niche: channelNiche,
        whatsappAccountId: accountId,
        targetId: group.id,
      });
      onRefreshSettings();
      Alert.alert(
        'Grupo adicionado! ✅',
        `"${group.name}" salvo no nicho ${getNicheLabel(channelNiche)}.`
      );
    } catch (err: any) {
      if (err?.code === 'PRO_REQUIRED') {
        Alert.alert('Limite do Plano Grátis', err.message, [
          { text: 'Depois', style: 'cancel' },
          { text: 'Ver Plano PRO', onPress: onOpenPro },
        ]);
      } else {
        Alert.alert('Erro', err?.message || 'Não foi possível salvar este grupo.');
      }
    }
  }

  async function handleAddChannel() {
    const isStatus = channelType === 'whatsapp_status';
    const effectiveTarget = isStatus ? 'status@broadcast' : targetId.trim();

    if (!channelName.trim() || !effectiveTarget) {
      Alert.alert('Atenção', 'Preencha o nome do canal/grupo e o ID de destino.');
      return;
    }

    if (
      (channelType === 'whatsapp_group' || isStatus) &&
      (!settings?.whatsappAccounts || settings.whatsappAccounts.length === 0)
    ) {
      Alert.alert(
        'Conecte um WhatsApp primeiro',
        'Adicione pelo menos 1 número na seção "Meus WhatsApps Conectados" acima.'
      );
      return;
    }

    try {
      await api.addChannel({
        name: channelName.trim(),
        type: channelType,
        niche: channelNiche,
        whatsappAccountId:
          channelType === 'whatsapp_group' || isStatus
            ? selectedWaId || settings?.whatsappAccounts[0]?.id
            : undefined,
        targetId: effectiveTarget,
        token: channelType === 'telegram' ? telegramToken.trim() || undefined : undefined,
      });
      setChannelName('');
      setTargetId('');
      setTelegramToken('');
      onRefreshSettings();
      Alert.alert(
        isStatus ? 'Status salvo! 🟢' : 'Grupo salvo! ✅',
        'Já está pronto para disparos automáticos e agendados.'
      );
    } catch (err: any) {
      if (err?.code === 'PRO_REQUIRED') {
        Alert.alert('Limite do Plano Grátis', err.message, [
          { text: 'Depois', style: 'cancel' },
          { text: 'Ver Plano PRO', onPress: onOpenPro },
        ]);
      } else {
        Alert.alert('Erro', err?.message || 'Não foi possível adicionar grupo.');
      }
    }
  }

  function getNicheLabel(id: NicheId): string {
    const found = NICHES.find((n) => n.id === id);
    return found ? `${found.icon} ${found.label}` : '🌟 Todos';
  }

  function getWhatsAppLabel(accountId?: string): string {
    if (!accountId) return '';
    const acc = settings?.whatsappAccounts.find((a) => a.id === accountId);
    return acc ? `📱 ${acc.label}` : '';
  }

  const inputThemeStyle = {
    backgroundColor: colors.inputBg,
    borderColor: colors.border,
    color: colors.text,
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <Text style={[styles.headerTitle, { color: colors.text }]}>
        ⚙️ WhatsApps, Grupos & APIs
      </Text>
      <Text style={[styles.headerSub, { color: colors.textMuted }]}>
        Conecte vários números de WhatsApp e organize seus grupos por Nicho.
      </Text>

      {/* 1. CONECTAR MÚLTIPLOS WHATSAPPS */}
      <View
        style={[
          styles.section,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          📱 Meus WhatsApps Conectados ({settings?.whatsappAccounts.length || 0})
        </Text>
        <Text style={[styles.helperText, { color: colors.textMuted }]}>
          Conecte mais de um número para dividir seus grupos por nicho e evitar bloqueios.
        </Text>

        {settings?.whatsappAccounts.map((acc) => (
          <View
            key={acc.id}
            style={[styles.waRow, { borderBottomColor: colors.border }]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.channelName, { color: colors.text }]}>
                🟢 {acc.label} — {acc.phoneNumber}
              </Text>
              <Text style={[styles.channelMeta, { color: colors.primaryDark }]}>
                {acc.provider.toUpperCase()} {acc.instanceName ? `• ${acc.instanceName}` : ''}
              </Text>
            </View>
            <TouchableOpacity
              onPress={async () => {
                await api.deleteWhatsAppAccount(acc.id);
                onRefreshSettings();
              }}
            >
              <Text style={[styles.deleteText, { color: colors.danger }]}>Remover</Text>
            </TouchableOpacity>
          </View>
        ))}

        <Text style={[styles.label, { color: colors.textMuted, marginTop: 10 }]}>
          Conectar novo WhatsApp pelo número de celular:
        </Text>

        <TextInput
          style={[styles.input, inputThemeStyle]}
          placeholderTextColor={colors.textMuted}
          value={waLabel}
          onChangeText={setWaLabel}
          placeholder="Apelido (Ex: WhatsApp 01 - Casa)"
        />
        <TextInput
          style={[styles.input, inputThemeStyle]}
          placeholderTextColor={colors.textMuted}
          value={waPhone}
          onChangeText={setWaPhone}
          placeholder="Número com DDD (Ex: 11999998888)"
          keyboardType="phone-pad"
        />

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.save }]}
          onPress={handlePairByPhone}
          disabled={pairingLoading}
        >
          {pairingLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryBtnText}>
              ✅ Conectar pelo Número (Gerar Código)
            </Text>
          )}
        </TouchableOpacity>

        {pairingResult ? (
          <View
            style={[
              styles.pairingBox,
              {
                backgroundColor: colors.primarySoft,
                borderColor: colors.primary,
              },
            ]}
          >
            <Text style={[styles.pairingTitle, { color: colors.primaryDark }]}>
              📲 Código de Pareamento ({pairingResult.phone})
            </Text>
            <Text style={[styles.pairingCode, { color: colors.text }]}>
              {pairingResult.code}
            </Text>
            <Text style={[styles.pairingHint, { color: colors.textMuted }]}>
              {pairingResult.instructions}
            </Text>
            {pairingResult.mode === 'demo' ? (
              <Text style={[styles.pairingDemoNote, { color: colors.warning }]}>
                ⚠️ Modo teste: para parear no WhatsApp real, adicione EVOLUTION_API_URL e EVOLUTION_API_KEY no backend/.env.
              </Text>
            ) : null}
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.save, marginTop: 8 }]}
              onPress={async () => {
                await Clipboard.setStringAsync(pairingResult.code.replace('-', ''));
                Alert.alert('Código copiado! ✅', 'Agora cole no seu WhatsApp em Aparelhos Conectados.');
              }}
            >
              <Text style={styles.primaryBtnText}>📋 Copiar Código</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <TouchableOpacity
          style={{ marginTop: 12, alignItems: 'center' }}
          onPress={() => setShowAdvancedWa((v) => !v)}
        >
          <Text style={[styles.label, { color: colors.primary }]}>
            {showAdvancedWa ? '▲ Ocultar' : '⚙️ Configurar'} API própria (avançado)
          </Text>
        </TouchableOpacity>

        {showAdvancedWa ? (
          <View style={{ marginTop: 6 }}>
            <View style={styles.typeRow}>
              {(
                [
                  { id: 'evolution_webhook', label: 'Evolution API' },
                  { id: 'zapi_webhook', label: 'Z-API' },
                  { id: 'cloud_api', label: 'Meta Oficial' },
                ] as const
              ).map((p) => {
                const active = waProvider === p.id;
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={[
                      styles.typeChip,
                      {
                        borderColor: active ? colors.primary : colors.border,
                        backgroundColor: active ? colors.primarySoft : colors.inputBg,
                      },
                    ]}
                    onPress={() => setWaProvider(p.id)}
                  >
                    <Text
                      style={[
                        styles.typeChipText,
                        { color: active ? colors.primaryDark : colors.textMuted },
                      ]}
                    >
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TextInput
              style={[styles.input, inputThemeStyle]}
              placeholderTextColor={colors.textMuted}
              value={waApiUrl}
              onChangeText={setWaApiUrl}
              placeholder="URL da instância (Ex: https://api.suaevolution.com)"
              autoCapitalize="none"
            />
            <TextInput
              style={[styles.input, inputThemeStyle]}
              placeholderTextColor={colors.textMuted}
              value={waInstance}
              onChangeText={setWaInstance}
              placeholder="Nome da instância ou Phone Number ID"
              autoCapitalize="none"
            />
            <TextInput
              style={[styles.input, inputThemeStyle]}
              placeholderTextColor={colors.textMuted}
              value={waToken}
              onChangeText={setWaToken}
              placeholder="API Key / Token"
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.save }]}
              onPress={handleAddWhatsApp}
            >
              <Text style={styles.primaryBtnText}>✅ Salvar Conexão Avançada</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      {/* 2. CADASTRAR GRUPOS POR NICHO */}
      <View
        style={[
          styles.section,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          📡 Cadastrar Grupo / Status por Nicho
        </Text>
        <View style={styles.typeRow}>
          {(
            [
              { id: 'whatsapp_group', label: '📱 Grupo WA' },
              { id: 'whatsapp_status', label: '🟢 Status WA' },
              { id: 'telegram', label: '✈️ Telegram' },
            ] as const
          ).map((t) => {
            const active = channelType === t.id;
            return (
              <TouchableOpacity
                key={t.id}
                style={[
                  styles.typeChip,
                  {
                    borderColor: active ? colors.primary : colors.border,
                    backgroundColor: active ? colors.primarySoft : colors.inputBg,
                  },
                ]}
                onPress={() => setChannelType(t.id)}
              >
                <Text
                  style={[
                    styles.typeChipText,
                    { color: active ? colors.primaryDark : colors.textMuted },
                  ]}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {(channelType === 'whatsapp_group' || channelType === 'whatsapp_status') &&
        settings &&
        settings.whatsappAccounts.length > 0 ? (
          <>
            <Text style={[styles.label, { color: colors.textMuted }]}>
              Qual WhatsApp vai postar?
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 10 }}
            >
              {settings.whatsappAccounts.map((acc) => {
                const active = selectedWaId === acc.id;
                return (
                  <TouchableOpacity
                    key={acc.id}
                    style={[
                      styles.nicheChip,
                      {
                        backgroundColor: active ? colors.primary : colors.inputBg,
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setSelectedWaId(acc.id)}
                  >
                    <Text
                      style={[
                        styles.nicheChipText,
                        { color: active ? '#FFFFFF' : colors.text },
                      ]}
                    >
                      📱 {acc.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </>
        ) : null}

        <Text style={[styles.label, { color: colors.textMuted }]}>Nicho:</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 10 }}
        >
          {NICHES.map((n) => {
            const active = channelNiche === n.id;
            return (
              <TouchableOpacity
                key={n.id}
                style={[
                  styles.nicheChip,
                  {
                    backgroundColor: active ? colors.primary : colors.inputBg,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setChannelNiche(n.id)}
              >
                <Text
                  style={[
                    styles.nicheChipText,
                    { color: active ? '#FFFFFF' : colors.text },
                  ]}
                >
                  {n.icon} {n.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {channelType === 'whatsapp_group' ? (
          <View style={{ marginBottom: 12 }}>
            <TouchableOpacity
              style={[
                styles.saveBtn,
                { backgroundColor: colors.primary, marginBottom: 8 },
              ]}
              onPress={handleFetchWhatsAppGroups}
              disabled={loadingGroups}
            >
              {loadingGroups ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryBtnText}>
                  🔍 Buscar Meus Grupos do WhatsApp Automaticamente
                </Text>
              )}
            </TouchableOpacity>

            {fetchedGroups.length > 0 ? (
              <View
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 10,
                  padding: 8,
                  backgroundColor: colors.inputBg,
                }}
              >
                <Text style={[styles.label, { color: colors.primaryDark }]}>
                  Toque em "+ Salvar" nos grupos que deseja adicionar ao nicho{' '}
                  {getNicheLabel(channelNiche)}:
                </Text>
                {fetchedGroups.map((g) => (
                  <View
                    key={g.id}
                    style={[
                      styles.waRow,
                      { borderBottomColor: colors.border },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.channelName, { color: colors.text }]}>
                        👥 {g.name}
                      </Text>
                      <Text style={[styles.channelIdSmall, { color: colors.textMuted }]}>
                        {g.participantsCount} participantes
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={{
                        backgroundColor: colors.save,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 8,
                      }}
                      onPress={() => handleQuickAddGroup(g)}
                    >
                      <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 12 }}>
                        + Salvar
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        <TextInput
          style={[styles.input, inputThemeStyle]}
          placeholderTextColor={colors.textMuted}
          value={channelName}
          onChangeText={setChannelName}
          placeholder={
            channelType === 'whatsapp_status'
              ? 'Nome (Ex: Meu Status Ofertas #1)'
              : 'Ou digite manualmente o nome do grupo'
          }
        />
        {channelType !== 'whatsapp_status' ? (
          <TextInput
            style={[styles.input, inputThemeStyle]}
            placeholderTextColor={colors.textMuted}
            value={targetId}
            onChangeText={setTargetId}
            placeholder={
              channelType === 'telegram'
                ? 'Chat ID (-100...) ou @seucanal'
                : 'ID do Grupo WhatsApp (Ex: 120363042...@g.us)'
            }
            autoCapitalize="none"
          />
        ) : null}
        {channelType === 'telegram' ? (
          <TextInput
            style={[styles.input, inputThemeStyle]}
            placeholderTextColor={colors.textMuted}
            value={telegramToken}
            onChangeText={setTelegramToken}
            placeholder="Token do Bot (@BotFather)"
            autoCapitalize="none"
          />
        ) : null}

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.save }]}
          onPress={handleAddChannel}
        >
          <Text style={styles.primaryBtnText}>✅ Salvar Grupo / Status no Nicho</Text>
        </TouchableOpacity>
      </View>

      {/* 3. LISTA DE GRUPOS */}
      <View
        style={[
          styles.section,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          📋 Grupos e Status Cadastrados ({settings?.channels.length || 0})
        </Text>
        {settings?.channels.length ? (
          settings.channels.map((c) => (
            <View
              key={c.id}
              style={[styles.channelRow, { borderBottomColor: colors.border }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.channelName, { color: colors.text }]}>
                  {c.name}
                </Text>
                <Text style={[styles.channelMeta, { color: colors.primaryDark }]}>
                  {getNicheLabel(c.niche)}{' '}
                  {c.whatsappAccountId ? `• ${getWhatsAppLabel(c.whatsappAccountId)}` : ''}
                </Text>
                <Text style={[styles.channelIdSmall, { color: colors.textMuted }]}>
                  {c.targetId}
                </Text>
              </View>
              <Switch
                value={c.enabled}
                onValueChange={async (val) => {
                  await api.toggleChannel(c.id, val);
                  onRefreshSettings();
                }}
              />
              <TouchableOpacity
                onPress={async () => {
                  await api.deleteChannel(c.id);
                  onRefreshSettings();
                }}
              >
                <Text style={[styles.deleteText, { color: colors.danger }]}>Excluir</Text>
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Nenhum grupo cadastrado ainda.
          </Text>
        )}
      </View>

      {/* 4. CREDENCIAIS SHOPEE E OUTRAS LOJAS */}
      <View
        style={[
          styles.section,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          🛍️ APIs de Afiliado
        </Text>
        <Text style={[styles.label, { color: colors.textMuted }]}>
          Shopee Open API — App ID
        </Text>
        <TextInput
          style={[styles.input, inputThemeStyle]}
          placeholderTextColor={colors.textMuted}
          value={shopeeAppId}
          onChangeText={setShopeeAppId}
          placeholder="Ex: 18345670001"
          autoCapitalize="none"
        />
        <Text style={[styles.label, { color: colors.textMuted }]}>
          Shopee Open API — Secret
        </Text>
        <TextInput
          style={[styles.input, inputThemeStyle]}
          placeholderTextColor={colors.textMuted}
          value={shopeeAppSecret}
          onChangeText={setShopeeAppSecret}
          placeholder="Sua chave secreta da Shopee"
          secureTextEntry
          autoCapitalize="none"
        />
        <Text style={[styles.label, { color: colors.textMuted }]}>
          Tag de Associado Amazon (opcional)
        </Text>
        <TextInput
          style={[styles.input, inputThemeStyle]}
          placeholderTextColor={colors.textMuted}
          value={amazonTag}
          onChangeText={setAmazonTag}
          placeholder="Ex: ofertapro-20"
          autoCapitalize="none"
        />
        <Text style={[styles.label, { color: colors.textMuted }]}>
          Tag Mercado Livre (opcional)
        </Text>
        <TextInput
          style={[styles.input, inputThemeStyle]}
          placeholderTextColor={colors.textMuted}
          value={mlTag}
          onChangeText={setMlTag}
          placeholder="Ex: meu_canal_ofertas"
          autoCapitalize="none"
        />
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.save }]}
          onPress={handleSaveCredentials}
        >
          <Text style={styles.primaryBtnText}>✅ Salvar Credenciais</Text>
        </TouchableOpacity>
      </View>

      {/* 5. SERVIDOR NA NUVEM */}
      <View
        style={[
          styles.section,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          ☁️ Servidor na Nuvem
        </Text>
        <TextInput
          style={[styles.input, inputThemeStyle]}
          placeholderTextColor={colors.textMuted}
          value={serverUrl}
          onChangeText={setServerUrl}
          placeholder="https://ofertapro-api.onrender.com"
          autoCapitalize="none"
        />
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.save }]}
          onPress={() => {
            setApiBaseUrl(serverUrl);
            onRefreshSettings();
            Alert.alert('Servidor salvo ✅', serverUrl);
          }}
        >
          <Text style={styles.primaryBtnText}>✅ Salvar e Conectar Servidor</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
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
    fontSize: 13,
    marginBottom: 14,
  },
  section: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 6,
  },
  helperText: {
    fontSize: 12,
    marginBottom: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    marginBottom: 10,
  },
  saveBtn: {
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  typeChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  typeChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  nicheChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 6,
  },
  nicheChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  waRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    gap: 8,
  },
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  channelName: {
    fontSize: 13,
    fontWeight: '700',
  },
  channelMeta: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  channelIdSmall: {
    fontSize: 10,
  },
  deleteText: {
    fontWeight: '700',
    fontSize: 12,
  },
  emptyText: {
    fontSize: 13,
  },
  pairingBox: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    padding: 14,
    alignItems: 'center',
  },
  pairingTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 6,
  },
  pairingCode: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 3,
    marginVertical: 4,
  },
  pairingHint: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
  },
  pairingDemoNote: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 6,
    fontWeight: '600',
  },
});
