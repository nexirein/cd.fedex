# 45 — PRD & Technical Structure: Clearance Desk Web App (React + API + SQL)

**Status:** Proposed (PRD + structure before implementation)  
**Audience:** IT / Engineering / Product (PPO → production-ready foundation)  
**Domain:** FedEx Clearance Desk — pre-alert workflow for UBOND/CONSOL shipments

---

## 1. Product summary

Build a **full working web application** (not a presentation demo) for the Clearance Desk team to:

1. Import UBOND/CONSOL Excel batches
2. Validate shipments using business rules
3. Send pre-alert emails with a **secure tokenized customer link** (TEST MODE + allow-list)
4. Let customers open the link and upload required documents (no login)
5. Give agents/admins **traceability** and a clear **Link Open dashboard** (who opened, who didn’t, who uploaded)

The solution replaces/extends the Power Apps + SharePoint + Power Automate concept with a standard web stack: **React frontend**, **API backend**, and **SQL database** (data model provided so IT can provision/run SQL).

---

## 2. Goals & non-goals

### Goals
- **Operational UI/UX**: screens the team actually uses daily (sidebar navigation, fast workflows, clear status).
- **End-to-end traceability**: batch → shipment → message → link open → document upload → status.
- **Admin visibility**: “who opened / not opened / uploaded” in a simple, high-signal dashboard.
- **Business-rule correctness**: validation and send gating match the agreed rules.
- **Secure customer access**: tokenized links scoped to a shipment; no customer login; auditable events.
- **Impressive but clean UI**: FedEx-aligned visual language (purple/orange accents), modern layout, readable data density.

### Non-goals (v1)
- AI-vs-human routing, IGM workflows, CHA queue, metrics/BI dashboards beyond operational tracking
- Column-mapping UI (use defined import mapping)
- Multi-tenant administration
- Replacing all upstream systems; this is the Clearance Desk pre-alert/doc-collection loop

---

## 3. Personas

| Persona | Needs | Primary screens |
|---|---|---|
| **Clearance Agent** | Import batches, fix/understand validation, send pre-alerts, follow up | Dashboard, Batches, Import, Batch Board, Shipment Trace |
| **Admin / Supervisor** | See link engagement at a glance, identify non-openers/non-uploaders, monitor throughput | Admin Link Dashboard, Batches, Shipment Trace |
| **Customer (Consignee/Contact)** | Open secure link, view shipment package/checklist, upload required docs | Customer Portal (token link) |

---

## 4. Core business rules (must implement)

1. **Recipient email source**: use **Standard Remarks** (shape/extracted email). **Never** use `ConsigneeEmailID` as an email (it may contain a phone number).
2. **AWB**: 11–12 digits (normalized).
3. **Sendability / End Result** (default sendable set): `NFBRK`, `FEBRK-JEENA`, `FEBRK-SUNIMPEX`.
4. **Non-sendable with reason**: `HOLD`, `CALLING`, bare `FEBRK` (SKIPPED). Unrecognized/missing required fields handled per validation verdicts.
5. **Broker rule**: `FEBRK-*` requires a named broker (e.g., JEENA/SUNIMPEX). System never guesses.
6. **TEST MODE + allow-list**: outbound sends only to allow-listed recipients; all attempts logged.
7. **Tokenized customer link**: unique `LinkToken` (GUID) per shipment (generated at send time if missing). Link format: `/c/:token` (or `/customer?t=`).
8. **Tracking events**:
   - `LINK_OPENED` logged on first valid token open per shipment (idempotent)
   - `DOC_RECEIVED` logged per successful upload
9. **Link Status** (derived, shown everywhere relevant):
   - `NOT_SENT` — no sent pre-alert/tokenized send state
   - `SENT_NOT_OPENED` — sent with token, no `LINK_OPENED`
   - `LINK_OPENED_AWAITING_DOCS` — `LINK_OPENED` exists, no documents received
   - `DOCS_RECEIVED` — at least one portal document received

