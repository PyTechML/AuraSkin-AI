# AuraSkin AI — Complete System Documentation (Code-Derived)

This document is generated from the **actual AuraSkin AI codebase** and Supabase SQL/migrations. It covers **frontend, backend API, database schema, AI engine, queues/background jobs, session handling, and data flows**.

Scope roots used:
- Frontend: `aura-skin-ai/frontend/web`
- Backend: `aura-skin-ai/backend`
- Supabase schema + migrations: `aura-skin-ai/backend/supabase`
- AI engine (Python): `aura-skin-ai/backend/ai-engine`

---

# 1. Project Overview

AuraSkin AI is a multi-panel web platform that provides:
- **User** skin assessment (questionnaire + **5 face images**), AI analysis, reports, and routine tracking.
- **Product marketplace** with **store partners** creating products and inventory, and **admin** moderation before products go live.
- **Dermatologist partner** features including profiles, slots, consultations, and earnings records.
- **Payments** (orders + consultations) and a notification/event system.
- A backend **AI processing pipeline** with a Redis queue + Python worker (and an optional HTTP AI engine mode).

Key user-visible features proven by routes/pages and APIs:
- User dashboard, assessment submission, progress polling, reports, routines, shop and checkout (`frontend/web/src/app/(app-shell)/(user)/**`, `backend/src/modules/user/**`, `backend/src/modules/public/**`, `backend/src/modules/payments/**`)
- Store panel inventory and product creation (`frontend/web/src/app/(app-shell)/(store)/**`, `backend/src/modules/partner/store/**`)
- Admin approvals for products, sessions, role requests, and system health (`frontend/web/src/app/(app-shell)/(admin)/**`, `backend/src/modules/admin/**`)
- Consultation real-time signaling via WebSocket gateway at `/consultation-signal` (`backend/src/modules/consultation/consultation.gateway.ts`)

---

# 2. System Architecture

## High-level architecture

The system has 5 primary runtime components:
- **Frontend**: Next.js App Router UI
- **Backend API**: NestJS (global prefix `/api`)
- **Database**: Supabase Postgres + Supabase Auth
- **Queue/Cache**: Redis (optional in dev; backend has in-memory fallback for progress)
- **AI Engine**: Python worker consuming Redis jobs (plus optional FastAPI server)

Architecture Diagram (ASCII):

```text
[Browser: Next.js Frontend]
        |
        |  HTTPS (fetch)   Authorization: Bearer <Supabase JWT>
        v
[NestJS Backend API  /api/*]
        |
        |  (A) Supabase Auth (JWT validation via anon key)
        |  (B) Supabase Postgres (service role key for DB reads/writes)
        v
[Supabase (Auth + Postgres)]
        ^
        |                      +------------------------------+
        |                      | Redis (optional)             |
        |                      | - ai:assessment:queue        |
        |                      | - assessment:progress:<id>   |
        |                      +------------------------------+
        |                                   ^
        |                                   | BRPOP/LPUSH
        |                                   v
        |                      +------------------------------+
        |                      | Python AI Worker             |
        |                      | - runs OpenCV pipeline        |
        |                      | - inserts reports/routines    |
        |                      | - writes progress to Redis    |
        |                      +------------------------------+
        |
        +--> Response back to Frontend (JSON)
              - Frontend polls progress until report_id exists
```

Notes (from code):
- Backend sets `app.setGlobalPrefix("api")` (`backend/src/main.ts`).
- AuthGuard validates the JWT via `supabase.auth.getUser(token)` (anon key) then loads role/profile from `profiles` via service-role key (`backend/src/shared/guards/auth.guard.ts`).
- AI processing is normally **queued to Redis** (`backend/src/jobs/aiProcessing.queue.ts`) and processed by the Python worker (`backend/ai-engine/workers/analysis_worker.py`).
- Backend also has a **synchronous fallback mode** when Redis is absent but `AI_ENGINE_URL` is configured (`backend/src/modules/user/services/assessment.service.ts`).

---

# 3. Tech Stack Breakdown

## Frontend
Source: `frontend/web/package.json`
- **Next.js** `14.2.15` (App Router)
- **React** `18.x`
- **Zustand** (client auth state persisted to `localStorage`)
- **React Hook Form** + **Zod** (forms + validation)
- **Tailwind CSS** + Radix UI components
- **Framer Motion** (UI animations)

## Backend API
Source: `backend/package.json`
- **NestJS** `10.x`
- **Supabase JS** `@supabase/supabase-js`
- **Redis** `ioredis`
- **Scheduling** `@nestjs/schedule` (cron jobs)
- **Throttling** `@nestjs/throttler` (rate limits)
- **Stripe** (payments/webhooks)
- **Socket.io** (`@nestjs/platform-socket.io`, `socket.io`) for consultation signaling
- **Prometheus metrics**: `prom-client` (exposed at `GET /api/metrics`)
- **Sentry**: `@sentry/node`

## Database
Source: `backend/supabase/*.sql` and `backend/supabase/migrations/*.sql`
- **Supabase Postgres** schema + RLS policies
- **Supabase Auth** (`auth.users`) with a `profiles` shadow table in `public`

## AI Engine
Source: `backend/ai-engine/**`
- **OpenCV** (`cv2`)
- **MediaPipe** FaceMesh (best-effort landmarks; not required for pipeline completion)
- **Redis** (job queue + progress keys)
- **supabase-py** (service role key writes to Postgres)
- Optional **FastAPI** AI server (`backend/ai-engine/api/ai_server.py`)

## Auth
Source: `backend/src/shared/guards/auth.guard.ts`, `backend/src/services/auth/auth.controller.ts`, Supabase SQL
- JWT validation: Supabase anon client `auth.getUser(token)`
- Role/profile source of truth: `public.profiles` table
- Rate-limited auth endpoints (`@Throttle({ auth: { limit: 10, ttl: 60_000 } })`)

## State Management (frontend)
Source: `frontend/web/src/store/authStore.ts`
- Zustand `persist()` store named **`auraskin-auth`** in `localStorage`
- Persisted fields include `accessToken` (JWT) and `sessionToken` (heartbeat token)

---

# 4. Authentication System

## Login flow (code-derived)
Backend route: `POST /api/auth/login` (`backend/src/services/auth/auth.controller.ts`)
- Input: `{ email, password, requested_role? }`
- On success: backend returns an **access token (JWT)** and user payload (and a `sessionToken` is used by the frontend after login).

