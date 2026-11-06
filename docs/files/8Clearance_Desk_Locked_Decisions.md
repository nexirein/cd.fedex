# Clearance Desk — Locked Decisions & Conflict Register

*Every decision that was open across docs 1–7 and the existing `cargo-paf` codebase, now closed. This file is the authority on **what was chosen and why**. Any later document that contradicts this file is wrong.*

*Created: after review of docs 1–7 + `/Users/bipulsikder16/Developer/cargo-paf`*

---

## 0. How to read this document set

| Doc | Subject |
|---|---|
| 1–7 | The original approved set. **Left untouched.** |
| **8** | **This file** — locked decisions, conflict register, source-of-truth hierarchy |
| 9 | Identity, teams, division & value-class model |
| 10 | Document Pack system (the "pre-ticked docs") |
| 11 | Bulk Documents API (F27) |
| 12 | Unified flow catalogue (F01–F27) |
| 13 | Data model v2 (Dataverse schema) |
| 14 | Access & provisioning request list |
| 15 | Build sequence & go-live |
| 16 | Showcase site & user documentation |

> `8Clearance_Desk_Screen_Design_and_Flows (1).md` was a **byte-identical duplicate** of doc 7 (verified, matching SHA-256 `5b0896ef…`). It has been deleted. Doc 7 is the only copy.

---

## 1. The thirteen locked decisions

| # | Decision | Chosen | Rejected | Why |
|---|---|---|---|---|
| **L1** | **Subject line** | Keep the **live** customer-facing subject, append a `[case_ref]` tag | Standardising to doc 6's `AWB {awb} \| {title} \| {company} \| [{case_ref}]` | Customers and the CHA desks already recognise the live format. Changing it devalues the existing mail trail. The appended tag revives reply-matching rule #2 at zero customer cost. |
| **L2** | **Mail attachments** | **Link only — zero attachments** | Attaching the fixed docs + invoice as today | Doc 7 §2 states it explicitly: *"Nothing is attached to the mail."* The link is always current, bookmarkable, and survives mail loss. The customer downloads whatever the pack holds. |
| **L3** | **Fixed-document truth** | **Historical `.eml` sets are authoritative** | Seeded code lists (NFBRK 2, FEBRK 0); the ops doc (NFBRK 4, FEBRK 0) | Four sources disagree. The `.eml` files in `cargo-paf/Template/` are evidence of what customers **actually receive today**. |
| **L4** | **LV / MV / HV** | **Courier: the pull sheet's `Class` column is authoritative — never re-derived. Cargo: rule-based default from declared value, agent confirms** | Deriving courier value class from invoice value; a single rule for both streams | **Two different answers, because the two streams are genuinely different.** For **courier** the division has already classified all 332 rows — `MV` 158, `HV` 144, `LV` 30 — and the classification is operational policy, not arithmetic: `SD` and `Invoice` never handle `HV` at all, and `RBOE` is `HV` on all 143 rows where it is a category. Overriding a human classification with a formula would send the wrong route to the wrong desk. For **cargo** there is no such column, so the rule **proposes** from declared value and the agent confirms. `cd_valuerule` therefore scopes to cargo only. |
| **L5** | **Courier row split** | **The division's split is authoritative; the app consumes and enforces it.** Re-assignment in-app is manual and audited (F26), and resolving a desk pool to a person is manual and audited (F28) | Re-deriving the split from free text; auto round-robin; agents claim from a pool | **Corrected by C15.** The real pull sheet already carries the division's final allocation for all 332 rows, published to the team. Re-deriving it would contradict what the team is working to and would make the 84 `CEP` rows ambiguous. What *is* human work: the 65 rows owned by the `BOM` / `BOM CEP` **desk pools**, which have no person behind them. Automate the record, keep the human decision. |
| **L6** | **Courier send mode** | **Auto-send, uncertain rows blocked** | Unconditional auto-send; review-then-Send-all; per-case send | "No manual writing" is the requirement, but a wrong template to a customer is unrecoverable. Auto-send requires BOTH high detection confidence AND a verified recipient. Everything else queues. |
| **L7** | **Build order** | **Courier first**, then cargo | Doc 7 §7's cargo-first sequence | The measured pain is 20–30 hand-typed mails per courier agent per day. Cargo's engine is the same engine. |
| **L8** | **Porting** | **Port design, not code** | Copy cargo-paf code; keep cargo-paf running | cargo-paf runs on personal Supabase + personal Vercel + personal Gmail with a hardcoded seed password and an unauthenticated ingest endpoint. **None of it can enter a FedEx tenant.** The rules are valuable; the code is not. |
| **L9** | **Agent identity** | **AAD login + in-app agent profile** created by admin / manager / team lead | Admin-created in-app accounts; Power Pages staff login | Preserves the model-driven app from ADR-02 and Dataverse security roles. The profile row — not the login — is what admin/manager/team lead creates. |
| **L10** | **Bulk Documents API** | **We call out to fetch + attach** | External systems push to us; both; in-app screens only | The requirement is "fetch multiple docs for a particular AWB". Sources are ACCS, the Document Library, and SharePoint — all FedEx-side. |
| **L11** | **Pre-ticked scope** | **Both** the FedEx document list **and** the customer upload checklist | One or the other | The requirement says "edit, delete and add more" without limiting it. Both are config-driven defaults; both must be adjustable before send. |
| **L12** | **Formats** | **Normalise everything to PDF or DOCX** — `.tif` `.xlsx` legacy `.doc` → PDF | Drop TIFF handling; PDF-only; block non-PDF/DOCX uploads | The historical pack contents include `.XLSX` (CCI MEIS) and `.tif` (invoices), and legacy `.doc` authority letters. Customers must only ever receive PDF or DOCX. |
| **L13** | **Documentation** | **Public showcase site + per-team one-page user guides + admin runbook** | Showcase only; written docs only; showcase + in-app help | Stakeholders need a browsable artefact; agents need a printable page. Both. |

