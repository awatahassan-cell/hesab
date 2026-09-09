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
import { COUNTRIES_CURRENCIES } from '../utils/currency';
import { exportBackupJSON, restoreBackupFromJSON } from '../utils/export';
import { resetAllDatabaseData } from '../db';
import { Card } from '../components/common/Card';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { PinSetupModal } from '../components/security/PinSetupModal';

export const SettingsScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { colors, typography, isDark } = useTheme();
  const { t } = useTranslation();
  const isRTL = useAppStore((state) => state.isRTL);
  const {
    language,
    setLanguage,
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

  const handleCurrencyChange = (c: any) => {
    setCountryAndCurrency(c.countryCode, c.currencyCode);
  };

  const handleExportBackup = async () => {
    try {
      await exportBackupJSON();
    } catch (e) {
      setConfirmConfig({
        visible: true,
        title: t('common.error', 'هەڵە'),
        message: 'نەتوانرا فایلی پشتیوانی (Backup) هەناردە بکرێت.',
        confirmText: 'باشە',
        isDanger: false,
        onConfirm: () => setConfirmConfig((p) => ({ ...p, visible: false }))
      });
    }
  };

  const handleRestoreBackup = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        const fileUri = res.assets[0].uri;
        const content = await FileSystem.readAsStringAsync(fileUri);
        const success = await restoreBackupFromJSON(content);
        if (success) {
          await refreshAll();
          setConfirmConfig({
            visible: true,
            title: t('common.success', 'سەرکەوتوو بوو'),
            message: 'داتاکان بە سەرکەوتوویی لە فایلی پشتیوانی گەڕێندرانەوە!',
            confirmText: 'تەواو',
            isDanger: false,
            icon: 'checkmark-circle-outline',
            onConfirm: () => setConfirmConfig((p) => ({ ...p, visible: false }))
          });
        } else {
          setConfirmConfig({
            visible: true,
            title: t('common.error', 'هەڵە'),
            message: 'فایلی پشتیوانی نادروستە یان لەکارکەوتووە.',
            confirmText: 'باشە',
            isDanger: false,
            onConfirm: () => setConfirmConfig((p) => ({ ...p, visible: false }))
          });
        }
      }
    } catch (e) {
      setConfirmConfig({
        visible: true,
        title: t('common.error', 'هەڵە'),
        message: 'نەتوانرا فایلەکە بخوێندرێتەوە.',
        confirmText: 'باشە',
        isDanger: false,
        onConfirm: () => setConfirmConfig((p) => ({ ...p, visible: false }))
      });
    }
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
          title: 'ئاگاداری',
          message: 'ئەم مۆبایلە پەنجەمۆر یان ناسینەوەی ڕووخساری نییە.',
          confirmText: 'باشە',
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
          title: 'پەنجەمۆر نەدۆزرایەوە',
          message: 'هیچ پەنجەمۆرێک لە ڕێکخستنی مۆبایلەکەتدا تۆمار نەکراوە. تکایە سەرەتا لە مۆبایلەکەت پەنجەمۆر زیادبکە.',
          confirmText: 'باشە',
          isDanger: false,
          icon: 'finger-print-outline',
          onConfirm: () => setConfirmConfig((p) => ({ ...p, visible: false }))
        });
        return;
      }

      const authResult = await LocalAuthentication.authenticateAsync({
        promptMessage: 'پەنجەمۆرت دابنێ بۆ چالاککردن',
        cancelLabel: 'پەشیمانبوونەوە',
        fallbackLabel: 'کۆد'
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
        title: 'کۆدی تێپەڕبوون (PIN)',
        message: 'دەتەوێت چی بکەیت لە کۆدی ئێستات؟ دەتوانیت کۆدە نوێ بکەیتەوە یان بیسڕیتەوە.',
        confirmText: 'گۆڕینی کۆد',
        cancelText: 'سڕینەوەی کۆد',
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
      title: 'سڕینەوەی کۆد',
      message: 'ئایا دڵنیایت دەتەوێت کۆدی تێپەڕبوون (PIN) لاببەیت؟',
      confirmText: 'سڕینەوە',
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
      title: t('settings.danger_zone', 'ناوچەی هەستیار'),
      message: 'ئایا دڵنیایت؟ هەموو مامەڵە، قەرز، بودجە و داتاکان دەسڕدرێنەوە، بەڵام بەشە سەرەکییەکان پارێزراو دەبن.',
      confirmText: 'سڕینەوەی گشتی',
      cancelText: t('common.cancel', 'پەشیمانبوونەوە'),
      isDanger: true,
      icon: 'warning-outline',
      onConfirm: async () => {
        await resetAllDatabaseData();
        await refreshAll();
        setConfirmConfig({
          visible: true,
          title: t('common.success', 'سەرکەوتوو بوو'),
          message: 'هەموو داتاکان سڕدرانەوە و بەشە سەرەکییەکان گەڕێنرانەوە.',
          confirmText: 'باشە',
          isDanger: false,
          icon: 'checkmark-circle-outline',
          onConfirm: () => setConfirmConfig((p) => ({ ...p, visible: false }))
        });
      }
    });
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        {/* Language Section */}
        <Text style={[typography.captionSmall, { color: colors.textMuted, marginBottom: 6, textAlign: isRTL ? 'right' : 'left' }]}>
          {t('settings.language')}
        </Text>
        <Card style={{ backgroundColor: colors.surface, marginBottom: 16 }}>
          {[
            { code: 'ku', label: 'کوردی (سۆرانی)' },
            { code: 'ar', label: 'العربية' },
            { code: 'en', label: 'English' }
          ].map((lang) => (
            <TouchableOpacity
              key={lang.code}
              onPress={() => handleLanguageChange(lang.code)}
              style={[styles.row, { borderBottomColor: colors.divider, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            >
              <Text style={[typography.body, { color: colors.textPrimary }]}>{lang.label}</Text>
              {language === lang.code && <Ionicons name="checkmark" size={20} color={colors.accent} />}
            </TouchableOpacity>
          ))}
        </Card>

        {/* Categories Manager Link */}
        <Text style={[typography.captionSmall, { color: colors.textMuted, marginBottom: 6, textAlign: isRTL ? 'right' : 'left' }]}>
          {t('categories.title', 'بەشەکان')}
        </Text>
        <Card style={{ backgroundColor: colors.surface, marginBottom: 16 }}>
          <TouchableOpacity
            onPress={() => navigation?.navigate('CategoriesScreen')}
            style={[styles.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
          >
            <Text style={[typography.body, { color: colors.textPrimary }]}>{t('categories.title', 'بەشە سەرەکی و لاوەکییەکان')}</Text>
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
                {pinCode ? 'کۆدی تێپەڕبوون (چالاکە)' : t('settings.set_pin', 'دانانی کۆدی نوێ')}
              </Text>
            </View>
            <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color={colors.textMuted} />
          </TouchableOpacity>

          {pinCode && (
            <TouchableOpacity
              onPress={handleRemovePin}
              style={[styles.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            >
              <Text style={[typography.body, { color: colors.danger }]}>{t('settings.remove_pin', 'لابردنی کۆد')}</Text>
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
            title: t('common.success', 'سەرکەوتوو بوو'),
            message: 'کۆدی تێپەڕبوون بە سەرکەوتوویی دانرا.',
            confirmText: 'باشە',
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
