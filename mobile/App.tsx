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
import { Ionicons } from '@expo/vector-icons';
import { api, AuthUser, AutomationSettings, setAuthToken } from './src/services/api';
import { ShowcaseScreen } from './src/screens/ShowcaseScreen';
import { SearchGeneratorScreen } from './src/screens/SearchGeneratorScreen';
import { SchedulerScreen } from './src/screens/SchedulerScreen';
import { ChannelsScreen } from './src/screens/ChannelsScreen';
import { ProPlanScreen } from './src/screens/ProPlanScreen';
import { AuthScreen } from './src/screens/AuthScreen';
import { ThemeProvider, useTheme } from './src/theme';

type ScreenKey = 'showcase' | 'automation' | 'scheduler' | 'channels' | 'pro';
type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const MENU_ITEMS: Array<{
  key: ScreenKey;
  icon: IoniconName;
  label: string;
  subtitle: string;
}> = [
  {
    key: 'showcase',
    icon: 'flame-outline',
    label: 'Vitrine & Cupons',
    subtitle: 'Achadinhos das 4 lojas + Cupons',
  },
  {
    key: 'automation',
    icon: 'flash-outline',
    label: 'Automação por Nicho',
    subtitle: 'Piloto Automático (08h–22h) e Disparos',
  },
  {
    key: 'scheduler',
    icon: 'calendar-outline',
    label: 'Agendador na Nuvem',
    subtitle: 'Fila de postagens 24h',
  },
  {
    key: 'channels',
    icon: 'settings-outline',
    label: 'Canais, WhatsApps & APIs',
    subtitle: 'Números, grupos, Status e chaves',
  },
  {
    key: 'pro',
    icon: 'diamond-outline',
    label: 'Plano Afiliado PRO',
    subtitle: 'Piloto Automático e WhatsApps ilimitados',
  },
];

const DRAWER_WIDTH = Math.min(296, Math.round(Dimensions.get('window').width * 0.82));

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
  const userInitial = user?.name ? user.name.trim().charAt(0).toUpperCase() : 'O';

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Barra Superior Profissional */}
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
          <Ionicons name="menu" size={22} color={colors.primary} />
        </TouchableOpacity>

        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[styles.brandText, { color: colors.text }]} numberOfLines={1}>
              Oferta<Text style={{ color: colors.primary }}>Pro</Text>
            </Text>
            {settings?.plan === 'pro' ? (
              <View style={[styles.proPill, { backgroundColor: colors.proGold }]}>
                <Text style={styles.proPillText}>PRO</Text>
              </View>
            ) : null}
          </View>
          <Text style={[styles.screenSub, { color: colors.textMuted }]} numberOfLines={1}>
            {currentMenuItem?.label}
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.75}
          style={[styles.themeBtn, { backgroundColor: colors.primarySoft }]}
          onPress={toggleTheme}
        >
          <Ionicons
            name={isDark ? 'sunny-outline' : 'moon-outline'}
            size={16}
            color={colors.primaryDark}
          />
          <Text style={[styles.themeBtnText, { color: colors.primaryDark }]}>
            {isDark ? 'Claro' : 'Escuro'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Conteúdo Principal */}
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

      {/* Menu Lateral Retrátil Premium */}
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
              <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                <Text style={styles.avatarText}>{userInitial}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.drawerBrand} numberOfLines={1}>
                  {user ? user.name : 'OfertaPro'}
                </Text>
                <Text style={styles.drawerUser} numberOfLines={1}>
                  {user
                    ? settings?.plan === 'pro'
                      ? 'Assinante PRO Ativo'
                      : 'Plano Grátis'
                    : 'Achadinhos & Automação'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.drawerCloseBtn}
                onPress={closeDrawer}
              >
                <Ionicons name="close" size={22} color="#FFFFFF" />
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
                    <View
                      style={[
                        styles.drawerIconWrap,
                        {
                          backgroundColor: active ? colors.primary : colors.inputBg,
                        },
                      ]}
                    >
                      <Ionicons
                        name={item.icon}
                        size={18}
                        color={active ? '#FFFFFF' : colors.primary}
                      />
                    </View>
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
                <Ionicons
                  name={isDark ? 'sunny-outline' : 'moon-outline'}
                  size={16}
                  color={colors.primaryDark}
                />
                <Text style={[styles.drawerFooterText, { color: colors.primaryDark }]}>
                  {isDark ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro'}
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
                  <Ionicons name="log-out-outline" size={16} color={colors.danger} />
                  <Text style={[styles.drawerFooterText, { color: colors.danger }]}>
                    Sair da Conta
                  </Text>
                </TouchableOpacity>
              ) : null}

              <Text style={[styles.versionText, { color: colors.textMuted }]}>
                OfertaPro v1.0.0 • Nuvem Ativa
              </Text>
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
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  hamburgerBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: {
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  proPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  proPillText: {
    color: '#0F172A',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  screenSub: {
    fontSize: 11,
    fontWeight: '600',
  },
  themeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 18,
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
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '900',
  },
  drawerBrand: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  drawerUser: {
    color: '#E9D5FF',
    fontSize: 12,
    marginTop: 2,
  },
  drawerCloseBtn: {
    padding: 6,
  },
  drawerList: {
    flex: 1,
    paddingTop: 10,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderLeftWidth: 4,
    gap: 12,
    marginBottom: 2,
  },
  drawerIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
  },
  drawerFooterText: {
    fontSize: 12,
    fontWeight: '700',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 10,
    marginTop: 10,
  },
});
