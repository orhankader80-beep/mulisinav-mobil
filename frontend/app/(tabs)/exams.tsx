import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { BrutBox, BrutButton, ConfirmSheet, Icon } from "@/src/components/ui";
import { useToast } from "@/src/components/toast";
import { formatDate, type ExamSummary } from "@/src/exam";
import { usesNativeTabs } from "@/src/navigation";
import { BORDER, fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

const EMPTY_IMG =
  "https://images.unsplash.com/photo-1606326608690-4e0281b1e588?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85&w=800";

export const useExams = () => useQuery({ queryKey: ["exams"], queryFn: () => api<ExamSummary[]>("/exams") });

export default function MyExams() {
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const bottomChrome = usesNativeTabs ? insets.bottom : 0;
  const { data, isLoading, isError, error, refetch, isRefetching } = useExams();
  const [toDelete, setToDelete] = useState<ExamSummary | null>(null);
  const [deleting, setDeleting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const list = Array.isArray(data) ? data : [];
  const checked = list.filter((e) => e.score !== null && e.score !== undefined);
  const avg = checked.length ? Math.round(checked.reduce((s, e) => s + (e.score ?? 0), 0) / checked.length) : null;

  const remove = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api(`/exams/${toDelete.id}`, { method: "DELETE" });
      qc.setQueryData<ExamSummary[]>(["exams"], (xs) => (xs || []).filter((x) => x.id !== toDelete.id));
      toast("success", "Yazılı silindi.");
      setToDelete(null);
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Silinemedi.");
    } finally {
      setDeleting(false);
    }
  };

  const header = (
    <View style={styles.headerBlock}>
      <View style={styles.stats}>
        <BrutBox bg={colors.brandSecondary} containerStyle={styles.statCell} style={styles.stat} testID="stat-average">
          <Text style={styles.statLabelInv}>ORTALAMA</Text>
          <Text style={styles.statNumInv}>{avg ?? "—"}</Text>
        </BrutBox>
        <BrutBox bg={colors.brandPrimary} containerStyle={styles.statCell} style={styles.stat} testID="stat-total">
          <Text style={styles.statLabel}>YAZILI</Text>
          <Text style={styles.statNum}>{list.length}</Text>
        </BrutBox>
        <BrutBox containerStyle={styles.statCell} style={styles.stat} testID="stat-checked">
          <Text style={styles.statLabel}>KONTROL</Text>
          <Text style={styles.statNum}>{checked.length}</Text>
        </BrutBox>
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.title} testID="my-exams-title">
          Yazılılarım
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.pad}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={styles.skeleton} testID={`exam-skeleton-${i}`} />
          ))}
        </View>
      ) : isError ? (
        <View style={styles.center} testID="my-exams-error">
          <Icon name="circle-alert" size={40} color={colors.error} />
          <Text style={styles.emptyTitle}>{error instanceof Error ? error.message : "Yüklenemedi."}</Text>
          <BrutButton label="Tekrar dene" icon="rotate-ccw" onPress={() => refetch()} testID="my-exams-retry" />
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(e) => e.id}
          ListHeaderComponent={header}
          contentContainerStyle={[styles.listContent, { paddingBottom: bottomChrome + spacing.lg }]}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.onSurface} />}
          ListEmptyComponent={
            <View style={styles.empty} testID="my-exams-empty">
              <Image source={{ uri: EMPTY_IMG }} style={styles.emptyImg} contentFit="cover" />
              <Text style={styles.emptyTitle}>Henüz yazılı oluşturmadın.</Text>
              <Text style={styles.emptySub}>Sınıfını, dersini ve konunu seç; ilk deneme yazılın saniyeler içinde hazır.</Text>
              <BrutButton label="İlk yazılımı oluştur" icon="sparkles" onPress={() => router.push("/(tabs)")} testID="my-exams-empty-cta" />
            </View>
          }
          renderItem={({ item, index }) => <ExamCard exam={item} index={index} onOpen={() => router.push(`/exam/${item.id}`)} onDelete={() => setToDelete(item)} />}
        />
      )}

      <ConfirmSheet
        visible={!!toDelete}
        title="Yazılıyı sil?"
        message={`“${toDelete?.title ?? ""}” kalıcı olarak silinecek. Bu işlem geri alınamaz.`}
        confirmLabel="Sil"
        loading={deleting}
        onConfirm={remove}
        onClose={() => setToDelete(null)}
        testID="delete-exam-sheet"
      />
    </View>
  );
}

