import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { useAuth } from "@/src/auth";
import { BrutBox, BrutButton, ConfirmSheet, Icon, Label, type IconName } from "@/src/components/ui";
import { type ExamSummary } from "@/src/exam";
import { usesNativeTabs } from "@/src/navigation";
import { BORDER, fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

export default function Profile() {
  const { user, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const bottomChrome = usesNativeTabs ? insets.bottom : 0;
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const { data } = useQuery({ queryKey: ["exams"], queryFn: () => api<ExamSummary[]>("/exams") });

  const u = user || null;
  const list = Array.isArray(data) ? data : [];
  const checked = list.filter((e) => e.score !== null && e.score !== undefined);
  const best = checked.length ? Math.max(...checked.map((e) => e.score ?? 0)) : null;
  const initials = (u?.name || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const doLogout = async () => {
    setBusy(true);
    await signOut();
    setBusy(false);
    setConfirm(false);
    router.replace("/login");
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.title}>Profil</Text>
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomChrome + spacing.lg }]}>
        <BrutBox style={styles.userCard} testID="profile-card">
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name} testID="profile-name" numberOfLines={1}>
              {u?.name}
            </Text>
            <Text style={styles.email} testID="profile-email" numberOfLines={1}>
              {u?.email}
            </Text>
          </View>
        </BrutBox>

        <View style={styles.stats}>
          <Stat label="YAZILI" value={list.length} testID="profile-stat-total" />
          <Stat label="KONTROL" value={checked.length} testID="profile-stat-checked" />
          <Stat label="EN İYİ" value={best ?? "—"} testID="profile-stat-best" />
        </View>

        <View>
          <Label>Hesap</Label>
          <View style={styles.group}>
            <Row icon="user" title="Ad" value={u?.name || ""} testID="profile-row-name" />
            <Row icon="mail" title="E-posta" value={u?.email || ""} testID="profile-row-email" last />
          </View>
        </View>

        <View>
          <Label>Hakkında</Label>
          <View style={styles.group}>
            <Row icon="graduation-cap" title="Mulisınav" value="5–12. sınıflar için yapay zekâ destekli yazılı çalışma uygulaması." testID="profile-row-about" />
            <Row icon="info" title="Sürüm" value="1.0.0 · Web hesabınla senkron" testID="profile-row-version" last />
          </View>
        </View>

        <BrutButton label="Çıkış yap" icon="log-out" variant="danger" onPress={() => setConfirm(true)} testID="logout-button" />
        <Text style={[styles.foot, { color: colors.muted }]}>Yazılıların web ve mobilde aynı hesapta tutulur.</Text>
      </ScrollView>

      <ConfirmSheet
        visible={confirm}
        title="Çıkış yapılsın mı?"
        message="Tekrar giriş yaptığında tüm yazılıların seni bekliyor olacak."
        confirmLabel="Çıkış yap"
        loading={busy}
        onConfirm={doLogout}
        onClose={() => setConfirm(false)}
        testID="logout-sheet"
      />
    </View>
  );
}

function Stat({ label, value, testID }: { label: string; value: number | string; testID: string }) {
  const styles = useStyles();
  return (
    <BrutBox containerStyle={styles.statCell} style={styles.stat} testID={testID}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statNum}>{value}</Text>
    </BrutBox>
  );
}

function Row({ icon, title, value, last, testID }: { icon: IconName; title: string; value: string; last?: boolean; testID: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={[styles.row, !last && styles.rowDivider]} testID={testID}>
      <Icon name={icon} size={20} color={colors.onSurface} />
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, borderBottomWidth: BORDER, borderColor: c.border, backgroundColor: c.surface },
  title: { fontFamily: fonts.display, fontSize: 30, color: c.onSurface, letterSpacing: -0.6 },
  content: { padding: spacing.lg, gap: spacing.lg },
  userCard: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: c.brandPrimary, borderWidth: BORDER, borderColor: c.border, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: fonts.display, fontSize: 22, color: c.onBrandPrimary },
  name: { fontFamily: fonts.display, fontSize: 22, color: c.onSurface },
  email: { fontFamily: fonts.body, fontSize: 14, color: c.muted, marginTop: 2 },
  stats: { flexDirection: "row", gap: spacing.xs },
  stat: { padding: 12 },
  statCell: { flex: 1 },
  statLabel: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1.2, color: c.onSurface },
  statNum: { fontFamily: fonts.mono, fontSize: 28, color: c.onSurface, marginTop: 2 },
  group: { borderWidth: BORDER, borderColor: c.border, borderRadius: radius.lg, backgroundColor: c.surfaceSecondary, overflow: "hidden" },
  row: { flexDirection: "row", gap: spacing.md, padding: spacing.md, alignItems: "flex-start" },
  rowDivider: { borderBottomWidth: BORDER, borderColor: c.border },
  rowTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: c.onSurface },
  rowValue: { fontFamily: fonts.body, fontSize: 14, color: c.muted, marginTop: 2, lineHeight: 20 },
  foot: { fontFamily: fonts.body, fontSize: 13, textAlign: "center" },
}));
