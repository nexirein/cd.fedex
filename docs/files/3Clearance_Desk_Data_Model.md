# Clearance Desk — Data Model

*Every Dataverse table, its columns, relationships and purpose. This is the schema the developer creates in week 2.*

---

## 1. Entity relationship overview

```
Gateway ─────────────────────────────────────────────────────────────────
  │ 1:many
  ▼
Company ◄──── Contact (1:many)
  │ 1:many
  ▼
Batch ◄──────────── Case (1:many)
  │                   │ 1:many
  │                   ├── Required item
  │                   ├── Mail message
  │                   ├── AI draft
  │                   ├── Document (→ SharePoint file)
  │                   ├── Payment
  │                   └── Secure link
  │
  └── Error log

Config tables (no relationships to case data):
  Template · Item rule · Fee rule · Cutoff · Holiday · Routing rule · 
  Duty roster · Autonomy rule
```

---

## 2. Core tables

### 2.1 Gateway

*One row per airport. Delhi is the first; Mumbai, Bangalore, Chennai added later as configuration.*

| Column | Type | Example | Notes |
|---|---|---|---|
| `gateway_code` | Text (PK) | DEL | 3-letter IATA code |
| `name` | Text | Delhi IGI | Display name |
| `flight_arrival_time` | Time | 07:30 | Default flight arrival time for this gateway |
| `doc_cutoff_workday` | Time | 16:30 | Document submission cutoff on working days |
| `doc_cutoff_holiday` | Time | 14:30 | Document submission cutoff on customs holidays |
| `do_window_start` | Time | 09:30 | DO processing window start |
| `do_window_end` | Time | 17:30 | DO processing window end |
| `courier_reply_mailbox` | Text | trace.courier.del@fedex.com | Reply-To for courier cases |
| `cargo_reply_mailbox` | Text | trace.cargo.del@fedex.com | Reply-To for cargo cases |
| `igm_reply_mailbox` | Text | deldo@fedex.com | Reply-To for IGM cases |
| `accs_endpoint` | Text | https://accs.fedex.com/api/del | ACCS API base URL for this gateway |
| `portal_base_url` | Text | https://clearance.fedex.pages.dev | Power Pages URL |
| `timezone` | Text | Asia/Kolkata | For deadline calculations |
| `is_active` | Boolean | true | |

### 2.2 Company

*Replaces the 40,000-row Excel master. Self-corrects with every form submission and bounce.*

| Column | Type | Notes |
|---|---|---|
| `id` | GUID (PK) | |
| `name` | Text | As received from ACCS |
| `name_key` | Text | Normalised: uppercase, no punctuation, "PRIVATE LIMITED" / "PVT LTD" removed. Used for fuzzy matching |
| `gstin` | Text | Primary match key |
| `iec` | Text | Secondary match key |
| `default_broker` | Choice | NFBRK / FEBRK-Sunimpex / FEBRK-Jeena |
| `broker_locked` | Boolean | Customer ticked "remember my choice" |
| `cha_name` | Text | Only for NFBRK |
| `cha_email` | Text | Only for NFBRK |
| `cha_phone` | Text | Only for NFBRK |
| `whatsapp_optin` | Boolean | Opted in for Gupshup reminders |
| `whatsapp_number` | Text | |
| `last_verified_on` | DateTime | When a form, reply or bounce last confirmed/corrected this record |
| `verified_source` | Choice | import / agent / form / bounce / portal |
| `gateway` | Lookup → Gateway | |
| `created_on` | DateTime | |

### 2.3 Contact

| Column | Type | Notes |
|---|---|---|
| `id` | GUID (PK) | |
| `company` | Lookup → Company | |
| `name` | Text | |
| `email` | Text | Primary match for inbound mails |
| `phone` | Text | |
| `role` | Choice | primary / accounts / clearance / CHA |
| `is_valid` | Boolean | Set to false on bounce |
| `bounced_on` | DateTime | |
| `last_replied_on` | DateTime | Updated on every inbound mail from this contact |

### 2.4 Batch

*One upload of a pull sheet or pre-alert Excel.*

| Column | Type | Notes |
|---|---|---|
| `id` | GUID (PK) | |
| `batch_no` | Text (autonumber) | CG-B-0925-01, CD-B-0925-01, IG-B-0925-01 |
| `case_type` | Choice | cargo_ubond / cargo_postarrival / courier / igm |
| `sub_team` | Choice | SD / RBOE / CD (courier only) |
| `gateway` | Lookup → Gateway | |
| `agent` | Lookup → User | Who uploaded and owns this batch |
| `uploaded_on` | DateTime | |
| `file_url` | Text | SharePoint path to the original Excel |
| `total_cases` | Int | |
| `sent_count` | Int | |
| `responded_count` | Int | |
| `complete_count` | Int | |
| `failed_count` | Int | |
| `status` | Choice | draft / sending / sent / complete |

### 2.5 Case

*One AWB + one issue. The central table.*

