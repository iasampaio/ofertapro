import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { api, AuthUser, AutomationSettings, setAuthToken } from './src/services/api';
import { ShowcaseScreen } from './src/screens/ShowcaseScreen';
import { SearchGeneratorScreen } from './src/screens/SearchGeneratorScreen';
import { SchedulerScreen } from './src/screens/SchedulerScreen';
import { ChannelsScreen } from './src/screens/ChannelsScreen';
import { ProPlanScreen } from './src/screens/ProPlanScreen';
import { AuthScreen } from './src/screens/AuthScreen';
import { ThemeProvider, useTheme } from './src/theme';

type ScreenKey = 'showcase' | 'automation' | 'scheduler' | 'channels' | 'pro';

const MENU_ITEMS: Array<{
  key: ScreenKey;
  icon: string;
  label: string;
  subtitle: string;
}> = [
  {
    key: 'showcase',
    icon: '🔥',
    label: 'Vitrine & Cupons',
    subtitle: 'Achadinhos das 4 lojas + Cupons',
  },
  {
    key: 'automation',
    icon: '🤖',
    label: 'Automação por Nicho',
    subtitle: 'Piloto Automático (08h–22h) e Disparos',
  },
  {
    key: 'scheduler',
    icon: '☁️',
    label: 'Agendador na Nuvem',
    subtitle: 'Fila de postagens 24h',
  },
  {
    key: 'channels',
    icon: '⚙️',
    label: 'Canais, WhatsApps & APIs',
    subtitle: 'Números, grupos, Status e chaves',
  },
  {
    key: 'pro',
    icon: '👑',
    label: 'Plano Afiliado PRO',
    subtitle: 'Desbloquear Piloto Automático e ilimitado',
  },
];

const DRAWER_WIDTH = Math.min(290, Math.round(Dimensions.get('window').width * 0.8));

