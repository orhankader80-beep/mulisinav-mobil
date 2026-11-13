import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View, type ScrollView } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import Animated, { FadeIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { api } from "@/src/api";
import { BrutButton, Icon } from "@/src/components/ui";
import { useToast } from "@/src/components/toast";
import { PdfSheet } from "@/src/components/pdf-sheet";
import { checkExam, scoreOf, totalOf, type Exam, type Question, type Result } from "@/src/exam";
import { BORDER, fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

export default function ExamScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const styles = useStyles();
  const { colors } = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const { data: exam, isLoading, error, refetch } = useQuery({ queryKey: ["exam", id], queryFn: () => api<Exam>(`/exams/${id}`), enabled: !!id });

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, Result>>({});
  const [checking, setChecking] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);

  useEffect(() => {
    if (!exam) return;
    setAnswers(exam.answers || {});
    setResults(exam.results || {});
  }, [exam]);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)/exams"));
  const checked = Object.keys(results).length > 0;

  const check = async () => {
    if (!exam) return;
    setChecking(true);
    try {
      const { results: r, saved } = await checkExam(exam, answers);
      setResults(r);
      qc.invalidateQueries({ queryKey: ["exams"] });
      qc.invalidateQueries({ queryKey: ["exam", id] });
      toast(saved ? "success" : "error", saved ? "Notun Yazılılarım'a kaydedildi." : "Not kaydedilemedi.");
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    } catch (e) {
      toast("error", e instanceof Error && e.message ? e.message : "Cevaplar şu an kontrol edilemedi, tekrar dene.");
    } finally {
      setChecking(false);
    }
  };

  const reset = () => {
    setAnswers({});
    setResults({});
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const total = exam ? totalOf(exam.questions || []) : 0;
  const score = scoreOf(results);
  const answered = Object.values(answers).filter((v) => String(v).trim()).length;

  return (
    <View style={styles.root} testID="exam-screen">
      <StatusBar style="light" />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={goBack} style={styles.back} testID="exam-back-button" hitSlop={6}>
          <Icon name="arrow-left" size={22} color={colors.onSurfaceInverse} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerEyebrow} numberOfLines={1}>
            {exam ? `${exam.grade}. SINIF · ${exam.subject.toUpperCase()}` : "YAZILI"}
          </Text>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {exam?.title ?? "Yükleniyor…"}
          </Text>
        </View>
        {exam && (
          <Pressable onPress={() => setPdfOpen(true)} style={styles.pdfBtn} testID="exam-pdf-button" hitSlop={6}>
            <Icon name="download" size={18} color={colors.onBrandPrimary} />
            <Text style={styles.pdfText}>PDF</Text>
          </Pressable>
        )}
      </View>
      {exam && <PdfSheet visible={pdfOpen} onClose={() => setPdfOpen(false)} exam={exam} results={results} />}

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.brandPrimary} />
        </View>
      ) : error || !exam ? (
        <View style={styles.center} testID="exam-error">
          <Text style={styles.errText}>{error instanceof Error ? error.message : "Yazılı bulunamadı."}</Text>
          <BrutButton label="Tekrar dene" icon="rotate-ccw" onPress={() => refetch()} testID="exam-retry" />
        </View>
      ) : (
        <>
          <KeyboardAwareScrollView ref={scrollRef} bottomOffset={24} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
            <Animated.View entering={FadeIn.duration(250)} style={styles.paper}>
              <View style={styles.paperHead}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.paperLabel}>{[exam.topic, exam.difficulty, exam.qtype].filter(Boolean).join(" · ") || "Deneme yazılısı"}</Text>
                  <Text style={styles.paperTitle}>{exam.title}</Text>
                </View>
                <View style={[styles.scoreBox, checked && { backgroundColor: score >= 85 ? colors.success : score >= 50 ? colors.brandPrimary : colors.error }]} testID="exam-score">
                  <Text style={[styles.scoreNum, checked && score < 50 && { color: colors.onError }]}>{checked ? score : "?"}</Text>
                  <Text style={[styles.scoreTotal, checked && score < 50 && { color: colors.onError }]}>/{total}</Text>
                </View>
              </View>
              <Text style={styles.hint} testID="exam-score-hint">
                {!checked
                  ? "Cevaplarını yaz ya da şıkkını seç, sonra “Cevaplarımı kontrol et”e bas. Notun otomatik hesaplanır."
                  : score >= 85
                    ? "Harika! Bu konuya hazırsın."
                    : score >= 50
                      ? "İyi gidiyorsun. Yanlışlarının çözümüne bir göz at."
                      : "Çözümleri oku ve yeni bir deneme oluştur."}
              </Text>

              {exam.questions.map((q, i) => (
                <QuestionCard key={i} q={q} index={i} answer={answers[i] ?? ""} result={results[i]} locked={checked} onAnswer={(v) => setAnswers((a) => ({ ...a, [i]: v }))} />
              ))}
            </Animated.View>
          </KeyboardAwareScrollView>

          <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
            {checked ? (
              <View style={styles.footRow}>
                <BrutButton label="Tekrar çöz" icon="rotate-ccw" variant="light" onPress={reset} style={{ flex: 1 }} testID="exam-reset-button" />
                <BrutButton label="Yeni yazılı" icon="sparkles" onPress={() => router.replace("/(tabs)")} style={{ flex: 1 }} testID="exam-new-button" />
              </View>
            ) : (
              <BrutButton label={checking ? "Kontrol ediliyor…" : `Cevaplarımı kontrol et (${answered}/${exam.questions.length})`} icon="check" onPress={check} loading={checking} testID="exam-check-button" />
            )}
          </View>
        </>
      )}
    </View>
  );
}

