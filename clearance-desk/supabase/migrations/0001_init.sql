-- Clearance Desk (FedEx) - Supabase/Postgres schema
-- Run in Supabase SQL Editor or via `supabase db push`.

create extension if not exists pgcrypto;

-- Profiles (1:1 with auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  role text not null check (role in ('ADMIN','AGENT')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.batches (
  id uuid primary key default gen_random_uuid(),
  batch_code text not null unique,
  file_name text not null,
  kind text check (kind in ('UBOND','CONSOL','OTHER')),
  source text default 'UPLOAD',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.shipments (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.batches(id) on delete cascade,
  awb text not null,
  company_name text,
  consignee_name text,
  contact_email text,
  email_source text not null default 'STANDARD_REMARKS',
  end_result text,
  broker text,
  clearance_type text,
  location text,
  freight_value text,
  currency text,
  verdict text, -- ACCEPTED/REJECTED (import)
  preflight_result text not null check (preflight_result in ('PASS','BLOCKED','SKIPPED','REJECTED')),
  preflight_reason text,
  send_state text not null default 'NOT_SENT' check (send_state in ('NOT_SENT','SENT','FAILED')),
  sent_at timestamptz,
  link_token uuid unique,
  standard_remarks text,
  consignee_email_id_raw text, -- never used as email
  raw_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (batch_id, awb)
);

create table if not exists public.shipment_events (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid references public.shipments(id) on delete cascade,
  batch_id uuid references public.batches(id) on delete cascade,
  awb text not null,
  event_type text not null,
  actor_type text not null check (actor_type in ('SYSTEM','AGENT','ADMIN','CUSTOMER')),
  actor_id uuid references public.profiles(id),
  detail jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid references public.shipments(id) on delete cascade,
  batch_id uuid references public.batches(id) on delete cascade,
  awb text not null,
  direction text not null check (direction in ('OUTBOUND','INBOUND')),
  channel text not null default 'EMAIL',
  recipient text,
  subject text,
  template_key text,
  status text not null, -- SENT/FAILED/BLOCKED
  provider_message_id text,
  link_token uuid,
  error text,
  created_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid references public.shipments(id) on delete cascade,
  batch_id uuid references public.batches(id) on delete cascade,
  awb text not null,
  file_name text not null,
  content_type text,
  storage_bucket text not null default 'clearance-documents',
  storage_path text not null,
  source text not null check (source in ('PORTAL','AGENT','EMAIL','SYSTEM')),
  received boolean not null default true,
  uploaded_at timestamptz not null default now()
);

create table if not exists public.allow_list (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.app_settings (
  id int primary key default 1 check (id = 1),
  test_mode boolean not null default true,
  sendable_end_results text[] not null default array['NFBRK','FEBRK-JEENA','FEBRK-SUNIMPEX'],
  link_base_url text,
  checklist jsonb not null default '[
    {"name":"Commercial Invoice","required":true},
    {"name":"Packing List","required":true},
    {"name":"KYC Document","required":true},
    {"name":"IEC / GST (if applicable)","required":true}
  ]'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.app_settings (id) values (1) on conflict (id) do nothing;

-- Indexes
create index if not exists idx_shipments_batch on public.shipments(batch_id);
create index if not exists idx_shipments_awb on public.shipments(awb);
create index if not exists idx_shipments_token on public.shipments(link_token);
create index if not exists idx_shipments_send_state on public.shipments(send_state);
create index if not exists idx_events_shipment on public.shipment_events(shipment_id, created_at desc);
create index if not exists idx_events_awb on public.shipment_events(awb);
create index if not exists idx_events_type on public.shipment_events(event_type);
create index if not exists idx_messages_shipment on public.messages(shipment_id, created_at desc);
create index if not exists idx_documents_shipment on public.documents(shipment_id, uploaded_at desc);
create index if not exists idx_documents_awb on public.documents(awb);

-- Derived link status
create or replace view public.v_shipment_link_status as
select
  s.id as shipment_id,
  s.batch_id,
  s.awb,
  s.company_name,
  s.consignee_name,
  s.contact_email,
  s.end_result,
  s.broker,
  s.preflight_result,
  s.send_state,
  s.sent_at,
  s.link_token,
  coalesce(bool_or(e.event_type = 'LINK_OPENED'), false) as link_opened,
  min(e.created_at) filter (where e.event_type = 'LINK_OPENED') as link_opened_at,
  coalesce(count(d.id), 0)::int as doc_count,
  max(d.uploaded_at) as last_doc_at,
  case
    when coalesce(count(d.id), 0) > 0 then 'DOCS_RECEIVED'
    when coalesce(bool_or(e.event_type = 'LINK_OPENED'), false) then 'LINK_OPENED_AWAITING_DOCS'
    when s.send_state = 'SENT' and s.link_token is not null then 'SENT_NOT_OPENED'
    else 'NOT_SENT'
  end as link_status
from public.shipments s
left join public.shipment_events e on e.shipment_id = s.id
left join public.documents d on d.shipment_id = s.id and d.received = true
group by s.id;

create or replace view public.v_admin_link_open_dashboard as
select
  v.*,
  b.batch_code,
  b.file_name,
  b.kind,
  b.created_at as batch_created_at
from public.v_shipment_link_status v
join public.batches b on b.id = v.batch_id;

-- updated_at helper
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists trg_shipments_updated on public.shipments;
create trigger trg_shipments_updated before update on public.shipments for each row execute function public.set_updated_at();

-- RLS
alter table public.profiles enable row level security;
alter table public.batches enable row level security;
alter table public.shipments enable row level security;
alter table public.shipment_events enable row level security;
alter table public.messages enable row level security;
alter table public.documents enable row level security;
alter table public.allow_list enable row level security;
alter table public.app_settings enable row level security;

-- profiles: self read; admin read all (admin managed primarily via server route/service role)
create policy "profiles_self_read" on public.profiles for select using (auth.uid() = id);
create policy "profiles_admin_read" on public.profiles for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'ADMIN' and p.is_active)
);

-- internal tables: authenticated active agent/admin can read
create policy "internal_read" on public.batches for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active)
);
create policy "internal_read" on public.shipments for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active)
);
create policy "internal_read" on public.shipment_events for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active)
);
create policy "internal_read" on public.messages for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active)
);
create policy "internal_read" on public.documents for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active)
);
create policy "internal_read" on public.allow_list for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active)
);
create policy "admin_write_allow_list" on public.allow_list for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role='ADMIN' and p.is_active)
);
create policy "internal_read" on public.app_settings for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active)
);
create policy "admin_write_settings" on public.app_settings for update using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role='ADMIN' and p.is_active)
);

-- NOTE: Writes to batches/shipments/events/messages/documents are performed by server routes using the
-- Supabase service role (bypasses RLS) to enforce validation, audit, token scoping, and TEST MODE/allow-list.
-- Public customer portal uses server routes with token validation (no direct anon table access).

-- Bootstrap helper: after creating the first admin in Supabase Auth, run:
-- insert into public.profiles (id,email,full_name,role) values ('<auth-user-uuid>','admin@fedex.example','Admin','ADMIN');