Frontend route: `frontend/web/src/app/(auth)/login/page.tsx`
- Calls `POST /api/auth/login`
- Stores `accessToken` + `sessionToken` in Zustand persisted store (`auraskin-auth`)
- Redirect is restricted by role via `isRedirectAllowedForRole()` (`frontend/web/src/store/authStore.ts`)

## Signup flow (code-derived)
Backend route: `POST /api/auth/signup` (`backend/src/services/auth/auth.controller.ts`)
- Input: `{ email, password, name? }`
- Supabase trigger inserts `profiles` row on user creation (`backend/supabase/auth-profiles-schema.sql`)

## Token handling
Frontend:
- Stores the JWT as `accessToken` in `localStorage` via Zustand persist (`frontend/web/src/store/authStore.ts`).
- Adds it to API calls as `Authorization: Bearer <accessToken>` (`frontend/web/src/services/apiInternal.ts` + `api.ts`).

Backend:
- Extracts bearer token from request header (`backend/src/shared/guards/auth.guard.ts`).
- Validates token via Supabase anon client:
  - `createClient(url, anonKey).auth.getUser(token)`
- Loads the profile via service-role client:
  - `getSupabaseClient().from("profiles").select(...).eq("id", user.id).single()`
- Sets `request.user = { id, email, role, fullName, avatarUrl }`

## Session handling (heartbeat token)
Frontend:
- When authenticated and `sessionToken` exists, calls `/api/session/heartbeat` every **60 seconds** (`frontend/web/src/providers/AuthProvider.tsx`).

Backend:
- Session endpoints (`backend/src/modules/session/session.controller.ts`):
  - `POST /api/session/heartbeat` (204)
  - `POST /api/session/logout` (204)
- SessionService writes to `user_sessions` table (`backend/src/modules/session/session.service.ts`, `backend/src/modules/session/session.repository.ts`).
- Cron job expires stale sessions every **5 minutes** if inactive for **30 minutes** (`backend/src/modules/session/session-cron.service.ts`).

## Role-based access (User, Store, Admin, Dermatologist)
Backend uses `RoleGuard` with controller metadata (`ROLES_KEY`) across all panels. Examples:
- User panel controllers use `SetMetadata(ROLES_KEY, ["user"])`
- Store panel controllers use `SetMetadata(ROLES_KEY, ["store"])`
- Dermatologist panel controllers use `SetMetadata(ROLES_KEY, ["dermatologist"])`
- Admin panel controllers use `SetMetadata(ROLES_KEY, ["admin"])`

Flow Diagram:

```text
User -> POST /api/auth/login (email/password)
  -> Supabase Auth issues JWT
  -> Frontend stores JWT in localStorage (auraskin-auth.accessToken)
  -> Frontend calls backend with Authorization: Bearer <JWT>
  -> AuthGuard validates JWT via Supabase anon
  -> AuthGuard loads profile(role) from public.profiles via service role
  -> RoleGuard checks required role for the endpoint
```

Additional rule in AuthGuard:
- “Master admin rule”: only `admin@auraskin.ai` may have `admin` role (`backend/src/shared/guards/auth.guard.ts`).

---

# 5. Database Design (VERY IMPORTANT)

**Source of truth** for DB schema:
- Base schemas: `backend/supabase/*.sql`
- Migrations: `backend/supabase/migrations/*.sql`
- Backend typed models: `backend/src/database/models/index.ts`

Below is the table inventory with **purpose, key columns, and relationships** (FKs/constraints are shown where explicitly defined in SQL/migrations).

## Authentication & profile

### `profiles`
Source: `backend/supabase/auth-profiles-schema.sql` + `backend/supabase/admin-panel-schema.sql`
- **Purpose**: role + profile data linked to Supabase Auth user.
- **Columns**:
  - `id uuid PK` (FK → `auth.users(id)` ON DELETE CASCADE)
  - `email text`
  - `role text` CHECK `('user','store','dermatologist','admin')` default `'user'`
  - `full_name text`
  - `avatar_url text`
  - `created_at timestamptz default now()`
  - `blocked boolean not null default false` (added by admin schema)
- **Notes**:
  - Trigger `on_auth_user_created` inserts a `profiles` row on signup.

## Public marketplace/content

### `products`
Source: `backend/supabase/public-panel-schema.sql`
- **Purpose**: product catalog entries created by stores and moderated by admin.
- **Columns (selected)**:
  - `id uuid PK`
  - `name text not null`
  - `description text`, `category text`, `image_url text`, `price numeric`
  - `store_id uuid` (not declared FK in SQL; backend uses it as store partner user id)
  - `brand text`, `rating numeric`
  - `skin_type text[]`, `concern text[]`
  - `full_description text`, `key_ingredients text[]`, `usage text`, `safety_notes text`
  - `approval_status text default 'LIVE' CHECK ('PENDING','LIVE','REJECTED')`
  - `created_at timestamptz default now()`

### `stores`
Source: `backend/supabase/public-panel-schema.sql`
- **Purpose**: public store directory (static marketplace “stores”).
- **Columns**: `id, name, address, city, latitude, longitude, contact_number, description, opening_hours, status, created_at`

### `dermatologists`
Source: `backend/supabase/public-panel-schema.sql`
- **Purpose**: public dermatologist directory.
- **Columns**: `id, name, clinic_name, city, specialization, latitude, longitude, contact_number, profile_image, email, years_experience, consultation_fee, rating, created_at`

### `blogs`
Source: `backend/supabase/public-panel-schema.sql`
- **Columns**: `id, title, slug(unique), content, cover_image, summary, category, created_at`

### `faq`
Source: `backend/supabase/public-panel-schema.sql`
- **Columns**: `id, question, answer`

### `contact_messages`
Source: `backend/supabase/public-panel-schema.sql`
- **Purpose**: contact-us submissions.
- **Columns**: `id, name, email, subject, message, created_at`

## Store partner panel

### `store_profiles`
Source: `backend/supabase/store-panel-schema.sql` + `backend/supabase/admin-panel-schema.sql`
- **Purpose**: store-partner profile (id matches `profiles.id`)
- **Columns**:
  - `id uuid PK` (FK → `profiles(id)` ON DELETE CASCADE)
  - `store_name, store_description, address, city, latitude, longitude, contact_number, logo_url, created_at`
  - `approval_status text default 'pending' CHECK ('pending','approved','rejected')`

