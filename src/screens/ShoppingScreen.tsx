import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme';
import { useFinanceStore } from '../store/useFinanceStore';
import { useAppStore } from '../store/useAppStore';
import { ShoppingTrip } from '../db/schema';
import {
  getAllShoppingTrips,
  createShoppingTrip,
  addShoppingItem,
  toggleShoppingItem,
  deleteShoppingItem,
  convertShoppingListToExpense,
  deleteShoppingTrip,
  setShoppingTripReminder
} from '../db/queries/shopping';
import { formatCurrency, getCurrencySymbol } from '../utils/currency';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { SegmentedControl } from '../components/common/SegmentedControl';
import { AuroraBackground } from '../components/common/AuroraBackground';
import { AppDialog } from '../components/common/AppDialog';
import { ShoppingReminderSheet } from '../components/shopping/ShoppingReminderSheet';
import { scheduleShoppingReminder, cancelShoppingReminder } from '../services/notifications';
import { Icon } from '../components/icons/Icon';
import { formatLocalDate, formatLocalTime } from '../utils/dates';

export const ShoppingScreen: React.FC = () => {
  const { colors, typography, radius } = useTheme();
  const { t, i18n } = useTranslation();
  const isRTL = useAppStore((state) => state.isRTL);
  const primaryCurrency = useAppStore((state) => state.primaryCurrency);
  const { accounts, refreshAll } = useFinanceStore();

  const [trips, setTrips] = useState<ShoppingTrip[]>([]);
  const [activeTab, setActiveTab] = useState<'list' | 'completed'>('list');
  const [showAddModal, setShowAddModal] = useState(false);
  const [storeName, setStoreName] = useState('');
  const [firstTripName, setFirstTripName] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || 'acc_savings');
  const [selectedTrip, setSelectedTrip] = useState<ShoppingTrip | null>(null);
  const [reminderFor, setReminderFor] = useState<ShoppingTrip | null>(null);

  // New item inputs
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');

  useEffect(() => {
    loadTrips();
  }, [activeTab]);

  // Keep selectedAccountId synced if accounts load later
  useEffect(() => {
    if (accounts && accounts.length > 0 && (!selectedAccountId || selectedAccountId === 'acc_savings')) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts]);

  const loadTrips = async (preferredTripId?: string) => {
    try {
      const list = await getAllShoppingTrips(activeTab);
      setTrips(list);

      if (list.length > 0) {
        if (preferredTripId) {
          const match = list.find((x) => x.id === preferredTripId);
          setSelectedTrip(match || list[0]);
        } else if (!selectedTrip || !list.some((x) => x.id === selectedTrip.id)) {
          setSelectedTrip(list[0]);
        } else {
          // Refresh existing selected trip
          const refreshed = list.find((x) => x.id === selectedTrip.id);
          setSelectedTrip(refreshed || list[0]);
        }
      } else {
        setSelectedTrip(null);
      }
    } catch (err) {
      console.error('Failed to load shopping trips', err);
    }
  };

  const handleCreateTrip = async (nameToUse?: string) => {
    const finalName = (nameToUse || storeName).trim();
    if (!finalName) {
      AppDialog.alert(t('common.error'), t('shopping.store_name'));
      return;
    }

    try {
      const accId = selectedAccountId || accounts[0]?.id || 'acc_savings';
      const newId = await createShoppingTrip({
        store_name: finalName,
        account_id: accId,
        currency: primaryCurrency || 'IQD',
        status: activeTab
      });

      setStoreName('');
      setFirstTripName('');
      setShowAddModal(false);
      await loadTrips(newId);
    } catch (err) {
      console.error('Failed to create trip', err);
      AppDialog.alert(t('common.error'), 'Could not create shopping list');
    }
  };

  const handleAddItem = async () => {
    if (!selectedTrip) {
      AppDialog.alert(t('common.error'), t('shopping.create_list_first'));
      return;
    }
    if (!newItemName.trim()) {
      return;
    }

    try {
      const price = parseFloat(newItemPrice) || 0;
      await addShoppingItem(selectedTrip.id, { name: newItemName.trim(), price });
      setNewItemName('');
      setNewItemPrice('');
      await loadTrips(selectedTrip.id);
    } catch (err) {
      console.error('Failed to add shopping item', err);
      AppDialog.alert(t('common.error'), 'Could not add item');
    }
  };

  const handleToggleItem = async (itemId: string, current: number) => {
    try {
      await toggleShoppingItem(itemId, current === 0);
      if (selectedTrip) {
        await loadTrips(selectedTrip.id);
      }
    } catch (err) {
      console.error('Failed to toggle item', err);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!selectedTrip) return;
    try {
      await deleteShoppingItem(itemId, selectedTrip.id);
      await loadTrips(selectedTrip.id);
    } catch (err) {
      console.error('Failed to delete item', err);
    }
  };


  const handleSaveReminder = async (when: Date) => {
    const trip = reminderFor;
    if (!trip) return;
    setReminderFor(null);

    const ok = await scheduleShoppingReminder(
      trip.id,
      trip.store_name,
      t('shopping.reminder_body'),
      when
    );

    if (!ok) {
      AppDialog.alert(t('common.error_short'), t('shopping.reminder_failed'), undefined, {
        tone: 'danger'
      });
      return;
    }

    // Only recorded once the notification is actually scheduled, so the badge
    // never claims a reminder the system did not accept.
    await setShoppingTripReminder(trip.id, when.toISOString());
    await loadTrips(trip.id);

    AppDialog.alert(
      t('shopping.reminder_set'),
      t('shopping.reminder_set_for', {
        when: `${formatLocalDate(when, i18n.language)} · ${formatLocalTime(when)}`
      }),
      undefined,
      { tone: 'success', icon: 'bell' }
    );
  };

  const handleDeleteReminder = async () => {
    const trip = reminderFor;
    if (!trip) return;
    setReminderFor(null);
    await cancelShoppingReminder(trip.id);
    await setShoppingTripReminder(trip.id, null);
    await loadTrips(trip.id);
    AppDialog.alert(t('shopping.reminder_cleared'), undefined, undefined, { tone: 'success' });
  };

  const handleDeleteTrip = async (tripId: string) => {
    AppDialog.alert(
      t('common.confirm'),
      t('shopping.delete_list_confirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            await deleteShoppingTrip(tripId);
      await cancelShoppingReminder(tripId);
            setSelectedTrip(null);
            await loadTrips();
          }
        }
      ]
    );
  };

  const handleConvertTrip = async (trip: ShoppingTrip) => {
    AppDialog.alert(
      t('shopping.convert_to_expense'),
      t('shopping.convert_confirm', { amount: formatCurrency(trip.total_amount, trip.currency) }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          onPress: async () => {
            await convertShoppingListToExpense(trip.id);
            await refreshAll();
            await loadTrips();
          }
        }
      ]
    );
  };

  const items = selectedTrip?.items || [];
  const checkedCount = items.filter((x) => x.is_checked).length;

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <AuroraBackground />
      <View style={styles.topHeader}>
        <SegmentedControl
          options={[
            { value: 'list', label: t('shopping.shopping_list') },
            { value: 'completed', label: t('shopping.trips') }
          ]}
          selected={activeTab}
          onSelect={(v: any) => {
            setActiveTab(v);
            setSelectedTrip(null);
          }}
        />
      </View>

      {/* If No Trips Exist in Current Tab */}
      {trips.length === 0 ? (
        <ScrollView contentContainerStyle={styles.emptyContainer} showsVerticalScrollIndicator={false}>
          <Card style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <View style={[styles.emptyIconCircle, { backgroundColor: colors.accent + '15' }]}>
              <Ionicons name="cart-outline" size={36} color={colors.accent} />
            </View>
            <Text style={[typography.titleSmall, { color: colors.textPrimary, marginTop: 12, textAlign: 'center' }]}>
              {activeTab === 'list' ? t('shopping.empty_title') : t('shopping.no_trips')}
            </Text>
            <Text style={[typography.caption, { color: colors.textMuted, marginTop: 4, marginBottom: 16, textAlign: 'center' }]}>
              {activeTab === 'list'
                ? t('shopping.empty_body')
                : t('shopping.trips_body')}
            </Text>

            {activeTab === 'list' && (
              <View style={styles.quickCreateBox}>
                <TextInput
                  placeholder={t('shopping.list_name_placeholder')}
                  placeholderTextColor={colors.textMuted}
                  value={firstTripName}
                  onChangeText={setFirstTripName}
                  textAlign={isRTL ? 'right' : 'left'}
                  style={[
                    styles.quickCreateInput,
                    {
                      backgroundColor: colors.surfaceSecondary,
                      borderColor: colors.cardBorder,
                      color: colors.textPrimary,
                      borderRadius: 8
                    }
                  ]}
                  onSubmitEditing={() => handleCreateTrip(firstTripName)}
                />
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => handleCreateTrip(firstTripName)}
                  style={[styles.quickCreateBtn, { backgroundColor: colors.accent, borderRadius: 8 }]}
                >
                  <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.quickCreateBtnText}>{t('shopping.create_list')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </Card>
        </ScrollView>
      ) : (
        <View style={styles.mainContainer}>
          {/* Horizontal List of Shopping Trips Chips */}
          <View style={[styles.tripSelectorRow, { borderBottomColor: colors.cardBorder }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tripChipsScroll}>
              {activeTab === 'list' && (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setShowAddModal(true)}
                  style={[
                    styles.addTripChip,
                    { backgroundColor: colors.surfaceSecondary, borderColor: colors.cardBorder, borderRadius: 8 }
                  ]}
                >
                  <Ionicons name="add" size={16} color={colors.accent} />
                  <Text style={[typography.captionSmall, { color: colors.accent, fontWeight: '700', marginHorizontal: 4 }]}>
                    {t('shopping.new_list')}
                  </Text>
                </TouchableOpacity>
              )}

              {trips.map((tr) => {
                const isSelected = selectedTrip?.id === tr.id;
                const trItemsCount = tr.items?.length || 0;
                return (
                  <TouchableOpacity
                    key={tr.id}
                    activeOpacity={0.8}
                    onPress={() => setSelectedTrip(tr)}
                    style={[
                      styles.tripChip,
                      {
                        backgroundColor: isSelected ? colors.accent : colors.surface,
                        borderColor: isSelected ? colors.accent : colors.cardBorder,
                        borderRadius: 8
                      }
                    ]}
                  >
                    <Ionicons
                      name="basket-outline"
                      size={14}
                      color={isSelected ? '#FFFFFF' : colors.textSecondary}
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
                      numberOfLines={1}
                    >
                      {tr.store_name} {trItemsCount > 0 ? `(${trItemsCount})` : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Active Trip Content */}
          {selectedTrip && (
            <View style={styles.tripCardContainer}>
              {/* Trip Header Card */}
              <View
                style={[
                  styles.activeTripHeader,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.cardBorder,
                    borderRadius: 8,
                    flexDirection: isRTL ? 'row-reverse' : 'row'
                  }
                ]}
              >
                <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                  <Text style={[typography.titleSmall, { color: colors.textPrimary }]}>
                    {selectedTrip.store_name}
                  </Text>
                  <Text style={[typography.hero, { color: colors.accent, fontSize: 20, marginTop: 2 }]}>
                    {formatCurrency(selectedTrip.total_amount, selectedTrip.currency, { isRTL })}
                  </Text>
                  {items.length > 0 && (
                    <Text style={[typography.captionSmall, { color: colors.textMuted, marginTop: 2 }]}>
                      {t('shopping.items_checked', { checked: checkedCount, total: items.length })}
                    </Text>
                  )}
                </View>

                <View style={[styles.tripHeaderActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  {activeTab === 'list' && (
                    <TouchableOpacity
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={t('shopping.reminder_title')}
                      onPress={() => setReminderFor(selectedTrip)}
                      style={[
                        styles.reminderBtn,
                        {
                          backgroundColor: selectedTrip.reminder_at
                            ? colors.accentMuted
                            : colors.surfaceSecondary,
                          borderColor: selectedTrip.reminder_at ? colors.accent : colors.cardBorder,
                          borderRadius: 8
                        }
                      ]}
                    >
                      <Icon
                        name="bell"
                        size={16}
                        color={selectedTrip.reminder_at ? colors.accent : colors.textMuted}
                        filled={!!selectedTrip.reminder_at}
                      />
                    </TouchableOpacity>
                  )}

                  {activeTab === 'list' && selectedTrip.total_amount > 0 && (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => handleConvertTrip(selectedTrip)}
                      style={[styles.convertBtn, { backgroundColor: colors.income, borderRadius: 8 }]}
                    >
                      <Ionicons name="checkmark-circle-outline" size={16} color="#FFFFFF" />
                      <Text style={styles.convertBtnText}>{t('shopping.convert_to_expense')}</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => handleDeleteTrip(selectedTrip.id)}
                    style={[styles.deleteTripBtn, { backgroundColor: colors.surfaceSecondary, borderRadius: 8 }]}
                  >
                    <Ionicons name="trash-outline" size={16} color={colors.expense} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Fast Item Input Box (Only for active list) */}
              {activeTab === 'list' && (
                <View
                  style={[
                    styles.addItemCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.cardBorder,
                      borderRadius: 8,
                      flexDirection: isRTL ? 'row-reverse' : 'row'
                    }
                  ]}
                >
                  <TextInput
                    placeholder={`${t('shopping.item_name')} ${t('shopping.item_placeholder')}`}
                    placeholderTextColor={colors.textMuted}
                    value={newItemName}
                    onChangeText={setNewItemName}
                    textAlign={isRTL ? 'right' : 'left'}
                    style={[
                      styles.itemInput,
                      {
                        backgroundColor: colors.surfaceSecondary,
                        borderColor: colors.cardBorder,
                        color: colors.textPrimary,
                        borderRadius: 6
                      }
                    ]}
                    onSubmitEditing={handleAddItem}
                  />

                  <TextInput
                    placeholder={`${t('shopping.item_price')} (${getCurrencySymbol(primaryCurrency)})`}
                    placeholderTextColor={colors.textMuted}
                    value={newItemPrice}
                    onChangeText={(txt) => setNewItemPrice(txt.replace(/[^0-9.]/g, ''))}
                    keyboardType="numeric"
                    textAlign={isRTL ? 'right' : 'left'}
                    style={[
                      styles.priceInput,
                      {
                        backgroundColor: colors.surfaceSecondary,
                        borderColor: colors.cardBorder,
                        color: colors.textPrimary,
                        borderRadius: 6
                      }
                    ]}
                    onSubmitEditing={handleAddItem}
                  />

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handleAddItem}
                    style={[styles.addBtn, { backgroundColor: colors.accent, borderRadius: 6 }]}
                  >
                    <Ionicons name="add" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              )}

              {/* Items List */}
              <FlatList
                data={items}
                keyExtractor={(i) => i.id}
                contentContainerStyle={{ paddingBottom: 60 }}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <View style={styles.emptyItemsBox}>
                    <Text style={[typography.caption, { color: colors.textMuted, textAlign: 'center' }]}>
                      {t('shopping.empty_list')}
                    </Text>
                  </View>
                }
                renderItem={({ item }) => (
                  <View
                    style={[
                      styles.lineItemRow,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.cardBorder,
                        borderRadius: 8,
                        flexDirection: isRTL ? 'row-reverse' : 'row'
                      }
                    ]}
                  >
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => handleToggleItem(item.id, item.is_checked)}
                      style={[
                        styles.checkBtn,
                        {
                          borderColor: item.is_checked ? colors.income : colors.cardBorder,
                          backgroundColor: item.is_checked ? colors.income : 'transparent',
                          borderRadius: 6
                        }
                      ]}
                    >
                      {item.is_checked ? <Ionicons name="checkmark" size={14} color="#FFFFFF" /> : null}
                    </TouchableOpacity>

                    <Text
                      style={[
                        typography.body,
                        {
                          color: item.is_checked ? colors.textMuted : colors.textPrimary,
                          textDecorationLine: item.is_checked ? 'line-through' : 'none',
                          flex: 1,
                          marginHorizontal: 8,
                          textAlign: isRTL ? 'right' : 'left'
                        }
                      ]}
                    >
                      {item.name}
                    </Text>

                    {item.price > 0 && (
                      <Text
                        style={[
                          typography.tabularNumber,
                          {
                            color: item.is_checked ? colors.textMuted : colors.textPrimary,
                            fontWeight: '600',
                            marginHorizontal: 6
                          }
                        ]}
                      >
                        {formatCurrency(item.price, selectedTrip.currency, { isRTL })}
                      </Text>
                    )}

                    {activeTab === 'list' && (
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => handleDeleteItem(item.id)}
                        style={styles.deleteItemBtn}
                      >
                        <Ionicons name="close-circle-outline" size={18} color={colors.textMuted} />
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              />
            </View>
          )}
        </View>
      )}

      {/* New List Modal */}
      <Modal visible={showAddModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.surface, borderColor: colors.cardBorder, borderRadius: 12 }]}>
            <Text style={[typography.titleSmall, { color: colors.textPrimary, marginBottom: 12, textAlign: isRTL ? 'right' : 'left' }]}>
              {t('shopping.new_list')}
            </Text>

            <TextInput
              placeholder={t('shopping.list_name_placeholder2')}
              placeholderTextColor={colors.textMuted}
              value={storeName}
              onChangeText={setStoreName}
              textAlign={isRTL ? 'right' : 'left'}
              style={[
                styles.modalInput,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.cardBorder,
                  color: colors.textPrimary,
                  borderRadius: 8
                }
              ]}
              autoFocus
            />

            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 10, marginTop: 16 }}>
              <Button
                title={t('common.cancel')}
                onPress={() => setShowAddModal(false)}
                variant="secondary"
                style={{ flex: 1, borderRadius: 8 }}
              />
              <Button
                title={t('common.save')}
                onPress={() => handleCreateTrip()}
                variant="primary"
                style={{ flex: 1, borderRadius: 8 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      <ShoppingReminderSheet
        visible={!!reminderFor}
        listName={reminderFor?.store_name ?? ''}
        currentIso={reminderFor?.reminder_at ?? null}
        onClose={() => setReminderFor(null)}
        onSave={handleSaveReminder}
        onDelete={handleDeleteReminder}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1
  },
  topHeader: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6
  },
  emptyContainer: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1
  },
  emptyCard: {
    width: '100%',
    padding: 24,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center'
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center'
  },
  quickCreateBox: {
    width: '100%',
    gap: 10,
    marginTop: 8
  },
  quickCreateInput: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14
  },
  quickCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6
  },
  quickCreateBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700'
  },
  mainContainer: {
    flex: 1
  },
  tripSelectorRow: {
    borderBottomWidth: 1,
    paddingVertical: 8
  },
  tripChipsScroll: {
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center'
  },
  addTripChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1
  },
  tripChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1
  },
  tripCardContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 10
  },
  activeTripHeader: {
    padding: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2
  },
  reminderBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1
  },
  tripHeaderActions: {
    alignItems: 'center',
    gap: 8
  },
  convertBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 4
  },
  convertBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700'
  },
  deleteTripBtn: {
    padding: 8
  },
  addItemCard: {
    padding: 8,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
    marginBottom: 10
  },
  itemInput: {
    flex: 2,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14
  },
  priceInput: {
    flex: 1,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14
  },
  addBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center'
  },
  lineItemRow: {
    padding: 12,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1.5
  },
  checkBtn: {
    width: 22,
    height: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center'
  },
  deleteItemBtn: {
    padding: 4,
    marginStart: 4
  },
  emptyItemsBox: {
    padding: 24,
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
    padding: 20,
    borderWidth: 1
  },
  modalInput: {
    borderWidth: 1,
    padding: 12,
    fontSize: 15
  }
});
