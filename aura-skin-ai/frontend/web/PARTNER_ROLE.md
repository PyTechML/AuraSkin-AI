# Store Partner Role — Capabilities

This document describes what Store Partner (and Dermatologist-as-partner) accounts **can** and **cannot** do in the AuraSkin AI Partner Panel.

## CAN

- Create and manage products (draft, edit, submit for review, archive).
- Submit products for admin approval (cannot publish without approval).
- Manage inventory and stock levels.
- Process and fulfill orders (confirm, pack, ship, deliver; forward-only status flow).
- View analytics related to their own store (revenue, orders, conversion, retention).
- Manage payouts, balance, and bank account details.
- Respond to booking requests (when linked as a dermatologist).
- Manage store profile (name, address, hours, contact, etc.).
- View assigned users (CRM), order history, consultation history, notes.
- Receive and act on notifications (orders, inventory, approvals, payouts).

## CANNOT

- Directly publish a product without admin approval.
- Modify user medical data.
- Access other stores’ data.
- Override payment confirmation or change payment status.
- Change commission logic or platform settings.

## Guard

Access to the Partner Panel is enforced by `PartnerGuard` (STORE and DERMATOLOGIST roles only). Feature-level restrictions (e.g. “Submit for Review” vs “Publish”) are enforced in the UI and API.
