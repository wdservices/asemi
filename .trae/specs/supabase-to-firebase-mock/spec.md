# Asemi - Supabase to Firebase + Seeded Mock Store Swap - Product Requirements Document

## Overview

- **Summary**: Replace the Supabase Postgres/Auth/Storage integration layer with a Firebase-shaped integration (`src/integrations/firebase/`) that: (1) exposes a thin client adapter matching the query surface used by routes; (2) runs entirely against an in-memory seeded mock store (no Firebase project required) so the entire UI renders populated on first run; and (3) is structured so a real Firebase Web SDK can be dropped in later by changing one backend driver file without touching route code or hooks.
- **Purpose**: Let the user design/demo the product UI now without provisioning a cloud DB, while locking in Firebase-compatible data model semantics for the future migration.
- **Target Users**: Product developers iterating on UI locally (no real backend), reviewers running the app to demo screens, future maintainers wiring up Firebase Web SDK.

## Goals

- Route files and `lib/auth.ts` hooks compile and run without importing or calling `@supabase/supabase-js`.
- Every page renders populated content on first launch (no empty dashboards).
- Write flows (create product, generate batch, update profile, admin approve/reject, QR print mark-exported, wallet top-up demo) mutate state locally so clicking actions produces visible changes within the same session.
- Data model uses Firestore-shaped semantics (collections/documents with string ids; sub-collections possible but not required yet) with optional `userId` / `companyId` ownership fields mirroring the future Firebase rules/queries shape.
- `tsc --noEmit` zero errors; `npm run build` passes; `npm run lint` zero errors.

## Non-Goals

- Provisioning a real Firebase project, running Firestore emulator, or adding Firebase Admin SDK server code.
- Server-side rendering changes: the adapter runs client-side (TanStack Query fetches from in-memory synchronous source wrapped in Promises).
- Real OAuth flows or magic-link emails. Mock auth signs into demo users (company user + admin user) with a button toggle.
- Security rules / RLS / rule enforcement tests at the adapter layer. (Mock store trusts all calls; future real Firebase layer must apply security via Firestore Rules.)
- Sub-collections or complex joins. Keep the initial mock model flat, like the current Supabase tables.

## Background & Context

- Current stack: TanStack Start/Router v1 + React 19 + shadcn/ui + Supabase.
- Existing DB layer (`@/integrations/supabase/*`) is used from ~14 route files, `lib/auth.ts`, `integrations/lovable.ts`. It exposes: `from(…).select().eq().order().maybeSingle().single()`, insert/update/delete, `.rpc(name, args)`, `.auth.getSession()/signInWithOAuth()/signOut()`, `.storage.from(bucket).upload()/getPublicUrl()/createSignedUrl()`.
- The `Database` type in `supabase/types.ts` defines ~15 tables + 10 RPCs that pages call. We preserve a nearly-identical `Database` type under `integrations/firebase/types.ts` so routes can keep using `Tables<"companies">` shape.
- User explicitly said "we are skipping DB for now, but we shall be using firebase" and picked option B (full swap now) with "Sample seeded demo data" (to render populated).
- Supabase folder/files remain in the repo for reference (in a `_supabase-legacy` sense or unchanged) but MUST NOT be imported by runtime code after the swap.

## Functional Requirements

