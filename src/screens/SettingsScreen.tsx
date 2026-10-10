import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Platform,
  Modal,
  TextInput,
  StatusBar as RNStatusBar,
  ActivityIndicator,
  KeyboardAvoidingView,
  Keyboard
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as LocalAuthentication from 'expo-local-authentication';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme';
import { useAppStore } from '../store/useAppStore';
import { useFinanceStore } from '../store/useFinanceStore';
import { COUNTRIES_CURRENCIES, CountryCurrency, formatCurrency } from '../utils/currency';
import { exportBackup, pickBackupFile, inspectBackup, restoreBackup } from '../utils/backup';
import { resetAllDatabaseData } from '../db';
import { CurvedHeader } from '../components/navigation/CurvedHeader';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { PinSetupModal } from '../components/security/PinSetupModal';
import { AppDialog } from '../components/common/AppDialog';
import { rescheduleAll } from '../services/notifications';
import { resetBudgetAlerts } from '../services/budgetAlerts';
import {
  BackupStatus,
  getBackupStatus,
  isReminderEnabled,
  setReminderEnabled,
  clearBackupRecord
} from '../services/backupHealth';
import {
  cancelBackupReminder,
  hasNotificationPermission,
  scheduleBackupReminder
} from '../services/notifications';
import {
  getDailyReminderConfig,
  saveDailyReminderConfig,
  formatTimeDisplay,
  formatTime12h,
  parseReminderTime
} from '../services/dailyReminder';
import { LANGUAGES } from '../i18n';
import { formatLocalDate } from '../utils/dates';
import { getCountryLanguages } from '../utils/currencyData';
import { ColorSchemeId, getThemeColors } from '../theme/colors';
import { detectRegion } from '../utils/region';
import { FONT_FAMILY, FONT_FAMILY_BOLD, FONT_FAMILY_MEDIUM, FONT_FAMILY_SEMIBOLD } from '../theme/typography';

const BRAND_THEMES: { id: ColorSchemeId; nameKey: string; swatch: [string, string] }[] = [
  { id: 'berry', nameKey: 'settings.scheme_berry', swatch: ['#FF3E8A', '#7B2FF7'] },
  { id: 'sunset', nameKey: 'settings.scheme_sunset', swatch: ['#FF8A00', '#FF2E63'] },
  { id: 'ocean', nameKey: 'settings.scheme_ocean', swatch: ['#00D2B4', '#0A6CFF'] },
  { id: 'lemon', nameKey: 'settings.scheme_lemon', swatch: ['#FFE44D', '#FF9900'] }
];

