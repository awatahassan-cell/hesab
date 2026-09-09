import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme';
import { useFinanceStore } from '../store/useFinanceStore';
import { useAppStore } from '../store/useAppStore';
import { Category, Subcategory } from '../db/schema';
import { createCategory, deleteCategory, createSubcategory } from '../db/queries/categories';
import { restoreDefaultCategories } from '../db';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { SegmentedControl } from '../components/common/SegmentedControl';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { AuroraBackground } from '../components/common/AuroraBackground';

export const CategoriesScreen: React.FC = () => {
  const { colors, typography, radius, categoryPalette } = useTheme();
  const { t } = useTranslation();
  const isRTL = useAppStore((state) => state.isRTL);
  const { categories, refreshAll } = useFinanceStore();

  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [selectedColor, setSelectedColor] = useState(categoryPalette[0]);
  const [selectedIcon, setSelectedIcon] = useState('pricetag-outline');

  // Subcategory modal
  const [selectedCatForSub, setSelectedCatForSub] = useState<Category | null>(null);
  const [subName, setSubName] = useState('');

  // Custom confirmation modal state
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

  const filteredCategories = (categories || []).filter((c) => c && c.type === activeTab);

  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return;
    await createCategory({
      name_key: 'custom',
      custom_name: newCatName.trim(),
      type: activeTab,
      icon: selectedIcon,
      color: selectedColor
    });

    setNewCatName('');
    setShowAddModal(false);
    await refreshAll();
  };

  const handleAddSub = async () => {
    if (!selectedCatForSub || !subName.trim()) return;
    await createSubcategory(selectedCatForSub.id, subName.trim());
    setSubName('');
    setSelectedCatForSub(null);
    await refreshAll();
  };

  const handleDeleteCategory = (cat: Category) => {
    const name = cat.custom_name || t('categories.names.' + cat.name_key, cat.name_key);
    setConfirmConfig({
      visible: true,
      title: t('categories.delete_category'),
      message: `ئایا دڵنیایت لە سڕینەوەی بەشی (${name})؟`,
      confirmText: t('common.reset'),
      isDanger: true,
      icon: 'trash-outline',
      onConfirm: async () => {
        await deleteCategory(cat.id);
        await refreshAll();
        setConfirmConfig((prev) => ({ ...prev, visible: false }));
      }
    });
  };

  const handleRestoreDefaults = () => {
    setConfirmConfig({
      visible: true,
      title: t('categories.restore_defaults', t('categories.restore_defaults')),
      message: t(
        'categories.restore_confirm',
        t('categories.restore_confirm')
      ),
      confirmText: t('common.restore'),
      isDanger: false,
      icon: 'refresh-circle-outline',
      onConfirm: async () => {
        await restoreDefaultCategories();
        await refreshAll();
        setConfirmConfig((prev) => ({ ...prev, visible: false }));
      }
    });
  };

  const availableIcons = [
    'restaurant-outline', 'cart-outline', 'car-outline', 'speedometer-outline',
    'construct-outline', 'home-outline', 'flash-outline', 'wifi-outline',
    'medkit-outline', 'school-outline', 'shirt-outline', 'cut-outline',
    'game-controller-outline', 'people-outline', 'gift-outline', 'airplane-outline',
    'card-outline', 'cash-outline', 'briefcase-outline', 'business-outline',
    'heart-outline', 'paw-outline', 'beer-outline', 'fitness-outline'
  ];

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <AuroraBackground />
      <View style={{ marginHorizontal: 16, marginTop: 12, marginBottom: 8 }}>
        <SegmentedControl
          options={[
            { value: 'expense', label: t('categories.expense_categories') },
            { value: 'income', label: t('categories.income_categories') }
          ]}
          selected={activeTab}
          onSelect={(v: any) => setActiveTab(v)}
        />
      </View>

      <FlatList
        data={filteredCategories}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        ListHeaderComponent={
          <View style={{ marginBottom: 12, gap: 8 }}>
            <Button
              title={t('categories.add_category')}
              onPress={() => setShowAddModal(true)}
              variant="primary"
            />
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleRestoreDefaults}
              style={[
                styles.restoreDefaultsBtn,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.cardBorder,
                  flexDirection: isRTL ? 'row-reverse' : 'row'
                }
              ]}
            >
              <Ionicons name="refresh-outline" size={16} color={colors.accent} />
              <Text style={[styles.restoreDefaultsText, { color: colors.accent, marginHorizontal: 6 }]}>
                {t('categories.restore_defaults', t('categories.restore_defaults'))}
              </Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => {
          const name = item.custom_name || t('categories.names.' + item.name_key, item.name_key);
          const iconName = item.icon as keyof typeof Ionicons.glyphMap;
          const subs = item.subcategories || [];

          return (
            <Card style={{ marginVertical: 6, backgroundColor: colors.surface }}>
              <View style={[styles.catRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.iconCircle, { backgroundColor: item.color + '20' }]}>
                  <Ionicons name={iconName} size={22} color={item.color} />
                </View>

                <View style={{ flex: 1, marginHorizontal: 12, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                  <Text style={[typography.bodySemibold, { color: colors.textPrimary }]}>{name}</Text>
                  <Text style={[typography.caption, { color: colors.textMuted }]}>
                    {t('categories.items_count', { count: subs.length })}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <TouchableOpacity
                    onPress={() => setSelectedCatForSub(item)}
                    style={[styles.smallBtn, { backgroundColor: colors.surfaceSecondary }]}
                  >
                    <Ionicons name="add" size={18} color={colors.accent} />
                  </TouchableOpacity>

                  {!item.is_default && (
                    <TouchableOpacity onPress={() => handleDeleteCategory(item)} style={{ padding: 4 }}>
                      <Ionicons name="trash-outline" size={18} color={colors.danger} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Subcategories list pills */}
              {subs.length > 0 && (
                <View style={[styles.subsWrap, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  {subs.map((s) => {
                    const subTitle = s.custom_name || t('categories.subcategories.' + s.name_key, s.name_key);
                    return (
                      <View key={s.id} style={[styles.subPill, { backgroundColor: colors.surfaceSecondary, borderColor: colors.cardBorder }]}>
                        <Text style={[typography.captionSmall, { color: colors.textSecondary }]}>{subTitle}</Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </Card>
          );
        }}
      />

      {/* Add Category Modal */}
      <Modal visible={showAddModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <Text style={[typography.titleSmall, { color: colors.textPrimary, marginBottom: 12 }]}>
              {t('categories.add_category')}
            </Text>

            <TextInput
              placeholder={t('categories.category_name')}
              placeholderTextColor={colors.textMuted}
              value={newCatName}
              onChangeText={setNewCatName}
              style={[styles.modalInput, { backgroundColor: colors.surfaceSecondary, borderColor: colors.cardBorder, color: colors.textPrimary }]}
            />

            {/* Color picker */}
            <Text style={[typography.caption, { color: colors.textMuted, marginTop: 12, marginBottom: 6 }]}>
              {t('categories.select_color')}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {categoryPalette.map((col) => (
                <TouchableOpacity
                  key={col}
                  onPress={() => setSelectedColor(col)}
                  style={[
                    styles.colorDot,
                    {
                      backgroundColor: col,
                      borderColor: selectedColor === col ? colors.textPrimary : 'transparent',
                      borderWidth: selectedColor === col ? 3 : 0
                    }
                  ]}
                />
              ))}
            </ScrollView>

            {/* Icon picker */}
            <Text style={[typography.caption, { color: colors.textMuted, marginBottom: 6 }]}>
              {t('categories.select_icon')}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {availableIcons.map((ic) => (
                <TouchableOpacity
                  key={ic}
                  onPress={() => setSelectedIcon(ic)}
                  style={[
                    styles.iconChoice,
                    {
                      backgroundColor: selectedIcon === ic ? colors.accent : colors.surfaceSecondary,
                      borderColor: colors.cardBorder
                    }
                  ]}
                >
                  <Ionicons name={ic as any} size={20} color={selectedIcon === ic ? colors.textInverse : colors.textPrimary} />
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button title={t('common.cancel')} onPress={() => setShowAddModal(false)} variant="secondary" style={{ flex: 1 }} />
              <Button title={t('common.save')} onPress={handleCreateCategory} variant="primary" style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Subcategory Modal */}
      <Modal visible={!!selectedCatForSub} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <Text style={[typography.titleSmall, { color: colors.textPrimary, marginBottom: 12 }]}>
              {t('categories.add_subcategory')} ({selectedCatForSub?.custom_name || (selectedCatForSub ? t('categories.names.' + selectedCatForSub.name_key) : '')})
            </Text>

            <TextInput
              placeholder={t('common.subcategory')}
              placeholderTextColor={colors.textMuted}
              value={subName}
              onChangeText={setSubName}
              style={[styles.modalInput, { backgroundColor: colors.surfaceSecondary, borderColor: colors.cardBorder, color: colors.textPrimary }]}
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <Button title={t('common.cancel')} onPress={() => setSelectedCatForSub(null)} variant="secondary" style={{ flex: 1 }} />
              <Button title={t('common.save')} onPress={handleAddSub} variant="primary" style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>

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
        onCancel={() => setConfirmConfig((prev) => ({ ...prev, visible: false }))}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1
  },
  restoreDefaultsBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restoreDefaultsText: {
    fontSize: 13,
    fontWeight: '600',
  },
  catRow: {
    alignItems: 'center'
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center'
  },
  smallBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  subsWrap: {
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#eee'
  },
  subPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24
  },
  modalBox: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 14,
    borderWidth: 1,
    padding: 20
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  colorDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8
  },
  iconChoice: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8
  }
});
