# Store Partner Panel Backend — Completion Report

## 1. Files Created or Updated

### Created

- **backend/supabase/store-panel-schema.sql**  
  SQL script for Supabase: creates tables `store_profiles`, `inventory`, `orders`, `order_items`, `store_notifications`. All reference `profiles(id)` or `products(id)` or each other. RLS enabled with policies so store partners can only access their own profile, inventory, orders, and notifications. Indexes on `store_id`, `user_id`, `order_id`, `created_at`. Run after auth-profiles and public-panel schemas. Includes policies for service-role inserts (orders, order_items, store_notifications) and user read-own-orders.

- **backend/src/modules/partner/store/repositories/store.repository.ts**  
  CRUD for `store_profiles`: getProfileById, createProfile, updateProfile. Notifications: getNotificationsByStoreId, markNotificationRead, createNotification.

- **backend/src/modules/partner/store/repositories/inventory.repository.ts**  
  findByStoreId, findByIdAndStoreId, create (status = pending), update (stock_quantity, price_override), delete. All scoped by store_id.

- **backend/src/modules/partner/store/repositories/orders.repository.ts**  
  findByStoreId, findByIdAndStoreId, updateOrderStatus, updateOrderTracking. Uses `order_status` and `total_amount`; updates `updated_at` on status/tracking change.

- **backend/src/modules/partner/store/dto/store-profile.dto.ts**  
  CreateStoreProfileDto and UpdateStoreProfileDto: storeName, storeDescription, address, city, latitude, longitude, contactNumber, logoUrl (all optional with MaxLength/IsNumber).

- **backend/src/modules/partner/store/dto/inventory.dto.ts**  
  AddInventoryDto: productId (UUID), stockQuantity (int ≥ 0), priceOverride (optional). UpdateInventoryDto: stockQuantity, priceOverride (optional).

- **backend/src/modules/partner/store/dto/order-status.dto.ts**  
  UpdateOrderStatusDto: orderStatus (one of pending, confirmed, packed, shipped, delivered, cancelled).

- **backend/src/modules/partner/store/dto/index.ts**  
  Re-exports store profile, inventory, and order-status DTOs.

- **backend/src/modules/partner/store/validators/order-status.validator.ts**  
  ORDER_STATUS_TRANSITIONS map and isAllowedOrderStatusTransition(current, next). Enforces: pending→confirmed|cancelled; confirmed→packed|cancelled; packed→shipped; shipped→delivered.

- **backend/src/modules/partner/store/services/store.service.ts**  
  getProfile, createProfile (no-op if exists), updateProfile, getNotifications, markNotificationRead. Uses StoreRepository.

- **backend/src/modules/partner/store/services/inventory.service.ts**  
  getInventory (with product join for name/details), addProduct (validates product exists, inserts with status pending), updateInventory, deleteInventory. All by storeId.

- **backend/src/modules/partner/store/services/orders.service.ts**  
  getOrdersForStore, getOrderById, updateOrderStatus (validates transition via validator, creates store_notification on confirmed), updateOrderTracking. Scoped by storeId.

- **backend/src/modules/partner/store/services/analytics.service.ts**  
  getAnalytics(storeId): total_orders (count of orders with status in confirmed/packed/shipped/delivered), total_revenue (sum total_amount), top_products (from order_items, top 10 by revenue), monthly_sales (group by month, revenue and order_count).

- **backend/src/modules/partner/store/inventory.controller.ts**  
  Under `@Controller("partner/store")` with AuthGuard + RoleGuard("store"): GET inventory, POST inventory/add, PUT inventory/update/:id, DELETE inventory/delete/:id.

- **backend/src/modules/partner/store/orders.controller.ts**  
  GET orders, GET orders/:id, PUT orders/status/:id (body: UpdateOrderStatusDto), PUT orders/:id/tracking (body: trackingNumber).

- **backend/src/modules/partner/store/analytics.controller.ts**  
  GET analytics. All use storeId from req.user.id.

### Updated

- **backend/src/database/models/index.ts**  
  Added DbStoreProfile, DbInventory, DbStoreNotification. DbOrder updated: order_status, total_amount, tracking_number, updated_at; removed legacy status/total. DbOrderItem: order_id, product_id, quantity, price; product_name optional for joined responses.

- **backend/src/modules/partner/store/store.controller.ts**  
  Removed all order endpoints (moved to OrdersController). Added GET/POST/PUT profile, GET notifications, PUT notifications/read/:id. Same guards and base path.

- **backend/src/modules/partner/store/store.module.ts**  
  Registered InventoryController, OrdersController, AnalyticsController; providers: StoreService, InventoryService, OrdersService, AnalyticsService, StoreRepository, InventoryRepository, OrdersRepository.

---

## 2. Database Tables

