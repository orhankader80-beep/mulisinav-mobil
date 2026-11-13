import { useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import Animated, { Easing, FadeInDown, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { generateExam, type GenerateForm } from "@/src/api";
import { useAuth } from "@/src/auth";
import { BrutBox, BrutButton, Icon, Label } from "@/src/components/ui";
import { useToast } from "@/src/components/toast";
import { GRADES, LEVELS, subjectsForGrade, TYPES } from "@/src/exam";
import { usesNativeTabs } from "@/src/navigation";
import { BORDER, fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

const GEN_IMG =
  "https://images.unsplash.com/photo-1737644467636-6b0053476bb2?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85&w=800";

export default function NewExam() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const styles = useStyles();
  const { colors } = useTheme();
  const bottomChrome = usesNativeTabs ? insets.bottom : 0;
  const [form, setForm] = useState<GenerateForm>({ grade: 7, subject: "Matematik", topic: "", difficulty: "Orta", qtype: "Karma" });
  const [loading, setLoading] = useState(false);
  const [count, setCount] = useState(0);
  const [error, setError] = useState("");

  const setGrade = (g: number) => {
    const list = subjectsForGrade(g);
    setForm((f) => ({ ...f, grade: g, subject: list.includes(f.subject) ? f.subject : list[0] }));
  };

  const generate = async () => {
    setError("");
    setCount(0);
    setLoading(true);
    try {
      const id = await generateExam(form, setCount);
      qc.invalidateQueries({ queryKey: ["exams"] });
      setLoading(false);
      toast("success", "Yazılın Yazılılarım'a kaydedildi.");
      router.push(`/exam/${id}`);
    } catch (e) {
      setLoading(false);
      setError(e instanceof Error ? e.message : "Bir şeyler ters gitti.");
    }
  };

  const firstName = user ? user.name?.split(" ")[0] : "";

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.brand} testID="home-brand">
          Mulisınav
        </Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{form.grade}. SINIF</Text>
        </View>
      </View>
      <KeyboardAwareScrollView bottomOffset={24} keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { paddingBottom: bottomChrome + spacing.lg }]}>
        <Animated.View entering={FadeInDown.duration(300)}>
          <Text style={styles.hello} testID="home-greeting">
            Merhaba{firstName ? `, ${firstName}` : ""}!
          </Text>
          <Text style={styles.h1}>Deneme yazılını{"\n"}saniyeler içinde hazırla.</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(300).delay(60)}>
          <BrutBox style={styles.card} testID="generate-form">
            <View>
              <Label>Sınıf</Label>
              <View style={styles.grid}>
                {GRADES.map((g) => {
                  const on = form.grade === g;
                  return (
                    <Pressable key={g} testID={`grade-option-${g}`} onPress={() => setGrade(g)} style={[styles.gradeCell, on && styles.cellOn]}>
                      <Text style={[styles.gradeText, on && styles.cellTextOn]}>{g}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View>
              <Label>Ders</Label>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow} contentContainerStyle={styles.chipRowContent}>
                {subjectsForGrade(form.grade).map((s) => {
                  const on = form.subject === s;
                  return (
                    <Pressable key={s} testID={`subject-option-${s}`} onPress={() => setForm((f) => ({ ...f, subject: s }))} style={[styles.chip, on && styles.chipOn]}>
                      <Text style={[styles.chipText, on && styles.chipTextOn]}>{s}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            <View>
              <Label>Konu (isteğe bağlı)</Label>
              <TextInput
                testID="topic-input"
                style={styles.input}
                value={form.topic}
                onChangeText={(t) => setForm((f) => ({ ...f, topic: t }))}
                placeholder="Ör. Kesirler, Hücre, Osmanlı…"
                placeholderTextColor={colors.muted}
                returnKeyType="done"
              />
            </View>

            <Segmented label="Zorluk" items={LEVELS} value={form.difficulty} onChange={(v) => setForm((f) => ({ ...f, difficulty: v }))} testPrefix="difficulty" />
            <Segmented label="Soru tipi" items={TYPES} value={form.qtype} onChange={(v) => setForm((f) => ({ ...f, qtype: v }))} testPrefix="qtype" />

            {!!error && (
              <View style={styles.errorBox} testID="generate-error">
                <Icon name="circle-alert" size={18} color={colors.onError} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <BrutButton testID="generate-button" label={error ? "Tekrar dene" : "Yazılı oluştur"} icon="sparkles" onPress={generate} loading={loading} />
          </BrutBox>
        </Animated.View>

        <View style={styles.tip}>
          <Icon name="info" size={18} color={colors.onSurface} />
          <Text style={styles.tipText}>Yazılın oluşunca otomatik olarak Yazılılarım’a kaydedilir. Cevaplarını yazıp notunu hemen öğrenebilirsin.</Text>
        </View>
      </KeyboardAwareScrollView>

      <Generating visible={loading} count={count} subject={form.subject} grade={form.grade} />
    </View>
  );
}

function Segmented({ label, items, value, onChange, testPrefix }: { label: string; items: string[]; value: string; onChange: (v: string) => void; testPrefix: string }) {
  const styles = useStyles();
  return (
    <View>
      <Label>{label}</Label>
      <View style={styles.segment}>
        {items.map((it, i) => {
          const on = value === it;
          return (
            <Pressable key={it} testID={`${testPrefix}-option-${it}`} onPress={() => onChange(it)} style={[styles.segItem, i > 0 && styles.segDivider, on && styles.cellOn]}>
              <Text style={[styles.segText, on && styles.cellTextOn]} numberOfLines={1}>
                {it}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const STEPS = ["Konuyu inceliyorum", "Soruları yazıyorum", "Cevap anahtarını hazırlıyorum"];

function Generating({ visible, count, subject, grade }: { visible: boolean; count: number; subject: string; grade: number }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const rot = useSharedValue(0);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!visible) return;
    setStep(0);
    rot.value = withRepeat(withTiming(1, { duration: 600, easing: Easing.linear }), -1, true);
    const t = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 9000);
    return () => clearInterval(t);
  }, [visible, rot]);

  const pencil = useAnimatedStyle(() => ({ transform: [{ rotate: `${-12 + rot.value * 24}deg` }, { translateX: -8 + rot.value * 16 }] }));
  const current = count > 0 ? 1 : step;

  return (
    <Modal visible={visible} animationType="fade" transparent={false} statusBarTranslucent onRequestClose={() => {}}>
      <View style={[styles.genRoot, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl }]} testID="generating-overlay">
        <Image source={{ uri: GEN_IMG }} style={styles.genImg} contentFit="cover" />
        <Animated.View style={[styles.pencil, pencil]}>
          <Icon name="notebook-pen" size={40} color={colors.onBrandPrimary} />
        </Animated.View>
        <Text style={styles.genTitle}>Yazılın hazırlanıyor…</Text>
        <Text style={styles.genSub}>
          {grade}. sınıf {subject} · genelde 20–60 saniye sürer
        </Text>
        <View style={styles.genCount}>
          <Text style={styles.genCountNum} testID="generating-count">
            {count}
          </Text>
          <Text style={styles.genCountLabel}>SORU YAZILDI</Text>
        </View>
        <View style={styles.steps}>
          {STEPS.map((s, i) => (
            <View key={s} style={styles.stepRow}>
              <Icon name={i < current ? "circle-check" : i === current ? "loader-circle" : "circle-minus"} size={20} color={i <= current ? colors.brandPrimary : colors.mutedInverse} />
              <Text style={[styles.stepText, i > current && { color: colors.mutedInverse }]}>{s}</Text>
            </View>
          ))}
        </View>
      </View>
    </Modal>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingBottom: spacing.md, borderBottomWidth: BORDER, borderColor: c.border, backgroundColor: c.surface },
  brand: { fontFamily: fonts.display, fontSize: 24, color: c.onSurface },
  badge: { backgroundColor: c.brandSecondary, borderWidth: 2, borderColor: c.border, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontFamily: fonts.mono, fontSize: 11, color: c.onBrandSecondary, letterSpacing: 1 },
  content: { padding: spacing.lg, gap: spacing.lg },
  hello: { fontFamily: fonts.mono, fontSize: 13, letterSpacing: 1.4, textTransform: "uppercase", color: c.onSurface },
  h1: { fontFamily: fonts.display, fontSize: 32, lineHeight: 35, letterSpacing: -0.8, color: c.onSurface, marginTop: spacing.sm },
  card: { padding: spacing.md, gap: spacing.lg },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  gradeCell: { width: "22.5%", height: 48, borderWidth: BORDER, borderColor: c.border, borderRadius: radius.lg, alignItems: "center", justifyContent: "center", backgroundColor: c.surface },
  gradeText: { fontFamily: fonts.display, fontSize: 20, color: c.onSurface },
  cellOn: { backgroundColor: c.brandPrimary },
  cellTextOn: { color: c.onBrandPrimary },
  chipRow: { marginHorizontal: -spacing.md, flexGrow: 0 },
  chipRowContent: { gap: spacing.sm, paddingHorizontal: spacing.md, paddingRight: spacing.lg },
  chip: { flexShrink: 0, height: 40, paddingHorizontal: 14, borderWidth: BORDER, borderColor: c.border, borderRadius: radius.pill, justifyContent: "center", backgroundColor: c.surface },
  chipOn: { backgroundColor: c.surfaceInverse },
  chipText: { fontFamily: fonts.bodySemi, fontSize: 14, color: c.onSurface },
  chipTextOn: { color: c.onSurfaceInverse },
  input: { height: 52, borderWidth: BORDER, borderColor: c.border, borderRadius: radius.lg, paddingHorizontal: spacing.md, fontFamily: fonts.bodySemi, fontSize: 16, color: c.onSurface, backgroundColor: c.surfaceSecondary },
  segment: { flexDirection: "row", borderWidth: BORDER, borderColor: c.border, borderRadius: radius.lg, overflow: "hidden" },
  segItem: { flex: 1, minHeight: 46, alignItems: "center", justifyContent: "center", paddingHorizontal: 4, backgroundColor: c.surface },
  segDivider: { borderLeftWidth: BORDER, borderColor: c.border },
  segText: { fontFamily: fonts.bodyBold, fontSize: 14, color: c.onSurface },
  errorBox: { flexDirection: "row", gap: spacing.sm, alignItems: "center", backgroundColor: c.error, borderWidth: BORDER, borderColor: c.border, borderRadius: radius.lg, padding: 12 },
  errorText: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 14, color: c.onError },
  tip: { flexDirection: "row", gap: spacing.sm, padding: spacing.md, borderWidth: BORDER, borderStyle: "dashed", borderColor: c.border, borderRadius: radius.lg },
  tipText: { flex: 1, fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: c.onSurface },
  genRoot: { flex: 1, backgroundColor: c.surfaceInverse, alignItems: "center", paddingHorizontal: spacing.lg },
  genImg: { width: 180, height: 180, borderRadius: radius.lg, borderWidth: BORDER, borderColor: c.brandPrimary },
  pencil: { marginTop: -28, width: 64, height: 64, borderRadius: 32, backgroundColor: c.brandPrimary, borderWidth: BORDER, borderColor: c.border, alignItems: "center", justifyContent: "center" },
  genTitle: { fontFamily: fonts.display, fontSize: 30, color: c.onSurfaceInverse, marginTop: spacing.lg, textAlign: "center" },
  genSub: { fontFamily: fonts.body, fontSize: 15, color: c.mutedInverse, marginTop: spacing.sm, textAlign: "center" },
  genCount: { marginTop: spacing.xl, alignItems: "center" },
  genCountNum: { fontFamily: fonts.mono, fontSize: 56, color: c.brandPrimary },
  genCountLabel: { fontFamily: fonts.mono, fontSize: 12, letterSpacing: 2, color: c.onSurfaceInverse },
  steps: { marginTop: spacing.xl, gap: 12, alignSelf: "stretch" },
  stepRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  stepText: { fontFamily: fonts.bodySemi, fontSize: 15, color: c.onSurfaceInverse },
}));