---

## 2. Conflict register — C1 to C19

C1–C12 come from the design review of docs 1–7 against the code. **C13–C19 were added in §2.1 after auditing the live sources** — the real courier pull sheet, the `cargo-paf/Template/` mail family, and the `Phase 1 /web-app` notice generator.

These are the points where docs 1–7 disagree with each other, or with the working `cargo-paf` system. Each is now **resolved**, except C7 and C9 which need a named owner's answer.

### C1 — Subject line has no case ref · **RESOLVED by L1**

| Source | Subject format |
|---|---|
| Doc 6 §1.3 | `AWB {awb} \| {title} \| {company_name} \| [{case_ref}]` |
| `cargo-pre-alert-operations-model.md:113` (Jeena) | `CARGO ARRIVAL NOTICE- Pre Alert AWB and freight charges : {AWB} {CONSIGNEE_NAME} {FREIGHT}_{CURRENCY} \| FEBRK-DDP` |
| `cargo-pre-alert-operations-model.md:132` (Sunimpex) | `… \| FEBRK-DDU` |
| `cargo-pre-alert-operations-model.md:141` (NFBRK) | `Pre Alert - {AWB} / {CONSIGNEE_NAME}` — *"no fixed pattern, team uses variations"* |

**Impact:** doc 1 FR-06 and doc 4 §1 step 2 both specify matching by case ref in the subject. **The live subjects contain no case ref, so that rule never fires.** Today, replies match only by AWB extraction.

**Resolution:** append ` [{case_ref}]` to the subject. Configurable per template via `Template.subject_tag` so it can be switched off per template if a team objects.

> **Watch item:** Exchange subject length. The Jeena subject is ~112 chars before the tag; +12 chars is well inside limits. Verify against the longest live subject during Workshop 1.

### C2 — Placeholder case and silent failure · **RESOLVED (hard rule below)**

| Source | Syntax |
|---|---|
| Doc 6 §1.2 | lowercase — `{awb}`, `{company_name}`, `{agent_name}` |
| `cargo-paf/src/lib/email/render-shared.ts:40-47` | UPPERCASE — `/\{(\w+)\}/g`, core vars `{AWB}`, `{CONSIGNEE_NAME}`, `{FREIGHT}`, `{CURRENCY}`, `{BROKER_NAME}`, `{DO_BASE}`, `{DO_ADMIN_FEE}`, `{DO_AMOUNT_DAY_OF}`, `{DO_AMOUNT_NEXT_DAY}` |

**Impact:** `render-shared.ts` **leaves unknown placeholders unresolved**. A template referencing an unsupplied variable ships a literal `{SOMEVAR}` into a customer's inbox. Silent, unrecoverable customer-facing failure.

