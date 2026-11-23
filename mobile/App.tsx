import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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

type TabKey = 'showcase' | 'automation' | 'scheduler' | 'channels' | 'pro';

const TABS: Array<{ key: TabKey; icon: string; label: string }> = [
  { key: 'showcase', icon: '🔥', label: 'Vitrine' },
  { key: 'automation', icon: '🤖', label: 'Automação' },
  { key: 'scheduler', icon: '☁️', label: 'Agenda' },
  { key: 'channels', icon: '⚙️', label: 'Canais' },
  { key: 'pro', icon: '👑', label: 'PRO' },
];

function MainApp() {
  const { colors, isDark, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<TabKey>('showcase');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [settings, setSettings] = useState<AutomationSettings | null>(null);

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

  function handleLogout() {
    setAuthToken(null);
    setUser(null);
    setSettings(null);
    setActiveTab('showcase');
  }

  const requiresLogin = activeTab !== 'showcase' && !user;

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Barra Superior com Marca, Usuário e Botão Tema Claro/Escuro */}
      <View
        style={[
          styles.topBar,
          { backgroundColor: colors.tabBg, borderBottomColor: colors.border },
        ]}
      >
        <Text style={[styles.brandText, { color: colors.primary }]} numberOfLines={1}>
          {user && activeTab !== 'showcase'
            ? `👤 ${user.name} (${settings?.plan === 'pro' ? 'PRO 👑' : 'Grátis'})`
            : '💜 OfertaPro'}
        </Text>

        <View style={styles.topActions}>
          <TouchableOpacity
            style={[styles.themeBtn, { backgroundColor: colors.primarySoft }]}
            onPress={toggleTheme}
          >
            <Text style={[styles.themeBtnText, { color: colors.primaryDark }]}>
              {isDark ? '☀️ Claro' : '🌙 Escuro'}
            </Text>
          </TouchableOpacity>

          {user && activeTab !== 'showcase' ? (
            <TouchableOpacity onPress={handleLogout}>
              <Text style={[styles.logoutText, { color: colors.danger }]}>Sair</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <View style={styles.content}>
        {activeTab === 'showcase' ? (
          <ShowcaseScreen isPro={settings?.plan === 'pro'} />
        ) : requiresLogin ? (
          <AuthScreen
            onAuthenticated={(loggedUser) => {
              setUser(loggedUser);
            }}
          />
        ) : (
          <>
            {activeTab === 'automation' && (
              <SearchGeneratorScreen
                settings={settings}
                onRefreshSettings={refreshSettings}
                onOpenPro={() => setActiveTab('pro')}
              />
            )}
            {activeTab === 'scheduler' && <SchedulerScreen />}
            {activeTab === 'channels' && (
              <ChannelsScreen
                settings={settings}
                onRefreshSettings={refreshSettings}
                onOpenPro={() => setActiveTab('pro')}
              />
            )}
            {activeTab === 'pro' && (
              <ProPlanScreen
                currentPlan={settings?.plan || 'free'}
                onPlanChanged={refreshSettings}
              />
            )}
          </>
        )}
      </View>

      <View
        style={[
          styles.tabBar,
          { backgroundColor: colors.tabBg, borderTopColor: colors.border },
        ]}
      >
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tabItem}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={styles.tabIcon}>{tab.icon}</Text>
              <Text
                style={[
                  styles.tabLabel,
                  { color: active ? colors.primary : colors.textMuted },
                  active && styles.tabLabelActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  brandText: {
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  themeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  themeBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  logoutText: {
    fontSize: 12,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingVertical: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIcon: {
    fontSize: 18,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  tabLabelActive: {
    fontWeight: '800',
  },
});
