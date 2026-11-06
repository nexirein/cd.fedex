# Clearance Desk — Data Model v2

*The complete Dataverse schema: the original tables plus **14 new ones** — **34 in total** — every changed column, and the contracts that must not be broken.*

*Supersedes doc 3. Doc 3 remains valid for the 12 original tables except where §5 below overrides it.*

> **Every count here was measured against `docs/files/courier_pull_from_clerence.md`, not estimated.** The seed is 332 rows, 16 named people plus 2 desk pools, 5 desks, 11 categories, 12 `Reason` prefixes, 4 `EDI` statuses. Two of those numbers are load-bearing tests rather than descriptions: the `Category map` equivalence seed must yield **19** category conflicts and not 173 (§5 and doc 17 §3.3), and the `CEP` resolver must leave **43 of 84** rows unresolvable (§2.3.1). A schema that loads and reports different numbers is not working.

---

## 1. Entity relationship

```
Gateway
  │ 1:many
  ▼
cd_team ──────────┬── 1:many
  │ 1:many        │
  ▼               │
cd_agentprofile   │
  │ 1:many        │
  ▼               │
cd_assignment     │
                  │
Company ◄─── Contact
  │ 1:many            ▲
  │                   │
  ▼                   │
Batch ◄───────── Case ┘
  │ 1:many     │ 1:many
  │           ├──── Required item
  │           ├──── Document ──────────► cd_docpackitem ──► cd_docpack
  │           │                                    │                │
  │           │                                    └────────────────┘
  │           │                                                  ▲
  │           │                                            cd_doclibrary
  │           ├──── Mail message
  │           ├──── AI draft
  │           ├──── Payment
  │           ├──── Secure link
  │           └──── Error log
  │
  ├── cd_docbulkrequest ── 1:many ── cd_docbulkrequestitem
  ├── cd_apilog
  └── cd_profile_request          (queue for doc 9 §7)

Config (no case relationships):
  Template · Item rule · Fee rule · Holiday · Routing rule · Duty roster
  Autonomy rule · Valuerule · Access rule · cd_doclibrary · cd_docpack
```

---

## 2. New tables

### 2.1 `cd_team`

Full detail in **doc 9 §3**. Columns: `cd_team_id`, `name`, `team_code`, `division`, `sub_team`, `value_class_scope`, `reply_mailbox`, `case_types`, `gateway`, `team_lead`, `is_active`, `created_on`.

**Index:** `team_code` unique. `division` indexed (every screen filters on it).

### 2.2 `cd_agentprofile`

Full detail in **doc 9 §4**. Columns: `cd_agentprofile_id`, `aad_user_id` (unique, indexed, **nullable** for pool rows), `email`, `display_name`, `cd_team_id`, `role`, `gateway`, `capacity_per_day`, `duty_start`, `duty_end`, `manager`, `leave_cover_for`, `send_as_allowed`, `is_active`, `activated_on`, `activated_by`, `created_on`, `modified_on`, plus the source-fidelity columns below.

| Column | Type | Example | Notes |
|---|---|---|---|
| `fedex_agent_id` | Text | `712086` | The `Agent ID` column of the courier pull sheet. Unique, nullable |
| `is_pool` | Yes/No | No | **Yes = a desk, not a person** (D4) |
| `source_team_label` | Choice | `SD` \| `Invoice` \| `BOM` \| `CEP` \| `RBOE` | The `Team` value as it appears in the pull sheet |
| `source_agent_label` | Text | `RP Singh` | The `Agent` value exactly as received, before any name cleanup |
| `pull_sheet_case_count` | Int | 19 | How many pull-sheet rows this agent currently owns. Read-only, refreshed on each F01b run |

#### 2.2.1 Seed data — the 16 named people and 2 pools

The courier pull sheet **is already split by the division** and published to the team (D4). `cd_agentprofile` is seeded from it verbatim. `Team` → `cd_team`, `Agent` → `source_agent_label`. Source: `docs/files/courier_pull_from_clerence.md`, 332 rows.

The `Agent` column holds **18 distinct values**: **16 named people** and **2 pool labels** (`BOM`, `BOM CEP`). A count of 18 *agents* is correct; a count of 18 *people* is not. The two pools get `is_pool = Yes` and no Entra account.

| `cd_team.team_code` | `cd_agentprofile` seeds | Rows | Desk value class (observed) |
|---|---|---|---|
| `BOM` | *(pool)* `BOM`, *(pool)* `BOM CEP` | 65 | HV 63 / MV 2 |
| `CEP` | Vaibhav Srivastava 16, Shikha Sharma 15, Sangeeta 10, Neha Sambhyal 9, Pooja Rajput 8 | 58 | MV 23 / HV 30 / LV 5 |
| `Invoice` | Anil Kumar 69 | 69 | MV 54 / LV 15 |
| `RBOE` | Vijay Kumar 10, Deepak Pal 9, Khushboo 9, Mahavir Kumar 9, Manan Ghai 9, Shweta Nagwal 9 | 55 | HV 51 / MV 4 |
| `SD` | Sachin John 28, Harsh James 19, RP Singh 19, Shreya Pramanik 19 | 85 | MV 75 / LV 10 |
| | **Total** | **332** | MV 158 / HV 144 / LV 30 |