**Resolution — UPPERCASE is canonical, and rendering is fail-closed:**

> If a template references a placeholder that has no value for the case, **the row fails** into `Needs Attention` with the message:
> `"Template {template} references {PLACEHOLDER} which has no value for this case."`
>
> It must **never** reach a customer.

The pre-flight check that cargo-paf already had (`process-send-job.ts`, step 4) is retained, with the fail-closed outcome added.

**Full placeholder contract:** see doc 13 §6.

### C3 — "Nothing is attached" vs. attachments shown · **RESOLVED by L2**

| Location | Says |
|---|---|
| Doc 7 §2 | *"**Nothing is attached to the mail.** No invoice, no PDF notice, no documents."* |
| Doc 7 §3.2a (same document, later) | `✓ Arrival Notice PDF attached` / `✓ Invoice PDF attached` |
| cargo-paf | Attaches 4 fixed docs + 1 invoice per NFBRK mail |

Doc 7 contradicts itself. **§2 is the intent and is adopted.** The `✓ attached` lines in §3.2a are treated as stale and are superseded by the pre-ticked Document Pack list on the review screen.

### C4 — CC lists are undocumented · **RESOLVED — must be added to the send engine**

No document in the 1–7 set mentions CC. The working system depends on it heavily:

| Template | Static CC |
|---|---|
| FEBRK-Jeena | 10 addresses — `del-fedex.imports@jeena.co.in`, `madhikari@`, `syogesh@`, `adtaneja@`, `sdutt@`, `vjain1@`, `ssingh@`, `aanand1@`, `kbihari@jeena.co.in`, `iphvdelcargo@corp.ds.fedex.com` |
| FEBRK-Sunimpex | 2 addresses — `csdel@sunimpexcsa.com`, `iphvdelcargo@corp.ds.fedex.com` |
| NFBRK | The full cargo team, per-row |

Plus a **dynamic per-row CC** from the Excel `Standard Remarks` column (semicolon-separated, e.g. `aashita_engg@yahoo.com;rajesh.n.osv@fedex.com`).

**Resolution:** add `Template.cc_static` and `Template.cc_dynamic_source` (points at the case field). `Mail message.cc_address` records what was actually used. **This is a send-engine requirement, not a nicety** — dropping CC breaks the CHA relationship that the whole FEBRK model depends on.

### C5 — LV/MV/HV has no implementation · **RESOLVED by L4**

Confirmed across the entire `cargo-paf` codebase: LV/MV/HV is **assigned by hand**. Doc 6 §2.1 treats it as a config dimension; doc 3 carries it on `Case.value_class`. Neither has any code.

**Resolution:** `cd_valuerule` proposes from the Excel `Value` column; the agent confirms or corrects on an amber row; `Case.value_class_source` records `rule | manual`. The value class then drives division routing, template choice, item rules and fee.

### C6 — `clearance_type` is overloaded · **RESOLVED — split the column**

The TypeScript union is `nfbrk, febrk, febrk-sunimpex, febrk-jeena, calling, hold`
(`cargo-paf/src/lib/cases/clearance-type.ts:1-7`), but `calling` and `hold` appear in **no** database CHECK constraint (`0027_clearance_type_batch_items.sql`, `0042_consolidated_clearance_fill.sql`).

**Resolution — three separate fields:**

```
Case.clearance_type   →  nfbrk | febrk | febrk-sunimpex | febrk-jeena    (a clearance path)
Case.workflow_state   →  calling | hold | (null)                        (an operational state)
Case.phase            →  pre_alert | post_arrival | tp_hold
```

### C7 — BOE penalty and deadline conflict · **PARTLY RESOLVED by C18 — remaining items still open**

| Source | Content |
|---|---|
| Doc 6 §3 | Fee table only: Rs 2,600 + 0 + 18% = **3,068** arrival day; Rs 2,600 + 1,000 + 18% = **4,248** next day. **No penalty stated.** |
| Doc 5 §2.2 Workshop 4 | *"Confirm the BOE late-filing penalty wording (this differs across existing templates — we store it once)"* |
| `cargo-pre-alert-operations-model.md:119-120` | **INR 5,000/day → INR 10,000/day**; **3-hour action deadline** |
| `cargo-pre-alert-operations-model.md:151` | NFBRK cites **Notification No. 34/2021** |
| Attachment | `Circular-No-08-2021.pdf` / `1323932251_Circular-No-08-2021.pdf` — **different number** |
| Doc 6 §4 | Document cutoff **16:30** (working) / **14:30** (holiday) |

