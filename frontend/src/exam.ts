import { api } from "@/src/api";

export const GRADES = [5, 6, 7, 8, 9, 10, 11, 12];
export const LEVELS = ["Kolay", "Orta", "Zor"];
export const TYPES = ["Açık uçlu", "Test", "Karma"];
const ORTAOKUL = ["Matematik", "Fen Bilimleri", "Türkçe", "Sosyal Bilgiler", "T.C. İnkılap Tarihi ve Atatürkçülük", "İngilizce", "Din Kültürü ve Ahlak Bilgisi"];
const LISE = ["Matematik", "Fizik", "Kimya", "Biyoloji", "Türk Dili ve Edebiyatı", "Tarih", "Coğrafya", "İngilizce", "Felsefe", "Din Kültürü ve Ahlak Bilgisi"];
export const subjectsForGrade = (g: number) => (g <= 8 ? ORTAOKUL : LISE);

export type Question = {
  type: "test" | "acik" | string;
  question: string;
  options?: string[];
  answer: string;
  explanation?: string;
  points: number;
};

export type Result = { index?: number; status: "ok" | "partial" | "no" | "empty" | string; score: number; feedback?: string };

export type ExamSummary = {
  id: string;
  grade: number;
  subject: string;
  topic?: string;
  difficulty?: string;
  title: string;
  total: number;
  score: number | null;
  checked_at: string | null;
  created_at: string;
};

export type Exam = ExamSummary & {
  qtype?: string;
  questions: Question[];
  answers?: Record<string, string>;
  results?: Record<string, Result>;
};

const keyLetter = (a: string) => (String(a || "").trim().match(/^([A-E])\b/i)?.[1] || "").toUpperCase();

// Same grading rules as the web app: test questions are graded locally,
// open-ended answers are graded by the Mulisınav AI (/check).
export async function checkExam(exam: Exam, answers: Record<string, string>) {
  const out: Record<string, Result> = {};
  const items: object[] = [];
  exam.questions.forEach((q, i) => {
    const pts = Number(q.points) || 0;
    const ans = String(answers[i] || "").trim();
    const letter = keyLetter(q.answer);
    if (!ans) out[i] = { status: "empty", score: 0, feedback: "Bu soruyu boş bıraktın." };
    else if (q.type === "test" && letter) {
      out[i] =
        ans === letter
          ? { status: "ok", score: pts, feedback: "" }
          : { status: "no", score: 0, feedback: `Senin cevabın ${ans}, doğru cevap ${letter}.` };
    } else {
      const opts = Array.isArray(q.options) ? q.options : [];
      items.push({
        index: i,
        question: String(q.question || ""),
        answer_key: String(q.answer || ""),
        points: pts,
        student_answer: q.type === "test" ? opts.find((o) => o.startsWith(ans)) || ans : ans,
      });
    }
  });
  if (items.length) {
    const data = await api<{ results?: Result[] }>("/check", {
      method: "POST",
      body: { grade: exam.grade, subject: exam.subject, items },
    });
    (data.results || []).forEach((r) => {
      if (r.index !== undefined) out[r.index] = r;
    });
  }
  const strAnswers = Object.fromEntries(Object.entries(answers).map(([k, v]) => [k, String(v ?? "")]));
  let saved = true;
  try {
    await api(`/exams/${exam.id}/attempt`, { method: "POST", body: { answers: strAnswers, results: out } });
  } catch {
    saved = false;
  }
  return { results: out, saved };
}

export const totalOf = (qs: Question[]) => qs.reduce((s, q) => s + (Number(q.points) || 0), 0);
export const scoreOf = (r: Record<string, Result>) => Object.values(r).reduce((s, x) => s + (Number(x?.score) || 0), 0);

export const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return "";
  }
};
