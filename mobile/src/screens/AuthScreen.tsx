import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  api,
  AuthUser,
  getApiBaseUrl,
  setApiBaseUrl,
  setAuthToken,
} from '../services/api';
import { useTheme } from '../theme';

interface AuthScreenProps {
  onAuthenticated: (user: AuthUser, token: string) => void;
}

export function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const { colors } = useTheme();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [serverUrl, setServerUrl] = useState(getApiBaseUrl());
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setApiBaseUrl(serverUrl);
    if (!email.trim() || !password) {
      Alert.alert('Atenção', 'Preencha e-mail e senha.');
      return;
    }
    if (mode === 'register' && name.trim().length < 2) {
      Alert.alert('Atenção', 'Informe seu nome.');
      return;
    }

    setLoading(true);
    try {
      const res =
        mode === 'register'
          ? await api.register(name.trim(), email.trim(), password)
          : await api.login(email.trim(), password);

      setAuthToken(res.token);
      onAuthenticated(res.user, res.token);
    } catch (err: any) {
      Alert.alert(
        'Não foi possível entrar',
        err?.message || 'Verifique se o servidor está online e tente novamente.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={{ paddingBottom: 40, justifyContent: 'center', flexGrow: 1 }}
      >
        <View style={styles.hero}>
          <Text style={[styles.brand, { color: colors.primary }]}>
            💜 OfertaPro Afiliado
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Crie sua conta para salvar sua API da Shopee, conectar vários WhatsApps e agendar postagens na nuvem 24h.
          </Text>
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={[styles.switchRow, { backgroundColor: colors.inputBg }]}>
            <TouchableOpacity
              style={[
                styles.switchBtn,
                mode === 'register' && { backgroundColor: colors.primary },
              ]}
              onPress={() => setMode('register')}
            >
              <Text
                style={[
                  styles.switchText,
                  { color: mode === 'register' ? '#FFFFFF' : colors.textMuted },
                ]}
              >
                Criar Conta
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.switchBtn,
                mode === 'login' && { backgroundColor: colors.primary },
              ]}
              onPress={() => setMode('login')}
            >
              <Text
                style={[
                  styles.switchText,
                  { color: mode === 'login' ? '#FFFFFF' : colors.textMuted },
                ]}
              >
                Já tenho conta
              </Text>
            </TouchableOpacity>
          </View>

          {mode === 'register' ? (
            <>
              <Text style={[styles.label, { color: colors.textMuted }]}>Seu nome</Text>
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
                value={name}
                onChangeText={setName}
                placeholder="Ex: Carlos Silva"
              />
            </>
          ) : null}

          <Text style={[styles.label, { color: colors.textMuted }]}>E-mail</Text>
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
            value={email}
            onChangeText={setEmail}
            placeholder="voce@email.com"
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text style={[styles.label, { color: colors.textMuted }]}>Senha</Text>
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
            value={password}
            onChangeText={setPassword}
            placeholder="Mínimo 6 caracteres"
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: colors.primary }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitText}>
                {mode === 'register' ? 'Criar Conta Grátis' : 'Entrar na Área do Afiliado'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.serverToggle}
            onPress={() => setShowServerConfig((v) => !v)}
          >
            <Text style={[styles.serverToggleText, { color: colors.textMuted }]}>
              ⚙️ {showServerConfig ? 'Ocultar' : 'Configurar'} endereço do servidor (teste local)
            </Text>
          </TouchableOpacity>

          {showServerConfig ? (
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
              value={serverUrl}
              onChangeText={setServerUrl}
              placeholder="http://192.168.1.8:3333"
              autoCapitalize="none"
            />
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 18,
  },
  hero: {
    marginBottom: 18,
    alignItems: 'center',
  },
  brand: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
  },
  card: {
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
  },
  switchRow: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
  },
  switchBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
  },
  switchText: {
    fontSize: 13,
    fontWeight: '700',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 12,
  },
  submitBtn: {
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  submitText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  serverToggle: {
    marginTop: 14,
    marginBottom: 8,
    alignItems: 'center',
  },
  serverToggleText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