**Unresolved discrepancies requiring Compliance sign-off before go-live:**

1. ~~Penalty rate: is it 5,000/day escalating to 10,000/day? After how many days? Is it per shipment or per BOE?~~ **CLOSED by C18** — Delhi wording: ₹5,000/day days 1–3, then ₹10,000/day from day 4. Seeds `Fee rule.penalty_amount_1/2` per location.
2. Citation: Notification **34/2021** or Circular **08/2021**? Which is current? **STILL OPEN** — both templates cite 34/2021; the two PDFs in `Template/NFBRK/` carry different numbers.
3. Deadline: is the customer's real deadline the **3-hour action window** in the live template, or the **16:30 cutoff**? **STILL OPEN** — these are different deadlines and the reminder engine must use the right one.
4. Does the penalty apply to HV, or any specific category? **STILL OPEN** — no evidence either way in the templates.

**Interim behaviour:** store both values in config (`Fee rule.penalty_amount_1`, `.penalty_amount_2`, `.penalty_citation`, `Gateway.doc_action_deadline_hours`) and have Compliance confirm items 2–4 before the templates go live. Do not hard-code.

### C8 — bare `FEBRK` silently sends nothing · **RESOLVED — must be surfaced**

`cargo-paf/src/lib/send/select-template.ts:34-44`: `febrk`, `calling` and `hold` return **`null`**, and `null` **never falls back to NFBRK**. `process-send-job.ts` then treats a `null` template as a human-required outcome and the item is not sent.

So a row where the Excel `End Result` column = `FEBRK` but `FedEx Broker` is blank currently **produces no mail and no visible error**.

**Resolution:** such rows land in `Needs Attention` with a specific reason:
> `"End Result = FEBRK but FedEx Broker is blank — cannot select a CHA template. Confirm Jeena or Sunimpex."`

It must never be silently dropped, and it must never default to NFBRK.

### C9 — Is the cargo team split Prior/Post? · **OPEN — confirm at Workshop 2**

| Source | Says |
|---|---|
| Doc 7 §4c | Cargo agents handle pre- and post-arrival together; *"the split is unnecessary"* because the engine does both |
| `cargo-pre-alert-operations-model.md:6-10` | *"The cargo operations team is split into two groups: **Prior (Pre-Alert)** … **Post**"* |

**Resolution pending confirmation.** The data model already supports both: `cd_team` carries `Cargo-Pre` and `Cargo-Post` as distinct teams, and `Batch.phase` carries `pre_alert` / `post_arrival`. Whichever is true operationally, the schema handles it. If the teams are separate, `Cargo-Post` agents get a different Home screen and a different mailbox Reply-To.

Also note doc 7 §4c's stated goal is **headcount reduction** (48 → ~20), not expansion. If Prior/Post are already separate teams today, that changes the pilot sizing.

### C10 — Follow-ups are dead in the current system · **RESOLVED — do not port the bug**
`cargo-paf/vercel.json` is literally `{}`. **No cron is scheduled anywhere.** Route comments in `do-overdue-reminders`, `requeue-stalled` and `due-followups` claim they run on intervals, but nothing in the repository causes that. Unless an external scheduler exists outside the repo, **every reminder, follow-up, DO-overdue and stalled-requeue process is dormant.**

Additionally `hold_daily` carries `max_attempts: 999` (`followup.ts:6-13`) — unbounded daily nagging by design.

**Resolution:** the new reminder engine is doc 7 §4b as specified (F17, 15-minute sweeper, cutoff- and holiday-aware, max 3 reminders). It is built fresh, not ported. The 999-attempt behaviour is explicitly rejected.

### C11 — The Jeena body text names Sunimpex · **RESOLVED — fix before seeding**

`cargo-pre-alert-operations-model.md:117` documents the **FEBRK-Jeena** body as *"States clearance by FedEx's broker (**Sunimpex**)"*, and `:133` says of the Sunimpex template *"Same body as Jeena template"*. One of the two is wrong. A copy-paste between two broker templates is exactly the class of defect that goes unnoticed because both CHA desks are used to the mail.

