import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/src/auth";
import { BrutBox, BrutButton, Eyebrow, Icon, Label } from "@/src/components/ui";
import { useToast } from "@/src/components/toast";
import { BORDER, fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

type Mode = "login" | "register";

export default function Login() {
  const { user, signIn, offline, retry } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { colors } = useTheme();
  const [mode, setMode] = useState<Mode>("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) return <Redirect href="/(tabs)" />;

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setError("");
    if (!form.email.trim() || !form.password || (mode === "register" && !form.name.trim())) {
      setError("Lütfen tüm alanları doldur.");
      return;
    }
    setLoading(true);
    try {
      const body = mode === "register" ? { name: form.name.trim(), email: form.email.trim(), password: form.password } : { email: form.email.trim(), password: form.password };
      const u = await signIn(mode, body);
      toast("success", mode === "register" ? "Hesabın oluşturuldu!" : `Tekrar hoş geldin${u?.name ? `, ${u.name}` : ""}!`);
      router.replace("/(tabs)");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bir şeyler ters gitti.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <KeyboardAwareScrollView
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.lg }]}
      >
        <Animated.View entering={FadeInDown.duration(300)}>
          <View style={styles.logoRow}>
            <View style={styles.logoMark}>
              <Icon name="notebook-pen" size={22} color={colors.onBrandPrimary} />
            </View>
            <Text style={styles.logo} testID="login-logo">
              Mulisınav
            </Text>
          </View>
          <Eyebrow style={{ marginTop: spacing.lg }}>5–12. sınıf · yapay zekâ</Eyebrow>
          <Text style={styles.h1}>Yazılılara{"\n"}akıllı çalış.</Text>
          <Text style={styles.sub}>Web’deki hesabınla giriş yap; yazılıların ve notların burada da seni bekliyor.</Text>
        </Animated.View>

        {offline && (
          <Pressable style={styles.offline} onPress={retry} testID="login-offline-retry">
            <Icon name="circle-alert" size={18} color={colors.onError} />
            <Text style={styles.offlineText}>Sunucuya ulaşılamadı. Tekrar denemek için dokun.</Text>
          </Pressable>
        )}

        <Animated.View entering={FadeInDown.duration(300).delay(80)}>
          <BrutBox style={styles.card} testID="auth-card">
            <View style={styles.tabs}>
              {(
                [
                  ["login", "Giriş yap"],
                  ["register", "Kayıt ol"],
                ] as [Mode, string][]
              ).map(([id, label]) => (
                <Pressable
                  key={id}
                  testID={`auth-tab-${id}`}
                  onPress={() => {
                    setMode(id);
                    setError("");
                  }}
                  style={[styles.tab, mode === id && styles.tabActive]}
                >
                  <Text style={[styles.tabText, mode === id && styles.tabTextActive]}>{label}</Text>
                </Pressable>
              ))}
            </View>

            {mode === "register" && (
              <View>
                <Label>Adın</Label>
                <TextInput testID="auth-name-input" style={styles.input} value={form.name} onChangeText={set("name")} placeholder="Ör. Elif" placeholderTextColor={colors.muted} autoComplete="name" returnKeyType="next" />
              </View>
            )}
            <View>
              <Label>E-posta</Label>
              <TextInput
                testID="auth-email-input"
                style={styles.input}
                value={form.email}
                onChangeText={set("email")}
                placeholder="ornek@mail.com"
                placeholderTextColor={colors.muted}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                returnKeyType="next"
              />
            </View>
            <View>
              <Label>Şifre</Label>
              <View>
                <TextInput
                  testID="auth-password-input"
                  style={[styles.input, { paddingRight: 52 }]}
                  value={form.password}
                  onChangeText={set("password")}
                  placeholder="En az 6 karakter"
                  placeholderTextColor={colors.muted}
                  secureTextEntry={!showPw}
                  autoCapitalize="none"
                  returnKeyType="go"
                  onSubmitEditing={submit}
                />
                <Pressable style={styles.eye} onPress={() => setShowPw((s) => !s)} testID="auth-password-toggle" hitSlop={8}>
                  <Icon name={showPw ? "eye-off" : "eye"} size={20} color={colors.onSurface} />
                </Pressable>
              </View>
            </View>

            {!!error && (
              <Text style={styles.error} testID="auth-error">
                {error}
              </Text>
            )}

            <BrutButton testID="auth-submit-button" label={mode === "login" ? "Giriş yap" : "Hesap oluştur"} onPress={submit} loading={loading} icon={mode === "login" ? "log-out" : "sparkles"} />
          </BrutBox>
        </Animated.View>
      </KeyboardAwareScrollView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  content: { paddingHorizontal: spacing.lg, gap: spacing.lg },
  logoRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  logoMark: { width: 40, height: 40, borderRadius: radius.lg, borderWidth: BORDER, borderColor: c.border, backgroundColor: c.brandPrimary, alignItems: "center", justifyContent: "center" },
  logo: { fontFamily: fonts.display, fontSize: 26, color: c.onSurface },
  h1: { fontFamily: fonts.display, fontSize: 44, lineHeight: 46, color: c.onSurface, marginTop: spacing.md, letterSpacing: -1 },
  sub: { fontFamily: fonts.body, fontSize: 16, lineHeight: 23, color: c.muted, marginTop: spacing.sm },
  card: { padding: spacing.lg, gap: spacing.md },
  tabs: { flexDirection: "row", borderWidth: BORDER, borderColor: c.border, borderRadius: radius.pill, padding: 4, backgroundColor: c.surface },
  tab: { flex: 1, minHeight: 44, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  tabActive: { backgroundColor: c.surfaceInverse },
  tabText: { fontFamily: fonts.bodyBold, fontSize: 15, color: c.onSurface },
  tabTextActive: { color: c.onSurfaceInverse },
  input: { height: 52, borderWidth: BORDER, borderColor: c.border, borderRadius: radius.lg, paddingHorizontal: spacing.md, fontFamily: fonts.bodySemi, fontSize: 16, color: c.onSurface, backgroundColor: c.surfaceSecondary },
  eye: { position: "absolute", right: 6, top: 4, width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  error: { fontFamily: fonts.bodySemi, fontSize: 14, color: c.error },
  offline: { flexDirection: "row", gap: spacing.sm, alignItems: "center", backgroundColor: c.error, borderWidth: BORDER, borderColor: c.border, borderRadius: radius.lg, padding: spacing.md },
  offlineText: { flex: 1, fontFamily: fonts.bodySemi, color: c.onError },
}));