**The two pool rows (`BOM`, `BOM CEP`) have `is_pool = Yes` and no `aad_user_id`.** They are loaded as named desks that the BOM desk lead must resolve into real people. The 65 cases pointing at a pool are held at `assigned_state = unassigned` and are **blocked by the F05 send gate** (F28).

**`value_class_scope` on `cd_team` is seeded from the observed `Team` × `Class` cross-tab above**, not invented. SD and Invoice never handle HV; BOM and RBOE are almost entirely HV. The system proposes within a desk's observed scope and still lets a human override (L4).

### 2.3 `cd_assignment`

Full detail in **doc 9 §6**. Columns: `cd_assignment_id`, `case_id`, `agent_profile_id`, `source`, `assigned_by`, `assigned_on`, `reason`, `released_on`, `released_to`, `active`, plus:

| Column | Type | Example | Notes |
|---|---|---|---|
| `assignment_role` | Choice | `owner` \| `share` | **Owner = who works the case. Share = who else sees it** (D5) |
| `is_pool` | Yes/No | Yes | Denormalised from the profile, so pool cases are queryable without a join |
| `source_column` | Choice | `Agent` \| `CEP` \| `manual` | Which pull-sheet column produced this row |
| `assignee_agent_id` | Lookup → cd_agentprofile | | **Nullable on a share row.** Null means the name in the source could not be resolved to a profile — see below |
| `source_label` | Text | `Dhwani Adhia` | The name **as written in the source**, kept verbatim so an unresolved or mis-spelt sharee is auditable and retryable |

**Filtered unique index — scoped by role, not by case:**

- one `active = Yes` **and** `assignment_role = owner` row per `case_id` → the owning agent
- **any number** of `active = Yes` and `assignment_role = share` rows per `case_id` → the shared-with list (D5)

`source_column = CEP` rows are always `assignment_role = share` and **never** change ownership, even when the same person also appears in `Agent`. `source_column = Agent` rows are always `assignment_role = owner`.

> **Why two roles and not one.** The pull sheet carries 84 rows with a person name in a column headed `CEP` — including people who are **not** on that row's team (a `Team = SD` row naming `Dhwani Adhia`, a `Team = Invoice` row naming `Sunita Surendra Sharma`). Confirmed as a **shared-with list**. It is deliberately not modelled as a second owner, because ownership is already fully determined by `Team` + `Agent` (332/332) and letting two columns both claim ownership would make 84 rows ambiguous.

#### 2.3.1 `CEP` name resolution — the trap in the shared-with list

`CEP` is a **name list, not an ID list**, and most of the names in it are people who never appear in the `Team` / `Agent` columns. Measured on the real sheet:

| | |
|---|---|
| Rows with a populated `CEP` | 84 |
| Distinct `CEP` cells | 23 |
| Individual names after splitting on `/` | **21** |
| — resolve to an agent by exact match | 5 (`Mahavir Kumar`, `Neha Sambhyal`, `Pooja Rajput`, `Shikha Sharma`, `Vaibhav Srivastava`) |
| — resolve after stripping an honorific | 1 (`Sangeeta Ms` → `Sangeeta`) |
| — **do not resolve at all** | **15** |
| Rows carrying ≥1 unresolvable name | **43 of 84** |

The 15: `Ahil E`, `Aneesh T. P.`, `Anthony Gonsalves`, `Bhaskar M`, `Darain Saad`, `Dhwani Adhia`, `Ganesh Vadhavkar`, `Kavitha Essakimuthu`, `Maxim Martha`, `Nimesh Shah`, `Prashant Kamble`, `Royden John Rebeiro`, `Sayed Ibrahim Azeem`, `Sunita Surendra Sharma`, `Tejas Shenvi`. Several appear on 8 rows each, so these are **working relationships the courier desk relies on**, not typos.

**The resolution contract:**

| Step | Rule |
|---|---|
| 1 | Split on `/`; trim; strip a trailing `.`; strip a trailing honorific from `Mr Mrs Ms Miss Dr Shri Smt` |
| 2 | Case-fold and compare against `cd_agentprofile.source_agent_label`. **Exact match only** — no fuzzy, no token-overlap |
| 3 | Match ⇒ `assignee_agent_id` set. No match ⇒ `assignee_agent_id = null`, `source_label` = the raw name, and `Case.cep_name_unresolved = Yes` |

Three rules make this safe:

- **A share never blocks a send.** It grants read access. If it cannot be granted, the owner still sends, because the alternative is a customer with no clearance notice over a distribution-list typo.
- **The system never auto-creates an agent from a name in a data cell.** Provisioning is a provisioning decision (doc 9 §3). Inferring a login from a spreadsheet would be a privilege-escalation path, not a convenience.
- **The unresolved set is reviewed once, not per row.** An Admin matches the 15 to real profiles or dismisses them, and the resolution is remembered in a `Person name map` config table. Thereafter F01b resolves them with no human involvement.

