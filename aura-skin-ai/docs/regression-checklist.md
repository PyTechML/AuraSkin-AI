# AuraSkin AI Regression Checklist

Use this checklist after backend/frontend changes, migrations, and deployment promotion.

## 1) Authentication

- [ ] Login works for `user`, `store`, `dermatologist`, `admin`.
- [ ] Protected routes redirect unauthenticated users to login.
- [ ] Session survives hard refresh.
- [ ] Role-gated routes reject invalid role access.

## 2) Product Creation (Store Panel)

- [ ] Save Draft creates product with `draft` status.
- [ ] Submit for Approval sets product to `pending`.
- [ ] Inventory list refreshes after create/update/delete.
- [ ] Product edit returns updated values without infinite loading.

## 3) Checkout (User Panel)

- [ ] `create-checkout` request succeeds with product + quantity (+ optional store).
- [ ] Card checkout creates an order before redirecting to Stripe.
- [ ] UPI checkout returns UPI link/QR payload and renders QR in UI.
- [ ] COD checkout creates order with pending payment state.
- [ ] Checkout does not remain stuck on loading state.

## 4) Consultation Flow

- [ ] Available slots load for selected dermatologist.
- [ ] Booking creates consultation record with `pending` status.
- [ ] Slot transitions from `available` to `booked`.
- [ ] Overlapping slot creation is prevented.

## 5) Report Creation

- [ ] Manual report save includes symptoms/observations/recommendations.
- [ ] AI report generation stores report with valid `consultation_id`.
- [ ] User panel can view created report.
- [ ] Report export (CSV/JSON) downloads valid file.

## 6) Admin Approvals

- [ ] Admin can approve/reject product.
- [ ] Admin can approve/reject store.
- [ ] Admin can approve/reject dermatologist.
- [ ] Approved entities become visible in public/user directories.

## 7) Cross-Panel Propagation

- [ ] User order appears in store orders.
- [ ] Consultation booking appears in dermatologist queue.
- [ ] Doctor-created report appears in user report history.
- [ ] Product approval appears in user catalog.

## 8) Runtime/Infra Validation

- [ ] Frontend starts without runtime errors.
- [ ] Backend starts without runtime errors.
- [ ] Migrations apply successfully in target environment.
- [ ] No missing-table/FK errors in logs.
- [ ] No secrets are printed in logs.
