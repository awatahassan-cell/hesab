export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  gutter: 16
};

export const radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 24,
  xxl: 28,
  round: 999
};

// One source for elevation, so screens stop hand-rolling shadows.
// Spread into a style: `{ ...elevation.md(colors.shadowColor) }`
const make = (
  offsetY: number,
  radiusPx: number,
  opacity: number,
  androidElevation: number
) => (shadowColor: string) => ({
  shadowColor,
  shadowOffset: { width: 0, height: offsetY },
  shadowRadius: radiusPx,
  shadowOpacity: opacity,
  elevation: androidElevation
});

export const elevation = {
  sm: make(2, 8, 0.1, 2),
  md: make(8, 20, 0.16, 6),
  lg: make(16, 34, 0.22, 12)
};