### `inventory`
Source: `backend/supabase/store-panel-schema.sql`
- **Purpose**: store listings for products (moderation happens here).
- **Columns**:
  - `id uuid PK`
  - `store_id uuid` (FK → `store_profiles(id)` ON DELETE CASCADE)
  - `product_id uuid` (FK → `products(id)` ON DELETE CASCADE)
  - `stock_quantity int default 0`
  - `price_override numeric`
  - `status text default 'pending' CHECK ('pending','approved','rejected')`
  - `created_at timestamptz default now()`
  - `UNIQUE(store_id, product_id)`

### `orders`
Source: `backend/supabase/store-panel-schema.sql`
- **Purpose**: user purchases from stores.
- **Columns**:
  - `id uuid PK`
  - `user_id uuid` (FK → `profiles(id)` ON DELETE CASCADE)
  - `store_id uuid` (FK → `store_profiles(id)` ON DELETE CASCADE)
  - `order_status text default 'pending' CHECK (pending|confirmed|packed|shipped|delivered|cancelled)`
  - `total_amount numeric`, `tracking_number text`
  - `created_at`, `updated_at`

### `order_items`
Source: `backend/supabase/store-panel-schema.sql`
- **Columns**: `id uuid PK`, `order_id FK → orders`, `product_id FK → products`, `quantity`, `price`

### `store_notifications`
Source: `backend/supabase/store-panel-schema.sql`
- **Columns**: `id uuid PK`, `store_id FK → store_profiles`, `type`, `message`, `is_read`, `created_at`

## User panel (assessments/reports/recommendations/routines)

### `assessments`
Source: `backend/supabase/user-panel-schema.sql`
- **Columns**: `id uuid PK`, `user_id FK → profiles`, `skin_type`, `primary_concern`, `secondary_concern`, `sensitivity_level`, `current_products`, `lifestyle_factors`, `created_at`

### `assessment_images`
Source: `backend/supabase/user-panel-schema.sql` + migration `20250307000000_assessment_five_angles_and_reports_redness.sql`
- **Purpose**: store 5 required face images per assessment (legacy 3 also allowed).
- **Columns**:
  - `id uuid PK`
  - `assessment_id FK → assessments`
  - `image_type text` CHECK includes: `front_face`, `left_profile`, `right_profile`, `upward_angle`, `downward_angle` (plus legacy `front/left/right`)
  - `image_url text`
  - `created_at`

### `reports`
Source: `backend/supabase/user-panel-schema.sql` + migrations:
- `20250307000000_assessment_five_angles_and_reports_redness.sql` (adds `redness_score`, `inflammation_level`)
- `20260318000000_reports_skin_score_and_routines.sql` (adds `skin_score` + constraint)
- `20260314001000_db_integrity_and_indexes.sql` (unique index `uq_reports_assessment_id`)
- **Columns (combined)**:
  - `id uuid PK`
  - `user_id FK → profiles`
  - `assessment_id FK → assessments`
  - `skin_condition text`
  - `skin_score numeric` with check \(0..100\) when present
  - `acne_score numeric`, `pigmentation_score numeric`, `hydration_score numeric`
  - `redness_score numeric`, `inflammation_level text`
  - `recommended_routine text`
  - `created_at`
- **Integrity**:
  - One report per assessment: `uq_reports_assessment_id` on `reports(assessment_id)`

### `recommended_products`
Source: `backend/supabase/user-panel-schema.sql`
- **Columns**: `id uuid PK`, `report_id FK → reports`, `product_id FK → products`, `confidence_score numeric`

### `recommended_dermatologists`
Source: `backend/supabase/user-panel-schema.sql`
- **Columns**: `id uuid PK`, `report_id FK → reports`, `dermatologist_id FK → dermatologists`, `distance_km numeric`

### `routine_plans`
Source: migration `20260318000000_reports_skin_score_and_routines.sql`
- **Columns**: `id uuid PK`, `user_id FK → profiles`, `report_id FK → reports`, arrays for `morning_routine`, `night_routine`, lifestyle arrays, `created_at`
- **Uniqueness**: `uq_routine_plans_report_id` on `(report_id)`

### `routine_logs`
Source: migration `20260318000000_reports_skin_score_and_routines.sql` + integrity migration `20260314001000_db_integrity_and_indexes.sql`
- **Columns**: `id uuid PK`, `user_id FK → profiles`, `routine_plan_id FK → routine_plans`, `date`, `time_of_day CHECK ('morning','night')`, `status CHECK ('completed','skipped')`, `created_at`
- **Uniqueness**: unique index `(user_id, routine_plan_id, date, time_of_day)` (prevents duplicates per slot)

## Dermatologist partner + consultations

### `dermatologist_profiles`
Source: `backend/supabase/dermatologist-panel-schema.sql`
- **Columns**: `id uuid PK FK → profiles`, clinic + geo + license fields, `verified boolean`, `created_at`

### `consultation_slots`
Source: `backend/supabase/dermatologist-panel-schema.sql`
- **Columns**: `id uuid PK`, `dermatologist_id FK → dermatologist_profiles`, `slot_date`, `start_time`, `end_time`, `status CHECK ('available','booked','blocked')`, `created_at`

### `consultations`
Source: `backend/supabase/dermatologist-panel-schema.sql`
- **Columns**: `id uuid PK`, `user_id FK → profiles`, `dermatologist_id FK → dermatologist_profiles`, `slot_id FK → consultation_slots`, `consultation_status CHECK ('pending','confirmed','completed','cancelled')`, `consultation_notes`, `created_at`

### `prescriptions`
Source: `backend/supabase/dermatologist-panel-schema.sql`
- **Columns**: `id uuid PK`, `consultation_id FK → consultations`, `user_id FK → profiles`, `dermatologist_id FK → dermatologist_profiles`, `prescription_text`, `recommended_products uuid[]`, `follow_up_required`, `created_at`

### `dermatologist_notifications`
Source: `backend/supabase/dermatologist-panel-schema.sql`
- **Columns**: `id uuid PK`, `dermatologist_id FK → dermatologist_profiles`, `type`, `message`, `is_read`, `created_at`

### `earnings`
Source: `backend/supabase/dermatologist-panel-schema.sql`
- **Columns**: `id uuid PK`, `dermatologist_id FK → dermatologist_profiles`, `consultation_id FK → consultations`, `amount`, `status CHECK ('pending','paid')`, `created_at`

