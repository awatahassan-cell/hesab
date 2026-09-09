import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as LocalAuthentication from 'expo-local-authentication';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme';
import { useAppStore } from '../store/useAppStore';
import { useFinanceStore } from '../store/useFinanceStore';
import { COUNTRIES_CURRENCIES, formatCurrency } from '../utils/currency';
import { exportBackup, pickAndRestoreBackup } from '../utils/backup';
import { resetAllDatabaseData } from '../db';
import { Card } from '../components/common/Card';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { PinSetupModal } from '../components/security/PinSetupModal';
import { AuroraBackground } from '../components/common/AuroraBackground';
import { AppDialog } from '../components/common/AppDialog';
import { rescheduleAll } from '../services/notifications';
import { resetBudgetAlerts } from '../services/budgetAlerts';
import { LANGUAGES } from '../i18n';
import { getCountryLanguages } from '../utils/currencyData';

export const SettingsScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { colors, typography, isDark } = useTheme();
  const { t } = useTranslation();
  const isRTL = useAppStore((state) => state.isRTL);
  const {
    language,
    setLanguage,
    countryCode,
    primaryCurrency,
    setCountryAndCurrency,
    themeMode,
    setThemeMode,
    isBiometricsEnabled,
    setBiometricsEnabled,
    pinCode,
    setPinCode
  } = useAppStore();

  const { refreshAll } = useFinanceStore();

  // Modals state
  const [showPinModal, setShowPinModal] = useState(false);
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

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
  };

  // The languages actually read in the chosen country come first, so someone
  // in Turkey is not scrolling past Kurdish and Arabic to reach Turkish.
  const orderedLanguages = React.useMemo(() => {
    const local = getCountryLanguages(countryCode);
    return [
      ...local.map((code) => LANGUAGES.find((l) => l.code === code)).filter(Boolean),
      ...LANGUAGES.filter((l) => !local.includes(l.code))
    ] as typeof LANGUAGES;
  }, [countryCode]);

  const handleCurrencyChange = (c: any) => {
    setCountryAndCurrency(c.countryCode, c.currencyCode);
  };

  const handleExportBackup = async () => {
    try {
      const { counts } = await exportBackup();
      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      AppDialog.alert(
        t('backup.export_done'),
        t('backup.export_summary', { count: total }),
        undefined,
        { tone: 'success', icon: 'wallet' }
      );
    } catch {
      AppDialog.alert(t('common.error_short'), t('backup.export_failed'), undefined, {
        tone: 'danger'
      });
    }
  };

  const handleRestoreBackup = () => {
    // Restoring wipes what is there, so it is confirmed before the picker
    // opens rather than after a file is already chosen.
    AppDialog.alert(
      t('backup.restore_confirm_title'),
      t('backup.restore_confirm_body'),
      [
        { style: 'cancel' },
        {
          text: t('common.restore'),
          style: 'destructive',
          onPress: async () => {
            const result = await pickAndRestoreBackup();
            if (result.ok) {
              await refreshAll();
              // The restore replaced the rows the old notifications pointed at,
              // so the schedule has to be rebuilt from the new list.
              const { reminders } = useFinanceStore.getState();
              await rescheduleAll(reminders, (r) =>
                t('reminders.notification_body', {
                  amount: formatCurrency(r.amount, r.currency)
                })
              );
              const total = Object.values(result.counts ?? {}).reduce((a, b) => a + b, 0);
              AppDialog.alert(
                t('backup.restore_done'),
                t('backup.export_summary', { count: total }),
                undefined,
                { tone: 'success' }
              );
              return;
            }
            if (result.detail === 'cancelled') return;

            const message =
              result.problem === 'not-a-hesab-backup'
                ? t('backup.restore_failed_format')
                : result.problem === 'from-newer-app'
                ? t('backup.restore_failed_newer')
                : result.problem === 'write-failed'
                ? t('backup.restore_failed_write')
                : t('backup.restore_failed_unreadable');

            AppDialog.alert(t('common.error_short'), message, undefined, { tone: 'danger' });
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

    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) {
        setConfirmConfig({
          visible: true,
          title: t('common.notice'),
          message: t('settings.no_biometric_hardware'),
          confirmText: t('common.ok'),
          isDanger: false,
          icon: 'information-circle-outline',
          onConfirm: () => setConfirmConfig((p) => ({ ...p, visible: false }))
        });
        return;
      }

      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!isEnrolled) {
        setConfirmConfig({
          visible: true,
          title: t('settings.no_biometrics_enrolled_title'),
          message: t('settings.no_biometrics_enrolled_body'),
          confirmText: t('common.ok'),
          isDanger: false,
          icon: 'finger-print-outline',
          onConfirm: () => setConfirmConfig((p) => ({ ...p, visible: false }))
        });
        return;
      }

      const authResult = await LocalAuthentication.authenticateAsync({
        promptMessage: t('settings.biometrics_prompt'),
        cancelLabel: t('common.cancel'),
        fallbackLabel: t('security.code')
      });

      if (authResult.success) {
        await setBiometricsEnabled(true);
      }
    } catch (err) {
      console.warn('Biometrics error', err);
    }
  };

  const handlePinAction = () => {
    if (!pinCode) {
      setShowPinModal(true);
    } else {
      setConfirmConfig({
        visible: true,
        title: t('settings.pin_lock'),
        message: t('settings.pin_options_body'),
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

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <AuroraBackground />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        {/* Language Section */}
        <Text style={[typography.captionSmall, { color: colors.textMuted, marginBottom: 6, textAlign: isRTL ? 'right' : 'left' }]}>
          {t('settings.language')}
        </Text>
        <Card style={{ backgroundColor: colors.surface, marginBottom: 16 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingVertical: 4 }}>
            {orderedLanguages.map((lang) => {
              const isSelected = language === lang.code;
              return (
                <TouchableOpacity
                  key={lang.code}
                  onPress={() => handleLanguageChange(lang.code)}
                  style={[
                    styles.currencyChip,
                    {
                      backgroundColor: isSelected ? colors.accent : colors.surfaceSecondary,
                      borderColor: isSelected ? colors.accent : colors.cardBorder
                    }
                  ]}
                >
                  <Text style={{ color: isSelected ? colors.textInverse : colors.textPrimary, fontWeight: '600' }}>
                    {lang.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Card>

        {/* Categories Manager Link */}
        <Text style={[typography.captionSmall, { color: colors.textMuted, marginBottom: 6, textAlign: isRTL ? 'right' : 'left' }]}>
          {t('categories.title', t('categories.title'))}
        </Text>
        <Card style={{ backgroundColor: colors.surface, marginBottom: 16 }}>
          <TouchableOpacity
            onPress={() => navigation?.navigate('CategoriesScreen')}
            style={[styles.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
          >
            <Text style={[typography.body, { color: colors.textPrimary }]}>{t('categories.title', t('menu.categories_title'))}</Text>
            <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </Card>

        {/* Primary Currency Section */}
        <Text style={[typography.captionSmall, { color: colors.textMuted, marginBottom: 6, textAlign: isRTL ? 'right' : 'left' }]}>
          {t('settings.primary_currency')}
        </Text>
        <Card style={{ backgroundColor: colors.surface, marginBottom: 16 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingVertical: 4 }}>
            {COUNTRIES_CURRENCIES.map((c) => {
              const isSelected = primaryCurrency === c.currencyCode;
              return (
                <TouchableOpacity
                  key={c.countryCode}
                  onPress={() => handleCurrencyChange(c)}
                  style={[
                    styles.currencyChip,
                    {
                      backgroundColor: isSelected ? colors.accent : colors.surfaceSecondary,
                      borderColor: isSelected ? colors.accent : colors.cardBorder
                    }
                  ]}
                >
                  <Text style={{ fontSize: 16 }}>{c.flag}</Text>
                  <Text style={{ color: isSelected ? colors.textInverse : colors.textPrimary, fontWeight: '600', marginLeft: 4 }}>
                    {c.currencyCode}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Card>

        {/* Theme Appearance */}
        <Text style={[typography.captionSmall, { color: colors.textMuted, marginBottom: 6, textAlign: isRTL ? 'right' : 'left' }]}>
          {t('settings.theme')}
        </Text>
        <Card style={{ backgroundColor: colors.surface, marginBottom: 16 }}>
          {[
            { id: 'system', label: t('settings.theme_system') },
            { id: 'light', label: t('settings.theme_light') },
            { id: 'dark', label: t('settings.theme_dark') }
          ].map((th) => (
            <TouchableOpacity
              key={th.id}
              onPress={() => setThemeMode(th.id as any)}
              style={[styles.row, { borderBottomColor: colors.divider, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            >
              <Text style={[typography.body, { color: colors.textPrimary }]}>{th.label}</Text>
              {themeMode === th.id && <Ionicons name="checkmark" size={20} color={colors.accent} />}
            </TouchableOpacity>
          ))}
        </Card>

        {/* Security Section */}
        <Text style={[typography.captionSmall, { color: colors.textMuted, marginBottom: 6, textAlign: isRTL ? 'right' : 'left' }]}>
          {t('settings.security')}
        </Text>
        <Card style={{ backgroundColor: colors.surface, marginBottom: 16 }}>
          <View style={[styles.row, { borderBottomColor: colors.divider, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="finger-print-outline" size={20} color={colors.accent} />
              <Text style={[typography.body, { color: colors.textPrimary }]}>{t('settings.biometrics')}</Text>
            </View>
            <Switch
              value={isBiometricsEnabled}
              onValueChange={handleToggleBiometrics}
              trackColor={{ true: colors.accent, false: colors.cardBorder }}
            />
          </View>

          <TouchableOpacity
            onPress={handlePinAction}
            style={[styles.row, { borderBottomColor: colors.divider, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
          >
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name={pinCode ? 'lock-closed' : 'keypad-outline'} size={20} color={pinCode ? colors.accent : colors.textMuted} />
              <Text style={[typography.body, { color: colors.textPrimary }]}>
                {pinCode ? t('security.pin_enabled') : t('settings.set_pin', t('settings.set_pin'))}
              </Text>
            </View>
            <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color={colors.textMuted} />
          </TouchableOpacity>

          {pinCode && (
            <TouchableOpacity
              onPress={handleRemovePin}
              style={[styles.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            >
              <Text style={[typography.body, { color: colors.danger }]}>{t('settings.remove_pin', t('settings.remove_pin_short'))}</Text>
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
            </TouchableOpacity>
          )}
        </Card>

        {/* Backup & Export */}
        <Text style={[typography.captionSmall, { color: colors.textMuted, marginBottom: 6, textAlign: isRTL ? 'right' : 'left' }]}>
          {t('settings.backup_export')}
        </Text>
        <Card style={{ backgroundColor: colors.surface, marginBottom: 16 }}>
          <TouchableOpacity
            onPress={handleExportBackup}
            style={[styles.row, { borderBottomColor: colors.divider, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
          >
            <Text style={[typography.body, { color: colors.textPrimary }]}>{t('settings.export_json')}</Text>
            <Ionicons name="share-outline" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleRestoreBackup}
            style={[styles.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
          >
            <Text style={[typography.body, { color: colors.textPrimary }]}>{t('settings.restore_json')}</Text>
            <Ionicons name="cloud-upload-outline" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </Card>

        {/* Danger Zone */}
        <Text style={[typography.captionSmall, { color: colors.danger, marginBottom: 6, textAlign: isRTL ? 'right' : 'left' }]}>
          {t('settings.danger_zone')}
        </Text>
        <Card style={{ backgroundColor: colors.surface, borderColor: colors.danger + '40', marginBottom: 24 }}>
          <TouchableOpacity
            onPress={handleResetData}
            style={[styles.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
          >
            <Text style={[typography.bodySemibold, { color: colors.danger }]}>{t('settings.reset_all')}</Text>
            <Ionicons name="warning-outline" size={20} color={colors.danger} />
          </TouchableOpacity>
        </Card>
      </ScrollView>

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

      {/* Custom Confirmation Modal */}
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
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1
  },
  row: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  currencyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8
  }
});
