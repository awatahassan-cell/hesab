import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
  Platform,
  StatusBar as RNStatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme';
import { useFinanceStore } from '../store/useFinanceStore';
import { useAppStore } from '../store/useAppStore';
import { createTransaction } from '../db/queries/transactions';
import { createCategory, createSubcategory } from '../db/queries/categories';
import { SegmentedControl } from '../components/common/SegmentedControl';
import { Button } from '../components/common/Button';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { CurvedHeader } from '../components/navigation/CurvedHeader';
import { AuroraBackground } from '../components/common/AuroraBackground';
import { AppDialog } from '../components/common/AppDialog';
import { getCurrencySymbol, per100Usd, rateFromPer100Usd } from '../utils/currency';
import { createRecurringRule } from '../db/queries/recurring';
import { FREQUENCIES, Frequency, addStep } from '../utils/recurrence';
import { QuickInputKeypad } from '../components/keypad/QuickInputKeypad';
import { FONT_FAMILY_BOLD, FONT_FAMILY_SEMIBOLD } from '../theme/typography';

interface AddTransactionScreenProps {
  navigation: any;
  route?: any;
}

const AVAILABLE_ICONS = [
  'restaurant-outline', 'cart-outline', 'car-outline', 'speedometer-outline',
  'construct-outline', 'home-outline', 'flash-outline', 'wifi-outline',
  'medkit-outline', 'school-outline', 'shirt-outline', 'cut-outline',
  'game-controller-outline', 'people-outline', 'gift-outline', 'airplane-outline',
  'card-outline', 'cash-outline', 'briefcase-outline', 'business-outline',
  'heart-outline', 'paw-outline', 'fitness-outline', 'cafe-outline',
  'book-outline', 'headset-outline', 'football-outline', 'flower-outline'
];