### `consultation_sessions`
Source: migration `20250307200000_consultation_sessions_messages_recordings.sql`
- **Columns**:
  - `consultation_id FK → consultations`
  - `room_id text UNIQUE`
  - `session_token text`
  - `session_status CHECK ('scheduled','active','completed','cancelled')`
  - token expiry and join/leave timestamps

### `consultation_messages`
Source: migration `20250307200000_consultation_sessions_messages_recordings.sql`
- **Columns**: `consultation_id FK → consultations`, `sender_id FK → profiles`, `message`, `created_at`

### `consultation_recordings`
Source: migration `20250307200000_consultation_sessions_messages_recordings.sql`
- **Columns**: `consultation_id FK → consultations`, `recording_url`, `duration`, `created_at`

## Payments

### `payments`
Source: migration `20250307100000_payment_tables.sql`
- **Columns**: `user_id FK → profiles`, optional `order_id FK → orders`, optional `consultation_id FK → consultations`, `payment_method`, `amount`, `currency`, `payment_status CHECK (pending|completed|failed|refunded)`, `stripe_payment_id`, `created_at`

### `payouts`
Source: migration `20250307100000_payment_tables.sql`
- **Columns**: `recipient_id FK → profiles`, `recipient_type CHECK (store|dermatologist)`, `amount`, `payout_status CHECK (pending|paid|failed)`, `stripe_transfer_id`, `created_at`

### `refunds`
Source: migration `20250307100000_payment_tables.sql`
- **Columns**: `payment_id FK → payments`, `refund_amount`, `reason`, `refund_status CHECK (pending|completed|failed)`, `created_at`

### `payment_audit_logs`
Source: migration `20250307100000_payment_tables.sql`
- **Columns**: `event_type`, `details jsonb`, `created_at`

## Notifications & events

### `notifications`
Source: migration `20250307300000_notification_system.sql`
- **Columns**: `recipient_id FK → profiles`, `recipient_role`, `type`, `title`, `message`, `is_read`, `metadata jsonb`, `created_at`

### `notification_events`
Source: migration `20250307300000_notification_system.sql`
- **Columns**: `event_type`, `payload jsonb`, `status CHECK (pending|processed|failed)`, `created_at`

### `notification_preferences`
Source: migration `20250307300000_notification_system.sql`
- **Columns**: `user_id FK → profiles UNIQUE`, `email_enabled`, `push_enabled`, `in_app_enabled`, `created_at`, `updated_at`

## Analytics

### `analytics_events`
Source: migrations `20260314000000_analytics_events_and_indexes.sql` + `20260314100000_analytics_events_fk.sql`
- **Columns**: `event_type`, `user_id FK → profiles (ON DELETE SET NULL)`, `store_id FK → store_profiles (ON DELETE SET NULL)`, `entity_type`, `entity_id`, `metadata jsonb`, `created_at`

## Sessions & governance

### `user_sessions`
Source: migration `20260314110000_user_sessions.sql`
- **Purpose**: session tracking with heartbeat updates + admin session management.
- **Columns**: `user_id`, `session_token UNIQUE`, `ip_address`, `device_info`, `login_time`, `last_activity`, `status CHECK (ACTIVE|INACTIVE|EXPIRED|SUSPICIOUS)`, `logout_time`

### `role_requests`
Source: migration `20260314120000_role_requests.sql`
- **Columns**: `user_id FK → profiles`, `requested_role CHECK (store|dermatologist|admin)`, `status CHECK (pending|approved|rejected)`, `reviewed_at`, `reviewed_by FK → profiles`, `created_at`

### Admin panel tables
Source: `backend/supabase/admin-panel-schema.sql`
- `product_approvals` (audit trail for moderation)
- `dermatologist_verification`
- `platform_notifications`
- `ai_chatbot_rules`
- `ai_usage_logs`
- `admin_audit_logs`

---

# 6. ER Diagram (ASCII)

This ERD focuses on the **FK relationships explicitly declared** in SQL/migrations.

```text
[auth.users]
  └── id (PK)
        |
        v
[profiles]
  ├── id (PK, FK -> auth.users.id)
  ├── role
  └── blocked
        |
        +--------------------+
        |                    |
        v                    v
[store_profiles]        [dermatologist_profiles]
  └── id (PK, FK)         └── id (PK, FK)
        |                    |
        |                    +----------------------+
        |                                           |
        v                                           v
[inventory]                                 [consultation_slots]
  ├── store_id (FK -> store_profiles.id)      └── dermatologist_id (FK)
  └── product_id (FK -> products.id)
        |
        v
[products]  (approval_status: PENDING|LIVE|REJECTED)

[assessments]
  ├── id (PK)
  └── user_id (FK -> profiles.id)
        |
        v
[assessment_images]
  └── assessment_id (FK -> assessments.id)

[reports]
  ├── user_id (FK -> profiles.id)
  └── assessment_id (FK -> assessments.id)  (unique index)
        |
        +-------------------------+
        |                         |
        v                         v
[recommended_products]     [recommended_dermatologists]
  ├── report_id (FK)         ├── report_id (FK)
  └── product_id (FK)        └── dermatologist_id (FK -> dermatologists.id)

[routine_plans]
  ├── user_id (FK -> profiles.id)
  └── report_id (FK -> reports.id) (unique index)
        |
        v
[routine_logs]
  └── routine_plan_id (FK -> routine_plans.id)

[orders]
  ├── user_id (FK -> profiles.id)
  └── store_id (FK -> store_profiles.id)
        |
        v
[order_items]
  └── order_id (FK -> orders.id)

[consultations]
  ├── user_id (FK -> profiles.id)
  ├── dermatologist_id (FK -> dermatologist_profiles.id)
  └── slot_id (FK -> consultation_slots.id)
        |
        +----------------------------+
        |                            |
        v                            v
[consultation_sessions]       [consultation_messages]
  └── consultation_id (FK)      └── consultation_id (FK)
                                 └── sender_id (FK -> profiles.id)
        |
        v
[consultation_recordings]
  └── consultation_id (FK)

[payments]
  ├── user_id (FK -> profiles.id)
  ├── order_id (FK -> orders.id, set null)
  └── consultation_id (FK -> consultations.id, set null)

[refunds] -> payment_id (FK -> payments.id)

[notifications] -> recipient_id (FK -> profiles.id)

[user_sessions] -> user_id (FK -> profiles.id, set null)

[role_requests]
  ├── user_id (FK -> profiles.id)
  └── reviewed_by (FK -> profiles.id, set null)

[analytics_events]
  ├── user_id (FK -> profiles.id, set null)
  └── store_id (FK -> store_profiles.id, set null)
```

