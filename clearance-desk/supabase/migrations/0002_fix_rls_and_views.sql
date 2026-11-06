-- Fix RLS recursion and view access (run in Supabase SQL Editor)
-- Safe to run after 0001_init.sql

-- Helper functions (SECURITY DEFINER avoids RLS recursion when policies check profiles)
create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_active = true
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'ADMIN' and p.is_active = true
  );
$$;

revoke all on function public.is_active_user() from public;
revoke all on function public.is_admin() from public;
grant execute on function public.is_active_user() to authenticated;
grant execute on function public.is_admin() to authenticated;

-- Replace recursive/fragile policies
drop policy if exists "profiles_self_read" on public.profiles;
drop policy if exists "profiles_admin_read" on public.profiles;
create policy "profiles_self_read" on public.profiles for select using (auth.uid() = id);
create policy "profiles_admin_read" on public.profiles for select using (public.is_admin());

drop policy if exists "internal_read" on public.batches;
create policy "internal_read" on public.batches for select using (public.is_active_user());

drop policy if exists "internal_read" on public.shipments;
create policy "internal_read" on public.shipments for select using (public.is_active_user());

drop policy if exists "internal_read" on public.shipment_events;
create policy "internal_read" on public.shipment_events for select using (public.is_active_user());

drop policy if exists "internal_read" on public.messages;
create policy "internal_read" on public.messages for select using (public.is_active_user());

drop policy if exists "internal_read" on public.documents;
create policy "internal_read" on public.documents for select using (public.is_active_user());

drop policy if exists "internal_read" on public.allow_list;
drop policy if exists "admin_write_allow_list" on public.allow_list;
create policy "internal_read" on public.allow_list for select using (public.is_active_user());
create policy "admin_write_allow_list" on public.allow_list for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "internal_read" on public.app_settings;
drop policy if exists "admin_write_settings" on public.app_settings;
create policy "internal_read" on public.app_settings for select using (public.is_active_user());
create policy "admin_write_settings" on public.app_settings for update using (public.is_admin()) with check (public.is_admin());

-- Views: run as invoking user so RLS applies correctly (Supabase/Postgres 15+)
create or replace view public.v_shipment_link_status
with (security_invoker = true)
as
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

create or replace view public.v_admin_link_open_dashboard
with (security_invoker = true)
as
select
  v.*,
  b.batch_code,
  b.file_name,
  b.kind,
  b.created_at as batch_created_at
from public.v_shipment_link_status v
join public.batches b on b.id = v.batch_id;

-- Ensure authenticated role can select views/tables as permitted by RLS
grant usage on schema public to authenticated;
grant select on public.v_shipment_link_status to authenticated;
grant select on public.v_admin_link_open_dashboard to authenticated;
grant select on public.batches, public.shipments, public.shipment_events, public.messages, public.documents, public.allow_list, public.app_settings, public.profiles to authenticated;
