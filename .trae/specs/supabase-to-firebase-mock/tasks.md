# Asemi - Supabase → Firebase Mock Swap - Implementation Plan

## Task 1: Install firebase package + scaffold integration folder

- **Status**: `in_progress`
- **Priority**: high
- **Depends On**: None
- **Description**:
  - Run `npm install firebase` to add the dependency.
  - Create folder `src/integrations/firebase/` with:
    - `types.ts`: Re-declares a `Database` type with the same table/function shapes used currently (clone of Supabase types, removing Supabase SDK-specific generics; keep `Tables<T>` / `Functions` exports with identical signatures; adjust optionality where exactOptionalPropertyTypes was painful before).
    - `config.ts`: Exports `firebaseConfig` object from `import.meta.env` variables (VITE_FIREBASE_API_KEY, authDomain, projectId, storageBucket, messagingSenderId, appId). Returns `null` when API key is missing (mock mode).
    - `seed.ts`: Seed factory that produces pre-populated demo data matching FR-3 (2 users, 2+ companies with varied statuses, ≥4 products, ≥3 batches with codes, scans, fraud codes, reports, wallet, invoices).
    - `mockStore.ts`: Module-level singleton with collections stored as `Record<string, TableRow>`. Exports `getStore()` returning `{ collections, reset() }`; initialize from `seed.ts` on first import.
- **Acceptance Criteria Addressed**: AC-1 (foundations), AC-2 (seed existence), AC-4, AC-5
- **Test Requirements**:
  - `rule` TR-1.1: `types.ts` compiles and exports `Tables<"companies">` assignable from seed data; `tsc --noEmit` passes after this file set is created (imports of other files will fail until later tasks, so TR-1.1 only checks these 4 files in isolation).
  - `rubric` TR-1.2: Seed data coverage. Dimension: richness across tables; scale 1-5; 1 = 1 company 1 product; 3 = 2 companies basic data; 5 = every collection populated with ≥3 rows and varied statuses; threshold >= 4. Evidence: inspect seed.ts contents.
- **Notes**: Seed storage URLs use `https://mock-fb.local/product-images/seed-*` pattern. Products include placeholder image arrays of length 1-3.

## Task 2: Implement Firebase client adapter with API parity + RPCs

- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - Create `src/integrations/firebase/client.ts` exporting a singleton `fb` object (via lazy Proxy pattern matching current `supabase` shape). Its public API:
    - `fb.from(collection: string)` returns a fluent chain: `.select(fields?) -> QueryBuilder` supporting `.eq, .neq, .gte, .lte, .in, .like (no-op accept any), .order(k, {ascending?, nullsFirst?}) , .limit(n), .maybeSingle(), .single(), .range(from,to)`; all terminal methods return `Promise<{ data: any, error: any }>`.
    - Insert: `fb.from(col).insert(obj | obj[], {select?})` — writes ids into store; resolves `{ data: rows, error }`.
    - Update: `fb.from(col).update(obj)` with preceding `.eq()` filters; matches rows, applies patch; resolves `{ data, error }`.
    - Delete: `fb.from(col).delete()` with `.eq()` filters; resolves `{ data, error }`.
    - `fb.rpc(name: string, args: Record<string,any>): Promise<{ data, error }>` — dispatches to RPC module.
    - `fb.auth`: `getSession()`, `onAuthStateChange(cb)` (stub), `signInWithOAuth({provider})` (maps to mock sign-in of default demo user), `signOut()`.
    - `fb.storage`: `.from(bucket: string).upload(key, file, {upsert?, cacheControl?})`; `.getPublicUrl(key)` returns `{ data: { publicUrl } }` sync; `.createSignedUrl(key, ttl)` returns Promise with `{ data: { signedUrl } }` (same URL as public).
  - Create `src/integrations/firebase/rpc.ts` implementing the 10 RPC functions from FR-6 against `mockStore.ts`. Calculate price uses `calculatePriceLocal` from `@/lib/pricing.ts`. Wallet/invoice/codes mutations are module-transactional (mutate maps directly in the single-threaded function body, no race conditions needed).
