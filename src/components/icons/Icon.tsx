import React from 'react';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

/**
 * Hand-drawn 24×24 icon set for Hesab.
 *
 * Every glyph is stroked on the same grid with the same weight and round
 * caps, so the set reads as one family — which the mixed Ionicons never did.
 * `filled` adds a soft wash behind the stroke for the active tab state.
 */
export type IconName =
  | 'home'
  | 'target'
  | 'plus'
  | 'chart'
  | 'grid'
  | 'arrowDown'
  | 'arrowUp'
  | 'users'
  | 'clock'
  | 'bell'
  | 'user'
  | 'wallet'
  | 'cart'
  | 'flag'
  | 'search'
  | 'settings';

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  /** Softly fills the glyph — used for the active tab. */
  filled?: boolean;
  strokeWidth?: number;
}

const PATHS: Record<IconName, (sw: number, fill: string) => React.ReactNode> = {
  home: (sw, fill) => (
    <>
      <Path
        d="M3.2 10.1 12 3.4l8.8 6.7V19a2 2 0 0 1-2 2H5.2a2 2 0 0 1-2-2v-8.9Z"
        fill={fill} fillOpacity={0.18}
      />
      <Path d="M9.4 21v-6.2h5.2V21" />
    </>
  ),
  target: (sw, fill) => (
    <>
      <Circle cx="12" cy="12" r="8.6" fill={fill} fillOpacity={0.18} />
      <Circle cx="12" cy="12" r="4.8" />
      <Circle cx="12" cy="12" r="1.1" fill="currentColor" />
    </>
  ),
  plus: () => <Path d="M12 5.2v13.6M5.2 12h13.6" />,
  chart: (sw, fill) => (
    <>
      <Path d="M4 20.2h16" />
      <Path d="M7.4 20.2v-6.1" fill={fill} fillOpacity={0.18} />
      <Path d="M12 20.2V4.9" />
      <Path d="M16.6 20.2v-9.4" />
    </>
  ),
  grid: (sw, fill) => (
    <>
      <Rect x="3.4" y="3.4" width="7.2" height="7.2" rx="2.4" fill={fill} fillOpacity={0.18} />
      <Rect x="13.4" y="3.4" width="7.2" height="7.2" rx="2.4" />
      <Rect x="3.4" y="13.4" width="7.2" height="7.2" rx="2.4" />
      <Rect x="13.4" y="13.4" width="7.2" height="7.2" rx="2.4" fill={fill} fillOpacity={0.18} />
    </>
  ),
  arrowDown: () => (
    <>
      <Path d="M12 4.6v14.8" />
      <Path d="M6.4 13.8 12 19.4l5.6-5.6" />
    </>
  ),
  arrowUp: () => (
    <>
      <Path d="M12 19.4V4.6" />
      <Path d="M6.4 10.2 12 4.6l5.6 5.6" />
    </>
  ),
  users: (sw, fill) => (
    <>
      <Circle cx="9.2" cy="8.2" r="3.6" fill={fill} fillOpacity={0.18} />
      <Path d="M2.9 20.2c0-3.4 2.8-6.2 6.3-6.2s6.3 2.8 6.3 6.2" />
      <Path d="M16.4 5.1a3.6 3.6 0 0 1 0 6.9" />
      <Path d="M18.2 14.6c1.8.9 2.9 2.7 2.9 4.8" />
    </>
  ),
  clock: (sw, fill) => (
    <>
      <Circle cx="12" cy="12" r="8.7" fill={fill} fillOpacity={0.18} />
      <Path d="M12 7.1V12l3.3 2.2" />
    </>
  ),
  bell: (sw, fill) => (
    <>
      <Path
        d="M18.2 16.4V11a6.2 6.2 0 1 0-12.4 0v5.4L4.3 18.4h15.4l-1.5-2Z"
        fill={fill} fillOpacity={0.18}
      />
      <Path d="M10.1 18.4a1.9 1.9 0 0 0 3.8 0" />
    </>
  ),
  user: (sw, fill) => (
    <>
      <Circle cx="12" cy="8.2" r="3.9" fill={fill} fillOpacity={0.18} />
      <Path d="M4.8 20.4c0-3.7 3.2-6.6 7.2-6.6s7.2 2.9 7.2 6.6" />
    </>
  ),
  wallet: (sw, fill) => (
    <>
      <Rect x="3.2" y="6.2" width="17.6" height="13.6" rx="3.4" fill={fill} fillOpacity={0.18} />
      <Path d="M3.2 10.4h17.6" />
      <Circle cx="16.6" cy="15" r="1.2" fill="currentColor" />
    </>
  ),
  cart: (sw, fill) => (
    <>
      <Path d="M2.9 4.4h2.6l2.3 10.4h9.1l2.2-7.5H6.4" fill={fill} fillOpacity={0.18} />
      <Circle cx="9.4" cy="19.1" r="1.5" />
      <Circle cx="16.6" cy="19.1" r="1.5" />
    </>
  ),
  flag: (sw, fill) => (
    <>
      <Path d="M5.6 21V3.6" />
      <Path d="M5.6 4.6h10.9l-1.9 3.9 1.9 3.9H5.6" fill={fill} fillOpacity={0.18} />
    </>
  ),
  search: () => (
    <>
      <Circle cx="10.8" cy="10.8" r="6.8" />
      <Path d="M15.8 15.8 21 21" />
    </>
  ),
  settings: () => (
    <>
      <Path d="M4 7.4h16M4 12h16M4 16.6h16" />
      <Circle cx="9" cy="7.4" r="2.1" fill="currentColor" />
      <Circle cx="15.4" cy="16.6" r="2.1" fill="currentColor" />
    </>
  )
};

export const Icon: React.FC<IconProps> = ({
  name,
  size = 24,
  color = '#000000',
  filled = false,
  strokeWidth = 1.75
}) => {
  const draw = PATHS[name] ?? PATHS.home;

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      color={color}
    >
      {draw(strokeWidth, filled ? color : 'none')}
    </Svg>
  );
};
