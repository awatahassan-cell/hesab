import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Line, Path, Rect, Circle } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme';
import { PeriodTotal, runningNet } from '../../utils/aggregate';
import { getNumberLocale } from '../../utils/currency';

interface TrendChartProps {
  totals: PeriodTotal[];
  isRTL: boolean;
  /** 'bars' compares income against expense; 'line' draws the running net. */
  variant: 'bars' | 'line';
  width: number;
}

const HEIGHT = 150;
const PAD_BOTTOM = 20;
const PAD_TOP = 10;

/** "2026-03" as a short month name in the app's language. */
function monthLabel(key: string): string {
  const [year, month] = key.split('-').map(Number);
  return new Intl.DateTimeFormat(getNumberLocale(), { month: 'short' }).format(
    new Date(year, month - 1, 1)
  );
}

export const TrendChart: React.FC<TrendChartProps> = ({ totals, isRTL, variant, width }) => {
  const { colors, typography } = useTheme();
  const { t } = useTranslation();

  // RTL reads right to left, so the newest month belongs on the left there.
  const series = useMemo(() => (isRTL ? [...totals].reverse() : totals), [totals, isRTL]);
  const net = useMemo(() => runningNet(series), [series]);

  const plotHeight = HEIGHT - PAD_BOTTOM - PAD_TOP;
  const slot = series.length > 0 ? width / series.length : width;

  const maxBar = Math.max(1, ...series.map((s) => Math.max(s.income, s.expense)));

  const netValues = net.map((n) => n.value);
  const netMax = Math.max(0, ...netValues);
  const netMin = Math.min(0, ...netValues);
  const netSpan = Math.max(1, netMax - netMin);
  const yFor = (value: number) => PAD_TOP + plotHeight - ((value - netMin) / netSpan) * plotHeight;
  const zeroY = yFor(0);

  const linePath = net
    .map((point, i) => `${i === 0 ? 'M' : 'L'} ${slot * i + slot / 2} ${yFor(point.value)}`)
    .join(' ');

  const hasData = series.some((s) => s.income > 0 || s.expense > 0);

  if (!hasData) {
    return (
      <Text style={[typography.caption, { color: colors.textMuted, textAlign: 'center', paddingVertical: 24 }]}>
        {t('reports.no_chart_data')}
      </Text>
    );
  }

  return (
    <View>
      <Svg width={width} height={HEIGHT}>
        {variant === 'bars' ? (
          series.map((entry, i) => {
            const barWidth = Math.max(3, slot / 2 - 5);
            const incomeH = (entry.income / maxBar) * plotHeight;
            const expenseH = (entry.expense / maxBar) * plotHeight;
            const left = slot * i + slot / 2;
            return (
              <React.Fragment key={entry.key}>
                <Rect
                  x={left - barWidth - 1}
                  y={PAD_TOP + plotHeight - incomeH}
                  width={barWidth}
                  height={Math.max(incomeH, 1)}
                  rx={2}
                  fill={colors.income}
                />
                <Rect
                  x={left + 1}
                  y={PAD_TOP + plotHeight - expenseH}
                  width={barWidth}
                  height={Math.max(expenseH, 1)}
                  rx={2}
                  fill={colors.expense}
                />
              </React.Fragment>
            );
          })
        ) : (
          <>
            <Line
              x1={0}
              y1={zeroY}
              x2={width}
              y2={zeroY}
              stroke={colors.divider}
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            <Path d={linePath} stroke={colors.accent} strokeWidth={2.5} fill="none" />
            {net.map((point, i) => (
              <Circle
                key={point.key}
                cx={slot * i + slot / 2}
                cy={yFor(point.value)}
                r={3}
                fill={point.value >= 0 ? colors.income : colors.expense}
              />
            ))}
          </>
        )}
      </Svg>

      <View style={styles.labels}>
        {series.map((entry) => (
          <Text
            key={entry.key}
            numberOfLines={1}
            style={[styles.label, { color: colors.textMuted, width: slot }]}
          >
            {monthLabel(entry.key)}
          </Text>
        ))}
      </View>

      {variant === 'bars' && (
        <View style={[styles.legend, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={[styles.legendDot, { backgroundColor: colors.income }]} />
          <Text style={[typography.captionSmall, { color: colors.textMuted, marginHorizontal: 5 }]}>
            {t('home.monthly_income')}
          </Text>
          <View style={[styles.legendDot, { backgroundColor: colors.expense, marginLeft: 12 }]} />
          <Text style={[typography.captionSmall, { color: colors.textMuted, marginHorizontal: 5 }]}>
            {t('home.monthly_expense')}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  labels: { flexDirection: 'row' },
  label: { fontSize: 9, textAlign: 'center' },
  legend: { alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  legendDot: { width: 8, height: 8, borderRadius: 4 }
});
