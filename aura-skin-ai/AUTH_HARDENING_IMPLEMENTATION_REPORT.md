# AuraSkin AI — Authentication Hardening & Role Access Control — Implementation Report

This report summarizes the changes implemented for the authentication hardening and role-based access control (RBAC) work.

---

## 1. Default accounts inserted

- **Mechanism**: A one-off seed script was added at `backend/src/scripts/seed-default-accounts.ts`.
- **Credentials**: Passwords are **not** stored in the codebase. They are provided via environment variables at seed run time:
  - `SEED_USER_PASSWORD` — user@auraskin.ai (role USER)
  - `SEED_STORE_PASSWORD` — store@auraskin.ai (role STORE)
  - `SEED_DERMATOLOGIST_PASSWORD` — doctor@auraskin.ai (role DERMATOLOGIST)
  - `SEED_MASTER_ADMIN_PASSWORD` — admin@auraskin.ai (role ADMIN)
- **Run**: From the backend directory, set the env vars (e.g. in `.env`) and run:
  ```bash
  npm run seed:accounts
  ```
- **Behavior**: The script uses Supabase Auth Admin API to create users (passwords are hashed by Supabase). It then sets the correct `role` on the `profiles` table for each account. If a user already exists, it only updates the profile role (idempotent).

---

## 2. Authentication flow implemented

- **Backend** (`auth.controller.ts`, `auth.service.ts`):
  - Login failure always returns **401** with the single message: `"Invalid email or password"` (no leakage of Supabase or internal errors).
  - Success response shape: `{ data: { accessToken, refreshToken?, user: { id, email, role, fullName } } }` with `role` taken **only** from the database (`profiles.role`).
- **Frontend** (`(auth)/login/page.tsx`):
  - The **role dropdown was removed**. Login form collects only **email** and **password**.
  - Session and redirect use **only** the backend response: `payload.user.role` is mapped to frontend role and used for `setSession` and redirect.
  - The previous **fallback** that called `login(data.role, …)` when the response lacked token/user was **removed**. If the response is 200 but missing `accessToken` or `user`, the UI shows `"Invalid email or password"` and does **not** set session.
- **Result**: Only registered users in the database can log in; role is always taken from the database and cannot be overridden from the frontend.

---

## 3. Role validation implemented

- **Backend**:
  - **AuthGuard** and **RoleGuard** remain on all protected admin/partner/user endpoints. Role is read from the JWT/profile (database).
  - **Master admin rule**: In `auth.service.ts` (`getProfileByUserId`) and `auth.guard.ts`, if `role === 'admin'`, the profile **email** must be `admin@auraskin.ai` (case-insensitive). Otherwise the profile is treated as invalid (login fails) or `UnauthorizedException` is thrown (API access denied).
- **Frontend**:
  - **RoleGuards** (UserGuard, StoreGuard, DermatologistGuard, AdminGuard) already restrict panels by role from the auth store (which is set only from the backend login response).
  - When a user is authenticated but accesses a panel that does not match their role, the UI shows: **"Access denied for this panel."**
- **Login failure / wrong panel**:
  - Invalid credentials or missing payload: **"Invalid email or password"**.
  - Valid login but wrong panel: **"Access denied for this panel."**

---

## 4. Mock data removed

- **Admin rule-engine** (`admin/rule-engine/page.tsx`): `MOCK_RULES` removed. Rules are loaded from **GET /admin/ai/rules** and displayed. Copy updated (e.g. "Enter user data" instead of "Enter mock user data").
- **Admin reports** (`admin/reports/page.tsx`): `MOCK_REPORTS` removed. Reports are loaded from **GET /admin/reports** (skin reports from DB). Empty state and loading state added.
- **Admin audit-logs** (`admin/audit-logs/page.tsx`): `MOCK_AUDIT` removed. Audit entries are loaded from **GET /admin/audit-logs** (new backend endpoint). Empty state and loading state added.
- **Backend**: **GET /admin/audit-logs** added in `admin.controller.ts`; **AuditService.listLogs()** added to read from `admin_audit_logs` and optionally resolve admin email from `profiles`.
- **Admin products / dermatologists pages**: Copy updated from "Connect the API or add mock data" to clear no-data messaging (e.g. "No products pending approval", "No dermatologists yet").
- **User assessment review**: Copy updated from "Submit to generate your report (mock)." to "Submit to generate your report."
- **apiPartner.ts**: Comment for `DEFAULT_STORE_ID` / `DEFAULT_DERM_ID` updated to state they are fallbacks when real partner context is not yet available; no removal of constants to avoid breaking callers.

