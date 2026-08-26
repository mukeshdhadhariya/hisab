// constants/colors.js

const createTheme = ({
  name,
  icon,
  isDark = false,
  primary,
  background,
  surface,
  surfaceElevated,
  text,
  textSecondary,
  textMuted,
  border,
  expense,
  income,
}) => ({
  name,
  icon,
  isDark,

  // Brand
  primary,

  // Backgrounds
  background,
  surface,
  surfaceElevated,

  // Typography
  text,
  textSecondary,
  textMuted,
  textLight: textMuted,

  // Borders
  border,

  // Transaction colors
  expense,
  income,

  // Common
  white: "#FFFFFF",
  black: "#000000",

  // Semantic
  textOnPrimary: "#FFFFFF",

  // Soft backgrounds / Tints
  primarySoft: `${primary}1E`,
  expenseSoft: `${expense}1E`,
  incomeSoft: `${income}1E`,
  expenseLight: `${expense}1A`,
  incomeLight: `${income}1A`,

  // Status bar
  statusBar: isDark ? "light" : "dark",

  // Shadow
  shadow: isDark ? "#000000" : "#000000",
});

// ==========================================================
// COFFEE
// ==========================================================

const coffeeTheme = createTheme({
  name: "Coffee",
  icon: "☕",

  primary: "#8B593E",
  background: "#FFF8F3",
  surface: "#FFFFFF",
  surfaceElevated: "#FFFFFF",

  text: "#2F211A",
  textSecondary: "#6F584B",
  textMuted: "#9A8478",

  border: "#E8D8C8",

  expense: "#D64545",
  income: "#29965A",
});

// ==========================================================
// FOREST
// ==========================================================

const forestTheme = createTheme({
  name: "Forest",
  icon: "🌿",

  primary: "#2E7D32",
  background: "#F4FAF4",
  surface: "#FFFFFF",
  surfaceElevated: "#FFFFFF",

  text: "#173B1B",
  textSecondary: "#416146",
  textMuted: "#729275",

  border: "#D4E5D5",

  expense: "#C62828",
  income: "#2E8B57",
});

// ==========================================================
// PURPLE
// ==========================================================

const purpleTheme = createTheme({
  name: "Purple",
  icon: "💜",

  primary: "#6A1B9A",
  background: "#FAF5FC",
  surface: "#FFFFFF",
  surfaceElevated: "#FFFFFF",

  text: "#321044",
  textSecondary: "#684A76",
  textMuted: "#9A7BA8",

  border: "#E5D7EA",

  expense: "#D32F2F",
  income: "#388E3C",
});

// ==========================================================
// OCEAN
// ==========================================================

const oceanTheme = createTheme({
  name: "Ocean",
  icon: "🌊",

  primary: "#0277BD",
  background: "#F2FAFD",
  surface: "#FFFFFF",
  surfaceElevated: "#FFFFFF",

  text: "#073B4C",
  textSecondary: "#426775",
  textMuted: "#7896A2",

  border: "#D5E9F0",

  expense: "#D94A4A",
  income: "#239B8B",
});

// ==========================================================
// LIGHT — CLASSIC
// ==========================================================

const lightTheme = createTheme({
  name: "Light",
  icon: "☀️",

  // Brand / Actions
  primary: "#4F46E5",

  // App surfaces
  background: "#F7F7F8",
  surface: "#FFFFFF",
  surfaceElevated: "#FFFFFF",

  // Typography
  text: "#18181B",
  textSecondary: "#52525B",
  textMuted: "#8A8A93",

  // Borders / dividers
  border: "#E4E4E7",

  // Financial semantics
  expense: "#DC2626",
  income: "#15803D",
});


// ==========================================================
// DARK — MIDNIGHT
// ==========================================================

const darkTheme = createTheme({
  name: "Dark",
  icon: "🌙",
  isDark: true,

  // Brand / Actions
  primary: "#818CF8",

  // App surfaces
  background: "#0D0E12",
  surface: "#15171D",
  surfaceElevated: "#1D2028",

  // Typography
  text: "#F4F4F5",
  textSecondary: "#A1A1AA",
  textMuted: "#71717A",

  // Borders / dividers
  border: "#2A2D35",

  // Financial semantics
  expense: "#F87171",
  income: "#4ADE80",
});

// ==========================================================
// EXPORT
// ==========================================================

export const THEMES = {
  // coffee: coffeeTheme,
  // forest: forestTheme,
  // purple: purpleTheme,
  // ocean: oceanTheme,
  light: lightTheme,
  dark: darkTheme,
};

export const THEME_KEYS = Object.keys(THEMES);

export const COLORS = THEMES.light;