---

# 7. Data Flow Diagram (DFD)

## LEVEL 0

```text
[User] -> [AuraSkin System] -> [Database] -> [User Output]
```

## LEVEL 1

```text
User
  -> Frontend (Next.js)
  -> Backend API (/api)
  -> Supabase (Auth + Postgres)
  -> (optional) Redis queue/progress
  -> AI Engine (Python worker or HTTP engine)
  -> Backend API (/api)
  -> Frontend UI (polling/refresh)
```

## LEVEL 2 (Assessment → Report → Routine → Dashboard)

```text
AssessmentStart
  -> POST /api/user/assessment               (creates assessments row)
  -> POST /api/user/assessment/upload        (uploads 3 face images, inserts assessment_images rows)
  -> POST /api/user/assessment/submit        (enqueue Redis job OR run HTTP AI engine sync fallback)
  -> GET  /api/user/assessment/progress/:id  (frontend polls every 2s, up to 180 attempts)
  -> report_id becomes available
  -> GET  /api/user/reports/:id              (report + recommendations)
  -> GET  /api/user/routines/current         (routine plan)
  -> POST /api/user/routines/logs            (adherence logs)
  -> Dashboard refresh (focus/visibility + 10s interval)
```

---

# 8. Assessment & AI Pipeline

## Step-by-step (normal mode: Redis queue + Python worker)

1. **User creates assessment**  
   - `POST /api/user/assessment` creates `assessments` row (`backend/src/modules/user/services/assessment.service.ts`)

2. **User uploads images (5 angles)**  
   - `POST /api/user/assessment/upload?assessmentId=...` expects fields:
     - `front_face`, `left_profile`, `right_profile`, `upward_angle`, `downward_angle`
   - Backend uploads to temporary storage and inserts `assessment_images` rows (`assessment.service.ts`)

3. **User submits for analysis**  
   - `POST /api/user/assessment/submit` enqueues job payload (JSON) into Redis list `ai:assessment:queue` (`backend/src/jobs/aiProcessing.queue.ts`, `backend/src/redis/redis.service.ts`)
   - Backend sets progress stage `queued` to Redis key `assessment:progress:<assessmentId>` (`redis.service.ts`)

4. **Python worker consumes queue**  
   - `BRPOP ai:assessment:queue`
   - Validates payload requires at least **3** `imageUrls` (`backend/ai-engine/workers/analysis_worker.py`)

5. **OpenCV pipeline runs**  
   - Stages in `backend/ai-engine/pipelines/skin_analysis_pipeline.py`:
     - `image_validation` → `face_detection` → `landmark_detection` (best-effort)  
     - `feature_extraction` (acne + redness)  
     - `skin_classification` → `recommendation_generation` → `completed`

6. **Report generation + inserts**  
   Worker inserts:
   - `reports` row (including computed `skin_score`)
   - `recommended_products` rows (linking report → product ids)
   - `recommended_dermatologists` rows
   - `routine_plans` row (best-effort; does not fail the job if routine insert fails)

7. **Progress updates**  
   Worker updates `assessment:progress:<id>` with JSON:
   - `{ progress, stage, report_id? , error? }`

8. **Frontend polling completes**  
   - Frontend polls every **2s** (`POLL_INTERVAL_MS=2000`) up to **180 attempts** (~6 minutes) (`frontend/web/src/app/(app-shell)/(user)/dashboard/assessment/review/page.tsx`)
   - When `progress===100` and `report_id` exists, frontend navigates to `/reports/<report_id>`

Flow (ASCII):

```text
User -> SubmitAssessment
  -> Backend: enqueue job + set progress queued
  -> Redis: ai:assessment:queue + assessment:progress:<id>
  -> Python Worker: BRPOP job
  -> Pipeline: validate -> detect_face -> extract_features -> classify
  -> Supabase: insert reports + recommendations + routine_plans
  -> Redis: set progress completed + report_id
  -> Frontend: GET progress until report_id then show report
```

## Synchronous fallback mode (no Redis)
In `backend/src/modules/user/services/assessment.service.ts`:
- If `AI_ENGINE_URL` is configured and Redis is not reachable (`!redis.ping()`), backend can run:
  - HTTP AI engine call: `POST <AI_ENGINE_URL>/analyze` with `{ assessment_id, image_urls }` (`backend/src/ai/analysis/ai-engine-analysis.service.ts`)
- Progress polling still works because backend stores progress in memory if Redis is absent (`backend/src/redis/redis.service.ts`).

---

# 9. Product Pipeline (Store → Admin → User)

This pipeline is implemented with **two separate state markers**:
- `products.approval_status` (`PENDING|LIVE|REJECTED`) (public visibility gate)
- `inventory.status` (`pending|approved|rejected`) (store listing moderation gate; also used by recommendation filtering)

## Store creates product (PENDING)
Endpoint:
- `POST /api/partner/store/products` (`backend/src/modules/partner/store/store.controller.ts`)

Behavior (code):
- Inserts a new row in `products` with `approval_status: "PENDING"` (`backend/src/modules/partner/store/services/inventory.service.ts`)
- Creates a corresponding `inventory` row with `status: "pending"` (`backend/src/modules/partner/store/repositories/inventory.repository.ts`)

## Admin reviews and approves/rejects
Endpoints:
- `GET /api/admin/products/pending`
- `PUT /api/admin/products/approve/:id` (id is the **inventory id**)
- `PUT /api/admin/products/reject/:id`
Source: `backend/src/modules/admin/controllers/products.controller.ts`

Behavior (code):
- Approval (`backend/src/modules/admin/services/products.service.ts`):
  - Update `inventory.status` → `"approved"`
  - Update `products.approval_status` → `"LIVE"`
  - Insert `product_approvals` record (audit trail)
- Rejection:
  - Update `inventory.status` → `"rejected"`
  - Update `products.approval_status` → `"REJECTED"`
  - Insert `product_approvals` record

## User sees only LIVE + approved inventory
Public listing filter (code):
- Public API only includes products that:
  - have at least one `inventory` row with `status="approved"`, AND
  - `products.approval_status="LIVE"`
Source: `backend/src/modules/public/public.repository.ts`