function ExamCard({ exam, index, onOpen, onDelete }: { exam: ExamSummary; index: number; onOpen: () => void; onDelete: () => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const checked = exam.score !== null && exam.score !== undefined;
  const scoreBg = !checked ? colors.surfaceTertiary : (exam.score ?? 0) >= 85 ? colors.success : (exam.score ?? 0) >= 50 ? colors.brandPrimary : colors.error;
  const scoreFg = !checked ? colors.onSurfaceTertiary : (exam.score ?? 0) >= 50 ? colors.onSuccess : colors.onError;
  return (
    <Animated.View entering={FadeInDown.duration(250).delay(Math.min(index, 6) * 40)}>
      <Pressable onPress={onOpen} testID={`my-exam-card-${index}`}>
        <BrutBox style={styles.card}>
          <View style={styles.cardTop}>
            <View style={styles.meta}>
              <Text style={styles.metaText}>
                {exam.grade}. SINIF · {exam.subject.toUpperCase()}
              </Text>
            </View>
            <Pressable onPress={onDelete} hitSlop={8} style={styles.trash} testID={`my-exam-delete-${index}`}>
              <Icon name="trash-2" size={18} color={colors.onSurface} />
            </Pressable>
          </View>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {exam.title}
          </Text>
          <Text style={styles.cardSub}>
            {[exam.topic, exam.difficulty, formatDate(exam.created_at)].filter(Boolean).join(" · ")}
          </Text>
          <View style={styles.cardBottom}>
            <View style={[styles.score, { backgroundColor: scoreBg }]} testID={`my-exam-score-${index}`}>
              <Text style={[styles.scoreText, { color: scoreFg }]}>{checked ? `${exam.score}/${exam.total || 100}` : "Henüz kontrol edilmedi"}</Text>
            </View>
            <View style={styles.open}>
              <Text style={styles.openText}>{checked ? "İncele" : "Çöz"}</Text>
              <Icon name="chevron-right" size={18} color={colors.onBrandSecondary} />
            </View>
          </View>
        </BrutBox>
      </Pressable>
    </Animated.View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, borderBottomWidth: BORDER, borderColor: c.border, backgroundColor: c.surface },
  title: { fontFamily: fonts.display, fontSize: 30, color: c.onSurface, letterSpacing: -0.6 },
  pad: { padding: spacing.lg, gap: spacing.md },
  skeleton: { height: 150, borderWidth: BORDER, borderColor: c.border, borderRadius: radius.lg, backgroundColor: c.surfaceTertiary },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg, gap: spacing.md },
  listContent: { padding: spacing.lg, gap: spacing.md },
  headerBlock: { marginBottom: spacing.xs },
  stats: { flexDirection: "row", gap: spacing.xs },
  stat: { padding: 12 },
  statCell: { flex: 1 },
  statLabel: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1.2, color: c.onSurface },
  statNum: { fontFamily: fonts.mono, fontSize: 30, color: c.onSurface, marginTop: 2 },
  statLabelInv: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1.2, color: c.onBrandSecondary },
  statNumInv: { fontFamily: fonts.mono, fontSize: 30, color: c.onBrandSecondary, marginTop: 2 },
  card: { padding: spacing.md, gap: spacing.sm },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  meta: { backgroundColor: c.brandPrimary, borderWidth: 2, borderColor: c.border, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3, flexShrink: 1 },
  metaText: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1, color: c.onBrandPrimary },
  trash: { width: 44, height: 44, borderWidth: 2, borderColor: c.border, borderRadius: radius.lg, alignItems: "center", justifyContent: "center", marginLeft: spacing.sm },
  cardTitle: { fontFamily: fonts.display, fontSize: 20, lineHeight: 24, color: c.onSurface },
  cardSub: { fontFamily: fonts.body, fontSize: 13, color: c.muted },
  cardBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.xs, gap: spacing.sm },
  score: { borderWidth: 2, borderColor: c.border, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5, flexShrink: 1 },
  scoreText: { fontFamily: fonts.mono, fontSize: 12 },
  open: { flexDirection: "row", alignItems: "center", gap: 2, backgroundColor: c.brandSecondary, borderWidth: 2, borderColor: c.border, borderRadius: radius.pill, paddingLeft: 14, paddingRight: 8, height: 36 },
  openText: { fontFamily: fonts.bodyBold, fontSize: 14, color: c.onBrandSecondary },
  empty: { alignItems: "center", gap: spacing.md, paddingTop: spacing.lg },
  emptyImg: { width: 200, height: 150, borderRadius: radius.lg, borderWidth: BORDER, borderColor: c.border },
  emptyTitle: { fontFamily: fonts.display, fontSize: 22, color: c.onSurface, textAlign: "center" },
  emptySub: { fontFamily: fonts.body, fontSize: 15, color: c.muted, textAlign: "center", lineHeight: 21 },
}));
