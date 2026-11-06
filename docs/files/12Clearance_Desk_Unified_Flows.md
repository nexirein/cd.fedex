# Clearance Desk — Unified Flow Catalogue

*All 27 flows, both divisions, every trigger and every input/output. Extends the 20-flow catalogue in doc 7 §5.*

*Implements decisions L1–L12 from doc 8.*

---

## 1. The two pipelines at a glance

```
                         ┌───────────────────────────────────────┐
                         │  cd_agentprofile decides the branch   │
                         │  division = Cargo | Courier | IGM      │
                         └──────────────┬────────────────────────┘
                                        │
          ┌─────────────────────────────┴──────────────────────────────┐
          │                                                             │
   ┌──────▼────────────────────────────────┐              ┌───────────▼──────────────────────┐
   │ PIPELINE A — CARGO                   │              │ PIPELINE B — COURIER              │
   │ Pre-alert to EVERYONE on the list   │              │ Pull sheet SPLIT to teammates     │
   │                                      │              │                                  │
   │ F01  intake the list                 │              │ F01b  intake the pull sheet       │
   │ F02  ACCS enrich + BULK invoice      │              │ F26  team lead splits the rows    │
   │ F03  build request                   │              │ F01c  agent uploads their share   │
   │ F22  apply Document Pack             │              │ F08b DETECT the issue type       │
   │ F24/25 fetch + normalise             │              │ F03c build request from template  │
   │ F23  agent edits the pack            │              │ F22  apply Document Pack          │
   │ F05  AUTO-SEND from the agent        │              │ F05  AUTO-SEND (uncertain=block)  │
   │                                      │              │                                  │
   │ F04  CONSOL↔UBOND merge              │              │ F11  HV checklist approval        │
   │ F03b post-arrival notice (auto)      │              │ F15  Ready for ACCS → Admin       │
   │ F06  Arrival Notice PDF              │              │                                  │
   │ F17  reminders (cutoff-aware)        │              │ F17  reminders                    │
   │ F12  payment → UTR match             │              │                                  │
   │ F13  DO issued → link                │              │                                  │
   │ F15  Admin handoff → BOE             │              │                                  │
   └──────────────────────────────────────┘              └──────────────────────────────────┘
                                        │
          ┌─────────────────────────────┴──────────────────────────────┐
          │  SHARED: F07 reply intake · F08 AI classify · F09 decide   │
          │          F10 portal intake · F19 errors · F20 links        │
          │          F27 Documents API · F21 profile sync              │
   └────────▼──────────────────────────────────────────────────────────┘
```

---

## 2. Flow register

### 2.1 Intake and enrichment

| # | Flow | Trigger | Does | Key notes |
|---|---|---|---|---|
| **F01** | **Cargo pre-alert intake** | Agent uploads the pre-alert Excel | Validates against the real column set (**§2.9**), creates `Batch` (`case_type=cargo_ubond`, `phase=pre_alert`, `owner=me`), creates one `Case` per row, proposes `value_class` from `cd_valuerule` (L4), resolves `clearance_type`, matches the company, sets recipient + CC, then calls F02, F03, F22 | The 27-column contract is in **§2.9**. Error rows → `Needs Attention`, never silently dropped. Runs 2–3×/day for UBOND |
| **F01b** | **Courier pull intake** | Clearance lead uploads the pull sheet, **or** a 10-min poller | Validates the real **22-column** contract (**§2.10**), creates one `Case` per row (`case_type=courier`), then **consumes the division's split** — `Team` and `Agent` land as-is (D4), `CEP` becomes shared-with rows (D5). `Master` becomes `issue_type_detected` (D3), `Class` becomes `value_class` (authoritative for courier), `EDI` sets `checklist_suppressed`. Then calls F26 for the 65 pool rows only | **The sheet is already split by the division and published to the team.** The app does not re-derive ownership. Rows owned by a pool land `assigned_state = awaiting_pool_assign` and go to F28 |
| **F01c** | **Agent share upload / match** | Agent uploads their portion of the pull sheet | Matches each row to an **existing** case by AWB within the assigned window. Confirms the assignment. **Never creates a duplicate case** | This is "the agent uploads their AWBs that are assigned to them". Dedup on `(pull_date, awb_ubond)` per doc 13 §5.7. Unmatched row → `Needs Attention`, not a new case |
| **F02** | **ACCS enrichment** | Child of F01 / F01b | Per AWB: company, contact email, broker, `value_class`, pieces, weight, declared value, currency, origin, contents, flight, arrival. **Then bulk-fetches invoices for the whole batch at once** (doc 7 §2) | Rate-limited against ACCS. Each row → `Ready` / `New customer` / `No email` / `ACCS fail` |
| **F03** | **Build request — cargo pre-alert** | Child of F01 | Selects the template by `clearance_type` (+ `value_class` override), creates `Required item` rows from `Item rule` (+ conditional rules), generates the secure-link token, computes `{DO_AMOUNT_DAY_OF}` / `{DO_AMOUNT_NEXT_DAY}` from `Fee rule` | **A bare `febrk` with no template → `Needs Attention` (C8). Never falls back to NFBRK.** Pre-flight placeholder check, **fail-closed** (C2) |
| **F03b** | **Build request — post-arrival** | Child of F04 | Same thread, adds `{MAWB}`, `{IGM_NO}`, `{FLIGHT_NO}`, `{FLIGHT_DATE}`, recalculates the fee tier | Regenerates the Arrival Notice PDF (F06) and replaces the link's copy |
| **F03c** | **Build request — courier** | Child of F01c | Selects `courier_{category}` from `issue_type_detected`, creates the category's `Required item` rows, generates the token, adds the case ref to the subject (L1) | Renders the pre-flight check. Confidence gate: `< CD_DetectionThreshold` → `send_state = needs_review` (L6) |

