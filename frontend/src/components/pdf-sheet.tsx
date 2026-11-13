import { useState } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon, type IconName } from "@/src/components/ui";
import { useToast } from "@/src/components/toast";
import { type Exam, type Result } from "@/src/exam";
import { exportExamPdf } from "@/src/pdf";
import { BORDER, fonts, radius, spacing, useTheme } from "@/src/theme";

export function PdfSheet({ visible, onClose, exam, results }: { visible: boolean; onClose: () => void; exam: Exam; results: Record<string, Result> }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const toast = useToast();
  const [busy, setBusy] = useState<"paper" | "key" | null>(null);

  const run = async (kind: "paper" | "key") => {
    setBusy(kind);
    try {
      await exportExamPdf(exam, kind === "key", results);
      onClose();
    } catch {
      toast("error", "PDF oluşturulamadı, tekrar dene.");
    } finally {
      setBusy(null);
    }
  };

  const Option = ({ kind, icon, title, sub, bg }: { kind: "paper" | "key"; icon: IconName; title: string; sub: string; bg: string }) => (
    <Pressable
      testID={`pdf-option-${kind}`}
      disabled={!!busy}
      onPress={() => run(kind)}
      style={({ pressed }) => [styles.opt, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }, pressed && { transform: [{ translateY: 2 }] }]}
    >
      <View style={[styles.optIcon, { backgroundColor: bg, borderColor: colors.border }]}>
        {busy === kind ? <ActivityIndicator color={colors.onSurface} /> : <Icon name={icon} size={22} color={colors.onSurface} />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.optTitle, { color: colors.onSurface }]}>{title}</Text>
        <Text style={[styles.optSub, { color: colors.muted }]}>{sub}</Text>
      </View>
      <Icon name="download" size={20} color={colors.onSurface} />
    </Pressable>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} testID="pdf-sheet-backdrop" />
      <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border, paddingBottom: insets.bottom + spacing.md }]} testID="pdf-sheet">
        <View style={[styles.handle, { backgroundColor: colors.border }]} />
        <Text style={[styles.title, { color: colors.onSurface }]}>PDF indir</Text>
        <Text style={[styles.msg, { color: colors.muted }]}>PDF’i dosyalarına kaydedebilir, yazdırabilir ya da WhatsApp ve e-postayla paylaşabilirsin.</Text>
        <Option kind="paper" icon="file-text" title="Sınav kâğıdı" sub="Sadece sorular, ad-soyad ve puan alanı ile" bg={colors.brandPrimary} />
        <Option kind="key" icon="file-check" title="Cevap anahtarlı" sub="Cevaplar, çözümler ve varsa sonuçların" bg={colors.success} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(22,19,15,0.55)" },
  sheet: { borderTopWidth: BORDER, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.lg, gap: 12 },
  handle: { alignSelf: "center", width: 48, height: 5, borderRadius: 3, marginBottom: spacing.xs },
  title: { fontFamily: fonts.display, fontSize: 24 },
  msg: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, marginBottom: spacing.xs },
  opt: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 68, borderWidth: BORDER, borderRadius: radius.lg, padding: 12 },
  optIcon: { width: 44, height: 44, borderRadius: radius.lg, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  optTitle: { fontFamily: fonts.bodyBold, fontSize: 16 },
  optSub: { fontFamily: fonts.body, fontSize: 13, marginTop: 2 },
});
