import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Platform, AppState, AppStateStatus } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Font from 'expo-font';
import * as NativeSplash from 'expo-splash-screen';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import './src/i18n';
import { ThemeProvider, useTheme } from './src/theme';
import { useAppStore } from './src/store/useAppStore';
import { useFinanceStore } from './src/store/useFinanceStore';
import { initDatabase } from './src/db';
import { runDueRecurringRules } from './src/db/queries/recurring';

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
import { RecurringScreen } from './src/screens/RecurringScreen';
import { ImportScreen } from './src/screens/ImportScreen';
import { SavingsGoalsScreen } from './src/screens/SavingsGoalsScreen';
import { GoalsAndBudgetsScreen } from './src/screens/GoalsAndBudgetsScreen';
import { MenuScreen } from './src/screens/MenuScreen';
import { OnboardingModal } from './src/screens/OnboardingModal';
import { PinLockScreen } from './src/components/security/PinLockScreen';
import { GlassTabBar } from './src/components/navigation/GlassTabBar';
import { SplashScreen } from './src/screens/SplashScreen';
import { DialogHost } from './src/components/common/AppDialog';
import { UpdateGate } from './src/components/common/UpdateGate';
import { ErrorBoundary } from './src/components/common/ErrorBoundary';

// Hold the native splash until our own one is on screen, so the handoff
// never flashes a blank frame.
NativeSplash.preventAutoHideAsync().catch(() => {});

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function BottomTabs() {
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: t('tabs.home', t('tabs.home')) }}
      />
      <Tab.Screen
        name="Transactions"
        component={TransactionsScreen}
        options={{ title: t('tabs.transactions', t('tabs.transactions')) }}
      />
      <Tab.Screen
        name="Add"
        component={AddTransactionScreen}
        options={{ title: '' }}
      />
      <Tab.Screen
        name="Reports"
        component={ReportsScreen}
        options={{ title: t('tabs.reports', t('tabs.reports')) }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: t('tabs.settings', t('tabs.settings')) }}
      />
    </Tab.Navigator>
  );
}

function MainNavigation() {
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: colors.background
        }
      }}
    >
      <Stack.Screen
        name="MainTabs"
        component={BottomTabs}
      />
      <Stack.Screen
        name="GoalsAndBudgets"
        component={GoalsAndBudgetsScreen}
      />
      <Stack.Screen
        name="Menu"
        component={MenuScreen}
      />
      <Stack.Screen
        name="DebtsScreen"
        component={DebtsScreen}
      />
      <Stack.Screen
        name="ShoppingScreen"
        component={ShoppingScreen}
      />
      <Stack.Screen
        name="BudgetsScreen"
        component={BudgetsScreen}
      />
      <Stack.Screen
        name="AccountsScreen"
        component={AccountsScreen}
      />
      <Stack.Screen
        name="CategoriesScreen"
        component={CategoriesScreen}
      />
      <Stack.Screen
        name="RemindersScreen"
        component={RemindersScreen}
      />
      <Stack.Screen
        name="RecurringScreen"
        component={RecurringScreen}
      />
      <Stack.Screen
        name="SavingsGoalsScreen"
        component={SavingsGoalsScreen}
      />
      <Stack.Screen
        name="Transactions"
        component={TransactionsScreen}
      />
      <Stack.Screen
        name="ImportScreen"
        component={ImportScreen}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
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
    async function finish() {
      setReady(true);
      await NativeSplash.hideAsync().catch(() => {});
    }

    async function start() {
      try {
        await loadInitialSettings();

        // Load IBM Plex Sans Arabic fonts natively
        try {
          await Font.loadAsync({
            // Preloaded with the text fonts so an icon that mounts on the
            // very first frame (the home header's profile button) never
            // renders blank while the icon font is still arriving.
            ...Ionicons.font,
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

        // Read through the store, not the closure: loadInitialSettings has
        // just changed the currency, and the value captured when this effect
        // was created is the pre-detection default.
        await initDatabase(useAppStore.getState().primaryCurrency);

        // Repeating transactions catch up here. The phone is the only clock
        // this app has, so a rule posts when the app is next opened rather
        // than while it sits closed.
        try {
          await runDueRecurringRules();
        } catch (recurringErr) {
          console.warn('Recurring rules skipped:', recurringErr);
        }

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

        await finish();
      } catch (err) {
        console.error('Initialization error:', err);
        await finish();
      }
    }
    start();
  }, []);

  if (!ready) {
    if (Platform.OS === 'web') {
      return <SplashScreen />;
    }
    return null;
  }

  return (
    <ErrorBoundary>
    <SafeAreaProvider>
      <ThemeProvider>
        <AppContent
          showOnboarding={showOnboarding}
          setShowOnboarding={setShowOnboarding}
        />
      </ThemeProvider>
    </SafeAreaProvider>
    </ErrorBoundary>
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
    return (
      <>
        <PinLockScreen onSuccess={() => setIsLocked(false)} />
        <DialogHost />
      </>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <MainNavigation />
      <OnboardingModal
        visible={showOnboarding}
        onComplete={() => setShowOnboarding(false)}
      />
      {/* Mounted last so app dialogs sit above the navigator and onboarding. */}
      <DialogHost />
      <UpdateGate />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({});