User recommendation filter (code):
- Recommended products for reports are filtered by:
  - `inventory.status="approved"` for the product ids linked in `recommended_products`
Source: `backend/src/modules/user/repositories/report.repository.ts`

Product pipeline diagram:

```text
Store -> POST /api/partner/store/products
  -> products.approval_status = PENDING
  -> inventory.status = pending

Admin -> GET /api/admin/products/pending
Admin -> PUT /api/admin/products/approve/:inventoryId
  -> inventory.status = approved
  -> products.approval_status = LIVE
  -> product_approvals insert (audit)

User/Public -> GET /api/products
  -> returns only: inventory.status=approved AND products.approval_status=LIVE
```

---

# 10. API Structure

All routes below are **prefixed with `/api`** (global prefix in `backend/src/main.ts`).

## Auth
Source: `backend/src/services/auth/auth.controller.ts`
- `POST /api/auth/login` (rate-limited `auth: 10/min`)
- `POST /api/auth/signup` (rate-limited `auth: 10/min`)
- `GET /api/auth/me` (Bearer required)

## Session (heartbeat/logout)
Source: `backend/src/modules/session/session.controller.ts`
- `POST /api/session/heartbeat` (body: `{ session_token? }`, returns 204)
- `POST /api/session/logout` (body: `{ session_token? }`, returns 204)

## Public (unauthenticated)
Source: `backend/src/modules/public/public.controller.ts`
- `GET /api/products`
- `GET /api/products/similar/:id`
- `GET /api/products/:id`
- `GET /api/stores/nearby`
- `GET /api/stores`
- `GET /api/stores/:id`
- `GET /api/dermatologists/nearby`
- `GET /api/dermatologists`
- `GET /api/dermatologists/:id`
- `GET /api/blogs`
- `GET /api/blogs/:slug`
- `GET /api/faq`
- `POST /api/contact`

## User panel (role=user)
Sources: `backend/src/modules/user/*.controller.ts`, `backend/src/modules/user/controllers/*.ts`
- Dashboard:
  - `GET /api/user/dashboard`
  - `GET /api/user/dashboard-metrics`
- Orders:
  - `GET /api/user/orders`
  - `GET /api/user/orders/:id`
- Assessment:
  - `POST /api/user/assessment`
  - `POST /api/user/assessment/upload`
  - `POST /api/user/assessment/submit` (returns 202)
  - `GET /api/user/assessment/progress/:id`
- Reports + recommendations:
  - `GET /api/user/reports`
  - `GET /api/user/reports/:id`
  - `GET /api/user/reports/by-assessment/:assessmentId`
  - `GET /api/user/shop/recommended-products`
- Routines:
  - `GET /api/user/routines/current`
  - `GET /api/user/routines/logs`
  - `POST /api/user/routines/logs`

## Partner Store panel (role=store)
Sources: `backend/src/modules/partner/store/*.controller.ts`
- Store profile:
  - `GET /api/partner/store/profile`
  - `POST /api/partner/store/profile`
  - `PUT /api/partner/store/profile`
- Product create (pending):
  - `POST /api/partner/store/products`
- Inventory:
  - `GET /api/partner/store/inventory`
  - `POST /api/partner/store/inventory/add`
  - `PUT /api/partner/store/inventory/update/:id`
  - `DELETE /api/partner/store/inventory/delete/:id`
- Orders:
  - `GET /api/partner/store/orders`
  - `GET /api/partner/store/orders/:id`
  - `PUT /api/partner/store/orders/status/:id`
  - `PUT /api/partner/store/orders/:id/tracking`
- Dashboard + analytics:
  - `GET /api/partner/store/dashboard`
  - `GET /api/partner/store/analytics`
- Notifications:
  - `GET /api/partner/store/notifications`
  - `PUT /api/partner/store/notifications/read/:id`

## Partner Dermatologist panel (role=dermatologist)
Sources: `backend/src/modules/partner/dermatologist/*.controller.ts`
- Profile:
  - `GET /api/partner/dermatologist/profile`
  - `POST /api/partner/dermatologist/profile`
  - `PUT /api/partner/dermatologist/profile`
- Patients + notifications:
  - `GET /api/partner/dermatologist/patients`
  - `GET /api/partner/dermatologist/patients/:id`
  - `GET /api/partner/dermatologist/notifications`
  - `PUT /api/partner/dermatologist/notifications/read/:id`
- Consultations:
  - `GET /api/partner/dermatologist/consultations`
  - `GET /api/partner/dermatologist/consultations/:id`
  - `PUT /api/partner/dermatologist/consultations/approve/:id`
  - `PUT /api/partner/dermatologist/consultations/reject/:id`
- Slots:
  - `GET /api/partner/dermatologist/slots`
  - `POST /api/partner/dermatologist/slots/create`
  - `PUT /api/partner/dermatologist/slots/update/:id`
  - `DELETE /api/partner/dermatologist/slots/delete/:id`
- Prescriptions:
  - `POST /api/partner/dermatologist/prescriptions/create`
  - `GET /api/partner/dermatologist/prescriptions/:consultationId`
- Earnings:
  - `GET /api/partner/dermatologist/earnings`

## Consultation (role=user and/or dermatologist, plus WebSocket)
Sources:
- HTTP: `backend/src/modules/consultation/controllers/consultation.controller.ts`
- WS: `backend/src/modules/consultation/consultation.gateway.ts`

HTTP endpoints:
- `POST /api/consultation/create-room` (role=user)
- `POST /api/consultation/join-room` (role=user|dermatologist)
- `POST /api/consultation/leave-room` (role=user|dermatologist)
- `GET /api/consultation/session-status/:consultationId` (role=user|dermatologist)

WebSocket gateway:
- Path: `/consultation-signal`
- Auth: Supabase JWT token passed via socket handshake `auth.token` or `query.token`
- Join flow: client emits `join-room` with `{ room_id, session_token }`

## Payments
Sources: `backend/src/modules/payments/controllers/*.ts`
- User:
  - `POST /api/payments/create-checkout`
  - `POST /api/payments/consultation`
  - `POST /api/payments/confirm`
  - `GET /api/payments/history`
  - `POST /api/payments/refund`
- Admin:
  - `POST /api/payments/payout/store/:storeId`
- Webhook (no AuthGuard):
  - `POST /api/payments/webhook` (requires `rawBody` and `stripe-signature`)

