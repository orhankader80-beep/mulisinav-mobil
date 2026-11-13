// Design tokens for Mulisınav (neo-brutalist, light only). Keys match the
// "color" block of /app/design_guidelines.json.
import { useMemo } from "react";
import { Appearance, StyleSheet, useColorScheme } from "react-native";

export type ColorScheme = "light" | "dark";

const light = {
  surface: "#FFF6E9",
  onSurface: "#16130F",
  surfaceSecondary: "#FFFFFF",
  onSurfaceSecondary: "#16130F",
  surfaceTertiary: "#F2E8DA",
  onSurfaceTertiary: "#16130F",
  surfaceInverse: "#16130F",
  onSurfaceInverse: "#FFFFFF",
  muted: "#6E6A66",
  mutedInverse: "#B9B1A6",

  brand: "#FFD43B",
  onBrand: "#16130F",
  brandPrimary: "#FFD43B",
  onBrandPrimary: "#16130F",
  brandSecondary: "#2D5BFF",
  onBrandSecondary: "#FFFFFF",
  brandTertiary: "#FFD43B",
  onBrandTertiary: "#16130F",

  success: "#2ECC71",
  onSuccess: "#16130F",
  warning: "#FFD43B",
  onWarning: "#16130F",
  error: "#E74C3C",
  onError: "#FFFFFF",
  info: "#2D5BFF",
  onInfo: "#FFFFFF",

  border: "#16130F",
  borderStrong: "#16130F",
  divider: "#16130F",
};

export type ThemeColors = typeof light;

export const defaultScheme = "light" satisfies ColorScheme;

export const themes: { light: ThemeColors; dark?: ThemeColors } = { light };

export const colors = light;

export function setColorScheme(scheme: ColorScheme | null) {
  Appearance.setColorScheme?.(scheme ?? "unspecified");
}

setColorScheme?.(themes.dark ? null : defaultScheme);

export function useTheme(): { scheme: ColorScheme; colors: ThemeColors } {
  const system = useColorScheme();
  const scheme: ColorScheme = (system === "light" || system === "dark") && themes[system] ? system : defaultScheme;
  return { scheme, colors: themes[scheme] ?? themes.light };
}

export function makeStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (colors: ThemeColors) => T & StyleSheet.NamedStyles<any>,
): () => T {
  return function useStyles(): T {
    const { colors } = useTheme();
    return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
  };
}

export const fonts = {
  display: "Bricolage-ExtraBold",
  displayBold: "Bricolage-Bold",
  body: "Onest-Regular",
  bodyMedium: "Onest-Medium",
  bodySemi: "Onest-SemiBold",
  bodyBold: "Onest-Bold",
  mono: "JetBrainsMono-Bold",
  monoMedium: "JetBrainsMono-Medium",
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 40 };
export const radius = { sm: 0, md: 4, lg: 8, pill: 999 };
export const BORDER = 2.5;
