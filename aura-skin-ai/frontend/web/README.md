# AuraSkin AI — Frontend (Phase 1)

Next.js 14 frontend for AuraSkin AI. Phase 1 includes UI architecture, routing, layouts, and mock data only (no backend or AI).

## Tech stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** TailwindCSS, ShadCN UI (Radix primitives)
- **Animation:** Framer Motion
- **Forms:** React Hook Form, Zod
- **State:** Zustand

## Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Build

```bash
npm run build
```

## Structure

- `src/app/` — Route groups: `(public)`, `(auth)`, `(user)`, `(admin)`, `(partner)`
- `src/components/` — UI components and layouts
- `src/store/` — Zustand stores (auth, assessment)
- `src/services/` — Mock API
- `src/types/` — Shared types

## Mock login

Use `/login` and choose a role (User, Admin, Dermatologist, Store). You are redirected to the matching panel with no real backend.