| Table              | Purpose |
|--------------------|--------|
| store_profiles     | One row per store partner; id = profiles(id). store_name, store_description, address, city, latitude, longitude, contact_number, logo_url, created_at. |
| inventory          | Store’s product listings: store_id, product_id, stock_quantity, price_override, status (pending \| approved \| rejected). UNIQUE(store_id, product_id). |
| orders             | user_id, store_id, order_status (pending \| confirmed \| packed \| shipped \| delivered \| cancelled), total_amount, tracking_number, created_at, updated_at. |
| order_items        | order_id, product_id, quantity, price. |
| store_notifications| store_id, type, message, is_read, created_at. |

All FKs reference profiles, store_profiles, products. RLS restricts store access to own rows; service role used by backend bypasses RLS.

---

## 3. API Routes (base path /api/partner/store; all require AuthGuard + RoleGuard "store")

| Method | Path | Description |
|--------|------|-------------|
| GET    | /api/partner/store/profile | Return store profile for current user. |
| POST   | /api/partner/store/profile | Create store profile (body: CreateStoreProfileDto). |
| PUT    | /api/partner/store/profile | Update store profile (body: UpdateStoreProfileDto). |
| GET    | /api/partner/store/inventory | List inventory with product details. |
| POST   | /api/partner/store/inventory/add | Add product to inventory; status = pending (body: AddInventoryDto). |
| PUT    | /api/partner/store/inventory/update/:id | Update stock_quantity and/or price_override (body: UpdateInventoryDto). |
| DELETE | /api/partner/store/inventory/delete/:id | Remove inventory row. |
| GET    | /api/partner/store/orders | List orders for store. |
| GET    | /api/partner/store/orders/:id | Order details with order_items. |
| PUT    | /api/partner/store/orders/status/:id | Update order_status (body: { orderStatus }). Valid transitions enforced. |
| PUT    | /api/partner/store/orders/:id/tracking | Update tracking_number (body: { trackingNumber }). |
| GET    | /api/partner/store/analytics | total_orders, total_revenue, top_products, monthly_sales. |
| GET    | /api/partner/store/notifications | List store notifications. |
| PUT    | /api/partner/store/notifications/read/:id | Mark notification as read. |

---

## 4. Security

- **Guards:** All store routes use AuthGuard (JWT) and RoleGuard with @RequireStore() so only role `store` can access.
- **Store identity:** store_id = request.user.id = profiles.id = store_profiles.id. Every service/repository call uses this storeId and filters by store_id in DB.
- **Inventory:** Create/read/update/delete only where inventory.store_id = storeId.
- **Orders:** Only select/update orders where orders.store_id = storeId. Status transitions validated server-side.
- **Notifications:** Only list/update where store_notifications.store_id = storeId.
- **Profile:** Get/create/update only the store_profiles row where id = storeId.
- **Service role:** Supabase service role key used only in backend (getSupabaseClient); never exposed to frontend.

---

## 5. Order Workflow

- **Status transitions:** pending → confirmed \| cancelled; confirmed → packed \| cancelled; packed → shipped; shipped → delivered. Invalid transitions return 400 Bad Request.
- **Tracking:** Optional tracking_number on orders; updated via PUT orders/:id/tracking.
- **Notification:** When order status is set to confirmed, a store_notification is created (type "new_order") for that store.

---

## 6. Inventory Workflow

- **Add:** Store selects product (product_id); row inserted into inventory with status = pending. Product must exist in products table.
- **Update:** Store can update stock_quantity and price_override only (not status).
- **Delete:** Store can remove listing regardless of status.
- **Approval:** status approved/rejected is set by admin only (e.g. future PUT /api/admin/inventory/:id/status). Store backend does not expose status write for approved/rejected.

---

## 7. Integration Readiness

- **User panel / orders:** User service and DB types use order_status and total_amount. User GET /api/user/orders returns orders with these fields from the same orders table.
- **Admin approval:** Admin module can add an endpoint to set inventory.status to approved or rejected; store panel only reads status and submits with pending.
- **Public / AI:** Product listing and recommendations can filter products by inventory where status = approved and store_id matches. Orders and analytics are store-scoped for reporting and AI insights (e.g. top_products, monthly_sales).
- **Place order (user):** Order creation (user places order) is not implemented in this module; when implemented, it should insert into orders and order_items and optionally create a store_notification for the store.

---

## 8. Testing Steps (from spec)

1. Create store profile: POST /api/partner/store/profile with valid body and Bearer token (store role) → expect 200 and profile.
2. Add inventory item: POST /api/partner/store/inventory/add with productId, stockQuantity, optional priceOverride → expect 200 and row with status pending.
3. Submit product for approval: Same as step 2; admin (out of scope) sets inventory.status to approved.
4. User places order: (Separate user flow) insert into orders and order_items.
5. Store receives order: GET /api/partner/store/orders → expect new order in list.
6. Store updates shipping: PUT /api/partner/store/orders/status/:id with orderStatus packed, then shipped; optionally PUT orders/:id/tracking with trackingNumber.
7. Analytics update: GET /api/partner/store/analytics → total_orders, total_revenue, top_products, monthly_sales reflect completed orders.

---

## 9. Next Module

Dermatologist Partner Backend: consultation slots, patient requests, video consultation, prescription system.
