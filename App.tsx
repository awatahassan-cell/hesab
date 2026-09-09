import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Platform, AppState, AppStateStatus } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Font from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import './src/i18n';
import { ThemeProvider, useTheme } from './src/theme';
import { useAppStore } from './src/store/useAppStore';
import { useFinanceStore } from './src/store/useFinanceStore';
import { initDatabase } from './src/db';

import { HomeScreen } from './src/screens/HomeScreen';
import { TransactionsScreen } from './src/screens/TransactionsScreen';
import { AddTransactionScreen } from './src/screens/AddTransactionScreen';
import { ReportsScreen } from './src/screens/ReportsScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { DebtsScreen } from './src/screens/DebtsScreen';
import { ShoppingScreen } from './src/screens/ShoppingScreen';
import { BudgetsScreen } from './src/screens/BudgetsScreen';
import { AccountsScreen } from './src/screens/AccountsScreen';
import { CategoriesScreen } from './src/screens/CategoriesScreen';
import { RemindersScreen } from './src/screens/RemindersScreen';
import { SavingsGoalsScreen } from './src/screens/SavingsGoalsScreen';
import { GoalsAndBudgetsScreen } from './src/screens/GoalsAndBudgetsScreen';
import { MenuScreen } from './src/screens/MenuScreen';
import { OnboardingModal } from './src/screens/OnboardingModal';
import { PinLockScreen } from './src/components/security/PinLockScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function BottomTabs() {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const bottomInset = Platform.OS === 'android'
    ? Math.max(insets.bottom, 48) + 8
    : Math.max(insets.bottom, 14);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.cardBorder,
          height: 56 + bottomInset,
          paddingBottom: bottomInset,
          paddingTop: 6
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontFamily: Platform.select({
            android: 'IBMPlexSansArabic-Medium',
            ios: 'IBMPlexSansArabic-Medium',
            default: '"IBM Plex Sans Arabic", Inter, sans-serif'
          }),
          fontSize: 11,
          fontWeight: '600'
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home-outline';

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'GoalsAndBudgets') {
            iconName = focused ? 'pie-chart' : 'pie-chart-outline';
          } else if (route.name === 'Add') {
            return (
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  backgroundColor: colors.accent,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                  shadowColor: colors.accent,
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.45,
                  shadowRadius: 10,
                  elevation: 7,
                  borderWidth: 3,
                  borderColor: colors.surface
                }}
              >
                <Ionicons name="add" size={32} color="#FFFFFF" />
              </View>
            );
          } else if (route.name === 'Reports') {
            iconName = focused ? 'bar-chart' : 'bar-chart-outline';
          } else if (route.name === 'Menu') {
            iconName = focused ? 'grid' : 'grid-outline';
          }

          return <Ionicons name={iconName} size={22} color={color} />;
        }
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: t('tabs.home', 'سەرەکی') }}
      />
      <Tab.Screen
        name="GoalsAndBudgets"
        component={GoalsAndBudgetsScreen}
        options={{ title: 'ئامانج و بودجە' }}
      />
      <Tab.Screen
        name="Add"
        component={AddTransactionScreen}
        options={{
          title: '',
          tabBarLabel: () => null
        }}
      />
      <Tab.Screen
        name="Reports"
        component={ReportsScreen}
        options={{ title: t('tabs.reports', 'ڕاپۆرتەکان') }}
      />
      <Tab.Screen
        name="Menu"
        component={MenuScreen}
        options={{ title: 'زیاتر' }}
      />
    </Tab.Navigator>
  );
}

