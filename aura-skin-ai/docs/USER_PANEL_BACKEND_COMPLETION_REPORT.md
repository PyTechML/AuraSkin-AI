# User Panel Backend — Assessment & Reports System — Completion Report

## 1. Files Created or Updated

### Created

- **backend/supabase/user-panel-schema.sql**  
  SQL script for Supabase: creates tables `assessments`, `assessment_images`, `reports`, `recommended_products`, `recommended_dermatologists` with columns per spec. All reference `profiles(id)` or each other. RLS enabled with policies so users can read/insert own assessments and assessment images, read/insert own reports; read recommended_products and recommended_dermatologists for own reports. Indexes on `user_id`, `assessment_id`, `report_id`. Run once in Supabase SQL Editor. If a `reports` table already exists with a different shape (e.g. title, date, summary), drop or migrate it before running.

- **backend/src/modules/user/controllers/assessment.controller.ts**  
  Under `@Controller("user")` with AuthGuard + RoleGuard("user"): POST `assessment` (body: CreateAssessmentDto), POST `assessment/upload` (multipart fields front, left, right; query `assessmentId`), POST `assessment/submit` (body: SubmitAssessmentDto). Returns `formatSuccess({ success: true, ... })`.

- **backend/src/modules/user/controllers/report.controller.ts**  
  Under `@Controller("user")` with AuthGuard + RoleGuard("user"): GET `reports`, GET `reports/:id`. Returns list of reports or report with recommendedProducts and recommendedDermatologists; 403 if report not owned.

- **backend/src/modules/user/services/assessment.service.ts**  
  `create(userId, dto)` → insert assessment; `upload(assessmentId, userId, files)` → validate type/size, run face detection stub, upload to Supabase Storage, insert assessment_images; `submit(assessmentId, userId, dto)` → verify ownership and 3 images, call ReportService.createMockReport.

- **backend/src/modules/user/services/report.service.ts**  
  `list(userId)` → reports by user; `getById(id, userId)` → report + recommended_products + recommended_dermatologists; `createMockReport(assessment, city?, lat?, lng?)` → insert mock report, product recommendations via ProductRecommendationService, dermatologist recommendations by city/rating/distance, insert recommended_products and recommended_dermatologists.

- **backend/src/modules/user/repositories/assessment.repository.ts**  
  Supabase CRUD for `assessments` and `assessment_images`: create, findById, findByIdAndUser, getImagesByAssessmentId, insertImage.

- **backend/src/modules/user/repositories/report.repository.ts**  
  Supabase CRUD for `reports`, `recommended_products`, `recommended_dermatologists`: create report, findByUserId, findById, findByIdAndUser, getRecommendedProducts, getRecommendedDermatologists, insertRecommendedProduct, insertRecommendedDermatologist.

- **backend/src/modules/user/dto/create-assessment.dto.ts**  
  CreateAssessmentDto: skinType, primaryConcern, secondaryConcern, sensitivityLevel, currentProducts, lifestyleFactors (all optional, with MaxLength).

- **backend/src/modules/user/dto/submit-assessment.dto.ts**  
  SubmitAssessmentDto: assessmentId (required), optional city, latitude, longitude for dermatologist matching.

- **backend/src/modules/user/dto/index.ts**  
  Re-exports DTOs.

- **backend/src/modules/user/validators/assessment-upload.validator.ts**  
  Constants: ASSESSMENT_IMAGE_MAX_BYTES (5MB), allowed MIMEs (image/jpeg, image/png), views (front, left, right). Helpers: isAllowedMime, isAllowedSize. Message: INVALID_FACE_IMAGE_MESSAGE.

### Updated

- **backend/src/database/models/index.ts**  
  DbReport updated to new shape: assessment_id, skin_condition, acne_score, pigmentation_score, hydration_score, recommended_routine, created_at. DbAssessment updated: skin_type, primary_concern, secondary_concern, sensitivity_level, current_products, lifestyle_factors. Added DbAssessmentImage, DbRecommendedProduct, DbRecommendedDermatologist.

- **backend/src/modules/user/user.module.ts**  
  Registered AssessmentController, ReportController; providers: AssessmentService, ReportService, AssessmentRepository, ReportRepository, ImageUploadService, FaceDetectionService, ProductRecommendationService.

- **backend/src/modules/user/user.controller.ts**  
  Removed GET reports and GET reports/:id (handled by ReportController). Kept GET orders, GET orders/:id.

- **backend/src/modules/user/services/user.service.ts**  
  Removed getReports and getReportById; kept getOrders and getOrderById.

- **backend/src/modules/user/routes/index.ts**  
  Added ASSESSMENT_UPLOAD, ASSESSMENT_SUBMIT to USER_ROUTES.

- **backend/src/ai/recommendation/dermatologistRecommendation.service.ts**  
  Fixed column names: use `latitude` and `longitude` (schema) instead of `clinic_lat`/`clinic_lng` for distance-based queries.

---

## 2. Database Tables