- **FR-1**: New integration folder `src/integrations/firebase/` exposes `client.ts` (default export adapter `fb`) with API surface sufficient for every current call site in route files: `fb.from(col).select(fields?).eq(k,v).order(k,{ascending?})?.limit(n)?.maybeSingle()?.single()` returning same-shaped `{ data, error }` Promises; `from(col).insert(obj)`/`.update(obj)`/`.delete()`; `fb.rpc(name, args)` Promise returning `{ data, error }`; `fb.auth.getSession()` / `signInWithOAuth({provider})` / `signOut()` Promise; `fb.storage.from(bucket).upload(key,file,{upsert?})` Promise; `getPublicUrl(key)` sync; `createSignedUrl(key,ttl)` Promise.
- **FR-2**: Adapter delegates to `mockStore.ts` in the same folder — a plain-module singleton holding collections as Record<string, Doc> maps, pre-populated with seed data on first import. Mutations write back to the maps; read queries filter/order from maps.
- **FR-3**: Seed data covers: 2 demo users (regular + admin); 1 company each (one `approved` status with wallet balance + usage; one `pending` for admin queue to exercise approval screens); ≥4 products with seeded imageUrls + specs JSON; ≥3 batches generated with linked codes (≥20 codes in first batch so QR print renders populated, ≥1 batch marked exported already); scans entries (≥1 scan/code for first 10 codes, including some distinct cities to populate the "scans over time" and "cities" analytics); ≥1 flagged code + ≥1 consumer report for fraud/reports pages; wallet row + ≥2 invoice rows; ≥1 extra `needs_info` or `rejected` company to exercise onboarding/pending states.
- **FR-4**: `lib/auth.ts` re-implements `useSession()`, `useIsAdmin()`, `useMyCompany()`, `useSignOut()` hooks using the Firebase adapter (via React Query, same keys where possible). Also adds a helper `useSignInAs(userId)` for the demo auth screen picker.
- **FR-5**: Every route file that previously imported `@/integrations/supabase/client` or `@/integrations/supabase/types` now imports from `@/integrations/firebase/client` and `@/integrations/firebase/types` respectively. No route file references the path `@/integrations/supabase/` after refactor.
- **FR-6**: RPC implementations (`generate_batch_paid`, `calculate_price`, `company_stats`, `mark_codes_exported`, `topup_wallet`, `admin_approve_company` / `admin_reject_company` / `admin_request_info`, `set_code_review_status`, `admin_review_report`, `has_role`) are ported to pure TS functions that read/write `mockStore.ts`, matching prior semantics:
  - `calculate_price` uses the same progressive ₦150/120/100 tier brackets from `pricing.ts` and subtracts company's `free_codes_used` from first 20 free.
  - `generate_batch_paid` atomically creates batch + N codes, deducts wallet, increments `free_codes_used` and `total_codes_generated` and returns new batch + ids.
  - `admin_approve_company` first time: credits 20 free codes to wallet as `wallet_balance += 20 * 150`.
  - `mark_codes_exported` sets `exported_at = now` and increments `print_count += 1` for codes in batch.
  - `topup_wallet` increments wallet_balance and inserts invoice row.
  - Remaining RPCs update status fields and admin_note / review_status / reviewed as appropriate.
- **FR-7**: Storage upload in `mockStore.ts` returns deterministic public URLs (`https://mock-fb.local/product-images/{key}`) without writing files; product images already seeded with placeholders URLs using the same convention so `<img src>` renders (can be SVGs/data: or use placeholder pattern; the build requires only valid URLs).
- **FR-8**: `integrations/lovable.ts` (stub proxy) changes to call `fb.auth.signInWithOAuth` instead of supabase equivalent.
- **FR-9**: `auth.tsx` login screen converts to a Demo User Picker: two buttons ("Continue as Demo Company" and "Continue as Demo Admin"). Clicking writes a mock session and navigates to `/dashboard`. This replaces the Google/GitHub OAuth card UI since there's no OAuth provider yet.

## Non-Functional Requirements

- **NFR-1**: Idempotency — reloading dev server resets mock store because it's in module memory (acceptable per "skipping DB"); but within a single client session the same sequential writes produce consistent reads.
- **NFR-2**: Minimal route diffs — keep query structure, destructuring patterns, and error handling in page components as close as possible to their current form. The adapter deliberately returns `{ data, error }` shaped results so pages don't gain new error paths.
- **NFR-3**: Type-safety parity — `Database` type in firebase/types.ts must be assignable from the perspective of each page (same table names and columns currently used). Where exactOptionalPropertyTypes or optionality differs, adjust the adapter-side type, not every call site.
- **NFR-4**: Small network — no additional heavy deps. Install `firebase` package peer (optional; default to mock), but don't initialize it if env vars are absent (the adapter prefers `mockStore.ts` when `VITE_FIREBASE_API_KEY` is unset).

## Constraints

- **Technical**: Must keep using TanStack Query, React 19, TanStack Router v1 file-based routes, and current package versions (`package.json` can only add `firebase` dependency; no TanStack or React major upgrades).
- **Technical**: Adapter must never throw synchronous errors from public methods. All public methods return Promises that resolve to `{ data, error }` tuples (mirroring Supabase).
- **Business**: UI text/branding stays "Asemi".
- **Dependencies**: `npm install firebase` allowed. All other deps are the current set.

## Assumptions

- TanStack Start file-routes and SSR won't call adapter during server render; data fetching runs client side via useQuery. (If server loads happen, the adapter is isomorphic: the in-memory store simply has per-request empty state — which is fine because we won't actually SSR with it, and the code must simply not throw.)
- User will provide Firebase env vars later; for now absence of vars means mock mode. We don't ship a Firebase config.
- All 11 authenticated routes + public routes (/, /verify, /v/$code, /auth) continue working with the adapter's surface.