## Notifications
Sources: `backend/src/modules/notifications/controllers/*.ts`
- User/store/dermatologist/admin:
  - `GET /api/notifications`
  - `PUT /api/notifications/read/:id`
  - `PUT /api/notifications/read-all`
- Internal (protected by `InternalApiKeyGuard`):
  - `POST /api/internal/events` (header/secret enforced)

## Admin
Sources: `backend/src/modules/admin/controllers/*.ts`
- Products moderation:
  - `GET /api/admin/products`
  - `GET /api/admin/products/pending`
  - `PUT /api/admin/products/approve/:id` (inventory id)
  - `PUT /api/admin/products/reject/:id`
- Sessions:
  - `GET /api/admin/sessions`
  - `DELETE /api/admin/sessions/:sessionId`
- Role requests:
  - `GET /api/admin/role-requests`
  - `PUT /api/admin/role-requests/:id/approve`
  - `PUT /api/admin/role-requests/:id/reject`
- Additional admin endpoints exist (users, stores, dermatologists, analytics, audit logs, system health, notifications broadcast, etc.) under `backend/src/modules/admin/controllers/`.

## Assistant
Source: `backend/src/ai/assistant/chatbot.controller.ts`
- `POST /api/assistant`
- `GET /api/assistant/usage`
- `GET /api/assistant/settings`
- `POST /api/assistant/settings`

## Metrics
Source: `backend/src/core/metrics/metrics.controller.ts`
- `GET /api/metrics` (Prometheus text format)

---

# 11. Frontend Flow

## Routing model
Frontend uses Next.js **App Router** under `frontend/web/src/app/**` and route groups such as:
- `(auth)` for login/signup/forgot password
- `(app-shell)` for authenticated shell layouts and role panels:
  - `(user)` user pages
  - `(store)` store panel pages
  - `(partner)` partner pages
  - `(admin)` admin panel pages
  - `(dermatologist)` dermatologist panel pages
  - `(public)` public pages

## Key pages by role (code-derived examples)

User:
- `/dashboard` → `src/app/(app-shell)/(user)/dashboard/page.tsx`
- `/start-assessment` → `src/app/(app-shell)/(user)/start-assessment/page.tsx`
- `/dashboard/assessment/review` → `src/app/(app-shell)/(user)/dashboard/assessment/review/page.tsx`
- `/reports` and `/reports/[id]`
- `/shop` and `/shop/[id]`
- `/cart`, `/checkout`, `/orders`, `/tracking`

Store:
- `/store/dashboard`, `/store/inventory`, `/store/orders`, `/store/analytics`, etc.

Admin:
- `/admin` plus many sections (`/admin/products`, `/admin/users`, `/admin/sessions`, `/admin/role-requests`, `/admin/system-health`, ...)

Navigation & access control:
- The app shell wraps routes with an `AuthProvider` and role-based guards (`frontend/web/src/app/(app-shell)/layout.tsx`, `frontend/web/src/components/auth/RoleGuards.tsx`).

---

# 12. State & Rendering Flow

## Data fetching
Frontend uses `fetch()` wrappers (no SWR/React Query in the codebase):
- `frontend/web/src/services/api.ts` uses `fetch(..., { cache: "no-store", headers: getAuthHeaders() })`
- Auth header comes from Zustand store and falls back to parsing `localStorage` if needed (`frontend/web/src/services/apiInternal.ts`)

## Polling / periodic refresh (code-derived)
- **Assessment progress**: every **2s**, max **180** attempts (~6 minutes)
  - `POLL_INTERVAL_MS = 2000`
  - `MAX_POLL_ATTEMPTS = 180`
  Source: `frontend/web/src/app/(app-shell)/(user)/dashboard/assessment/review/page.tsx`
- **User dashboard refresh**:
  - On mount
  - On window focus
  - Every **10 seconds** while `document.visibilityState === "visible"`
  Source: `frontend/web/src/app/(app-shell)/(user)/dashboard/page.tsx`

## Hydration behavior
Auth state is persisted and “rehydrated” on the client:
- Store sets `_hasHydrated` and normalizes state post-hydration (`frontend/web/src/store/authStore.ts`).
- UI treats `loading` as `!_hasHydrated` (`frontend/web/src/providers/AuthProvider.tsx`).

---

# 13. Session & Multi-Tab Behavior

## How login persists
Frontend persists auth session to `localStorage`:
- Store name: `auraskin-auth`
- Key persisted fields: `accessToken`, `sessionToken`, `user`, `role`, `isAuthenticated`
Source: `frontend/web/src/store/authStore.ts`

## Heartbeat
If `sessionToken` exists:
- Frontend calls `POST /api/session/heartbeat` every **60 seconds**
Source: `frontend/web/src/providers/AuthProvider.tsx`, `backend/src/modules/session/session.controller.ts`

## Why the same browser cannot hold multiple users (code-observed behavior)
Because the frontend uses **one shared persisted storage key** (`auraskin-auth`) in `localStorage`, all tabs for the same origin share:
- the same `accessToken` (JWT)
- the same `sessionToken`

Resulting behavior:
- Logging in as a different user overwrites the stored token for all tabs.
- All tabs will start sending the newest token in `Authorization` headers.

---

# 14. AI Recommendation System

There are two “recommendation surfaces” implemented:

## A) Report-based recommendations (stored in DB)
Created during report generation:
- `recommended_products(report_id, product_id, confidence_score)`
- `recommended_dermatologists(report_id, dermatologist_id, distance_km)`
Sources:
- Python worker inserts in `backend/ai-engine/workers/analysis_worker.py`
- Backend report creation inserts in `backend/src/modules/user/services/report.service.ts`

Exposed via:
- `GET /api/user/reports` (latest report includes `recommendedProducts` + `recommendedDermatologists`)
- `GET /api/user/reports/:id`
- `GET /api/user/shop/recommended-products`

## B) Marketplace visibility filters (approved only)
Products are only returned publicly if:
- an `inventory` row exists with `status="approved"`, AND
- `products.approval_status="LIVE"`
Source: `backend/src/modules/public/public.repository.ts`

Report recommendation visibility (approved only):
- When returning recommendations, the backend filters recommended product ids by:
  - `inventory.status="approved"`
Source: `backend/src/modules/user/repositories/report.repository.ts`

---

# 15. Known Edge Cases & Fixes (Observed in Code)

