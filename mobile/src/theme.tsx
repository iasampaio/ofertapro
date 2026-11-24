import React, { createContext, useContext, useState } from 'react';
import { useColorScheme } from 'react-native';

export interface ThemeColors {
  mode: 'light' | 'dark';
  primary: string;
  primaryDark: string;
  primarySoft: string;
  lilac: string;
  secondary: string;
  background: string;
  card: string;
  inputBg: string;
  border: string;
  text: string;
  textMuted: string;
  save: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  proGold: string;
  proBg: string;
  tabBg: string;
}

export const LIGHT_COLORS: ThemeColors = {
  mode: 'light',
  primary: '#7C3AED', // Roxo vibrante
  primaryDark: '#5B21B6',
  primarySoft: '#F3E8FF', // Lilás bem suave
  lilac: '#A855F7',
  secondary: '#4C1D95',
  background: '#FAF7FF', // Branco com toque lilás
  card: '#FFFFFF',
  inputBg: '#F8F5FF',
  border: '#E9D5FF',
  text: '#1E1B4B',
  textMuted: '#6B7280',
  save: '#16A34A', // Verde para botões de Salvar
  success: '#16A34A',
  successSoft: '#DCFCE7',
  warning: '#D97706',
  warningSoft: '#FEF3C7',
  danger: '#DC2626',
  dangerSoft: '#FEE2E2',
  proGold: '#F59E0B',
  proBg: '#3B0764',
  tabBg: '#FFFFFF',
};

export const DARK_COLORS: ThemeColors = {
  mode: 'dark',
  primary: '#A855F7', // Roxo/Lilás luminoso no fundo preto
  primaryDark: '#C084FC',
  primarySoft: '#2E1065',
  lilac: '#C084FC',
  secondary: '#6D28D9',
  background: '#09090B', // Preto profundo
  card: '#161221', // Preto com leve tom roxo
  inputBg: '#201930',
  border: '#3B2763',
  text: '#F8FAFC',
  textMuted: '#A1A1AA',
  save: '#22C55E', // Verde vibrante no tema escuro
  success: '#22C55E',
  successSoft: '#052E16',
  warning: '#FBBF24',
  warningSoft: '#451A03',
  danger: '#F87171',
  dangerSoft: '#450A0A',
  proGold: '#FBBF24',
  proBg: '#2E1065',
  tabBg: '#120E1C',
};

// Compatibilidade para imports estáticos se necessário
export const COLORS = LIGHT_COLORS;

export const STORE_META: Record<
  'shopee' | 'lomadee' | 'mercadolivre' | 'amazon' | 'aliexpress',
  { label: string; color: string; bg: string }
> = {
  shopee: { label: 'Shopee', color: '#EA580C', bg: '#FFEDD5' },
  lomadee: { label: 'Lojas BR', color: '#6D28D9', bg: '#EDE9FE' },
  mercadolivre: { label: 'Mercado Livre', color: '#A16207', bg: '#FEF9C3' },
  amazon: { label: 'Amazon', color: '#1E293B', bg: '#E2E8F0' },
  aliexpress: { label: 'AliExpress', color: '#DC2626', bg: '#FEE2E2' },
};

interface ThemeContextValue {
  colors: ThemeColors;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: LIGHT_COLORS,
  isDark: false,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [override, setOverride] = useState<'light' | 'dark' | null>(null);

  const mode = override ?? (systemScheme === 'dark' ? 'dark' : 'light');
  const isDark = mode === 'dark';
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  function toggleTheme() {
    setOverride(isDark ? 'light' : 'dark');
  }

  return (
    <ThemeContext.Provider value={{ colors, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