### 2.2 Division and identity

| # | Flow | Trigger | Does | Key notes |
|---|---|---|---|---|
| **F21** | **Agent profile sync** | Nightly + on demand | Reads AAD users in the configured groups; creates `cd_profile_request` for anyone without a profile; flags disabled accounts; flags profile-less users | **Creates a request, never an active profile.** Provisioning is a human action — see doc 9 §7 |
| **F26** | **Courier assignment engine** | F01b for pool rows · Team Lead presses **Reassign** · F28 on pool resolution | **Consumes** the division's `Team`/`Agent` split at F01b, then *enforces* it. Writes one `owner` `cd_assignment` per row (`source = pull_sheet`), plus `share` rows from `CEP` (D5). For the 65 pool rows it queues F28. On a manual action it re-assigns with load-balancing guidance | **L5, as corrected by D4.** The split already exists; the app's job is to enforce it, not replace it. `source_column` always recorded. Shows projected load before committing any re-assignment |
| **F28** | **Courier pool resolution** | Child of F01b/F26 · BOM desk lead opens the pool queue | The **only** exit from `awaiting_pool_assign`. The BOM desk lead assigns a real person to the 65 rows whose owner was the pool `BOM` / `BOM CEP`. Writes `assignment_role = owner`, `source_column = manual`, `assigned_by` + `assigned_on` + reason. Sets `assigned_state = assigned` and `owner_agent_id` | **Blocks F05.** A pooled case cannot be sent, called, or ticketed while `owner_agent_id` is null. Fully audited — this is an L5 re-assignment recorded against the division's own allocation |

### 2.3 Sending

| # | Flow | Trigger | Does | Key notes |
|---|---|---|---|---|
| **F05** | **Send engine** | Send all · Send · Approve & send · Remind | Sends from **the agent's own Outlook** with `Reply-To` = the team mailbox. Appends `[{case_ref}]` to the subject (L1). Static CC per template **+ dynamic CC from `Standard Remarks`** (C4). **Zero attachments** (L2). Paces at 20/min. Logs message ID + conversation ID. Honours `CD_TestMode` | **L6 confidence gate** applies. Idempotent on `send_status = sent` (ported from cargo-paf). The DB is the guarantee, not a lock. Pre-flight placeholder check, fail-closed |
| **F06** | **Arrival Notice PDF** | Child of F01 (pre-alert) and F04 (post-arrival) | Populates the Word template with MAWB, IGM, flight, AWB, charges → PDF → `SharePoint /AWB/{awb}/FedEx/` → `Document` row with `visibility = customer` | Two versions: pre-arrival, and post-arrival with MAWB/IGM. Regenerated, not duplicated |

### 2.4 Documents

Full specification in **doc 10**.

| # | Flow | Trigger | Does | Key notes |
|---|---|---|---|---|
| **F22** | **Pack apply** | Child of F01/F01b/F03c, and on `clearance_type`/`value_class`/`category` change | Resolves the matching `cd_docpack` and creates pre-ticked `Document` rows (`is_default = Yes`, `is_included = Yes`) | Resolution order and the broker/value-class override matrix are in doc 10 §3 |
| **F23** | **Pack edit** | Agent action, **or** F27 PATCH/DELETE | Untick, delete, add from Library, upload new, change visibility — at **AWB / selection / batch** scope | Audited as a `Document` event. Soft delete by default |
| **F24** | **Bulk document fetch** | On send, or on demand, or F27 | Fetches `accs_invoice` for the **whole batch at once**; SharePoint folder sweep; Library resolve. Filename matching **loose → strict → fuzzy** | Ported from `cargo-paf/src/lib/batches/match-attachments.ts`. Logs which strategy matched. Registered in `cd_docbulkrequest` |
| **F25** | **Format normaliser** | Child of F24 and F10 | `.tif` `.xlsx` legacy `.doc` → **PDF**; `.pdf` unchanged; `.docx` stays **DOCX**; everything else rejected (L12) | Word Online first (doc 7 §2.1), Azure Function fallback. `.docx` survives only for fillable docs — DO format, bank details |
| **F27** | **Bulk Documents API** | HTTP trigger | The external surface. Thin router — no document logic of its own | **Doc 11.** Loop-internally rule: a bulk call is one run |

### 2.5 Reply processing

