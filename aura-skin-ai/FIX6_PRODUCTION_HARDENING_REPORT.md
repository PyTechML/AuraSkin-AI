# Fix #6 — Production Hardening & Scalability Report

## Summary

This report documents the implementation of Fix #6: production hardening, platform analytics completion, AI queue scalability, worker auto-recovery, database integrity, store analytics improvements, user report history stability, chatbot rate limits and fallbacks, system health extension, frontend dashboard stability, and performance indexes for AuraSkin AI.

---

## 1. Files Modified

### Backend

| File | Change |
|------|--------|
| `backend/src/modules/analytics/analytics.service.ts` | Added `store_id` to `AnalyticsEventPayload` and insert; analytics_events table supports store context. |
| `backend/src/modules/user/services/assessment.service.ts` | Injected `AnalyticsService`; track `assessment_started` on assessment create. |
| `backend/src/modules/user/services/report.service.ts` | Added `listStructured()` returning `{ latest_report, past_reports }` with associations for latest; `report_generated` and `assessment_completed` already tracked in `createReportFromAssessment`. |
| `backend/src/modules/user/controllers/report.controller.ts` | `GET /user/reports` now calls `listStructured()` and returns `formatSuccess(data)` with structured shape. |
| `backend/src/modules/partner/store/services/inventory.service.ts` | Injected `AnalyticsService`; track `store_product_added` after product add. |
| `backend/src/modules/payments/services/webhooks.service.ts` | Injected `AnalyticsService`; track `product_purchased` and `store_order_received` in `createOrderFromSession`. |
| `backend/src/redis/redis.service.ts` | Added `PROCESSING_LOCK_PREFIX`, `JOB_RETRY_PREFIX`, `DEAD_LETTER_KEY`; `acquireAssessmentLock`, `releaseAssessmentLock`, `incrementJobRetry`, `resetJobRetry`, `pushFailedJob`. |
| `backend/src/jobs/aiProcessing.queue.ts` | Generate `job_id` (UUID); acquire lock before enqueue, release on enqueue failure; payload includes `job_id`. |
| `backend/src/modules/admin/controllers/system-health.controller.ts` | `worker_status` "offline" when heartbeat age > 120s; added `getGlobalCounts()`; response includes `total_users`, `total_assessments`, `total_reports`, `total_orders`. |
| `backend/src/modules/partner/store/services/analytics.service.ts` | Extended `StoreAnalytics` with `average_order_value`, `repeat_customer_rate`; computed from orders. |
| `backend/src/shared/constants/limits.ts` | `CHATBOT_MESSAGES_PER_MINUTE` = 10; `CHATBOT_MESSAGES_PER_HOUR` = 100; added `CHATBOT_MESSAGES_PER_DAY` = 50. |
| `backend/src/ai/assistant/chatbot.service.ts` | Rate bucket includes `day`; prune day to 24h; per-day limit (50); `CHAT_LIMIT_MESSAGE` and `TEMP_UNAVAILABLE_MESSAGE`; fallback message on OpenAI/service failure. |

### Frontend

| File | Change |
|------|--------|
| `frontend/web/src/services/api.ts` | `getReports()` normalizes `{ latest_report, past_reports }` to `Report[]`; `normalizeReport()`; `UserReportsResponse` type. |
| `frontend/web/src/app/(app-shell)/(user)/reports/page.tsx` | `reportsList = Array.isArray(reports) ? reports : []`; safe `manualReports`; setReports from normalized list. |
| `frontend/web/src/server/assistant/defaults.ts` | `maxPerMinute` = 10, `maxPerHour` = 100, `maxPerDay` = 50 added to settings. |
| `frontend/web/src/server/assistant/state.ts` | `RateBucket` includes `day: number[]`; `updateAssistantSettings` preserves `maxPerDay`. |
| `frontend/web/src/app/api/assistant/route.ts` | Prune includes `day`; check `maxPerDay`; LIMIT_MESSAGE = "Chat limit reached. Please try again later."; TEMP_UNAVAILABLE message; OpenAI 429 → 429 with LIMIT_MESSAGE; null OpenAI → TEMP_UNAVAILABLE. |
| `frontend/web/src/services/apiAdmin.ts` | `SystemHealth` includes `total_users?`, `total_assessments?`, `total_reports?`, `total_orders?`. |
| `frontend/web/src/app/(app-shell)/(admin)/admin/system-health/page.tsx` | Metric cards for Total users, Total assessments, Total reports, Total orders; safe `?? 0`. |
| `frontend/web/src/app/(app-shell)/(admin)/admin/analytics/page.tsx` | Null-safe metrics `data.total_users ?? 0` etc.; catch on getAdminAnalytics. |
| `frontend/web/src/app/(app-shell)/(user)/dashboard/page.tsx` | `getReports().then((data) => setReports(Array.isArray(data) ? data : []))`. |
| `frontend/web/src/app/(app-shell)/(user)/reports/[id]/page.tsx` | `list = Array.isArray(all) ? all : []` before sort. |
| `frontend/web/src/app/(app-shell)/(user)/dashboard/reports/[reportId]/page.tsx` | Same list guard. |
| `frontend/web/src/services/apiPartner.ts` | `StoreAnalyticsBackend` has `average_order_value?`, `repeat_customer_rate?`; `PartnerAnalytics` has `averageOrderValue`; map repeat_customer_rate to customerRetention (%), average_order_value to averageOrderValue. |
| `frontend/web/src/app/(app-shell)/(store)/store/analytics/page.tsx` | Use `analytics?.averageOrderValue`; `revenueList`/`ordersList` from Array.isArray; `customerRetentionPct`; safe CSV download arrays. |

### Migrations