export const SettingsScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { colors, typography, radius, isDark } = useTheme();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const isRTL = useAppStore((state) => state.isRTL);
  const {
    language,
    setLanguage,
    countryCode,
    primaryCurrency,
    setCountryAndCurrency,
    themeMode,
    setThemeMode,
    colorScheme,
    setColorScheme,
    isBiometricsEnabled,
    setBiometricsEnabled,
    pinCode,
    setPinCode
  } = useAppStore();

  const { refreshAll } = useFinanceStore();

  // Modals state
  const [showPinModal, setShowPinModal] = useState(false);
  const [countryModalOpen, setCountryModalOpen] = useState(false);
  const [currencyModalOpen, setCurrencyModalOpen] = useState(false);
  const [languageModalOpen, setLanguageModalOpen] = useState(false);
  const [countryQuery, setCountryQuery] = useState('');
  const [currencyQuery, setCurrencyQuery] = useState('');

  // Backup & Security states
  const [exportModeModalOpen, setExportModeModalOpen] = useState(false);
  const [exportPasswordModalOpen, setExportPasswordModalOpen] = useState(false);
  const [exportPassword, setExportPassword] = useState('');
  const [showExportPassword, setShowExportPassword] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const [restorePasswordModalOpen, setRestorePasswordModalOpen] = useState(false);
  const [restorePassword, setRestorePassword] = useState('');
  const [showRestorePassword, setShowRestorePassword] = useState(false);
  const [pendingRestoreContent, setPendingRestoreContent] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  // Daily Bookkeeping Reminder states
  const [dailyReminderEnabled, setDailyReminderEnabled] = useState(false);
  const [dailyReminderTime, setDailyReminderTime] = useState('21:00');
  const [timeModalOpen, setTimeModalOpen] = useState(false);
  const [tempHour, setTempHour] = useState(21);
  const [tempMinute, setTempMinute] = useState(0);

  const [confirmConfig, setConfirmConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDanger?: boolean;
    icon?: any;
    onConfirm: () => void | Promise<void>;
  }>({
    visible: false,
    title: '',
    message: '',
    isDanger: true,
    onConfirm: () => {}
  });

  // Active items
  const activeCountry = useMemo(
    () => COUNTRIES_CURRENCIES.find((c) => c.countryCode === countryCode) ?? COUNTRIES_CURRENCIES[0],
    [countryCode]
  );
  const activeCurrencyItem = useMemo(
    () => COUNTRIES_CURRENCIES.find((c) => c.currencyCode === primaryCurrency) ?? COUNTRIES_CURRENCIES[0],
    [primaryCurrency]
  );
  const activeLanguageItem = useMemo(
    () => LANGUAGES.find((l) => l.code === language) ?? LANGUAGES[0],
    [language]
  );

  // Filtered countries & currencies
  const filteredCountries = useMemo(() => {
    const q = countryQuery.trim().toLowerCase();
    if (!q) return COUNTRIES_CURRENCIES;
    return COUNTRIES_CURRENCIES.filter(
      (c) =>
        c.countryCode.toLowerCase().includes(q) ||
        c.countryNameEn.toLowerCase().includes(q) ||
        c.currencyCode.toLowerCase().includes(q) ||
        t(`countries.${c.countryCode}`, c.countryNameEn).toLowerCase().includes(q)
    );
  }, [countryQuery, t]);

  const filteredCurrencies = useMemo(() => {
    const q = currencyQuery.trim().toLowerCase();
    if (!q) return COUNTRIES_CURRENCIES;
    return COUNTRIES_CURRENCIES.filter(
      (c) =>
        c.currencyCode.toLowerCase().includes(q) ||
        c.currencySymbol.toLowerCase().includes(q) ||
        c.countryNameEn.toLowerCase().includes(q) ||
        t(`countries.${c.countryCode}`, c.countryNameEn).toLowerCase().includes(q)
    );
  }, [currencyQuery, t]);

  // Suggested languages ordered for country
  const orderedLanguages = useMemo(() => {
    const local = getCountryLanguages(countryCode);
    return [
      ...local.map((code) => LANGUAGES.find((l) => l.code === code)).filter(Boolean),
      ...LANGUAGES.filter((l) => !local.includes(l.code))
    ] as typeof LANGUAGES;
  }, [countryCode]);

  const [backup, setBackup] = useState<BackupStatus>({
    health: 'never',
    lastBackupAt: null,
    ageDays: null
  });
  const [backupReminder, setBackupReminder] = useState(true);

  const refreshBackupStatus = useCallback(
    async (ask = false) => {
      const [status, reminderOn] = await Promise.all([getBackupStatus(), isReminderEnabled()]);
      setBackup(status);
      setBackupReminder(reminderOn);

      if (reminderOn && status.health !== 'fresh') {
        if (ask || (await hasNotificationPermission())) {
          await scheduleBackupReminder(t('backup.reminder_title'), t('backup.reminder_body'));
        }
      } else {
        await cancelBackupReminder();
      }
    },
    [t]
  );

  const refreshDailyReminder = useCallback(async () => {
    const cfg = await getDailyReminderConfig();
    setDailyReminderEnabled(cfg.enabled);
    setDailyReminderTime(cfg.time);
    setTempHour(cfg.hour);
    setTempMinute(cfg.minute);
  }, []);

  useEffect(() => {
    refreshBackupStatus();
    refreshDailyReminder();
  }, [refreshBackupStatus, refreshDailyReminder]);

  const displayReminderTime = useMemo(() => {
    const { hour, minute } = parseReminderTime(dailyReminderTime);
    const { time12, ampm } = formatTime12h(hour, minute);
    return `${time12} ${ampm} (${formatTimeDisplay(hour, minute)})`;
  }, [dailyReminderTime]);

  const handleToggleDailyReminder = async (val: boolean) => {
    setDailyReminderEnabled(val);
    const title = t('settings.daily_reminder_notification_title');
    const body = t('settings.daily_reminder_notification_body');
    await saveDailyReminderConfig(val, dailyReminderTime, title, body);
  };

  const handleOpenTimeModal = () => {
    const { hour, minute } = parseReminderTime(dailyReminderTime);
    setTempHour(hour);
    setTempMinute(minute);
    setTimeModalOpen(true);
  };

  const handleSaveReminderTime = async () => {
    const formatted = formatTimeDisplay(tempHour, tempMinute);
    setDailyReminderTime(formatted);
    setTimeModalOpen(false);
    if (dailyReminderEnabled) {
      const title = t('settings.daily_reminder_notification_title');
      const body = t('settings.daily_reminder_notification_body');
      await saveDailyReminderConfig(true, formatted, title, body);
    }
  };

  const handleLanguageSelect = (code: string) => {
    setLanguage(code);
    setLanguageModalOpen(false);
  };

  const handleCountrySelect = (c: CountryCurrency) => {
    setCountryAndCurrency(c.countryCode, c.currencyCode);
    setCountryModalOpen(false);
  };

  const handleCurrencySelect = (c: CountryCurrency) => {
    setCountryAndCurrency(countryCode, c.currencyCode);
    setCurrencyModalOpen(false);
  };

  const handleToggleReminder = async (val: boolean) => {
    setBackupReminder(val);
    await setReminderEnabled(val);
    await refreshBackupStatus(true);
  };

  const doExport = async (password?: string) => {
    try {
      setIsExporting(true);
      const { counts, isPasswordProtected } = await exportBackup(password);
      await refreshBackupStatus();
      const total = Object.values(counts).reduce((a: number, b: number) => a + b, 0);
      AppDialog.alert(
        t('backup.export_done'),
        t('backup.export_summary', { count: total }) +
          (isPasswordProtected ? `\n🔒 ${t('backup.password_protect_title')}` : ''),
        undefined,
        { tone: 'success', icon: 'wallet' }
      );
    } catch (err: any) {
      console.error('Export backup failed:', err);
      AppDialog.alert(
        t('common.error_short'),
        `${t('backup.export_failed')}${err?.message ? `\n(${err.message})` : ''}`,
        undefined,
        { tone: 'danger' }
      );
    } finally {
      setIsExporting(false);
    }
  };

  const executeRestore = async (content: string, password?: string) => {
    try {
      setIsRestoring(true);
      const result = await restoreBackup(content, password);
      if (result.ok) {
        await refreshAll();
        const { reminders } = useFinanceStore.getState();
        await rescheduleAll(reminders, (r) =>
          t('reminders.notification_body', {
            amount: formatCurrency(r.amount, r.currency)
          })
        );
        await refreshBackupStatus();
        const total = Object.values(result.counts ?? {}).reduce((a: number, b: number) => a + b, 0);
        AppDialog.alert(
          t('backup.restore_done'),
          t('backup.export_summary', { count: total }),
          undefined,
          { tone: 'success', icon: 'wallet' }
        );
        return;
      }

      if (result.problem === 'wrong-password') {
        AppDialog.alert(t('common.error_short'), t('backup.wrong_password'), undefined, {
          tone: 'danger'
        });
        return;
      }

      if (result.problem === 'checksum-mismatch') {
        AppDialog.alert(t('common.error_short'), t('backup.integrity_error'), undefined, {
          tone: 'danger'
        });
        return;
      }

      const message =
        result.problem === 'not-a-hesab-backup'
          ? t('backup.restore_failed_format')
          : result.problem === 'from-newer-app'
          ? t('backup.restore_failed_newer')
          : result.problem === 'write-failed'
          ? t('backup.restore_failed_write')
          : t('backup.restore_failed_unreadable');

      AppDialog.alert(t('common.error_short'), message, undefined, { tone: 'danger' });
    } catch {
      AppDialog.alert(t('common.error_short'), t('backup.restore_failed_write'), undefined, {
        tone: 'danger'
      });
    } finally {
      setIsRestoring(false);
    }
  };

  const handleRestoreBackup = async () => {
    const pick = await pickBackupFile();
    if (pick.cancelled) return;
    if (!pick.content) {
      AppDialog.alert(t('common.error_short'), t('backup.restore_failed_unreadable'), undefined, {
        tone: 'danger'
      });
      return;
    }

    const inspected = inspectBackup(pick.content);
    if (inspected.problem === 'password-required' || inspected.isPasswordProtected) {
      setPendingRestoreContent(pick.content);
      setRestorePassword('');
      setRestorePasswordModalOpen(true);
      return;
    }

    if (inspected.problem) {
      const message =
        inspected.problem === 'not-a-hesab-backup'
          ? t('backup.restore_failed_format')
          : inspected.problem === 'from-newer-app'
          ? t('backup.restore_failed_newer')
          : inspected.problem === 'checksum-mismatch'
          ? t('backup.integrity_error')
          : t('backup.restore_failed_unreadable');
      AppDialog.alert(t('common.error_short'), message, undefined, { tone: 'danger' });
      return;
    }

    const total = Object.values(inspected.payload?.counts ?? {}).reduce((a: number, b: number) => a + b, 0);

    AppDialog.alert(
      t('backup.restore_confirm_title'),
      t('backup.restore_confirm_body') + '\n\n' + t('backup.records_ready', { count: total }),
      [
        { style: 'cancel' },
        {
          text: t('common.restore'),
          style: 'destructive',
          onPress: () => {
            executeRestore(pick.content!);
          }
        }
      ],
      { tone: 'danger' }
    );
  };

  const handleToggleBiometrics = async (value: boolean) => {
    if (!value) {
      await setBiometricsEnabled(false);
      return;
    }
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    if (!hasHardware || !isEnrolled) {
      AppDialog.alert(t('common.error_short'), t('security.biometrics_unavailable'), undefined, {
        tone: 'info'
      });
      return;
    }

    const auth = await LocalAuthentication.authenticateAsync({
      promptMessage: t('security.auth_prompt')
    });

    if (auth.success) {
      await setBiometricsEnabled(true);
    }
  };

  const handlePinAction = () => {
    if (!pinCode) {
      setShowPinModal(true);
    } else {
      setConfirmConfig({
        visible: true,
        title: t('settings.pin_lock'),
        message: t('settings.pin_change_or_remove'),
        confirmText: t('settings.change_pin'),
        cancelText: t('settings.remove_pin'),
        isDanger: false,
        icon: 'lock-closed-outline',
        onConfirm: () => {
          setConfirmConfig((p) => ({ ...p, visible: false }));
          setTimeout(() => setShowPinModal(true), 250);
        }
      });
    }
  };

  const handleRemovePin = () => {
    setConfirmConfig({
      visible: true,
      title: t('settings.remove_pin'),
      message: t('settings.remove_pin_confirm'),
      confirmText: t('common.reset'),
      isDanger: true,
      icon: 'lock-open-outline',
      onConfirm: async () => {
        await setPinCode(null);
        setConfirmConfig((p) => ({ ...p, visible: false }));
      }
    });
  };

  const handleResetData = () => {
    setConfirmConfig({
      visible: true,
      title: t('settings.danger_zone', t('settings.danger_zone')),
      message: t('settings.wipe_confirm'),
      confirmText: t('settings.wipe_all'),
      cancelText: t('common.cancel', t('common.cancel')),
      isDanger: true,
      icon: 'warning-outline',
      onConfirm: async () => {
        await resetAllDatabaseData();
        await resetBudgetAlerts();
        await clearBackupRecord();
        await refreshAll();
        setConfirmConfig({
          visible: true,
          title: t('common.success', t('common.success')),
          message: t('settings.wipe_done'),
          confirmText: t('common.ok'),
          isDanger: false,
          icon: 'checkmark-circle-outline',
          onConfirm: () => setConfirmConfig((p) => ({ ...p, visible: false }))
        });
      }
    });
  };

  const topInset = Platform.OS === 'android'
    ? (RNStatusBar.currentHeight || insets.top || 24)
    : Math.max(insets.top, 20);

  const forwardIcon = isRTL ? 'chevron-back' : 'chevron-forward';

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <CurvedHeader
        title={t('settings.title')}
      />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 60 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Section: Language & Country (Sabata Grouped Card Style) ── */}
        <Text style={[styles.sectionTitle, { color: colors.textMuted, textAlign: isRTL ? 'right' : 'left' }]}>
          {t('settings.general')}
        </Text>

        {/* Language Row Card */}
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => setLanguageModalOpen(true)}
          style={[styles.glassCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
        >
          <View style={[styles.cardRowInner, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.iconChip, { backgroundColor: colors.surfaceSecondary }]}>
              <Feather name="globe" size={18} color={colors.accent} />
            </View>
            <View style={[styles.rowTextCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
              <Text style={[styles.rowMainText, { color: colors.textPrimary }]}>
                {activeLanguageItem.label}
              </Text>
              <Text style={[styles.rowSubText, { color: colors.textMuted }]}>
                {t('settings.language')} · {activeLanguageItem.code.toUpperCase()}
              </Text>
            </View>
            <Ionicons name={forwardIcon} size={18} color={colors.textMuted} />
          </View>
        </TouchableOpacity>

        {/* Country & Currency Combined Grouped Card */}
        <View style={[styles.glassCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder, marginTop: 10, paddingVertical: 2 }]}>
          {/* Country Row */}
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => setCountryModalOpen(true)}
            style={styles.innerCardRow}
          >
            <View style={[styles.cardRowInner, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={styles.flagEmoji}>{activeCountry.flag}</Text>
              <View style={[styles.rowTextCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                <Text numberOfLines={1} style={[styles.rowMainText, { color: colors.textPrimary }]}>
                  {t(`countries.${activeCountry.countryCode}`, activeCountry.countryNameEn)}
                </Text>
                <Text style={[styles.rowSubText, { color: colors.textMuted }]}>
                  {t('settings.country')}
                </Text>
              </View>
              <Ionicons name={forwardIcon} size={18} color={colors.textMuted} />
            </View>
          </TouchableOpacity>

          <View style={[styles.hairlineDivider, { backgroundColor: colors.divider }]} />

          {/* Currency Row */}
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => setCurrencyModalOpen(true)}
            style={styles.innerCardRow}
          >
            <View style={[styles.cardRowInner, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.iconChip, { backgroundColor: colors.surfaceSecondary }]}>
                <Text style={[styles.currencySymbolBadge, { color: colors.accent }]}>
                  {activeCurrencyItem.currencySymbol}
                </Text>
              </View>
              <View style={[styles.rowTextCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                <Text numberOfLines={1} style={[styles.rowMainText, { color: colors.textPrimary }]}>
                  {activeCurrencyItem.currencyCode} ({activeCurrencyItem.currencySymbol})
                </Text>
                <Text style={[styles.rowSubText, { color: colors.textMuted }]}>
                  {t('settings.primary_currency')}
                </Text>
              </View>
              <Ionicons name={forwardIcon} size={18} color={colors.textMuted} />
            </View>
          </TouchableOpacity>
        </View>

        {/* ── Section: Themes & Brand Swatches (Sabata Style) ── */}
        <Text style={[styles.sectionTitle, { color: colors.textMuted, textAlign: isRTL ? 'right' : 'left', marginTop: 22 }]}>
          {t('settings.color_scheme')}
        </Text>

        <View style={[styles.glassCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder, padding: 16 }]}>
          <Text style={[styles.schemeHintText, { color: colors.textMuted, textAlign: isRTL ? 'right' : 'left' }]}>
            {t('settings.color_scheme_desc')}
          </Text>

          {/* 4 Brand Theme Circles */}
          <View style={[styles.brandThemesRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            {BRAND_THEMES.map((th) => {
              const active = colorScheme === th.id;
              return (
                <TouchableOpacity
                  key={th.id}
                  activeOpacity={0.75}
                  onPress={() => setColorScheme(th.id)}
                  style={styles.brandCircleItem}
                >
                  <View
                    style={[
                      styles.brandCircleRing,
                      {
                        borderColor: active ? colors.accent : 'transparent'
                      }
                    ]}
                  >
                    <LinearGradient
                      colors={th.swatch}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.brandCircleInner}
                    >
                      {active && (
                        <Ionicons
                          name="checkmark"
                          size={18}
                          color={th.id === 'lemon' ? '#16130F' : '#FFFFFF'}
                        />
                      )}
                    </LinearGradient>
                  </View>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.brandCircleLabel,
                      {
                        fontFamily: active ? FONT_FAMILY_BOLD : FONT_FAMILY_MEDIUM,
                        color: active ? colors.textPrimary : colors.textMuted
                      }
                    ]}
                  >
                    {t(th.nameKey)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Section: Appearance Mode (System / Light / Dark) ── */}
        <Text style={[styles.sectionTitle, { color: colors.textMuted, textAlign: isRTL ? 'right' : 'left', marginTop: 22 }]}>
          {t('settings.theme')}
        </Text>

        <View style={[styles.glassCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder, padding: 6 }]}>
          <View style={[styles.appearanceSegmentRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            {[
              { id: 'system', label: t('settings.theme_system') },
              { id: 'light', label: t('settings.theme_light') },
              { id: 'dark', label: t('settings.theme_dark') }
            ].map((th) => {
              const active = themeMode === th.id;
              return (
                <TouchableOpacity
                  key={th.id}
                  activeOpacity={0.8}
                  onPress={() => setThemeMode(th.id as any)}
                  style={[
                    styles.appearanceOption,
                    active && { backgroundColor: colors.accent, elevation: 1 }
                  ]}
                >
                  <Text
                    style={[
                      styles.appearanceOptionText,
                      {
                        color: active ? colors.textInverse : colors.textPrimary,
                        fontFamily: active ? FONT_FAMILY_BOLD : FONT_FAMILY_MEDIUM
                      }
                    ]}
                  >
                    {th.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Section: Categories Manager Link ── */}
        <Text style={[styles.sectionTitle, { color: colors.textMuted, textAlign: isRTL ? 'right' : 'left', marginTop: 22 }]}>
          {t('categories.title')}
        </Text>

        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => navigation?.navigate('CategoriesScreen')}
          style={[styles.glassCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
        >
          <View style={[styles.cardRowInner, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.iconChip, { backgroundColor: colors.surfaceSecondary }]}>
              <Ionicons name="grid-outline" size={18} color={colors.accent} />
            </View>
            <View style={[styles.rowTextCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
              <Text style={[styles.rowMainText, { color: colors.textPrimary }]}>
                {t('categories.title')}
              </Text>
              <Text style={[styles.rowSubText, { color: colors.textMuted }]}>
                {t('menu.categories_title')}
              </Text>
            </View>
            <Ionicons name={forwardIcon} size={18} color={colors.textMuted} />
          </View>
        </TouchableOpacity>

        {/* ── Section: Security & Privacy ── */}
        <Text style={[styles.sectionTitle, { color: colors.textMuted, textAlign: isRTL ? 'right' : 'left', marginTop: 22 }]}>
          {t('settings.security')}
        </Text>

        <View style={[styles.glassCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder, paddingVertical: 2 }]}>
          {/* Biometrics Switch */}
          <View style={styles.innerCardRow}>
            <View style={[styles.cardRowInner, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.iconChip, { backgroundColor: colors.surfaceSecondary }]}>
                <Ionicons name="finger-print-outline" size={18} color={colors.accent} />
              </View>
              <Text style={[styles.rowMainText, { flex: 1, color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                {t('settings.biometrics')}
              </Text>
              <Switch
                value={isBiometricsEnabled}
                onValueChange={handleToggleBiometrics}
                trackColor={{ true: colors.accent, false: colors.cardBorder }}
              />
            </View>
          </View>

          <View style={[styles.hairlineDivider, { backgroundColor: colors.divider }]} />

          {/* PIN Code Setting */}
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={handlePinAction}
            style={styles.innerCardRow}
          >
            <View style={[styles.cardRowInner, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.iconChip, { backgroundColor: colors.surfaceSecondary }]}>
                <Ionicons
                  name={pinCode ? 'lock-closed-outline' : 'keypad-outline'}
                  size={18}
                  color={pinCode ? colors.accent : colors.textMuted}
                />
              </View>
              <View style={[styles.rowTextCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                <Text style={[styles.rowMainText, { color: colors.textPrimary }]}>
                  {pinCode ? t('security.pin_enabled') : t('settings.set_pin')}
                </Text>
                <Text style={[styles.rowSubText, { color: colors.textMuted }]}>
                  {t('settings.pin_lock')}
                </Text>
              </View>
              <Ionicons name={forwardIcon} size={18} color={colors.textMuted} />
            </View>
          </TouchableOpacity>

          {pinCode && (
            <>
              <View style={[styles.hairlineDivider, { backgroundColor: colors.divider }]} />
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={handleRemovePin}
                style={styles.innerCardRow}
              >
                <View style={[styles.cardRowInner, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View style={[styles.iconChip, { backgroundColor: colors.expenseMuted }]}>
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  </View>
                  <Text style={[styles.rowMainText, { flex: 1, color: colors.danger, textAlign: isRTL ? 'right' : 'left' }]}>
                    {t('settings.remove_pin')}
                  </Text>
                </View>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* ── Section: Daily Bookkeeping Reminder ── */}
        <Text style={[styles.sectionTitle, { color: colors.textMuted, textAlign: isRTL ? 'right' : 'left', marginTop: 22 }]}>
          {t('settings.daily_reminder_title')}
        </Text>

        <View style={[styles.glassCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder, paddingVertical: 4 }]}>
          {/* Toggle Row */}
          <View style={styles.innerCardRow}>
            <View style={[styles.cardRowInner, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.iconChip, { backgroundColor: dailyReminderEnabled ? colors.accent + '20' : colors.surfaceSecondary }]}>
                <Ionicons
                  name={dailyReminderEnabled ? 'notifications' : 'notifications-outline'}
                  size={19}
                  color={dailyReminderEnabled ? colors.accent : colors.textMuted}
                />
              </View>
              <View style={[styles.rowTextCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                <Text style={[styles.rowMainText, { color: colors.textPrimary }]}>
                  {t('settings.daily_reminder_enable')}
                </Text>
                <Text style={[styles.rowSubText, { color: colors.textMuted, textAlign: isRTL ? 'right' : 'left' }]}>
                  {t('settings.daily_reminder_desc')}
                </Text>
              </View>
              <Switch
                value={dailyReminderEnabled}
                onValueChange={handleToggleDailyReminder}
                trackColor={{ false: colors.cardBorder, true: colors.accent }}
                thumbColor={Platform.OS === 'android' ? '#ffffff' : undefined}
              />
            </View>
          </View>

          {/* Time Picker Row (Shown when enabled) */}
          {dailyReminderEnabled && (
            <>
              <View style={[styles.hairlineDivider, { backgroundColor: colors.divider }]} />
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={handleOpenTimeModal}
                style={styles.innerCardRow}
              >
                <View style={[styles.cardRowInner, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View style={[styles.iconChip, { backgroundColor: colors.surfaceSecondary }]}>
                    <Ionicons name="time-outline" size={19} color={colors.accent} />
                  </View>
                  <View style={[styles.rowTextCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                    <Text style={[styles.rowMainText, { color: colors.textPrimary }]}>
                      {t('settings.daily_reminder_time_label')}
                    </Text>
                    <Text style={[styles.rowSubText, { color: colors.textMuted }]}>
                      {t('settings.select_reminder_time')}
                    </Text>
                  </View>
                  <View style={[styles.timeBadgePill, { backgroundColor: colors.accent + '15', borderColor: colors.accent + '35', flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Text style={[styles.timeBadgeText, { color: colors.accent }]}>
                      {displayReminderTime}
                    </Text>
                    <Ionicons name="chevron-down" size={14} color={colors.accent} />
                  </View>
                </View>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* ── Section: Backup & Data Security ── */}
        <Text style={[styles.sectionTitle, { color: colors.textMuted, textAlign: isRTL ? 'right' : 'left', marginTop: 22 }]}>
          {t('backup.section')}
        </Text>

        <View style={[styles.backupCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
          {/* Header Row with Shield and AES Badge */}
          <View style={[styles.backupHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.backupShieldIconWrap, { backgroundColor: colors.accent + '15' }]}>
              <Ionicons name="shield-checkmark" size={24} color={colors.accent} />
            </View>
            <View style={[styles.backupHeaderInfo, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
              <View style={[styles.secureBadgeRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={[styles.backupCardTitle, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                  {t('backup.export_title')}
                </Text>
                <View style={[styles.secureBadge, { backgroundColor: colors.income + '18', borderColor: colors.income + '40' }]}>
                  <Ionicons name="lock-closed" size={10} color={colors.income} />
                  <Text style={[styles.secureBadgeText, { color: colors.income }]}>
                    {t('backup.secure_badge')}
                  </Text>
                </View>
              </View>
              <Text style={[styles.backupCardSubtitle, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                {t('backup.secure_desc')}
              </Text>
            </View>
          </View>

          {/* Status Box */}
          <View style={[styles.backupStatusBox, { backgroundColor: colors.surfaceSecondary, borderColor: colors.cardBorder }]}>
            {/* Last Backup Row */}
            <View style={[styles.backupStatusItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.backupStatusLabelRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons name="time-outline" size={15} color={colors.textSecondary} />
                <Text style={[styles.backupStatusLabel, { color: colors.textSecondary }]}>
                  {t('backup.last_backup')}:
                </Text>
              </View>
              <View
                style={[
                  styles.backupHealthPill,
                  {
                    backgroundColor:
                      backup.health === 'fresh'
                        ? colors.income + '18'
                        : backup.health === 'stale'
                        ? colors.warning + '18'
                        : colors.cardBorder
                  }
                ]}
              >
                <View
                  style={[
                    styles.healthDot,
                    {
                      backgroundColor:
                        backup.health === 'fresh'
                          ? colors.income
                          : backup.health === 'stale'
                          ? colors.warning
                          : colors.textMuted
                    }
                  ]}
                />
                <Text
                  style={[
                    styles.backupHealthText,
                    {
                      color:
                        backup.health === 'fresh'
                          ? colors.income
                          : backup.health === 'stale'
                          ? colors.warning
                          : colors.textSecondary
                    }
                  ]}
                >
                  {backup.health === 'never'
                    ? t('backup.never')
                    : backup.ageDays === 0
                    ? t('backup.today')
                    : backup.lastBackupAt
                    ? formatLocalDate(new Date(backup.lastBackupAt), language)
                    : t('backup.never')}
                </Text>
              </View>
            </View>

            {/* Container Format Row */}
            <View style={[styles.backupStatusItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.backupStatusLabelRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons name="document-text-outline" size={15} color={colors.textSecondary} />
                <Text style={[styles.backupStatusLabel, { color: colors.textSecondary }]}>
                  {t('backup.file_ready')}:
                </Text>
              </View>
              <Text style={[styles.formatTagText, { color: colors.accent }]}>
                .dinaro (Container)
              </Text>
            </View>

            {/* Weekly Reminder Switch */}
            <View style={[styles.backupStatusItem, { flexDirection: isRTL ? 'row-reverse' : 'row', borderBottomWidth: 0, paddingBottom: 2 }]}>
              <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                <Text style={[styles.backupStatusLabel, { color: colors.textPrimary, fontFamily: FONT_FAMILY_MEDIUM }]}>
                  {t('backup.remind_me')}
                </Text>
                <Text style={[styles.backupStatusSubLabel, { color: colors.textMuted, textAlign: isRTL ? 'right' : 'left' }]}>
                  {t('backup.remind_me_hint')}
                </Text>
              </View>
              <Switch
                value={backupReminder}
                onValueChange={handleToggleReminder}
                trackColor={{ false: colors.cardBorder, true: colors.accent }}
                thumbColor={Platform.OS === 'android' ? '#ffffff' : undefined}
              />
            </View>
          </View>

          {/* Action Buttons */}
          <View style={[styles.backupActionsContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setExportModeModalOpen(true)}
              style={[styles.primaryBackupBtn, { backgroundColor: colors.accent }]}
              disabled={isExporting}
            >
              {isExporting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="shield-checkmark-outline" size={18} color="#ffffff" />
                  <Text style={styles.primaryBackupBtnText}>
                    {t('backup.export_action')}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleRestoreBackup}
              style={[styles.secondaryBackupBtn, { borderColor: colors.cardBorder, backgroundColor: colors.surfaceSecondary }]}
              disabled={isRestoring}
            >
              {isRestoring ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : (
                <>
                  <Ionicons name="cloud-download-outline" size={18} color={colors.textPrimary} />
                  <Text style={[styles.secondaryBackupBtnText, { color: colors.textPrimary }]}>
                    {t('backup.restore_action')}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Section: Danger Zone ── */}
        <Text style={[styles.sectionTitle, { color: colors.danger, textAlign: isRTL ? 'right' : 'left', marginTop: 22 }]}>
          {t('settings.danger_zone')}
        </Text>

        <TouchableOpacity
          activeOpacity={0.75}
          onPress={handleResetData}
          style={[styles.glassCard, { backgroundColor: colors.surface, borderColor: colors.danger + '35' }]}
        >
          <View style={[styles.cardRowInner, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.iconChip, { backgroundColor: colors.expenseMuted }]}>
              <Ionicons name="warning-outline" size={18} color={colors.danger} />
            </View>
            <Text style={[styles.rowMainText, { flex: 1, color: colors.danger, textAlign: isRTL ? 'right' : 'left', fontFamily: FONT_FAMILY_BOLD }]}>
              {t('settings.reset_all')}
            </Text>
          </View>
        </TouchableOpacity>
      </ScrollView>

      {/* ── Modal: Language Selector ── */}
      <Modal
        visible={languageModalOpen}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setLanguageModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={styles.modalBackdropTap}
            activeOpacity={1}
            onPress={() => setLanguageModalOpen(false)}
          />
          <View style={[styles.modalSheet, { backgroundColor: colors.surface, paddingBottom: Math.max(insets.bottom + 20, Platform.OS === 'ios' ? 36 : 28) }]}>
            <View style={[styles.modalSheetHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={[styles.modalSheetTitle, { color: colors.textPrimary }]}>
                {t('settings.language')}
              </Text>
              <TouchableOpacity
                onPress={() => setLanguageModalOpen(false)}
                style={[styles.closeBtn, { backgroundColor: colors.surfaceSecondary }]}
              >
                <Ionicons name="close" size={18} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              {orderedLanguages.map((langItem) => {
                const isSelected = language === langItem.code;
                return (
                  <TouchableOpacity
                    key={langItem.code}
                    activeOpacity={0.75}
                    onPress={() => handleLanguageSelect(langItem.code)}
                    style={[
                      styles.choiceRow,
                      {
                        backgroundColor: isSelected ? colors.surfaceSecondary : 'transparent',
                        borderColor: colors.divider,
                        flexDirection: isRTL ? 'row-reverse' : 'row'
                      }
                    ]}
                  >
                    <View style={[styles.choiceTextCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                      <Text
                        style={[
                          styles.choiceTitle,
                          {
                            color: colors.textPrimary,
                            fontFamily: isSelected ? FONT_FAMILY_BOLD : FONT_FAMILY_MEDIUM
                          }
                        ]}
                      >
                        {langItem.label}
                      </Text>
                      <Text style={[styles.choiceSub, { color: colors.textMuted }]}>
                        {langItem.code.toUpperCase()}
                      </Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={20} color={colors.accent} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Modal: Country Selector (Searchable) ── */}
      <Modal
        visible={countryModalOpen}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setCountryModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={styles.modalBackdropTap}
            activeOpacity={1}
            onPress={() => setCountryModalOpen(false)}
          />
          <View style={[styles.modalSheet, { backgroundColor: colors.surface, maxHeight: '85%', paddingBottom: Math.max(insets.bottom + 20, Platform.OS === 'ios' ? 36 : 28) }]}>
            <View style={[styles.modalSheetHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={[styles.modalSheetTitle, { color: colors.textPrimary }]}>
                {t('settings.country')}
              </Text>
              <TouchableOpacity
                onPress={() => setCountryModalOpen(false)}
                style={[styles.closeBtn, { backgroundColor: colors.surfaceSecondary }]}
              >
                <Ionicons name="close" size={18} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View
              style={[
                styles.searchBox,
                {
                  backgroundColor: colors.surfaceSecondary,
                  flexDirection: isRTL ? 'row-reverse' : 'row'
                }
              ]}
            >
              <Ionicons name="search" size={18} color={colors.textMuted} />
              <TextInput
                value={countryQuery}
                onChangeText={setCountryQuery}
                placeholder={t('common.search', 'گەڕان...')}
                placeholderTextColor={colors.textMuted}
                textAlign={isRTL ? 'right' : 'left'}
                style={[styles.searchInput, { color: colors.textPrimary }]}
              />
              {countryQuery.length > 0 && (
                <TouchableOpacity onPress={() => setCountryQuery('')}>
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {filteredCountries.map((c) => {
                const isSelected = countryCode === c.countryCode;
                const localizedName = t(`countries.${c.countryCode}`, c.countryNameEn);
                return (
                  <TouchableOpacity
                    key={c.countryCode}
                    activeOpacity={0.75}
                    onPress={() => handleCountrySelect(c)}
                    style={[
                      styles.choiceRow,
                      {
                        backgroundColor: isSelected ? colors.surfaceSecondary : 'transparent',
                        borderColor: colors.divider,
                        flexDirection: isRTL ? 'row-reverse' : 'row'
                      }
                    ]}
                  >
                    <Text style={styles.choiceFlag}>{c.flag}</Text>
                    <View style={[styles.choiceTextCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                      <Text
                        style={[
                          styles.choiceTitle,
                          {
                            color: colors.textPrimary,
                            fontFamily: isSelected ? FONT_FAMILY_BOLD : FONT_FAMILY_MEDIUM
                          }
                        ]}
                      >
                        {localizedName}
                      </Text>
                      <Text style={[styles.choiceSub, { color: colors.textMuted }]}>
                        {c.currencyCode} ({c.currencySymbol})
                      </Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={20} color={colors.accent} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Modal: Currency Selector (Searchable) ── */}
      <Modal
        visible={currencyModalOpen}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setCurrencyModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={styles.modalBackdropTap}
            activeOpacity={1}
            onPress={() => setCurrencyModalOpen(false)}
          />
          <View style={[styles.modalSheet, { backgroundColor: colors.surface, maxHeight: '85%', paddingBottom: Math.max(insets.bottom + 20, Platform.OS === 'ios' ? 36 : 28) }]}>
            <View style={[styles.modalSheetHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={[styles.modalSheetTitle, { color: colors.textPrimary }]}>
                {t('settings.primary_currency')}
              </Text>
              <TouchableOpacity
                onPress={() => setCurrencyModalOpen(false)}
                style={[styles.closeBtn, { backgroundColor: colors.surfaceSecondary }]}
              >
                <Ionicons name="close" size={18} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View
              style={[
                styles.searchBox,
                {
                  backgroundColor: colors.surfaceSecondary,
                  flexDirection: isRTL ? 'row-reverse' : 'row'
                }
              ]}
            >
              <Ionicons name="search" size={18} color={colors.textMuted} />
              <TextInput
                value={currencyQuery}
                onChangeText={setCurrencyQuery}
                placeholder={t('common.search', 'گەڕان...')}
                placeholderTextColor={colors.textMuted}
                textAlign={isRTL ? 'right' : 'left'}
                style={[styles.searchInput, { color: colors.textPrimary }]}
              />
              {currencyQuery.length > 0 && (
                <TouchableOpacity onPress={() => setCurrencyQuery('')}>
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {filteredCurrencies.map((c) => {
                const isSelected = primaryCurrency === c.currencyCode;
                const localizedCountry = t(`countries.${c.countryCode}`, c.countryNameEn);
                return (
                  <TouchableOpacity
                    key={c.countryCode + '_' + c.currencyCode}
                    activeOpacity={0.75}
                    onPress={() => handleCurrencySelect(c)}
                    style={[
                      styles.choiceRow,
                      {
                        backgroundColor: isSelected ? colors.surfaceSecondary : 'transparent',
                        borderColor: colors.divider,
                        flexDirection: isRTL ? 'row-reverse' : 'row'
                      }
                    ]}
                  >
                    <View style={[styles.iconChip, { backgroundColor: colors.surfaceSecondary }]}>
                      <Text style={[styles.currencySymbolBadge, { color: colors.accent }]}>
                        {c.currencySymbol}
                      </Text>
                    </View>
                    <View style={[styles.choiceTextCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                      <Text
                        style={[
                          styles.choiceTitle,
                          {
                            color: colors.textPrimary,
                            fontFamily: isSelected ? FONT_FAMILY_BOLD : FONT_FAMILY_MEDIUM
                          }
                        ]}
                      >
                        {c.currencyCode} · {c.currencySymbol}
                      </Text>
                      <Text style={[styles.choiceSub, { color: colors.textMuted }]}>
                        {c.flag} {localizedCountry}
                      </Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={20} color={colors.accent} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* PIN Setup Modal */}
      <PinSetupModal
        visible={showPinModal}
        onClose={() => setShowPinModal(false)}
        onSuccess={async (newPin) => {
          await setPinCode(newPin);
          setConfirmConfig({
            visible: true,
            title: t('common.success', t('common.success')),
            message: t('security.pin_set_ok'),
            confirmText: t('common.ok'),
            isDanger: false,
            icon: 'shield-checkmark-outline',
            onConfirm: () => setConfirmConfig((p) => ({ ...p, visible: false }))
          });
        }}
      />

      {/* Confirmation Modal */}
      <ConfirmModal
        visible={confirmConfig.visible}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        cancelText={confirmConfig.cancelText}
        isDanger={confirmConfig.isDanger}
        icon={confirmConfig.icon}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig((p) => ({ ...p, visible: false }))}
      />
      {/* ── Modal: Export Mode Selection ── */}
      <Modal
        visible={exportModeModalOpen}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setExportModeModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={styles.modalBackdropTap}
            activeOpacity={1}
            onPress={() => setExportModeModalOpen(false)}
          />
          <View style={[styles.modalSheet, { backgroundColor: colors.surface, paddingBottom: Math.max(insets.bottom + 24, 32) }]}>
            <View style={[styles.modalSheetHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={[styles.modalSheetTitle, { color: colors.textPrimary }]}>
                {t('backup.choose_export_type')}
              </Text>
              <TouchableOpacity
                onPress={() => setExportModeModalOpen(false)}
                style={[styles.closeBtn, { backgroundColor: colors.surfaceSecondary }]}
              >
                <Ionicons name="close" size={18} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 12, marginTop: 8 }}>
              {/* Option 1: Fast Secure AES-256 */}
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => {
                  setExportModeModalOpen(false);
                  doExport();
                }}
                style={[
                  styles.backupOptionCard,
                  { backgroundColor: colors.surfaceSecondary, borderColor: colors.cardBorder, flexDirection: isRTL ? 'row-reverse' : 'row' }
                ]}
              >
                <View style={[styles.backupOptionIconWrap, { backgroundColor: colors.income + '18' }]}>
                  <Ionicons name="shield-checkmark" size={22} color={colors.income} />
                </View>
                <View style={[styles.backupOptionTextWrap, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                  <Text style={[styles.backupOptionTitle, { color: colors.textPrimary }]}>
                    {t('backup.fast_secure_title')}
                  </Text>
                  <Text style={[styles.backupOptionDesc, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                    {t('backup.fast_secure_desc')}
                  </Text>
                </View>
                <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color={colors.textMuted} />
              </TouchableOpacity>

              {/* Option 2: Password Protected */}
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => {
                  setExportModeModalOpen(false);
                  setExportPassword('');
                  setExportPasswordModalOpen(true);
                }}
                style={[
                  styles.backupOptionCard,
                  { backgroundColor: colors.surfaceSecondary, borderColor: colors.cardBorder, flexDirection: isRTL ? 'row-reverse' : 'row' }
                ]}
              >
                <View style={[styles.backupOptionIconWrap, { backgroundColor: colors.accent + '18' }]}>
                  <Ionicons name="key" size={22} color={colors.accent} />
                </View>
                <View style={[styles.backupOptionTextWrap, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                  <Text style={[styles.backupOptionTitle, { color: colors.textPrimary }]}>
                    {t('backup.password_protect_title')}
                  </Text>
                  <Text style={[styles.backupOptionDesc, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                    {t('backup.password_protect_desc')}
                  </Text>
                </View>
                <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Modal: Export Password Setup ── */}
      <Modal
        visible={exportPasswordModalOpen}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setExportPasswordModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalBackdrop}
        >
          <TouchableOpacity
            style={styles.modalBackdropTap}
            activeOpacity={1}
            onPress={() => {
              Keyboard.dismiss();
              setExportPasswordModalOpen(false);
            }}
          />
          <View style={[styles.modalSheet, { backgroundColor: colors.surface, paddingBottom: Math.max(insets.bottom + 24, 32) }]}>
            <View style={[styles.modalSheetHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={[styles.modalSheetTitle, { color: colors.textPrimary }]}>
                {t('backup.password_protect_title')}
              </Text>
              <TouchableOpacity
                onPress={() => setExportPasswordModalOpen(false)}
                style={[styles.closeBtn, { backgroundColor: colors.surfaceSecondary }]}
              >
                <Ionicons name="close" size={18} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.backupModalHint, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
              {t('backup.password_protect_desc')}
            </Text>

            <View
              style={[
                styles.backupInputContainer,
                { backgroundColor: colors.surfaceSecondary, borderColor: colors.cardBorder, flexDirection: isRTL ? 'row-reverse' : 'row' }
              ]}
            >
              <Ionicons name="key-outline" size={20} color={colors.accent} />
              <TextInput
                value={exportPassword}
                onChangeText={setExportPassword}
                placeholder={t('backup.password_placeholder')}
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showExportPassword}
                textAlign={isRTL ? 'right' : 'left'}
                style={[styles.backupTextInput, { color: colors.textPrimary }]}
              />
              <TouchableOpacity
                onPress={() => setShowExportPassword((v) => !v)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name={showExportPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <View style={[styles.modalBtnRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity
                onPress={() => setExportPasswordModalOpen(false)}
                style={[styles.modalCancelBtn, { backgroundColor: colors.surfaceSecondary }]}
              >
                <Text style={[styles.modalCancelBtnText, { color: colors.textSecondary }]}>
                  {t('backup.cancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  if (exportPassword.trim().length < 4) {
                    AppDialog.alert(t('common.error_short'), t('backup.password_min_len'), undefined, { tone: 'danger' });
                    return;
                  }
                  setExportPasswordModalOpen(false);
                  doExport(exportPassword.trim());
                }}
                disabled={exportPassword.trim().length < 4}
                style={[
                  styles.modalConfirmBtn,
                  { backgroundColor: colors.accent, opacity: exportPassword.trim().length < 4 ? 0.5 : 1 }
                ]}
              >
                <Text style={styles.modalConfirmBtnText}>
                  {t('backup.export_action')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Modal: Restore Password Prompt ── */}
      <Modal
        visible={restorePasswordModalOpen}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setRestorePasswordModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalBackdrop}
        >
          <TouchableOpacity
            style={styles.modalBackdropTap}
            activeOpacity={1}
            onPress={() => {
              Keyboard.dismiss();
              setRestorePasswordModalOpen(false);
            }}
          />
          <View style={[styles.modalSheet, { backgroundColor: colors.surface, paddingBottom: Math.max(insets.bottom + 24, 32) }]}>
            <View style={[styles.modalSheetHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={[styles.modalSheetTitle, { color: colors.textPrimary }]}>
                {t('backup.password_required_title')}
              </Text>
              <TouchableOpacity
                onPress={() => setRestorePasswordModalOpen(false)}
                style={[styles.closeBtn, { backgroundColor: colors.surfaceSecondary }]}
              >
                <Ionicons name="close" size={18} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.backupModalHint, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
              {t('backup.password_required_desc')}
            </Text>

            <View
              style={[
                styles.backupInputContainer,
                { backgroundColor: colors.surfaceSecondary, borderColor: colors.cardBorder, flexDirection: isRTL ? 'row-reverse' : 'row' }
              ]}
            >
              <Ionicons name="lock-closed-outline" size={20} color={colors.accent} />
              <TextInput
                value={restorePassword}
                onChangeText={setRestorePassword}
                placeholder={t('backup.password_placeholder')}
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showRestorePassword}
                textAlign={isRTL ? 'right' : 'left'}
                style={[styles.backupTextInput, { color: colors.textPrimary }]}
              />
              <TouchableOpacity
                onPress={() => setShowRestorePassword((v) => !v)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name={showRestorePassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <View style={[styles.modalBtnRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity
                onPress={() => setRestorePasswordModalOpen(false)}
                style={[styles.modalCancelBtn, { backgroundColor: colors.surfaceSecondary }]}
              >
                <Text style={[styles.modalCancelBtnText, { color: colors.textSecondary }]}>
                  {t('backup.cancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  if (!restorePassword.trim()) return;
                  setRestorePasswordModalOpen(false);
                  if (pendingRestoreContent) {
                    executeRestore(pendingRestoreContent, restorePassword.trim());
                  }
                }}
                disabled={!restorePassword.trim()}
                style={[
                  styles.modalConfirmBtn,
                  { backgroundColor: colors.accent, opacity: !restorePassword.trim() ? 0.5 : 1 }
                ]}
              >
                <Text style={styles.modalConfirmBtnText}>
                  {t('backup.restore_action')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Modal: Daily Reminder Time Picker ── */}
      <Modal
        visible={timeModalOpen}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setTimeModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={styles.modalBackdropTap}
            activeOpacity={1}
            onPress={() => setTimeModalOpen(false)}
          />
          <View style={[styles.modalSheet, { backgroundColor: colors.surface, paddingBottom: Math.max(insets.bottom + 20, Platform.OS === 'ios' ? 36 : 28) }]}>
            <View style={[styles.modalSheetHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={[styles.modalSheetTitle, { color: colors.textPrimary }]}>
                {t('settings.select_reminder_time')}
              </Text>
              <TouchableOpacity
                onPress={() => setTimeModalOpen(false)}
                style={[styles.closeBtn, { backgroundColor: colors.surfaceSecondary }]}
              >
                <Ionicons name="close" size={18} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Big Clock Preview Display */}
            <View style={[styles.timePreviewCard, { backgroundColor: colors.surfaceSecondary, borderColor: colors.cardBorder }]}>
              <View style={styles.timeDigitsRow}>
                <Text style={[styles.timePreviewDigits, { color: colors.accent }]}>
                  {tempHour < 10 ? `0${tempHour}` : tempHour}
                </Text>
                <Text style={[styles.timePreviewColon, { color: colors.accent }]}>:</Text>
                <Text style={[styles.timePreviewDigits, { color: colors.accent }]}>
                  {tempMinute < 10 ? `0${tempMinute}` : tempMinute}
                </Text>
              </View>
              <Text style={[styles.timePreviewSub, { color: colors.textSecondary }]}>
                {formatTime12h(tempHour, tempMinute).time12} {formatTime12h(tempHour, tempMinute).ampm}
              </Text>
            </View>

            {/* Quick Presets */}
            <Text style={[styles.timeSectionSubheading, { color: colors.textMuted, textAlign: isRTL ? 'right' : 'left' }]}>
              {t('common.filter', 'پێشنیارکراو')}
            </Text>
            <View style={[styles.timePresetsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              {[
                { h: 19, m: 0, label: '19:00' },
                { h: 20, m: 0, label: '20:00' },
                { h: 21, m: 0, label: '21:00' },
                { h: 22, m: 0, label: '22:00' }
              ].map((p) => {
                const isSelected = tempHour === p.h && tempMinute === p.m;
                return (
                  <TouchableOpacity
                    key={`${p.h}:${p.m}`}
                    activeOpacity={0.75}
                    onPress={() => {
                      setTempHour(p.h);
                      setTempMinute(p.m);
                    }}
                    style={[
                      styles.timePresetChip,
                      {
                        backgroundColor: isSelected ? colors.accent : colors.surfaceSecondary,
                        borderColor: isSelected ? colors.accent : colors.cardBorder
                      }
                    ]}
                  >
                    <Text
                      style={[
                        styles.timePresetChipText,
                        { color: isSelected ? '#ffffff' : colors.textPrimary }
                      ]}
                    >
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Steppers: Hour & Minute Adjusters */}
            <View style={[styles.steppersContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              {/* Hour Control */}
              <View style={[styles.stepperBox, { backgroundColor: colors.surfaceSecondary, borderColor: colors.cardBorder }]}>
                <Text style={[styles.stepperLabel, { color: colors.textSecondary }]}>
                  {t('settings.hour')}
                </Text>
                <View style={styles.stepperActionsRow}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setTempHour((h) => (h === 0 ? 23 : h - 1))}
                    style={[styles.stepperBtn, { backgroundColor: colors.cardBorder }]}
                  >
                    <Ionicons name="remove" size={18} color={colors.textPrimary} />
                  </TouchableOpacity>
                  <Text style={[styles.stepperValueText, { color: colors.textPrimary }]}>
                    {tempHour < 10 ? `0${tempHour}` : tempHour}
                  </Text>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setTempHour((h) => (h === 23 ? 0 : h + 1))}
                    style={[styles.stepperBtn, { backgroundColor: colors.cardBorder }]}
                  >
                    <Ionicons name="add" size={18} color={colors.textPrimary} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Minute Control */}
              <View style={[styles.stepperBox, { backgroundColor: colors.surfaceSecondary, borderColor: colors.cardBorder }]}>
                <Text style={[styles.stepperLabel, { color: colors.textSecondary }]}>
                  {t('settings.minute')}
                </Text>
                <View style={styles.stepperActionsRow}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setTempMinute((m) => (m === 0 ? 55 : (m - 5 + 60) % 60))}
                    style={[styles.stepperBtn, { backgroundColor: colors.cardBorder }]}
                  >
                    <Ionicons name="remove" size={18} color={colors.textPrimary} />
                  </TouchableOpacity>
                  <Text style={[styles.stepperValueText, { color: colors.textPrimary }]}>
                    {tempMinute < 10 ? `0${tempMinute}` : tempMinute}
                  </Text>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setTempMinute((m) => (m === 55 ? 0 : (m + 5) % 60))}
                    style={[styles.stepperBtn, { backgroundColor: colors.cardBorder }]}
                  >
                    <Ionicons name="add" size={18} color={colors.textPrimary} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={[styles.modalBtnRow, { flexDirection: isRTL ? 'row-reverse' : 'row', marginTop: 18 }]}>
              <TouchableOpacity
                onPress={() => setTimeModalOpen(false)}
                style={[styles.modalCancelBtn, { backgroundColor: colors.surfaceSecondary }]}
              >
                <Text style={[styles.modalCancelBtnText, { color: colors.textSecondary }]}>
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveReminderTime}
                style={[styles.modalConfirmBtn, { backgroundColor: colors.accent }]}
              >
                <Text style={styles.modalConfirmBtnText}>
                  {t('common.save')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1
  },
  masthead: {
    paddingHorizontal: 20,
    paddingBottom: 22
  },
  mastheadBar: {
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.16)'
  },
  mastheadTitle: {
    fontFamily: FONT_FAMILY_BOLD,
    fontSize: 20,
    fontWeight: '700'
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16
  },
  sectionTitle: {
    fontFamily: FONT_FAMILY_SEMIBOLD,
    fontSize: 12.5,
    marginBottom: 8,
    marginHorizontal: 4,
    fontWeight: '600',
    textTransform: 'uppercase'
  },
  glassCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 12
  },
  innerCardRow: {
    paddingVertical: 10,
    paddingHorizontal: 6
  },
  cardRowInner: {
    alignItems: 'center',
    gap: 12
  },
  iconChip: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  flagEmoji: {
    fontSize: 28,
    width: 38,
    textAlign: 'center'
  },
  currencySymbolBadge: {
    fontFamily: FONT_FAMILY_BOLD,
    fontSize: 14,
    fontWeight: '700'
  },
  rowTextCol: {
    flex: 1,
    minWidth: 0
  },
  rowMainText: {
    fontFamily: FONT_FAMILY_SEMIBOLD,
    fontSize: 15,
    fontWeight: '600'
  },
  rowSubText: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    marginTop: 2
  },
  hairlineDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 6
  },
  schemeHintText: {
    fontFamily: FONT_FAMILY,
    fontSize: 12.5,
    marginBottom: 14
  },
  brandThemesRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4
  },
  brandCircleItem: {
    alignItems: 'center',
    gap: 6
  },
  brandCircleRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2.5,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center'
  },
  brandCircleInner: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center'
  },
  brandCircleLabel: {
    fontSize: 12,
    marginTop: 2
  },
  appearanceSegmentRow: {
    gap: 6
  },
  appearanceOption: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  appearanceOptionText: {
    fontSize: 13
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end'
  },
  modalBackdropTap: {
    flex: 1
  },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 18,
    paddingHorizontal: 18,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24
  },
  modalSheetHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14
  },
  modalSheetTitle: {
    fontFamily: FONT_FAMILY_BOLD,
    fontSize: 18,
    fontWeight: '700'
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  searchBox: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    gap: 8,
    marginBottom: 12
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0
  },
  choiceRow: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 14,
    alignItems: 'center',
    gap: 12,
    marginBottom: 4
  },
  choiceFlag: {
    fontSize: 26,
    width: 36,
    textAlign: 'center'
  },
  choiceTextCol: {
    flex: 1
  },
  choiceTitle: {
    fontSize: 14.5
  },
  choiceSub: {
    fontSize: 12,
    marginTop: 1
  },
  // Backup & Data Security Card
  backupCard: {
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 16
  },
  backupHeaderRow: {
    alignItems: 'center',
    gap: 14
  },
  backupShieldIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  backupHeaderInfo: {
    flex: 1
  },
  secureBadgeRow: {
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 3
  },
  backupCardTitle: {
    fontFamily: FONT_FAMILY_BOLD,
    fontSize: 16,
    fontWeight: '700'
  },
  secureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 8,
    borderWidth: 1
  },
  secureBadgeText: {
    fontFamily: FONT_FAMILY_SEMIBOLD,
    fontSize: 10.5,
    fontWeight: '600'
  },
  backupCardSubtitle: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    lineHeight: 17
  },
  backupStatusBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginTop: 14,
    gap: 10
  },
  backupStatusItem: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(150, 150, 150, 0.15)'
  },
  backupStatusLabelRow: {
    alignItems: 'center',
    gap: 6
  },
  backupStatusLabel: {
    fontFamily: FONT_FAMILY_MEDIUM,
    fontSize: 13
  },
  backupStatusSubLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: 11,
    marginTop: 1
  },
  backupHealthPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8
  },
  healthDot: {
    width: 6.5,
    height: 6.5,
    borderRadius: 4
  },
  backupHealthText: {
    fontFamily: FONT_FAMILY_SEMIBOLD,
    fontSize: 11.5,
    fontWeight: '600'
  },
  formatTagText: {
    fontFamily: FONT_FAMILY_BOLD,
    fontSize: 12.5,
    fontWeight: '700'
  },
  backupActionsContainer: {
    marginTop: 14,
    gap: 10
  },
  primaryBackupBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 10
  },
  primaryBackupBtnText: {
    fontFamily: FONT_FAMILY_BOLD,
    fontSize: 13.5,
    fontWeight: '700',
    color: '#ffffff'
  },
  secondaryBackupBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 10
  },
  secondaryBackupBtnText: {
    fontFamily: FONT_FAMILY_SEMIBOLD,
    fontSize: 13.5,
    fontWeight: '600'
  },

  // Backup Modals
  backupOptionCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    gap: 12
  },
  backupOptionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  backupOptionTextWrap: {
    flex: 1
  },
  backupOptionTitle: {
    fontFamily: FONT_FAMILY_BOLD,
    fontSize: 14.5,
    fontWeight: '700'
  },
  backupOptionDesc: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16
  },
  backupModalHint: {
    fontFamily: FONT_FAMILY,
    fontSize: 13,
    marginBottom: 14,
    lineHeight: 18
  },
  backupInputContainer: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 10,
    marginBottom: 18
  },
  backupTextInput: {
    flex: 1,
    fontSize: 15,
    padding: 0
  },
  modalBtnRow: {
    gap: 10
  },
  modalCancelBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalCancelBtnText: {
    fontFamily: FONT_FAMILY_SEMIBOLD,
    fontSize: 14,
    fontWeight: '600'
  },
  modalConfirmBtn: {
    flex: 1.4,
    minHeight: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalConfirmBtnText: {
    fontFamily: FONT_FAMILY_BOLD,
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff'
  },

  // Daily Reminder styles
  timeBadgePill: {
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    gap: 4
  },
  timeBadgeText: {
    fontFamily: FONT_FAMILY_BOLD,
    fontSize: 12,
    fontWeight: '700'
  },
  timePreviewCard: {
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14
  },
  timeDigitsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6
  },
  timePreviewDigits: {
    fontFamily: FONT_FAMILY_BOLD,
    fontSize: 38,
    fontWeight: '700'
  },
  timePreviewColon: {
    fontFamily: FONT_FAMILY_BOLD,
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 4
  },
  timePreviewSub: {
    fontFamily: FONT_FAMILY_MEDIUM,
    fontSize: 13,
    marginTop: 2
  },
  timeSectionSubheading: {
    fontFamily: FONT_FAMILY_SEMIBOLD,
    fontSize: 11.5,
    marginBottom: 8,
    textTransform: 'uppercase'
  },
  timePresetsRow: {
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14
  },
  timePresetChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1
  },
  timePresetChipText: {
    fontFamily: FONT_FAMILY_SEMIBOLD,
    fontSize: 12.5,
    fontWeight: '600'
  },
  steppersContainer: {
    gap: 12
  },
  stepperBox: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center'
  },
  stepperLabel: {
    fontFamily: FONT_FAMILY_MEDIUM,
    fontSize: 12,
    marginBottom: 8
  },
  stepperActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%'
  },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  stepperValueText: {
    fontFamily: FONT_FAMILY_BOLD,
    fontSize: 20,
    fontWeight: '700'
  }
});