function MainApp() {
  const { colors, isDark, toggleTheme } = useTheme();
  const [activeScreen, setActiveScreen] = useState<ScreenKey>('showcase');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [settings, setSettings] = useState<AutomationSettings | null>(null);

  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  async function refreshSettings() {
    try {
      const data = await api.getSettings();
      setSettings(data);
    } catch {
      // Usuário não logado ou servidor offline
    }
  }

  useEffect(() => {
    if (user) {
      refreshSettings();
    } else {
      setSettings(null);
    }
  }, [user]);

  function openDrawer() {
    setDrawerOpen(true);
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }

  function closeDrawer() {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -DRAWER_WIDTH,
        duration: 190,
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 190,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setDrawerOpen(false);
    });
  }

  function toggleDrawer() {
    if (drawerOpen) {
      closeDrawer();
    } else {
      openDrawer();
    }
  }

  function navigateTo(screen: ScreenKey) {
    setActiveScreen(screen);
    closeDrawer();
  }

  function handleLogout() {
    setAuthToken(null);
    setUser(null);
    setSettings(null);
    setActiveScreen('showcase');
    closeDrawer();
  }

  const requiresLogin = activeScreen !== 'showcase' && !user;
  const currentMenuItem = MENU_ITEMS.find((m) => m.key === activeScreen);

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Barra Superior com Menu Hambúrguer (☰) + Título + Botão Tema */}
      <View
        style={[
          styles.topBar,
          { backgroundColor: colors.tabBg, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.7}
          style={[styles.hamburgerBtn, { backgroundColor: colors.primarySoft }]}
          onPress={toggleDrawer}
          accessibilityLabel="Abrir ou fechar menu lateral"
        >
          <View style={[styles.bar, { backgroundColor: colors.primary }]} />
          <View style={[styles.bar, { backgroundColor: colors.primary }]} />
          <View style={[styles.bar, { backgroundColor: colors.primary }]} />
        </TouchableOpacity>

        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={[styles.brandText, { color: colors.primary }]} numberOfLines={1}>
            💜 OfertaPro
          </Text>
          <Text style={[styles.screenSub, { color: colors.textMuted }]} numberOfLines={1}>
            {currentMenuItem?.label}
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.75}
          style={[styles.themeBtn, { backgroundColor: colors.primarySoft }]}
          onPress={toggleTheme}
        >
          <Text style={[styles.themeBtnText, { color: colors.primaryDark }]}>
            {isDark ? '☀️ Claro' : '🌙 Escuro'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Conteúdo Principal (100% da tela livre, sem barra inferior) */}
      <View style={styles.content}>
        {activeScreen === 'showcase' ? (
          <ShowcaseScreen isPro={settings?.plan === 'pro'} />
        ) : requiresLogin ? (
          <AuthScreen
            onAuthenticated={(loggedUser) => {
              setUser(loggedUser);
            }}
          />
        ) : (
          <>
            {activeScreen === 'automation' && (
              <SearchGeneratorScreen
                settings={settings}
                onRefreshSettings={refreshSettings}
                onOpenPro={() => setActiveScreen('pro')}
              />
            )}
            {activeScreen === 'scheduler' && <SchedulerScreen />}
            {activeScreen === 'channels' && (
              <ChannelsScreen
                settings={settings}
                onRefreshSettings={refreshSettings}
                onOpenPro={() => setActiveScreen('pro')}
              />
            )}
            {activeScreen === 'pro' && (
              <ProPlanScreen
                currentPlan={settings?.plan || 'free'}
                onPlanChanged={refreshSettings}
              />
            )}
          </>
        )}
      </View>

      {/* Menu Lateral Retrátil (Overlay + Gaveta Animada) */}
      {drawerOpen ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <Animated.View
            style={[
              styles.backdrop,
              {
                opacity: backdropAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.55],
                }),
              },
            ]}
          >
            <Pressable style={StyleSheet.absoluteFill} onPress={closeDrawer} />
          </Animated.View>

          <Animated.View
            style={[
              styles.drawer,
              {
                width: DRAWER_WIDTH,
                backgroundColor: colors.card,
                borderRightColor: colors.border,
                transform: [{ translateX: slideAnim }],
              },
            ]}
          >
            <View
              style={[
                styles.drawerHeader,
                { backgroundColor: colors.proBg, borderBottomColor: colors.border },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.drawerBrand}>💜 OfertaPro</Text>
                <Text style={styles.drawerUser} numberOfLines={1}>
                  {user
                    ? `${user.name} • ${settings?.plan === 'pro' ? 'PRO 👑' : 'Grátis'}`
                    : 'Vitrine & Automação de Afiliados'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.drawerCloseBtn}
                onPress={closeDrawer}
              >
                <Text style={styles.drawerCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.drawerList}>
              {MENU_ITEMS.map((item) => {
                const active = activeScreen === item.key;
                return (
                  <TouchableOpacity
                    key={item.key}
                    activeOpacity={0.75}
                    style={[
                      styles.drawerItem,
                      {
                        backgroundColor: active ? colors.primarySoft : 'transparent',
                        borderLeftColor: active ? colors.primary : 'transparent',
                      },
                    ]}
                    onPress={() => navigateTo(item.key)}
                  >
                    <Text style={styles.drawerItemIcon}>{item.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.drawerItemLabel,
                          {
                            color: active ? colors.primaryDark : colors.text,
                            fontWeight: active ? '800' : '700',
                          },
                        ]}
                      >
                        {item.label}
                      </Text>
                      <Text
                        style={[styles.drawerItemSub, { color: colors.textMuted }]}
                        numberOfLines={1}
                      >
                        {item.subtitle}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View
              style={[styles.drawerFooter, { borderTopColor: colors.border }]}
            >
              <TouchableOpacity
                style={[styles.drawerFooterBtn, { backgroundColor: colors.primarySoft }]}
                onPress={toggleTheme}
              >
                <Text style={[styles.drawerFooterText, { color: colors.primaryDark }]}>
                  {isDark ? '☀️ Mudar para Tema Claro' : '🌙 Mudar para Tema Escuro'}
                </Text>
              </TouchableOpacity>

              {user ? (
                <TouchableOpacity
                  style={[
                    styles.drawerFooterBtn,
                    { backgroundColor: colors.dangerSoft, marginTop: 8 },
                  ]}
                  onPress={handleLogout}
                >
                  <Text style={[styles.drawerFooterText, { color: colors.danger }]}>
                    🚪 Sair da Conta
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </Animated.View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <MainApp />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  hamburgerBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  bar: {
    width: 18,
    height: 2.5,
    borderRadius: 2,
  },
  brandText: {
    fontSize: 15,
    fontWeight: '800',
  },
  screenSub: {
    fontSize: 11,
    fontWeight: '600',
  },
  themeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  themeBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#000000',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    borderRightWidth: 1,
    elevation: 16,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 42,
    paddingBottom: 18,
    borderBottomWidth: 1,
  },
  drawerBrand: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  drawerUser: {
    color: '#E9D5FF',
    fontSize: 12,
    marginTop: 3,
  },
  drawerCloseBtn: {
    padding: 8,
  },
  drawerCloseText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  drawerList: {
    flex: 1,
    paddingTop: 8,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderLeftWidth: 4,
    gap: 12,
  },
  drawerItemIcon: {
    fontSize: 20,
  },
  drawerItemLabel: {
    fontSize: 14,
  },
  drawerItemSub: {
    fontSize: 11,
    marginTop: 2,
  },
  drawerFooter: {
    padding: 14,
    borderTopWidth: 1,
  },
  drawerFooterBtn: {
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  drawerFooterText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
