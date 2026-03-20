# Public Panel Backend Implementation — Completion Report

## 1. Backend Files Created or Updated

### Created

- **backend/supabase/public-panel-schema.sql**  
  SQL script for Supabase: creates tables `products`, `stores`, `dermatologists`, `blogs`, `faq`, `contact_messages` with columns per spec plus optional frontend/AI fields. Includes RLS policies (public read for products, stores, dermatologists, blogs, faq; public insert for contact_messages).

- **backend/src/modules/public/public.dto.ts**  
  DTOs with class-validator: `ContactDto` (name, email, subject, message), `NearbyQueryDto` (lat, lng), `ProductsQueryDto` (skinType, concern, brand, priceMin, priceMax, rating, sort). Used for validation and type-safe request bodies/query params.

- **backend/src/modules/public/public.repository.ts**  
  Data access layer: methods for products (list, by id, by category for similar), stores (list, by id), dermatologists (list, by id), blogs (list, by slug), faq (list), and `insertContactMessage`. All use `getSupabaseClient()` (service role). Returns raw DB rows (snake_case).

- **docs/PUBLIC_PANEL_BACKEND_COMPLETION_REPORT.md**  
  This report.

### Updated

- **backend/src/main.ts**  
  Added `app.setGlobalPrefix("api")`, `app.useGlobalPipes(ValidationPipe)` (whitelist, transform), and `app.enableCors()` (origin from `CORS_ORIGIN` or `true`).

- **backend/src/core/app.module.ts**  
  Registered `ThrottlerModule.forRoot([{ name: "public", ttl: 60_000, limit: 100 }])` and `APP_GUARD` with `ThrottlerGuard` for global rate limiting.

- **backend/src/database/models/index.ts**  
  Extended `DbProduct` with `store_id`; redefined `DbStore` and `DbDermatologist` to match Supabase schema (snake_case: address, city, latitude, longitude, contact_number, etc.). Added `DbBlog`, `DbFaq`, `DbContactMessage`.

- **backend/src/modules/public/public.module.ts**  
  Added `PublicRepository` to providers.

- **backend/src/modules/public/public.service.ts**  
  Reimplemented to use `PublicRepository`; added mappers from DB rows to API response shapes (camelCase: ProductResponse, StoreResponse, DermatologistResponse, BlogResponse, FaqResponse). Implemented getProducts (with filters/sort), getProductById, getSimilarProducts, getStores, getStoresNearby (distance computed and sorted), getStoreById, getDermatologists, getDermatologistsNearby, getDermatologistById, getBlogs, getBlogBySlug, getFaq, submitContact. Distance for nearby uses a Haversine-style helper.

- **backend/src/modules/public/public.controller.ts**  
  Replaced single-segment controller with empty `@Controller()` and explicit routes under `/api`: GET products, products/similar/:id, products/:id; GET stores/nearby, stores, stores/:id; GET dermatologists/nearby, dermatologists, dermatologists/:id; GET blogs, blogs/:slug; GET faq; POST contact. Uses `formatSuccess(data)` for success; throws `NotFoundException` or `BadRequestException` for errors.

- **backend/src/modules/public/public.routes.ts**  
  Updated route constants to document all public API paths under `/api`.

- **backend/.env.example**  
  Documented optional `CORS_ORIGIN`.

### Frontend

- **frontend/web/src/services/api.ts**  
  Added `API_BASE` from `NEXT_PUBLIC_API_URL` (default `http://localhost:3001`), `apiGet` and `apiPost` helpers that call `/api/...` and return `response.data`. Replaced mock implementations for getProducts, getProductById, getSimilarProducts, getStores, getStoresNearby, getStoreById, getDermatologists, getDermatologistsNearby, getDermatologistById with these API calls; getAiRecommendedProducts now uses getProducts() and getReports(). Added getBlogs, getBlogBySlug, getFaq (mapping question/answer to q/a), submitContact.

- **frontend/web/src/app/(app-shell)/(public)/contact/page.tsx**  
  Contact form submit now calls `submitContact({ name, email, subject, message })` instead of a simulated timeout.

- **frontend/web/.env.example**  
  Added `NEXT_PUBLIC_API_URL=http://localhost:3001`.

---

## 2. Database Tables Created

All tables are created by running `backend/supabase/public-panel-schema.sql` in the Supabase SQL Editor:

