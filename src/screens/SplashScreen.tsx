import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  useColorScheme,
  useWindowDimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import { lightColors, darkColors } from '../theme/colors';

/**
 * The first frame of the app.
 *
 * It renders before ThemeProvider mounts — fonts and the database are still
 * loading behind it — so it reads the system scheme directly instead of the
 * theme context, and leans on system fonts rather than the app's Plex faces,
 * which are not loaded yet.
 */
export const SplashScreen: React.FC = () => {
  const scheme = useColorScheme();
  const colors = scheme === 'dark' ? darkColors : lightColors;
  const { width, height } = useWindowDimensions();

  const markIn = useRef(new Animated.Value(0)).current;
  const wordIn = useRef(new Animated.Value(0)).current;
  const sweep = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(markIn, {
        toValue: 1,
        duration: 620,
        easing: Easing.bezier(0.16, 1, 0.3, 1),
        useNativeDriver: true
      }),
      Animated.timing(wordIn, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      })
    ]).start();

    // Runs until the app is ready and this screen is torn down.
    Animated.loop(
      Animated.timing(sweep, {
        toValue: 1,
        duration: 1400,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true
      })
    ).start();
  }, [markIn, wordIn, sweep]);

  const [c1, c2, c3] = colors.aurora;
  const [o1, o2, o3] = colors.auroraOpacity;
  const blob = width * 0.95;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* same wash the rest of the app sits on, so the handoff is seamless */}
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="s1" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={c1} stopOpacity={o1} />
            <Stop offset="100%" stopColor={c1} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="s2" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={c2} stopOpacity={o2} />
            <Stop offset="100%" stopColor={c2} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="s3" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={c3} stopOpacity={o3} />
            <Stop offset="100%" stopColor={c3} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x={width - blob * 0.6} y={-blob * 0.42} width={blob} height={blob} fill="url(#s1)" />
        <Rect x={-blob * 0.5} y={height * 0.34} width={blob} height={blob} fill="url(#s2)" />
        <Rect x={width * 0.1} y={height - blob * 0.5} width={blob} height={blob} fill="url(#s3)" />
      </Svg>

      <View style={styles.center}>
        <Animated.View
          style={{
            opacity: markIn,
            transform: [
              { scale: markIn.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1] }) }
            ]
          }}
        >
          <LinearGradient
            colors={[colors.heroGradient[0], colors.heroGradient[1], colors.heroGradient[2]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.mark, { shadowColor: colors.accent }]}
          >
            <Text style={styles.markLetter}>ح</Text>
          </LinearGradient>
        </Animated.View>

        <Animated.View
          style={{
            opacity: wordIn,
            transform: [
              { translateY: wordIn.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }
            ]
          }}
        >
          <Text style={[styles.name, { color: colors.textPrimary }]}>حساب</Text>
          <Text style={[styles.tag, { color: colors.textSecondary }]}>
            ڕێکخەری داراییی تایبەتی
          </Text>
        </Animated.View>
      </View>

      {/* indeterminate sweep — length is unknown, so it never pretends to be a percentage */}
      <View style={[styles.trackWrap, { bottom: height * 0.14 }]}>
        <View style={[styles.track, { backgroundColor: colors.hairline }]}>
          <Animated.View
            style={{
              width: '38%',
              height: '100%',
              borderRadius: 99,
              transform: [
                {
                  translateX: sweep.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-46, 118]
                  })
                }
              ]
            }}
          >
            <LinearGradient
              colors={[colors.heroGradient[0], colors.heroGradient[2]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.sweepFill}
            />
          </Animated.View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 26
  },
  mark: {
    width: 104,
    height: 104,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.42,
    shadowRadius: 26,
    elevation: 14
  },
  markLetter: {
    fontSize: 62,
    lineHeight: 84,
    color: '#FFFFFF',
    fontWeight: '700',
    includeFontPadding: false
  },
  name: {
    fontSize: 30,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.3
  },
  tag: {
    fontSize: 13.5,
    textAlign: 'center',
    marginTop: 7
  },
  trackWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center'
  },
  track: {
    width: 164,
    height: 4,
    borderRadius: 99,
    overflow: 'hidden'
  },
  sweepFill: { flex: 1, borderRadius: 99 }
});
