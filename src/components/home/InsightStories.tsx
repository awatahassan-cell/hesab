import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme';
import { FONT_FAMILY, FONT_FAMILY_BOLD, FONT_FAMILY_MEDIUM, FONT_FAMILY_SEMIBOLD } from '../../theme/typography';
import { formatCurrency } from '../../utils/currency';
import { CategoryStory, Story } from '../../utils/stories';

interface InsightStoriesProps {
  stories: Story[];
  currency: string;
  isRTL: boolean;
}

const STORY_MS = 5000;

// Each kind keeps its own colour whatever the app scheme, the way a story's
// colour tells you what it's about before you read it: spending, a win, a
// bill, a goal. All are deep enough for white text.
const GRADIENTS: Record<Story['kind'], [string, string]> = {
  week: ['#F2553A', '#E0335F'],
  win: ['#12A27A', '#0B6E52'],
  top: ['#1C7ED6', '#3B3FC4'],
  due: ['#3B2FD9', '#7048E8'],
  goal: ['#EE7A12', '#D9480F']
};

const ICONS: Record<Story['kind'], keyof typeof Ionicons.glyphMap> = {
  week: 'calendar-clear-outline',
  win: 'trending-down-outline',
  top: 'pie-chart-outline',
  due: 'alarm-outline',
  goal: 'flag-outline'
};

/**
 * Short swipeable "stories" at the top of Home: this week's spending, a
 * category that improved (or the biggest one), the next bill and the
 * closest goal. Tap the leading half to go back and the trailing half to go
 * on; a long press holds the current story. Plays through once and stops —
 * a finance screen shouldn't loop at someone — and never auto-advances when
 * the system asks for reduced motion.
 */
