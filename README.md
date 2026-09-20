# Asemi

Build Prompt: Product Authentication Platform

Use this as the spec/prompt for building the UI (hand to a developer, or paste into a tool like v0, Cursor, or Claude Code).

1. What we're building

A platform where manufacturers (FMCG brands — soap, toothpaste, etc.) register, list their products, and generate unique verification codes (QR + human-readable fallback code) per production batch. Consumers scan the code with their native phone camera (no app required) and land on a public web page confirming whether the product is genuine, with soft fraud-escalation messaging on repeated/suspicious scans rather than a hard "used/dead" lock.

Three surfaces to build:

Consumer verification page (public, no login)

Company dashboard (manufacturers — product + batch + code management)

Admin dashboard (platform team — company approval, oversight, fraud review)

2. Consumer verification page (public)

Route: /c/:code (opened directly from QR) and a manual entry page at /verify for people typing the code in by hand.

States to design:

Genuine — first/recognized visitor (cookie/token matches or scan_count is low): green confirmation, product name, image, manufacturer name + logo, batch/production info, "Report a concern" link.

Genuine — but scanned before, different visitor (scan_count 3+, different token/ location/day): same green confirmation, plus a soft amber notice: "This code has been checked several times. If something feels off about where you got this product, let us know" → link to a short report form.

Invalid code: red state, "We couldn't find this code" + guidance to check the code was typed correctly, and a report/contact link.

Manual code entry: simple input field with formatting hints (e.g. groups of 4 characters), for consumers without a working camera scanner.

Design notes: mobile-first (this is scanned on a phone), fast-loading, no login wall, minimal text, trust-signal visual language (checkmark/shield iconography, manufacturer branding pulled from their profile).

3. Company dashboard (manufacturers)

3a. Registration & verification flow

Sign-up form: company name, CAC/business registration number, registered address, phone, email, business category, and upload of registration certificate/proof of business document (image or PDF).

Post-submit state: "Pending verification" — company cannot list products or generate codes yet.

Backend/admin-facing (not visible to company): AI-assisted document check (OCR + cross-reference against registration number) surfaces a confidence score and flags mismatches for the admin reviewer — a human admin always makes the final approve/reject decision, AI never auto-approves.

Company sees a simple status indicator: Pending / Approved / Needs more info (with admin's note if rejected or more info requested) / Rejected.

3b. Once approved — main dashboard

Overview: total products listed, total codes issued, total scans this month, flagged/suspicious scan count, subscription status.

Product listing: form to create a new product —

Product name

Category

Product description

Image upload (multiple images: front/back/label)

Ingredients/specs (optional structured fields)

SKU/internal reference (optional)

Batch / code generation: per product, "Request a new batch" — enter quantity (e.g. 1000), system generates that many unique codes, shows a progress state while generating, then provides:

Downloadable CSV of codes

Downloadable PDF/print sheet of QR labels

Batch summary (date, quantity, product)

Batch history: table of all past batches per product, with scan activity per batch (genuine scans, flagged scans, unscanned/unused codes).

Scan analytics: simple charts — scans over time, geographic spread (city-level), flagged-scan trend — per product and per batch.

Subscription/billing: current plan, usage against plan limits (e.g. codes/month), upgrade option, invoice history.

Company profile: editable business info, logo, verification documents on file.

4. Admin dashboard (platform team)

Company approval queue: list of pending registrations, each showing the uploaded documents, AI confidence score/flags, and Approve / Reject / Request more info actions with a note field.

Companies overview: searchable table of all companies — status, product count, codes issued, subscription tier, date joined.

Product & batch oversight: searchable/filterable view across all companies' products and batches (for support/investigation purposes).

Fraud/flag review queue: codes or companies that crossed a suspicion threshold (unusual scan patterns, geographic impossibilities, consumer reports submitted from the verification page) — with scan history detail per flagged code and an action to mark reviewed/escalate/contact company.

Consumer reports inbox: list of "report a concern" submissions from the public verification page, linked to the relevant code/company.

Platform metrics: total companies, total codes issued, total scans, flagged-scan rate, growth over time.

5. Core data entities (for reference while building)

Company: id, name, registration number, address, contact, logo, status (pending/approved/rejected), verification documents, subscription plan.

Product: id, company_id, name, category, description, images, specs.

Batch: id, product_id, quantity, created_at.

Code: id, batch_id, code_string, qr_url, status flags, created_at.

Scan: id, code_id, timestamp, browser_token, rough_location (city-level), device_fingerprint, flagged (bool).

Report: id, code_id, submitted_by (anonymous or contact info), message, reviewed (bool).

6. Design direction

Clean, trustworthy, minimal — this is a security/trust product, not a flashy consumer app. Favor clarity over decoration.

Company and Admin dashboards: standard dashboard layout (sidebar nav, data tables, forms) — desktop-first, since business users will manage this from a computer.

Consumer verification page: mobile-first, single-purpose, near-instant load, large clear genuine/not-genuine state.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/65604b5f-7588-459f-aa7f-566b9caef6a1).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