function QuestionCard({ q, index, answer, result, locked, onAnswer }: { q: Question; index: number; answer: string; result?: Result; locked: boolean; onAnswer: (v: string) => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const options = Array.isArray(q.options) ? q.options : [];
  const isTest = q.type === "test";
  const status = result?.status;
  const statusMeta: Record<string, { bg: string; fg: string; label: string; icon: "circle-check" | "circle-x" | "circle-minus" | "circle-alert" }> = {
    ok: { bg: colors.success, fg: colors.onSuccess, label: "Doğru", icon: "circle-check" },
    partial: { bg: colors.brandPrimary, fg: colors.onBrandPrimary, label: "Kısmen doğru", icon: "circle-alert" },
    no: { bg: colors.error, fg: colors.onError, label: "Yanlış", icon: "circle-x" },
    empty: { bg: colors.surfaceTertiary, fg: colors.onSurfaceTertiary, label: "Boş", icon: "circle-minus" },
  };
  const meta = status ? statusMeta[status] ?? statusMeta.partial : null;
  const correctLetter = (String(q.answer || "").trim().match(/^([A-E])\b/i)?.[1] || "").toUpperCase();

  return (
    <View style={styles.q} testID={`question-${index}`}>
      <View style={styles.qTop}>
        <View style={styles.qNum}>
          <Text style={styles.qNumText}>{index + 1}</Text>
        </View>
        <Text style={styles.qType}>{isTest ? "TEST" : "AÇIK UÇLU"}</Text>
        <Text style={styles.qPts}>{q.points ?? 0} PUAN</Text>
      </View>
      <Text style={styles.qText}>{q.question}</Text>

      {options.length > 0 && (
        <View style={styles.opts}>
          {options.map((o, k) => {
            const letter = (o.match(/^([A-E])/i)?.[1] || String.fromCharCode(65 + k)).toUpperCase();
            const selected = answer === letter;
            const isCorrect = locked && letter === correctLetter;
            const isWrong = locked && selected && letter !== correctLetter;
            return (
              <Pressable
                key={k}
                disabled={locked}
                onPress={() => onAnswer(letter)}
                testID={`question-${index}-option-${letter}`}
                style={[styles.opt, selected && styles.optOn, isCorrect && { backgroundColor: colors.success }, isWrong && { backgroundColor: colors.error }]}
              >
                <View style={[styles.optLetter, selected && styles.optLetterOn]}>
                  <Text style={[styles.optLetterText, selected && { color: colors.onSurfaceInverse }]}>{letter}</Text>
                </View>
                <Text style={[styles.optText, isWrong && { color: colors.onError }]}>{o.replace(/^[A-E]\)\s*/i, "")}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {!isTest && (
        <TextInput
          testID={`question-${index}-answer-input`}
          style={styles.answerInput}
          value={answer}
          editable={!locked}
          onChangeText={onAnswer}
          multiline
          placeholder="Cevabını buraya yaz…"
          placeholderTextColor={colors.muted}
          textAlignVertical="top"
        />
      )}

      {meta && result && (
        <Animated.View entering={FadeIn.duration(200)} style={styles.result} testID={`question-${index}-result`}>
          <View style={[styles.resultHead, { backgroundColor: meta.bg }]}>
            <Icon name={meta.icon} size={18} color={meta.fg} />
            <Text style={[styles.resultLabel, { color: meta.fg }]}>{meta.label}</Text>
            <Text style={[styles.resultScore, { color: meta.fg }]}>
              {result.score ?? 0}/{q.points ?? 0}
            </Text>
          </View>
          <View style={styles.resultBody}>
            {!!result.feedback && <Text style={styles.feedback}>{result.feedback}</Text>}
            <Text style={styles.keyLabel}>CEVAP ANAHTARI</Text>
            <Text style={styles.keyText}>{q.answer}</Text>
            {!!q.explanation && (
              <>
                <Text style={styles.keyLabel}>ÇÖZÜM</Text>
                <Text style={styles.explain}>{q.explanation}</Text>
              </>
            )}
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surfaceInverse },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  back: { width: 44, height: 44, borderRadius: 22, borderWidth: BORDER, borderColor: c.onSurfaceInverse, alignItems: "center", justifyContent: "center" },
  pdfBtn: { flexDirection: "row", alignItems: "center", gap: 6, height: 44, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: c.brandPrimary, borderWidth: BORDER, borderColor: c.onSurfaceInverse },
  pdfText: { fontFamily: fonts.bodyBold, fontSize: 14, color: c.onBrandPrimary },
  headerEyebrow: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1.2, color: c.brandPrimary },
  headerTitle: { fontFamily: fonts.displayBold, fontSize: 17, color: c.onSurfaceInverse, marginTop: 2 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md, padding: spacing.lg },
  errText: { fontFamily: fonts.display, fontSize: 20, color: c.onSurfaceInverse, textAlign: "center" },
  content: { paddingHorizontal: spacing.md, paddingBottom: spacing.lg },
  paper: { backgroundColor: c.surfaceSecondary, borderWidth: BORDER, borderColor: c.border, padding: spacing.md, gap: spacing.md },
  paperHead: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start", borderBottomWidth: BORDER, borderStyle: "dashed", borderColor: c.border, paddingBottom: spacing.md },
  paperLabel: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: c.muted },
  paperTitle: { fontFamily: fonts.display, fontSize: 22, lineHeight: 26, color: c.onSurface, marginTop: 4 },
  scoreBox: { flexDirection: "row", alignItems: "baseline", borderWidth: BORDER, borderColor: c.border, borderRadius: radius.lg, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: c.surface },
  scoreNum: { fontFamily: fonts.mono, fontSize: 28, color: c.onSurface },
  scoreTotal: { fontFamily: fonts.mono, fontSize: 13, color: c.onSurface },
  hint: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: c.muted },
  q: { borderWidth: BORDER, borderColor: c.border, borderRadius: radius.lg, padding: spacing.md, gap: 12, backgroundColor: c.surface },
  qTop: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  qNum: { width: 32, height: 32, borderRadius: 16, backgroundColor: c.surfaceInverse, alignItems: "center", justifyContent: "center" },
  qNumText: { fontFamily: fonts.mono, fontSize: 14, color: c.onSurfaceInverse },
  qType: { flex: 1, fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1.2, color: c.onSurface },
  qPts: { fontFamily: fonts.mono, fontSize: 11, color: c.onBrandPrimary, backgroundColor: c.brandPrimary, borderWidth: 2, borderColor: c.border, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2, overflow: "hidden" },
  qText: { fontFamily: fonts.bodySemi, fontSize: 16, lineHeight: 23, color: c.onSurface },
  opts: { gap: spacing.sm },
  opt: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 50, borderWidth: BORDER, borderColor: c.border, borderRadius: radius.lg, padding: 10, backgroundColor: c.surfaceSecondary },
  optOn: { backgroundColor: c.brandPrimary },
  optLetter: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: c.border, alignItems: "center", justifyContent: "center", backgroundColor: c.surfaceSecondary },
  optLetterOn: { backgroundColor: c.surfaceInverse },
  optLetterText: { fontFamily: fonts.mono, fontSize: 13, color: c.onSurface },
  optText: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 15, color: c.onSurface },
  answerInput: { minHeight: 96, borderWidth: BORDER, borderColor: c.border, borderRadius: radius.lg, padding: 12, fontFamily: fonts.body, fontSize: 15, color: c.onSurface, backgroundColor: c.surfaceSecondary },
  result: { borderWidth: BORDER, borderColor: c.border, borderRadius: radius.lg, overflow: "hidden" },
  resultHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: BORDER, borderColor: c.border },
  resultLabel: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 14 },
  resultScore: { fontFamily: fonts.mono, fontSize: 13 },
  resultBody: { padding: 12, gap: 6, backgroundColor: c.surfaceSecondary },
  feedback: { fontFamily: fonts.bodyMedium, fontSize: 14, lineHeight: 20, color: c.onSurface, marginBottom: 4 },
  keyLabel: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.2, color: c.muted, marginTop: 4 },
  keyText: { fontFamily: fonts.bodyBold, fontSize: 14, color: c.onSurface },
  explain: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: c.onSurface },
  footer: { paddingHorizontal: spacing.md, paddingTop: spacing.md, backgroundColor: c.surfaceInverse, borderTopWidth: BORDER, borderColor: c.brandPrimary },
  footRow: { flexDirection: "row", gap: spacing.sm },
}));
