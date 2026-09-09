import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import { useTheme } from '../../theme';

/**
 * The soft colour wash every screen sits on.
 *
 * React Native has no view-level blur filter, so the three fields are drawn
 * as SVG radial gradients that fade to zero alpha instead — same look as a
 * blurred blob, without a blur pass on every frame.
 *
 * Absolutely positioned and non-interactive: drop it as the first child of a
 * screen's root view and everything else keeps its own layout.
 */
export const AuroraBackground: React.FC = () => {
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();

  const [c1, c2, c3] = colors.aurora;
  const [o1, o2, o3] = colors.auroraOpacity;

  // Blobs are sized off the viewport so the wash reads the same on any device.
  const r1 = width * 0.85;
  const r2 = width * 0.7;
  const r3 = width * 0.75;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="a1" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={c1} stopOpacity={o1} />
            <Stop offset="100%" stopColor={c1} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="a2" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={c2} stopOpacity={o2} />
            <Stop offset="100%" stopColor={c2} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="a3" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={c3} stopOpacity={o3} />
            <Stop offset="100%" stopColor={c3} stopOpacity={0} />
          </RadialGradient>
        </Defs>

        {/* top-trailing */}
        <Rect x={width - r1 * 0.62} y={-r1 * 0.5} width={r1} height={r1} fill="url(#a1)" />
        {/* mid-leading */}
        <Rect x={-r2 * 0.45} y={height * 0.18} width={r2} height={r2} fill="url(#a2)" />
        {/* bottom-trailing */}
        <Rect
          x={width - r3 * 0.55}
          y={height - r3 * 0.6}
          width={r3}
          height={r3}
          fill="url(#a3)"
        />
      </Svg>
    </View>
  );
};
