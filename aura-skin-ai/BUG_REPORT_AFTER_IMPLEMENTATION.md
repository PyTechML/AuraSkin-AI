# Bug Report — AuraSkin AI (Post Implementation)

Generated after implementing the Dashboard Rebuild, Live Pipeline Fix, and Routine Integration plan.

## Remaining placeholders / mock-like behavior

1. **`frontend/web/src/services/api.ts` — `dermatologistAvailabilityStore`**  
   In-memory object used by `getDermatologistAvailability` and `updateDermatologistAvailability`. Availability is not persisted to the backend; it is lost on refresh. Replace with real API endpoints and DB persistence when dermatologist availability is required.

2. **`frontend/web/src/app/(app-shell)/(store)/store/inventory/page.tsx`**  
   Comment: "Tiny sparkline: stub trend from stock or 5 fake values." The inventory sparkline may use synthetic values when real data is missing. Confirm it uses real stock/trend data when available.

3. **`frontend/web/src/components/dashboard/AIRecommendationsSection.tsx`**  
   A `<span>` with text "Placeholder" is rendered in the UI in some state. This component was removed from the main dashboard per plan but still exists; if reused elsewhere, replace with real content or remove the label.

## Database

- **`reports.skin_score`**  
  The Python worker and dashboard-metrics service now read/write `skin_score`. If the Supabase `reports` table does not yet have a `skin_score` column, add it (e.g. `integer` or `numeric`, 0–100) via a migration. The worker insert will fail until the column exists.

## APIs

- No broken or removed assessment/report/routine APIs were introduced. Create, upload, submit, progress, reports list, report by id, dashboard-metrics, and routine current endpoints are wired and used.

## Queries

- **Reports:** `getReports()` → backend `listStructured` → `reportRepository.findByUserId` (ORDER BY created_at DESC). Correct.
- **Dashboard metrics:** `getUserDashboardMetrics()` → `DashboardMetricsService.getMetrics` — uses latest report’s `skin_score` when present, else computed from sub-scores. Correct.
- **Routine:** `getUserCurrentRoutine()` → `RoutineService.getCurrentRoutine` → `routineRepository.getCurrentRoutinePlan(userId)` (ORDER BY created_at DESC LIMIT 1). Correct.

## UI / layout

- Dashboard was stripped to: Greeting, AI Insight, Skin Health Index, Latest Report Summary, Start Assessment (when no report). Layout is a single column with no large gaps.
- Reports page: empty state text set to "No assessment completed yet."; each report card shows date, skin score, skin type, and concerns when available.
- Tracking (routine) page: empty state "No assessment completed yet."; defensive checks for `routine ?? null`, `plan ?? null`, and array fields.

## Verification checklist (Section 15)

- **Assessment:** Non-face image is rejected with "Please upload a clear face image." (message set in `face_validator.py` and assessment-upload validator). Valid flow: create → upload 5 images → submit → worker runs → report + routine_plan created; frontend polls progress and shows error or redirects to report.
- **Dashboard:** Shows greeting (e.g. "Good Morning, user@email.com"), AI Insight, Skin Health Index (score / 100 from latest report), Latest Report Summary, and Start Assessment when no report. Refetches every 10s when tab is visible.
- **Reports page:** Lists all reports (ORDER BY created_at DESC); each shows date, skin score, skin type, concerns. Empty state: "No assessment completed yet."
- **Routine page:** Shows latest routine from `routine_plans`; empty state when none. Defensive rendering in place.
- **Cross-tab:** Dashboard polls every 10s; no client-side caching of reports/metrics/routine (apiGet uses `cache: "no-store"`).
- **No mock data in live paths:** Assessment, reports, dashboard score, and routine use real API and DB. Only the dermatologist availability and the inventory sparkline (and optional AIRecommendationsSection placeholder) remain as documented above.
