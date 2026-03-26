# AuraSkin Production Hardening Runbook

## Scope

This runbook covers P0 hardening for:
- assessment submit determinism
- runtime dependency health gates
- placeholder containment in production-visible paths
- consultation approval roundtrip alignment

## Health Gates

### 1) Backend API reachable
- Check: `GET /api/health` (or service ingress health endpoint)
- Expected: `200` and deployment revision matches release
- On failure: roll back service revision and re-run smoke tests

### 2) Supabase reachable
- Check: backend `admin/system-health` response `database_status=ok`
- Expected: stable `ok`
- On failure: validate `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, network egress

### 3) Redis reachable (QUEUE mode only)
- Check: `admin/system-health` has `redis_status=ok`
- Expected: `ok` when `ASSESSMENT_MODE=QUEUE`
- On failure: set emergency profile to questionnaire-only or restore Redis connectivity

### 4) Worker heartbeat healthy (QUEUE mode only)
- Check: `admin/system-health` has `worker_status in {healthy,idle}` and no `WORKER_UNHEALTHY` in dependency reasons
- Expected: heartbeat age <= `WORKER_HEARTBEAT_MAX_AGE_MS`
- On failure: restart worker, verify heartbeat key refresh, re-test submit

### 5) AI engine reachable (SYNC_AI mode only)
- Check: `GET /api/user/assessment/submit-health` returns `healthy=true` in `SYNC_AI` mode
- Expected: no `AI_ENGINE_UNAVAILABLE`
- On failure: validate `AI_ENGINE_URL` and engine process health

## Assessment Submit Gating Rules

- `ASSESSMENT_MODE=QUEUE`:
  - requires Redis and healthy worker heartbeat
  - scan submit returns structured error if unhealthy
- `ASSESSMENT_MODE=SYNC_AI`:
  - requires AI engine configured/reachable
  - no queue fallback arbitration
- `ASSESSMENT_MODE=QUESTIONNAIRE_ONLY`:
  - scan submit is blocked with explicit mode-unhealthy message
  - questionnaire endpoint remains available

## Required Env Contract (Production)

### Backend required
- `NODE_ENV=production`
- `PORT`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `AI_API_KEY` or `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `ASSESSMENT_MODE`
- `ENABLE_QUESTIONNAIRE_ONLY_ASSESSMENT`
- `WORKER_HEARTBEAT_MAX_AGE_MS`

### Mode-specific required
- Queue: `REDIS_URL`
- Sync AI: `AI_ENGINE_URL`
- Questionnaire-only: `ENABLE_QUESTIONNAIRE_ONLY_ASSESSMENT=true`

### Must-fail invalid combinations
- `ASSESSMENT_MODE=QUEUE` without `REDIS_URL`
- `ASSESSMENT_MODE=SYNC_AI` without `AI_ENGINE_URL`
- `ASSESSMENT_MODE=QUESTIONNAIRE_ONLY` and questionnaire flag disabled
- production `AI_ENGINE_URL` containing `localhost` or `127.0.0.1`
- invalid numeric `PORT` or `WORKER_HEARTBEAT_MAX_AGE_MS`

## Validation Evidence (This Wave)

Executed:
- backend build: `npm run build` in `backend` (PASS)
- frontend build: `npm run build` in `frontend/web` (PASS)
- diagnostics on touched files via IDE lints (PASS)

Noted during build:
- frontend Tailwind warnings for ambiguous `duration-[...]` utility classes (non-blocking)

## Recovery Actions

### Submit instability during demo
1. Switch backend profile to questionnaire-first:
   - `ASSESSMENT_MODE=QUESTIONNAIRE_ONLY`
   - `ENABLE_QUESTIONNAIRE_ONLY_ASSESSMENT=true`
2. Redeploy backend.
3. Re-run smoke:
   - login
   - submit questionnaire
   - report visibility

### Queue mode degraded
1. Validate Redis connectivity.
2. Restart worker and confirm heartbeat freshness.
3. Re-test scan submit with a single user case.

### Sync AI degraded
1. Verify `AI_ENGINE_URL` target is reachable from backend runtime.
2. Restart AI service.
3. Re-test scan submit.

## Rollback Checklist

1. Re-deploy previous backend and frontend artifacts.
2. Restore previous production env snapshot.
3. Verify login, questionnaire submit, report retrieval.
4. Log incident with failing test case IDs and timestamps.
