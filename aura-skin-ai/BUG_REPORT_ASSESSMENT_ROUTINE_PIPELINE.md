# Bug Report — Assessment & Routine Pipeline Implementation

**Generated after:** Live Assessment Result Pipeline Fix & Routine System Rebuild  
**Scope:** Frontend user panel (dashboard, report, routine), backend report/routine APIs, and related assets.

---

## 1. Detected mock / placeholder / static data

| Location | Type | Description |
|----------|------|-------------|
| `frontend/web/src/services/api.ts` | Mock/default data | `getDermatologistAvailability()` uses in-memory `dermatologistAvailabilityStore` with hardcoded default slots (Monday/Wednesday) when no stored value exists. Availability should come from backend/DB for consistency. |
| `frontend/web/src/app/(app-shell)/(user)/dashboard/tracking/page.tsx` | Placeholder state | Uses `INITIAL_ROUTINE_LOG` and `INITIAL_FEEDBACK_ENTRIES` (hardcoded routine log and feedback). This is the **dashboard** sub-route `/dashboard/tracking`, not the main Routine page at `/tracking`. Consider refactoring to fetch routine logs from API (e.g. `getUserRoutineLogs`) or align with the new Routine page behavior. |
| `frontend/web/src/components/dashboard/AIRecommendationsSection.tsx` (line 137) | UI label | Displays literal "Placeholder" text when a product/recommendation has no image. Consider replacing with "No image" or removing the label for a cleaner UI. |
| `frontend/web/src/app/(app-shell)/(store)/store/inventory/page.tsx` (line 43) | Comment / possible stub | Comment references "5 fake values" for sparkline trend. If the sparkline uses fake data, replace with real inventory/trend data from API. |

---

## 2. API endpoints

- **User reports:** `GET /user/reports` and `GET /user/reports/:id` return enriched reports with `skin_type` and `skin_concerns` from the linked assessment. No issues found.
- **User routine:** `GET /user/routines/current` returns `plan` (morning/night/lifestyle) and `adherence`. Consumed correctly by the new Routine page.
- **Report by ID response shape:** Backend returns `formatSuccess({ success: true, data: result })`. Frontend `getReportById` and `getReportWithRecommendations` were updated to handle both `result.data.report` and `result.report` for compatibility.

---

## 3. Database / schema

- **Reports table:** No new columns added. `skin_type` and `skin_concerns` are derived from the linked **assessments** row in the report service and attached to the API response. No schema mismatch.
- **routine_plans:** Used as-is; columns `lifestyle_food_advice`, `lifestyle_hydration`, `lifestyle_sleep` map to Diet, Water/hydration, and Sleep on the Routine page.

---

## 4. State management

- **Assessment results / scores:** Not stored in `localStorage`. Dashboard and report pages use live API data only.
- **localStorage/sessionStorage in scope:** Used only for auth rehydration, route scroll memory, assistant rate limit/session, report-actions UI state, and consultation sim state. None used for assessment results or skin scores. Acceptable per plan.

---

## 5. UI / copy consistency

- **Nav:** "Tracking" renamed to "Routine" in Navbar (`userAppLinks`, `userMenuItems`), Sidebar (`userLinks`), assistant route, and breadcrumb (`useBreadcrumb`). Path remains `/tracking`.
- **Routine page:** Title set to "Your Skincare Routine"; empty state: "No routine generated yet."
- **Dashboard:** Skin Health Index shows "—" when there are no reports; when reports exist, shows score, Skin Type, and Concerns from latest report.

---

## 6. Summary and recommendations

- **Fixed in this implementation:** Dashboard uses live report + metrics; report API enriched with skin_type/skin_concerns; Routine page at `/tracking` shows only DB-driven routine; nav labels updated; empty states and refetch-on-focus added.
- **Follow-up:** (1) Replace dermatologist availability mock with backend/DB if that feature is in scope. (2) Align `/dashboard/tracking` with API-driven routine/logs or document as legacy. (3) Replace "Placeholder" in AIRecommendationsSection with neutral copy or no label. (4) If store inventory sparkline uses fake data, switch to real data source.
