import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { api, ScheduledPost } from '../services/api';
import { useTheme } from '../theme';

export function SchedulerScreen() {
  const { colors } = useTheme();
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadSchedule() {
    setLoading(true);
    try {
      const res = await api.getSchedule();
      setPosts(res.posts);
    } catch {
      // Silencioso se offline
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSchedule();
  }, []);

  async function handleDelete(id: string) {
    await api.deleteScheduledPost(id);
    loadSchedule();
  }

  async function handleRunNow() {
    try {
      const res = await api.runSchedulerNow();
      Alert.alert(
        'Agendador executado',
        `${res.processed} postagem(ns) vencida(s) processada(s).`
      );
      loadSchedule();
    } catch (err: any) {
      Alert.alert('Erro', err?.message || 'Falha ao executar fila.');
    }
  }

  function statusStyle(status: ScheduledPost['status']) {
    if (status === 'sent')
      return { bg: colors.successSoft, color: colors.success, label: 'Enviado' };
    if (status === 'failed')
      return { bg: colors.dangerSoft, color: colors.danger, label: 'Falhou' };
    return { bg: colors.primarySoft, color: colors.primaryDark, label: 'Na fila ☁️' };
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.topRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            ☁️ Agendador na Nuvem
          </Text>
          <Text style={[styles.headerSub, { color: colors.textMuted }]}>
            Roda 24h no servidor mesmo com seu celular desligado.
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.runBtn, { backgroundColor: colors.primary }]}
          onPress={handleRunNow}
        >
          <Text style={styles.runBtnText}>Processar</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadSchedule} />}
        renderItem={({ item }) => {
          const st = statusStyle(item.status);
          const dateLabel = new Date(item.scheduledFor).toLocaleString('pt-BR');
          return (
            <View
              style={[
                styles.card,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.badge, { backgroundColor: st.bg }]}>
                  <Text style={[styles.badgeText, { color: st.color }]}>{st.label}</Text>
                </View>
                <Text style={[styles.dateText, { color: colors.textMuted }]}>
                  {dateLabel}
                </Text>
              </View>
              <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
                {item.offer.title}
              </Text>
              {item.errorMessage ? (
                <Text style={[styles.errorText, { color: colors.danger }]}>
                  {item.errorMessage}
                </Text>
              ) : null}
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDelete(item.id)}
              >
                <Text style={[styles.deleteBtnText, { color: colors.danger }]}>
                  Remover da fila
                </Text>
              </TouchableOpacity>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              Sua fila na nuvem está vazia
            </Text>
            <Text style={[styles.emptySub, { color: colors.textMuted }]}>
              Vá na aba "Automação", escolha um nicho e agende suas ofertas na nuvem.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  headerSub: {
    fontSize: 12,
  },
  runBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  runBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  card: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  dateText: {
    fontSize: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  errorText: {
    fontSize: 12,
    marginBottom: 6,
  },
  deleteBtn: {
    alignSelf: 'flex-end',
  },
  deleteBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyBox: {
    marginTop: 48,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
  },
});