function MainNavigation() {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.surface
        },
        headerTitleStyle: {
          color: colors.textPrimary,
          fontFamily: Platform.select({
            android: 'IBMPlexSansArabic-SemiBold',
            ios: 'IBMPlexSansArabic-SemiBold',
            default: '"IBM Plex Sans Arabic", Inter, sans-serif'
          })
        },
        headerTintColor: colors.accent,
        contentStyle: {
          backgroundColor: colors.background
        }
      }}
    >
      <Stack.Screen
        name="MainTabs"
        component={BottomTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="DebtsScreen"
        component={DebtsScreen}
        options={{ title: t('debts.title') }}
      />
      <Stack.Screen
        name="ShoppingScreen"
        component={ShoppingScreen}
        options={{ title: t('shopping.title') }}
      />
      <Stack.Screen
        name="BudgetsScreen"
        component={BudgetsScreen}
        options={{ title: t('budgets.title') }}
      />
      <Stack.Screen
        name="AccountsScreen"
        component={AccountsScreen}
        options={{ title: t('accounts.title') }}
      />
      <Stack.Screen
        name="CategoriesScreen"
        component={CategoriesScreen}
        options={{ title: t('categories.title') }}
      />
      <Stack.Screen
        name="RemindersScreen"
        component={RemindersScreen}
        options={{ title: 'وەبیرهێنەرەوەی پارەدانەکان' }}
      />
      <Stack.Screen
        name="SavingsGoalsScreen"
        component={SavingsGoalsScreen}
        options={{ title: 'سندووقی ئامانجەکانی پاشەکەوت' }}
      />
      <Stack.Screen
        name="Transactions"
        component={TransactionsScreen}
        options={{ title: t('tabs.transactions') }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: t('tabs.settings') }}
      />
    </Stack.Navigator>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const {
    loadInitialSettings,
    hasCompletedOnboarding,
    isLocked,
    setIsLocked,
    primaryCurrency
  } = useAppStore();

  const { refreshAll } = useFinanceStore();

  useEffect(() => {
    async function start() {
      try {
        await loadInitialSettings();

        // Load IBM Plex Sans Arabic fonts natively
        try {
          await Font.loadAsync({
            'IBMPlexSansArabic-Regular': require('./assets/fonts/IBMPlexSansArabic-Regular.ttf'),
            'IBMPlexSansArabic-Medium': require('./assets/fonts/IBMPlexSansArabic-Medium.ttf'),
            'IBMPlexSansArabic-SemiBold': require('./assets/fonts/IBMPlexSansArabic-SemiBold.ttf'),
            'IBMPlexSansArabic-Bold': require('./assets/fonts/IBMPlexSansArabic-Bold.ttf'),
            'IBMPlexSansArabic': require('./assets/fonts/IBMPlexSansArabic-Regular.ttf'),
            'IBM-Plex-Sans-Arabic': require('./assets/fonts/IBMPlexSansArabic-Regular.ttf'),
            'IBM Plex Sans Arabic': require('./assets/fonts/IBMPlexSansArabic-Regular.ttf'),
          });
        } catch (fontErr) {
          console.warn('Native font load warning:', fontErr);
        }

        await initDatabase(primaryCurrency);
        await refreshAll();

        const currentOnboard = useAppStore.getState().hasCompletedOnboarding;
        if (!currentOnboard) {
          setShowOnboarding(true);
        }

        // Inject IBM Plex Sans Arabic font on Web
        if (Platform.OS === 'web' && typeof document !== 'undefined') {
          const fontLinkId = 'google-font-ibm-plex-arabic';
          if (!document.getElementById(fontLinkId)) {
            const link = document.createElement('link');
            link.id = fontLinkId;
            link.rel = 'stylesheet';
            link.href = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700;800&family=Inter:wght@400;500;600;700;800&display=swap';
            document.head.appendChild(link);
          }

          const fontStyleId = 'global-ibm-plex-font-style';
          let styleEl = document.getElementById(fontStyleId) as HTMLStyleElement | null;
          if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = fontStyleId;
            document.head.appendChild(styleEl);
          }
          styleEl.textContent = `
            @font-face {
              font-family: 'Ionicons';
              src: url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@14.0.0/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf') format('truetype');
              font-display: swap;
            }
            @font-face {
              font-family: 'ionicons';
              src: url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@14.0.0/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf') format('truetype');
              font-display: swap;
            }
            * {
              font-family: "IBM Plex Sans Arabic", "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
            }
            [style*="ionicons" i],
            [style*="Ionicons" i],
            [class*="icon"],
            [data-icon] {
              font-family: 'Ionicons', 'ionicons' !important;
            }
          `;
        }

        setReady(true);
      } catch (err) {
        console.error('Initialization error:', err);
        setReady(true);
      }
    }
    start();
  }, []);

  if (!ready) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppContent
          showOnboarding={showOnboarding}
          setShowOnboarding={setShowOnboarding}
        />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function AppContent({
  showOnboarding,
  setShowOnboarding
}: {
  showOnboarding: boolean;
  setShowOnboarding: (show: boolean) => void;
}) {
  const { isDark } = useTheme();
  const { isLocked, setIsLocked } = useAppStore();

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'background') {
        const { pinCode, isBiometricsEnabled } = useAppStore.getState();
        if (pinCode || isBiometricsEnabled) {
          useAppStore.getState().setIsLocked(true);
        }
      }
    });
    return () => sub.remove();
  }, []);

  if (isLocked) {
    return <PinLockScreen onSuccess={() => setIsLocked(false)} />;
  }

  return (
    <NavigationContainer>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <MainNavigation />
      <OnboardingModal
        visible={showOnboarding}
        onComplete={() => setShowOnboarding(false)}
      />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF'
  }
});
