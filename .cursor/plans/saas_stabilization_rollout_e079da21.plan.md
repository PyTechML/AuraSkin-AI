---
name: SaaS stabilization rollout
overview: "Stabilize the production SaaS architecture through a phased, low-regression rollout: hybrid schema transition, broken flow repair, cross-panel propagation fixes, and browser-level validation using only live data paths."
todos:
  - id: baseline-contract-map
    content: |
      Scan entire codebase for mock data usage patterns.

      Search keywords:
      mock
      dummy
      placeholder
      staticData
      fakeData
      sampleData
      fallbackData

      Remove fallback arrays where real DB query exists.

      Ensure components do not default to mock values when API returns empty array.

      Expected result:
      UI renders empty-state components instead of mock values.
    status: completed
  - id: db-hybrid-migrations
    content: |-
      Map all DTO interfaces used between frontend and backend.

      Confirm field consistency across:

      Order DTO
      Product DTO
      Consultation DTO
      Report DTO
      Profile DTO
      Availability DTO
      Patient DTO

      Ensure frontend payload structure matches backend validation decorators.
    status: completed
  - id: checkout-payment-fix
    content: |
      Create regression validation checklist file.

      docs/regression-checklist.md

      Include verification steps for:

      authentication
      product creation
      checkout
      consultation
      report creation
      admin approvals
      cross-panel propagation
    status: completed
  - id: user-ai-dynamicization
    content: |-
      Verify environment variables exist:

      SUPABASE_URL
      SUPABASE_SERVICE_KEY
      OPENAI_API_KEY
      STRIPE_SECRET_KEY
      NEXT_PUBLIC_API_URL

      Ensure no secrets logged in console.
    status: pending
  - id: store-panel-stability
    content: |-
      Create patients table migration.

      patients table must include:

      id UUID PK
      doctor_id FK dermatologist_profiles.id
      user_id FK profiles.id nullable
      name TEXT
      age INT
      notes TEXT nullable
      created_at timestamp
      updated_at timestamp

      Ensure indexes exist on:

      doctor_id
      user_id
    status: in_progress
  - id: dermatologist-panel-completion
    content: |
      Create availability_slots table migration.

      availability_slots must include:

      id UUID PK
      doctor_id FK dermatologist_profiles.id
      date DATE
      start_time TIME
      end_time TIME
      status ENUM:

      available
      booked
      blocked

      Ensure composite index on:

      doctor_id + date
    status: pending
  - id: admin-panel-repair
    content: |-
      Ensure consultations table references patient_id.

      consultations must include:

      patient_id FK patients.id
      doctor_id FK dermatologist_profiles.id
      slot_id FK availability_slots.id
    status: pending
  - id: cross-panel-propagation
    content: |-
      Add FK constraint:

      reports.consultation_id references consultations.id

      Add:

      ON DELETE CASCADE
    status: pending
  - id: browser-e2e-validation
    content: |-
      Remove orphan report records.

      Delete rows where consultation_id does not exist.
    status: pending
  - id: todo-1774548009099-i6n33m1l2
    content: |
      Verify profiles.role ENUM includes:

      user
      store
      dermatologist
      admin
    status: pending
  - id: todo-1774548086662-s03dhrr11
    content: |-
      Create compatibility SQL view:

      consultation_slots_view

      Map legacy consultation slot logic to availability_slots.
    status: pending
  - id: todo-1774548095585-2fz59elp9
    content: |-
      Fix checkout 400 error.

      Verify create-checkout DTO matches payload.

      Ensure required fields included:

      product_id
      store_id
      user_id
      quantity
    status: pending
  - id: todo-1774548101336-g5elaqkc3
    content: |-
      Ensure order created before payment session.

      Insert into orders table before Stripe session creation.
    status: pending
  - id: todo-1774548106746-i7uvqz7z5
    content: |
      Implement UPI QR generation.

      Ensure QR payload generated when UPI selected.

      Ensure QR visible on checkout page.
    status: pending
  - id: todo-1774548112502-wg5pxxc1t
    content: |-
      Implement Cash on Delivery option.

      When COD selected:

      create order
      set payment_status pending
    status: pending
  - id: todo-1774548117818-e91l1p7h1
    content: |
      Ensure payment webhook updates order status.

      order.payment_status updated on payment success.
    status: pending
  - id: todo-1774548123037-ld6x7k2j7
    content: |-
      Replace static AI narrative text.

      Inject dynamic variables into OpenAI prompt:

      name
      age
      sleep hours
      hydration
      skin concerns
      confidence score
    status: pending
  - id: todo-1774548129320-hjdqtdupe
    content: |
      Replace routine placeholder instructions.

      Routine must include dynamic product categories:

      cleanser
      serum
      moisturizer
      sunscreen
    status: pending
  - id: todo-1774548134592-b5jxtdgwx
    content: |
      Fix product detail page rendering.

      Ensure product details fetched from DB:

      title
      description
      price
      image
    status: pending
  - id: todo-1774548139595-q7salwjzn
    content: |-
      Fix store directory data source.

      Show only approved store accounts.
    status: pending
  - id: todo-1774548144640-ntn5znvr8
    content: |
      Fix dermatologist directory data source.

      Show only approved dermatologist accounts.
    status: pending
  - id: todo-1774548150082-nrl3z6izk
    content: |-
      Fix consultation booking flow.

      Create consultation record with:

      doctor_id
      user_id
      slot_id
      status pending
    status: pending
  - id: todo-1774548155089-0slkqbtcm
    content: |-
      Ensure booking updates slot status.

      availability_slots.status becomes booked.
    status: pending
  - id: todo-1774548159993-x6a4bnfg8
    content: |-
      Fix infinite loading state in product creation.

      Ensure promise resolves correctly.

      Stop UI from hanging on "Submitting...".
    status: pending
  - id: todo-1774548164687-0yluo6y8k
    content: |-
      Ensure Save Draft inserts product with status draft.

      Inventory page must update automatically.
    status: pending
  - id: todo-1774548172631-yl0dwtvj1
    content: |
      Ensure Submit for Approval updates product status pending.

      Admin panel must see pending product.
    status: pending
  - id: todo-1774548177885-1xbdth8xh
    content: |-
      Fix product edit mutation loop.

      Ensure PATCH response updates UI state.
    status: pending
  - id: todo-1774548182139-d3xbbv8g4
    content: |
      Fix inventory query refresh.

      Invalidate cache after product mutation.
    status: pending
  - id: todo-1774548187056-0wa7m08vb
    content: |-
      Ensure approved products appear in user catalog.

      Filter products where status approved.
    status: pending
  - id: todo-1774548191604-tzpqo0eyl
    content: |
      Fix store orders mapping.

      Ensure orders filtered by store_id.
    status: pending
  - id: todo-1774548196271-txto2vcs3
    content: |
      Fix payout aggregation logic.

      Sum completed order totals grouped by store_id.
    status: pending
  - id: todo-1774548201664-zc3mme85w
    content: |-
      Implement patient CRUD UI.

      Create:

      Add Patient form
      Edit Patient form
      Delete Patient action

      Ensure patient saved in patients table.
    status: pending
  - id: todo-1774548250807-4dz2otg26
    content: |-
      Implement availability slot creation UI.

      Allow doctor to:

      select date
      select start time
      select end time

      Insert into availability_slots table.
    status: pending
  - id: todo-1774548257078-39u0ddwhz
    content: |
      Prevent overlapping availability slots.

      Validate new slot does not overlap existing slot.
    status: pending
  - id: todo-1774548262883-ow44x6nya
    content: |-
      Connect availability slots to user booking page.

      User must see available slots.
    status: pending
  - id: todo-1774548268308-wecnf7fda
    content: |
      Implement report builder UI.

      Manual report must include:

      symptoms
      observations
      recommendations
    status: pending
  - id: todo-1774548273805-1n8c0dwd4
    content: |-
      Implement AI report builder.

      Generate report using consultation data.

      Save report linked to consultation_id.
    status: pending
  - id: todo-1774548279686-50rktwynd
    content: |-
      Fix earnings calculation.

      Sum consultation payments grouped by doctor_id.
    status: pending
  - id: todo-1774548285471-68m1d3tq3
    content: |-
      Replace mock analytics values.

      Remove placeholder rating values.
    status: pending
  - id: todo-1774548290117-4bvrwjimu
    content: |-
      Implement settings persistence.

      Connect settings form submit to backend API.
    status: pending
  - id: todo-1774548295676-y2jqdofxd
    content: |-
      Fix session log retrieval.

      Ensure sessions table queried correctly.

      Display active sessions.
    status: pending
  - id: todo-1774548301553-opgan18en
    content: |-
      Connect report export functionality.

      Generate CSV or JSON file from report data.
    status: pending
  - id: todo-1774548307467-gtyov5oy7
    content: |-
      Ensure feature flags persist state.

      Update DB when toggled.
    status: pending
  - id: todo-1774548313088-k18d9fcxf
    content: |-
      Ensure rule engine configuration saved.

      Persist rule values.
    status: pending
  - id: todo-1774548317619-bqvla5pbn
    content: |-
      Ensure order propagation:

      User places order
      Store panel receives order
    status: pending
  - id: todo-1774548322754-pmgmi772u
    content: |-
      Ensure consultation propagation:

      User books consultation
      Doctor panel receives consultation
    status: pending
  - id: todo-1774548327893-zdidw38g0
    content: |
      Ensure report propagation:

      Doctor creates report
      User panel displays report
    status: pending
  - id: todo-1774548333203-zzk0n6kyo
    content: |-
      Ensure approval propagation:

      Admin approves product
      Product visible in user panel
    status: pending
  - id: todo-1774548337750-c3xjtvs5n
    content: |-
      Ensure store approval propagation.

      Approved store visible in directory.
    status: pending
  - id: todo-1774548342640-bwxcezw56
    content: |-
      Ensure doctor approval propagation.

      Approved doctor visible in directory.
    status: pending
  - id: todo-1774548347751-ydpie873m
    content: |-
      Ensure frontend refetch after mutations.

      Invalidate queries after:

      create
      update
      delete
    status: pending
  - id: todo-1774548361624-zegicye05
    content: |
      Ensure OpenAI prompt uses dynamic variables.

      No static fallback narrative.
    status: pending
  - id: todo-1774548368512-btiv6w7be
    content: |
      Ensure routine generator uses dynamic categories.
    status: pending
  - id: todo-1774548369639-30q16m26k
    content: Ensure CV pipeline output passed to report generator.
    status: pending
  - id: todo-1774548373842-teff4io31
    content: |
      Ensure AI reports stored in database.
    status: pending
  - id: todo-1774548378855-qrzopttud
    content: |
      Ensure AI reports stored in database.
    status: pending
  - id: todo-1774548382364-d6w846wep
    content: |-
      Simulate USER FLOW:

      login
      assessment
      AI report
      routine
      browse products
      view product
      add to cart
      checkout
      place order
    status: pending
  - id: todo-1774548391435-t7651ujgv
    content: |
      Simulate STORE FLOW:

      view order
      verify payout update
    status: pending
  - id: todo-1774548397009-n2u6pqeha
    content: |-
      Simulate DERMATOLOGIST FLOW:

      receive consultation
      create report
    status: pending
  - id: todo-1774548402767-9wap0x44r
    content: |-
      Simulate ADMIN FLOW:

      approve product
      approve store
      approve doctor
    status: pending
  - id: todo-1774548408913-pl8nhoyhf
    content: Verify cross-panel propagation works.
    status: pending
  - id: todo-1774548413793-o9dded0rr
    content: Verify frontend starts without errors.
    status: pending
  - id: todo-1774548418512-hwsu6oeu7
    content: Verify backend starts without errors.
    status: pending
  - id: todo-1774548423047-frcifmile
    content: Verify migrations run successfully.
    status: pending
  - id: todo-1774548427985-doik9myq6
    content: Verify no missing table errors.
    status: pending
  - id: todo-1774548432759-fwxb1vow4
    content: Verify no console errors.
    status: pending
  - id: todo-1774548437321-udmgmdi5e
    content: Verify no infinite loading states.
    status: pending
  - id: todo-1774548442183-aj4kotp7u
    content: |-
      all panels operate using live database data

      all workflows complete successfully

      no mock values remain

      cross-panel propagation works

      system behaves as production SaaS
    status: pending
