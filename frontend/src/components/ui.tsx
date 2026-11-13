import { type ReactNode } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Lucide, type LucideIconName } from "@react-native-vector-icons/lucide";

import { BORDER, fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

export const Icon = Lucide;
export type IconName = LucideIconName;

const SHADOW = 4;

// Card with the web app's hard offset ("brut") shadow.
export function BrutBox({
  children,
  style,
  bg,
  offset = SHADOW,
  testID,
  containerStyle,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  bg?: string;
  offset?: number;
  testID?: string;
  containerStyle?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  return (
    <View style={[{ marginRight: offset, marginBottom: offset }, containerStyle]} testID={testID}>
      <View style={[StyleSheet.absoluteFill, { top: offset, left: offset, right: -offset, bottom: -offset, backgroundColor: colors.border, borderRadius: radius.lg }]} />
      <View style={[{ backgroundColor: bg ?? colors.surfaceSecondary, borderWidth: BORDER, borderColor: colors.border, borderRadius: radius.lg }, style]}>{children}</View>
    </View>
  );
}

type Variant = "primary" | "secondary" | "dark" | "light" | "danger";

export function BrutButton({
  label,
  onPress,
  variant = "primary",
  icon,
  loading,
  disabled,
  testID,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const styles = useButtonStyles();
  const press = useSharedValue(0);
  const anim = useAnimatedStyle(() => ({ transform: [{ translateX: press.value * SHADOW }, { translateY: press.value * SHADOW }] }));
  const palette: Record<Variant, [string, string]> = {
    primary: [colors.brandPrimary, colors.onBrandPrimary],
    secondary: [colors.brandSecondary, colors.onBrandSecondary],
    dark: [colors.surfaceInverse, colors.onSurfaceInverse],
    light: [colors.surfaceSecondary, colors.onSurfaceSecondary],
    danger: [colors.error, colors.onError],
  };
  const [bg, fg] = palette[variant];
  const off = disabled || loading;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      disabled={off}
      onPressIn={() => (press.value = withTiming(1, { duration: 80 }))}
      onPressOut={() => (press.value = withTiming(0, { duration: 80 }))}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress();
      }}
      style={[styles.wrap, style, off && styles.off]}
    >
      <View style={[styles.shadow, { backgroundColor: colors.border }]} />
      <Animated.View style={[styles.btn, { backgroundColor: bg }, anim]}>
        {loading ? <ActivityIndicator color={fg} /> : icon ? <Icon name={icon} size={20} color={fg} /> : null}
        <Text style={[styles.label, { color: fg }]} numberOfLines={1}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const useButtonStyles = makeStyles((c) => ({
  wrap: { marginRight: SHADOW, marginBottom: SHADOW },
  off: { opacity: 0.6 },
  shadow: { position: "absolute", top: SHADOW, left: SHADOW, right: -SHADOW, bottom: -SHADOW, borderRadius: radius.pill },
  btn: {
    minHeight: 54,
    borderRadius: radius.pill,
    borderWidth: BORDER,
    borderColor: c.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  label: { fontFamily: fonts.bodyBold, fontSize: 16 },
}));

export function Eyebrow({ children, bg, style, testID }: { children: ReactNode; bg?: string; style?: StyleProp<ViewStyle>; testID?: string }) {
  const { colors } = useTheme();
  return (
    <View testID={testID} style={[{ alignSelf: "flex-start", backgroundColor: bg ?? colors.brandPrimary, borderWidth: 2, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 }, style]}>
      <Text style={{ fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1.2, color: colors.onSurface, textTransform: "uppercase" }}>{children}</Text>
    </View>
  );
}

export function Label({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const { colors } = useTheme();
  return <Text style={[{ fontFamily: fonts.mono, fontSize: 12, letterSpacing: 1.4, textTransform: "uppercase", color: colors.onSurface, marginBottom: spacing.sm }, style]}>{children}</Text>;
}

// Bottom sheet style confirmation used instead of system alerts.
export function ConfirmSheet({
  visible,
  title,
  message,
  confirmLabel,
  onConfirm,
  onClose,
  loading,
  testID,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
  loading?: boolean;
  testID?: string;
}) {
  const insets = useSafeAreaInsets();
  const styles = useSheetStyles();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} testID={`${testID}-backdrop`} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.md }]} testID={testID}>
        <View style={styles.handle} />
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.msg}>{message}</Text>
        <View style={styles.row}>
          <BrutButton label="Vazgeç" variant="light" onPress={onClose} style={styles.flex} testID={`${testID}-cancel`} />
          <BrutButton label={confirmLabel} variant="danger" onPress={onConfirm} loading={loading} style={styles.flex} testID={`${testID}-confirm`} />
        </View>
      </View>
    </Modal>
  );
}

const useSheetStyles = makeStyles((c) => ({
  backdrop: { flex: 1, backgroundColor: "rgba(22,19,15,0.55)" },
  sheet: { backgroundColor: c.surface, borderTopWidth: BORDER, borderColor: c.border, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.lg, gap: spacing.sm },
  handle: { alignSelf: "center", width: 48, height: 5, borderRadius: 3, backgroundColor: c.border, marginBottom: spacing.sm },
  title: { fontFamily: fonts.display, fontSize: 24, color: c.onSurface },
  msg: { fontFamily: fonts.body, fontSize: 15, color: c.muted, marginBottom: spacing.md },
  row: { flexDirection: "row", gap: spacing.sm },
  flex: { flex: 1 },
}));
