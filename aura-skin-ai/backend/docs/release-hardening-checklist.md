# Release Hardening Checklist

## Rollback Safety Checkpoint

Run this before production release:

1. Create a Git safety tag from the known-good commit.
   - `git tag -a pre-role-flow-hardening -m "Stable checkpoint before role flow hardening release"`
2. Capture a database backup/checkpoint from Supabase dashboard (or your standard backup runbook).
3. Record both references in the release note:
   - git tag: `pre-role-flow-hardening`
   - database backup timestamp/reference id

## Locked Pre-release Process

1. Stop old local processes on `3000` and `3001`.
2. Start backend (`3001`).
3. Start frontend (`3000`).
4. Run `npm run smoke:role-guards` from `backend`.
5. Manual pages check:
   - `/stores`
   - `/stores/[storeId]`
   - `/dermatologists`
   - `/dermatologists/[dermatologistId]`
6. Validate critical transactional flows:
   - consultation booking appears in dermatologist consultations
   - store product/order appears in store orders and assigned users