| Column | Type | Notes |
|---|---|---|
| `id` | GUID (PK) | |
| `case_ref` | Text (autonumber) | CG-000118, CD-000142, IG-000205 |
| `batch` | Lookup → Batch | |
| `gateway` | Lookup → Gateway | |
| `case_type` | Choice | cargo_ubond / cargo_postarrival / courier / igm / cha / customer_query / triage |
| `category` | Choice | (courier defect categories: Missing CI, Invoice objection, Content/DESCI, Duty/ROD, Value clarification, RBOE, MOC, SVB, DGCA, CBE14, PIMS, Port return) |
| `awb_ubond` | Text | |
| `awb_consol` | Text | Filled when CONSOL merges |
| `mawb` | Text | Filled when IGM data merges |
| `igm_no` | Text | |
| `flight_no` | Text | |
| `flight_date` | Date | |
| `arrival_date` | Date | |
| `company` | Lookup → Company | |
| `contact_email` | Text | The email used for this case |
| `broker_type` | Choice | NFBRK / FEBRK-Sunimpex / FEBRK-Jeena |
| `value_class` | Choice | LV / MV / HV |
| `declared_value` | Decimal | |
| `currency` | Text | |
| `pieces` | Int | |
| `weight_kg` | Decimal | |
| `origin` | Text | |
| `destination` | Text | |
| `contents` | Text | |
| `owner_agent` | Lookup → User | |
| `status` | Choice | new / ready / sent / waiting / customer_replied / in_progress / complete / admin_handoff / boe_filed / closed / escalated |
| `due_on` | DateTime | Next deadline for this case |
| `reminder_count` | Int | 0, 1, 2 |
| `last_reminder_on` | DateTime | |
| `email_conversation_id` | Text | Exchange conversation ID for threading |
| `unified_link_token` | Text | Random token for the customer portal link |
| `unified_link_expiry` | DateTime | |
| `sharepoint_folder` | Text | /AWB/{awb_ubond}/ |
| `created_on` | DateTime | |
| `resolved_on` | DateTime | |
| `accs_updated_on` | DateTime | When agent marked ACCS updated |

### 2.6 Required item

*The checklist. Created from the Item rule config table when a case is opened.*

| Column | Type | Notes |
|---|---|---|
| `id` | GUID (PK) | |
| `case` | Lookup → Case | |
| `item_name` | Text | e.g. "Corrected invoice", "UTR number", "Authority letter" |
| `item_type` | Choice | field / document / confirmation / internal |
| `is_mandatory` | Boolean | |
| `status` | Choice | missing / received / accepted / rejected |
| `value` | Text | For field items: the value received |
| `document` | Lookup → Document | For document items |
| `accepted_by` | Lookup → User | |
| `accepted_on` | DateTime | |
| `rejection_reason` | Text | |
| `source` | Choice | portal / form / email / agent / system |
| `ai_confidence` | Decimal | If AI suggested this item was satisfied |

### 2.7 Mail message

*Every communication on a case: inbound, outbound, internal, system.*

| Column | Type | Notes |
|---|---|---|
| `id` | GUID (PK) | |
| `case` | Lookup → Case | |
| `direction` | Choice | inbound / outbound / internal / system |
| `channel` | Choice | email / portal / app |
| `from_address` | Text | |
| `to_address` | Text | |
| `reply_to` | Text | |
| `subject` | Text | |
| `body` | Multi-line text | |
| `internet_message_id` | Text | Exchange message ID |
| `conversation_id` | Text | Exchange conversation ID |
| `sent_by_agent` | Lookup → User | For outbound: who clicked send |
| `template_used` | Lookup → Template | |
| `ai_intent` | Text | Classifier output |
| `ai_confidence` | Decimal | |
| `ai_risk_flags` | Text | Comma-separated flags |
| `created_on` | DateTime | |

### 2.8 AI draft

*Every draft the AI generates, with outcome tracking for the learning loop.*

| Column | Type | Notes |
|---|---|---|
| `id` | GUID (PK) | |
| `case` | Lookup → Case | |
| `trigger_mail` | Lookup → Mail message | The inbound mail that triggered this draft |
| `draft_text` | Multi-line text | What the AI wrote |
| `sources_used` | Text | RAG source IDs used |
| `autonomy_level` | Int | 0, 1, 2, 3 |
| `outcome` | Choice | approved / edited / rejected / auto_sent |
| `final_text` | Multi-line text | What was actually sent (after edits, if any) |
| `edit_distance` | Int | Character difference between draft and final |
| `reviewer` | Lookup → User | |
| `rejection_reason` | Text | |
| `created_on` | DateTime | |
| `reviewed_on` | DateTime | |

### 2.9 Document

| Column | Type | Notes |
|---|---|---|
| `id` | GUID (PK) | |
| `case` | Lookup → Case | |
| `required_item` | Lookup → Required item | |
| `file_name` | Text | |
| `file_url` | Text | SharePoint URL |
| `source` | Choice | accs / portal / email / generated |
| `original_format` | Text | tiff / pdf / jpg / xlsx |
| `detected_type` | Text | AI Document Intelligence classification |
| `extracted_fields` | Multi-line text (JSON) | Extracted values from the document |
| `validation_result` | Choice | ok / mismatch / unreadable |
| `validation_detail` | Text | "Invoice value USD 482 vs AWB USD 1,200" |
| `uploaded_on` | DateTime | |

