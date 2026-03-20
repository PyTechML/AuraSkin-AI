# Supabase schema and migrations

## Before seeding test accounts

For `npm run seed:accounts` to work, the **profiles** table and the trigger that creates a profile when a user signs up must exist.

1. In [Supabase Dashboard](https://supabase.com/dashboard) → your project → **SQL Editor**.
2. Run the contents of **auth-profiles-schema.sql** (creates `profiles` and the `on_auth_user_created` trigger on `auth.users`).
3. Then from the backend directory run: `npm run seed:accounts`.

If the trigger is missing, creating users will fail with: `Database error creating new user`.