- **Acceptance Criteria Addressed**: AC-2 (queryable from hooks), AC-3 (RPCs write back), AC-4, AC-5
- **Test Requirements**:
  - `rule` TR-2.1: Standalone script-style sanity check can be composed by tsc importing `rpc.ts` and calling `admin_approve_company` returns with wallet credit + status change. Evidence: `tsc` passes. (No runtime tests unless trivial.)
  - `rule` TR-2.2: Adapter chain `.from("companies").select("*").eq("owner_id", "demo").maybeSingle()` resolves with a company row.
  - `rubric` TR-2.3: Parity fidelity; dimension: how close API mirrors Supabase; scale 1-5; 1 = different surface; 3 = same method names but different option shapes; 5 = existing route code compiles by only changing import line; threshold >= 4. Evidence: routes compile in Task 4.

## Task 3: Rewrite lib/auth.ts hooks against Firebase adapter

- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 2
- **Description**:
  - Modify `src/lib/auth.ts`:
    - Replace `supabase` import with `fb` from `@/integrations/firebase/client`.
    - `useSession()` React Query key `["session"]` — queryFn returns `(await fb.auth.getSession()).data.session`. Session user shape should include `{ id: string, email: string, app_metadata?: { roles?: string[] } }` (mirror what `useIsAdmin` expects for the mock `has_role` RPC).
    - `useIsAdmin()` uses `fb.rpc("has_role", { _user_id, _role: "admin" })`.
    - `useMyCompany()` uses `fb.from("companies").select("*").eq("owner_id", session.user.id).maybeSingle()`.
    - `useSignOut()` calls `fb.auth.signOut()` then navigates.
    - Add new exported hook: `useDemoUserPicker()` returning a list of demo users `[{id, name, role}]` and `signInAs(userId: string): Promise<void>` that seeds mock session with that user.
    - Keep exports `CATEGORIES`, `normalizeCode`, `verifyUrl` unchanged.
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-4
- **Test Requirements**:
  - `rule` TR-3.1: No import to supabase path remains in auth.ts.
  - `rule` TR-3.2: tsc passes for auth.ts.

## Task 4: Refactor all route imports + auth.tsx to use Firebase adapter

- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 3
- **Description**:
  - Globally across `src/routes/_authenticated/*.tsx` (11 files):
    - Replace line `import { supabase } from "@/integrations/supabase/client";` with `import { fb as supabase } from "@/integrations/firebase/client";` (keeping local variable `supabase` so downstream queries in same file don't change).
    - Replace line `import type { Tables, Database } from "@/integrations/supabase/types";` with `import type { Tables, Database } from "@/integrations/firebase/types";`.
    - If any specific line has typing issues (e.g. `Database["public"]["Tables"]` access patterns), adjust only the import or cast inline.
  - Similarly for public routes: `auth.tsx`, `v.$code.tsx`, `verify.tsx`.
  - **Rework `routes/auth.tsx`**: Replace Google/GitHub OAuth cards (FR-9) with a demo user picker that lists 2 buttons using `useDemoUserPicker()` from auth.ts: (1) "Sign in as Demo Company User" (uses approved-company owner), (2) "Sign in as Demo Admin". Below buttons add a small notice: "Running in offline demo mode with seeded data. Real Firebase auth coming soon." Remove OAuth provider code.
  - **Rework `integrations/lovable.ts`**: Import Firebase adapter instead of supabase adapter.
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-6
- **Test Requirements**:
  - `rule` TR-4.1: grep/rg finds zero `"@/integrations/supabase/"` imports under `src/routes`, `src/lib`, `src/integrations/lovable.ts`, `src/integrations/firebase/`.
  - `rule` TR-4.2: `npx tsc --noEmit` exits 0 after all edits in this task.
  - `rubric` TR-4.3: Minimal route churn. Dimension: % diff per route file (non-import diff lines / total). Scale 1-5; 1 = lots of rewrites; 3 = some query shape tweaks; 5 = import-only changes; threshold >= 4. Evidence: `git diff --stat` compared to previous commit.

## Task 5: Fix v.$code.tsx + verify.tsx public verification flows against mock

- **Status**: `pending`
- **Priority**: medium
- **Depends On**: Task 4
- **Description**:
  - Public verification route `/v/$code`: `lookup_code` query or equivalent. Currently uses RPC or direct `.from("codes").select(...)`. Ensure the adapter supports the exact lookup used — if `lookup_code` RPC existed, implement it in rpc.ts as a helper that searches codes table by code. Return result with nested product/company joins (client does `.select("*, products(name, image_urls, sku), companies(name, logo_url)")`). Since joins aren't implemented in the adapter's simple `select` parser, parse simple star select; for specific joined columns, perform the join manually inside the query by looking up product/company ids on rows returned (i.e. implement a small join helper that translates comma-separated column names including parentheses). Simpler: if select string contains `(`, just return seed-joined data structure for codes row.
  - `/verify.tsx`: the manual code input page — same lookup support.
  - If there's a `record_scan` RPC (check the routes) add it; if absent, write a stub to avoid breaking; scans table already seeded.
- **Acceptance Criteria Addressed**: AC-2 (lookup works), AC-4
- **Test Requirements**:
  - `rule` TR-5.1: tsc passes for both files.
  - `rule` TR-5.2: `fb.from("codes").select("*, products(name), companies(name)").eq("code", "EXISTINGCODE").maybeSingle()` resolves with nested `products: {name}`.

## Task 6: Run build + lint + smoke

- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 5
- **Description**:
  - Run `npx tsc --noEmit`, `npm run build`, `npm run lint`. Fix any remaining errors or lint no-explicit-any regressions (add `eslint-disable-next-line` comments where any-casts are needed).
  - If the build fails due to `@supabase/supabase-js` still being referenced somewhere, clean up the dangling import.
  - Start dev server (`npm run dev`) and do a sanity curl or first page load: route `/` and `/auth` return 200.
- **Acceptance Criteria Addressed**: AC-4 (build clean), AC-2 (root pages render)
- **Test Requirements**:
  - `rule` TR-6.1: All three checks exit 0 with last-run-output evidence pasted into completion evidence section.
  - `rule` TR-6.2: `curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/auth` returns 200 (after dev server starts).

## Task 7: Independent Review

- **Status**: `pending`
- **Priority**: medium
- **Depends On**: Task 6
- **Description**:
  - Spawn an independent reviewer agent. Give them the project root, paths to `.trae/specs/supabase-to-firebase-mock/spec.md` and `tasks.md`, and the following checkpoints derived from ACs:
    - CP-R1 covers AC-1 (no supabase imports in runtime code). Run grep and report count.
    - CP-R2 covers AC-2 (seeds render). Inspect seed.ts sizes: companies.length>=3, products>=4, batches>=3, codes>=20, scans>=10, flagged_codes>=1, reports>=1, invoices>=2, wallets>=2. Count in file.
    - CP-R3 covers AC-3 (RPC port): verify rpc.ts contains the 10 named functions; check that `admin_approve_company` increments wallet_balance by 3000 (= 20*150) when company.status != approved before.
    - CP-R4 covers AC-4 (build/tsc/lint pass): rerun each command and confirm exit 0.
    - CP-U5 covers AC-5 (drop-in readiness): review client.ts vs adapter/route boundaries — can `client.ts`'s internals be swapped for real Firebase without touching routes? Score 1-5.
    - CP-U6 covers AC-6 (minimal route churn): run `git diff --stat src/routes` vs previous tree — score based on import-only vs heavy churn.
  - If reviewer finds actionable issues, add them as Issue items at the bottom of tasks.md and fix before final exit.
- **Acceptance Criteria Addressed**: All ACs independently verified
- **Test Requirements**:
  - `rule` TR-7.1: Reviewer result = `pass`. If `fail`, all issues must be drained before marking this task completed.
