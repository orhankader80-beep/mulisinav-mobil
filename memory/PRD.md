# Mulisınav Mobil — PRD

## Original problem statement
"Mobil bir uygulama oluşturun: Mulisınav web uygulamamın mobil sürümünü yap, aynı arka tarafı kullansın."
Web app: https://studybuddy-771--27jnhkys.preview.emergentagent.com/

## User choices
- Backend learned by inspecting the website
- Sections: login/register, exam generation + solving, results & history, profile/settings, teacher/admin panel (the web backend has no admin/teacher endpoints, so it is not built)

## Architecture
- Expo (SDK 58) + expo-router app → FastAPI gateway at /api/m/* → existing Mulisınav API (MULISINAV_API_URL)
- The gateway turns the web app's HttpOnly cookie session into Bearer/refresh tokens (stored in secure storage), passes the AI exam stream (SSE) through, and keeps no data or cookies itself
- Grading is the same as the web app: test questions are graded on the phone, open-ended answers through /check, and results are saved with /exams/{id}/attempt

## Implemented (2026-11-13)
- Login/register screens (same accounts as the web), session kept after closing the app, automatic token refresh
- Yeni: grade 5–12, subject, topic, difficulty, question type; AI generation screen with live question count
- Yazılılarım: average, total and checked counts; exam cards, pull to refresh, delete with a confirmation sheet
- Exam solving: A–D options, open-ended answers, check, per-question result with answer key and explanation, score, solve again
- Profile: user info, stats, about section, logout
- Neo-brutalist design matching the web app (Bricolage/Onest/JetBrains Mono fonts)
- Security: the gateway's cookie jar is disabled, so one user's session can't leak to another

## PDF export (2026-11-13)
- Exam screen header "PDF" button → sheet with "Sınav kâğıdı" (questions + name/class/score fields) and "Cevap anahtarlı" (answers, explanations, results)
- Native: expo-print printToFileAsync + expo-sharing share sheet; Web: hidden iframe print (src/pdf.ts)

## Backlog
- P1: Google login (web has it through Emergent auth, needs a mobile deep-link flow)
- P1: Teacher/admin panel (needs new endpoints on the web backend)
- P2: Offline exam caching, sharing exams, a study streak
