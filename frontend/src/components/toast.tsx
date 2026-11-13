import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/src/components/ui";
import { BORDER, fonts, radius, spacing, useTheme } from "@/src/theme";

type Kind = "success" | "error" | "info";
type ToastState = { id: number; kind: Kind; text: string } | null;

const ToastContext = createContext<(kind: Kind, text: string) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const show = useCallback((kind: Kind, text: string) => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ id: Date.now(), kind, text });
    timer.current = setTimeout(() => setToast(null), 3200);
  }, []);

  const bg = toast?.kind === "success" ? colors.success : toast?.kind === "error" ? colors.error : colors.brandSecondary;
  const fg = toast?.kind === "success" ? colors.onSuccess : toast?.kind === "error" ? colors.onError : colors.onBrandSecondary;

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <Animated.View key={toast.id} entering={FadeInUp.duration(180)} exiting={FadeOutUp.duration(150)} pointerEvents="none" style={[styles.wrap, { top: insets.top + spacing.sm }]}>
          <View testID="app-toast" style={[styles.toast, { backgroundColor: bg, borderColor: colors.border }]}>
            <Icon name={toast.kind === "success" ? "circle-check" : toast.kind === "error" ? "circle-alert" : "info"} size={20} color={fg} />
            <Text style={[styles.text, { color: fg }]}>{toast.text}</Text>
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: spacing.md, right: spacing.md, zIndex: 100, elevation: 100 },
  toast: { flexDirection: "row", alignItems: "center", gap: spacing.sm, borderWidth: BORDER, borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: 12 },
  text: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 14 },
});