| Table              | Purpose |
|--------------------|--------|
| **products**       | id (uuid PK), name, description, category, image_url, price, store_id, brand, rating, skin_type (array), concern (array), full_description, key_ingredients (array), usage, safety_notes, created_at. Supports filtering and future AI metadata. |
| **stores**         | id (uuid PK), name, address, city, latitude, longitude, contact_number, description, opening_hours, status, created_at. |
| **dermatologists** | id (uuid PK), name, clinic_name, city, specialization, latitude, longitude, contact_number, profile_image, email, years_experience, consultation_fee, rating, created_at. |
| **blogs**          | id (uuid PK), title, slug (unique), content, cover_image, summary, category, created_at. |
| **faq**            | id (uuid PK), question, answer. |
| **contact_messages** | id (uuid PK), name, email, subject, message, created_at. |

---

## 3. Supabase Configuration

- **Project**: Create a project in the Supabase dashboard (e.g. name `auraskin-ai`), set database password and region.
- **Keys**: In Settings → API, copy `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- **Env**: In the backend root, create `.env` with these three variables plus `PORT`, `NODE_ENV`, `OPENAI_API_KEY`, `OPENAI_MODEL`, and optionally `CORS_ORIGIN`. Do not commit `.env` (already in root `.gitignore`).
- **Schema**: In SQL Editor, run the contents of `backend/supabase/public-panel-schema.sql` to create tables and RLS policies.
- **RLS**: Enabled on all six tables. Policies allow anonymous SELECT on products, stores, dermatologists, blogs, faq; anonymous INSERT on contact_messages. The backend uses the **service role** client, which bypasses RLS; the frontend does not use the service role.

---

## 4. How API Routes Connect to the Frontend

| Frontend function / page      | HTTP | Backend route | Notes |
|-------------------------------|------|----------------|-------|
| getProducts(filters, sort)    | GET  | /api/products  | Query params: skinType, concern, brand, priceMin, priceMax, rating, sort. |
| getProductById(id)            | GET  | /api/products/:id | 404 → null. |
| getSimilarProducts(id, limit)| GET  | /api/products/similar/:id?limit= |  |
| getStores()                   | GET  | /api/stores   |  |
| getStoresNearby(lat, lng)     | GET  | /api/stores/nearby?lat=&lng= |  |
| getStoreById(id)              | GET  | /api/stores/:id | 404 → null. |
| getDermatologists()           | GET  | /api/dermatologists |  |
| getDermatologistsNearby(lat, lng) | GET | /api/dermatologists/nearby?lat=&lng= |  |
| getDermatologistById(id)      | GET  | /api/dermatologists/:id | 404 → null. |
| getBlogs()                    | GET  | /api/blogs    |  |
| getBlogBySlug(slug)           | GET  | /api/blogs/:slug | 404 → null. |
| getFaq()                     | GET  | /api/faq      | Backend returns { question, answer }[]; frontend maps to { q, a }[]. |
| submitContact(payload)        | POST | /api/contact  | Body: name, email, subject?, message. Used by contact page form. |

The frontend uses `NEXT_PUBLIC_API_URL` (default `http://localhost:3001`) as the base; all requests go to `${API_BASE}/api/...`. Success responses are `{ data: T }`; the client returns `data` or, on error, throws or returns []/null to preserve existing call signatures.

---

## 5. Data Flow Through the System

1. **User** opens a public page (e.g. /products, /stores, /contact).
2. **Frontend** (Next.js) calls the corresponding function in `api.ts` (e.g. getProducts(), submitContact()).
3. **api.ts** builds the URL from `API_BASE` and `/api/...`, sends GET or POST with fetch (no-store for GETs).
4. **Backend** (NestJS) receives the request; ThrottlerGuard checks rate limit; route handler runs.
5. **Controller** parses params/query/body, calls PublicService.
6. **Service** calls PublicRepository (or uses mapped data), maps DB rows to camelCase response objects.
7. **Repository** uses getSupabaseClient() (service role) to run Supabase queries (select/insert).
8. **Supabase** executes the query; RLS does not apply to service role.
9. **Backend** returns `formatSuccess(data)` with status 200, or throws (e.g. NotFoundException, BadRequestException).
10. **Frontend** reads `response.data`, returns it to the page; on non-OK response, throws or returns []/null.
11. **Page** renders using the returned data; no UI or theme changes, only data source is now the API.