export const AddTransactionScreen: React.FC<AddTransactionScreenProps> = ({ navigation, route }) => {
  const { colors, typography, radius, categoryPalette } = useTheme();
  const { t } = useTranslation();
  const isRTL = useAppStore((state) => state.isRTL);
  const primaryCurrency = useAppStore((state) => state.primaryCurrency);
  const referenceCurrency = useAppStore((state) => state.referenceCurrency);
  const marketRate100USD = useAppStore((state) => state.marketRate100USD);
  const exchangeRates = useAppStore((state) => state.exchangeRates);
  const { accounts, categories, refreshAll } = useFinanceStore();

  const initialType = (route?.params?.type === 'income' ? 'income' : 'expense') as 'expense' | 'income';
  const [type, setType] = useState<'expense' | 'income'>(initialType);
  const [amountStr, setAmountStr] = useState('');
  const [txCurrency, setTxCurrency] = useState(primaryCurrency);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState('');
  const [note, setNote] = useState('');
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [repeat, setRepeat] = useState<Frequency | null>(null);
  const [saving, setSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showCategoryPickerModal, setShowCategoryPickerModal] = useState(false);
  const catScrollRef = useRef<ScrollView>(null);

  useFocusEffect(
    React.useCallback(() => {
      const p = route?.params?.type;
      if (p === 'income' || p === 'expense') {
        setType(p);
      }
    }, [route?.params?.type])
  );

  useEffect(() => {
    const p = route?.params?.type;
    if (p === 'income' || p === 'expense') {
      setType(p);
    }
  }, [route?.params?.type]);

  // New Category modal state
  const [showAddCatModal, setShowAddCatModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('pricetag-outline');
  const [newCatColor, setNewCatColor] = useState(categoryPalette[0] || '#EF4444');

  // New Subcategory modal state
  const [showAddSubModal, setShowAddSubModal] = useState(false);
  const [newSubName, setNewSubName] = useState('');

  const safeAccounts = (accounts || []).filter((a): a is NonNullable<typeof a> => Boolean(a && a.id && !a.is_archived));
  const safeCategories = (categories || []).filter((c): c is NonNullable<typeof c> => Boolean(c && c.id));

  // Initialize accounts
  useEffect(() => {
    if (safeAccounts.length > 0 && (!selectedAccountId || !safeAccounts.some((a) => a.id === selectedAccountId))) {
      setSelectedAccountId(safeAccounts[0].id);
      if (safeAccounts.length > 1) {
        setToAccountId(safeAccounts[1].id);
      }
    }
  }, [safeAccounts, selectedAccountId]);

  // Filter categories by expense / income
  const filteredCategories = safeCategories.filter(
    (c) => c.type === (type === 'income' ? 'income' : 'expense')
  );

  // Initialize selected category
  useEffect(() => {
    if (filteredCategories.length > 0 && (!selectedCategoryId || !filteredCategories.some((c) => c.id === selectedCategoryId))) {
      setSelectedCategoryId(filteredCategories[0].id);
      setSelectedSubcategoryId('');
    }
  }, [type, filteredCategories, selectedCategoryId]);

  const activeCategory = safeCategories.find((c) => c.id === selectedCategoryId);
  const subcategories = activeCategory?.subcategories || [];

  const handleClearAmount = () => {
    setAmountStr('');
  };

  const toggleCurrency = () => {
    setTxCurrency((prev) => (prev === primaryCurrency ? (referenceCurrency || 'USD') : primaryCurrency));
  };

  const handlePickReceipt = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.7
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setReceiptUri(result.assets[0].uri);
      }
    } catch (e) {
      console.log('Error picking image', e);
    }
  };

  // Create custom category inline
  const handleSaveNewCategory = async () => {
    if (!newCatName.trim()) {
      AppDialog.alert(t('common.error'), t('categories.category_name'));
      return;
    }

    try {
      const newId = await createCategory({
        name_key: 'custom',
        custom_name: newCatName.trim(),
        type: type === 'income' ? 'income' : 'expense',
        icon: newCatIcon,
        color: newCatColor
      });

      await refreshAll();
      setSelectedCategoryId(newId);
      setSelectedSubcategoryId('');
      setNewCatName('');
      setShowAddCatModal(false);
    } catch (e) {
      console.error('Failed to create custom category', e);
      AppDialog.alert(t('common.error'), 'Failed to create category');
    }
  };

  // Create custom subcategory inline
  const handleSaveNewSubcategory = async () => {
    if (!activeCategory || !newSubName.trim()) {
      AppDialog.alert(t('common.error'), t('common.subcategory'));
      return;
    }

    try {
      const subId = await createSubcategory(activeCategory.id, newSubName.trim());
      await refreshAll();
      setSelectedSubcategoryId(subId);
      setNewSubName('');
      setShowAddSubModal(false);
    } catch (e) {
      console.error('Failed to create custom subcategory', e);
      AppDialog.alert(t('common.error'), 'Failed to create subcategory');
    }
  };

  const handleSave = async () => {
    const finalAmount = parseFloat(amountStr);
    if (!finalAmount || finalAmount <= 0) {
      AppDialog.alert(t('common.error'), t('add.enter_valid_amount'));
      return;
    }

    if (!selectedAccountId) {
      AppDialog.alert(t('common.error'), t('add.select_account'));
      return;
    }

    setSaving(true);
    try {
      const ratePerDollar = rateFromPer100Usd(
        txCurrency,
        marketRate100USD || per100Usd(txCurrency, exchangeRates)
      );

      await createTransaction({
        type,
        amount: finalAmount,
        currency: txCurrency,
        exchange_rate: ratePerDollar,
        account_id: selectedAccountId,
        category_id: selectedCategoryId || undefined,
        subcategory_id: selectedSubcategoryId || undefined,
        date_time: new Date().toISOString(),
        note: note.trim() || undefined,
        receipt_uri: receiptUri || undefined
      });

      if (repeat) {
        // The transaction just saved covers today, so the rule first posts at
        // the next occurrence — otherwise opening the app would post it twice.
        // `start_date` stays today so it anchors the day of the month: storing
        // the clamped next date instead would pin a rule set up on the 31st to
        // the 28th for good.
        const anchor = new Date();
        const next = addStep(anchor, repeat, 1, anchor.getDate());
        await createRecurringRule({
          type,
          amount: finalAmount,
          currency: txCurrency,
          account_id: selectedAccountId,
          category_id: selectedCategoryId || undefined,
          subcategory_id: selectedSubcategoryId || undefined,
          note: note.trim() || undefined,
          frequency: repeat,
          start_date: anchor.toISOString(),
          first_run: next.toISOString()
        });
      }

      await refreshAll();
      setSaving(false);

      // Reset and go back
      setAmountStr('');
      setNote('');
      setReceiptUri(null);
      setRepeat(null);
      navigation.navigate('Home');
    } catch (err) {
      console.error('Failed to create transaction', err);
      setSaving(false);
      AppDialog.alert(t('common.error'), 'Failed to save transaction');
    }
  };

  const formatAmountDisplay = (val: string) => {
    if (!val) return '0';
    if (val.endsWith('.')) return val;
    const parts = val.split('.');
    const intPart = parts[0] ? parseInt(parts[0], 10).toLocaleString('en-US') : '0';
    return parts.length > 1 ? `${intPart}.${parts[1]}` : intPart;
  };

  const insets = useSafeAreaInsets();
  const topSafeInset = Platform.OS === 'android'
    ? (RNStatusBar.currentHeight || insets.top || 24) + 4
    : Math.max(insets.top, 20) + 4;
  const bottomSafePadding = Math.max(insets.bottom, 10);

  const currentTypeColor =
    type === 'expense' ? colors.expense : type === 'income' ? colors.income : colors.transfer;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <CurvedHeader
        title={type === 'expense' ? t('types.expense') : t('types.income')}
      >
        <View style={styles.segmentWrapper}>
          <View
            style={[
              styles.typeSwitcher,
              {
                backgroundColor: 'rgba(255, 255, 255, 0.22)',
                flexDirection: isRTL ? 'row-reverse' : 'row'
              }
            ]}
          >
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                setType('expense');
                setSelectedCategoryId('');
                setSelectedSubcategoryId('');
              }}
              style={[
                styles.typeOption,
                type === 'expense' && {
                  backgroundColor: '#FFFFFF',
                  shadowColor: '#000000',
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.18,
                  shadowRadius: 6,
                  elevation: 3
                }
              ]}
            >
              <Ionicons
                name="arrow-down-circle"
                size={16}
                color={type === 'expense' ? colors.expense : 'rgba(255, 255, 255, 0.85)'}
                style={{ marginHorizontal: 4 }}
              />
              <Text
                style={[
                  styles.typeOptionText,
                  {
                    color: type === 'expense' ? colors.expense : '#FFFFFF',
                    fontWeight: type === 'expense' ? '700' : '600'
                  }
                ]}
              >
                {t('types.expense')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                setType('income');
                setSelectedCategoryId('');
                setSelectedSubcategoryId('');
              }}
              style={[
                styles.typeOption,
                type === 'income' && {
                  backgroundColor: '#FFFFFF',
                  shadowColor: '#000000',
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.18,
                  shadowRadius: 6,
                  elevation: 3
                }
              ]}
            >
              <Ionicons
                name="arrow-up-circle"
                size={16}
                color={type === 'income' ? colors.income : 'rgba(255, 255, 255, 0.85)'}
                style={{ marginHorizontal: 4 }}
              />
              <Text
                style={[
                  styles.typeOptionText,
                  {
                    color: type === 'income' ? colors.income : '#FFFFFF',
                    fontWeight: type === 'income' ? '700' : '600'
                  }
                ]}
              >
                {t('types.income')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </CurvedHeader>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: 8,
            paddingBottom: bottomSafePadding
          }
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={showAdvanced}
        bounces={false}
      >
        {/* Seamless Hero Amount Display — 100% Borderless */}
        <View style={styles.amountHeroContainer}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={toggleCurrency}
            style={[
              styles.currencyPillFloating,
              {
                backgroundColor: colors.surfaceSecondary,
                flexDirection: isRTL ? 'row-reverse' : 'row'
              }
            ]}
          >
            <Text style={[styles.currencyPillText, { color: colors.accent }]}>
              {getCurrencySymbol(txCurrency) === txCurrency ? txCurrency : `${txCurrency} (${getCurrencySymbol(txCurrency)})`}
            </Text>
            <Ionicons name="swap-horizontal" size={13} color={colors.accent} style={{ marginHorizontal: 4 }} />
          </TouchableOpacity>

          <View style={styles.amountDisplayRow}>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              style={[
                styles.amountDisplayText,
                {
                  color: amountStr ? currentTypeColor : colors.textMuted + '40',
                  textAlign: 'center'
                }
              ]}
            >
              {formatAmountDisplay(amountStr)}
            </Text>

            {amountStr.length > 0 && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleClearAmount}
                style={[
                  styles.clearBtnFloating,
                  isRTL ? { left: 8 } : { right: 8 }
                ]}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close-circle" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Quick Category Capsules — Starts from Right in RTL */}
        <View style={styles.quickCategoryContainer}>
          <ScrollView
            ref={catScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[
              styles.quickCategoryRow,
              {
                alignItems: 'center',
                flexDirection: isRTL ? 'row-reverse' : 'row'
              }
            ]}
            style={styles.catScrollView}
          >
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => setShowCategoryPickerModal(true)}
              style={[
                styles.quickCatChip,
                styles.allCatChip,
                {
                  backgroundColor: colors.surfaceSecondary,
                  elevation: 0
                }
              ]}
            >
              <Ionicons name="grid-outline" size={14} color={colors.accent} />
              <Text style={[styles.quickCatText, { color: colors.accent, fontWeight: '700' }]}>
                {t('common.all')}
              </Text>
            </TouchableOpacity>

            {filteredCategories.slice(0, 10).map((cat) => {
              const isSelected = cat.id === selectedCategoryId;
              const catName = cat.custom_name || t(`categories.names.${cat.name_key}`, cat.name_key);
              const iconName = cat.icon as keyof typeof Ionicons.glyphMap;

              return (
                <TouchableOpacity
                  key={cat.id}
                  activeOpacity={0.75}
                  onPress={() => {
                    setSelectedCategoryId(cat.id);
                    setSelectedSubcategoryId('');
                  }}
                  style={[
                    styles.quickCatChip,
                    {
                      backgroundColor: isSelected ? cat.color : colors.surfaceSecondary,
                      shadowColor: isSelected ? cat.color : 'transparent',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: isSelected ? 0.2 : 0,
                      shadowRadius: 4,
                      elevation: 0
                    }
                  ]}
                >
                  <Ionicons
                    name={iconName}
                    size={14}
                    color={isSelected ? '#FFFFFF' : cat.color}
                  />
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.quickCatText,
                      {
                        color: isSelected ? '#FFFFFF' : colors.textPrimary,
                        fontWeight: isSelected ? '700' : '600'
                      }
                    ]}
                  >
                    {catName}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* In-App Number Pad */}
        <View style={styles.keypadWrapper}>
          <QuickInputKeypad
            value={amountStr}
            onChange={setAmountStr}
            currency={txCurrency}
            onClear={handleClearAmount}
          />
        </View>

        {/* Primary Action Button — 100% Borderless & Floating */}
        <View style={styles.saveActionWrapper}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleSave}
            disabled={saving}
            style={[
              styles.saveBtn,
              {
                backgroundColor: currentTypeColor,
                shadowColor: currentTypeColor,
                flexDirection: isRTL ? 'row-reverse' : 'row'
              }
            ]}
          >
            <Ionicons
              name={saving ? 'hourglass-outline' : 'checkmark-circle'}
              size={22}
              color="#FFFFFF"
              style={{ marginHorizontal: 6 }}
            />
            <Text style={styles.saveBtnText}>
              {saving
                ? t('common.loading')
                : `${
                    type === 'expense'
                      ? t('types.save_expense')
                      : t('types.save_income')
                  } (${formatAmountDisplay(amountStr)} ${getCurrencySymbol(txCurrency)})`}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Collapsible "More Details" Accordion */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setShowAdvanced(!showAdvanced)}
          style={[styles.advancedToggle, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
        >
          <Text style={[styles.advancedToggleText, { color: colors.accent }]}>
            {showAdvanced ? `${t('add.fewer_details')} ▴` : `${t('add.more_details')} ▾`}
          </Text>
        </TouchableOpacity>

        {showAdvanced && (
          <View style={styles.advancedSection}>
            {/* Account Selector */}
            {safeAccounts.length > 1 && (
              <View style={styles.sectionWrapper}>
                <Text style={[typography.caption, { color: colors.textMuted, textAlign: isRTL ? 'right' : 'left', marginBottom: 8 }]}>
                  {t('add.select_account', t('common.account'))}
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalChips}>
                  {safeAccounts.map((acc) => {
                    const isSelected = acc.id === selectedAccountId;
                    return (
                      <TouchableOpacity
                        key={acc.id}
                        activeOpacity={0.75}
                        onPress={() => setSelectedAccountId(acc.id)}
                        style={[
                          styles.accountChip,
                          {
                            backgroundColor: isSelected ? colors.accent : colors.surfaceSecondary
                          }
                        ]}
                      >
                        <Ionicons
                          name={(acc.icon as any) || 'wallet-outline'}
                          size={16}
                          color={isSelected ? '#FFFFFF' : colors.textPrimary}
                        />
                        <Text
                          style={[
                            typography.caption,
                            {
                              color: isSelected ? '#FFFFFF' : colors.textPrimary,
                              fontWeight: isSelected ? '700' : '500',
                              marginHorizontal: 6
                            }
                          ]}
                        >
                          {acc.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Subcategories (if selected category has subcategories) */}
            {activeCategory && subcategories.length > 0 && (
              <View style={styles.sectionWrapper}>
                <View style={[styles.sectionHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={[typography.captionSmall, { color: colors.textMuted, fontWeight: '600' }]}>
                    {t('add.select_subcategory')}
                  </Text>
                  <TouchableOpacity onPress={() => setShowAddSubModal(true)}>
                    <Text style={[typography.captionSmall, { color: colors.accent, fontWeight: '700' }]}>
                      + {t('categories.add_subcategory')}
                    </Text>
                  </TouchableOpacity>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalChips}>
                  {subcategories.map((sub) => {
                    const isSelected = sub.id === selectedSubcategoryId;
                    const subName = sub.custom_name || t(`categories.subcategories.${sub.name_key}`, sub.name_key);

                    return (
                      <TouchableOpacity
                        key={sub.id}
                        activeOpacity={0.75}
                        onPress={() => setSelectedSubcategoryId(isSelected ? '' : sub.id)}
                        style={[
                          styles.subChip,
                          {
                            backgroundColor: isSelected ? colors.accent : colors.surfaceSecondary
                          }
                        ]}
                      >
                        <Text
                          style={[
                            typography.captionSmall,
                            {
                              color: isSelected ? '#FFFFFF' : colors.textSecondary,
                              fontWeight: isSelected ? '700' : '500'
                            }
                          ]}
                        >
                          {subName}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Note input & Receipt Attachment */}
            <View style={styles.sectionWrapper}>
              <View
                style={[
                  styles.noteInputCard,
                  {
                    backgroundColor: colors.surfaceSecondary,
                    flexDirection: isRTL ? 'row-reverse' : 'row'
                  }
                ]}
              >
                <Ionicons name="document-text-outline" size={20} color={colors.textMuted} style={{ marginHorizontal: 8 }} />
                <TextInput
                  placeholder={t('add.note_placeholder')}
                  placeholderTextColor={colors.textMuted}
                  value={note}
                  onChangeText={setNote}
                  textAlign={isRTL ? 'right' : 'left'}
                  style={[
                    styles.noteTextInput,
                    {
                      color: colors.textPrimary
                    }
                  ]}
                />
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={handlePickReceipt}
                  style={[styles.receiptBtn, { backgroundColor: colors.surface }]}
                >
                  <Ionicons
                    name={receiptUri ? 'checkmark-circle' : 'camera-outline'}
                    size={20}
                    color={receiptUri ? colors.success : colors.textMuted}
                  />
                </TouchableOpacity>
              </View>

              {/* Receipt Preview */}
              {receiptUri && (
                <View style={styles.receiptPreviewWrap}>
                  <Image source={{ uri: receiptUri }} style={styles.receiptThumb} />
                  <TouchableOpacity
                    onPress={() => setReceiptUri(null)}
                    style={[styles.deleteReceiptBtn, { backgroundColor: colors.danger }]}
                  >
                    <Ionicons name="close" size={14} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              )}

              {/* Repeat */}
              <Text
                style={[
                  typography.captionSmall,
                  { color: colors.textMuted, marginTop: 14, marginBottom: 8, textAlign: isRTL ? 'right' : 'left' }
                ]}
              >
                {t('add.recurring')}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {([null, ...FREQUENCIES] as (Frequency | null)[]).map((option) => {
                  const on = repeat === option;
                  const label = option ? t(`add.recurring_${option}`) : t('common.no_repeat');
                  return (
                    <TouchableOpacity
                      key={option ?? 'none'}
                      onPress={() => setRepeat(option)}
                      style={[
                        styles.repeatChip,
                        {
                          backgroundColor: on ? colors.accent : colors.surfaceSecondary
                        }
                      ]}
                    >
                      <Text
                        style={{
                          color: on ? colors.textInverse : colors.textPrimary,
                          fontWeight: '600',
                          fontSize: 12
                        }}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Modal: Category Picker (Opened by "هەموو") */}
      <Modal
        visible={showCategoryPickerModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCategoryPickerModal(false)}
      >
        <View style={styles.pickerOverlay}>
          <TouchableOpacity
            style={styles.pickerBackdropTap}
            activeOpacity={1}
            onPress={() => setShowCategoryPickerModal(false)}
          />
          <View style={[styles.pickerSheet, { backgroundColor: colors.surface }]}>
            {/* Modal Header */}
            <View style={[styles.pickerHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.pickerTitleGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons name="grid-outline" size={20} color={currentTypeColor} />
                <Text style={[styles.pickerTitle, { color: colors.textPrimary }]}>
                  {t('add.select_category')}
                </Text>
                <View style={[styles.pickerCountBadge, { backgroundColor: colors.surfaceSecondary }]}>
                  <Text style={[styles.pickerCountText, { color: colors.textSecondary }]}>
                    {filteredCategories.length}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setShowCategoryPickerModal(false)}
                style={[styles.pickerCloseBtn, { backgroundColor: colors.surfaceSecondary }]}
              >
                <Ionicons name="close" size={18} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Category Grid in Modal */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.pickerGridContainer}
            >
              <View style={[styles.pickerGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                {filteredCategories.map((cat) => {
                  const isSelected = cat.id === selectedCategoryId;
                  const catName = cat.custom_name || t(`categories.names.${cat.name_key}`, cat.name_key);
                  const iconName = cat.icon as keyof typeof Ionicons.glyphMap;

                  return (
                    <TouchableOpacity
                      key={cat.id}
                      activeOpacity={0.75}
                      onPress={() => {
                        setSelectedCategoryId(cat.id);
                        setSelectedSubcategoryId('');
                        setShowCategoryPickerModal(false);
                      }}
                      style={[
                        styles.pickerCard,
                        {
                          backgroundColor: isSelected ? cat.color + '1A' : colors.surfaceSecondary
                        }
                      ]}
                    >
                      <View
                        style={[
                          styles.pickerIconCircle,
                          {
                            backgroundColor: isSelected ? cat.color : cat.color + '22'
                          }
                        ]}
                      >
                        <Ionicons
                          name={iconName}
                          size={22}
                          color={isSelected ? '#FFFFFF' : cat.color}
                        />
                      </View>
                      <Text
                        style={[
                          styles.pickerCardText,
                          {
                            color: isSelected ? cat.color : colors.textPrimary,
                            fontWeight: isSelected ? '700' : '600'
                          }
                        ]}
                        numberOfLines={1}
                      >
                        {catName}
                      </Text>
                      {isSelected && (
                        <View style={[styles.pickerCheckBadge, { backgroundColor: cat.color }]}>
                          <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            {/* Bottom Add Category Button */}
            <View style={styles.pickerBottomBar}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  setShowCategoryPickerModal(false);
                  setShowAddCatModal(true);
                }}
                style={[styles.pickerAddBtn, { backgroundColor: colors.surfaceSecondary, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              >
                <Ionicons name="add-circle" size={20} color={colors.accent} />
                <Text style={[styles.pickerAddBtnText, { color: colors.accent }]}>
                  {t('categories.add_category')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Add Category Inline */}
      <Modal visible={showAddCatModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
            <Text style={[typography.titleSmall, { color: colors.textPrimary, marginBottom: 12, textAlign: isRTL ? 'right' : 'left' }]}>
              {t('categories.add_category')} ({type === 'income' ? t('types.income') : t('types.expense')})
            </Text>

            <TextInput
              placeholder={t('categories.category_name')}
              placeholderTextColor={colors.textMuted}
              value={newCatName}
              onChangeText={setNewCatName}
              textAlign={isRTL ? 'right' : 'left'}
              style={[
                styles.modalInput,
                {
                  backgroundColor: colors.surfaceSecondary,
                  color: colors.textPrimary,
                  borderRadius: radius.md
                }
              ]}
              autoFocus
            />

            {/* Color selection */}
            <Text style={[typography.caption, { color: colors.textMuted, marginTop: 12, marginBottom: 6, textAlign: isRTL ? 'right' : 'left' }]}>
              {t('categories.select_color')}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {categoryPalette.map((col) => (
                <TouchableOpacity
                  key={col}
                  onPress={() => setNewCatColor(col)}
                  style={[
                    styles.colorDot,
                    {
                      backgroundColor: col,
                      borderColor: newCatColor === col ? colors.textPrimary : 'transparent',
                      borderWidth: newCatColor === col ? 3 : 0
                    }
                  ]}
                />
              ))}
            </ScrollView>

            {/* Icon selection */}
            <Text style={[typography.caption, { color: colors.textMuted, marginBottom: 6, textAlign: isRTL ? 'right' : 'left' }]}>
              {t('categories.select_icon')}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {AVAILABLE_ICONS.map((ic) => (
                <TouchableOpacity
                  key={ic}
                  onPress={() => setNewCatIcon(ic)}
                  style={[
                    styles.iconChoice,
                    {
                      backgroundColor: newCatIcon === ic ? colors.accent : colors.surfaceSecondary,
                      borderRadius: radius.md
                    }
                  ]}
                >
                  <Ionicons
                    name={ic as any}
                    size={20}
                    color={newCatIcon === ic ? colors.textInverse : colors.textPrimary}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={[styles.modalActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Button
                title={t('common.cancel')}
                onPress={() => setShowAddCatModal(false)}
                variant="secondary"
                style={{ flex: 1 }}
              />
              <Button
                title={t('common.save')}
                onPress={handleSaveNewCategory}
                variant="primary"
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Add Subcategory Inline */}
      <Modal visible={showAddSubModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.surface, borderRadius: radius.lg }]}>
            <Text style={[typography.titleSmall, { color: colors.textPrimary, marginBottom: 12, textAlign: isRTL ? 'right' : 'left' }]}>
              {t('categories.add_subcategory')}
            </Text>

            <Text style={[typography.caption, { color: colors.textMuted, marginBottom: 8, textAlign: isRTL ? 'right' : 'left' }]}>
              {activeCategory?.custom_name || (activeCategory ? t(`categories.names.${activeCategory.name_key}`, activeCategory.name_key) : '')}
            </Text>

            <TextInput
              placeholder={t('common.subcategory')}
              placeholderTextColor={colors.textMuted}
              value={newSubName}
              onChangeText={setNewSubName}
              textAlign={isRTL ? 'right' : 'left'}
              style={[
                styles.modalInput,
                {
                  backgroundColor: colors.surfaceSecondary,
                  color: colors.textPrimary,
                  borderRadius: radius.md
                }
              ]}
              autoFocus
            />

            <View style={[styles.modalActions, { flexDirection: isRTL ? 'row-reverse' : 'row', marginTop: 16 }]}>
              <Button
                title={t('common.cancel')}
                onPress={() => setShowAddSubModal(false)}
                variant="secondary"
                style={{ flex: 1 }}
              />
              <Button
                title={t('common.save')}
                onPress={handleSaveNewSubcategory}
                variant="primary"
                style={{ flex: 1 }}
              />
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
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingBottom: 8
  },
  segmentWrapper: {
    marginHorizontal: 20,
    marginTop: 6,
    marginBottom: 4,
    alignItems: 'center'
  },
  typeSwitcher: {
    padding: 4,
    borderRadius: 20,
    width: '100%',
    maxWidth: 280
  },
  typeOption: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row'
  },
  typeOptionText: {
    fontFamily: FONT_FAMILY_BOLD,
    fontSize: 13.5
  },
  amountHeroContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 20
  },
  currencyPillFloating: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4
  },
  currencyPillText: {
    fontFamily: FONT_FAMILY_BOLD,
    fontSize: 12,
    fontWeight: '700'
  },
  amountDisplayRow: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    minHeight: 52,
    position: 'relative'
  },
  amountDisplayText: {
    fontFamily: FONT_FAMILY_BOLD,
    fontSize: 44,
    fontWeight: '800',
    letterSpacing: -0.8,
    fontVariant: ['tabular-nums']
  },
  clearBtnFloating: {
    position: 'absolute',
    padding: 6
  },
  quickCategoryContainer: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  allCatChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 0,
    gap: 5
  },
  catScrollView: {
    width: '100%'
  },
  quickCategoryRow: {
    gap: 8,
    paddingVertical: 2,
    alignItems: 'center'
  },
  quickCatChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 0,
    gap: 6
  },
  quickCatText: {
    fontFamily: FONT_FAMILY_SEMIBOLD,
    fontSize: 12.5
  },
  keypadWrapper: {
    marginHorizontal: 16,
    flex: 1,
    justifyContent: 'center',
    marginVertical: 4
  },
  saveActionWrapper: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4
  },
  saveBtn: {
    height: 52,
    borderRadius: 20,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 3
  },
  saveBtnText: {
    fontFamily: FONT_FAMILY_BOLD,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums']
  },
  advancedToggle: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6
  },
  advancedToggleText: {
    fontFamily: FONT_FAMILY_SEMIBOLD,
    fontSize: 12.5,
    fontWeight: '600'
  },
  advancedSection: {
    marginTop: 6
  },
  sectionWrapper: {
    marginHorizontal: 16,
    marginTop: 14
  },
  sectionHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  horizontalChips: {
    flexDirection: 'row'
  },
  accountChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 0,
    marginEnd: 8
  },
  subcategoriesContainer: {
    marginTop: 10,
    padding: 10
  },
  subHeaderRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  subChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 0,
    marginEnd: 8
  },
  noteInputCard: {
    borderRadius: 16,
    borderWidth: 0,
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  noteTextInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 6,
    minWidth: 0
  },
  repeatChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 0,
    marginRight: 8
  },
  receiptBtn: {
    padding: 8,
    borderRadius: 10
  },
  receiptPreviewWrap: {
    marginTop: 8,
    alignSelf: 'flex-start',
    position: 'relative'
  },
  receiptThumb: {
    width: 64,
    height: 64,
    borderRadius: 10
  },
  deleteReceiptBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20
  },
  modalBox: {
    padding: 22,
    borderRadius: 24,
    borderWidth: 0,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12
      },
      android: {
        elevation: 6
      }
    })
  },
  modalInput: {
    borderRadius: 14,
    borderWidth: 0,
    padding: 14,
    fontSize: 15
  },
  colorDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginEnd: 8
  },
  iconChoice: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: 8
  },
  modalActions: {
    gap: 10
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'
  },
  pickerBackdropTap: {
    flex: 1
  },
  pickerSheet: {
    maxHeight: '80%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 18,
    paddingHorizontal: 18,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.12,
        shadowRadius: 16
      },
      android: {
        elevation: 10
      }
    })
  },
  pickerHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    paddingHorizontal: 4
  },
  pickerTitleGroup: {
    alignItems: 'center',
    gap: 8
  },
  pickerTitle: {
    fontFamily: FONT_FAMILY_BOLD,
    fontSize: 18,
    fontWeight: '700'
  },
  pickerCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10
  },
  pickerCountText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY_BOLD
  },
  pickerCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center'
  },
  pickerGridContainer: {
    paddingVertical: 8
  },
  pickerGrid: {
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'flex-start'
  },
  pickerCard: {
    width: '31%',
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderRadius: 18,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative'
  },
  pickerIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8
  },
  pickerCardText: {
    fontFamily: FONT_FAMILY_BOLD,
    fontSize: 12.5,
    textAlign: 'center'
  },
  pickerCheckBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center'
  },
  pickerBottomBar: {
    paddingTop: 12,
    paddingBottom: 4
  },
  pickerAddBtn: {
    height: 48,
    borderRadius: 16,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8
  },
  pickerAddBtnText: {
    fontFamily: FONT_FAMILY_BOLD,
    fontSize: 14,
    fontWeight: '700'
  }
});