---

## 5. Panel security enforced

- **Backend**: All relevant admin, store, dermatologist, and user APIs use **AuthGuard** and **RoleGuard** with the correct role metadata. Unauthorized requests return **401**; forbidden role returns **403**.
- **Frontend**: Panel layouts under `(app-shell)/(user|store|dermatologist|admin)` are wrapped with the corresponding guard. Role is taken only from the backend login response (persisted in auth store).
- **Master admin**: Only the account with email **admin@auraskin.ai** can hold the admin role. This is enforced in:
  - `auth.service.ts` (getProfileByUserId)
  - `auth.guard.ts` (canActivate)
  - Admin user management: block, delete, and reset-password are **not** allowed for the master admin (backend and frontend).

---

## 6. Admin user management

- **Backend**:
  - **DELETE /admin/users/:id** — Deletes the user via Supabase Auth Admin; master admin cannot be deleted.
  - **PUT /admin/users/:id/reset-password** — Body `{ password }`; updates the user’s password via Supabase Auth Admin; master admin cannot be reset via this endpoint.
  - **Suspend / Unlock**: Existing **PUT /admin/users/block/:id** and **PUT /admin/users/unblock/:id**; master admin cannot be blocked.
- **Frontend** (admin users page):
  - Stats: Total users, Active, Suspended (from loaded user list).
  - Drawer actions: **Suspend user**, **Unlock account**, **Reset password** (inline form), **Delete user** (with confirm). Delete and Reset password are disabled for admin@auraskin.ai.
  - Bulk suspend: Wired to block API for selected users; list refreshes after success.

---

## 7. Database validation

- **analytics_events**: A new migration `20260314100000_analytics_events_fk.sql` adds optional foreign keys:
  - `user_id` → `profiles(id)` ON DELETE SET NULL
  - `store_id` → `store_profiles(id)` ON DELETE SET NULL
- Other tables (profiles, assessments, reports, recommended_products, orders, order_items, store_profiles, dermatologist_profiles, etc.) already had the intended FKs in existing schemas; no breaking schema changes were introduced.

---

## 8. Verification checklist

Recommended manual/automated checks:

| Check | Expected |
|-------|----------|
| Login with user@auraskin.ai (after seed) | 200, redirect to user panel |
| Login with store@auraskin.ai | 200, redirect to store panel |
| Login with doctor@auraskin.ai | 200, redirect to dermatologist panel |
| Login with admin@auraskin.ai | 200, redirect to admin panel |
| Login with random email / wrong password | 401, message "Invalid email or password", no session |
| USER token used on admin-only endpoint | 403 Forbidden |
| USER visits /admin | Redirect and "Access denied for this panel." |
| Master admin (admin@auraskin.ai) | Cannot be deleted or have password reset via admin UI; cannot be blocked |

---

## Files touched (summary)

| Area | Files |
|------|--------|
| Backend auth | `auth.controller.ts`, `auth.service.ts`, `auth.guard.ts` |
| Frontend login | `(auth)/login/page.tsx` |
| Frontend guards | `RoleGuards.tsx` |
| Seed | `backend/scripts/seed-default-accounts.ts`, `backend/package.json` (script + dotenv) |
| Admin users | `users.controller.ts`, `users.service.ts`, `apiAdmin.ts`, `admin/users/page.tsx` |
| Audit API | `audit.service.ts`, `admin.controller.ts` |
| Mock removal | `admin/rule-engine/page.tsx`, `admin/reports/page.tsx`, `admin/audit-logs/page.tsx`, `apiAdmin.ts`, `admin/products/page.tsx`, `admin/dermatologists/page.tsx`, `dashboard/assessment/review/page.tsx`, `apiPartner.ts` |
| DB | `migrations/20260314100000_analytics_events_fk.sql` |

No existing working API contracts or stable modules were broken; only auth hardening, role enforcement, seed, admin user actions, audit API, and mock replacement were added or updated.