| # | Flow | Trigger | Does | Key notes |
|---|---|---|---|---|
| **F07** | **Reply intake** | New mail in `trace.courier.del@` · `trace.cargo.del@` · `deldo@` — **3 triggers, one logic** | Pre-filter (OOO / bounce / internal) → **matching ladder** → save attachments → call F08 | Ladder: 1 conversation ID → 2 `[{case_ref}]` in subject (now works, L1) → 3 AWB in subject/body → 4 sender email → company → open case (flagged *check*) → Triage. `conversation_id` **is** captured on inbound (cargo-paf's null bug is not ported) |
| **F08** | **AI read + classify** | Child of F07, F10, F12 | Document Intelligence on attachments → Azure OpenAI extraction + classification (JSON) → RAG retrieval from Azure AI Search | Returns intent, items satisfied, extracted values, confidence, risk flags. Doc 4 §2 schema unchanged |
| **F08b** | **Issue-type detection** | Child of F01c / F26 when `issue_type_detected` is blank, on re-detection, or on `category_conflict` | **Courier: `Master` is authoritative** (D3) — the division's controlled 11-value vocabulary, loaded verbatim. The `Reason` prefix is parsed to `reason_prefix`; where the two disagree the row is flagged `category_conflict = Yes` with a **non-blocking warning**, never auto-corrected. **Cargo pre-alert: deterministic rules first** (the ported VBA detector), then AI | **19 of 332 courier rows conflict (5.7%)**: `CI MISSING`→`RBOE` ×10, `MOC`→`RBOE` ×4, `INVIC`→`RBOE` ×2, `INVIC`→`PIMS`, `DESCI`→`CBE14`, `INVMS`→`RBOE`. `CI Missing` and `Missing CI` are the **same category** and are merged → **11 categories, not 12**. The agent confirms; the app never guesses. Cargo rules ported from `scripts/clearance_type_detector.bas`: CC `@jeena.co.in` → Jeena, `@sunimpexcsa.com` → Sunimpex, match-without-broker-CC → NFBRK, no match → `NOT FOUND`. Original wrote only at score ≥ 100; here a below-threshold score is a **visible low-confidence result**, not a blank |
| **F09** | **Decide + act** | Child of F08 | Applies the autonomy policy (Levels 0–3) → ticks items, writes drafts, updates status. **Number verification** on every draft. Safety gates SG-01…SG-08 | Risk flags force Level 3. An unverified number blocks the draft to Level 3. Four kill-switches: `aiEnabled`, `autoSendEnabled`, `followupEnabled`, `callAiEnabled` |

### 2.6 Portal and external

| # | Flow | Trigger | Does | Key notes |
|---|---|---|---|---|
| **F10** | **Portal intake** | Power Pages form submitted | Validates the token → saves fields and files to `/AWB/{awb}/Customer/` → ticks `Required item` rows → confirmation → calls F08. Runs **F25** on every upload | Rejects `.zip` and anything outside the PDF/DOCX allowlist (L12). A zip upload prompts the customer to upload individually. **Never replaces** a previously received file |
| **F11** | **Checklist approval** | Agent requests it, or a scheduled status check | Obtains the approval link (site API / PA Desktop / agent paste) → code-protected portal page → sends to the consignee → syncs approve/decline | The HV / RBOE flow. OTP to the registered email. Code hash only, never plain text |
| **F20** | **Portal link manager** | Daily | Expires old tokens, revokes tokens for closed cases, cleans up | A customer hitting an expired token sees a "request a new link" action, not a broken page |

### 2.7 IGM and handoff

| # | Flow | Trigger | Does | Key notes |
|---|---|---|---|---|
| **F12** | **UTR matching** | Every 30 min + new bank statement file | Compares pending payments against bank lines: exact UTR + amount → matched; small diff / split → needs review with a reason; not found after 3 checks → alert | Depends on O6 (Finance file format) |
| **F13** | **DO issued** | IGM uploads the DO PDF and clicks **DO issued** | Attaches the DO + invoice to the **link** (not the mail), updates status, notifies the customer in the existing thread, closes the case | L2 — the DO is a `Document`, not an attachment |
| **F14** | **CHA notify** | Items complete, or broker confirmed | Sends the CHA the case reference + a link to the AWB's documents. Opens a CHA sub-case if action is needed | The historical FEBRK flow sends documents by mail; here the CHA gets a link, pending InfoSec on external sharing |
| **F04** | **CONSOL ↔ UBOND merge** | IGM uploads the CONSOL sheet, or the day-arrival schedule fires | Matches CONSOL rows to existing UBOND cases by company + AWB. **Exact → auto-link** and writes `awb_consol`, `mawb`, `igm_no`, `flight_no`, `arrival_date` back onto the case. **Fuzzy → the "Unsure" screen**, an agent confirms or rejects. Triggers F03b then F06 | cargo-paf matches on company name with trigram similarity (`0040`, `0043`); the **inbound `conversation_id` must be captured** — cargo-paf's null-conversation bug is not ported. An unmatched CONSOL row creates a post-arrival-only case, never a duplicate |
| **F15** | **Admin handoff** | Agent clicks **ACCS updated → Admin** | Moves the case to the Admin queue, notifies the Admin duty person | Admin marks BOE filed or sends it back with a reason |
| **F16** | **ICEGATE broadcast** | IGM clicks **ICEGATE delayed** for a flight/date | Adds a status note to every affected case, updates every affected thread and link | One click, many cases |
| **F06b** | **Arrival notice + DO reminder chain** | F04 (IGM generated) → F17 sweeper, escalating | Sends the **branded arrival notice PDF** (F06) as a document on the link, then runs the **plain-text reminder chain** in the existing thread: **same-day** after IGM → **1st-day reminder** → **2nd-day reminder**. The ICEGATE variant fires when IGM is not generated yet | **D2 — both artifact families, deliberately.** The PDF carries the shipment data; the emails carry the escalation deadline and the payment instruction. They are complements, not alternatives. Fee tier recomputed per day: ₹3,068 on the arrival day, ₹4,248 from the next day. Full verbatim inventory in **doc 17**. The `₹1180` prose in the legacy mails is the **delta** (₹4,248 − ₹3,068), not a third fee |

### 2.8 Operations

| # | Flow | Trigger | Does | Key notes |
|---|---|---|---|---|
| **F17** | **Reminder sweeper** | **Every 15 min** | Finds cases past due → Reminder 1 (T+4h) → Reminder 2 (T+8h or 2h before cutoff) → call task for cargo new customers → escalate to the Supervisor. Respects cutoffs, holidays, and the midnight fee-tier change | **Built fresh, not ported.** cargo-paf's cron is dead (`vercel.json` = `{}`) and `hold_daily` had 999 attempts — both explicitly rejected (C10). Max 3 reminders |
| **F18** | **Learning loop** | Nightly | Pushes approved / edited / rejected drafts + outcomes into Azure AI Search. Computes approval rates per situation for the Supervisor screen | RAG only. **No model retraining** |
| **F19** | **Error logger** | Called from **every** flow's Catch block | Writes a plain-language error to `Error log` with a retry payload → `Needs Attention` with one-click retry | Doc 1 FR-17. No flow ships without Try/Catch → F19 |

---

### 2.9 Pre-alert Excel intake contract (F01)

The 27 columns are the **real** pre-alert layout, carried over from the working system. F01 validates the header row exactly; a missing or renamed column rejects the file with a specific message, not a silent partial load.

| # | Column | Maps to | Required | Handling |
|---|---|---|---|---|
| 1 | `Agent` | `Case.origin_agent_name` | Yes | Kept for audit; **does not** drive `owner_agent` — the profile does |
| 2 | `Loc` | `Gateway.code` (DEL) | Yes | Must match the environment's `CD_Gateway`, else the file is for another gateway |
| 3 | `Date` | `Batch.source_date` | Yes | |
| 4 | `AWB Numbers` | `Case.awb_ubond` | Yes | One row per AWB. A cell with 2 AWBs splits into 2 rows and is flagged |
| 5 | `Consignee Name` | `Company.name` / `Case.contact_name` | Yes | Also the company-match key (doc 13 §2.4) |
| 6 | `BSO` | `Case.bso` | Yes | |
| 7 | `Freight` | `Case.freight` | Yes | Numeric parse, thousands separators tolerated |
| 8 | `Currency` | `Case.currency` | Yes | Must be ISO-3. Drives the `cd_valuerule` band |
| 9 | `End Result` | → `clearance_type` | Yes | **The driver.** `NFBRK` → `nfbrk`; `FEBRK` → `febrk-*` (see below) |
| 10 | `Data Type` | `Case.data_type` | Yes | Doc 6 routing input |
| 11 | `Mode` | `Case.mode` | Yes | Import / Domestic / International |
| 12 | `PIN Code` | `Company.pin_code` | Yes | 6 digits, else warn |
| 13 | `Standard Remarks` | → **dynamic CC** | No | Semicolon-separated. Each address validated; invalid entries dropped with a warning (C4) |
| 14 | `FedEx Broker` | `Case.fedex_broker` | **Conditional** | With `End Result = FEBRK` it is **mandatory** (C8) |
| 15 | `Contact` | `Contact.phone` | No | Feeds `cd_calltask` when email is missing. **Arrives as `9.19414E+11`** — scientific notation must be expanded to `+919414xxxxxx` (C12) |
| 16 | `ConsigneeEmailID` | `Case.contact_email` | No | The primary `To`. Missing → `No email` bucket on the review screen (doc 7 §3.2a) |
| 17 | `Duty Bill Account` | `Case.duty_bill_account` | No | |
| 18 | `Value` | → `cd_valuerule` → `value_class` | Yes | Drives L4. Blank → `value_class` blank, row amber |
| 19 | `PieceQty` | `Case.pieces` | Yes | |
| 20 | `KiloWgt` | `Case.weight_kg` | Yes | Decimal |
| 21 | `AD CODE` | `Case.ad_code` | No | |
| 22 | `InstructionCD` | `Case.instruction_cd` | No | Drives conditional item rules (doc 6 §2.1) |
| 23 | `Commit date` | `Case.commit_date` | No | **`7/15/2026` — US format in a Delhi file.** Parse as `M/d/yyyy` (C12) |
| 24 | `Account` | `Company.fedex_account` | No | |
| 25 | `SQL Account Customer Name` | `Company.sql_account_name` | No | Alternate match key for the company lookup |
| 26 | `Primary CEP` | `Company.primary_cep` | No | **Can literally be `#N/A`** — treat as *no CEP*, never an error (C12) |
| 27 | `Secondary CEP` | `Company.secondary_cep` | No | |

**Header validation:** all 27 columns must be present, by exact name. A missing or renamed column rejects the file with the column named (error `E-101`).

**Which columns are allowed to be empty:** a blank in a *non-critical* column becomes a warning and the case proceeds. A blank or malformed value in **`AWB Numbers`, `End Result`, `Freight`, `Currency`, `Value`, `PieceQty`, `KiloWgt`, or `ConsigneeEmailID`** is a row-level error. The distinction is deliberate (C12): the file is real operational data, not a clean feed, and a bad phone number must not cost a customer their notice. |

`End Result` + `FedEx Broker` resolution — the exact rule, no guessing:

| `End Result` | `FedEx Broker` | Result | Path |
|---|---|---|---|
| `NFBRK` | any / blank | `clearance_type = nfbrk` | `CARGO_PRE_NFBRK` pack + NFBRK template |
| `FEBRK` | `JEENA` / `Jeena` | `clearance_type = febrk-jeena` | Jeena pack + Jeena template |
| `FEBRK` | `SUNIMPEX` / `Sunimpex` | `clearance_type = febrk-sunimpex` | Sunimpex pack + Sunimpex template |
| `FEBRK` | blank | **`Needs Attention`** | C8. Never NFBRK. Message: *"End Result = FEBRK but FedEx Broker is blank — confirm Jeena or Sunimpex."* |
| anything else | any | **`Needs Attention`** | Unknown value, listed verbatim in the error |

**Row-level result buckets** on the review screen (doc 7 §3.2a): `Ready` · `New customer` · `No email` · `ACCS fail` · `Needs attention`. Every row lands in exactly one bucket, and the totals are shown as counts — a row is never invisible.

---

### 2.10 Courier pull-sheet intake contract (F01b)

Source: `docs/files/courier_pull_from_clerence.md` — **22 columns, 332 rows.** This is the division's **final split**, already published to the team (D4). The app consumes it; it does not re-derive ownership.

| # | Column | Lands in | Required | Notes |
|---|---|---|---|---|
| 1 | `Date` | `Case.pull_date` | No | |
| 2 | `AWB` | `Case.awb_ubond` | **Yes** | **11 or 12 digits** (D7). 329 are 12, 3 are 11 — `15939426501`, `54436176601`, `50128110201`. 11 digits ⇒ `awb_length_warning = Yes`, not an error |
| 3 | `Company` | `Case.consignee_name` | **Yes** | Trimmed for the normalised key; **13 rows contain double spaces** |
| 4 | `Reason` | `Case.reason_raw` + `Case.reason_prefix` | No | **82 distinct free-text values.** Prefix = token before the first `,` or `;`, upper-cased |
| 5 | `Master` | `Case.issue_type_detected` | No | **Authoritative** (D3). 12 values, of which `CI Missing` and `Missing CI` are the same ⇒ **11 categories** |
| 6 | `Manifested mail` | `Case.manifested_mail` | No | **Empty on all 332 rows.** Dead in the source; the new system writes it |
| 7 | `Agent` | `cd_assignment` (`owner`) | No | **The division's own allocation.** `BOM` (62) and `BOM CEP` (3) are **desk pools, not people** |
| 8 | `Agent ID` | `cd_agentprofile.fedex_agent_id` | No | Seeds the profile. Null on pool rows |
| 9 | `CEP` | `cd_assignment` (`share`, many) | No | **Shared-with list** (D5). Populated on 84 rows as 23 distinct cells containing **21 individual names** (cells use `/` to list several). Never assigns ownership. **Name resolution is required** — see the trap below |
| 10 | `Pull Time` | `Case.pull_time` | No | `6:00` on all 332 rows. Text, not a time type |
| 11 | `Flight no` | `Case.flight_no` | No | e.g. `CN5279`, `EK512`, `FX0038`, `5277FT` |
| 12 | `Flight Date` | `Case.flight_date` | No | |
| 13 | `Cmit Date` | `Case.commit_date` | No | `D-Mon-YY`. **`31-Dec-99` is a sentinel** — format-valid, semantically invalid ⇒ `commit_date_is_sentinel = Yes` (1 row) |
| 14 | `EDI` | `Case.edi_status` → `checklist_suppressed` | No | `PPW CALLING` 121 · `CHECKLIST_SENT_E` 115 · `CI Missing` 93 · `CHECKLIST_SENT` 3. The last two ⇒ **do not re-send a checklist** |
| 15 | `DEST_LOC_CD` | `Case.destination_code` | No | 5-char code: `IXCML`, `DELSN`, `PNQCP`, `BOMBD` |
| 16 | `Class` | `Case.value_class` | No | `MV` 158 · `HV` 144 · `LV` 30. **Authoritative for courier.** `cd_valuerule` (L4) applies to **cargo only** |
| 17 | `IEC_CODE` | `Case.consignee_iec` | No | |
| 18 | `GSTIN` | `Case.consignee_gstin` | No | |
| 19 | `MPS` | `Case.mps_raw` | No | **1–27, `1` on 245 rows. Mapping UNCONFIRMED — doc 13 §5.8. Not usable as `PIECES`** |
| 20 | `Team` | `cd_team` | No | `SD` 85 · `Invoice` 69 · `BOM` 65 · `CEP` 58 · `RBOE` 55 |
| 21 | `Location` | `Case.work_location` | No | `DEL` 228 · `BOM` 104. **Where the desk works, not the shipment destination** |
| 22 | `REV DUTY ACCOUNT PAYER` | `Case.duty_account_payer` | No | Mostly `0`; a reference where present |

**Header validation:** all 22 columns present by exact name, or the file is rejected with the missing column named (error `E-201`, mirroring `E-101`).

**Only `AWB` and `Company` are row-critical.** Everything else degrades to a warning. This file is real operational data with known traps, and a formatting quirk must not cost a customer their notice.

**Desk value-class scope** — seeded from the observed `Team` × `Class` cross-tab, not invented:

| `Team` | MV | HV | LV | Total | Scope |
|---|---|---|---|---|---|
| `SD` | 75 | — | 10 | 85 | MV / LV only |
| `Invoice` | 54 | — | 15 | 69 | MV / LV only |
| `BOM` | 2 | 63 | — | 65 | HV |
| `RBOE` | 4 | 51 | — | 55 | HV-led. Note the distinction: the **desk** handles 4 MV and 51 HV, while the **`Master` category** `RBOE` is HV on all 143 rows that carry it |
| `CEP` | 23 | 30 | 5 | 58 | all three |

**`category_conflict` must compare normalised identity, not raw strings.** A naive string comparison between `Master` and the upper-cased `Reason` prefix flags **173 of 332 rows** — because the two columns use *different vocabularies for the same thing*: `INVIC` for `Invoice Objection`, `DESCI` for `Content`, `ROD` for `Duty`, `CI MISSING` for `CI Missing`, `INVMS` for `Missing CI`, `PFEXP` for `Port Return`, `VALDS` for `Value Clarification`, `DGCA` and `SVB` for `CBE14`, `EXP_DOCS` and `RETPP` for `R&R`. After mapping those twelve code↔label pairs, the real conflict count is **19 rows (5.7%)**: `CI MISSING`→`RBOE` ×10, `MOC`→`RBOE` ×4, `INVIC`→`RBOE` ×2, `INVIC`→`PIMS`, `DESCI`→`CBE14`, `INVMS`→`RBOE`. A warning that fires on 52% of rows is a warning the team switches off, and then it misses the 19 that matter. The equivalence map lives in `Category map` (doc 13), not in code.

**The `awaiting_pool_assign` queue (F28).** All 65 `BOM`/`BOM CEP` rows land here. Nothing else needs manual assignment — the other 267 rows arrive with a named owner. This is the only manual split work the source data actually contains.

**The `CEP` name-resolution trap.** `CEP` is a **name list, not an ID list**, and most of the names in it are people who do not appear in the `Team` / `Agent` columns at all. Of the 21 individual names, only **6** resolve to an agent on that row's desk or anywhere in the split — 5 exactly, and `Sangeeta Ms` only after stripping the `Ms` title to match `Sangeeta`. **15 do not resolve: `Ahil E`, `Aneesh T. P.`, `Anthony Gonsalves`, `Bhaskar M`, `Darain Saad`, `Dhwani Adhia`, `Ganesh Vadhavkar`, `Kavitha Essakimuthu`, `Maxim Martha`, `Nimesh Shah`, `Prashant Kamble`, `Royden John Rebeiro`, `Sayed Ibrahim Azeem`, `Sunita Surendra Sharma`, `Tejas Shenvi`.** As a result **43 of the 84 populated rows carry at least one unresolvable name**.

F01b therefore resolves in three steps and never guesses:

| Step | Action |
|---|---|
| 1 | Split the cell on `/`, trim, strip trailing `.` and honorifics (`Mr` `Mrs` `Ms` `Miss` `Dr` `Shri` `Smt`) |
| 2 | Case-fold and compare against `cd_agentprofile.source_agent_label` — exact match only |
| 3 | No match ⇒ write the `cd_assignment` share row with `assignee_agent_id = null` and `source_label` = the raw name, set `cep_name_unresolved = Yes` on the Case, and raise a **warning** |

**An unresolved sharee never blocks a send.** A share grants read access; if it cannot be granted, the owner still sends. And the system **never auto-creates an agent from a name in a data cell** — provisioning is a provisioning decision (doc 9 §3), not an inference. The unresolved names are reviewed once and either matched to a real profile by an Admin or dismissed.

---

## 3. Pipeline A — Cargo, hour by hour (Delhi)

From doc 7 §1, with the document and pack steps made explicit.

```
05:00  UBOND pre-alert data available in ACCS (2–3 days before arrival)
       │
       ├─ Agent opens Send → Upload pre-alert, drops the Excel
       ├─ F01   validate all 27 columns → Batch CG-B-0925-01 → 28 Cases
       │        ├ resolve clearance_type: nfbrk | febrk-jeena | febrk-sunimpex
       │        │   ⚠ bare 'febrk' with blank FedEx Broker → Needs Attention (C8)
       │        ├ propose value_class from Value column via cd_valuerule (L4)
       │        ├ recipient = ConsigneeEmailID
       │        └ dynamic CC = Standard Remarks (C4)
       ├─ F02   ACCS enrich per AWB
       │        └ BULK-fetch invoices for all 28 AWBs in ONE call
       ├─ F22   apply the Document Pack by clearance_type
       │        nfbrk       → CARGO_PRE_NFBRK          (5 pre-ticked)
       │        febrk-jeena → CARGO_PRE_FEBRK_JEENA     (6 pre-ticked)
       │        febrk-sunim→ CARGO_PRE_FEBRK_SUNIMPEX   (6 pre-ticked)
       ├─ F25   normalise: .tif invoice → PDF · .xlsx CCI MEIS → PDF
       │        .doc authority letter → PDF · .docx stays DOCX
       ├─ F03   build request, item rules, secure-link token, fee figures
       │        └ pre-flight placeholder check → FAIL CLOSED (C2)
       │
       ├─ AGENT REVIEWS THE TICK-LIST  ← "pre-ticked docs, edit / delete / add"
       │        ☐ untick  ✕ delete  + add from Library  + upload  👁 visibility
       │        scope: this AWB · selected rows · whole batch
       │        ALSO: confirms the amber value_class rows (L4)
       │
       └─ F05   AUTO-SEND from the agent's Outlook
                Reply-To trace.cargo.del@
                subject = live format + " [CG-000118]"   (L1)
                static CC (Jeena 10 / Sunimpex 2) + Standard Remarks  (C4)
                attachments: NONE                                        (L2)
                paced 20/min · CD_TestMode honoured · idempotent

07:30  Flight lands at DEL

08:00  IGM receives CONSOL
       └─ F04  CONSOL ↔ UBOND match by company
              exact → auto-link, copy MAWB + IGM into the case
              fuzzy → "Unsure" screen, agent confirms
              ⚠ inbound conversation_id is captured (cargo-paf's null bug not ported)

10:00  IGM files on ICEGATE, returns MAWB + IGM numbers

10:10  F04 merge completes → F06 regenerates the Arrival Notice PDF with MAWB/IGM
       └─ F03b builds the post-arrival request in the SAME thread
       └─ F05 auto-sends — the customer does not need a second link

14:00  Post-arrival notices out. Link now shows MAWB, IGM, flight, live fee tier

16:30  Document cutoff (14:30 on a customs holiday)
       └─ F17  Reminder 1 at cutoff − 6h · Reminder 2 at cutoff − 2h
              list ONLY the items still missing, point at the same link
              2nd Saturday / customs holiday → no reminders, tier frozen

17:00+ Midnight → fee tier flips to next-day (Rs 4,248). Link updates itself.

       Customer uploads on the link
       └─ F10 save to /Customer/ · tick items · F25 normalise
       └─ F08 classify · F09 decide+act (Level 0 tick / 1 auto / 2 draft / 3 human)

       Payment
       └─ portal payment form → F12 UTR ↔ bank match every 30 min
          exact → matched · short → balance notice · not found ×3 → alert
       └─ F13 DO issued → DO + invoice pushed to the LINK (L2)

       F15  Ready for ACCS → Admin handoff → BOE filed
       F14  CHA notified with a link to the AWB's documents
```

---

## 4. Pipeline B — Courier, step by step

```
①  CLEARANCE produces the pull sheet
      exception cases with: AWB, defect category, Clearance remark, value class
      │
②  F01b  intake
      • one Case per row, case_type = courier
      • category from the column; if blank → issue_type_raw = null
      • owner_agent = NONE  → the rows sit UNASSIGNED
      │
③  F26  CONSUME THE DIVISION'S SPLIT           ← D4, the sheet is ALREADY split
      Team  → cd_team            SD · Invoice · BOM · CEP · RBOE
      Agent → owner assignment   16 named people + 2 pools, loaded verbatim
      CEP   → share assignment   84 rows, many-to-many, NEVER ownership
                               21 distinct names; 6 resolve, 15 do not
                               → 43 rows get cep_name_unresolved = Yes (warning)
      the division's own pivot accounts for all 332 rows exactly:
        BOM 65 · CEP 58 · Invoice 69 · RBOE 55 · SD 85
      267 rows now have a real, named owner. Done.
      │
      ├─ 65 rows name a DESK POOL, not a person:  Agent = "BOM" (62) / "BOM CEP" (3)
      │    → assigned_state = awaiting_pool_assign, owner_agent_id = null
      │    → queued for F28. THESE ARE THE ONLY ROWS NEEDING MANUAL WORK
      │
      └─ F08b flags 19 rows (5.7%) where Master ≠ Reason prefix
           category_conflict = Yes, non-blocking, agent confirms
           (Master stays authoritative — the app never overrides the division)
      │
③b F28  BOM DESK LEAD RESOLVES THE POOL        ← the only manual split that exists
      the pool queue shows the 65 rows with:
        AWB · company · category · value class · Clearance remark · age
      and each BOM-desk agent's current load
      the lead assigns a real person
      → cd_assignment written, source_column = manual, assigned_by recorded
      → until then, F05 Gate 0 blocks the send
      │
④  F01c  AGENT UPLOADS THEIR SHARE          ← "they upload their all AWBs"
      their portion of the sheet is matched to their existing assigned cases
      ✓ matched   → confirms the assignment, send_state = ready
      ✗ unmatched → Needs Attention (NOT a duplicate case)
      │
⑤  F08b  GET THE ISSUE TYPE                  ← "our system gets the issue type"
      COURIER:  Master is authoritative (D3) — already loaded at ②.
                CI Missing ≡ Missing CI, so 11 categories, not 12.
      CARGO:    rules first (ported weighted detector):
                remark mentions Jeena / Sunimpex / invoice value / DESCI / ROD / SVB …
                CC domain @jeena.co.in → febrk-jeena
                CC domain @sunimpexcsa.com → febrk-sunimpex
                matched, no broker CC → nfbrk
                no match → NOT FOUND, confidence 0
              then AI on the remark text if the rules are inconclusive
      → issue_type_detected + detection_confidence + detection_source
      │
⑥  F03c  PICK THE TEMPLATE AND BUILD         ← "take the template and send"
      template = courier_{issue_type_detected}
      fill {AWB} {CONSIGNEE_NAME} {PIECES} {WEIGHT_KG} {ORIGIN} {CURRENCY}
           {DECLARED_VALUE} {DOC_CUTOFF} {MISSING_ITEMS} {UNIFIED_LINK}
      Required items from Item rule for that category (11 categories, doc 6 §2.2)
      HV → the RBOE item set + checklist approval
      ⚠ checklist_suppressed = Yes on 118 rows (EDI = CHECKLIST_SENT_E / CHECKLIST_SENT)
        → the checklist is NOT requested again, even at HV
      secure-link token generated
      pre-flight placeholder check → FAIL CLOSED (C2)
      │
⑦  F22 / F23  DOCUMENT PACK
      apply the category pack, pre-ticked
      agent can untick / delete / add / set visibility
      │
⑧  F05  SEND                                ← L6
      ┌──────────────────────────────────────────────────────────┐
      │ GATE 0  owner_agent_id resolved — not a desk pool (D4)   │
      │ GATE 1  detection_confidence ≥ CD_DetectionThreshold    │
      │ GATE 2  recipient email present and not bounced         │
      │ GATE 3  template resolved (a null template never sends)  │
      │ GATE 4  every placeholder resolved                       │
      │ GATE 5  CD_TestMode = off, or the company is allowlisted │
      └──────────────────────────────────────────────────────────┘
      ALL PASS → auto-send from the agent's Outlook
                 Reply-To trace.courier.del@
                 subject + " [CD-000142]"
                 static CC + Standard Remarks
                 attachments: NONE
      ANY FAIL → send_state = needs_review, queued for the agent
                 (a wrong template to a customer is unrecoverable)

⑨  Customer opens /s/{token}
      • sees the specific ask for their category
      • upload boxes for that category's items
      • downloads the pre-ticked documents
      • courier has NO fee block

⑩  F10  uploads → items tick → F08 classify → F09 decide+act
⑪  F17  reminders, same sweeper, courier mailbox
⑫  HV  → F11 checklist approval, code-protected
⑬  F15  Ready for ACCS → Admin handoff → BOE filed
```

---

## 5. Send-engine contract (F05)

### 5.1 Subject construction (L1)

```
final_subject = Template.subject_live
                with {placeholders} resolved (UPPERCASE, fail-closed)
              + Template.subject_tag        → " [CD-000142]"
```

Seeded `subject_live` values, from `cargo-pre-alert-operations-model.md`:

| Template | `subject_live` | `subject_tag` |
|---|---|---|
| `CARGO_PRE_FEBRK_JEENA` | `CARGO ARRIVAL NOTICE- Pre Alert AWB and freight charges : {AWB} {CONSIGNEE_NAME} {FREIGHT}_{CURRENCY} \| FEBRK-DDP` | ` [{CASE_REF}]` |
| `CARGO_PRE_FEBRK_SUNIMPEX` | `CARGO ARRIVAL NOTICE- Pre Alert AWB and freight charges : {AWB} {CONSIGNEE_NAME} {FREIGHT}_{CURRENCY} \| FEBRK-DDU` | ` [{CASE_REF}]` |
| `CARGO_PRE_NFBRK` | `Pre Alert - {AWB} / {CONSIGNEE_NAME}` | ` [{CASE_REF}]` |
| `CARGO_POST_ARRIVAL` | `Re: AWB {AWB} \| Arrived — action required \| {CONSIGNEE_NAME}` | ` [{CASE_REF}]` |
| `COURIER_*` | `AWB {AWB} \| {CATEGORY_TITLE} \| {CONSIGNEE_NAME}` | ` [{CASE_REF}]` |

> **Verify subject length during Workshop 1.** The Jeena subject is ~112 chars; +12 is fine. But if a customer's `CONSIGNEE_NAME` is long, check the total stays inside Exchange's limit. `subject_tag` is per-template, so a team can disable it if they object.

> **The broker name is a placeholder, never typed text (C11).** The Jeena and Sunimpex bodies are seeded as separate templates, and both resolve the broker from `{BROKER_NAME}`. The historical Jeena body named *Sunimpex* — a copy-paste between two broker templates that survived because both CHA desks were used to the mail. If `{BROKER_NAME}` cannot be resolved the send fails closed (C2), which is the correct outcome: better no mail than a mail naming the wrong CHA.

### 5.2 Recipients

```
To:      Case.contact_email        (ACCS ConsigneeEmailID, or the master)
CC:      Template.cc_static        (Jeena 10 / Sunimpex 2 / NFBRK team list)
     +   Case.standard_remarks     (per-row, semicolon-split, validated)
Reply-To: cd_team.reply_mailbox     (trace.courier.del@ / trace.cargo.del@ / deldo@)
From:    the agent's own mailbox    (ADR-04)
Bcc:     (optional) the team archive
```

**Every address is validated before send.** A malformed entry in `Standard Remarks` is dropped with a warning on the `Mail message` row — it must not fail the send.

### 5.3 The L6 confidence gate

| Gate | Threshold | On failure |
|---|---|---|
| **Owner resolved** | `Case.owner_agent_id` not null and the profile is **not** a pool | `send_state = blocked_pool_owner` → F28 (D4) |
| `detection_confidence` | `≥ CD_DetectionThreshold` (default **0.85**) | `send_state = needs_review` |
| Recipient email | present, valid, `Contact.is_valid = Yes` | `send_state = blocked_no_email` |
| Template | resolved (not null) | `send_state = blocked_no_template` (C8) |
| Placeholders | all resolved | `send_state = blocked_placeholder` (C2) |
| `CD_TestMode` | off, **or** company in `CD_PilotAllowlist` | routed to the test inbox |
| Agent `send_as_allowed` | Yes | `send_state = blocked_readonly` |

**Gate 0 is new and is the one that matters most in the real data.** 65 of 332 courier rows are owned by the desk pool `BOM` / `BOM CEP`. Without this gate they would send from nobody's mailbox or, worse, from the last agent who touched them. It is a *routing* failure, not a data failure, so it gets its own `send_state` and a named exit (F28) rather than landing in the generic `needs_review` bucket.

**`needs_review` rows appear in the agent's Send screen with the failing gate named.** One click resolves: correct the category, or fix the data, or send anyway with a reason recorded.

### 5.4 Idempotency and pacing

| Concern | Mechanism |
|---|---|
| Double-send | `Case.send_state = sent` is the authoritative guard, checked **before** the transport call. Ported from cargo-paf's design note: *the DB is the guarantee, a lock is only an optimisation* |
| Exchange limit | 20/min per mailbox, token-bucket. NFR-02 |
| Partial batch failure | Per-case `send_state`. One failure never aborts the other 27 |
| Conversation ID | Captured from the Graph response and stored on `Case.email_conversation_id`. **This is what makes F07's first matching rule work** |
| Test mode | Redirects `To` to `CD_TestRecipient`, sets the real recipient in the subject prefix, records `test_mode = Yes` on the `Mail message` |

---

## 6. Flow dependency and build order

| Flow | Needs | Phase (doc 15) |
|---|---|---|
| F19, F21, F20, F26, F28 | Schema | 1 — Foundation |
| F01b, F01c, F08b, F03c, F22, F05, F10 (basic) | Teams, profiles, packs, templates, link | 2 — Courier MVP |
| F01, F02, F03, F06, F23, F24, F25, F27 | ACCS, Azure Function, API host | 3 — Cargo + Documents |
| F07, F08, F09, F17, F18 | Azure OpenAI, AI Search, mailboxes | 4 — Reply + AI |
| F04, F12, F13, F14, F15, F16, F11 | Bank feed, checklist API | 5 — IGM / Admin |
| — | Metrics, autonomy UI | 6 — Supervisor |

**F28 is Phase 1, not Phase 2.** It is the exit from `awaiting_pool_assign`, and F05's Gate 0 depends on it. Building the pool queue in Foundation means the very first courier send in Phase 2 already has a real mailbox behind every row.

**F05 is deliberately built in Phase 2, before the AI exists.** The courier flow must work with templates alone — that is the whole point of L6 and the "no manual writing" requirement. AI arrives in Phase 4 as an addition, never as a dependency for the core send.
