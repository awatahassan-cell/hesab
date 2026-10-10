export interface ColorTheme {
  isDark: boolean;
  background: string;
  surface: string;
  surfaceSecondary: string;
  surfaceSubtle: string;
  cardBorder: string;
  divider: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;
  accent: string;
  accentMuted: string;
  heroGradient: [string, string, string];
  /** The header's own richer gradient — three to four stops, used only
   *  behind the home header where there's room for it to read as a gradient
   *  rather than a flat wash. */
  heroGradientRich: [string, string, string, string];
  /** Text/icon colour to place on top of heroGradient / heroGradientRich —
   *  not simply textInverse, because the gradient is a mid-tone in both
   *  themes rather than a true light/dark extreme. */
  heroOnGradient: string;
  /** True when heroOnGradient is a light ink — i.e. the header gradient is
   *  dark enough that chips, icons and the status bar over it go light. */
  heroIsDark: boolean;
  cardGlow: string;
  /** Four tinted tile pairs for icon chips in grids (shortcuts, menu). The
   *  single-accent schemes repeat the accent; the multi-colour schemes give
   *  each tile its own tone so a grid reads as a set rather than a row of
   *  identical buttons. */
  tiles: [SchemeTile, SchemeTile, SchemeTile, SchemeTile];
  /** How wallet cards render on Home: a plain surface card with an icon chip,
   *  a solid (or two-stop gradient) colour card, or a soft pastel card. The
   *  colours come from walletCards, cycled per wallet. */
  walletStyle: WalletStyle;
  walletCards: [SchemeTile, SchemeTile, SchemeTile, SchemeTile];

  // Glass layer — frosted surfaces sitting over the aurora wash.
  // In light these lighten toward white; in dark they lift off the ground.
  glass: string;
  glassStrong: string;
  glassEdge: string;
  hairline: string;
  // Three blurred colour fields painted behind the content of a screen.
  aurora: [string, string, string];
  auroraOpacity: [number, number, number];
  // Passed straight to expo-blur's `tint`.
  blurTint: 'light' | 'dark';
  shadowColor: string;

  // Semantic
  expense: string;
  expenseMuted: string;
  income: string;
  incomeMuted: string;
  transfer: string;
  transferMuted: string;
  debtLent: string;
  debtLentMuted: string;
  debtBorrowed: string;
  debtBorrowedMuted: string;

  warning: string;
  warningMuted: string;
  danger: string;
  success: string;
}

export interface SchemeTile {
  bg: string;
  fg: string;
  /** Optional second stop — when set, the tile is drawn as a gradient. */
  bg2?: string;
}

type TileSet = [SchemeTile, SchemeTile, SchemeTile, SchemeTile];

export type WalletStyle = 'plain' | 'filled' | 'pastel';

export type ColorSchemeId =
  | 'berry'
  | 'sunset'
  | 'ocean'
  | 'lemon'
  | 'sefeq'
  | 'kani'
  | 'zumurrud'
  | 'mor'
  | 'dureng'
  | 'bento';

/**
 * A palette is one shared neutral/semantic base (near-black ink on an
 * off-white ground, the same reds/greens/ambers for expense/income/warning
 * in every scheme, so "red means expense" never changes underneath someone)
 * plus a per-scheme accent identity layered on top: the accent colour, the
 * header's gradient, and the wash behind every screen. Picking a scheme
 * only ever changes what colour the app *is*, never what a colour *means*.
 */
type BaseLayer = Omit<
  ColorTheme,
  keyof AccentLayer | 'isDark' | 'blurTint' | 'heroIsDark'
>;

const baseLight: BaseLayer = {
  background: '#F9F8FD',
  surface: '#FFFFFF',
  surfaceSecondary: '#F0EEF8',
  surfaceSubtle: '#E6E4F0',
  cardBorder: '#E2E0ED',
  divider: '#EDECF4',
  textPrimary: '#1A1A2E',
  textSecondary: '#5E5C72',
  textMuted: '#9896A8',
  textInverse: '#FFFFFF',
  glass: 'rgba(255, 255, 255, 0.78)',
  glassStrong: 'rgba(255, 255, 255, 0.92)',
  glassEdge: 'rgba(255, 255, 255, 0.95)',
  hairline: 'rgba(26, 26, 46, 0.06)',
  shadowColor: '#1A1A2E',

  expense: '#C23030',
  expenseMuted: '#FDE8E8',
  income: '#0E8F6B',
  incomeMuted: '#DFFAEF',
  transfer: '#5C6B8A',
  transferMuted: '#E8ECF3',
  debtLent: '#3D7A5C',
  debtLentMuted: '#E1F0E7',
  debtBorrowed: '#9A3B12',
  debtBorrowedMuted: '#F7E4DA',

  warning: '#B87333',
  warningMuted: '#FDF2E4',
  danger: '#C23030',
  success: '#0E8F6B'
};

