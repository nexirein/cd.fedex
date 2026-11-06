# 46 — Architecture: Clearance Desk Web App (Vercel + Supabase)

**Status:** Proposed architecture/design (before build)  
**Hosting:** **Vercel** (web app). **Backend/data:** **Supabase** (Postgres, Auth, Storage). Privileged server logic runs in **Vercel Route Handlers** (Node) for easy SMTP/Excel/service-role handling.

---

## 1. Goals
- Full working UI/UX (not a presentation): agent workspace, shipment trace, customer portal, **admin link-open dashboard** (“who opened / not opened / uploaded”).
- **Simple auth**: admin creates users and shares email/password; roles `ADMIN`, `AGENT`.
- **Supabase-native**: Postgres for data, Storage for documents, Auth for identity, Edge Functions for privileged/business logic and secrets (SMTP, service role).
- **Correct business rules**: Standard Remarks email source, AWB normalization, EndResult/broker/sendability, TEST MODE + allow-list, tokenized customer link, `LINK_OPENED` (idempotent) / `DOC_RECEIVED` tracking.

---

## 2. High-level architecture (Vercel-optimized)

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    Vercel: Next.js App (App Router)                │
│  React UI (Agent/Admin sidebar app + Public /c/[token])             │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ Route Handlers /api/* (Node runtime)                          │  │
│  │ - admin user create (service role)                            │  │
│  │ - import/validate Excel                                       │  │
│  │ - send pre-alerts (SMTP cargo-paf, allow-list, TEST MODE)    │  │
│  │ - customer token resolve + idempotent LINK_OPENED             │  │
│  │ - customer upload -> Storage + DOC_RECEIVED                   │  │
│  └───────────────────────────────────────────────────────────────┘  │
└───────────────┬───────────────────────────────┬─────────────────────┘
                │ Supabase SSR/JS (auth)        │ server-side service role
                ▼                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Supabase Platform                            │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────────────┐ │
│  │ Auth         │ │ Postgres     │ │ Storage                      │ │
│  │ users/sess.  │ │ tables/views │ │ private bucket: clearance-docs│ │
│  │ admin APIs   │ │ RLS policies │ │ signed URLs / server uploads  │ │
│  └──────────────┘ └──────────────┘ └──────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
                           SMTP (cargo-paf style creds)
```

### Principles
- **Vercel hosts everything user-facing**: Next.js pages + API routes in one deployable app.
- **Client** uses Supabase Auth/session + limited reads where safe; **never** holds service role or SMTP password.
- **Server (Vercel Route Handlers, Node runtime)** holds `SUPABASE_SERVICE_ROLE_KEY` + SMTP secrets; performs privileged writes, validation, email send, token/customer operations, and audit events.
- **Supabase** is the system of record (Postgres/Auth/Storage). RLS protects direct client access; server uses service role only where required.

---

## 3. App structure (Next.js on Vercel)

```text
clearance-desk/
  package.json
  next.config.ts
  tsconfig.json
  tailwind.config.ts           # optional; or CSS modules/tokens
  .env.example                 # NEXT_PUBLIC_SUPABASE_URL/ANON_KEY + server secrets
  middleware.ts                # auth/role guards (agent/admin routes)
  supabase/
    migrations/                # SQL you run in Supabase (tables/views/RLS/indexes)
    seed.sql                   # optional initial admin/settings placeholders
  src/
    app/
      layout.tsx
      globals.css
      login/page.tsx
      (app)/                   # authenticated agent/admin shell
        layout.tsx             # AppShell (sidebar + topbar)
        page.tsx               # Dashboard
        import/page.tsx
        batches/page.tsx
        batches/[id]/page.tsx  # Batch Board
        shipments/[awb]/page.tsx
        admin/links/page.tsx   # Admin Link Open Dashboard
        admin/users/page.tsx
        admin/settings/page.tsx
      c/[token]/page.tsx       # Public Customer Portal
      api/
        admin/users/route.ts
        batches/import/route.ts
        batches/[id]/send-prealerts/route.ts
        customer/[token]/route.ts
        customer/[token]/documents/route.ts
    components/
      layout/                  # Sidebar, Topbar, AppShell
      ui/                      # Button, Card, Table, Badge, Input, Modal, Drawer, Toast
      domain/                  # LinkStatusBadge, PreflightBadge, Timeline, KpiCard
    lib/
      supabase/
        client.ts              # browser
        server.ts              # SSR/server
        admin.ts               # service role (server-only)
      email/smtp.ts            # nodemailer cargo-paf style (server-only)
      import/validate.ts       # Standard Remarks, AWB, EndResult, broker rules
      rules.ts                 # status labels/badges
      format.ts
    styles/
      tokens.css               # FedEx design tokens (source of truth)
    types/
      database.ts
      domain.ts
```

### Routing
| Path | Access | Screen |
|---|---|---|
| `/login` | public | Login |
| `/` | authenticated | Dashboard |
| `/import` | authenticated | Import Batch |
| `/batches` | authenticated | Batches list |
| `/batches/:id` | authenticated | Batch Board |
| `/shipments/:awb` | authenticated | Shipment Trace |
| `/admin/links` | `ADMIN` | Link Open Dashboard |
| `/admin/users` | `ADMIN` | User management (create/share credentials flow) |
| `/admin/settings` | `ADMIN` | TEST MODE, allow-list, sendable end results, SMTP status indicator (no secrets shown) |
| `/c/:token` | public | Customer Portal |

---

## 4. Supabase data model (Postgres)

> Implement as SQL migrations in `supabase/migrations/`. You can run via Supabase SQL editor/CLI.

### 4.1 Tables
- **`profiles`** (1:1 with `auth.users`)
  - `id uuid pk references auth.users(id)`
  - `email text`, `full_name text`, `role text check (role in ('ADMIN','AGENT'))`
  - `is_active bool`, `created_at`, `updated_at`
- **`batches`**
  - `id uuid pk`, `batch_code text unique`, `file_name text`, `kind text` (`UBOND`/`CONSOL`)
  - `source text`, `created_by uuid`, `created_at`
- **`shipments`**
  - `id uuid pk`, `batch_id uuid fk`, `awb text`
  - `company_name text`, `consignee_name text`, `contact_email text`, `email_source text` (default `STANDARD_REMARKS`)
  - `end_result text`, `broker text`, `clearance_type text`, `location text`
  - `freight_value text/numeric`, `currency text`
  - `verdict text`, `preflight_result text` (`PASS|BLOCKED|SKIPPED|REJECTED`), `preflight_reason text`
  - `send_state text` (`NOT_SENT|SENT|FAILED`), `sent_at timestamptz`, `link_token uuid/text unique`
  - `standard_remarks text`, `consignee_email_id_raw text` (never used as email), `raw_json jsonb`
  - `created_at`, `updated_at`
  - `unique(batch_id, awb)`
- **`shipment_events`** (append-only)
  - `id uuid pk`, `shipment_id uuid fk`, `awb text`, `batch_id uuid`
  - `event_type text` (`BATCH_IMPORTED`,`VALIDATED`,`PREALERT_SENT`,`SEND_BLOCKED`,`LINK_OPENED`,`DOC_RECEIVED`)
  - `actor_type text` (`SYSTEM|AGENT|ADMIN|CUSTOMER`), `actor_id uuid null`, `detail text/jsonb`, `created_at`
- **`messages`**
  - `id uuid pk`, `shipment_id uuid fk`, `awb text`, `batch_id uuid`
  - `direction text` (`OUTBOUND|INBOUND`), `channel text` (`EMAIL`), `recipient text`
  - `subject text`, `template_key text`, `status text` (`SENT|FAILED|BLOCKED`), `provider_message_id text`
  - `link_token text`, `error text`, `created_at`
- **`documents`**
  - `id uuid pk`, `shipment_id uuid fk`, `awb text`, `batch_id uuid`
  - `file_name text`, `content_type text`, `storage_bucket text`, `storage_path text`
  - `source text` (`PORTAL|AGENT|EMAIL|SYSTEM`), `received bool default true`, `uploaded_at timestamptz`
- **`allow_list`**
  - `id uuid pk`, `email text unique`, `is_active bool`, `created_at`
- **`app_settings`** (single-row or key/value)
  - `test_mode bool`, `sendable_end_results text[]` default `{NFBRK,FEBRK-JEENA,FEBRK-SUNIMPEX}`
  - `link_base_url text`, `checklist jsonb`

### 4.2 Views (admin/link status)
- **`v_shipment_link_status`**: derives `NOT_SENT | SENT_NOT_OPENED | LINK_OPENED_AWAITING_DOCS | DOCS_RECEIVED` using `send_state/link_token` + existence of `LINK_OPENED` event + `documents`.
- **`v_admin_link_open_dashboard`**: shipment + recipient + `sent_at` + first/last `LINK_OPENED` + doc count + last `DOC_RECEIVED` + derived status; optimized for “who opened / not opened”.

### 4.3 Indexes
- `shipments(batch_id)`, `shipments(link_token)`, `shipments(send_state)`, `shipments(awb)`
- `shipment_events(shipment_id, created_at desc)`, `shipment_events(event_type)`, `shipment_events(awb)`
- `messages(shipment_id, created_at desc)`, `documents(shipment_id, uploaded_at desc)`

### 4.4 RLS (summary)
- `profiles`: user reads own; admin reads all / manages via Edge Function or admin policy.
- `batches/shipments/events/messages/documents`: `AGENT`/`ADMIN` authenticated read; writes through Edge Functions where validation/audit required (or controlled policies). 
- Public customer access **does not** use anon table reads; it goes through **Edge Functions** that validate `token` and return only scoped data.

---

## 5. Server logic (Vercel Route Handlers, Node runtime)

| Route | Auth | Purpose |
|---|---|---|
| `POST /api/admin/users` | `ADMIN` | Create Supabase Auth user + `profiles` row; admin sets/shares credentials (simple flow). |
| `POST /api/batches/import` | `AGENT/ADMIN` | Parse `.xlsx` (Node), normalize/validate (Standard Remarks email, AWB 11–12, EndResult, broker), create batch+shipments+events. |
| `POST /api/batches/[id]/send-prealerts` | `AGENT/ADMIN` | Enforce sendability + **TEST MODE/allow-list**, generate `link_token`, send via **SMTP/nodemailer (cargo-paf style)**, log `messages`, set `send_state=SENT`, append events. |
| `GET/POST /api/customer/[token]` | public (token) | Validate token, return scoped package/checklist/docs; **idempotent** `LINK_OPENED` (first open per shipment). |
| `POST /api/customer/[token]/documents` | public (token) | Validate token/file, upload to Supabase Storage, insert `documents` (AWB, FileName, Source=PORTAL, Received, UploadedAt), append `DOC_RECEIVED`. |

**Vercel env secrets (server-only, never `NEXT_PUBLIC_`):** `SUPABASE_SERVICE_ROLE_KEY`, `MAIL_DRIVER`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`. Public: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Also set `NEXT_PUBLIC_APP_URL` for token links.

---

## 6. Email (SMTP, cargo-paf pattern)
- Reuse cargo-paf env shape: `MAIL_DRIVER`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`.
- Implementation in Edge Function (Deno-compatible SMTP client) or a small Node mailer endpoint if needed; v1 can use a fetch-to-Node helper, but preferred: **Edge Function** with secure SMTP handling.
- **App rules enforced before send**: `preflight_result=PASS`, sendable end result, broker rules satisfied, allow-list match in TEST MODE. Log every attempt to `messages` + `shipment_events`.

---

## 7. Storage
- Bucket: `clearance-documents` (**private**).
- Path convention: `batches/{batch_id}/shipments/{awb}/{timestamp}_{safeFileName}`.
- Allowed types: PDF/JPG/JPEG/PNG/DOC/DOCX; size limit enforced.
- `documents` row always written with `awb`, `file_name`, `source='PORTAL'` (customer) or `AGENT`, `received=true`, `uploaded_at`.

---

## 8. Key user flows
1. **Admin setup**: login (seeded admin) → create AGENT users (email/password) → share credentials → configure allow-list/TEST MODE.
2. **Import**: agent uploads `.xlsx` → `import-batch` validates (email from Standard Remarks, AWB 11–12, EndResult/broker) → batch + shipments + verdicts/reasons.
3. **Send**: Batch Board → Send Pre-Alerts → Edge Function generates token, builds `/c/:token`, sends allow-listed SMTP in TEST MODE, logs message/event.
4. **Customer**: opens `/c/:token` → `customer-get-package` logs `LINK_OPENED` once → uploads docs → `customer-upload-document` stores file + `DOC_RECEIVED`.
5. **Trace/Admin**: Batch Board shows Link Status; **Admin Link Open Dashboard** shows opened/not opened/awaiting docs/docs received with filters and drill-down to Shipment Trace.

---

## 9. Non-functional / quality
- Auditability: append-only `shipment_events`; message log; document metadata.
- Security: no service role/SMTP in browser; token-scoped public access; RLS for internal tables.
- UX: sidebar shell, loading/empty/error states, clear badges/reasons, responsive customer portal.
- Observability: Edge Function logs; surface send/upload failures in UI.

---

## 10. Build sequencing (Vercel-hosted)
1. Supabase SQL migrations (tables, views, RLS, indexes) + Storage bucket + seed settings/admin placeholder.
2. **Next.js (App Router)** scaffold on Vercel: FedEx tokens, **sidebar AppShell**, Supabase auth, role guards.
3. Admin Users + Settings (TEST MODE/allow-list, sendable end results).
4. Import Batch (Route Handler + Excel parse/validation) + Batches/Batch Board + Shipment Trace.
5. Send pre-alerts (nodemailer SMTP, cargo-paf env) + token link generation.
6. Public Customer Portal `/c/[token]` + idempotent `LINK_OPENED` + uploads to Supabase Storage + `DOC_RECEIVED`.
7. **Admin Link Open Dashboard** (opened/not opened/awaiting docs/docs received) + polish/QA.

*See `47_FEDEX_DESIGN_SYSTEM.md` for visual/UX specs.*