For **contact**, the same flow applies; POST body is validated with ContactDto; repository inserts into contact_messages; success returns `{ data: { success: true }, message: "..." }`.

---

## 6. Security Configuration

- **Service role key**: Used only in the backend (supabase.client.ts via getSupabaseConfig()). Never sent to the browser or exposed in frontend env.
- **CORS**: Enabled in main.ts; origin is `process.env.CORS_ORIGIN` or `true` (allow any in dev). In production, set `CORS_ORIGIN` to the frontend origin.
- **Validation**: Global ValidationPipe with whitelist and transform; ContactDto validates POST /api/contact (name, email, message required; subject optional; max lengths).
- **RLS**: Public read on products, stores, dermatologists, blogs, faq; public insert on contact_messages. Backend uses service role and bypasses RLS; frontend does not access Supabase directly in this phase.
- **Errors**: Controllers throw Nest HTTP exceptions (e.g. NotFoundException, BadRequestException); Nest returns structured error bodies (statusCode, message). No stack or internal details in production when using default exception filter.

---

## 7. Vulnerability and Risk Considerations

- **Injection**: Supabase client uses parameterized queries; no raw SQL concatenation. Input is validated (ContactDto, numeric query params). Risk of injection is low.
- **Over-exposure**: Public endpoints return only the fields defined in the response mappers (no internal IDs or extra columns beyond what the frontend needs). contact_messages has no public SELECT policy, so only the backend can read submissions.
- **Rate limiting**: ThrottlerGuard applies 100 requests per IP per 60 seconds globally. Reduces abuse and simple DDoS; for multi-instance production, consider Redis-backed storage (e.g. ThrottlerStorage).
- **Sensitive data**: Service role key must remain server-side only. .env is gitignored. No PII logged in the implemented code.
- **Contact form**: No server-side CAPTCHA or bot mitigation; consider adding one for production. Message length and field lengths are capped in ContactDto.

---

## 8. Environment Variables

**Backend (.env, not committed)**

- `PORT` — Server port (default 3001).
- `NODE_ENV` — development | production.
- `SUPABASE_URL` — Supabase project URL.
- `SUPABASE_ANON_KEY` — Supabase anon key (for reference; backend uses service role).
- `SUPABASE_SERVICE_ROLE_KEY` — Used by getSupabaseClient(); required for backend DB access.
- `OPENAI_API_KEY`, `OPENAI_MODEL` — Required by loadEnv(); used in other modules (e.g. AI).
- `CORS_ORIGIN` — Optional; frontend origin for CORS. Omit or leave empty to allow any (e.g. dev).
- `REDIS_URL` — Optional; not used by current in-memory throttler.

**Frontend (.env.local or .env, optional)**

- `NEXT_PUBLIC_API_URL` — Backend base URL (e.g. http://localhost:3001). No trailing slash. If unset, api.ts defaults to http://localhost:3001.

---

## 9. Rate Limiting

- **Library**: @nestjs/throttler; ThrottlerGuard registered as APP_GUARD in AppModule.
- **Config**: ThrottlerModule.forRoot([{ name: "public", ttl: 60_000, limit: 100 }]) — 60,000 ms window, 100 requests per window per tracker (IP by default).
- **Scope**: Applies to all routes (including /api/public and other modules). Public panel and other API endpoints share the same limit.
- **Response**: When exceeded, ThrottlerGuard throws ThrottlerException → 429 Too Many Requests with a clear message.
- **Storage**: In-memory (default). For production with multiple instances, configure a custom ThrottlerStorage (e.g. Redis) so limits are shared across processes.

---

## 10. Future Integration Readiness

- **User Panel Backend**: Public module does not depend on auth; user-specific modules (orders, reports, bookings) remain separate. Same Supabase project and service role can be used for user panel tables and RLS policies for authenticated users.
- **AI recommendations**: products table includes category, skin_type, concern, brand, and other metadata; getProducts and getSimilarProducts already support filtering. Product list and similar-products endpoints can be consumed by an AI recommendation service; no schema change required for basic recommendations.
- **Blog/FAQ from API**: getBlogs, getBlogBySlug, and getFaq are implemented and exposed. Blog and FAQ pages can be switched to fetch from these APIs and render dynamic content without changing UI structure.
- **Stores/dermatologists**: Nearby endpoints return distance and are sorted by distance; suitable for “find nearest” features and future map or location-based UI.

---

End of report.