**Resolution:** the Jeena and Sunimpex bodies are seeded as **separate, independently approved** templates (doc 6 §1.3). The broker name is a required placeholder resolved from `Case.fedex_broker`, so it cannot be hard-coded in either body:

```
Your shipment will be cleared by FedEx's CHA: {BROKER_NAME}.
```

**If `{BROKER_NAME}` is unresolved, the send fails closed** (C2) rather than sending the wrong broker's name to a customer. Template approval at go-live is per template, per broker, with a name and a date against it (doc 16 §9).

### C12 — `Contact` arrives as `9.19414E+11` and `Primary CEP` as `#N/A` · **RESOLVED — normalise at intake**

The sample pre-alert row (`cargo-pre-alert-operations-model.md:67, 78`) shows the real shape of the data:

| Column | Sample value | Trap |
|---|---|---|
| `Contact` | `9.19414E+11` | Excel's scientific notation. A naive parse yields `9.19414` and a 5-digit phone number |
| `Primary CEP` | `#N/A` | Excel's error value, stored as text. A numeric parse throws |
| `Standard Remarks` | `aashita_engg@yahoo.com;rajesh.n.osv@fedex.com` | Semicolon-separated in one cell, and it is **the CC list** |
| `Commit date` | `7/15/2026` | US format, in a Delhi file |
| `Loc` | `DEL` | Must match the environment's gateway, or the file belongs to another airport |

**Resolution:** F01 normalises at intake (doc 12 §2.9) — scientific notation expanded to `+919414xxxxxx`, `#N/A` and empty both becoming *no CEP* rather than an error, dates parsed as `M/d/yyyy`, and `Standard Remarks` split and validated per address. **A malformed value in a non-critical column must not fail the row; a malformed value in `AWB Numbers`, `End Result`, or `ConsigneeEmailID` must.** The distinction is written into the intake contract so it is a design decision, not an implementation preference.

---

## 2.1 Conflicts resolved from the live sources — C13 to C19

Added after auditing the real courier pull sheet, the `cargo-paf` `Template/` directory, and the `Phase 1 /web-app` notice generator. All seven are **RESOLVED** and locked.

### C13 — `cargo-paf` proposes keeping the web app as the brain · **RESOLVED — full Microsoft build**

`cargo-paf/docs/POWER_AUTOMATE_BLUEPRINT.md` (965 lines) argues for a hybrid: keep the Vercel + Supabase app as the system of record and use Power Automate only as "the mailbox hands", on the grounds that the team cannot hand over SMTP/Graph credentials.

**Resolution: full Microsoft build.** Dataverse is the single source of truth; Power Apps, Power Automate and Power Pages are the system. The blueprint is **discarded as an architecture** and retained only as a record of the flows that team does not want to lose. The credential argument it raises is real and is answered properly by doc 14 — sanctioned connectors inside the team's own tenant — not by keeping an external web app alive.

### C14 — Two unrelated post-arrival artifact families · **RESOLVED — both are built**

The sources contain two things that both call themselves a "cargo arrival notice" and share no lineage:

| | Plain-text Outlook emails | Branded A4 PDFs |
|---|---|---|
| Source | `Template/POST/**/mail.md`, `Template/NFBRK/nfbrk.md` | `web-app/lib/arrivalNotice.js`, `lib/ubondConsol.js` |
| Carries | bank details, DO process, late-fee prose, BOE penalty text | shipment grid, DO fee table, demurrage rules, contacts |
| Attachments | AWB / CI in `.tiff` | none |

**Resolution: both (D2).** The branded PDF is the formal notice; the plain-text emails become the same-day / 1st-day / 2nd-day DO reminder chain. They are complementary, not alternatives — the reminder mails carry the escalation deadline and the payment instruction, the PDF carries the shipment data. Full inventory in **doc 17**.

> **Naming trap, recorded so it is not repeated:** `ubondConsol.js` renders a document titled *CARGO ARRIVAL NOTICE*, but its body is a **prior intimation** — "expected to arrive in Delhi shortly", showing `COMMIT DATE`, `DECLARED VALUE`, `FREIGHT`. The genuine post-arrival notice is `arrivalNotice.js` (MAWB, IGM, `PCS` status `T`/`P`, "has arrived", GMR warehouse). The filenames are the opposite of the content.

