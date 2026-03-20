# Admin Panel Backend — Completion Report

## Overview

A complete SaaS-grade platform governance system for AuraSkin AI has been implemented. The admin backend controls all subsystems: user moderation, store and product approval, dermatologist verification, order and consultation monitoring, platform analytics, and AI chatbot rules and usage logging.

---

## 1. Files Created / Updated

### Database schema

- **`backend/supabase/admin-panel-schema.sql`** (new)
  - Defines all admin governance tables and extends existing tables.

### Admin module — controllers

- **`backend/src/modules/admin/admin.controller.ts`** (updated)
  - Keeps `GET /admin/stats` and `GET /admin/reports`; applies admin throttle.
- **`backend/src/modules/admin/controllers/users.controller.ts`** (new)
- **`backend/src/modules/admin/controllers/stores.controller.ts`** (new)
- **`backend/src/modules/admin/controllers/dermatologists.controller.ts`** (new)
- **`backend/src/modules/admin/controllers/products.controller.ts`** (new)
- **`backend/src/modules/admin/controllers/analytics.controller.ts`** (new)
- **`backend/src/modules/admin/controllers/ai-management.controller.ts`** (new)
- **`backend/src/modules/admin/controllers/orders.controller.ts`** (new)
- **`backend/src/modules/admin/controllers/consultations.controller.ts`** (new)

### Admin module — services

- **`backend/src/modules/admin/services/audit.service.ts`** (new)
- **`backend/src/modules/admin/services/users.service.ts`** (new)
- **`backend/src/modules/admin/services/stores.service.ts`** (new)
- **`backend/src/modules/admin/services/dermatologists.service.ts`** (new)
- **`backend/src/modules/admin/services/products.service.ts`** (new)
- **`backend/src/modules/admin/services/analytics.service.ts`** (new)
- **`backend/src/modules/admin/services/ai-management.service.ts`** (new)
- **`backend/src/modules/admin/services/orders.service.ts`** (new)
- **`backend/src/modules/admin/services/consultations.service.ts`** (new)

### Admin module — repositories

- **`backend/src/modules/admin/repositories/users.repository.ts`** (new)
- **`backend/src/modules/admin/repositories/stores.repository.ts`** (new)
- **`backend/src/modules/admin/repositories/dermatologists.repository.ts`** (new)
- **`backend/src/modules/admin/repositories/products.repository.ts`** (new)
- **`backend/src/modules/admin/repositories/orders.repository.ts`** (new)
- **`backend/src/modules/admin/repositories/consultations.repository.ts`** (new)
- **`backend/src/modules/admin/repositories/ai-management.repository.ts`** (new)
- **`backend/src/modules/admin/repositories/index.ts`** (new)

### Admin module — DTOs

- **`backend/src/modules/admin/dto/review-notes.dto.ts`** (new)
- **`backend/src/modules/admin/dto/ai-rule.dto.ts`** (new)
- **`backend/src/modules/admin/dto/ai-usage-query.dto.ts`** (new)
- **`backend/src/modules/admin/dto/index.ts`** (new)

### Module wiring and app config

- **`backend/src/modules/admin/admin.module.ts`** (updated)
  - Registers all new controllers, services, repositories, and `AuditService`.
- **`backend/src/core/app.module.ts`** (updated)
  - Adds `admin` throttle: 200 requests per 60 seconds.

### Auth and AI integration

- **`backend/src/shared/guards/auth.guard.ts`** (updated)
  - Reads `profiles.blocked` and throws `UnauthorizedException("Account is blocked")` when `blocked === true`.
- **`backend/src/ai/assistant/chatbot.service.ts`** (updated)
  - Loads `blocked_keywords` from `ai_chatbot_rules` and enforces them.
  - Writes every chatbot request (success, refused, rate_limited, blocked) to `ai_usage_logs`.

---

## 2. Database Schema

### New tables (in `admin-panel-schema.sql`)

| Table | Purpose |
|-------|--------|
| **product_approvals** | Audit trail for product approval/rejection (product_id, store_id, approval_status, review_notes, reviewed_by). |
| **dermatologist_verification** | Pending/verified/rejected verification requests (dermatologist_id, verification_status, license_document, review_notes, reviewed_by). |
| **platform_notifications** | Broadcast messages by target_role (user, store, dermatologist, admin). |
| **ai_chatbot_rules** | Rules: rule_type (blocked_keywords, rate_limit, query_limit), rule_value. |
| **ai_usage_logs** | Per-request logs: user_id, query, response_tokens, model_used, status. |
| **admin_audit_logs** | Every admin action: admin_id, action, target_entity, target_id, details (jsonb). |

### Extensions to existing tables

- **profiles**
  - `blocked` boolean NOT NULL DEFAULT false (user moderation).
- **store_profiles**
  - `approval_status` text DEFAULT 'pending' CHECK (pending | approved | rejected).

### Indexes and RLS

- Indexes added on foreign keys and filtered columns (e.g. approval_status, verification_status, user_id, created_at, admin_id).
- RLS enabled on all new tables; backend uses service-role for access.

---

## 3. API Routes

Base path: **`/api/admin`**. All routes require **AuthGuard** and **RoleGuard("admin")** and are throttled at **200 requests per minute per IP**.