> **This is the honest answer to "why can't it just work?"** It nearly can. 41 of 84 rows resolve with no judgement at all. The remaining 43 need 15 names confirmed once by a person who knows the desks — and a human who is asked to confirm 15 names will do it correctly in ten minutes, while a system that guesses at them will occasionally guess wrong in front of a customer.

### 2.4 `cd_companyclearance`

Ported from `cargo-paf/supabase/migrations/0042` + `0032` + `0043`. **This is the cache that replaces the 40,000-row VLookup master.**

| Column | Type | Example | Notes |
|---|---|---|---|
| `cd_companyclearance_id` | Guid (PK) | | |
| `cd_company_id` | Lookup → Company | | |
| `company_name` | Text | `AASHITA ENTERPRISES JVL.-PKG` | As received |
| `company_name_key` | Text | `AASHITAENTERPRISESJVL` | **Normalised for matching** |
| `clearance_type` | Choice | `nfbrk` \| `febrk` \| `febrk-sunimpex` \| `febrk-jeena` | C6 — the 4 real paths only |
| `fedex_broker` | Choice | `Jeena` \| `Sunimpex` \| (blank) | Blank + `febrk` = the C8 case |
| `confidence` | Decimal(4,3) | 1.000 | |
| `source` | Choice | `excel_upload` \| `human_research` \| `ai_call` \| `batch_auto` \| `form` \| `portal` \| `bounce` | Ported from 0042 |
| `match_type` | Choice | `exact` \| `fuzzy` \| `pattern` | 0043 used this for broker rules |
| `times_seen` | Int | 1 | Increments on every hit |
| `first_seen_at` | DateTime | | |
| `last_seen_at` | DateTime | | |
| `confirmed_at` | DateTime | | Set when a human or a form confirms |
| `confirmed_by` | Lookup → cd_agentprofile | | |
| `is_locked` | Yes/No | No | The customer's "remember my choice" |
| `gateway` | Lookup → Gateway | | |

**Unique:** `(company_name_key, clearance_type)` — mirrors the 0042 unique on `(company_name, clearance_type)` but on the **normalised** key, which fixes the fuzzy-duplicate fork noted in the cargo-paf audit.

**Name normalisation** (ported verbatim from `0040_clearance_fill_pg_trgm.sql:14-40` and `src/lib/master-data/resolve.ts:33-46`):

```
lowercase
  → strip punctuation
  → remove parenthetical qualifiers        (remove "(P)" and similar)
  → remove legal suffixes                  (pvt, pvt ltd, ltd, inc, llp, co, and)
  → remove wildcard "*" segments
  → collapse whitespace
```

Matching then runs **exact → trigram similarity** with the threshold carried over from the existing system. Fuzzy hits set `match_type = fuzzy` and land in the "Unsure" screen rather than auto-linking.

### 2.5 `cd_valuerule`

Implements **L4** — the rule-based default that proposes LV/MV/HV without automating the decision away.

| Column | Type | Example | Notes |
|---|---|---|---|
| `cd_valuerule_id` | Guid (PK) | | |
| `gateway` | Lookup → Gateway | DEL | |
| `currency` | Text | `INR` | Rules are per currency — USD 3,200 is not the same band as INR 3,200 |
| `min_value` | Decimal | 0 | Inclusive |
| `max_value` | Decimal | 100000 | Exclusive |
| `value_class` | Choice | `LV` \| `MV` \| `HV` | |
| `effective_from` | Date | 2026-01-01 | |
| `effective_to` | Date | (blank) | |
| `is_active` | Yes/No | Yes | |
| `notes` | Text | | **Thresholds are unconfirmed — Compliance/Finance to set (O12)** |

**No rule matches → `value_class` stays blank and the row is amber on the review screen.** The system never guesses silently. `Case.value_class_source` records `rule` or `manual`.

### 2.6 `cd_doclibrary`

Full detail in **doc 10 §2.1**. Columns: `cd_doclibrary_id`, `name`, `file_name`, `sharepoint_url`, `format` (pdf|docx only), `doc_class`, `is_fixed`, `default_visibility`, `version`, `effective_from`, `effective_to`, `superseded_by`, `is_active`, `source`, `notes`.

### 2.7 `cd_docpack` / `cd_docpackitem`

Full detail in **doc 10 §2.2**. `cd_docpack` resolution logic in **doc 10 §3**; seeded contents in **doc 10 §4**.

### 2.8 `cd_accessrule`

Full detail in **doc 10 §7**. Columns: `cd_accessrule_id`, `scope_type`, `scope_value`, `doc_class`, `action`, `allow_deny`, `case_type_filter`, `is_active`, `notes`.

**`deny` always wins.** Evaluation order: `Document.visibility` → access rules (deny first) → default.

### 2.9 `cd_docbulkrequest` / `cd_docbulkrequestitem`

The audit record for every bulk operation, from the API or the screen.