const baseDark: BaseLayer = {
  background: '#0E0E16',
  surface: '#17171F',
  surfaceSecondary: '#1F1F2A',
  surfaceSubtle: '#292938',
  cardBorder: '#2E2E3E',
  divider: '#1F1F2A',
  textPrimary: '#F0EFF5',
  textSecondary: '#A8A6B8',
  textMuted: '#6E6C80',
  textInverse: '#FFFFFF',
  glass: 'rgba(23, 23, 31, 0.80)',
  glassStrong: 'rgba(31, 31, 42, 0.88)',
  glassEdge: 'rgba(255, 255, 255, 0.08)',
  hairline: 'rgba(255, 255, 255, 0.06)',
  shadowColor: '#000000',

  expense: '#E8756A',
  expenseMuted: '#2E1A18',
  income: '#6FCBA4',
  incomeMuted: '#152E24',
  transfer: '#8CA0C4',
  transferMuted: '#232C3E',
  debtLent: '#6FCBA4',
  debtLentMuted: '#1B332B',
  debtBorrowed: '#F2A15C',
  debtBorrowedMuted: '#3A2B18',

  warning: '#F2C572',
  warningMuted: '#2E2610',
  danger: '#E8756A',
  success: '#6FCBA4'
};

interface AccentLayer {
  accent: string;
  accentMuted: string;
  heroGradient: [string, string, string];
  heroGradientRich: [string, string, string, string];
  heroOnGradient: string;
  cardGlow: string;
  aurora: [string, string, string];
  auroraOpacity: [number, number, number];
  // Optional for the single-accent schemes — getThemeColors derives them
  // from the accent so those schemes look exactly as they always have.
  tiles?: TileSet;
  walletStyle?: WalletStyle;
  walletCards?: TileSet;
}

interface SchemeDef {
  nameKey: string;
  light: AccentLayer;
  dark: AccentLayer;
}

