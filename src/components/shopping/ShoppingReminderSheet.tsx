import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, Platform } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme';
import { elevation } from '../../theme/spacing';
import { Icon } from '../icons/Icon';
import { useAppStore } from '../../store/useAppStore';
import { formatLocalDate, formatLocalTime } from '../../utils/dates';
import { FONT_FAMILY, FONT_FAMILY_SEMIBOLD, FONT_FAMILY_BOLD } from '../../theme/typography';

interface Props {
  visible: boolean;
  listName: string;
  /** Existing reminder as an ISO string, or null when none is set. */
  currentIso: string | null;
  onClose: () => void;
  onSave: (when: Date) => void;
  onDelete: () => void;
}

/** Next round half-hour, so the default is always a valid future time. */
function defaultWhen(): Date {
  const d = new Date();
  d.setSeconds(0, 0);
  d.setMinutes(d.getMinutes() + 30);
  d.setMinutes(d.getMinutes() >= 30 ? 30 : 0);
  return d;
}

/**
 * Sets a one-off reminder on a shopping list.
 *
 * Date and time are picked separately because the platform pickers work that
 * way, but they are held as one Date so the two can never disagree.
 */
export const ShoppingReminderSheet: React.FC<Props> = ({
  visible,
  listName,
  currentIso,
  onClose,
  onSave,
  onDelete
}) => {
  const { colors, radius } = useTheme();
  const { t, i18n } = useTranslation();
  const isRTL = useAppStore((s) => s.isRTL);

  const initial = useMemo(() => {
    if (!currentIso) return defaultWhen();
    const parsed = new Date(currentIso);
    return Number.isNaN(parsed.getTime()) ? defaultWhen() : parsed;
  }, [currentIso, visible]);

  const [when, setWhen] = useState<Date>(initial);
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);

  // Reset to the stored value whenever the sheet is reopened.
  React.useEffect(() => {
    if (visible) setWhen(initial);
  }, [visible, initial]);

  const inPast = when.getTime() <= Date.now();

  const dateLabel = formatLocalDate(when, i18n.language);
  const timeLabel = formatLocalTime(when);

  const onDateChange = (_e: DateTimePickerEvent, picked?: Date) => {
    setShowDate(Platform.OS === 'ios');
    if (!picked) return;
    // Keep the time, take only the day.
    const next = new Date(when);
    next.setFullYear(picked.getFullYear(), picked.getMonth(), picked.getDate());
    setWhen(next);
  };

  const onTimeChange = (_e: DateTimePickerEvent, picked?: Date) => {
    setShowTime(Platform.OS === 'ios');
    if (!picked) return;
    const next = new Date(when);
    next.setHours(picked.getHours(), picked.getMinutes(), 0, 0);
    setWhen(next);
  };

  const row = (
    label: string,
    value: string,
    icon: 'clock' | 'bell',
    onPress: () => void
  ) => (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: colors.surfaceSecondary,
          borderColor: colors.cardBorder,
          borderRadius: radius.md,
          flexDirection: isRTL ? 'row-reverse' : 'row',
          opacity: pressed ? 0.75 : 1
        }
      ]}
    >
      <Icon name={icon} size={20} color={colors.accent} />
      <View style={[styles.rowText, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
        <Text style={[styles.rowLabel, { color: colors.textMuted }]}>{label}</Text>
        <Text style={[styles.rowValue, { color: colors.textPrimary }]}>{value}</Text>
      </View>
    </Pressable>
  );

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.scrim} onPress={onClose}>
        <Pressable
          onPress={() => {}}
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.glassEdge,
              borderRadius: radius.xl,
              ...elevation.lg(colors.shadowColor)
            }
          ]}
        >
          <View
            style={[
              styles.iconWrap,
              { backgroundColor: colors.accentMuted, borderRadius: radius.round }
            ]}
          >
            <Icon name="bell" size={24} color={colors.accent} />
          </View>

          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {t('shopping.reminder_title')}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={2}>
            {listName}
          </Text>

          <View style={styles.rows}>
            {row(t('common.date'), dateLabel, 'clock', () => setShowDate(true))}
            {row(t('shopping.reminder_time'), timeLabel, 'bell', () => setShowTime(true))}
          </View>

          {inPast && (
            <Text style={[styles.warning, { color: colors.danger }]}>
              {t('shopping.reminder_in_past')}
            </Text>
          )}

          {showDate && (
            <DateTimePicker
              value={when}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              minimumDate={new Date()}
              onChange={onDateChange}
            />
          )}
          {showTime && (
            <DateTimePicker
              value={when}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onTimeChange}
            />
          )}

          <Pressable
            onPress={() => onSave(when)}
            disabled={inPast}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.ctaWrap,
              { opacity: inPast ? 0.45 : pressed ? 0.85 : 1 }
            ]}
          >
            <LinearGradient
              colors={[colors.heroGradient[0], colors.heroGradient[2]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.cta, { borderRadius: radius.md }]}
            >
              <Text style={styles.ctaText}>{t('shopping.set_reminder')}</Text>
            </LinearGradient>
          </Pressable>

          {!!currentIso && (
            <Pressable
              onPress={onDelete}
              accessibilityRole="button"
              style={({ pressed }) => [styles.secondary, { opacity: pressed ? 0.6 : 1 }]}
            >
              <Text style={[styles.secondaryText, { color: colors.danger }]}>
                {t('shopping.delete_reminder')}
              </Text>
            </Pressable>
          )}

          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            style={({ pressed }) => [styles.secondary, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Text style={[styles.secondaryText, { color: colors.textMuted }]}>
              {t('common.cancel')}
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(9, 6, 24, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 10,
    alignItems: 'center'
  },
  iconWrap: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14
  },
  title: {
    fontFamily: FONT_FAMILY_BOLD,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center'
  },
  subtitle: {
    fontFamily: FONT_FAMILY,
    fontSize: 13.5,
    textAlign: 'center',
    marginTop: 6
  },
  rows: { alignSelf: 'stretch', gap: 10, marginTop: 20 },
  row: {
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1
  },
  rowText: { flex: 1 },
  rowLabel: { fontFamily: FONT_FAMILY, fontSize: 11 },
  rowValue: { fontFamily: FONT_FAMILY_SEMIBOLD, fontSize: 14.5, marginTop: 3 },
  warning: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12
  },
  ctaWrap: { alignSelf: 'stretch', marginTop: 20 },
  cta: { paddingVertical: 14, alignItems: 'center' },
  ctaText: {
    fontFamily: FONT_FAMILY_SEMIBOLD,
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  secondary: { paddingVertical: 13, alignSelf: 'stretch', alignItems: 'center' },
  secondaryText: { fontFamily: FONT_FAMILY_SEMIBOLD, fontSize: 13.5 }
});