**`cd_docbulkrequest`:** `id`, `requested_by`, `source_channel` (`app` | `api`), `batch_id`, `awb_scope` (`batch` | `selection`), `awb_count`, `cd_docpack_id`, `source_kinds` (multi-select: accs / sharepoint / library / upload), `item_count`, `mode` (`sync` | `async`), `status` (`queued`/`running`/`completed`/`completed_with_errors`/`failed`), `documents_added`, `documents_skipped`, `documents_failed`, `duration_ms`, `test_mode`, `created_on`, `completed_on`.

**`cd_docbulkrequestitem`:** `id`, `request_id`, `awb`, `case_id`, `document_id`, `file_name`, `status` (`added`/`duplicate`/`skipped`/`failed`), `match_strategy` (`loose`/`strict`/`fuzzy`/n-a), `reason`, `original_format`, `format`.

**`match_strategy` is the diagnostic that makes a wrong invoice explainable** — ported from `cargo-paf/src/lib/batches/match-attachments.ts`.

### 2.10 `cd_apilog`

Full detail in **doc 11 §7**. **Base64 content is never logged** — only size and checksum.

### 2.11 `cd_profile_request`

The queue behind doc 9 §7. Created by **F21**, never auto-approved.

Columns: `id`, `aad_user_id`, `email`, `display_name`, `detected_groups`, `detected_on`, `status` (`pending`/`approved`/`rejected`/`expired`), `assigned_team`, `resolved_by`, `resolved_on`, `notes`.

### 2.12 `cd_calltask`

The "call the customer" escalation that doc 7 §4b and cargo-paf's `call_reasons` both need. Only for cargo new customers and 24h no-response.

Columns: `id`, `case_id`, `reason` (`clearance_type` / `broker` / `email` — ported from `cargo-paf/src/lib/validation/batch-schemas.ts`), `assigned_to`, `created_on`, `status` (`open`/`in_progress`/`done`/`cancelled`), `outcome`, `outcome_notes`, `completed_on`, `source` (`reminder_sweeper` / `manual`).

---

## 3. Changed columns on existing tables

### 3.1 `Batch`

| Column | Type | Notes |
|---|---|---|
| `division` | Choice | `Cargo` \| `Courier` \| `IGM` \| `Admin` \| `Clearance` — **from the agent's profile, not a user choice at upload** |
| `sub_team` | Choice | `SD` \| `RBOE` \| `CD` \| `Pre` \| `Post` |
| `value_class` | Choice | `LV` \| `MV` \| `HV` \| (blank = mixed) |
| `phase` | Choice | `pre_alert` \| `post_arrival` \| `tp_hold` — the split from C6 |
| `source_mode` | Choice | `upload` \| `split` \| `api` |
| `parent_batch_id` | Lookup → Batch | Courier: the F01b pull batch that F01c's share upload matched into |
| `split_by` | Lookup → cd_agentprofile | Who performed the split (L5) |
| `assigned_by` | Lookup → cd_agentprofile | Bulk-assignment provenance |
| `awb_count` | Int | Denormalised, for the **Pool Queue** screen |
| `doc_request_id` | Lookup → cd_docbulkrequest | Last bulk document operation |

### 3.2 `Case`

| Column | Type | Notes |
|---|---|---|
| `awb_ubond` / `awb_consol` | Text | As doc 3 |
| `clearance_type` | Choice | `nfbrk` \| `febrk` \| `febrk-jeena` \| `febrk-sunimpex` — **the split from C6** |
| `workflow_state` | Choice | `calling` \| `hold` \| (null) — **was wrongly inside `clearance_type`** |
| `fedex_broker` | Choice | `Jeena` \| `Sunimpex` \| (blank) |
| `issue_type_raw` | Text | The category exactly as it appeared in the pull sheet |
| `issue_type_detected` | Choice | The **11** courier defect categories (D3) |
| `detection_confidence` | Decimal(4,3) | |
| `detection_source` | Choice | `pull_sheet` \| `rules` \| `ai` \| `manual` |
| `assigned_state` | Choice | `unassigned` \| `awaiting_pool_assign` \| `assigned` \| `accepted` \| `completed` — **`awaiting_pool_assign` is new in D4** |
| `owner_agent_id` | Lookup → cd_agentprofile | Denormalised from the active **owner** `cd_assignment` for query speed. Null when the owner is still a pool |
| `cd_docpack_id` | Lookup → cd_docpack | Which pack was applied |
| `send_state` | Choice | `draft` \| `ready` \| `needs_review` \| `blocked_no_email` \| `blocked_no_template` \| `blocked_placeholder` \| `blocked_readonly` \| **`blocked_pool_owner`** \| `sending` \| `sent` \| `failed` |
| `send_block_reason` | Text | Names the failing L6 gate. **Gate 0** adds `blocked_pool_owner`; the Case then sits in the Pool Queue and only F26/F28 can clear it |
| `value_class_source` | Choice | `rule` \| `manual` — records L4 honestly |
| `phase` | Choice | `pre_alert` \| `post_arrival` \| `tp_hold` |
| `bso` | Text | From the pre-alert Excel |
| `duty_bill_account` | Text | From the pre-alert Excel |
| `ad_code` | Text | From the pre-alert Excel |
| `instruction_cd` | Multi-line | "ITEM IS PRECIOUS NATURE…" — drives conditional item rules |
| `standard_remarks` | Text | **Dynamic CC, semicolon-separated** (C4) |
| `consignee_email_id` | Text | Primary recipient, from the Excel |
| `contact_email` | Text | Resolved address actually used |
| `freight` | Decimal | |
| `commit_date` | Date | Delivery deadline |
| `template_id` | Lookup → Template | Which template was actually selected |
| `subject_used` | Text | The final rendered subject, for audit |
| `detected_at` | DateTime | |