export const COLOR_SCHEMES: Record<ColorSchemeId, SchemeDef> = {
  // "هەنار" — Berry / Pomegranate. Sabata signature brand palette.
  berry: {
    nameKey: 'berry',
    light: {
      accent: '#A626C9',
      accentMuted: '#F5EAFD',
      heroGradient: ['#FF3E8A', '#B033EA', '#7B2FF7'],
      heroGradientRich: ['#FF3E8A', '#D932B8', '#A833E0', '#7B2FF7'],
      heroOnGradient: '#FFFFFF',
      cardGlow: 'rgba(166, 38, 201, 0.22)',
      aurora: ['#F5EAFD', '#EBD4FB', '#DFBAF8'],
      auroraOpacity: [0.5, 0.4, 0.3],
      tiles: [
        { bg: '#F5EAFD', fg: '#A626C9' },
        { bg: '#FFEBF3', fg: '#FF3E8A' },
        { bg: '#EDE6FD', fg: '#7B2FF7' },
        { bg: '#F5EAFD', fg: '#A626C9' }
      ],
      walletStyle: 'filled',
      walletCards: [
        { bg: '#FF3E8A', bg2: '#B033EA', fg: '#FFFFFF' },
        { bg: '#7B2FF7', bg2: '#A626C9', fg: '#FFFFFF' },
        { bg: '#B033EA', bg2: '#FF3E8A', fg: '#FFFFFF' },
        { bg: '#9122B0', bg2: '#7B2FF7', fg: '#FFFFFF' }
      ]
    },
    dark: {
      accent: '#D494FF',
      accentMuted: '#26162E',
      heroGradient: ['#F0367E', '#9E24D4', '#6E28E6'],
      heroGradientRich: ['#2E1038', '#5E1B73', '#9E24D4', '#F0367E'],
      heroOnGradient: '#FFFFFF',
      cardGlow: 'rgba(212, 148, 255, 0.3)',
      aurora: ['#5E1B73', '#9E24D4', '#2E1038'],
      auroraOpacity: [0.55, 0.35, 0.4],
      tiles: [
        { bg: '#26162E', fg: '#D494FF' },
        { bg: '#361524', fg: '#FF75AA' },
        { bg: '#22163A', fg: '#A57BF5' },
        { bg: '#26162E', fg: '#D494FF' }
      ],
      walletStyle: 'filled',
      walletCards: [
        { bg: '#A8255B', bg2: '#6E28E6', fg: '#FFFFFF' },
        { bg: '#541FB3', bg2: '#9E24D4', fg: '#FFFFFF' },
        { bg: '#7E1FB0', bg2: '#F0367E', fg: '#FFFFFF' },
        { bg: '#6E28E6', bg2: '#541FB3', fg: '#FFFFFF' }
      ]
    }
  },

  // "شەفەق" — Şefeq / Dawn. Terracotta through plum and gold. The default.
  sefeq: {
    nameKey: 'sefeq',
    light: {
      accent: '#C6603F',
      accentMuted: '#F6E4D8',
      heroGradient: ['#F0B48B', '#E8916A', '#C6603F'],
      heroGradientRich: ['#FDF0E4', '#F6CBA8', '#EFA860', '#D9723F'],
      heroOnGradient: '#3A2318',
      cardGlow: 'rgba(198, 96, 63, 0.22)',
      aurora: ['#F0B48B', '#F6CBAE', '#EEDFC8'],
      auroraOpacity: [0.5, 0.4, 0.3]
    },
    dark: {
      accent: '#E08A5B',
      accentMuted: '#3A2A22',
      heroGradient: ['#2B1A38', '#7A3B54', '#C6603F'],
      heroGradientRich: ['#2B1A38', '#7A3B54', '#C6603F', '#EFA860'],
      heroOnGradient: '#FFF9F1',
      cardGlow: 'rgba(224, 138, 91, 0.3)',
      aurora: ['#7A3B54', '#C6603F', '#3A2245'],
      auroraOpacity: [0.55, 0.32, 0.4]
    }
  },

  // "کانی" — Kanî / Wellspring. A cool sapphire-teal, fresh rather than warm.
  kani: {
    nameKey: 'kani',
    light: {
      accent: '#0E7C8C',
      accentMuted: '#E1F1F0',
      heroGradient: ['#8FD9D0', '#4FB8B0', '#0E7C8C'],
      heroGradientRich: ['#EAFBF7', '#BFEDE3', '#6FCEC2', '#1B93A0'],
      heroOnGradient: '#0A2E30',
      cardGlow: 'rgba(14, 124, 140, 0.22)',
      aurora: ['#8FD9D0', '#BFEDE3', '#DCEDEA'],
      auroraOpacity: [0.5, 0.4, 0.3]
    },
    dark: {
      accent: '#4FC7C2',
      accentMuted: '#16302F',
      heroGradient: ['#0B2A33', '#146B6E', '#1B93A0'],
      heroGradientRich: ['#0B2A33', '#146B6E', '#1B93A0', '#4FC7C2'],
      heroOnGradient: '#EAFBFA',
      cardGlow: 'rgba(79, 199, 194, 0.3)',
      aurora: ['#146B6E', '#1B93A0', '#0B2A33'],
      auroraOpacity: [0.55, 0.32, 0.4]
    }
  },

  // "زمرد" — Zumurrud / Emerald. A clear, confident green.
  zumurrud: {
    nameKey: 'zumurrud',
    light: {
      accent: '#0E9D63',
      accentMuted: '#DFF3E8',
      heroGradient: ['#8FE3B8', '#3FC088', '#0E9D63'],
      heroGradientRich: ['#EAFBF1', '#BFEDD7', '#6FCE9E', '#159D63'],
      heroOnGradient: '#0A2E1D',
      cardGlow: 'rgba(14, 157, 99, 0.22)',
      aurora: ['#8FE3B8', '#BFEDD7', '#DCEDE4'],
      auroraOpacity: [0.5, 0.4, 0.3]
    },
    dark: {
      accent: '#4FD696',
      accentMuted: '#163021',
      heroGradient: ['#0B2A1C', '#146B48', '#1BA06A'],
      heroGradientRich: ['#0B2A1C', '#146B48', '#1BA06A', '#4FD696'],
      heroOnGradient: '#EAFBF2',
      cardGlow: 'rgba(79, 214, 150, 0.3)',
      aurora: ['#146B48', '#1BA06A', '#0B2A1C'],
      auroraOpacity: [0.55, 0.32, 0.4]
    }
  },

  // "مۆر" — Mor / Violet.
  mor: {
    nameKey: 'mor',
    light: {
      accent: '#7854C7',
      accentMuted: '#EDE6F9',
      heroGradient: ['#C6B3EA', '#9B7DDB', '#7854C7'],
      heroGradientRich: ['#F5F0FC', '#E1D3F5', '#B79AE8', '#8863D4'],
      heroOnGradient: '#241A3A',
      cardGlow: 'rgba(120, 84, 199, 0.24)',
      aurora: ['#C6B3EA', '#D9CDF2', '#EDE6F9'],
      auroraOpacity: [0.5, 0.4, 0.3]
    },
    dark: {
      accent: '#A98FE8',
      accentMuted: '#2A2140',
      heroGradient: ['#1E1533', '#4A3470', '#7854C7'],
      heroGradientRich: ['#1E1533', '#4A3470', '#7854C7', '#A98FE8'],
      heroOnGradient: '#F5F0FC',
      cardGlow: 'rgba(169, 143, 232, 0.3)',
      aurora: ['#4A3470', '#7854C7', '#1E1533'],
      auroraOpacity: [0.55, 0.32, 0.4]
    }
  },

  // "دووڕەنگ" — Dureng / Two-tone. Electric indigo against coral, with
  // solid colour wallet cards. The header is dark enough for white ink in
  // both themes.
  dureng: {
    nameKey: 'dureng',
    light: {
      accent: '#5B3FE0',
      accentMuted: '#ECE8FC',
      heroGradient: ['#5B3FE0', '#A64FB0', '#FB6B4C'],
      heroGradientRich: ['#4B32D6', '#6E4DEA', '#E0578A', '#FB6B4C'],
      heroOnGradient: '#FFFFFF',
      cardGlow: 'rgba(91, 63, 224, 0.24)',
      aurora: ['#C9BEF7', '#FFD2C4', '#ECE8FC'],
      auroraOpacity: [0.45, 0.35, 0.3],
      tiles: [
        { bg: '#ECE8FC', fg: '#5B3FE0' },
        { bg: '#FFE6DE', fg: '#E2502E' },
        { bg: '#ECE8FC', fg: '#5B3FE0' },
        { bg: '#FFE6DE', fg: '#E2502E' }
      ],
      walletStyle: 'filled',
      walletCards: [
        { bg: '#5B3FE0', bg2: '#7A5CF0', fg: '#FFFFFF' },
        { bg: '#F2603F', bg2: '#FF8A5C', fg: '#FFFFFF' },
        { bg: '#3A2AA8', bg2: '#5B3FE0', fg: '#FFFFFF' },
        { bg: '#D9486A', bg2: '#F2603F', fg: '#FFFFFF' }
      ]
    },
    dark: {
      accent: '#9B87F5',
      accentMuted: '#2A2250',
      heroGradient: ['#2A1E7A', '#6B3FA8', '#E0573A'],
      heroGradientRich: ['#1B1452', '#3D2BB0', '#A5407A', '#E8603F'],
      heroOnGradient: '#FFFFFF',
      cardGlow: 'rgba(155, 135, 245, 0.3)',
      aurora: ['#3D2BB0', '#A5407A', '#1B1452'],
      auroraOpacity: [0.5, 0.3, 0.4],
      tiles: [
        { bg: '#2A2250', fg: '#A99AF7' },
        { bg: '#3A2019', fg: '#FF8E6E' },
        { bg: '#2A2250', fg: '#A99AF7' },
        { bg: '#3A2019', fg: '#FF8E6E' }
      ],
      walletStyle: 'filled',
      walletCards: [
        { bg: '#4B32D6', bg2: '#6E4DEA', fg: '#FFFFFF' },
        { bg: '#D9502F', bg2: '#F2703F', fg: '#FFFFFF' },
        { bg: '#33258F', bg2: '#4B32D6', fg: '#FFFFFF' },
        { bg: '#B8406C', bg2: '#D9502F', fg: '#FFFFFF' }
      ]
    }
  },

  // "بەنتۆی ڕەنگین" — Colourful bento. Four pastel tones — peach, sky, leaf,
  // lavender — one per tile, and a header that washes through all of them.
  bento: {
    nameKey: 'bento',
    light: {
      accent: '#C2410C',
      accentMuted: '#FFE3D6',
      // heroGradient fills buttons with white content (the tab bar's add
      // button, CTAs), so it stays saturated; the pastel wash is the header's.
      heroGradient: ['#F07A45', '#D9609A', '#7A5CD6'],
      heroGradientRich: ['#FFDCC8', '#F6D6F0', '#D8E2FB', '#CFEBDF'],
      heroOnGradient: '#2A1D2E',
      cardGlow: 'rgba(194, 65, 12, 0.2)',
      aurora: ['#FFD0B8', '#CDE6FA', '#D6EFCD'],
      auroraOpacity: [0.45, 0.4, 0.35],
      tiles: [
        { bg: '#FFE3D6', fg: '#C2410C' },
        { bg: '#DCEEFB', fg: '#1D6FB8' },
        { bg: '#E3F3DC', fg: '#2F7D32' },
        { bg: '#F1E3FB', fg: '#7A3FB0' }
      ],
      walletStyle: 'pastel'
    },
    dark: {
      accent: '#FF9A6E',
      accentMuted: '#3A2419',
      heroGradient: ['#E8743F', '#C2568F', '#6E55C9'],
      heroGradientRich: ['#3A2419', '#3A2244', '#22284A', '#183A33'],
      heroOnGradient: '#FFF4EC',
      cardGlow: 'rgba(255, 154, 110, 0.28)',
      aurora: ['#5A2E1E', '#18304A', '#1F3A20'],
      auroraOpacity: [0.5, 0.35, 0.35],
      tiles: [
        { bg: '#3A2419', fg: '#FF9A6E' },
        { bg: '#18304A', fg: '#7FC0F2' },
        { bg: '#1F3A20', fg: '#8FD18A' },
        { bg: '#33224A', fg: '#C8A0F0' }
      ],
      walletStyle: 'pastel'
    }
  },

  // "خۆرئاوا" — Sunset. Sabata warm sunset gradient: #FF8A00 -> #FF2E63.
  sunset: {
    nameKey: 'sunset',
    light: {
      accent: '#E0264E',
      accentMuted: '#FFECEE',
      heroGradient: ['#FF8A00', '#FF5A36', '#FF2E63'],
      heroGradientRich: ['#FF8A00', '#FF6622', '#FF4545', '#FF2E63'],
      heroOnGradient: '#FFFFFF',
      cardGlow: 'rgba(224, 38, 78, 0.22)',
      aurora: ['#FFECEE', '#FFE5D9', '#FFD8DC'],
      auroraOpacity: [0.5, 0.4, 0.3],
      tiles: [
        { bg: '#FFECEE', fg: '#E0264E' },
        { bg: '#FFF0E5', fg: '#FF8A00' },
        { bg: '#FFEBF0', fg: '#FF2E63' },
        { bg: '#FFECEE', fg: '#E0264E' }
      ],
      walletStyle: 'filled',
      walletCards: [
        { bg: '#FF8A00', bg2: '#FF5A36', fg: '#FFFFFF' },
        { bg: '#FF2E63', bg2: '#E0264E', fg: '#FFFFFF' },
        { bg: '#FF5A36', bg2: '#FF2E63', fg: '#FFFFFF' },
        { bg: '#D92045', bg2: '#FF8A00', fg: '#FFFFFF' }
      ]
    },
    dark: {
      accent: '#FF7A8F',
      accentMuted: '#2E151A',
      heroGradient: ['#FF7A00', '#D63B3B', '#F0265A'],
      heroGradientRich: ['#3A1208', '#6E2215', '#B82835', '#F0265A'],
      heroOnGradient: '#FFFFFF',
      cardGlow: 'rgba(255, 122, 143, 0.3)',
      aurora: ['#6E2215', '#B82835', '#2E151A'],
      auroraOpacity: [0.55, 0.35, 0.4],
      tiles: [
        { bg: '#2E151A', fg: '#FF7A8F' },
        { bg: '#361D12', fg: '#FFA64D' },
        { bg: '#33121A', fg: '#FF6B8B' },
        { bg: '#2E151A', fg: '#FF7A8F' }
      ],
      walletStyle: 'filled',
      walletCards: [
        { bg: '#B34A00', bg2: '#F0265A', fg: '#FFFFFF' },
        { bg: '#B81D43', bg2: '#E04A15', fg: '#FFFFFF' },
        { bg: '#C2352B', bg2: '#F0265A', fg: '#FFFFFF' },
        { bg: '#8F1532', bg2: '#B34A00', fg: '#FFFFFF' }
      ]
    }
  },

  // "زەریا" — Ocean. Sabata turquoise & ocean blue: #00D2B4 -> #0A6CFF.
  ocean: {
    nameKey: 'ocean',
    light: {
      accent: '#0A5FE0',
      accentMuted: '#E8F1FF',
      heroGradient: ['#00D2B4', '#0099DD', '#0A6CFF'],
      heroGradientRich: ['#00D2B4', '#00B8D4', '#0084FF', '#0A6CFF'],
      heroOnGradient: '#FFFFFF',
      cardGlow: 'rgba(10, 95, 224, 0.22)',
      aurora: ['#E8F1FF', '#E0F8F5', '#D2EAFF'],
      auroraOpacity: [0.5, 0.4, 0.3],
      tiles: [
        { bg: '#E8F1FF', fg: '#0A5FE0' },
        { bg: '#E0F9F5', fg: '#00A891' },
        { bg: '#E3F2FD', fg: '#0A6CFF' },
        { bg: '#E8F1FF', fg: '#0A5FE0' }
      ],
      walletStyle: 'filled',
      walletCards: [
        { bg: '#00D2B4', bg2: '#0099DD', fg: '#FFFFFF' },
        { bg: '#0A6CFF', bg2: '#0A5FE0', fg: '#FFFFFF' },
        { bg: '#0099DD', bg2: '#0A6CFF', fg: '#FFFFFF' },
        { bg: '#084AB3', bg2: '#00D2B4', fg: '#FFFFFF' }
      ]
    },
    dark: {
      accent: '#6FAEFF',
      accentMuted: '#132033',
      heroGradient: ['#00BFA3', '#007ACC', '#0A5FE6'],
      heroGradientRich: ['#061A26', '#0E364A', '#0A5099', '#0A5FE6'],
      heroOnGradient: '#FFFFFF',
      cardGlow: 'rgba(111, 174, 255, 0.3)',
      aurora: ['#0E364A', '#0A5099', '#132033'],
      auroraOpacity: [0.55, 0.35, 0.4],
      tiles: [
        { bg: '#132033', fg: '#6FAEFF' },
        { bg: '#0F2B28', fg: '#4DE6D1' },
        { bg: '#13263E', fg: '#54A0FF' },
        { bg: '#132033', fg: '#6FAEFF' }
      ],
      walletStyle: 'filled',
      walletCards: [
        { bg: '#008572', bg2: '#0A5FE6', fg: '#FFFFFF' },
        { bg: '#074BB3', bg2: '#0099CC', fg: '#FFFFFF' },
        { bg: '#006E99', bg2: '#0A5FE6', fg: '#FFFFFF' },
        { bg: '#053785', bg2: '#008572', fg: '#FFFFFF' }
      ]
    }
  },

  // "لیمۆیی" — Lemon. Sabata bright yellow/gold: #FFE44D -> #FF9900.
  lemon: {
    nameKey: 'lemon',
    light: {
      accent: '#D48800',
      accentMuted: '#FFF8D6',
      heroGradient: ['#FFE44D', '#FFC400', '#FF9900'],
      heroGradientRich: ['#FFF485', '#FFE44D', '#FFC400', '#FF9900'],
      heroOnGradient: '#16130F',
      cardGlow: 'rgba(212, 136, 0, 0.22)',
      aurora: ['#FFF8D6', '#FFF2B8', '#FFE899'],
      auroraOpacity: [0.5, 0.4, 0.3],
      tiles: [
        { bg: '#FFF8D6', fg: '#B37200' },
        { bg: '#FFF3C2', fg: '#D48800' },
        { bg: '#FFFDE8', fg: '#8C5B00' },
        { bg: '#FFF8D6', fg: '#B37200' }
      ],
      walletStyle: 'filled',
      walletCards: [
        { bg: '#FFC400', bg2: '#FF9900', fg: '#16130F' },
        { bg: '#FFE44D', bg2: '#FFC400', fg: '#16130F' },
        { bg: '#FF9900', bg2: '#E68000', fg: '#FFFFFF' },
        { bg: '#E68000', bg2: '#FFC400', fg: '#FFFFFF' }
      ]
    },
    dark: {
      accent: '#FFD84D',
      accentMuted: '#2B2612',
      heroGradient: ['#FFDD33', '#E6A800', '#CC7A00'],
      heroGradientRich: ['#2B2308', '#544208', '#997300', '#FFDD33'],
      heroOnGradient: '#16130F',
      cardGlow: 'rgba(255, 216, 77, 0.3)',
      aurora: ['#544208', '#997300', '#2B2612'],
      auroraOpacity: [0.55, 0.35, 0.4],
      tiles: [
        { bg: '#2B2612', fg: '#FFD84D' },
        { bg: '#362E12', fg: '#FFE27A' },
        { bg: '#2B220B', fg: '#FFCC33' },
        { bg: '#2B2612', fg: '#FFD84D' }
      ],
      walletStyle: 'filled',
      walletCards: [
        { bg: '#B38300', bg2: '#E6A800', fg: '#FFFFFF' },
        { bg: '#995C00', bg2: '#CC7A00', fg: '#FFFFFF' },
        { bg: '#CC8800', bg2: '#FFDD33', fg: '#16130F' },
        { bg: '#804C00', bg2: '#B38300', fg: '#FFFFFF' }
      ]
    }
  }
};

