# DTO Contract Matrix

This matrix maps key frontend payload/response usage to backend DTO validators and expected fields.

## Order / Checkout DTOs

- Frontend: `frontend/web/src/services/api.ts`
  - `createCheckoutSession(payload)` sends:
    - `product_id` (string)
    - `quantity` (number)
    - `store_id` (optional string)
- Backend: `backend/src/modules/payments/dto/create-checkout.dto.ts`
  - Validates:
    - `product_id` required string
    - `quantity` required int `>= 1`
    - `store_id` optional string

## Product DTOs (Store Partner)

- Frontend: `frontend/web/src/services/apiPartner.ts`
  - `createPartnerProduct(...)` sends:
    - `name`, `description`, `category`, `price`, `stockQuantity`
    - optional `fullDescription`, `keyIngredients`, `usage`, `imageUrl`, `visibility`, `approvalStatus`
- Backend DTO references:
  - `backend/src/modules/partner/store/dto/product.dto.ts`
  - `backend/src/modules/partner/store/dto/inventory.dto.ts`

## Order Status DTO

- Frontend:
  - `updateOrderStatus(id, status)` sends `{ orderStatus }`
- Backend:
  - `backend/src/modules/partner/store/dto/order-status.dto.ts`
  - Allowed statuses:
    - `pending`, `placed`, `confirmed`, `packed`, `shipped`, `out_for_delivery`, `delivered`, `cancel_requested`, `cancelled`, `return_requested`, `refunded`

## Consultation DTOs

- Frontend calls:
  - User consultation create/list (`/user/consultations`)
  - Dermatologist consultation update (`/partner/dermatologist/consultations/:id`)
- Backend DTO references:
  - `backend/src/modules/partner/dermatologist/dto/update-consultation-clinical.dto.ts`
  - `backend/src/modules/consultation/dto/*.ts`

## Report DTOs

- Frontend reads:
  - `/user/reports`, `/user/reports/:id`
- Backend write paths:
  - manual + AI report generation in consultation/AI modules
- Key relational contract:
  - `reports.consultation_id` must reference `consultations.id` (cascade delete)

## Profile DTOs

- Frontend profile mutations:
  - user profile updates via `/user/profile`
  - partner dermatologist/store profile updates via partner endpoints
- Backend DTO references:
  - `backend/src/modules/user/dto/update-user-profile.dto.ts`
  - `backend/src/modules/partner/store/dto/store-profile.dto.ts`
  - `backend/src/modules/partner/dermatologist/dto/dermatologist-profile.dto.ts`

## Availability + Patient DTOs

- Frontend slot operations:
  - create/update/delete via `/partner/dermatologist/slots/*`
- Backend DTO references:
  - `backend/src/modules/partner/dermatologist/dto/slot.dto.ts`
- Patient shape currently resolved in frontend from live consultation/profile data;
  dedicated patient CRUD DTOs should follow `patients` table schema from migration.
