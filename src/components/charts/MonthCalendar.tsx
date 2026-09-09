import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme';
import { PeriodTotal } from '../../utils/aggregate';
import { formatNumber, getNumberLocale } from '../../utils/currency';

interface MonthCalendarProps {
  /** Any date inside the month to draw. */
  month: Date;
  totals: PeriodTotal[];
  isRTL: boolean;
  selectedDay?: string;
  onSelectDay: (day: string | undefined) => void;
}

/** Sunday-first, matching the calendar apps on both platforms. */
const WEEK_LENGTH = 7;

function keyFor(year: number, monthIndex: number, day: number): string {
  return `${year}-${`${monthIndex + 1}`.padStart(2, '0')}-${`${day}`.padStart(2, '0')}`;
}

/** Compact money for a cell: 12500 reads as 12.5k in a 40px box. */
function short(value: number): string {
  if (value >= 1_000_000) return `${formatNumber(Math.round(value / 100_000) / 10)}M`;
  if (value >= 1_000) return `${formatNumber(Math.round(value / 100) / 10)}k`;
  return formatNumber(Math.round(value));
}

export const MonthCalendar: React.FC<MonthCalendarProps> = ({
  month,
  totals,
  isRTL,
  selectedDay,
  onSelectDay
}) => {
  const { colors, typography, radius } = useTheme();
  const { t } = useTranslation();

  const byDay = useMemo(() => new Map(totals.map((entry) => [entry.key, entry])), [totals]);

  const weekdayLabels = useMemo(() => {
    // Taken from Intl rather than a hardcoded list, so the names arrive in
    // whatever language the app is running in.
    const formatter = new Intl.DateTimeFormat(getNumberLocale(), { weekday: 'narrow' });
    return Array.from({ length: WEEK_LENGTH }, (_, i) =>
      formatter.format(new Date(2024, 8, 1 + i)) // 1 Sep 2024 was a Sunday
    );
  }, []);

  const cells = useMemo(() => {
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const leading = new Date(year, monthIndex, 1).getDay();
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

    const out: (number | null)[] = Array.from({ length: leading }, () => null);
    for (let day = 1; day <= daysInMonth; day++) out.push(day);
    while (out.length % WEEK_LENGTH !== 0) out.push(null);
    return out;
  }, [month]);

  const rows = useMemo(() => {
    const grouped: (number | null)[][] = [];
    for (let i = 0; i < cells.length; i += WEEK_LENGTH) {
      const week = cells.slice(i, i + WEEK_LENGTH);
      grouped.push(isRTL ? [...week].reverse() : week);
    }
    return grouped;
  }, [cells, isRTL]);

  const headings = isRTL ? [...weekdayLabels].reverse() : weekdayLabels;
  const todayKey = keyFor(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

  return (
    <View>
      <View style={styles.row}>
        {headings.map((label, i) => (
          <Text
            key={`${label}-${i}`}
            style={[styles.weekday, typography.captionSmall, { color: colors.textMuted }]}
          >
            {label}
          </Text>
        ))}
      </View>

      {rows.map((week, wi) => (
        <View key={wi} style={styles.row}>
          {week.map((day, di) => {
            if (day === null) return <View key={`empty-${di}`} style={styles.emptyCell} />;

            const key = keyFor(month.getFullYear(), month.getMonth(), day);
            const entry = byDay.get(key);
            const isSelected = selectedDay === key;
            const isToday = key === todayKey;

            return (
              <TouchableOpacity
                key={key}
                activeOpacity={0.7}
                accessibilityLabel={`${day}`}
                onPress={() => onSelectDay(isSelected ? undefined : key)}
                style={[
                  styles.cell,
                  {
                    backgroundColor: isSelected ? colors.accentMuted : 'transparent',
                    borderColor: isSelected ? colors.accent : 'transparent',
                    borderRadius: radius.sm
                  }
                ]}
              >
                <Text
                  style={[
                    styles.dayNum,
                    {
                      color: isToday ? colors.accent : colors.textPrimary,
                      fontWeight: isToday ? '800' : '600'
                    }
                  ]}
                >
                  {day}
                </Text>
                {!!entry?.expense && (
                  <Text numberOfLines={1} style={[styles.cellAmount, { color: colors.expense }]}>
                    {short(entry.expense)}
                  </Text>
                )}
                {!!entry?.income && (
                  <Text numberOfLines={1} style={[styles.cellAmount, { color: colors.income }]}>
                    {short(entry.income)}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}

      {totals.length === 0 && (
        <Text style={[typography.caption, { color: colors.textMuted, textAlign: 'center', marginTop: 12 }]}>
          {t('reports.no_chart_data')}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center', paddingVertical: 6 },
  cell: {
    flex: 1,
    minHeight: 46,
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 3,
    marginHorizontal: 1,
    marginVertical: 1,
    borderWidth: 1
  },
  emptyCell: { flex: 1, minHeight: 46, marginHorizontal: 1, marginVertical: 1 },
  dayNum: { fontSize: 12 },
  cellAmount: { fontSize: 8.5, fontWeight: '700' }
});
