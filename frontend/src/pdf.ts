import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

import { formatDate, type Exam, type Result } from "@/src/exam";

const esc = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/\n/g, "<br/>");

const STATUS: Record<string, string> = { ok: "Doğru", partial: "Kısmen doğru", no: "Yanlış", empty: "Boş" };

// Printed paper colours are fixed (black ink on white), independent of the app theme.
function examHtml(exam: Exam, withKey: boolean, results: Record<string, Result>) {
  const total = exam.questions.reduce((s, q) => s + (Number(q.points) || 0), 0);
  const questions = exam.questions
    .map((q, i) => {
      const opts = Array.isArray(q.options) && q.options.length ? `<ol class="opts">${q.options.map((o) => `<li>${esc(o)}</li>`).join("")}</ol>` : "";
      const lines = q.type !== "test" && !withKey ? `<div class="lines"></div>` : "";
      const r = results[i];
      const key = withKey
        ? `<div class="key"><b>Cevap:</b> ${esc(q.answer)}${q.explanation ? `<br/><b>Çözüm:</b> ${esc(q.explanation)}` : ""}${
            r ? `<br/><b>Sonuç:</b> ${esc(STATUS[r.status] ?? r.status)} · ${r.score ?? 0}/${q.points ?? 0}${r.feedback ? ` — ${esc(r.feedback)}` : ""}` : ""
          }</div>`
        : "";
      return `<div class="q"><div class="qh"><span class="n">${i + 1}</span><span class="t">${q.type === "test" ? "TEST" : "AÇIK UÇLU"}</span><span class="p">${q.points ?? 0} puan</span></div><p>${esc(q.question)}</p>${opts}${lines}${key}</div>`;
    })
    .join("");
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
<style>
@page { margin: 18mm 14mm; }
body { font-family: -apple-system, "Helvetica Neue", Arial, sans-serif; color: #16130F; font-size: 12.5pt; }
.head { border: 2.5px solid #16130F; border-radius: 8px; padding: 12px 14px; margin-bottom: 16px; }
.brand { font-weight: 800; font-size: 11pt; letter-spacing: 1px; text-transform: uppercase; }
h1 { font-size: 18pt; margin: 6px 0 4px; }
.meta { color: #555; font-size: 10.5pt; }
.fields { display: flex; gap: 18px; margin-top: 12px; font-size: 11pt; }
.fields div { flex: 1; border-bottom: 1.5px dashed #16130F; padding-bottom: 4px; }
.q { border: 1.5px solid #16130F; border-radius: 8px; padding: 10px 12px; margin-bottom: 12px; page-break-inside: avoid; }
.qh { display: flex; align-items: center; gap: 8px; font-size: 9.5pt; font-weight: 700; letter-spacing: 1px; }
.n { background: #16130F; color: #fff; border-radius: 50%; width: 22px; height: 22px; display: inline-flex; align-items: center; justify-content: center; }
.t { flex: 1; }
.p { border: 1.5px solid #16130F; border-radius: 99px; padding: 1px 8px; background: #FFD43B; }
p { margin: 8px 0; line-height: 1.45; }
.opts { list-style: none; padding: 0; margin: 4px 0 0; }
.opts li { padding: 3px 0; }
.lines { height: 90px; background: repeating-linear-gradient(transparent, transparent 28px, #bbb 29px); }
.key { margin-top: 8px; padding: 8px 10px; background: #F2E8DA; border-radius: 6px; font-size: 11pt; line-height: 1.45; }
.foot { text-align: center; color: #777; font-size: 9pt; margin-top: 18px; }
</style></head><body>
<div class="head"><div class="brand">Mulisınav${withKey ? " · Cevap anahtarı" : ""}</div><h1>${esc(exam.title)}</h1>
<div class="meta">${esc([`${exam.grade}. sınıf`, exam.subject, exam.topic, exam.difficulty, formatDate(exam.created_at)].filter(Boolean).join(" · "))} · Toplam ${total} puan</div>
${withKey ? "" : `<div class="fields"><div>Ad Soyad:</div><div>Sınıf / No:</div><div>Puan:</div></div>`}</div>
${questions}
<div class="foot">mulisinav ile hazırlandı</div>
</body></html>`;
}

// Creates the PDF and opens the share sheet (save to Files, WhatsApp, e-mail…).
// On web the browser's print dialog is used, where "Save as PDF" is available.
export async function exportExamPdf(exam: Exam, withKey: boolean, results: Record<string, Result>) {
  const html = examHtml(exam, withKey, results);
  if (Platform.OS === "web") {
    // expo-print on web ignores `html` and prints the whole app, so print a hidden iframe instead.
    const doc = (globalThis as unknown as { document: any }).document;
    const frame = doc.createElement("iframe");
    frame.style.cssText = "position:fixed;width:0;height:0;border:0;right:0;bottom:0";
    doc.body.appendChild(frame);
    const fdoc = frame.contentWindow.document;
    fdoc.open();
    fdoc.write(html);
    fdoc.close();
    await new Promise((r) => setTimeout(r, 300));
    frame.contentWindow.focus();
    frame.contentWindow.print();
    setTimeout(() => frame.remove(), 1000);
    return;
  }
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf", dialogTitle: exam.title });
  } else {
    await Print.printAsync({ uri });
  }
}