export const DEFAULT_SCHEME: ColorSchemeId = 'berry';

/** Relative luminance (0–1) of a #RRGGBB colour. */
export function luminance(hex: string): number {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return 0;
  const n = parseInt(m[1], 16);
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return (
    0.2126 * channel((n >> 16) & 0xff) +
    0.7152 * channel((n >> 8) & 0xff) +
    0.0722 * channel(n & 0xff)
  );
}

export function isLightColor(hex: string): boolean {
  return luminance(hex) > 0.5;
}

export function getThemeColors(scheme: ColorSchemeId, isDark: boolean): ColorTheme {
  const def = COLOR_SCHEMES[scheme] || COLOR_SCHEMES[DEFAULT_SCHEME];
  const base = isDark ? baseDark : baseLight;
  const accentLayer = isDark ? def.dark : def.light;
  const accentTile: SchemeTile = { bg: accentLayer.accentMuted, fg: accentLayer.accent };
  const tiles: TileSet = accentLayer.tiles ?? [accentTile, accentTile, accentTile, accentTile];
  return {
    ...base,
    ...accentLayer,
    tiles,
    walletStyle: accentLayer.walletStyle ?? 'plain',
    walletCards: accentLayer.walletCards ?? tiles,
    heroIsDark: isLightColor(accentLayer.heroOnGradient),
    isDark,
    blurTint: isDark ? 'dark' : 'light'
  };
}

// Kept for the handful of places that render before ThemeProvider (and
// AsyncStorage) can possibly have resolved a chosen scheme — the splash
// screen, the crash boundary — so they still get a real, on-brand palette
// rather than needing their own fallback.
export const lightColors: ColorTheme = getThemeColors(DEFAULT_SCHEME, false);
export const darkColors: ColorTheme = getThemeColors(DEFAULT_SCHEME, true);

export const CATEGORY_PALETTE = [
  '#EF4444', // Red
  '#F97316', // Orange
  '#F59E0B', // Amber
  '#84CC16', // Lime
  '#10B981', // Emerald
  '#06B6D4', // Cyan
  '#0EA5E9', // Sky
  '#3B82F6', // Blue
  '#6366F1', // Indigo
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#F43F5E', // Rose
  '#14B8A6', // Teal
  '#64748B', // Slate
  '#78350F', // Warm Brown
  '#475569'  // Charcoal
];
