# Fix #5 — Platform Stability and Security Report

## Summary

This report documents the implementation of Fix #5: stability, store dashboard render fix, security, performance, and final SaaS hardening for AuraSkin AI.

---

## 1. Files Modified

| File | Change |
|------|--------|
| `frontend/web/src/store/authStore.ts` | Added `accessToken`, `setSession`, `setAccessToken`; persist token; clear token on logout. |
| `frontend/web/src/services/apiPartner.ts` | Added `getAuthHeaders()` from authStore; `apiGet`/`apiSend` send `Authorization: Bearer <token>`. Fixed `getPartnerNotifications` return type and PartnerProduct mapping types. |
| `frontend/web/src/app/(auth)/login/page.tsx` | Login now calls `POST /api/auth/login`; on success calls `setSession(accessToken, user, role)` and redirects; shows API error message. |
| `frontend/web/src/app/(app-shell)/(store)/store/dashboard/page.tsx` | Added `emptyDashboardStats()`, `normalizeDashboardStats()`; on success with null/empty payload render empty state; use `stats ?? emptyDashboardStats()`. |
| `backend/ai-engine/workers/analysis_worker.py` | Added `set_heartbeat(redis_client)` and `AI_WORKER_HEARTBEAT_KEY`; heartbeat in main loop and in `progress_cb`; 10-minute `PROCESSING_TIMEOUT_SEC` with `ProcessingTimeoutError` and progress set to failed. |
| `backend/src/modules/user/services/report.service.ts` | `PRODUCT_RECOMMENDATION_LIMIT` and `DERMATOLOGIST_RECOMMENDATION_LIMIT` changed from 10 to 5. |
| `backend/ai-engine/workers/analysis_worker.py` | Recommendation limits in worker set to 5 for products and dermatologists. |
| `backend/src/ai/assistant/chatbot.service.ts` | Final message uses `rawMessage` with fallback to `pickDefaultResponse()` so response is never blank. |
| `backend/src/ai/assistant/default-responses.ts` | Added default string "For medical concerns, please consult a dermatologist." |
| `backend/src/modules/public/public.controller.ts` | Injected `AnalyticsService`; in `getProductById` call `analytics.track("product_viewed", ...)` with optional user from request. |
| `backend/supabase/migrations/20250314000000_performance_indexes.sql` | New migration: indexes on `reports(user_id)`, `orders(store_id)`, `routine_logs(user_id)`, `recommended_products(report_id)`, `analytics_events(user_id)`. |
| `frontend/web/src/app/(app-shell)/(user)/dashboard/page.tsx` | `getUserRoutineLogs().then(logs => buildRoutineGridFromLogs(Array.isArray(logs) ? logs : []))`. |
| `frontend/web/src/app/(app-shell)/(admin)/admin/page.tsx` | `getPendingInventory().then(list => setPendingCount(Array.isArray(list) ? list.length : 0))`. |
| `frontend/web/src/services/apiAdmin.ts` | Added `getAuthHeaders()`, auth in `apiGet`/`apiPut`; added `getAdminSystemHealth()` and `SystemHealth` interface. |
| `frontend/web/src/app/(app-shell)/(admin)/admin/system-health/page.tsx` | Replaced `MOCK_METRICS` with live `getAdminSystemHealth()`; loading and error states; map response to metric cards including uptime and last worker activity. |
| `backend/src/modules/admin/controllers/system-health.controller.ts` | Added `uptime: number` to `SystemHealthResponse`; set `uptime: Math.floor(process.uptime())`. |

---

## 2. APIs Verified

- **GET /api/partner/store/dashboard** — Resolved: frontend now sends Bearer token; backend uses `user?.id` as storeId; dashboard page normalizes null/empty to empty state.
- **GET /api/partner/store/analytics** — Same auth fix; frontend mapping already matched backend DTO.
- **POST /api/auth/login** — Returns `{ data: { accessToken, refreshToken, user } }`; login page uses it and stores token and user/role.
- **POST /api/assistant** — Chatbot always returns a non-empty message via `pickDefaultResponse()` when needed.
- **GET /api/admin/system-health** — Returns `api_status`, `database_status`, `redis_status`, `worker_status`, `queue_length`, `last_worker_activity`, `uptime`; admin system-health page uses live data.
- **GET /api/products/:id** — Emits `product_viewed` analytics event (with optional user_id when authenticated).

---

## 3. Security Improvements

- **Rate limiting**: Global `ThrottlerGuard` with buckets (e.g. public 100/min, auth 10/min). Unmarked routes use first bucket (public).
- **Input validation**: Global `ValidationPipe` with whitelist and transform; POST/PUT use DTOs with class-validator.
- **Auth**: Partner and admin routes use `AuthGuard` and `RoleGuard`; frontend partner and admin API calls now send `Authorization: Bearer <accessToken>` from authStore (token from backend login).

---

## 4. Performance Improvements

- **Database indexes** (migration `20250314000000_performance_indexes.sql`):
  - `idx_reports_user_id`
  - `idx_orders_store_id`
  - `idx_routine_logs_user_id`
  - `idx_recommended_products_report_id`
  - `idx_analytics_events_user_id`

---

## 5. Store Dashboard Fix

- **Root cause**: Partner API requests did not send the Supabase JWT, so backend returned 401 and the frontend showed "Failed to load dashboard data."
- **Fix**: Login page calls backend `POST /api/auth/login` and stores `accessToken` (and user/role) in authStore. `apiPartner.ts` sends `Authorization: Bearer <accessToken>` on all requests. Store dashboard page treats null or empty API response as empty state (zeroed stats and empty arrays) instead of showing an error.

---

## 6. System Health and Worker

- **Worker heartbeat**: Python worker sets `ai:worker:last_heartbeat` in the main loop and inside `progress_cb` with TTL 120s. Backend system-health reads it for `last_worker_activity`.
- **Processing timeout**: If a job runs longer than 10 minutes, the worker sets progress to `failed` with error "Processing timeout (over 10 minutes). Please try again." and raises `ProcessingTimeoutError`.
- **Uptime**: System health response includes `uptime` (seconds, from `process.uptime()`).

---

## 7. Other Changes

- **Recommendations**: Max 5 products and 5 dermatologists per report (backend report service and Python worker).
- **Analytics**: `product_viewed` is tracked when a product is fetched via `GET /api/products/:id`.
- **Chatbot**: All response paths yield a non-empty message; default list includes dermatologist disclaimer strings.
- **Frontend stability**: Defensive checks for `logs` and `list` in user dashboard and admin dashboard; store dashboard uses normalized/empty stats.

---

## 8. Verification Checklist

| Item | Status |
|------|--------|
| Store dashboard loads with auth (or empty state) | Done |
| Partner API sends Bearer token | Done |
| Login uses backend and stores token | Done |
| AI worker heartbeat written to Redis | Done |
| 10-minute processing timeout in worker | Done |
| Recommendation limits set to 5 | Done |
| Chatbot never returns blank message | Done |
| product_viewed tracked on product view | Done |
| DB performance indexes migration added | Done |
| Admin system-health uses live API and shows uptime | Done |
| Frontend build passes | Done |
| Backend build passes | Done |

---

*Report generated for Fix #5 — Platform Stability and Security.*