## Acceptance Criteria

### AC-1: No Supabase imports at runtime

- **Type**: `rule`
- **Given**: The project source tree after refactor
- **When**: Searching every non-test `.ts/.tsx` source file under `src/` for literal string `"@/integrations/supabase/"`
- **Then**: Zero matches in route files, hooks, lib/*, components, or integrations that are imported at runtime. (Keeping `src/integrations/supabase/` directory itself as dead legacy reference is allowed; it just must not be imported.)
- **Pass Condition**: `rg "@/integrations/supabase/" src/routes src/lib src/components src/integrations/firebase src/integrations/lovable.ts` returns 0 lines.
- **Evidence**: Shell ripgrep (or grep) output, plus tsc build without `@supabase/supabase-js` referenced in the compiled output.

### AC-2: All screens render populated on first load

- **Type**: `rule`
- **Given**: Clean browser session navigating via demo sign-in (company user)
- **When**: User visits `/dashboard`, `/products`, `/batches` (all 3 tabs), `/analytics`, `/billing`, `/profile`; then admin user visits `/admin`, `/admin/companies`, `/admin/fraud`, `/admin/reports`
- **Then**: Every page shows ≥2 non-empty seeded data rows in tables/charts; no runtime error toast or blank "No data" placeholders on the primary list.
- **Pass Condition**: (a) ≥4 products visible, ≥3 batches visible with ≥1 having CSV/QR buttons, ≥1 invoice row, ≥1 scan chart with datapoints, ≥1 fraud entry, ≥1 report, pending company queue non-empty.
- **Evidence**: Dev server smoke test screenshots; or console no-exceptions + snapshot of the seeds store counts matching thresholds.

### AC-3: Write flows mutate state visibly

- **Type**: `rule`
- **Given**: Signed in as company demo user on each page
- **When**: User performs: (a) creates a new product; (b) generates a 50-code batch (live price panel deducts from wallet correctly); (c) updates company profile name and saves; (d) admin approves the pending company.
- **Then**: Optimistic updates aside, re-rendered UI reflects each change immediately within the session. (New product in list; new batch row and wallet balance lower by the correct price; profile header shows new name; pending company no longer in approval queue and its wallet increased by 20*150 for first-approve free codes.)
- **Pass Condition**: All 4 mutations pass without error toast and persisted readback matches the written values.
- **Evidence**: Inline assertions or dev console logs showing state delta.

### AC-4: TypeScript and build pass

- **Type**: `rule`
- **Given**: Refactored tree
- **When**: `npx tsc --noEmit && npm run build && npm run lint` runs
- **Then**: All three exit with code 0 (lint 0 errors — warnings allowed).
- **Pass Condition**: exit code 0
- **Evidence**: Last 20 lines of each command output.

### AC-5: Firebase drop-in readiness

- **Type**: `rubric`
- **Dimension**: Ease of swapping mock backend for real Firebase Web SDK later
- **Scale**: 1-5
- **Anchors**:
  1 = Route code is tightly coupled to mock internals (would need rewrite per page)
  3 = Adapter exists but uses mismatched semantics vs Firebase (e.g. custom fluent API that doesn't map cleanly)
  5 = Route code calls thin wrappers with identical shape to `collection().where().get()` / `doc().set()` / Storage ref `put()` semantics, or the adapter's current fluent surface can be re-implemented on top of Firebase in one file change with no route edits.
- **Pass Threshold**: >= 4
- **Evidence**: Code review of adapter module boundaries and call sites.

### AC-6: Minimal route churn

- **Type**: `rubric`
- **Dimension**: How much business logic moved vs import-path-only diffs
- **Scale**: 1-5
- **Anchors**:
  1 = Every query rewritten manually with lots of logic changes, high regression risk
  3 = Half imports / half query rewrites
  5 = Diff is almost entirely import lines + occasional type-assertion cleanups; JSX and inline control flow unchanged
- **Pass Threshold**: >= 4
- **Evidence**: `git diff --stat src/routes` showing import churn is the dominant change, and per-file insertions/deletions stay under ~20% of file length.

## Open Questions

- [ ] (Deferred) Which Firebase Auth providers should real-OAuth support later? Left as pluggable future work.
- [ ] (Deferred) Should mock state persist to `localStorage` across browser refreshes? Spec defaults to NO (fresh seeds every reload) to keep demo predictable. If user prefers persistence, add a 1-line toggle.
- [ ] (Deferred) Move legacy Supabase folder to a non-imported sibling location or delete outright? Default: leave as dead reference in place for now.