### C15 — The courier pull sheet is already split · **RESOLVED — consume, do not re-derive**

Docs 7 and 12 originally described a Split screen where the Team Lead assigns every row. The real sheet — `docs/files/courier_pull_from_clerence.md`, 22 columns, 332 rows — is **the division's final split, already published to the team**. `Team` × `Agent` accounts for all 332 rows exactly: BOM 65, CEP 58, Invoice 69, RBOE 55, SD 85, across **16 named people and 2 desk pools** (18 `Agent` values).

**Resolution (D4): the app consumes the split.** Ownership is never re-derived from free text. L5 survives as **audited re-assignment**, not initial allocation.

The only genuine manual work in the data is the **65 rows whose `Agent` is `BOM` (62) or `BOM CEP` (3)** — desk pools, not people. These land `assigned_state = awaiting_pool_assign` with a null `owner_agent_id`, are routed to **F28**, and are blocked from sending by **F05 Gate 0**. The other 267 rows arrive with a real named owner.

### C16 — `CEP` holds names that contradict `Team` · **RESOLVED — shared-with, never owner**

84 rows carry a person name in a column headed `CEP`, and those names are frequently **not** on that row's team: a `Team = SD` row names `Dhwani Adhia`, a `Team = Invoice` row names `Sunita Surendra Sharma`, a `Team = RBOE` row names `Mahavir Kumar`. 23 distinct cells, **21 individual names**, up to three per row, separated by `/` on some rows.

**Resolution (D5): `CEP` is a shared-with list.** Modelled as many-to-many `cd_assignment` rows with `assignment_role = share`, `source_column = CEP`. It never transfers ownership. Modelling it as a second owner would make 84 rows ambiguous, which is precisely the failure the division's allocation already avoids.

**The follow-on that had to be decided with it: `CEP` is a name list, not an ID list.** Of the 21 individual names, only **6** resolve to an agent anywhere in the `Team`/`Agent` split — 5 exactly, and `Sangeeta Ms` only after stripping the `Ms`. **15 resolve to nothing**, several of them on 8 rows each, so they are real working relationships rather than typos. **43 of the 84 rows are affected.**

Locked: resolve by exact match after stripping honorifics; on failure write the share row with a null assignee and the raw `source_label`, set `cep_name_unresolved`, and **never auto-create an agent from a string in a data cell.** A share never blocks a send, because refusing to send a clearance notice over a distribution-list typo is a worse outcome than a colleague not being cc'd. Full contract in doc 13 §2.3.1.

### C17 — `Master` and the `Reason` prefix disagree · **RESOLVED — `Master` wins, conflict is flagged**

The `Master` column is the division's controlled vocabulary. The `Reason` column is 82 distinct free-text values whose leading token is a category code. **The two disagree on 19 of 332 rows (5.7%)**: `CI MISSING`→`RBOE` ×10, `MOC`→`RBOE` ×4, `INVIC`→`RBOE` ×2, `INVIC`→`PIMS`, `DESCI`→`CBE14`, `INVMS`→`RBOE`.
`Master` also contains `CI Missing` (83) and `Missing CI` (9) — **the same category under two spellings**.

**Resolution (D3): `Master` is authoritative** because it is the controlled vocabulary the team works to and it is already correct on 313 of 332 rows. `reason_prefix` is stored alongside it, and every disagreement raises `category_conflict = Yes` as a **non-blocking warning** the agent confirms. The app never silently corrects the division. The two spellings are merged, giving **11 categories, not 12**.

**The conflict must be counted through the code↔label map, not by string comparison.** The two columns use different vocabularies for the same thing — `INVIC`/`Invoice Objection`, `DESCI`/`Content`, `ROD`/`Duty`, `CI MISSING`/`CI Missing`, `INVMS`/`Missing CI`, `PFEXP`/`Port Return`, `VALDS`/`Value Clarification`, `DGCA` and `SVB`/`CBE14`, `EXP_DOCS` and `RETPP`/`R&R`. Compared raw, the two columns "disagree" on **173 rows**. Compared through the map, they disagree on **19**. The 19 is the real signal; the 173 is noise the team would learn to ignore, and a warning that is always on is a warning that is never read.

### C18 — The two BOE late-filing penalties disagree · **RESOLVED — Delhi wording**