---

## 5. Information architecture & screens

### 5.1 App shell (authenticated agent/admin)
- **Persistent left sidebar**: logo/app name, nav items, environment badge (TEST MODE), user profile/role.
- **Top bar**: page title, breadcrumbs/context, global search (AWB/company/email), quick actions.
- **Content area**: responsive cards/tables, consistent spacing and status system.

**Sidebar navigation (v1):**
- Dashboard
- Import Batch
- Batches
- Link Open Dashboard (Admin)
- Shipment Trace / Search
- Users (Admin only — create users, set role, share email/password)
- Settings (admin/test mode/allow-list)

### 5.2 Screens

| Screen | Purpose | Key UI/UX elements |
|---|---|---|
| **Login / Access** | Authenticate internal users | Simple email + password login (no SSO complexity in v1) |
| **Dashboard** | Operational overview | KPI cards (batches, shipments, sent, awaiting docs, docs received), recent batches, “needs attention” queue, link funnel mini-chart (simple) |
| **Import Batch** | Upload UBOND/CONSOL Excel | Drag/drop + file picker, batch metadata, validation progress, **Accepted / Blocked / Skipped / Rejected** summary + row-level reasons (email source = Standard Remarks), “Create Batch” result |
| **Batches** | List/manage batches | Filter by date/type/status, counts per batch, open Batch Board |
| **Batch Board** | Work a batch | Batch KPIs, **filters (Link Status, pre-flight, send state)**, search, shipment table, bulk/row **Send Pre-Alerts** (allow-list + TEST MODE), row click → Shipment Trace drawer/page |
| **Shipment Trace** | Full trace for one AWB | Shipment details, pre-flight verdict/reason, token/link, outbound messages, event timeline (`PREALERT_SENT`, `LINK_OPENED`, `DOC_RECEIVED`), documents (AWB, FileName, Source, UploadedAt, Received) |
| **Admin Link Open Dashboard** | “Who opened / not opened” | High-signal table + filters: **Opened / Not Opened / Docs Received / Not Sent**, by batch/date/broker; columns: AWB, Company, Recipient, Sent At, Opened At, Last Doc At, Doc Count, Status; export CSV (v1.1) |
| **Customer Portal (`/c/:token`)** | Public tokenized page | Shipment package summary, required checklist, upload (PDF/JPG/PNG/DOCX), success states, invalid/expired token handling; logs open/upload via API |

### 5.3 UX principles
- **Status-first**: pre-flight and Link Status visible without drilling in.
- **No silent failures**: every blocked/skipped row shows an explicit reason; send actions report sent/blocked/already-sent.
- **Fast follow-up**: from Link Open Dashboard, jump directly to Shipment Trace.
- **FedEx-aligned**: purple primary, orange accent, high contrast, clear typography, generous spacing, accessible focus states.
- **Responsive**: desktop-first (agents), customer portal mobile-friendly.

---

## 6. Technical architecture (proposed)

### 6.1 Stack
- **Frontend**: React + TypeScript, Vite, React Router, TanStack Query (server state), component library approach: Tailwind CSS + accessible primitives (e.g., Radix/shadcn patterns) or a clean custom design system.
- **Backend**: Node.js + TypeScript, **NestJS** (or Express/Fastify with structured modules) REST API.
- **Database**: **SQL Server** (preferred for enterprise/FedEx alignment) or **PostgreSQL** (portable). PRD includes ANSI-friendly SQL schema; I can provide dialect-specific scripts.
- **File storage (v1)**: local disk/object storage abstraction; metadata in SQL (`documents` table). Production: S3/Azure Blob/SharePoint integration adapter.
- **Email (v1)**: adapter interface. Dev: SMTP/Ethereal or log-only; Prod: Microsoft Graph / Outlook connector / SMTP relay (TEST MODE + allow-list enforced in service layer).
- **Auth (v1, simple)**: local email + password login (JWT/session). **Admin creates users** and shares credentials with the team. No SSO/Entra complexity in v1. Roles: `ADMIN`, `AGENT`. Seeded initial admin; basic password change/reset by admin. Designed for future SSO/Entra ID.