### 2.10 Payment

| Column | Type | Notes |
|---|---|---|
| `id` | GUID (PK) | |
| `case` | Lookup → Case | |
| `utr` | Text | |
| `amount_submitted` | Decimal | |
| `amount_due` | Decimal | Computed from Fee rule for the case's arrival date |
| `fee_tier` | Choice | arrival_day / next_day |
| `remitter_name` | Text | |
| `gstin` | Text | |
| `payment_date` | Date | |
| `collection_by` | Choice | fedex_delivery / own_cha |
| `source` | Choice | portal / email / deldo |
| `bank_match_result` | Choice | exact / near / short / split / not_found / pending |
| `bank_amount` | Decimal | |
| `bank_value_date` | Date | |
| `match_reason` | Text | "Amount difference Rs 8" or "Split: 2 transfers totalling Rs 3,068" |
| `confirmed_by` | Lookup → User | |
| `confirmed_on` | DateTime | |
| `do_issued_on` | DateTime | |
| `do_file_url` | Text | SharePoint URL to the DO PDF |
| `invoice_file_url` | Text | SharePoint URL to the commercial invoice |

### 2.11 Secure link

| Column | Type | Notes |
|---|---|---|
| `id` | GUID (PK) | |
| `case` | Lookup → Case | |
| `token` | Text | Random, URL-safe, 32 chars |
| `expiry` | DateTime | Default: 7 days from creation |
| `code_required` | Boolean | For KYC, checklist approval |
| `code_hash` | Text | Hashed OTP (never stored in plain text) |
| `used_on` | DateTime | |
| `revoked` | Boolean | |

### 2.12 Error log

| Column | Type | Notes |
|---|---|---|
| `id` | GUID (PK) | |
| `flow_name` | Text | F01, F02, etc. |
| `case` | Lookup → Case (nullable) | |
| `batch` | Lookup → Batch (nullable) | |
| `error_reason` | Text | Plain language: "ACCS returned 404 for AWB 874515906172" |
| `retry_payload` | Multi-line text (JSON) | Data needed to retry |
| `resolved` | Boolean | |
| `resolved_by` | Lookup → User | |
| `created_on` | DateTime | |

---

## 3. Configuration tables

### 3.1 Template

| Column | Type | Notes |
|---|---|---|
| `id` | GUID | |
| `name` | Text | "Cargo UBOND pre-alert (FEBRK)" |
| `case_type` | Choice | |
| `category` | Choice (nullable) | For courier only |
| `broker_type` | Choice (nullable) | For cargo only |
| `gateway` | Lookup → Gateway | |
| `subject_template` | Text | "AWB {awb} | {title} | {company_name} | [{case_ref}]" |
| `body_template` | Multi-line text | HTML with {placeholders} |
| `is_active` | Boolean | |
| `version` | Int | For history |

### 3.2 Item rule

*Defines the required items for each case type + category combination.*

| Column | Type | Notes |
|---|---|---|
| `id` | GUID | |
| `case_type` | Choice | |
| `category` | Choice (nullable) | |
| `item_name` | Text | |
| `item_type` | Choice | |
| `is_mandatory` | Boolean | |
| `display_order` | Int | |

### 3.3 Fee rule

| Column | Type | Notes |
|---|---|---|
| `gateway` | Lookup → Gateway | |
| `tier` | Choice | arrival_day / next_day |
| `do_charge` | Decimal | 2600 |
| `admin_fee` | Decimal | 0 / 1000 |
| `gst_percent` | Decimal | 18 |
| `effective_from` | Date | For versioning |

### 3.4 Holiday

| Column | Type | Notes |
|---|---|---|
| `gateway` | Lookup → Gateway | |
| `date` | Date | |
| `type` | Choice | customs_holiday / second_saturday / gazetted |
| `description` | Text | |

### 3.5 Routing rule

| Column | Type | Notes |
|---|---|---|
| `case_type` | Choice | |
| `category` | Choice (nullable) | |
| `value_class` | Choice (nullable) | |
| `owner_team` | Text | Cargo / Courier-SD / Courier-RBOE / Courier-CD / IGM / Admin |

### 3.6 Duty roster

| Column | Type | Notes |
|---|---|---|
| `gateway` | Lookup → Gateway | |
| `team` | Text | |
| `date` | Date | |
| `shift` | Choice | morning / afternoon / full |
| `agent` | Lookup → User | |

### 3.7 Autonomy rule

| Column | Type | Notes |
|---|---|---|
| `situation` | Text | "documents_received", "still_missing_reminder", "payment_confirmed" |
| `current_level` | Int | 0, 1, 2, 3 |
| `approval_rate` | Decimal | Current rate (updated nightly by F18) |
| `case_count` | Int | Cases evaluated |
| `switched_on_by` | Lookup → User | Supervisor who approved this level |
| `switched_on_date` | DateTime | |
