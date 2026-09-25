import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Platform,
  LayoutChangeEvent
} from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme';
import { useAppStore } from '../../store/useAppStore';
import { Icon, IconName } from '../icons/Icon';
import { FONT_FAMILY_MEDIUM, FONT_FAMILY_SEMIBOLD } from '../../theme/typography';
import { useTranslation } from 'react-i18next';

/** Height of the bar itself, above the device's bottom inset. */
export const TAB_BAR_HEIGHT = 62;

const ICONS: Record<string, IconName> = {
  Home: 'home',
  GoalsAndBudgets: 'target',
  Add: 'plus',
  Reports: 'chart',
  Menu: 'grid'
};

// Keys, not text: the map is module scope, so translation happens at render.
const LABEL_KEYS: Record<string, string> = {
  Home: 'tabs.home',
  GoalsAndBudgets: 'tabs.goals_short',
  Add: '',
  Reports: 'tabs.reports_short',
  Menu: 'tabs.more'
};

/**
 * Full-bleed frosted tab bar.
 *
 * Spans the whole screen width and sits flush with the bottom edge, with the
 * safe-area inset absorbed as padding rather than as a floating margin — the
 * old inset dock drifted between devices. The add button lives inline in the
 * bar instead of overlapping it, so nothing depends on a magic offset.
 */
export const GlassTabBar: React.FC<BottomTabBarProps> = ({
  state,
  descriptors,
  navigation
}) => {
  const { colors, radius } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const isRTL = useAppStore((s) => s.isRTL);

  const [barWidth, setBarWidth] = useState(0);
  const slide = useRef(new Animated.Value(0)).current;

  const count = state.routes.length;
  const slot = barWidth > 0 ? barWidth / count : 0;
  // Layout is driven by an explicit row-reverse, not I18nManager, so the
  // visual position has to be mirrored by hand when the app is in RTL.
  const visualIndex = isRTL ? count - 1 - state.index : state.index;

  useEffect(() => {
    if (slot === 0) return;
    Animated.spring(slide, {
      toValue: slot * visualIndex,
      useNativeDriver: true,
      speed: 16,
      bounciness: 7
    }).start();
  }, [slot, visualIndex, slide]);

  const onBarLayout = (e: LayoutChangeEvent) =>
    setBarWidth(e.nativeEvent.layout.width);

  const bottomPad = Math.max(insets.bottom, Platform.OS === 'android' ? 10 : 8);

  return (
    <View style={[styles.wrap, { paddingBottom: bottomPad }]} onLayout={onBarLayout}>
      <BlurView
        intensity={Platform.OS === 'android' ? 60 : 40}
        tint={colors.blurTint}
        // Android renders a plain translucent view unless a blur method is
        // named; this one falls back to 'none' below Android 12.
        blurMethod="dimezisBlurViewSdk31Plus"
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: colors.glass, borderTopColor: colors.glassEdge, borderTopWidth: 1 }
        ]}
      />

      {slot > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.indicator,
            {
              width: slot,
              transform: [{ translateX: slide }]
            }
          ]}
        >
          <View
            style={{
              width: 34,
              height: 3,
              borderRadius: radius.round,
              backgroundColor: colors.accent
            }}
          />
        </Animated.View>
      )}

      <View style={[styles.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const isAdd = route.name === 'Add';
          const iconName = ICONS[route.name] ?? 'home';
          const labelKey = LABEL_KEYS[route.name];
          const label = labelKey
            ? t(labelKey)
            : ((descriptors[route.key]?.options.title as string) ?? route.name);

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          if (isAdd) {
            return (
              <Pressable
                key={route.key}
                accessibilityRole="button"
                accessibilityLabel={t('tabs.add_transaction_a11y')}
                onPress={onPress}
                style={({ pressed }) => [
                  styles.tab,
                  { transform: [{ scale: pressed ? 0.93 : 1 }] }
                ]}
              >
                <LinearGradient
                  colors={[colors.heroGradient[0], colors.heroGradient[2]]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[
                    styles.addBtn,
                    {
                      borderRadius: radius.md,
                      shadowColor: colors.accent
                    }
                  ]}
                >
                  <Icon name="plus" size={24} color="#FFFFFF" strokeWidth={2.1} />
                </LinearGradient>
              </Pressable>
            );
          }

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              accessibilityLabel={label}
              onPress={onPress}
              style={({ pressed }) => [
                styles.tab,
                { transform: [{ scale: pressed ? 0.93 : 1 }] }
              ]}
            >
              <Icon
                name={iconName}
                size={24}
                color={focused ? colors.accent : colors.textMuted}
                filled={focused}
              />
              <Text
                style={[
                  styles.label,
                  {
                    color: focused ? colors.accent : colors.textMuted,
                    fontFamily: focused ? FONT_FAMILY_SEMIBOLD : FONT_FAMILY_MEDIUM
                  }
                ]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    // Full-bleed: no horizontal margin, no radius, flush to the screen edges.
    overflow: 'hidden'
  },
  row: {
    height: TAB_BAR_HEIGHT,
    alignItems: 'center'
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: '100%'
  },
  label: {
    fontSize: 11,
    letterSpacing: 0.1
  },
  indicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    alignItems: 'center'
  },
  addBtn: {
    width: 46,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 6
  }
});
