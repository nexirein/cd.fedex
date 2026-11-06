-- Pre-alert templates: per-use-case (NFBRK/FEBRK) config, required docs, and admin-uploaded default/template files (served via customer link)

create table if not exists public.prealert_template_configs (
  id uuid primary key default gen_random_uuid(),
  case_key text not null unique, -- NFBRK, FEBRK_JEENA, FEBRK_SUNIMPEX, FEBRK, DEFAULT
  title text not null,
  subject_template text not null,
  intro_text text not null,
  process_steps jsonb not null default '[]'::jsonb, -- [{title,text}]
  required_docs jsonb not null default '[]'::jsonb, -- [{name,required,description,hints[]}]
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.prealert_template_files (
  id uuid primary key default gen_random_uuid(),
  case_key text not null, -- matches config key, or DEFAULT
  label text not null,
  file_name text not null,
  content_type text,
  storage_bucket text not null default 'clearance-documents',
  storage_path text not null,
  is_active boolean not null default true,
  uploaded_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_prealert_template_files_case on public.prealert_template_files(case_key, is_active, created_at desc);

drop trigger if exists trg_prealert_template_configs_updated on public.prealert_template_configs;
create trigger trg_prealert_template_configs_updated before update on public.prealert_template_configs for each row execute function public.set_updated_at();

alter table public.prealert_template_configs enable row level security;
alter table public.prealert_template_files enable row level security;

-- readable by authenticated active users (agent/admin); writable via admin server routes (service role) primarily
create policy "prealert_template_configs_read" on public.prealert_template_configs for select using (public.is_active_user());
create policy "prealert_template_files_read" on public.prealert_template_files for select using (public.is_active_user());

grant select on public.prealert_template_configs, public.prealert_template_files to authenticated;

-- Seed defaults (idempotent)
insert into public.prealert_template_configs (case_key, title, subject_template, intro_text, process_steps, required_docs)
values
('NFBRK', 'NFBRK – Self/Nominated CHA Clearance',
 'FedEx Clearance: Action required for AWB {{awb}} (NFBRK)',
 'Your shipment has arrived/is pending clearance. For NFBRK (self/nominated CHA) clearance, please review the process below and upload the required documents using the secure link.',
 '[{"title":"Review shipment details","text":"Confirm AWB, consignee, and clearance type in the secure link."},{"title":"Prepare required documents","text":"Collect all required documents listed below. Default templates/reference files (if provided) are available in the secure link."},{"title":"Upload documents","text":"Upload clear copies (PDF/JPG/PNG/DOC/DOCX) against this AWB in the secure link."},{"title":"Clearance follow-up","text":"FedEx/Clearance Desk will use your uploaded documents for clearance follow-up. Respond promptly if additional information is requested."}]'::jsonb,
 '[{"name":"Commercial Invoice","required":true,"description":"Item-wise invoice with values and currency","hints":["invoice"]},{"name":"Packing List","required":true,"description":"Package contents with net/gross weight details where applicable","hints":["packing","pack"]},{"name":"KYC / Importer ID","required":true,"description":"KYC/ID as applicable (PAN/GST/IEC/supporting ID per case)","hints":["kyc","pan","gst","iec","id","passport","aadhar"]},{"name":"Authorization / CHA Document (if applicable)","required":false,"description":"Authorization or nominated CHA-related document if required","hints":["author","cha","poa"]}]'::jsonb
),
('FEBRK_JEENA', 'FEBRK – FedEx Broker Clearance (Jeena)',
 'FedEx Clearance: Action required for AWB {{awb}} (FEBRK – Jeena)',
 'Your shipment is assigned for FedEx broker clearance (Jeena). Please review the process and upload required documents in the secure link so clearance can proceed.',
 '[{"title":"Review shipment & broker","text":"This shipment is marked FEBRK with broker Jeena. Confirm details in the secure link."},{"title":"Prepare required clearance documents","text":"Use the required documents checklist below. Default FedEx/broker templates or reference files (if provided) are available in the secure link — do not share the link."},{"title":"Upload documents in the secure link","text":"Upload complete and legible documents for the AWB."},{"title":"Track status","text":"After upload, Clearance Desk can track document receipt and follow up for any pending items."}]'::jsonb,
 '[{"name":"Commercial Invoice","required":true,"description":"Self-attested/item-wise invoice (as applicable)","hints":["invoice"]},{"name":"Packing List","required":true,"description":"Packing details including weights where applicable","hints":["packing","pack"]},{"name":"KYC Form / Supporting Documents","required":true,"description":"KYC and supporting documents as required for clearance","hints":["kyc","id","pan","gst","passport","aadhar"]},{"name":"IEC / GST / Importer Details (if applicable)","required":true,"description":"IEC/GST or importer details as applicable","hints":["iec","gst","tax"]},{"name":"Authorization / Declaration (if required)","required":false,"description":"Authorization letter or declaration forms if requested/applicable","hints":["author","declar","gatt","poa"]}]'::jsonb
),
('FEBRK_SUNIMPEX', 'FEBRK – FedEx Broker Clearance (Sunimpex)',
 'FedEx Clearance: Action required for AWB {{awb}} (FEBRK – Sunimpex)',
 'Your shipment is assigned for FedEx broker clearance (Sunimpex). Please review the process and upload required documents in the secure link so clearance can proceed.',
 '[{"title":"Review shipment & broker","text":"This shipment is marked FEBRK with broker Sunimpex. Confirm details in the secure link."},{"title":"Prepare required clearance documents","text":"Use the required documents checklist below. Default FedEx/broker templates or reference files (if provided) are available in the secure link — do not share the link."},{"title":"Upload documents in the secure link","text":"Upload complete and legible documents for the AWB."},{"title":"Track status","text":"After upload, Clearance Desk can track document receipt and follow up for any pending items."}]'::jsonb,
 '[{"name":"Commercial Invoice","required":true,"description":"Self-attested/item-wise invoice (as applicable)","hints":["invoice"]},{"name":"Packing List","required":true,"description":"Packing details including weights where applicable","hints":["packing","pack"]},{"name":"KYC Form / Supporting Documents","required":true,"description":"KYC and supporting documents as required for clearance","hints":["kyc","id","pan","gst","passport","aadhar"]},{"name":"IEC / GST / Importer Details (if applicable)","required":true,"description":"IEC/GST or importer details as applicable","hints":["iec","gst","tax"]},{"name":"Authorization / Declaration (if required)","required":false,"description":"Authorization letter or declaration forms if requested/applicable","hints":["author","declar","gatt","poa"]}]'::jsonb
),
('FEBRK', 'FEBRK – FedEx Broker Clearance',
 'FedEx Clearance: Action required for AWB {{awb}} (FEBRK)',
 'Your shipment is marked for FedEx broker clearance. Please upload the required documents in the secure link.',
 '[{"title":"Review details","text":"Confirm shipment details and broker assignment in the secure link."},{"title":"Upload required documents","text":"Upload required documents and any reference templates provided in the secure link."}]'::jsonb,
 '[{"name":"Commercial Invoice","required":true,"description":"Invoice for the shipment","hints":["invoice"]},{"name":"Packing List","required":true,"description":"Packing list","hints":["packing","pack"]},{"name":"KYC / Supporting Documents","required":true,"description":"KYC/supporting documents as applicable","hints":["kyc","id","pan","gst"]}]'::jsonb
),
('DEFAULT', 'Pre-Alert – Document Upload Required',
 'FedEx Clearance: Action required for AWB {{awb}}',
 'Please review your shipment and upload required clearance documents using the secure link.',
 '[{"title":"Open secure link","text":"Use the shipment-specific secure link."},{"title":"Upload required documents","text":"Upload all required documents listed in the portal."}]'::jsonb,
 '[{"name":"Commercial Invoice","required":true,"description":"","hints":["invoice"]},{"name":"Packing List","required":true,"description":"","hints":["packing","pack"]},{"name":"KYC Document","required":true,"description":"","hints":["kyc","id","passport","pan","aadhar"]}]'::jsonb
)
on conflict (case_key) do nothing;