`Template/POST/cargo arrival notice pre alert/mail.md:52-54` and `Template/NFBRK/nfbrk.md:97-99` state **₹5,000/day from day 1 for 3 days, then ₹10,000/day from day 4**. `Template/POST/cargo arrival mail template.md:65-67` (Kolkata / JFS Freight) states **₹5,000/day from day 2, then ₹10,000/day from day 3**. Both cite Customs Notification 34/2021 dated 29-03-2021.

**Resolution (D6): Delhi wording** — ₹5,000/day days 1–3, then ₹10,000/day from day 4. This text goes into live customer mail, so it was escalated rather than inferred. **C7 closes on this**; `Fee rule.penalty_amount_1/2` seed with these values, per location.

### C19 — "AWB is exactly 12 digits" would reject real shipments · **RESOLVED — accept 11 or 12**

The security hardening in §5 specified a bare 12-digit AWB regex. The real pull sheet contains **329 twelve-digit and 3 eleven-digit** AWBs: `15939426501`, `54436176601`, `50128110201`.

**Resolution (D7): accept 11 or 12 digits.** 11 digits sets `awb_length_warning = Yes` for human confirmation; anything else is rejected. The rule was a security control written without reference to the data, and it would have failed three genuine shipments — the exact failure mode L6 exists to prevent. Length validation is retained; the false precision is not.

> **Corollary, also locked:** the same discipline applies to `Cmit Date`. A `31-Dec-99` sentinel **passes** a naive `D-Mon-YY` regex, so the check must test the *year*, not the format. See doc 12 §2.10 and doc 13 §3.2.1.

---

## 3. Source-of-truth hierarchy

When two sources disagree, resolve in this order:

```
1.  THIS FILE (doc 8)                       — locked decisions
2.  Confirmed operational reality           — Workshop sign-off, Compliance/Finance output
3.  Historical .eml evidence                — what customers actually receive today
4.  Working cargo-paf behaviour             — what the code actually does
5.  Working cargo-paf documentation         — what the docs claim the code does
6.  Docs 1–7                                — the original approved design
```

**Note the inversion at 3–5 vs 6.** The original design set (docs 1–7) was written largely as a specification. The `cargo-paf` codebase and its `Template/` directory are the only record of what actually reaches a customer. Where they disagree, reality wins — which is why L3 takes the `.eml` sets over the seeded code.

---

## 4. cargo-paf assets: port or discard

| Asset | Location | Action |
|---|---|---|
| Pre-alert Excel column names | `cargo-pre-alert-operations-model.md:51-79` | **PORT** → F01 column map |
| Clearance-type resolver logic | `src/lib/cases/clearance-type.ts:20-31` | **PORT** → Power Automate Switch/Compose, verbatim |
| Weighted detector rules | `scripts/clearance_type_detector.bas` + `CLEARANCE_SCRIPT_GUIDE.md:5-15` | **PORT** → F08b rules layer |
| Company clearance cache shape | `supabase/migrations/0042` | **PORT** → `cd_companyclearance` |
| Name normalisation + fuzzy match | `migrations/0040:14-40`, `src/lib/master-data/resolve.ts:33-46` | **PORT** → `Company.name_key` + similarity |
| Send pipeline shape | `src/lib/send/process-send-job.ts`, `finalize-send.ts` | **PORT** → F05 |
| Placeholder pre-flight | `process-send-job.ts` step 4 | **PORT** + **add fail-closed** (C2) |
| Safety gates SG-01…SG-08 | `src/lib/ai/safety.ts` | **PORT** → F09 |
| Four kill-switches | `src/lib/ai/config.ts:5-18` | **PORT** → Supervisor screen |
| Role model admin/lead/operator/reviewer/viewer | `cargo-pre-alert-operations-model.md:230-236` | **PORT** → doc 9 |
| Bulk TIFF→PDF pool | `src/lib/tiff/pool.ts:25-26`, `zip.ts` | **PORT** → F25 (via Azure Function) |
| Bulk invoice filename matching | `src/lib/batches/match-attachments.ts` | **PORT** → F24 |
| Fixed attachment files | `cargo-paf/Template/**` | **PORT the files** → Document Library (doc 10) |
| Personal Supabase / Vercel / Gmail | — | **DISCARD** |
| `scripts/seed.ts` hardcoded `Password123!` | `scripts/seed.ts:3` | **DISCARD** — never in FedEx tenant |
| Unauthenticated `/api/inbox/ingest` | `src/app/api/inbox/ingest/route.ts` | **DISCARD** |
| Inbound `conversation_id` always null | `src/lib/email/ingest-email.ts` | **DISCARD** — F07 uses the full matching ladder |
| No rate limiting anywhere | `src/` | **DISCARD** — F05 paces explicitly |
| `vercel.json` = `{}` | — | **DISCARD** — F17 is scheduled properly |
| `hold_daily` 999 attempts | `followup.ts:6-13` | **DISCARD** |
| Power Automate blueprint | `docs/POWER_AUTOMATE_BLUEPRINT.md` | **REFERENCE** — design only, `src/lib/pa/` is empty |