## Assessment submission and progress
- **Missing images**: backend blocks submission unless all 5 image types exist (error message in `AssessmentService.submit()`).
- **Long-running analysis**: frontend stops polling after 180 attempts and suggests checking reports later (`AssessmentReviewPage`).
- **Redis unavailable**:
  - Backend stores progress in an in-memory map as a fallback (`RedisService.memoryProgress`)
  - Backend can run AI analysis synchronously via `AI_ENGINE_URL` when Redis is not reachable (`AssessmentService.submit()`)

## Duplicate processing / idempotency
- Backend uses a Redis lock key (`assessment:processing:<assessmentId>`) via `acquireAssessmentLock()` before enqueuing (`backend/src/redis/redis.service.ts`, `backend/src/jobs/aiProcessing.queue.ts`).
- DB integrity enforces one report per assessment (unique index on `reports.assessment_id`).

## Session expiry handling (frontend)
- For `401` responses, frontend throws `"Session expired. Please login again."` and can trigger `logout()` + redirect to `/login` in assessment review flow (`frontend/web/src/services/api.ts`, assessment review page).

## Consultation signaling auth failures
WebSocket gateway disconnects if:
- Missing token
- Supabase token invalid/expired
- Profile missing/blocked
- Role is not `user` or `dermatologist`
Source: `backend/src/modules/consultation/consultation.gateway.ts`

---

# 16. Deployment Architecture

This is the deployable architecture implied by the code (environment-driven).

```text
                 +----------------------+
                 |  Next.js Frontend    |
                 |  (frontend/web)      |
                 +----------+-----------+
                            |
                            | HTTPS to /api/*
                            v
                 +----------------------+
                 |  NestJS Backend API  |
                 |  (backend)           |
                 +----------+-----------+
                            |
      +---------------------+----------------------+
      |                                            |
      v                                            v
+----------------------+                   +----------------------+
| Supabase (Auth+DB)   |                   | Redis (optional)     |
| - Postgres schema     |                   | - ai queue/progress  |
| - Auth JWTs           |                   +----------+-----------+
+----------------------+                              |
                                                      | BRPOP/LPUSH
                                                      v
                                           +----------------------+
                                           | Python AI Worker     |
                                           | (backend/ai-engine)  |
                                           +----------------------+
```

## Required backend environment variables (validated at startup)
Source: `backend/src/config/env.ts`
- `PORT` (default `3001`)
- `NODE_ENV` (default `development`)
- `SUPABASE_URL` (required)
- `SUPABASE_ANON_KEY` (required)
- `SUPABASE_SERVICE_ROLE_KEY` (required)
- `OPENAI_API_KEY` (required)
- `OPENAI_MODEL` (default `gpt-4o-mini`)
- Optional:
  - `REDIS_URL`
  - `AI_ENGINE_URL` (enables HTTP AI engine mode)
  - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
  - `INTERNAL_EVENTS_SECRET`
  - `SENTRY_DSN`, `LOG_AGGREGATOR_URL`
  - Auth add-on (optional; default off):
    - `AUTH_EMAIL_OTP_REQUIRED` — when `true`, password signup/login and OAuth completion use email OTP; legacy `POST /api/auth/login` and `POST /api/auth/signup` are not registered (use `…/login/start`, `…/login/complete`, `…/signup/start`, `…/signup/complete`).
    - `AUTH_GMAIL_ONLY` — when `true`, restrict email+password signup/login to `@gmail.com` (case-insensitive) and enforce the same for Google OAuth; Apple is blocked unless `AUTH_APPLE_OAUTH_WHEN_GMAIL_ONLY=true`.
    - `AUTH_OTP_ENCRYPTION_KEY` — 32-byte key as 64-char hex or base64 (encrypts pending signup passwords and stored refresh tokens).
    - OTP email: either `RESEND_API_KEY` + `RESEND_FROM_EMAIL`, or `SMTP_HOST` + `SMTP_FROM` + `SMTP_USER` + `SMTP_PASS` (optional `SMTP_PORT`, `SMTP_SECURE`). If `SMTP_HOST` is set, Nodemailer/SMTP is used; otherwise Resend.
    - `INTERNAL_OTP_BRIDGE_SECRET` — shared with the Next.js app (server-only) for `POST /api/auth/oauth-otp/start`.

On the **Next.js** app, set the same `AUTH_EMAIL_OTP_REQUIRED`, `AUTH_GMAIL_ONLY`, `AUTH_APPLE_OAUTH_WHEN_GMAIL_ONLY`, and `INTERNAL_OTP_BRIDGE_SECRET` in server environment (not `NEXT_PUBLIC_*`) so [`api/auth/callback/route.ts`](../frontend/web/src/app/api/auth/callback/route.ts) matches backend policy.

- **`NEXT_PUBLIC_SUPABASE_URL`** and **`NEXT_PUBLIC_SUPABASE_ANON_KEY`** (frontend) — required for Google/Apple OAuth and client Realtime; without them, social buttons stay disabled and the callback redirects to login with a clear error (see `frontend/web/.env.example`).

### Auth runbook (OTP + OAuth)

1. **Supabase Auth redirect URLs** (Dashboard → Authentication → URL configuration): add `http://localhost:3000/api/auth/callback` for local dev and `https://<your-production-domain>/api/auth/callback` for production. **Site URL** should match your deployed web origin.
2. **Google / Apple providers**: enable and configure in Supabase Dashboard (Apple requires Apple Developer setup); misconfiguration causes provider errors unrelated to this repo’s Nest API.
3. **Email OTP (`AUTH_EMAIL_OTP_REQUIRED=true`)**:
   - Apply backend migration that creates `pending_signups` and `auth_login_challenges` (see `backend/supabase/migrations/`).
   - Set backend: `AUTH_OTP_ENCRYPTION_KEY`, mail transport (Resend or SMTP), `INTERNAL_OTP_BRIDGE_SECRET`.
   - Set frontend: `NEXT_PUBLIC_AUTH_EMAIL_OTP_REQUIRED=true`, server `AUTH_EMAIL_OTP_REQUIRED=true`, and the same `INTERNAL_OTP_BRIDGE_SECRET` as the backend for OAuth+OTP.
   - Ensure `NEXT_PUBLIC_API_URL` points at the live Nest API in production.

## AI engine runtime configuration
Source: `backend/ai-engine/utils/config.py` and worker imports
- `REDIS_URL` (required for worker mode)
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (required for DB writes)
- Queue keys:
  - `ai:assessment:queue`
  - `assessment:progress:<assessmentId>`