### 6.2 High-level modules
- `import` — Excel parse + validation + batch/shipment persistence
- `shipments` — query, trace, status computation
- `messaging` — pre-alert composition, token generation, allow-list/test-mode send, message log
- `customer-link` — token resolve, link-open idempotency, checklist, upload
- `admin` — link engagement aggregates and reporting
- `audit/events` — append-only shipment events

### 6.3 API (illustrative v1)
| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/auth/login` | agent/admin login |
| `GET` | `/api/dashboard/summary` | KPIs + queues |
| `POST` | `/api/batches/import` | upload `.xlsx` (multipart) → validate/create batch |
| `GET` | `/api/batches` | list batches |
| `GET` | `/api/batches/:id` | batch detail + stats |
| `GET` | `/api/batches/:id/shipments` | board rows (filters: status, pf, search) |
| `POST` | `/api/batches/:id/send-prealerts` | send eligible (allow-list/test mode) |
| `GET` | `/api/shipments/:awb/trace` | shipment + events + messages + documents |
| `GET` | `/api/admin/link-dashboard` | opened/not opened/docs aggregation & rows |
| `GET` | `/api/c/:token` | **public** resolve package + checklist; logs `LINK_OPENED` once |
| `POST` | `/api/c/:token/documents` | **public** multipart upload; logs `DOC_RECEIVED` |

---

## 7. SQL data model (run-ready foundation)

> IT can run/provision from this model. Final script will be delivered as a migration (`/db/migrations/001_init.sql`) with chosen dialect (SQL Server/PostgreSQL).

### 7.1 Core tables
- **`users`** — internal users/roles
- **`batches`** — import batch metadata (`batch_code`, file_name, kind UBOND/CONSOL, created_by, created_at)
- **`shipments`** — one row per AWB in batch
  - identity: `id (pk)`, `batch_id (fk)`, `awb`
  - parties/contact: `company_name`, `consignee_name`, `contact_email` (from Standard Remarks), `email_source`, `location`
  - clearance: `end_result`, `broker`, `clearance_type`, `freight_value`, `currency`
  - validation: `verdict`, `preflight_result` (PASS/BLOCKED/SKIPPED/REJECTED), `preflight_reason`
  - send/link: `send_state` (NOT_SENT/SENT/FAILED), `sent_at`, `link_token` (unique, nullable until generated), `test_mode` flag/context
  - raw: `standard_remarks`, `consignee_email_id_raw` (never used as email), `raw_json` (nvarchar(max)/jsonb)
- **`shipment_events`** — append-only audit (`shipment_id/awb`, `event_type`, `actor_type` SYSTEM/AGENT/CUSTOMER, `actor_id`, `detail`, `created_at`)
  - types: `BATCH_IMPORTED`, `VALIDATED`, `PREALERT_SENT`, `LINK_OPENED`, `DOC_RECEIVED`, `SEND_BLOCKED`
- **`messages`** — outbound/inbound log (`direction`, `channel` EMAIL, `recipient`, `subject`, `template`, `status`, `provider_id`, `link_token`, `created_at`)
- **`documents`** — uploads/attachments (`awb/shipment_id`, `file_name`, `content_type`, `storage_path`, `source` PORTAL/AGENT/EMAIL/SYSTEM, `received`, `uploaded_at`)
- **`allow_list`** (or config) — TEST MODE allowed recipients
- **`app_settings`** — sendable end results, test mode, link base URL, checklist config

### 7.2 Derived/computed views (for Admin Link Dashboard)
- **`v_shipment_link_status`** — computes `NOT_SENT / SENT_NOT_OPENED / LINK_OPENED_AWAITING_DOCS / DOCS_RECEIVED` from `shipments`, `shipment_events`, `documents`.
- **`v_admin_link_open_dashboard`** — joins shipment + latest `LINK_OPENED`/sent + doc counts.

### 7.3 Key constraints/indexes
- `UNIQUE(batch_id, awb)` (or business rule for re-import)
- `UNIQUE(link_token)` where not null
- Indexes: `shipments(batch_id)`, `shipments(send_state)`, `shipments(link_token)`, `shipment_events(shipment_id, event_type, created_at)`, `documents(shipment_id)`

---

## 8. Proposed project structure

```text
clearance-desk/
  README.md
  docker-compose.yml              # optional: api + db + web
  docs/
    PRD.md                        # this document (or linked)
  db/
    migrations/
      001_init.sql                # SQL schema (IT-runnable)
      002_seed_settings.sql
  apps/
    api/                          # backend (NestJS/Express TS)
      src/
        modules/
          auth/
          batches/
          shipments/
          messaging/
          customer-link/
          admin/
          events/
        common/                   # validation, guards, errors
        config/
      package.json
    web/                          # React + TS + Vite
      src/
        app/                      # router, layout, providers
        components/               # ui primitives + shared
        features/
          dashboard/
          import/
          batches/
          batch-board/
          shipment-trace/
          admin-link-dashboard/
          customer-portal/
        lib/                      # api client, utils, types
        styles/
      package.json
  packages/                       # optional shared types/validation
    shared/
      src/