**Indexes:** `owner_agent_id` + `send_state` (the agent's queue), `division` + `case_type` + `status`, `awb_ubond` (AWB 360), `value_class`, `clearance_type`, `detection_confidence`.

#### 3.2.1 Courier pull-sheet intake columns

Added in D3/D4/D7. The pull sheet has **22 columns**; these are the ones that did not already have a home. Full ingest contract in **doc 12 §2.8**. Source: `docs/files/courier_pull_from_clerence.md`.

| Column | Type | Source column | Notes |
|---|---|---|---|
| `pull_date` | Date | `Date` | |
| `pull_time` | Text | `Pull Time` | `6:00` on all 332 rows. Free text, not a time type |
| `reason_raw` | Text | `Reason` | **82 distinct free-text values.** The category code is the token before the first `,` or `;` |
| `reason_prefix` | Text | `Reason` (derived) | Upper-cased prefix: `RBOE`, `CI MISSING`, `PIMS`, `INVIC`, `DESCI`, `ROD`, `INVMS`, `MOC`, `PFEXP`, `VALDS`, `DGCA`, `SVB`, `EXP_DOCS`, `RETPP` |
| `category_conflict` | Yes/No | derived | **Yes on 19 of 332 rows (5.7%)** where `Master` and the normalised `Reason` prefix disagree (D3). Non-blocking warning, never auto-corrected |
| `category_conflict_detail` | Text | derived | e.g. `Master=RBOE vs prefix=CI MISSING`, plus the verbatim `Reason`. **Only the normalised comparison counts** — see the note below |
| `edi_status` | Choice | `EDI` | `PPW CALLING` \| `CHECKLIST_SENT` \| `CHECKLIST_SENT_E` \| `CI Missing`. **Drives checklist re-send suppression** |
| `checklist_suppressed` | Yes/No | derived | Yes when `edi_status` is `CHECKLIST_SENT` or `CHECKLIST_SENT_E` (115 + 3 rows) |
| `destination_code` | Text | `DEST_LOC_CD` | 5-char location code, e.g. `IXCML`, `DELSN`, `PNQCP`, `BOMBD` |
| `work_location` | Choice | `Location` | `DEL` (228) \| `BOM` (104). Where the desk physically works, **not** the shipment destination |
| `manifested_mail` | Text | `Manifested mail` | **Empty on all 332 rows.** Dead in the source; the new system writes it when a manifested mail is issued |
| `duty_account_payer` | Text | `REV DUTY ACCOUNT PAYER` | Mostly `0`; a reference number where present |
| `mps_raw` | Text | `MPS` | Values 1–27, `1` on 245 rows. **Mapping unconfirmed** — see §5.8 |
| `value_class_source` (amended) | Choice | `Class` + `cd_valuerule` | For **courier**, `Class` from the pull sheet is **authoritative**; `cd_valuerule` (L4) applies to **cargo** only, where no `Class` column exists |
| `awb_length_warning` | Yes/No | derived | Yes on 11-digit AWBs (3 rows). See §5.9 |
| `commit_date_is_sentinel` | Yes/No | derived | Yes where `Cmit Date` parses to a 99 year, e.g. `31-Dec-99` (1 row). Format-valid, semantically invalid |
| `consignee_name_raw` | Text | `Company` | 13 rows contain double spaces; trimmed into the normalised key, raw kept for audit |
| `cep_name_unresolved` | Yes/No | derived | **Yes on 43 of the 84 rows** carrying a `CEP` value, because 15 of the 21 individual names resolve to no profile. **Warning only — a share never blocks a send.** See §2.3.1 |
| `cep_name_count` | Int | 2 | How many sharees the `CEP` cell named, after splitting on `/` |

**Do not** reuse `MPS` as `pieces` until §5.8 is resolved. A 27-piece inbound consignment is not a plausible courier figure, and the arrival notice PDF prints `PIECES` directly to the customer.

**`Category map` carries the code↔label equivalence, and `category_conflict` is computed through it.** A raw string comparison of `Master` against the upper-cased `Reason` prefix flags **173 of 332 rows** — but most of those are two spellings of the same category. The two columns do not share a vocabulary:

| `Reason` prefix | ≡ `Master` value |
|---|---|
| `CI MISSING` | `CI Missing` |
| `INVMS` | `Missing CI` |
| `INVIC` | `Invoice Objection` |
| `DESCI` | `Content` |
| `ROD` | `Duty` |
| `PFEXP` | `Port Return` |
| `VALDS` | `Value Clarification` |
| `DGCA` | `CBE14` |
| `SVB` | `CBE14` |
| `EXP_DOCS` | `R&R` |
| `RETPP` | `R&R` |

Prefixes with no separate `Master` value of their own — `RBOE`, `PIMS`, `MOC` — map to themselves. With the map applied, the true conflict count is **19 rows**, and those are the only ones that get a warning. Seeding this map is a Phase 1 task with a test that asserts the count is 19, because a regression here is silent: the system keeps working and simply stops telling anyone when it is unsure.

### 3.3 `Document`

| Column | Type | Notes |
|---|---|---|
| `visibility` | Choice | `customer` \| `internal` \| `cha` — **`internal` is never returned to a token holder** |
| `is_default` | Yes/No | Came from the pack |
| `is_included` | Yes/No | **Pre-ticked = `Yes`. This is the tick-box (L11)** |
| `cd_docpackitem_id` | Lookup → cd_docpackitem | Provenance |
| `doc_class` | Choice | Drives access rules and portal grouping |
| `format` | Choice | **`pdf` \| `docx` only** (L12) |
| `original_format` | Text | `tif` / `xlsx` / `doc` / `pdf` / `docx` — what ACCS actually returned |
| `converted` | Yes/No | |
| `page_count` | Int | |
| `size_bytes` | Int | |
| `checksum` | Text | `sha256:…` — drives the dedupe in doc 11 §6 |
| `library_version` | Text | Which Library version was attached |
| `uploaded_by` | Lookup → cd_agentprofile | |
| `edited_by` / `edited_on` | Lookup / DateTime | Who last changed the tick state |
| `is_deleted` | Yes/No | Soft delete (doc 11 §4.8) |

### 3.4 `Template`

| Column | Type | Notes |
|---|---|---|
| `division` | Choice | `Cargo` \| `Courier` \| `IGM` |
| `value_class` | Choice | `LV` \| `MV` \| `HV` \| (all) |
| `subject_live` | Text | **The real customer-facing subject** (L1) |
| `subject_tag` | Text | `" [{CASE_REF}]"` — appended. Per-template, so a team can disable it |
| `body_template` | Multi-line | HTML, UPPERCASE placeholders |
| `placeholders_required` | Multi-line | JSON array, extracted at save time. **Drives the fail-closed pre-flight** (C2) |
| `cc_static` | Multi-line | JSON array (C4) |
| `cc_dynamic_source` | Text | `case.standard_remarks` |
| `cd_docpack_id` | Lookup → cd_docpack | |
| `docx_template_file` | Text | For PDF generation (F06) |
| `version_status` | Choice | `draft` \| `in_review` \| `approved` \| `retired` |
| `is_live` | Yes/No | **Only `approved` + `is_live` templates can be selected by F03** |

### 3.5 `Company`

| Column | Type | Notes |
|---|---|---|
| `name_key` | Text | As doc 3, plus the full cargo-paf normalisation chain (§2.4) |
| `gstin` / `iec` | Text | As doc 3 |
| `default_broker` | Choice | `nfbrk` \| `febrk-jeena` \| `febrk-sunimpex` |
| `broker_locked` | Yes/No | "Remember my choice" |
| `cha_name` / `cha_email` / `cha_phone` | Text | NFBRK only |
| `call_reasons` | Multi-select | `clearance_type` \| `broker` \| `email` — ported from cargo-paf. Drives `cd_calltask` |
| `email_source` | Choice | `accs` \| `master` \| `form` \| `reply` \| `bounce_recovery` |
| `last_bounce_on` | DateTime | |
| `bounce_count` | Int | 3+ → the agent must confirm before sending |
| `whatsapp_optin` / `whatsapp_number` | Yes/No / Text | As doc 3 |

### 3.6 `Contact`

Adds: `consignee_email_id`, `standard_remarks`, `cc_source`, `is_primary`, `email_verified_on`.

### 3.7 `Mail message`

Adds: `cc_address` (JSON array — **what was actually used**, C4), `has_case_ref_tag` (Yes/No), `template_id` (already in doc 3), `subject_used`, `test_mode`, `send_channel` (`smtp`/`graph`), `provider_message_id`, `graph_conversation_id`, `attachment_manifest` (always `[]` under L2 — kept for the audit trail), `send_error`, `retry_count`.

### 3.8 `Required item`

Adds: `is_default` (from `Item rule`), `editable` (Yes/No — L11), `condition_summary` (the resolved conditional that created it), `item_source` (`item_rule` / `agent`), `sort_order`, `portal_label` (customer-facing wording, may differ from the internal `item_name`).

### 3.9 `Error log`

Adds: `flow_name` (already), `gate` (which L6 gate failed), `retry_count`, `last_attempt_on`, `is_resolved`, `customer_impacted` (Yes/No — drives a priority sort on `Needs Attention`).

---

## 4. Environment variables and connection references

From doc 5 §2.4, extended:

| Variable | Value | Notes |
|---|---|---|
| `CD_TestMode` | `Yes` | **The rollback switch.** One flip and the system is inert |
| `CD_TestRecipient` | your test mailbox | |
| `CD_PilotAllowlist` | (blank) | Companies exempt from test mode |
| `CD_Gateway` | `DEL` | |
| `CD_CourierMailbox` / `CD_CargoMailbox` / `CD_IGMMailbox` | | Fallbacks when `cd_team.reply_mailbox` is blank |
| `CD_PortalBaseUrl` | | |
| `CD_ACCSEndpoint` | | |
| **`CD_ApiBaseUrl`** | | **New** — the Documents API host (doc 11) |
| **`CD_DetectionThreshold`** | `0.85` | **New** — the L6 confidence gate |
| **`CD_ApiSyncThreshold`** | `25` | **New** — sync/async boundary |
| **`CD_ApiMaxAwbs`** | `1000` | **New** |
| **`CD_ApiRateLimit`** | `60` | **New** — calls per caller per minute |
| **`CD_SendPacePerMinute`** | `20` | **New** — NFR-02, Exchange limit |
| **`CD_MaxReminders`** | `3` | **New** — hard cap, replacing cargo-paf's 999 |
| **`CD_DocMaxSizeMB`** | `10` | **New** — base64 upload limit |
| **`CD_ShareLinkTTLSeconds`** | `300` | **New** — short-lived guest links |

**Connection references** (owned by the service account): Office 365 Outlook · SharePoint · Dataverse · Azure OpenAI · Azure AI Search · Azure Document Intelligence · HTTP with Azure AD (for the API's own auth).

---

## 5. Contracts that must not be broken

These are the invariants the whole system leans on. A change here is a breaking change.

### 5.1 Placeholder contract (C2)

**UPPERCASE. Fail-closed.**

Canonical set:

```
{AWB} {CONSIGNEE_NAME} {CONSIGNEE_EMAIL} {FREIGHT} {CURRENCY} {BROKER_NAME}
{DO_BASE} {DO_ADMIN_FEE} {DO_AMOUNT_DAY_OF} {DO_AMOUNT_NEXT_DAY}
{PIECES} {WEIGHT_KG} {ORIGIN} {DESTINATION} {CONTENTS} {DECLARED_VALUE}
{ARRIVAL_DATE} {FLIGHT_NO} {FLIGHT_DATE} {MAWB} {IGM_NO}
{DOC_CUTOFF} {FEE_TODAY} {FEE_TOMORROW} {MISSING_ITEMS} {CATEGORY_TITLE}
{UNIFIED_LINK} {CASE_REF} {AGENT_NAME} {COMPANY_NAME} {BROKER_TYPE_DISPLAY}
{BROKER_NAME}
```

> **`{BROKER_NAME}` is mandatory, not optional (C11).** The historical Jeena body hard-coded *Sunimpex* — a copy-paste between two broker templates. The broker name is resolved from `Case.fedex_broker`, so the Jeena and Sunimpex templates are separately approvable and neither can send the other's CHA.

**Invariant:** if a template references a placeholder not in this list, **or** one that has no value for the case, the send **fails** with

```
"Template {template} references {PLACEHOLDER} which has no value for this case."
```

and `send_state = blocked_placeholder`. It must never render `{PLACEHOLDER}` into a customer's inbox. This directly replaces `cargo-paf/src/lib/email/render-shared.ts`, which silently shipped unresolved placeholders.

### 5.2 Subject contract (L1)

```
final_subject = Template.subject_live  (placeholders resolved, fail-closed)
              + Template.subject_tag
```

`subject_tag` defaults to `" [{CASE_REF}]"`. It is **per-template** so a team can disable it. If `subject_tag` is empty, F07 falls through to AWB-based matching only.

### 5.3 Clearance-path contract (C6, C8)

```
clearance_type ∈ { nfbrk, febrk, febrk-jeena, febrk-sunimpex }
workflow_state ∈ { calling, hold, null }
phase          ∈ { pre_alert, post_arrival, tp_hold }
```

**`febrk` has no template and MUST NOT fall back to `nfbrk`.** A bare `febrk` routes to `Needs Attention` with:
> `"End Result = FEBRK but FedEx Broker is blank — cannot select a CHA template. Confirm Jeena or Sunimpex."`

### 5.4 Document visibility contract (L2)

**`internal` documents are never returned by `GET /s/{token}/documents`, and are filtered server-side.** Not hidden in the UI, not CSS-hidden — absent from the response. A token holder cannot enumerate one by ID.

### 5.5 Format contract (L12)

**A customer only ever receives `pdf` or `docx`.** `.tif`, `.xlsx`, legacy `.doc`, `.jpg` are all converted or rejected at F25. `.zip` is always rejected at F10.

### 5.6 Assignment contract (L5, as corrected by D4/D5)

**The courier pull sheet is already split by the division and published to the team.** The application **consumes** that split; it does not derive ownership from free text. `Team` and `Agent` are loaded as-is at F01b.

| Rule | Statement |
|---|---|
| **One owner** | Exactly one `active = Yes`, `assignment_role = owner` row per case. Filtered unique index |
| **Many shares** | Any number of `active = Yes`, `assignment_role = share` rows per case. **No** unique constraint |
| **Pool ownership** | An owner whose `cd_agentprofile.is_pool = Yes` leaves `Case.owner_agent_id` **null** and sets `assigned_state = awaiting_pool_assign` |
| **Pool is not a person** | 65 of 332 rows name `BOM` / `BOM CEP`. These cannot be sent, called, or ticketed. **F28** is the only exit |
| **F28 is auditable** | Resolving a pool to a person writes `assigned_by`, `assigned_on`, and an immutable reason. Re-assignment of an already-owned case is permitted and equally audited (L5) |
| **`CEP` never owns** | `source_column = CEP` rows are `assignment_role = share` only. 84 rows are affected. They are visible to the owner but do not transfer the case |
| **A share may have no assignee** | `assignee_agent_id` is nullable on a share row. 15 of the 21 `CEP` names match no profile, so 43 rows carry `cep_name_unresolved = Yes`. Full contract in §2.3.1 |
| **A share never blocks a send** | An unresolvable sharee records a warning. The owner still sends. Withholding a clearance notice over a distribution-list typo is the worse failure |
| **No auto-provisioning from data** | An unresolved name never becomes a `cd_agentprofile`. Provisioning is doc 9 §3, a human decision. Inferring a login from a spreadsheet cell would be a privilege-escalation path |
| **Every write is attributed** | `source` is `pull_sheet` for seed, `manual` for anything a human changed |

**Why the app does not re-derive the split.** The division's `Team` × `Agent` pivot accounts for all 332 rows exactly, and 84 further rows add cross-team names in `CEP`. Any re-derivation in the app would silently contradict the allocation the team is already working to, and would make those 84 rows ambiguous. The app's job is to **enforce** the allocation — in particular to surface the 65 pool rows — not to replace it.

### 5.7 Idempotency contract

| Operation | Guard |
|---|---|
| Send a mail | `Case.send_state = sent`, checked before the transport call |
| Attach a document | `Document.checksum` + `file_name` on the same AWB → `duplicate` |
| Run a bulk request | `cd_docbulkrequest` row always created, so a lost response is diagnosable |
| Process a reply | `Mail message.internet_message_id` unique |
| Re-ingest a pull sheet | `(pull_date, awb_ubond)` on `cd_clearcase` — re-uploading the same sheet is a no-op, not a duplicate row |

### 5.8 Open data question — `MPS` (blocks the arrival notice)

The pull sheet's `MPS` column takes 15 distinct values, 1–27, with `1` on 245 of 332 rows. It is either a **pieces count** for the consignment or a **sequence/ordinal** within a pulled group.

**It is not determinable from the data** — there is no independent pieces or weight column in the sheet to cross-check against, and the two readings disagree completely (a 27-piece inbound is implausible for courier; a 27-row group ordinal is not). It is stored verbatim in `Case.mps_raw` and **must not** be surfaced as `PIECES` until the team confirms which it is, because `arrivalNotice` prints `PIECES` to the customer and a wrong figure is a customer-facing error.

**Blocking for:** Slice 2 (post-arrival arrival notice). **Not blocking for:** Slice 1 (Courier MVP).

### 5.9 AWB length contract (D7)

The pull sheet contains **329 twelve-digit and 3 eleven-digit** AWBs: `15939426501`, `54436176601`, `50128110201`.

| Length | Treatment |
|---|---|
| 12 digits | Accept silently |
| 11 digits | **Accept, raise `awb_length_warning = Yes`** for human confirmation |
| Anything else | Reject the row with `awb_length_invalid` |

The earlier "exactly 12 digits" rule is **withdrawn** — it was a security hardening applied without reference to the real data, and it would have rejected three genuine shipments. Length validation still exists; it just no longer pretends to know the format is uniform.

---

## 6. Table count

| Group | Count |
|---|---|
| Original core (doc 3 §2) | 12 |
| Original config (doc 3 §3) | 8 |
| **New — identity and division** | 4 (`cd_team`, `cd_agentprofile`, `cd_assignment`, `cd_profile_request`) |
| **New — documents** | 6 (`cd_doclibrary`, `cd_docpack`, `cd_docpackitem`, `cd_accessrule`, `cd_docbulkrequest`, `cd_docbulkrequestitem`) |
| **New — matching and value class** | 2 (`cd_companyclearance`, `cd_valuerule`) |
| **New — audit and operations** | 2 (`cd_apilog`, `cd_calltask`) |
| **New total** | **14 tables** |
| **Grand total** | **34 tables** |

> **Corrected.** This section previously reported 12 new / 32 total. It double-counted `cd_docbulkrequestitem` in two groups while omitting it from either total, and never counted `cd_profile_request` or `cd_calltask`. The enumerated new tables are 14.

Plus `Template`, `Item rule`, `Fee rule`, `Holiday`, `Routing rule`, `Autonomy rule` gain the columns in §3; `Item rule` gains `condition_field`, `condition_operator`, `condition_value`, `condition_else_item` (doc 10 §8); `Fee rule` gains `penalty_amount_1`, `penalty_amount_2`, `penalty_citation` (C7, pending O1); `Gateway` gains `doc_action_deadline_hours` (C7, pending O1).
