# Dermatologist Partner Backend — Completion Report

## 1. Files Created or Updated

### Created

- **backend/supabase/dermatologist-panel-schema.sql**  
  SQL script for Supabase: creates tables `dermatologist_profiles`, `consultation_slots`, `consultations`, `prescriptions`, `dermatologist_notifications`, `earnings`. All reference `profiles(id)` or each other. RLS enabled (backend uses service role). Indexes on dermatologist_id, slot_date, user_id, slot_id, consultation_id. Run after auth-profiles-schema.

- **backend/src/modules/partner/dermatologist/repositories/dermatologist.repository.ts**  
  Profile: getProfileById, createProfile, updateProfile. Notifications: getNotificationsByDermatologistId, markNotificationRead, createNotification. Patient/report: getPatientUserIdsByDermatologistId, hasConsultationWithDermatologist, getReportsByUserId, getAssessmentsByUserId, getAssessmentImagesByAssessmentId, getRecommendedProductsForReport, getProfileByIdFromProfiles.

- **backend/src/modules/partner/dermatologist/repositories/slots.repository.ts**  
  findByDermatologistId, findByIdAndDermatologist, create, update, delete. All scoped by dermatologist_id.

- **backend/src/modules/partner/dermatologist/repositories/consultations.repository.ts**  
  findByDermatologistId, findByIdAndDermatologist, create, updateStatus, getSlotById, setSlotStatus.

- **backend/src/modules/partner/dermatologist/repositories/prescriptions.repository.ts**  
  findByConsultationIdAndDermatologist, create.

- **backend/src/modules/partner/dermatologist/repositories/earnings.repository.ts**  
  create, getAggregateByDermatologistId (total_consultations, total_earnings, pending_payout, monthly_revenue), existsByConsultationId.

- **backend/src/modules/partner/dermatologist/dto/dermatologist-profile.dto.ts**  
  CreateDermatologistProfileDto, UpdateDermatologistProfileDto: clinicName, specialization, yearsExperience, consultationFee, bio, clinicAddress, city, latitude, longitude, profileImage, licenseNumber (optional, with MaxLength/Min).

- **backend/src/modules/partner/dermatologist/dto/slot.dto.ts**  
  CreateSlotDto: date (IsDateString), startTime, endTime (time regex), status optional. UpdateSlotDto: same fields optional.

- **backend/src/modules/partner/dermatologist/dto/prescription.dto.ts**  
  CreatePrescriptionDto: consultationId (UUID), prescriptionText, recommendedProducts (UUID[]), followUpRequired.

- **backend/src/modules/partner/dermatologist/dto/index.ts**  
  Re-exports profile, slot, prescription DTOs.

- **backend/src/modules/partner/dermatologist/services/dermatologist.service.ts**  
  getProfile, createProfile, updateProfile, getNotifications, markNotificationRead, getPatients, getPatientById (profile + assessments + reports with recommended_products), getBookingsByDermatologist (legacy), getAvailability (legacy). Uses DermatologistRepository, SlotsRepository, ConsultationsRepository.

- **backend/src/modules/partner/dermatologist/services/slots.service.ts**  
  listByDermatologist, create, update, delete. Uses SlotsRepository.

- **backend/src/modules/partner/dermatologist/services/consultations.service.ts**  
  listByDermatologist, getById, approve (sets status confirmed, slot booked), reject (sets status cancelled, slot available if was pending), notifyNewConsultationRequest. Uses ConsultationsRepository, DermatologistRepository.

- **backend/src/modules/partner/dermatologist/services/prescriptions.service.ts**  
  create (validates consultation belongs to dermatologist and is confirmed/completed, creates prescription, sets consultation completed, creates earning if fee set), getByConsultationId. Uses PrescriptionsRepository, ConsultationsRepository, DermatologistRepository, EarningsRepository.

- **backend/src/modules/partner/dermatologist/services/earnings.service.ts**  
  getAggregate (total_consultations, total_earnings, pending_payout, monthly_revenue). Uses EarningsRepository.

- **backend/src/modules/partner/dermatologist/slots.controller.ts**  
  Under `@Controller("partner/dermatologist/slots")` with AuthGuard + RoleGuard("dermatologist"): GET "", POST create, PUT update/:id, DELETE delete/:id.

- **backend/src/modules/partner/dermatologist/consultations.controller.ts**  
  Under `@Controller("partner/dermatologist/consultations")` with AuthGuard + RoleGuard("dermatologist") and @Throttle(consultation: 60/min): GET "", GET :id, PUT approve/:id, PUT reject/:id.

- **backend/src/modules/partner/dermatologist/prescriptions.controller.ts**  
  Under `@Controller("partner/dermatologist/prescriptions")`: POST create, GET :consultationId.

- **backend/src/modules/partner/dermatologist/earnings.controller.ts**  
  Under `@Controller("partner/dermatologist/earnings")`: GET "".

### Updated

- **backend/src/database/models/index.ts**  
  Added DbDermatologistProfile, DbConsultationSlot, DbConsultation, DbPrescription, DbDermatologistNotification, DbEarning.

- **backend/src/modules/partner/dermatologist/dermatologist.controller.ts**  
  GET/POST/PUT profile, GET patients, GET patients/:id, GET notifications, PUT notifications/read/:id, GET bookings (legacy), GET availability (legacy). Removed PUT availability (replaced by slots CRUD). All use dermatologistId from req.user.id.