| Method | Path | Description |
|--------|------|-------------|
| GET | /admin/stats | Legacy stats (userCount, storeCount, etc.). |
| GET | /admin/reports | List reports. |
| GET | /admin/users | List all users (profiles). |
| GET | /admin/users/:id | User details. |
| PUT | /admin/users/block/:id | Block user. |
| PUT | /admin/users/unblock/:id | Unblock user. |
| GET | /admin/stores | List all store profiles. |
| GET | /admin/stores/:id | Store details. |
| PUT | /admin/stores/approve/:id | Approve store. |
| PUT | /admin/stores/reject/:id | Reject store. |
| GET | /admin/products/pending | Pending inventory items (products awaiting approval). |
| PUT | /admin/products/approve/:id | Approve product (inventory id). Body: optional `review_notes`. |
| PUT | /admin/products/reject/:id | Reject product (inventory id). Body: optional `review_notes`. |
| GET | /admin/dermatologists/pending | Pending dermatologist verification requests. |
| PUT | /admin/dermatologists/verify/:id | Verify dermatologist (:id = verification id). Body: optional `review_notes`. |
| PUT | /admin/dermatologists/reject/:id | Reject dermatologist (:id = verification id). Body: optional `review_notes`. |
| GET | /admin/orders | Platform-wide orders. |
| GET | /admin/orders/:id | Order details. |
| GET | /admin/consultations | Platform-wide consultations. |
| GET | /admin/consultations/:id | Consultation details. |
| GET | /admin/analytics | Metrics: total_users, total_stores, total_dermatologists, total_orders, total_revenue. |
| GET | /admin/ai/rules | List AI chatbot rules. |
| POST | /admin/ai/rules | Create rule. Body: `rule_type`, `rule_value`. |
| DELETE | /admin/ai/rules/:id | Delete rule. |
| GET | /admin/ai/usage | AI usage logs. Query: `user`, `model`, `date_from`, `date_to`. |

---

## 4. Security

- **Auth:** All admin routes use `AuthGuard` and `RoleGuard` with role `"admin"`. `request.user` is set by `AuthGuard` and used for `admin_id` in audit logs.
- **Blocked users:** `AuthGuard` reads `profiles.blocked` and rejects with `UnauthorizedException("Account is blocked")` when true.
- **Audit logging:** Every state-changing admin action calls `AuditService.log(adminId, action, target_entity, target_id, details)` and inserts into `admin_audit_logs`.
- **Service-role:** Supabase service-role key is used only in the backend; it is never exposed to the frontend.
- **Rate limiting:** Admin endpoints use `@Throttle({ default: { limit: 200, ttl: 60_000 } })` (200 requests per minute per IP). ThrottlerModule includes an `admin` limit in app config.

---

## 5. AI Governance

- **ai_chatbot_rules**
  - Admin can create/delete rules via `POST /admin/ai/rules` and `DELETE /admin/ai/rules/:id`.
  - `rule_type`: `blocked_keywords`, `rate_limit`, `query_limit`. `rule_value` is text (e.g. comma-separated keywords for blocked_keywords).
- **Chatbot integration**
  - At request time, `ChatbotService` loads `blocked_keywords` from `ai_chatbot_rules` and rejects the query if the normalized user text contains any keyword; abuse warnings and temporary blocking unchanged.
  - `rate_limit` and `query_limit` from DB can be consumed in a future iteration (currently in-memory limits remain).
- **ai_usage_logs**
  - Every chatbot request is logged: user_id, query (truncated), response_tokens, model_used, status (e.g. success, fallback, refused_spam, refused_blocked_keyword, rate_limited, blocked).
  - Admin views logs via `GET /admin/ai/usage` with optional filters: user, model, date_from, date_to.

---

## 6. Platform Analytics

**GET /admin/analytics** returns:

- **total_users** — count of `profiles`.
- **total_stores** — count of `store_profiles`.
- **total_dermatologists** — count of `dermatologist_profiles`.
- **total_orders** — count of `orders`.
- **total_revenue** — sum of `orders.total_amount` where `order_status != 'cancelled'`.

---

## 7. Data Flows

- **Product approval:** Store adds inventory (status `pending`) → Admin calls `PUT /admin/products/approve/:id` or reject → `inventory.status` updated and a row inserted into `product_approvals`; audit log written.
- **Dermatologist verification:** Admin sees pending rows from `dermatologist_verification` via `GET /admin/dermatologists/pending` → `PUT /admin/dermatologists/verify/:id` or reject → `dermatologist_verification` and `dermatologist_profiles.verified` updated; audit log written.
- **User blocking:** Admin calls `PUT /admin/users/block/:id` → `profiles.blocked = true` and audit log → subsequent requests for that user fail in `AuthGuard` with "Account is blocked".

---

## 8. Testing Checklist

1. Store submits product (inventory pending) → Admin reviews → Admin approves → Product visible (inventory status approved).
2. Dermatologist has a pending `dermatologist_verification` row → Admin verifies → Dermatologist profile `verified = true`.
3. Admin reviews AI usage logs via `GET /admin/ai/usage` (optional filters).
4. Admin blocks a user via `PUT /admin/users/block/:id` → Next request by that user returns 401 "Account is blocked".

---

## 9. Next Module

As per the prompt, the next module is **AI Engine System**: facial recognition, skin condition detection, AI recommendations, image validation.
