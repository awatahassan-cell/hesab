import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { lightColors, ColorTheme, CATEGORY_PALETTE, getThemeColors } from './colors';
import { typography } from './typography';
import { spacing, radius } from './spacing';
import { useAppStore } from '../store/useAppStore';

export interface ThemeContextType {
  colors: ColorTheme;
  typography: typeof typography;
  spacing: typeof spacing;
  radius: typeof radius;
  categoryPalette: string[];
  isDark: boolean;
}

export const ThemeContext = createContext<ThemeContextType>({
  colors: lightColors,
  typography,
  spacing,
  radius,
  categoryPalette: CATEGORY_PALETTE,
  isDark: false
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemScheme = useColorScheme();
  const themeMode = useAppStore((state) => state.themeMode);
  const colorScheme = useAppStore((state) => state.colorScheme);

  const isDark = useMemo(() => {
    if (themeMode === 'system') return systemScheme === 'dark';
    return themeMode === 'dark';
  }, [themeMode, systemScheme]);

  const colors = useMemo(() => getThemeColors(colorScheme, isDark), [colorScheme, isDark]);

  const value = useMemo(
    () => ({
      colors,
      typography,
      spacing,
      radius,
      categoryPalette: CATEGORY_PALETTE,
      isDark
    }),
    [colors, isDark]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);
