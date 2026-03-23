# Local API development

## Port already in use (`EADDRINUSE`)

The Nest app listens on **`PORT`** from the environment, default **3001** in [`src/main.ts`](../src/main.ts). Only one process can bind to a port.

If startup fails with `EADDRINUSE`:

1. Stop duplicate processes: multiple `npm run start:dev`, a second terminal running `node dist/main`, or your IDE starting the server twice.
2. Confirm `PORT` in `.env` matches what the frontend expects (`API_BASE` / `NEXT_PUBLIC_API_URL`).
3. **Windows:** find the PID holding the port, then end it:

   ```text
   netstat -ano | findstr :3001
   taskkill /PID <pid> /F
   ```

## Redis (`REDIS_URL`)

- **`REDIS_URL` is optional** for local API-only work. If unset, [`RedisService`](../src/redis/redis.service.ts) does not connect; assessment progress and related paths use **in-memory fallbacks** (see [`assessment.service.ts`](../src/modules/user/services/assessment.service.ts)).
- For **queued AI processing** (Redis list + Python worker), run Redis locally or use a hosted instance and set `REDIS_URL` (for example `redis://localhost:6379`).

## Session / `GET /api/auth/me`

The REST API uses **`Authorization: Bearer <accessToken>`** from the client, not cookies, for `/api/auth/me`. Logged-out clients should not call `/me`; the app only calls it when a token exists (see `AuthProvider` and login flow in the web app).
