import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StatusBar as RNStatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { useAppStore } from '../../store/useAppStore';
import { FONT_FAMILY_BOLD, FONT_FAMILY_MEDIUM } from '../../theme/typography';

interface CurvedHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightElement?: React.ReactNode;
  children?: React.ReactNode;
}

export const CurvedHeader: React.FC<CurvedHeaderProps> = ({
  title,
  subtitle,
  showBack = false,
  onBack,
  rightElement,
  children
}) => {
  const { colors, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const isRTL = useAppStore((state) => state.isRTL);

  const topInset =
    Platform.OS === 'android'
      ? (RNStatusBar.currentHeight || insets.top || 24)
      : Math.max(insets.top, 20);

  return (
    <LinearGradient
      colors={colors.heroGradientRich}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.65, y: 1 }}
      style={[
        styles.container,
        {
          paddingTop: topInset + 6,
          borderBottomLeftRadius: 30,
          borderBottomRightRadius: 30
        }
      ]}
    >
      <View
        style={[
          styles.barRow,
          { flexDirection: isRTL ? 'row-reverse' : 'row' }
        ]}
      >
        {/* Back button (only when showBack is true) */}
        {showBack ? (
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={onBack}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={[
              styles.iconBtn,
              isRTL ? { marginLeft: 12 } : { marginRight: 12 }
            ]}
          >
            <Ionicons
              name={isRTL ? 'arrow-forward' : 'arrow-back'}
              size={21}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        ) : null}

        {/* Title and Subtitle - Aligned to Start (Right in RTL, Left in LTR) */}
        <View
          style={[
            styles.titleWrap,
            { alignItems: isRTL ? 'flex-end' : 'flex-start' }
          ]}
        >
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={[
              styles.titleText,
              { textAlign: isRTL ? 'right' : 'left' }
            ]}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={[
                styles.subtitleText,
                { textAlign: isRTL ? 'right' : 'left' }
              ]}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>

        {/* Right element (actions, if provided) */}
        {rightElement ? (
          <View
            style={[
              styles.rightWrap,
              isRTL ? { marginRight: 12 } : { marginLeft: 12 }
            ]}
          >
            {rightElement}
          </View>
        ) : null}
      </View>

      {/* Optional sub-content (filters, tabs, search) */}
      {children ? <View style={styles.subContent}>{children}</View> : null}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    zIndex: 10
  },
  barRow: {
    alignItems: 'center',
    minHeight: 44
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.20)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  titleWrap: {
    flex: 1,
    justifyContent: 'center'
  },
  titleText: {
    color: '#FFFFFF',
    fontSize: 21,
    fontFamily: FONT_FAMILY_BOLD,
    letterSpacing: 0
  },
  subtitleText: {
    color: 'rgba(255, 255, 255, 0.82)',
    fontSize: 12.5,
    fontFamily: FONT_FAMILY_MEDIUM,
    marginTop: 2,
    letterSpacing: 0
  },
  rightWrap: {
    minWidth: 38,
    alignItems: 'center',
    justifyContent: 'center'
  },
  subContent: {
    marginTop: 12
  }
});