```

*(If you prefer a simpler single-repo without `apps/`/`packages`, I’ll flatten it to `backend/` + `frontend/` + `db/`.)*

---

## 9. Implementation phases (after PRD approval)

1. **Foundation**: repo scaffold, SQL migration, API skeleton, React shell + sidebar/layout + auth stub.
2. **Core agent flow**: Import Batch (Excel parse/validate) → Batches/Batch Board → Shipment Trace.
3. **Send + token link**: token generation, TEST MODE/allow-list, message log, send-state updates.
4. **Customer portal**: public `/c/:token`, `LINK_OPENED` idempotency, upload + `DOC_RECEIVED`, document storage.
5. **Admin Link Dashboard**: opened/not-opened/docs views, filters, drill-down to trace.
6. **Polish**: UI/UX refinement, empty/loading/error states, audit details, export, deployment config.

---

## 10. Open decisions (confirm before build)

1. **SQL dialect**: SQL Server or PostgreSQL? (default recommendation: **SQL Server** for enterprise alignment; I can output either.)
2. **Backend framework**: **NestJS** (structured) or **Express/Fastify** (lighter)?
3. **Auth** (confirmed simple): local email + password; **Admin creates users** and shares credentials. Includes Admin “Users” screen. (Future: SSO/Entra.)
4. **File storage**: local volume for v1 vs Azure Blob/S3?
5. **Email provider**: Graph/Outlook vs SMTP relay (with TEST MODE/allow-list enforced in-app).
6. **Import source**: browser Excel upload to API (recommended) vs SharePoint drop-folder ingestion.

---

## 11. Acceptance criteria (v1 demoable “full working”)

- Agent can import a batch, see correct pre-flight verdicts/reasons (email from Standard Remarks).
- Agent can send pre-alerts; only allow-listed recipients send in TEST MODE; `LinkToken` generated; message logged.
- Customer can open `/c/:token`, view package, upload docs.
- System records `LINK_OPENED` once and `DOC_RECEIVED` on upload.
- **Batch Board** and **Admin Link Open Dashboard** clearly show **Not Sent / Sent-Not Opened / Link Opened-Awaiting Docs / Docs Received** and who opened/not opened.
- Sidebar navigation, consistent UI, responsive customer portal.

---

*Next step: confirm open decisions (especially SQL dialect + backend choice) and I’ll scaffold the project structure, generate the runnable SQL migration, and build the React + API implementation in phases.*