| File | Change |
|------|--------|
| `backend/supabase/migrations/20260314000000_analytics_events_and_indexes.sql` | Create `analytics_events` if not exists (event_type, user_id, store_id, entity_type, entity_id, metadata, created_at); indexes on event_type, created_at. |
| `backend/supabase/migrations/20260314001000_db_integrity_and_indexes.sql` | Unique index `uq_reports_assessment_id`; unique index on `routine_logs (user_id, routine_plan_id, date, time_of_day)`; performance indexes: assessments(user_id), reports(assessment_id), orders(user_id), products(store_id), analytics_events(created_at), analytics_events(event_type). |

---

## 2. APIs Extended / Implemented

- **GET /api/user/reports** — Returns `{ latest_report: { report, recommendedProducts, recommendedDermatologists } \| null, past_reports: Report[] }` ordered by `created_at DESC`. Frontend normalizes to `Report[]` for backward compatibility.
- **GET /api/admin/system-health** — Now includes `total_users`, `total_assessments`, `total_reports`, `total_orders`; `worker_status` can be `"offline"` when heartbeat age > 120s.
- **GET /api/partner/store/analytics** — Response includes `average_order_value` and `repeat_customer_rate`.
- **POST /api/assistant** (frontend route + backend) — Per-user limits: 10/min, 50/day; 429 with message "Chat limit reached. Please try again later."; fallback "Assistant is temporarily unavailable. Please try again later." on OpenAI failure.

---

## 3. Database Changes

- **analytics_events** — Table created/ensured with `event_type`, `user_id`, `store_id`, `entity_type`, `entity_id`, `metadata` (JSONB), `created_at`; indexes on `event_type`, `created_at`.
- **Uniqueness** — One report per assessment (`uq_reports_assessment_id`); one routine log per (user, plan, date, time_of_day).
- **Indexes** — `idx_assessments_user_id`, `idx_reports_assessment_id`, `idx_orders_user_id`, `idx_products_store_id`, `idx_analytics_events_created_at`, `idx_analytics_events_event_type` (idempotent with IF NOT EXISTS / DO blocks where needed).

---

## 4. Queue and Worker Improvements

- **Job payload** — Includes `job_id` (UUID); existing fields unchanged for Python worker contract.
- **Duplicate prevention** — Lock key `assessment:processing:{assessment_id}` (SET NX, TTL); enqueue only if lock acquired; release lock if enqueue fails.
- **Retry / DLQ** — `incrementJobRetry(jobId)`, `resetJobRetry(jobId)`, `pushFailedJob(payload)` for worker retry (up to 2) and dead-letter list `ai:assessment:failed`.
- **Queue length** — `getQueueLength()` (LLEN ai:assessment:queue) already exposed; used in system health.
- **Worker status** — Heartbeat age > 120s → `worker_status: "offline"`; admin UI shows warning when offline or queue_length > 200.
- **Worker restart** — Documented: worker resumes BRPOP on `ai:assessment:queue`; stale locks expire via TTL.

---

## 5. Analytics Events Wired

| Event | Where |
|-------|--------|
| `assessment_started` | AssessmentService.create |
| `assessment_completed` | ReportService.createReportFromAssessment |
| `report_generated` | ReportService.createReportFromAssessment |
| `product_purchased` | WebhooksService.createOrderFromSession |
| `store_order_received` | WebhooksService.createOrderFromSession |
| `store_product_added` | InventoryService.addProduct |
| `chatbot_query` | Existing in ChatbotService (with rate_limited status in metadata) |
| `routine_logged` | RoutineService.upsertLog (already wired) |
| `consultation_booked` | ConsultationService (already wired) |

Schema supports `event_type`, `user_id`, `store_id`, `metadata`, `created_at`.

---

## 6. System Health and Frontend Stability

- **System health** — total_users, total_assessments, total_reports, total_orders from Supabase count queries; admin page shows 4 additional metric cards with `?? 0`.
- **Frontend** — Reports list normalized from structured API; dashboard and report detail pages guard with `Array.isArray(all) ? all : []`; admin analytics uses `?? 0` for counts; store analytics uses `revenueList`/`ordersList` and `customerRetentionPct` with safe defaults; store dashboard already had `normalizeDashboardStats`.

---

## 7. Chatbot Limits and Fallbacks

- **Limits** — 10 messages/minute, 50 messages/day per user/session; frontend and backend both enforce; day bucket pruned to 24h.
- **Message** — Rate limit: "Chat limit reached. Please try again later." (429).
- **Fallback** — OpenAI failure or service error: "Assistant is temporarily unavailable. Please try again later."; backend uses `TEMP_UNAVAILABLE_MESSAGE` in catch blocks.

---

## 8. Verification Checklist

| Flow | What to verify |
|------|----------------|
| **User** | Signup/login; start assessment → `assessment_started`; submit assessment (duplicate submit does not double-enqueue); report appears in GET /user/reports with latest/past shape; report detail and dashboard use normalized report list without errors. |
| **Store** | Login; add product → `store_product_added`; store dashboard and analytics load; analytics shows average_order_value and repeat_customer_rate with safe rendering. |
| **Admin** | GET /admin/system-health returns api_status, database_status, redis_status, worker_status, queue_length, last_worker_activity, uptime, total_users, total_assessments, total_reports, total_orders; system-health page shows all metrics and warning when worker offline or queue > 200. |
| **Chatbot** | Under limit: normal reply; 10 messages in 1 minute → 429 "Chat limit reached. Please try again later."; 50 messages in a day → same; OpenAI failure → "Assistant is temporarily unavailable. Please try again later." |
| **AI pipeline** | Enqueue job with job_id and lock; duplicate assessment id does not enqueue second job; worker processes queue and updates heartbeat; system health reflects worker_status and queue_length. |

---

*Report generated for Fix #6 — Production Hardening & Scalability.*
