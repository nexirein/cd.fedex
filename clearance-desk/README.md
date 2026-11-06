# FedEx Clearance Desk (Next.js + Supabase, Vercel)

Full working web app for Clearance Desk: import UBOND/CONSOL batches, validate (Standard Remarks email rules), send pre-alerts (TEST MODE + allow-list) with tokenized customer links, track `LINK_OPENED`/`DOC_RECEIVED`, and view an **Admin Link Open Dashboard** (who opened / not opened / uploaded).

## Stack
- **Next.js (App Router) + TypeScript + Tailwind** — deployed on **Vercel**
- **Supabase** — Postgres, Auth, Storage (private `clearance-documents`)
- **Server routes (Node)** — privileged ops, Excel import, SMTP (`nodemailer`, cargo-paf style)

## Setup
1. Create a Supabase project and run `supabase/migrations/0001_init.sql` in the SQL Editor.
2. Create Storage bucket: `clearance-documents` (private).
3. Copy `.env.example` to `.env.local` and set:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only)
   - `NEXT_PUBLIC_APP_URL` (e.g. `http://localhost:3000` or your Vercel URL)
   - SMTP vars (cargo-paf style). TEST MODE/allow-list is enforced by the app.
4. Create the first admin in Supabase Auth (Dashboard → Authentication → Users), then insert profile:
   ```sql
   insert into public.profiles (id,email,full_name,role)
   values ('<auth-user-uuid>','admin@yourco.example','Admin','ADMIN');
   ```
5. Install & run:
   ```bash
   npm install
   npm run dev
   ```

## Vercel deploy
- Import the repo/project in Vercel.
- Add all env vars above (server secrets **without** `NEXT_PUBLIC_`).
- Set `NEXT_PUBLIC_APP_URL` to your production Vercel URL.

## Key rules
- Email from **Standard Remarks** only (never `ConsigneeEmailID`).
- Sendable: `NFBRK`, `FEBRK-JEENA`, `FEBRK-SUNIMPEX` (configurable). `HOLD/CALLING/bare FEBRK` are non-sendable with reasons.
- Outbound gated by **TEST MODE + allow-list**.
- Customer link `/c/[token]`: `LINK_OPENED` logged once; uploads stored in Supabase Storage and logged as `DOC_RECEIVED` (Source=PORTAL).

## Design
FedEx-aligned tokens/components per `../docs/files/47_FEDEX_DESIGN_SYSTEM.md`. Architecture: `../docs/files/46_ARCHITECTURE_SUPABASE_CLEARANCE_DESK.md`.