isProject: false
---

# Production SaaS Stabilization Plan

## GOAL

Transform partially wired multi-panel SaaS architecture into fully live, synchronized, production-grade system where:  

USER PANEL  
STORE PANEL  
DERMATOLOGIST PANEL  
ADMIN PANEL  

all operate on consistent live database state.  

No mock data allowed.  
No placeholder workflows allowed.  
No disconnected schemas allowed.  
No broken cross-panel propagation allowed.  

---

GLOBAL SYSTEM GUARANTEES AFTER EXECUTION  

All UI data must come from database.  
All mutations must persist in database.  
All workflows must propagate across panels.  
All schemas must support existing UI.  
All APIs must return valid live data.  
All panels must function for newly created accounts.  
All local dev services must boot without error.  
All role-based routes must remain protected.  

---

PHASE 0  
INTERFACE FREEZE AND IMPACT MAPPING  

Objective:  
Prevent regression while fixing architecture.  

Tasks:  

0.1 scan DTO usage across backend modules:  

payments  
orders  
consultations  
reports  
products  
profiles  
availability slots  
patients  

0.2 map frontend service consumers:  

frontend/web/src/services/api.ts  
frontend/web/src/services/apiPartner.ts  
frontend/web/src/services/apiAdmin.ts  

0.3 identify shared interfaces:  