export const InsightStories: React.FC<InsightStoriesProps> = ({ stories, currency, isRTL }) => {
  const { t } = useTranslation();
  const { radius } = useTheme();
  const count = stories.length;

  const [index, setIndex] = useState(0);
  const [autoplay, setAutoplay] = useState(true);
  const [paused, setPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  // Where the running segment stood when it was last interrupted, so a
  // pause resumes rather than restarts — keyed by index so moving to
  // another story always starts that one from zero.
  const resume = useRef({ index: 0, value: 0 });

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => mounted && setReduceMotion(v))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted = false;
      sub?.remove?.();
    };
  }, []);

  // Data can shrink under us on refresh (a bill paid, a goal reached).
  useEffect(() => {
    if (index >= count && count > 0) setIndex(count - 1);
  }, [count, index]);

  useEffect(() => {
    const running = autoplay && !reduceMotion && !paused && count > 1;
    if (!running) {
      if (!autoplay || reduceMotion || count <= 1) progress.setValue(1);
      return;
    }
    const from = resume.current.index === index ? resume.current.value : 0;
    progress.setValue(from);
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: STORY_MS * (1 - from),
      easing: Easing.linear,
      useNativeDriver: false
    });
    anim.start(({ finished }) => {
      if (!finished) return;
      if (index < count - 1) setIndex(index + 1);
      else setAutoplay(false);
    });
    return () => {
      progress.stopAnimation((value) => {
        resume.current = { index, value: value >= 1 ? 0 : value };
      });
    };
  }, [index, autoplay, reduceMotion, paused, count, progress]);

  if (count === 0) return null;

  const story = stories[Math.min(index, count - 1)];
  const go = (delta: number) => setIndex((i) => (i + delta + count) % count);
  const row = isRTL ? 'row-reverse' : ('row' as const);
  const align = isRTL ? 'right' : ('left' as const);
  const money = (v: number) => formatCurrency(v, currency, { isRTL });
  const weekdayLetters = t('stories.weekdays').split(',');

  const categoryName = (s: CategoryStory) =>
    s.customName ||
    (s.nameKey ? t(`categories.names.${s.nameKey}`, s.nameKey) : t('types.expense'));

  let tag = '';
  let title = '';
  let big = '';
  let body = '';
  let viz: React.ReactNode = null;

  switch (story.kind) {
    case 'week': {
      tag = t('stories.week_tag');
      title = t('stories.week_title');
      big = money(story.total);
      if (story.changePct === null) body = t('stories.week_new');
      else if (Math.abs(story.changePct) < 3) body = t('stories.week_same');
      else if (story.changePct < 0) body = t('stories.week_less', { pct: Math.abs(story.changePct) });
      else body = t('stories.week_more', { pct: story.changePct });
      const max = Math.max(...story.bars, 1);
      viz = (
        <View style={[styles.bars, { flexDirection: row }]}>
          {story.bars.map((v, i) => (
            <View key={i} style={styles.barCol}>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: `${Math.max(6, (v / max) * 100)}%`,
                      opacity: i === story.peakIndex && v > 0 ? 1 : v > 0 ? 0.55 : 0.22
                    }
                  ]}
                />
              </View>
              <Text style={[styles.barLabel, i === 6 && styles.barLabelToday]}>
                {weekdayLetters[story.weekdays[i]] ?? ''}
              </Text>
            </View>
          ))}
        </View>
      );
      break;
    }

    case 'win': {
      const name = categoryName(story);
      tag = t('stories.win_tag');
      title = t('stories.win_title', { name });
      big = `−${Math.abs(story.pct)}%`;
      body = t('stories.win_body', { saved: money(story.lastWeek - story.thisWeek) });
      viz = (
        <View style={styles.compare}>
          {[
            { label: t('stories.last_week'), value: story.lastWeek, ratio: 1, dim: true },
            { label: t('stories.this_week'), value: story.thisWeek, ratio: story.thisWeek / story.lastWeek, dim: false }
          ].map((r) => (
            <View key={r.label} style={[styles.compareRow, { flexDirection: row }]}>
              <Text style={[styles.compareLabel, { textAlign: align }]} numberOfLines={1}>
                {r.label}
              </Text>
              <View style={[styles.compareTrack, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                <View
                  style={[
                    styles.compareFill,
                    { width: `${Math.max(4, r.ratio * 100)}%`, opacity: r.dim ? 0.55 : 1 }
                  ]}
                />
              </View>
              <Text style={styles.compareValue} numberOfLines={1}>
                {formatCurrency(r.value, currency, { isRTL, showSymbol: false })}
              </Text>
            </View>
          ))}
        </View>
      );
      break;
    }

    case 'top': {
      const name = categoryName(story);
      tag = t('stories.top_tag');
      title = t('stories.top_title', { name });
      big = money(story.thisWeek);
      body = t('stories.top_body', { pct: story.pct });
      viz = (
        <View style={[styles.shareTrack, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
          <View style={[styles.shareFill, { width: `${Math.max(4, story.pct)}%` }]} />
        </View>
      );
      break;
    }

    case 'due': {
      tag = t('stories.due_tag');
      title = story.title;
      if (story.diffDays < 0) big = t('reminders.days_overdue', { count: Math.abs(story.diffDays) });
      else if (story.diffDays === 0) big = t('reminders.due_today_bang');
      else if (story.diffDays === 1) big = t('reminders.due_tomorrow_bang');
      else big = t('reminders.days_left', { count: story.diffDays });
      body = t('stories.due_body', { amount: money(story.amount), day: story.dueDay });
      const today = new Date();
      viz = (
        <View style={[styles.days, { flexDirection: row }]}>
          {Array.from({ length: 7 }, (_, k) => {
            const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + k);
            const isDue = k === story.diffDays;
            return (
              <View key={k} style={styles.dayCol}>
                <View style={[styles.dayDot, k === 0 && styles.dayDotToday, isDue && styles.dayDotDue]}>
                  <Text style={[styles.dayNum, isDue && { color: GRADIENTS.due[0] }]}>{d.getDate()}</Text>
                </View>
                <Text style={styles.barLabel}>{weekdayLetters[d.getDay()] ?? ''}</Text>
              </View>
            );
          })}
        </View>
      );
      break;
    }

    case 'goal': {
      tag = t('stories.goal_tag');
      title = story.title;
      big = `${story.pct}%`;
      body = t('stories.goal_body', {
        left: formatCurrency(story.target - story.current, story.currency, { isRTL })
      });
      const r = 40;
      viz = (
        <View style={[styles.goalRow, { flexDirection: row }]}>
          <Svg width={64} height={64} viewBox="0 0 100 100">
            <Circle cx={50} cy={50} r={r} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={12} />
            <Circle
              cx={50}
              cy={50}
              r={r}
              fill="none"
              stroke="#FFFFFF"
              strokeWidth={12}
              strokeLinecap="round"
              strokeDasharray={`${(story.pct / 100) * 2 * Math.PI * r} ${2 * Math.PI * r}`}
              transform="rotate(-90 50 50)"
            />
          </Svg>
          <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
            <Text style={styles.goalLabel}>{t('stories.goal_saved')}</Text>
            <Text style={styles.goalValue} numberOfLines={1}>
              {formatCurrency(story.current, story.currency, { isRTL })}
            </Text>
            <Text style={styles.goalLabel} numberOfLines={1}>
              {t('stories.goal_of', { target: formatCurrency(story.target, story.currency, { isRTL }) })}
            </Text>
          </View>
        </View>
      );
      break;
    }
  }

  const fillWidth = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View
      style={[styles.card, { borderRadius: radius.xl }]}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={`${t('stories.a11y', { index: index + 1, count })}. ${tag}. ${title}. ${big}. ${body}`}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => go(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
    >
      <LinearGradient
        colors={GRADIENTS[story.kind]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={[styles.disc, styles.discA, isRTL ? { left: -60 } : { right: -60 }]} />
      <View pointerEvents="none" style={[styles.disc, styles.discB, isRTL ? { right: -40 } : { left: -40 }]} />

      {count > 1 && (
        <View style={[styles.segs, { flexDirection: row }]}>
          {stories.map((s, k) => (
            <View key={`${s.kind}-${k}`} style={styles.seg}>
              {k < index ? (
                <View style={[styles.segFill, { width: '100%' }]} />
              ) : k === index ? (
                <Animated.View
                  style={[styles.segFill, { width: fillWidth }, isRTL && { alignSelf: 'flex-end' }]}
                />
              ) : null}
            </View>
          ))}
        </View>
      )}

      <View style={[styles.eyebrow, { flexDirection: row }]}>
        <View style={[styles.tagChip, { flexDirection: row }]}>
          <Ionicons name={ICONS[story.kind]} size={12} color="#FFFFFF" />
          <Text style={styles.tagText}>{tag}</Text>
        </View>
        {count > 1 && (
          <Text style={styles.counter}>
            {index + 1}/{count}
          </Text>
        )}
      </View>

      <Text style={[styles.title, { textAlign: align }]} numberOfLines={1}>
        {title}
      </Text>
      <Text style={[styles.big, { textAlign: align }]} numberOfLines={1} adjustsFontSizeToFit>
        {big}
      </Text>
      <Text style={[styles.body, { textAlign: align }]} numberOfLines={2}>
        {body}
      </Text>

      <View style={styles.viz}>{viz}</View>

      {count > 1 && (
        <>
          {/* Leading half goes back, trailing half goes on — mirrored in RTL. */}
          <Pressable
            style={[styles.zone, isRTL ? { right: 0 } : { left: 0 }]}
            onPress={() => go(-1)}
            onLongPress={() => setPaused(true)}
            onPressOut={() => paused && setPaused(false)}
            delayLongPress={250}
            importantForAccessibility="no"
          />
          <Pressable
            style={[styles.zone, isRTL ? { left: 0 } : { right: 0 }]}
            onPress={() => go(1)}
            onLongPress={() => setPaused(true)}
            onPressOut={() => paused && setPaused(false)}
            delayLongPress={250}
            importantForAccessibility="no"
          />
        </>
      )}
    </View>
  );
};

const INK = '#FFFFFF';

const styles = StyleSheet.create({
  card: {
    minHeight: 244,
    marginTop: 4,
    marginBottom: 14,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 16,
    overflow: 'hidden'
  },
  disc: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.10)'
  },
  discA: {
    top: -70,
    width: 200,
    height: 200
  },
  discB: {
    bottom: -60,
    width: 130,
    height: 130,
    backgroundColor: 'rgba(255, 255, 255, 0.07)'
  },
  segs: {
    gap: 4,
    marginBottom: 12
  },
  seg: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    overflow: 'hidden'
  },
  segFill: {
    height: 3,
    borderRadius: 2,
    backgroundColor: INK
  },
  eyebrow: {
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  tagChip: {
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.2)'
  },
  tagText: {
    color: INK,
    fontSize: 11,
    fontFamily: FONT_FAMILY_SEMIBOLD
  },
  counter: {
    color: INK,
    opacity: 0.8,
    fontSize: 11,
    fontFamily: FONT_FAMILY_MEDIUM,
    fontVariant: ['tabular-nums']
  },
  title: {
    color: INK,
    opacity: 0.95,
    fontSize: 14,
    fontFamily: FONT_FAMILY_BOLD,
    marginTop: 12
  },
  big: {
    color: INK,
    fontSize: 34,
    fontFamily: FONT_FAMILY_BOLD,
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
    marginTop: 2
  },
  body: {
    color: INK,
    opacity: 0.9,
    fontSize: 12,
    lineHeight: 19,
    fontFamily: FONT_FAMILY,
    marginTop: 2
  },
  viz: {
    marginTop: 'auto',
    paddingTop: 12
  },
  bars: {
    height: 64,
    gap: 8,
    alignItems: 'flex-end'
  },
  barCol: {
    flex: 1,
    height: '100%',
    alignItems: 'center'
  },
  barTrack: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end'
  },
  bar: {
    width: '100%',
    borderRadius: 5,
    backgroundColor: INK
  },
  barLabel: {
    color: INK,
    opacity: 0.75,
    fontSize: 10,
    fontFamily: FONT_FAMILY_MEDIUM,
    marginTop: 4
  },
  barLabelToday: {
    opacity: 1,
    fontFamily: FONT_FAMILY_BOLD
  },
  compare: {
    gap: 8
  },
  compareRow: {
    alignItems: 'center',
    gap: 10
  },
  compareLabel: {
    width: 78,
    color: INK,
    opacity: 0.85,
    fontSize: 11,
    fontFamily: FONT_FAMILY_MEDIUM
  },
  compareTrack: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden'
  },
  compareFill: {
    height: 10,
    borderRadius: 5,
    backgroundColor: INK
  },
  compareValue: {
    minWidth: 56,
    color: INK,
    fontSize: 12,
    fontFamily: FONT_FAMILY_BOLD,
    fontVariant: ['tabular-nums'],
    textAlign: 'center'
  },
  shareTrack: {
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden'
  },
  shareFill: {
    height: 12,
    borderRadius: 6,
    backgroundColor: INK
  },
  days: {
    gap: 6
  },
  dayCol: {
    flex: 1,
    alignItems: 'center'
  },
  dayDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.14)'
  },
  dayDotToday: {
    borderWidth: 1.5,
    borderColor: INK
  },
  dayDotDue: {
    backgroundColor: INK
  },
  dayNum: {
    color: INK,
    fontSize: 12,
    fontFamily: FONT_FAMILY_BOLD,
    fontVariant: ['tabular-nums']
  },
  goalRow: {
    alignItems: 'center',
    gap: 14
  },
  goalLabel: {
    color: INK,
    opacity: 0.85,
    fontSize: 11,
    fontFamily: FONT_FAMILY_MEDIUM
  },
  goalValue: {
    color: INK,
    fontSize: 17,
    fontFamily: FONT_FAMILY_BOLD,
    fontVariant: ['tabular-nums'],
    marginVertical: 1
  },
  zone: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '50%'
  }
});
