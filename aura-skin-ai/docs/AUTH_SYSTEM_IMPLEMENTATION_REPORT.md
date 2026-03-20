# Authentication System (Supabase Auth + Role Architecture) — Completion Report

## Files Created

| File | Purpose |
|------|---------|
| `aura-skin-ai/backend/supabase/auth-profiles-schema.sql` | Profiles table, trigger to create profile on signup, RLS. Run manually in Supabase SQL Editor. |
| `aura-skin-ai/backend/src/services/auth/auth.types.ts` | Types: `ProfileRow`, `CurrentUser` for profile and API response. |
| `aura-skin-ai/docs/AUTH_SYSTEM_IMPLEMENTATION_REPORT.md` | This report. |

## Files Modified

| File | Changes |
|------|---------|
| `aura-skin-ai/backend/src/shared/guards/auth.guard.ts` | Resolve role and profile from `profiles` via service-role client; extend `AuthenticatedUser` with `fullName`, `avatarUrl`. |
| `aura-skin-ai/backend/src/services/auth/auth.service.ts` | `signInWithPassword` and `getUser` use `getProfileByUserId()` (DB) for role and profile; return `CurrentUser` (id, email, role, fullName, avatar). |
| `aura-skin-ai/backend/src/services/auth/auth.controller.ts` | `GET /api/auth/me` returns `{ id, email, role, fullName, avatar }`; `POST /api/auth/login` and `POST /api/auth/signup` use `@Throttle({ auth: { limit: 10, ttl: 60_000 } })`. |
| `aura-skin-ai/backend/src/core/app.module.ts` | Added named throttle `auth` (10 requests per 60s) to `ThrottlerModule.forRoot`. |

## Routes Implemented

| Method | Path | Auth | Rate limit | Description |
|--------|------|------|------------|-------------|
| POST | `/api/auth/login` | No | 10/min (auth) | Email+password sign-in; returns tokens + user from profile. |
| POST | `/api/auth/signup` | No | 10/min (auth) | Email+password sign-up; trigger creates profile with role `user`. |
| GET | `/api/auth/me` | Bearer | default (100/min) | Returns current user from JWT + profile: `id`, `email`, `role`, `fullName`, `avatar`. |
| /api/user/* | — | AuthGuard + RoleGuard(user) | default | User panel. |
| /api/partner/store/* | — | AuthGuard + RoleGuard(store) | default | Store panel. |
| /api/partner/dermatologist/* | — | AuthGuard + RoleGuard(dermatologist) | default | Dermatologist panel. |
| /api/admin/* | — | AuthGuard + RoleGuard(admin) | default | Admin panel. |

## Database Tables Used

- **profiles** (new, defined in `auth-profiles-schema.sql`)
  - `id` uuid PK, references `auth.users(id)` ON DELETE CASCADE
  - `email` text
  - `role` text NOT NULL DEFAULT 'user' CHECK (role IN ('user','store','dermatologist','admin'))
  - `full_name` text
  - `avatar_url` text
  - `created_at` timestamptz DEFAULT now()
- **Trigger**: `on_auth_user_created` AFTER INSERT ON `auth.users` → `create_profile_for_user()` inserts into `profiles` with `role = 'user'`.

## Authentication Flow

1. User signs in (email/password or OAuth via Supabase); Supabase issues JWT.
2. Frontend stores session and sends `Authorization: Bearer <token>` to backend.
3. **AuthGuard**: Validates JWT with Supabase anon client; loads profile by `user.id` from `profiles` via service-role client; sets `request.user` from profile (id, email, role, fullName, avatarUrl).
4. **RoleGuard**: Ensures `request.user.role` is in the allowed set for the route; otherwise 403.
5. Panel routes use AuthGuard + RoleGuard with the correct role.

Role is **never** taken from JWT or frontend; it is always read from `profiles` in the backend.

## Security Protections

- **Service role key**: Used only in backend (`getSupabaseClient()`); never sent to frontend or logged.
- **JWT**: Validated server-side via `supabase.auth.getUser(token)`; invalid/expired tokens → 401.
- **Roles**: Read only from `profiles` table; no trust of `app_metadata` or client.
- **Auth rate limit**: Login and signup limited to 10 requests per minute per IP (ThrottlerGuard + named throttle `auth`).
- **Errors**: 401 Unauthorized (invalid/missing token, profile not found); 403 Forbidden (role mismatch).

## Potential Vulnerabilities / Limitations

1. **Trigger timing**: If the trigger is created after some users exist, those users will have no `profiles` row until backfilled; backend returns "Profile not found" (401). Mitigation: Run `auth-profiles-schema.sql` before go-live; backfill existing `auth.users` into `profiles` if needed.
2. **Rate limit**: 10/min is per IP; distributed or proxied traffic can bypass. Consider Redis-backed throttling and/or stricter limits in production.
3. **RLS**: `profiles` has RLS enabled; backend uses service role and bypasses RLS. If you later allow anon/authenticated access to `profiles`, add policies (e.g. read/update own row by `auth.uid()`).

## Integration Readiness for Next Module

- **User Panel Backend** (assessment, image validation, AI skin analysis, product/dermatologist recommendations) can assume:
  - `request.user` is set by AuthGuard with `id`, `email`, `role`, `fullName`, `avatarUrl`.
  - Role is always from `profiles`; use `request.user.id` for user-scoped data and `request.user.role` for role checks.
- No frontend or public API changes were made; existing panel routes and response shapes remain compatible (extended with `fullName` and `avatar` where applicable).