UserProfile  
StoreProfile  
DermatologistProfile  
Product  
InventoryItem  
Order  
Consultation  
Report  
AvailabilitySlot  
Patient  

0.4 freeze existing DTO contracts used in UI  

do not rename properties currently consumed.  

0.5 create regression checklist document:  

docs/regression_[matrix.md](http://matrix.md)  

---

PHASE 1  
DATABASE STRUCTURE COMPLETION  

Problem detected in audit:  
missing clinical schema tables  
orphan report rows  
incomplete FK relationships  
cross-panel sync blocked due to schema gaps  

---

1.1 CREATE PATIENTS TABLE  

table name:  
patients  

columns:  

id uuid primary key  
doctor_id uuid references dermatologist_profiles(id)  
user_id uuid nullable references profiles(id)  
name text not null  
age integer nullable  
gender text nullable  
notes text nullable  
created_at timestamp default now()  
updated_at timestamp default now()  

indexes:  

index on doctor_id  
index on user_id  

---

1.2 CREATE AVAILABILITY SLOTS TABLE  

table name:  
availability_slots  

columns:  

id uuid primary key  
doctor_id uuid references dermatologist_profiles(id)  
date date not null  
start_time time not null  
end_time time not null  
status text enum:  

available  
booked  
blocked  

created_at timestamp default now()  

indexes:  

index on doctor_id  
index on date  

---

1.3 NORMALIZE CONSULTATIONS RELATIONSHIPS  

ensure consultations table contains:  

id uuid primary key  
doctor_id uuid references dermatologist_profiles(id)  
user_id uuid references profiles(id)  
patient_id uuid references patients(id)  
slot_id uuid references availability_slots(id)  
status text enum:  

pending  
confirmed  
completed  
cancelled  

payment_status enum:  

unpaid  
paid  

created_at timestamp  

---

1.4 FIX REPORTS RELATIONSHIP  

ensure reports table contains:  

consultation_id uuid references consultations(id)  

add constraint:  

ON DELETE CASCADE  

---

1.5 REMOVE ORPHAN REPORT RECORDS  

delete rows where:  

consultation_id not found in consultations table  

---

1.6 CREATE COMPATIBILITY BRIDGE  

create SQL view:  

consultation_slots_view  

mapping to:  

availability_slots  

ensures old code referencing consultation_slots still works.  

---

1.7 VERIFY ROLE ENUM  

profiles.role must include:  

user  
store  
dermatologist  
admin  

ensure RBAC logic unchanged.  

---

PHASE 2  
USER PANEL FIXES  

---

2.1 AUTH FLOW VALIDATION  

ensure session persistence works.  

ensure JWT parsing unchanged.  

ensure login redirect works.  

---

2.2 AI REPORT DYNAMIC CONTENT  

replace static narrative text.  

inject dynamic variables:  

user_name  
age  
sleep_hours  
hydration_level  
sun_exposure  
skin_concerns  
confidence_score  

ensure prompt builder receives real user input values.  

---

2.3 ROUTINE GENERATOR DYNAMIC CONTENT  

remove placeholder routine text.  

ensure routine references real categories:  

cleanser  
serum  
moisturizer  
sunscreen  

ensure routine varies per user.  

---

2.4 FIX CHECKOUT HTTP 400 ERROR  

validate request payload matches DTO:  

product_id format correct  
store_id included  
user_id included  

ensure order record created before payment session.  

---

2.5 PAYMENT METHODS SUPPORT  

implement:  

UPI QR generation  
Card payment session  
Cash on Delivery option  

ensure order.payment_method saved.  

ensure payment_status updated.  

---

2.6 PRODUCT DETAIL PAGE  

ensure view product page loads:  

title  
description  
price  
image  
store info  

remove placeholder content.  

---

2.7 STORE DIRECTORY LIVE DATA  

filter only approved store accounts.  

remove mock arrays.  

---

2.8 DERMATOLOGIST DIRECTORY LIVE DATA  

filter only approved dermatologist accounts.  

remove mock arrays.  

---

2.9 CONSULTATION BOOKING FLOW  

booking must:  

create consultation row  
assign doctor_id  
assign slot_id  
assign user_id  
mark slot booked  

---

PHASE 3  
STORE PANEL FIXES  

---

3.1 FIX PRODUCT CREATION INFINITE LOOP  

resolve promise handling.  

ensure response updates UI state.  

---

3.2 SAVE DRAFT  

insert product with:  

status draft  

refresh inventory query.  

---

3.3 SUBMIT FOR APPROVAL  

update status pending.  

make visible in admin panel.  

---

3.4 PRODUCT EDIT FIX  

ensure PATCH response updates product state.  

prevent infinite loading state.  

---

3.5 INVENTORY REFRESH  

invalidate query cache after mutation.  

ensure inventory updates automatically.  

---

3.6 ORDER MAPPING  

ensure orders filtered by store_id.  

ensure correct relational mapping.  

---

3.7 PAYOUT CALCULATION  

sum completed orders grouped by store_id.  

---

PHASE 4  
DERMATOLOGIST PANEL FIXES  

---

4.1 PATIENT CRUD UI  

create:  

add patient form  
edit patient form  
delete patient action  

connect to patients table.  

---

4.2 AVAILABILITY SLOT CRUD  

create slot creation UI:  

date picker  
time selector  

insert rows into availability_slots table.  

prevent overlapping slots.  

---

4.3 SLOT VISIBILITY TO USER PANEL  

ensure user booking page fetches availability_slots.  

---

4.4 REPORT BUILDER  

manual report:  

symptoms  
observations  
recommendations  

AI report:  

generate from consultation data.  

save linked to consultation_id.  

---

4.5 EARNINGS CALCULATION  

sum consultation payments grouped by doctor_id.  

---

4.6 REMOVE MOCK ANALYTICS VALUES  

replace placeholder rating values.  

calculate real averages.  

---

PHASE 5  
ADMIN PANEL FIXES  

---

5.1 SETTINGS SAVE  

connect settings form submit to backend.  

persist values.  

---

5.2 SESSION LOG RETRIEVAL  

connect to sessions table.  

filter by role and active sessions.  

---

5.3 REPORT EXPORT  

connect export button to endpoint.  

generate CSV or JSON file.  

---

5.4 RULE ENGINE CONNECTION  

persist rule configurations.  

---

5.5 FEATURE FLAGS PERSISTENCE  

ensure toggles update DB.  

---

PHASE 6  
CROSS PANEL PROPAGATION  

---

validate flows:  

user places order  
store receives order  

user books consultation  
doctor receives consultation  

doctor creates report  
user sees report  

admin approves product  
product visible in user panel  

admin approves store  
store visible in directory  

admin approves doctor  
doctor visible in directory  

---

ensure frontend refetch after mutation.  

ensure relational mapping correct.  

---

PHASE 7  
AI ENGINE CONSISTENCY  

---

ensure OpenAI prompts include dynamic variables.  

ensure routine uses real product categories.  

ensure CV output mapped correctly.  

ensure AI reports saved in database.  

---

PHASE 8  
FULL SYSTEM VALIDATION MATRIX  

---

USER FLOW  

login  
assessment  
AI report  
routine  
browse products  
view product  
add to cart  
checkout  
place order  

STORE FLOW  

view order  
verify payout update  

DERMATOLOGIST FLOW  

receive consultation  
create report  

ADMIN FLOW  

approve product  
approve store  
approve doctor  

verify data propagation.  

---

FINAL STEP  
LOCAL SYSTEM BOOT VALIDATION  

---

verify:  

frontend starts without errors  

backend starts without errors  

database migrations apply successfully  

no missing tables  

no runtime exceptions  

no infinite loading states  

no console errors  

---

EXPECTED OUTPUT FROM CURSOR  

list of migrations created  

list of modified files  

list of fixed endpoints  

list of fixed UI components  

validation results per flow  

remaining warnings if any  

---

END STATE  

system behaves as production SaaS:  

real data everywhere  
all panels synchronized  
stable architecture preserved