---

## 5. Security and compliance constraints inherited from cargo-paf

These must **not** be reproduced:

| Finding | Location | Rule for the new system |
|---|---|---|
| Hardcoded seed password in source control | `scripts/seed.ts:3` | No credentials in any artefact. Service account secrets in environment variables only. |
| `AZURE_AD_CLIENT_SECRET` granting full mailbox access | `src/lib/graph/token.ts:9-41` | Least-privilege Graph scopes. Delegate + send-as per agent, not app-wide full mailbox. |
| Unauthenticated inbound mail injection endpoint | `src/app/api/inbox/ingest/route.ts:16-26` | All API endpoints behind Entra app registration + authorisation. |
| Zero rate limiting | whole `src/` | Explicit pacing on F05, F24, F27. |
| Bare 12–15 digit AWB regex | `src/lib/email/awb-extract.ts:3-8` | Constrain to **11 or 12** digits, require a label prefix and a corroborating signal, and flag 11-digit rows for confirmation. **Not** "exactly 12" — see C19; that would reject 3 genuine shipments |
| `NOW = Date.now()` at module load | `next-action.ts:34` | All deadline maths reads current time inside the operation. |

---

## 6. Still open — needs a named owner

| # | Item | Owner | Blocks |
|---|---|---|---|
| O1 | BOE penalty rate, citation, and which deadline is real (C7) | Compliance | Template go-live |
| O2 | Is the cargo team split Prior/Post today? (C9) | Cargo team lead | Pilot sizing, mailbox split |
| O3 | True current fixed-doc list per template, per clearance type (L3 assumption) | Cargo team, Workshop 2 | Document Pack seed |
| O4 | Courier defect categories → required items, and the **11** category templates. *Taxonomy count closed by C17; the item-rule mapping behind it is still open* | Courier team leads, Workshop 1 | Phase 2 |
| O5 | ACCS read API, or scheduled file export? | FedEx IT / ACCS team | F02, F24 |
| O6 | Bank statement file format and delivery | Finance / Treasury | F12 |
| O7 | Checklist approval site API | Site owner | F11 |
| O8 | InfoSec approval: Azure OpenAI on shipment data; external Power Pages uploads | InfoSec | F08, F10 |
| O9 | Power Pages external-user pricing on FedEx's agreement | IT procurement | F10 volume |
| O10 | Are internal mail auto-forwards allowed? Is `Reply-To` override permitted? | Exchange admin | F05, F07 |
| O11 | Holiday list for the next 12 months | Compliance | F17 |
| O12 | Is there a different DO fee for HV or specific categories? | Compliance / Finance | `Fee rule` |

**O1, O2, O3 must close before Phase 2 build starts** (doc 15). O5–O12 must close before their respective phases.

**O4 is substantially closed by C17 and C15.** The category count is now **11, not 12** (`CI Missing` and `Missing CI` are the same), and the split is confirmed to be supplied by the division rather than created by the app. What remains open for O4 is the **mapping of those 11 categories to required-item sets and the 11 courier templates** — the taxonomy is known, the item rules behind it are not. That work is Phase 2 and does not block the Phase 1 schema.

**O1 is closed by C18** (Delhi wording). The remaining O1 residue is the **citation** — Notification 34/2021 or Circular 08/2021, two different PDFs sit in `Template/NFBRK/` — and the **action deadline**: the mails say "within 3 hours" while other templates say 16:30, and those are two different deadlines with two different consequences. Both stay open until Workshop 1. See doc 17 §1.5.