| Table                     | Purpose                                              |
|---------------------------|------------------------------------------------------|
| assessments               | Questionnaire responses (user_id, skin_type, concerns, etc.) |
| assessment_images         | One row per uploaded face image (assessment_id, image_type: front/left/right, image_url) |
| reports                   | Skin analysis result (user_id, assessment_id, skin_condition, scores, recommended_routine) |
| recommended_products      | Links report → product with confidence_score         |
| recommended_dermatologists| Links report → dermatologist with distance_km        |

All FKs reference existing tables: profiles, products, dermatologists. RLS policies restrict access by `user_id` / report ownership.

---

## 3. API Routes (all require AuthGuard + RoleGuard "user")

| Method | Path                       | Description |
|--------|----------------------------|-------------|
| POST   | /api/user/assessment      | Create assessment; body: CreateAssessmentDto. Returns `{ data: { success: true, assessment_id } }`. |
| POST   | /api/user/assessment/upload| Upload 3 images (multipart: front, left, right); query: assessmentId. Returns `{ data: { success: true } }`. |
| POST   | /api/user/assessment/submit| Submit assessment; body: assessmentId, optional city, latitude, longitude. Returns `{ data: { success: true, report_id } }`. |
| GET    | /api/user/reports          | List reports for current user. Returns `{ data: { success: true, data: Report[] } }`. |
| GET    | /api/user/reports/:id      | Report detail with recommendedProducts and recommendedDermatologists. 403 if not owner. |
| GET    | /api/user/orders           | List orders (unchanged). |
| GET    | /api/user/orders/:id       | Order detail (unchanged). |

---

## 4. Data Flow

1. User creates assessment → POST /api/user/assessment → AssessmentRepository.create → returns assessment_id.
2. User uploads 3 face images → POST /api/user/assessment/upload?assessmentId=… → file type/size check → FaceDetectionService.validateAssessmentImages (stub) → ImageUploadService.uploadTemp → AssessmentRepository.insertImage × 3.
3. User submits → POST /api/user/assessment/submit → verify assessment ownership and 3 images → ReportService.createMockReport → insert report, product recommendations (ProductRecommendationService), dermatologist recommendations (by city/rating/distance) → insert recommended_products and recommended_dermatologists.
4. User lists reports → GET /api/user/reports → ReportRepository.findByUserId.
5. User opens report → GET /api/user/reports/:id → ReportRepository.findByIdAndUser + getRecommendedProducts + getRecommendedDermatologists.

---

## 5. Security

- All user-panel endpoints use AuthGuard (JWT) and RoleGuard ("user"). User id from `request.user.id`.
- Ownership: assessments and reports are filtered by `user_id`; upload and submit verify assessment belongs to current user; GET report by id returns 403 if not owner.
- File upload: only image/jpeg and image/png; max 5MB per file (enforced in validator and Multer options).
- Supabase service role key is used only in backend (getSupabaseClient); never exposed to frontend.

---

## 6. Potential Vulnerabilities and Mitigations

- **Stub face validation:** FaceDetectionService only checks that front/left/right views are present; it does not run real OpenCV/MediaPipe. Mitigation: Replace with real face detection in the AI module; until then, invalid images can be stored. Consider adding a note in API docs.
- **No rate limit on upload/submit:** Throttler is global; consider a stricter limit for /api/user/assessment/upload and /api/user/assessment/submit to avoid abuse.
- **RLS policy idempotency:** user-panel-schema.sql uses CREATE POLICY without IF NOT EXISTS. Running the script twice will fail on policy creation. Mitigation: Run once, or wrap in DO blocks that drop policies first if re-running.

---

## 7. Integration Readiness for AI Module

- **Face detection:** FaceDetectionService in `backend/src/ai/vision/faceDetection.service.ts` is a stub. Replace `validateAssessmentImages` with OpenCV/MediaPipe to enforce exactly one face per image and orientation checks; keep the same `ImageValidationResult` interface.
- **Skin analysis:** ReportService.createMockReport uses fixed mock values. Replace with a call to a future SkinAnalysisService that returns skin_condition and scores from images + questionnaire.
- **Product/dermatologist recommendations:** ProductRecommendationService and dermatologist-by-city logic are already used. AI module can replace or augment scoring (e.g. confidence_score from a model) and keep the same DB shape (recommended_products, recommended_dermatologists).

---

## 8. Testing Steps (from spec)

1. Create assessment: POST /api/user/assessment with valid body and Bearer token → expect 200 and `assessment_id`.
2. Upload images: POST /api/user/assessment/upload?assessmentId=<id> with multipart front, left, right (JPG/PNG, ≤5MB each) → expect 200.
3. Submit assessment: POST /api/user/assessment/submit with body `{ assessmentId: "<id>" }` → expect 200 and `report_id`.
4. List reports: GET /api/user/reports → expect 200 and array including the new report.
5. Report detail: GET /api/user/reports/<reportId> → expect 200 with report, recommendedProducts, recommendedDermatologists.