- **backend/src/modules/partner/dermatologist/dermatologist.module.ts**  
  Registered SlotsController, ConsultationsController, PrescriptionsController, EarningsController; providers: all five services and five repositories.

- **backend/src/core/app.module.ts**  
  ThrottlerModule: added `{ name: "consultation", ttl: 60_000, limit: 60 }` for consultation endpoints.

---

## 2. Database Tables

| Table | Purpose |
|-------|--------|
| dermatologist_profiles | One row per dermatologist partner; id = profiles(id). clinic_name, specialization, years_experience, consultation_fee, bio, clinic_address, city, latitude, longitude, profile_image, license_number, verified (default false), created_at. |
| consultation_slots | dermatologist_id, slot_date, start_time, end_time, status (available \| booked \| blocked). |
| consultations | user_id, dermatologist_id, slot_id, consultation_status (pending \| confirmed \| completed \| cancelled), consultation_notes, created_at. |
| prescriptions | consultation_id, user_id, dermatologist_id, prescription_text, recommended_products (uuid[]), follow_up_required (default false), created_at. |
| dermatologist_notifications | dermatologist_id, type, message, is_read (default false), created_at. |
| earnings | dermatologist_id, consultation_id, amount, status (pending \| paid), created_at. |

All FKs reference profiles or dermatologist_profiles. No changes to existing tables (profiles, dermatologists, recommended_dermatologists, user-panel tables).

---

## 3. API Endpoints

Base path: `/api/partner/dermatologist`. All require AuthGuard + RoleGuard("dermatologist").

| Method | Path | Description |
|--------|------|-------------|
| GET | /profile | Return dermatologist profile. |
| POST | /profile | Create profile (body: CreateDermatologistProfileDto). |
| PUT | /profile | Update profile (body: UpdateDermatologistProfileDto). |
| GET | /patients | List patients (distinct user_id with consultations). |
| GET | /patients/:id | Patient profile + assessments + reports + recommended_products; only if user has consultation with this dermatologist. |
| GET | /notifications | List dermatologist notifications. |
| PUT | /notifications/read/:id | Mark notification read. |
| GET | /bookings | List consultations (legacy). |
| GET | /availability | List slots (legacy). |
| GET | /slots | List all slots. |
| POST | /slots/create | Create slot (body: date, startTime, endTime, status?). |
| PUT | /slots/update/:id | Update slot. |
| DELETE | /slots/delete/:id | Delete slot. |
| GET | /consultations | List consultations. Rate limited 60/min. |
| GET | /consultations/:id | Consultation details. Rate limited 60/min. |
| PUT | /consultations/approve/:id | Approve (status → confirmed, slot → booked). Rate limited 60/min. |
| PUT | /consultations/reject/:id | Reject (status → cancelled). Rate limited 60/min. |
| POST | /prescriptions/create | Create prescription (body: consultationId, prescriptionText?, recommendedProducts?, followUpRequired?). Sets consultation completed; creates earning if consultation_fee set. |
| GET | /prescriptions/:consultationId | Get prescription for consultation. |
| GET | /earnings | Aggregates: total_consultations, total_earnings, pending_payout, monthly_revenue. |

---

## 4. Consultation Workflow

1. User books a slot (future user-side endpoint creates row in `consultations` with status pending; can call `notifyNewConsultationRequest` to create dermatologist_notification).
2. Dermatologist GET /consultations sees request.
3. Dermatologist PUT /consultations/approve/:id → consultation_status = confirmed, slot status = booked.
4. Consultation is conducted (off-platform or in-app).
5. Dermatologist POST /prescriptions/create with consultationId → prescription created, consultation_status = completed, earning row created (amount = dermatologist_profiles.consultation_fee, status pending).
6. GET /earnings shows total_consultations, total_earnings, pending_payout, monthly_revenue.

---

## 5. Security

- Every endpoint resolves dermatologist_id from `req.user.id` (AuthGuard).
- RoleGuard("dermatologist") ensures only dermatologist role can access.
- Repositories filter all queries by dermatologist_id (slots, consultations, prescriptions, notifications, earnings).
- GET /patients/:id: access only if the patient (user_id) has at least one consultation with this dermatologist.
- Prescription create: consultation must belong to dermatologist and be confirmed or completed.
- No service-role key or sensitive config exposed to frontend.

---

## 6. Integration with User Reports

- GET /patients/:id returns profile (profiles), assessments (assessments), reports (reports) for that user, and for each report the recommended_products (with product details from products). Data is read from existing user-panel tables (assessments, reports, recommended_products, profiles). No schema changes to user panel; dermatologist module only reads.

---

## 7. Integration Readiness for AI / Admin

- Dermatologist data (slots, consultations, prescriptions, earnings) is stored in dedicated tables. Admin backend can:
  - Verify dermatologists (update dermatologist_profiles.verified).
  - Read consultations and prescriptions for analytics.
- AI or analytics can aggregate consultation outcomes and prescription patterns without frontend changes.

---

## 8. Next Module

Admin Backend System: admin approvals, user moderation, store approvals, dermatologist verification, platform analytics.
