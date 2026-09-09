import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
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
import { AuroraBackground } from '../components/common/AuroraBackground';

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
  const marketRate100USD = useAppStore((state) => state.marketRate100USD);
  const { accounts, categories, refreshAll } = useFinanceStore();

  const initialType = route?.params?.type || 'expense';
  const [type, setType] = useState<'expense' | 'income' | 'transfer'>(initialType);
  const [amountStr, setAmountStr] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState('');
  const [note, setNote] = useState('');
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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
    if (filteredCategories.length > 0 && (!selectedCategoryId || !filteredCategories.some((c) => c.id === selectedCategoryId)) && type !== 'transfer') {
      setSelectedCategoryId(filteredCategories[0].id);
      setSelectedSubcategoryId('');
    }
  }, [type, filteredCategories, selectedCategoryId]);

  const activeCategory = safeCategories.find((c) => c.id === selectedCategoryId);
  const subcategories = activeCategory?.subcategories || [];

  const handleAmountChange = (text: string) => {
    const clean = text.replace(/[^0-9]/g, '');
    setAmountStr(clean);
  };

  const handleClearAmount = () => {
    setAmountStr('');
  };

  const handlePickReceipt = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
      Alert.alert(t('common.error'), t('categories.category_name'));
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
      Alert.alert(t('common.error'), 'Failed to create category');
    }
  };

  // Create custom subcategory inline
  const handleSaveNewSubcategory = async () => {
    if (!activeCategory || !newSubName.trim()) {
      Alert.alert(t('common.error'), t('common.subcategory'));
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
      Alert.alert(t('common.error'), 'Failed to create subcategory');
    }
  };

  const handleSave = async () => {
    const finalAmount = parseFloat(amountStr);
    if (!finalAmount || finalAmount <= 0) {
      Alert.alert(t('common.error'), t('add.enter_valid_amount'));
      return;
    }

    if (!selectedAccountId) {
      Alert.alert(t('common.error'), t('add.select_account'));
      return;
    }

    if (type === 'transfer' && selectedAccountId === toAccountId) {
      Alert.alert(t('common.error'), t('add.select_different_accounts'));
      return;
    }

    setSaving(true);
    try {
      const selectedAcc = accounts.find((a) => a.id === selectedAccountId);
      const ratePerDollar = (marketRate100USD || 150000) / 100;

      await createTransaction({
        type,
        amount: finalAmount,
        currency: primaryCurrency,
        exchange_rate: ratePerDollar,
        account_id: selectedAccountId,
        to_account_id: type === 'transfer' ? toAccountId : undefined,
        category_id: type !== 'transfer' ? selectedCategoryId : undefined,
        subcategory_id: type !== 'transfer' && selectedSubcategoryId ? selectedSubcategoryId : undefined,
        date_time: new Date().toISOString(),
        note: note.trim() || undefined,
        receipt_uri: receiptUri || undefined
      });

      await refreshAll();
      setSaving(false);

      // Reset fields and go home
      setAmountStr('');
      setNote('');
      setReceiptUri(null);
      navigation.navigate('Home');
    } catch (err) {
      console.error('Failed to create transaction', err);
      setSaving(false);
      Alert.alert(t('common.error'), 'Failed to save transaction');
    }
  };

  const insets = useSafeAreaInsets();
  const topSafeInset = Platform.OS === 'android'
    ? Math.max(RNStatusBar.currentHeight || 0, insets.top, 48) + 8
    : Math.max(insets.top, 20) + 4;
  const bottomSafePadding = Platform.OS === 'android'
    ? Math.max(insets.bottom, 48) + 85
    : Math.max(insets.bottom, 16) + 70;
  const currentTypeColor =
    type === 'expense' ? colors.expense : type === 'income' ? colors.income : colors.transfer;

  const activeAccount = safeAccounts.find((a) => a.id === selectedAccountId) || safeAccounts[0];

  return (
    <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: topSafeInset }]}>
      <AuroraBackground />
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: 6,
            paddingBottom: bottomSafePadding
          }
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Modern Segmented Type Switcher */}
        <View style={styles.segmentWrapper}>
          <SegmentedControl
            options={[
              { value: 'expense', label: t('types.expense') },
              { value: 'income', label: t('types.income') },
              { value: 'transfer', label: t('types.transfer') }
            ]}
            selected={type}
            onSelect={(val) => {
              setType(val);
              setSelectedCategoryId('');
              setSelectedSubcategoryId('');
            }}
          />
        </View>

        {/* Clean, Modern Sekkeh-Style Amount Card */}
        <View
          style={[
            styles.amountCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.cardBorder,
              borderRadius: radius.lg
            }
          ]}
        >
          {/* Header Row: Label & Active Currency Badge */}
          <View style={[styles.amountCardHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={[typography.caption, { color: colors.textMuted, fontWeight: '600' }]}>
              {type === 'expense'
                ? t('types.expense_amount', 'بڕی خەرجی')
                : type === 'income'
                ? t('types.income_amount', 'بڕی داهات')
                : t('types.transfer_amount', 'بڕی گواستنەوە')}
            </Text>
            <View
              style={[
                styles.currencyBadge,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.cardBorder
                }
              ]}
            >
              <Text style={[styles.currencyBadgeText, { color: colors.textSecondary }]}>
                {primaryCurrency === 'USD' ? 'USD ($)' : 'IQD (د.ع)'}
              </Text>
            </View>
          </View>

          {/* Amount Input Row */}
          <View style={[styles.amountInputRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <TextInput
              style={[
                styles.amountTextInput,
                {
                  color: currentTypeColor,
                  textAlign: isRTL ? 'right' : 'left'
                }
              ]}
              placeholder="0"
              placeholderTextColor={colors.textMuted + '60'}
              value={amountStr}
              onChangeText={handleAmountChange}
              keyboardType="number-pad"
              inputMode="numeric"
              autoFocus={true}
              selectionColor={currentTypeColor}
            />

            {amountStr.length > 0 && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleClearAmount}
                style={styles.clearBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close-circle" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Account Selector (only if user has more than 1 account) */}
        {safeAccounts.length > 1 && (
          <View style={styles.sectionWrapper}>
            <Text style={[typography.caption, { color: colors.textMuted, textAlign: isRTL ? 'right' : 'left', marginBottom: 6 }]}>
              {type === 'transfer' ? t('add.from_account') : t('add.select_account', 'هەژمار')}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalChips}>
              {safeAccounts.map((acc) => {
                const isSelected = acc.id === selectedAccountId;
                return (
                  <TouchableOpacity
                    key={acc.id}
                    activeOpacity={0.7}
                    onPress={() => setSelectedAccountId(acc.id)}
                    style={[
                      styles.accountChip,
                      {
                        backgroundColor: isSelected ? colors.accent : colors.surface,
                        borderColor: isSelected ? colors.accent : colors.cardBorder,
                        borderRadius: 8
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

        {/* To Account Selector (Transfer only) */}
        {type === 'transfer' && (
          <View style={styles.sectionWrapper}>
            <Text style={[typography.caption, { color: colors.textMuted, textAlign: isRTL ? 'right' : 'left', marginBottom: 6 }]}>
              {t('add.to_account')}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalChips}>
              {safeAccounts
                .filter((a) => a.id !== selectedAccountId)
                .map((acc) => {
                  const isSelected = acc.id === toAccountId;
                  return (
                    <TouchableOpacity
                      key={acc.id}
                      activeOpacity={0.7}
                      onPress={() => setToAccountId(acc.id)}
                      style={[
                        styles.accountChip,
                        {
                          backgroundColor: isSelected ? colors.transfer : colors.surface,
                          borderColor: isSelected ? colors.transfer : colors.cardBorder,
                          borderRadius: radius.round
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

        {/* Categories Section (Expense / Income) */}
        {type !== 'transfer' && (
          <View style={styles.sectionWrapper}>
            <View style={[styles.sectionHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={[typography.bodySemibold, { color: colors.textPrimary }]}>
                {t('add.select_category')}
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('CategoriesScreen')}>
                <Text style={[typography.captionSmall, { color: colors.accent, fontWeight: '600' }]}>
                  {t('categories.title')} ⚙️
                </Text>
              </TouchableOpacity>
            </View>

            {/* 4-Column Category Grid + Add New Category Tile */}
            <View style={[styles.categoryGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
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
                    }}
                    style={[
                      styles.categoryCard,
                      {
                        backgroundColor: isSelected ? cat.color + '15' : colors.surface,
                        borderColor: isSelected ? cat.color : colors.cardBorder,
                        borderRadius: radius.md
                      }
                    ]}
                  >
                    <View
                      style={[
                        styles.categoryIconCircle,
                        {
                          backgroundColor: isSelected ? cat.color : cat.color + '18'
                        }
                      ]}
                    >
                      <Ionicons
                        name={iconName}
                        size={20}
                        color={isSelected ? '#FFFFFF' : cat.color}
                      />
                    </View>
                    <Text
                      style={[
                        typography.captionSmall,
                        {
                          color: isSelected ? cat.color : colors.textPrimary,
                          fontWeight: isSelected ? '700' : '500',
                          textAlign: 'center',
                          marginTop: 6
                        }
                      ]}
                      numberOfLines={1}
                    >
                      {catName}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              {/* Add New Category Card */}
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => setShowAddCatModal(true)}
                style={[
                  styles.categoryCard,
                  {
                    backgroundColor: colors.surfaceSecondary,
                    borderColor: colors.cardBorder,
                    borderRadius: radius.md,
                    borderStyle: 'dashed'
                  }
                ]}
              >
                <View style={[styles.categoryIconCircle, { backgroundColor: colors.accent + '15' }]}>
                  <Ionicons name="add" size={24} color={colors.accent} />
                </View>
                <Text
                  style={[
                    typography.captionSmall,
                    {
                      color: colors.textSecondary,
                      fontWeight: '700',
                      textAlign: 'center',
                      marginTop: 6
                    }
                  ]}
                  numberOfLines={1}
                >
                  + {t('categories.add_category')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Subcategories (Pills + Add Subcategory) */}
            {activeCategory && (
              <View style={[styles.subcategoriesContainer, { backgroundColor: colors.surfaceSecondary, borderRadius: radius.md }]}>
                <View style={[styles.subHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={[typography.captionSmall, { color: colors.textMuted, fontWeight: '600' }]}>
                    {t('add.select_subcategory')} ({activeCategory.custom_name || t(`categories.names.${activeCategory.name_key}`, activeCategory.name_key)})
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
                        activeOpacity={0.7}
                        onPress={() => setSelectedSubcategoryId(isSelected ? '' : sub.id)}
                        style={[
                          styles.subChip,
                          {
                            backgroundColor: isSelected ? activeCategory?.color || colors.accent : colors.surface,
                            borderColor: isSelected ? activeCategory?.color || colors.accent : colors.cardBorder,
                            borderRadius: radius.round
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

                  {/* Quick Add Subcategory Pill */}
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setShowAddSubModal(true)}
                    style={[
                      styles.subChip,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.cardBorder,
                        borderStyle: 'dashed',
                        borderRadius: radius.round
                      }
                    ]}
                  >
                    <Text style={[typography.captionSmall, { color: colors.accent, fontWeight: '600' }]}>
                      + {t('common.add')}
                    </Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            )}
          </View>
        )}

        {/* Note input & Receipt Attachment */}
        <View style={styles.sectionWrapper}>
          <View
            style={[
              styles.noteInputCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.cardBorder,
                borderRadius: radius.md,
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
              activeOpacity={0.7}
              onPress={handlePickReceipt}
              style={[styles.receiptBtn, { backgroundColor: colors.surfaceSecondary }]}
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
        </View>

        {/* Save Action Button */}
        <View style={styles.saveActionWrapper}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleSave}
            disabled={saving}
            style={[
              styles.saveBtn,
              {
                backgroundColor: currentTypeColor,
                borderRadius: 8,
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
              {type === 'expense'
                ? t('types.save_expense')
                : type === 'income'
                ? t('types.save_income')
                : t('types.save_transfer')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal: Add Category Inline */}
      <Modal visible={showAddCatModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.surface, borderColor: colors.cardBorder, borderRadius: radius.lg }]}>
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
                  borderColor: colors.cardBorder,
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
                      borderColor: colors.cardBorder,
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
          <View style={[styles.modalBox, { backgroundColor: colors.surface, borderColor: colors.cardBorder, borderRadius: radius.lg }]}>
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
                  borderColor: colors.cardBorder,
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
    paddingBottom: 50
  },
  segmentWrapper: {
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 10
  },
  amountCard: {
    marginHorizontal: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2
  },
  amountCardHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 6
  },
  currencyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1
  },
  currencyBadgeText: {
    fontSize: 12,
    fontWeight: '700'
  },
  amountInputRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 4
  },
  amountTextInput: {
    fontSize: 42,
    fontWeight: '800',
    flex: 1,
    paddingVertical: 4,
    fontVariant: ['tabular-nums']
  },
  clearBtn: {
    padding: 6,
    marginStart: 8
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
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    marginEnd: 8
  },
  categoryGrid: {
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8
  },
  categoryCard: {
    width: '23%',
    aspectRatio: 0.95,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6
  },
  categoryIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center'
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    marginEnd: 6
  },
  noteInputCard: {
    borderWidth: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6
  },
  noteTextInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 6
  },
  receiptBtn: {
    padding: 8,
    borderRadius: 8
  },
  receiptPreviewWrap: {
    marginTop: 8,
    alignSelf: 'flex-start',
    position: 'relative'
  },
  receiptThumb: {
    width: 64,
    height: 64,
    borderRadius: 8
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
  saveActionWrapper: {
    marginHorizontal: 16,
    marginTop: 22
  },
  saveBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20
  },
  modalBox: {
    padding: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5
  },
  modalInput: {
    borderWidth: 1,
    padding: 12,
    fontSize: 15
  },
  colorDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginEnd: 8
  },
  iconChoice: {
    width: 40,
    height: 40,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: 8
  },
  modalActions: {
    gap: 10
  }
});
