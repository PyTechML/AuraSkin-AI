---
name: ""
overview: ""
todos:
  - id: todo-1774606753522-x55vp0rcb
    content: |-
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
  - id: todo-1774606755288-8kjah0501
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
  - id: todo-1774606768894-lp0rttas1
    content: |-
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
  - id: todo-1774606777421-cqj89dq53
    content: |-
      Verify environment variables exist:

      SUPABASE_URL
      SUPABASE_SERVICE_KEY
      OPENAI_API_KEY
      STRIPE_SECRET_KEY
      NEXT_PUBLIC_API_URL

      Ensure no secrets logged in console.
    status: completed
  - id: todo-1774606783836-pxc2423hc
    content: |
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
    status: completed
  - id: todo-1774606792057-q9mfgk4jf
    content: |-
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
    status: completed
  - id: todo-1774606798965-kpj0zx2lq
    content: |
      Ensure consultations table references patient_id.

      consultations must include:

      patient_id FK patients.id
      doctor_id FK dermatologist_profiles.id
      slot_id FK availability_slots.id
    status: completed
  - id: todo-1774606804210-0r7ifzwoy
    content: |-
      Add FK constraint:

      reports.consultation_id references consultations.id

      Add:

      ON DELETE CASCADE
    status: completed
  - id: todo-1774606810500-a4gufx7l2
    content: |-
      Remove orphan report records.

      Delete rows where consultation_id does not exist
    status: completed
  - id: todo-1774606816478-hnbcdt32g
    content: |
      Verify profiles.role ENUM includes:

      user
      store
      dermatologist
      admin
    status: completed
  - id: todo-1774606822104-yoal46eky
    content: |-
      Create compatibility SQL view:

      consultation_slots_view

      Map legacy consultation slot logic to availability_slots.
    status: completed
  - id: todo-1774606827012-z8tsvcss3
    content: |
      Fix checkout 400 error.

      Verify create-checkout DTO matches payload.

      Ensure required fields included:

      product_id
      store_id
      user_id
      quantity
    status: completed
  - id: todo-1774606832212-t54cetat8
    content: |
      Ensure order created before payment session.

      Insert into orders table before Stripe session creation.
    status: completed
  - id: todo-1774606842338-y5t7v1yu1
    content: |-
      Implement UPI QR generation.

      Ensure QR payload generated when UPI selected.

      Ensure QR visible on checkout page.
    status: completed
  - id: todo-1774606848162-vma1ldn5e
    content: |-
      Implement Cash on Delivery option.

      When COD selected:

      create order
      set payment_status pending
    status: completed
  - id: todo-1774606853545-36q4a4d4d
    content: |
      Ensure payment webhook updates order status.

      order.payment_status updated on payment success.
    status: completed
  - id: todo-1774606858530-it91zgb4w
    content: |
      Replace static AI narrative text.

      Inject dynamic variables into OpenAI prompt:

      name
      age
      sleep hours
      hydration
      skin concerns
      confidence score
    status: completed
  - id: todo-1774606863296-xfqux2jpx
    content: |
      Replace routine placeholder instructions.

      Routine must include dynamic product categories:

      cleanser
      serum
      moisturizer
      sunscreen
    status: completed
  - id: todo-1774606868464-b4gtz4tbp
    content: |+
      Fix product detail page rendering.

      Ensure product details fetched from DB:

      title
      description
      price
      image

    status: completed
  - id: todo-1774606874149-iesrs6yu0
    content: |
      Fix store directory data source.

      Show only approved store accounts.
    status: completed
  - id: todo-1774606878557-hz4h3e2b5
    content: |-
      Fix dermatologist directory data source.

      Show only approved dermatologist accounts.
    status: completed
  - id: todo-1774606913094-d27r2nb8d
    content: |-
      Fix consultation booking flow.

      Create consultation record with:

      doctor_id
      user_id
      slot_id
      status pending
    status: completed
  - id: todo-1774606922378-fivp7kiqp
    content: |-
      Ensure booking updates slot status.

      availability_slots.status becomes booked.
    status: completed
  - id: todo-1774606952275-anyrjsafc
    content: |-
      Fix infinite loading state in product creation.

      Ensure promise resolves correctly.

      Stop UI from hanging on "Submitting...".
    status: completed
  - id: todo-1774606959999-soy0sjn30
    content: |-
      Ensure Save Draft inserts product with status draft.

      Inventory page must update automatically.
    status: completed
  - id: todo-1774606965210-j0rvpwo4v
    content: |
      Ensure Submit for Approval updates product status pending.

      Admin panel must see pending product.
    status: completed
  - id: todo-1774606969533-y6yfunuh2
    content: |
      Fix product edit mutation loop.

      Ensure PATCH response updates UI state.
    status: completed
  - id: todo-1774606987464-qbwfizom7
    content: |-
      Fix inventory query refresh.

      Invalidate cache after product mutation.
    status: completed
  - id: todo-1774606992497-o609wz98s
    content: |-
      Ensure approved products appear in user catalog.

      Filter products where status approved.
    status: completed
  - id: todo-1774606997803-hgwlk2kyw
    content: |-
      Fix store orders mapping.

      Ensure orders filtered by store_id.
    status: completed
  - id: todo-1774607004833-mz26wectw
    content: |-
      Fix payout aggregation logic.

      Sum completed order totals grouped by store_id.
    status: completed
  - id: todo-1774607010998-ja9v11gj1
    content: |
      Implement patient CRUD UI.

      Create:

      Add Patient form
      Edit Patient form
      Delete Patient action

      Ensure patient saved in patients table.
    status: completed
  - id: todo-1774607016577-4jtg6lmmb
    content: |-
      Implement availability slot creation UI.

      Allow doctor to:

      select date
      select start time
      select end time

      Insert into availability_slots table.
    status: completed
  - id: todo-1774607023359-fpbph91oy
    content: |-
      Prevent overlapping availability slots.

      Validate new slot does not overlap existing slot.
    status: completed
  - id: todo-1774607028706-uikuawzqo
    content: |-
      Connect availability slots to user booking page.

      User must see available slots.
    status: completed
  - id: todo-1774607033550-pwzjh7jz7
    content: |
      Implement report builder UI.

      Manual report must include:

      symptoms
      observations
      recommendations
    status: completed
  - id: todo-1774607038446-kf1a0oh51
    content: |
      Implement AI report builder.

      Generate report using consultation data.

      Save report linked to consultation_id.
    status: completed
  - id: todo-1774607043272-m55soini8
    content: |-
      Fix earnings calculation.

      Sum consultation payments grouped by doctor_id.
    status: completed
  - id: todo-1774607048280-epdqqnxaa
    content: |-
      Replace mock analytics values.

      Remove placeholder rating values.
    status: completed
  - id: todo-1774607053061-eiz77twh5
    content: |-
      Implement settings persistence.

      Connect settings form submit to backend API.
    status: completed
  - id: todo-1774607058801-7tcbosbl9
    content: |-
      Fix session log retrieval.

      Ensure sessions table queried correctly.

      Display active sessions.
    status: completed
  - id: todo-1774607065105-0l5o9vrp6
    content: |-
      Connect report export functionality.

      Generate CSV or JSON file from report data.
    status: completed
  - id: todo-1774607071660-rh733q44n
    content: |-
      Ensure feature flags persist state.

      Update DB when toggled.
    status: completed
  - id: todo-1774607077145-h4qoks052
    content: |-
      Ensure rule engine configuration saved.

      Persist rule values.
    status: completed
  - id: todo-1774607081856-4vng53bmi
    content: |-
      Ensure order propagation:

      User places order
      Store panel receives order
    status: completed
  - id: todo-1774607088011-7rhml7kvs
    content: |-
      Ensure consultation propagation:

      User books consultation
      Doctor panel receives consultation
    status: completed
  - id: todo-1774607093910-hklvaf9p4
    content: |
      Ensure report propagation:

      Doctor creates report
      User panel displays report
    status: completed
  - id: todo-1774607099098-ttjfiwprq
    content: |
      Ensure approval propagation:

      Admin approves product
      Product visible in user panel
    status: completed
  - id: todo-1774607103801-rigvfuxfc
    content: |-
      Ensure store approval propagation.

      Approved store visible in directory.
    status: completed
  - id: todo-1774607108684-1s3zibdfb
    content: |
      Ensure doctor approval propagation.

      Approved doctor visible in directory.
    status: completed
  - id: todo-1774607113413-qc3hoi3gz
    content: |
      Ensure frontend refetch after mutations.

      Invalidate queries after:

      create
      update
      delete
    status: completed
  - id: todo-1774607118769-fg3ksnagb
    content: |-
      Ensure OpenAI prompt uses dynamic variables.

      No static fallback narrative.
    status: completed
  - id: todo-1774607124426-q8512bxxo
    content: Ensure routine generator uses dynamic categories.
    status: completed
  - id: todo-1774607129555-vw1wx2bpl
    content: Ensure CV pipeline output passed to report generator.
    status: completed
  - id: todo-1774607134125-38vd15u2l
    content: Ensure AI reports stored in database.
    status: completed
  - id: todo-1774607139272-0l4wgvog6
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
    status: completed
  - id: todo-1774607149272-k0adxd42k
    content: |-
      Simulate STORE FLOW:

      view order
      verify payout update
    status: completed
  - id: todo-1774607155666-ba3my8rrh
    content: |
      Simulate DERMATOLOGIST FLOW:

      receive consultation
      create report
    status: completed
  - id: todo-1774607161326-jpf0pldfd
    content: |-
      Simulate ADMIN FLOW:

      approve product
      approve store
      approve doctor
    status: completed
  - id: todo-1774607167409-09ha5axah
    content: Verify cross-panel propagation works.
    status: completed
  - id: todo-1774607173502-4h3y8h4gz
    content: |
      Verify frontend starts without errors.
    status: completed
  - id: todo-1774607179628-4xkuoktix
    content: Verify backend starts without errors.
    status: completed
  - id: todo-1774607184598-pgt377r1e
    content: |
      Verify migrations run successfully.
    status: completed
  - id: todo-1774607190146-0rbpu8zb0
    content: |
      Verify no missing table errors.
    status: completed
  - id: todo-1774607195549-kfrx0hei5
    content: Verify no console errors.
    status: completed
  - id: todo-1774607201934-kfhbp1tbt
    content: Verify no infinite loading states.
    status: completed
  - id: todo-1774607206767-fbk3a523p
    content: |-
      all panels operate using live database data

      all workflows complete successfully

      no mock values remain

      cross-panel propagation works

      system behaves as production SaaS
    status: completed
  - id: todo-1774616767165-ffvu2qxac
    content: test evrysingle thing which you build is running and perfect or still have error and bugs and problem on those all fix which you done in this plan make sure all things are fixed if not then fix them.
    status: completed
  - id: todo-1774616077108-p3m1tr480
    content: "Give proper long detaied summary what you build and fix with this plan "
    status: completed
isProject: false
---

ULTRA MASTER STABILIZATION PLAN

PROJECT: AuraSkin AI

MODE: FULL SYSTEM FIX

EXECUTION TYPE: SINGLE PASS COMPLETE STABILIZATION

GOAL

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